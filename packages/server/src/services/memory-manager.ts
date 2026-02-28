// ============================================================
// Memory Manager — Self-healing Memory with ChromaDB + SQLite
// ============================================================
// ChromaDB: Semantic search (find similar steps by meaning)
// SQLite:   Structured metadata (selector, fingerprint, stats)
// ============================================================

import { OpenAIEmbeddingFunction } from "@chroma-core/openai";
import { ChromaClient, type Collection } from "chromadb";
import db, { getSetting } from "../db/database";

// ----- SQLite Schema for step mappings -----
db.exec(`
  CREATE TABLE IF NOT EXISTS step_mappings (
    id TEXT PRIMARY KEY,
    step_description TEXT NOT NULL,
    test_plan_id TEXT NOT NULL,
    target_url TEXT,
    selector TEXT NOT NULL,
    selector_type TEXT DEFAULT 'css',
    action_type TEXT,
    action_value TEXT,
    fingerprint TEXT DEFAULT '{}',
    success_count INTEGER DEFAULT 1,
    fail_count INTEGER DEFAULT 0,
    last_success_at TEXT DEFAULT (datetime('now')),
    last_fail_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_step_mappings_plan
    ON step_mappings(test_plan_id);
  
  CREATE INDEX IF NOT EXISTS idx_step_mappings_desc
    ON step_mappings(step_description);
`);

// ----- Types -----
export interface ElementFingerprint {
  tagName: string;
  textContent: string;
  ariaLabel?: string;
  placeholder?: string;
  name?: string;
  type?: string;
  className?: string;
  parentTag?: string;
  position?: { x: number; y: number };
}

export interface StepMapping {
  id: string;
  stepDescription: string;
  testPlanId: string;
  targetUrl: string | null;
  selector: string;
  selectorType: string;
  actionType: string | null;
  actionValue: string | null;
  fingerprint: ElementFingerprint;
  successCount: number;
  failCount: number;
  lastSuccessAt: string;
}

export interface RecallResult {
  mapping: StepMapping;
  similarity: number;
  source: "exact" | "semantic";
}

// ----- ChromaDB Client -----
let chromaClient: ChromaClient | null = null;
let stepsCollection: Collection | null = null;
let chromaAvailable = false;

async function getCollection(): Promise<Collection | null> {
  if (stepsCollection) return stepsCollection;

  try {
    if (!chromaClient) {
      chromaClient = new ChromaClient({ path: "http://localhost:8000" });
    }
    // Test connection
    await chromaClient.heartbeat();

    // Check if user wants OpenAI embedding
    const embeddingProvider = getSetting("embedding_provider") || "default";

    if (embeddingProvider === "openai") {
      const apiKey = getSetting("openai_api_key");
      if (apiKey) {
        try {
          const embeddingModel =
            getSetting("embedding_model") || "text-embedding-3-small";

          const embedder = new OpenAIEmbeddingFunction({
            apiKey,
            modelName: embeddingModel,
          });

          stepsCollection = await chromaClient.getOrCreateCollection({
            name: "test_steps_memory",
            embeddingFunction: embedder,
          });
          chromaAvailable = true;
          console.log(
            `✅ ChromaDB connected — OpenAI Embedding (${embeddingModel})`,
          );
          return stepsCollection;
        } catch (e) {
          console.warn("⚠️ OpenAI Embedding failed, using default:", e);
        }
      }
    }

    // Default: use built-in embedding (local, free)
    stepsCollection = await chromaClient.getOrCreateCollection({
      name: "test_steps_memory",
    });
    chromaAvailable = true;
    console.log("✅ ChromaDB connected — Default local embedding");
    return stepsCollection;
  } catch (error) {
    chromaAvailable = false;
    console.log(
      "⚠️  ChromaDB not available — Falling back to SQLite-only mode",
    );
    return null;
  }
}

// ----- Core API -----

/**
 * 🧠 LEARN — Save a successful step mapping to memory
 * Called after a step executes successfully.
 */
export async function learn(params: {
  stepDescription: string;
  testPlanId: string;
  targetUrl: string;
  selector: string;
  selectorType?: string;
  actionType: string;
  actionValue?: string;
  fingerprint: ElementFingerprint;
}): Promise<void> {
  const id = generateId(params.stepDescription, params.testPlanId);

  // 1. Save to SQLite (structured data)
  const existing = db
    .query("SELECT id, success_count FROM step_mappings WHERE id = ?")
    .get(id) as { id: string; success_count: number } | null;

  if (existing) {
    // Update existing mapping — increment success count
    db.query(
      `UPDATE step_mappings SET
        selector = ?, selector_type = ?, action_type = ?, action_value = ?,
        fingerprint = ?, success_count = success_count + 1,
        last_success_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`,
    ).run(
      params.selector,
      params.selectorType || "css",
      params.actionType,
      params.actionValue || null,
      JSON.stringify(params.fingerprint),
      id,
    );
  } else {
    // Insert new mapping
    db.query(
      `INSERT INTO step_mappings
        (id, step_description, test_plan_id, target_url, selector, selector_type,
         action_type, action_value, fingerprint)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      params.stepDescription,
      params.testPlanId,
      params.targetUrl,
      params.selector,
      params.selectorType || "css",
      params.actionType,
      params.actionValue || null,
      JSON.stringify(params.fingerprint),
    );
  }

  // 2. Save to ChromaDB (semantic vector)
  const collection = await getCollection();
  if (collection) {
    try {
      await collection.upsert({
        ids: [id],
        documents: [params.stepDescription],
        metadatas: [
          {
            testPlanId: params.testPlanId,
            selector: params.selector,
            actionType: params.actionType,
          },
        ],
      });
    } catch (error) {
      // ChromaDB failure is non-fatal
      console.warn("ChromaDB upsert failed:", error);
    }
  }
}

/**
 * 🔍 RECALL — Find a previously successful mapping for a step
 * Returns null if no match found → Slow Path (call AI)
 * Returns RecallResult if match found → Fast Path (skip AI)
 */
export async function recall(
  stepDescription: string,
  testPlanId: string,
): Promise<RecallResult | null> {
  // Strategy 1: Exact match in SQLite (fastest)
  const exactId = generateId(stepDescription, testPlanId);
  const exactMatch = db
    .query(
      `SELECT * FROM step_mappings
       WHERE id = ? AND success_count > fail_count`,
    )
    .get(exactId) as any;

  if (exactMatch) {
    return {
      mapping: rowToMapping(exactMatch),
      similarity: 1.0,
      source: "exact",
    };
  }

  // Strategy 2: Semantic search in ChromaDB (smart)
  const collection = await getCollection();
  if (collection) {
    try {
      const results = await collection.query({
        queryTexts: [stepDescription],
        nResults: 1,
        where: { testPlanId },
      });

      if (
        results.ids[0]?.length > 0 &&
        results.distances &&
        results.distances?.[0]?.[0] != null &&
        results.distances[0][0] < 0.3 // Low distance = high similarity
      ) {
        const matchedId = results.ids[0][0];
        const sqliteData = db
          .query(
            `SELECT * FROM step_mappings
             WHERE id = ? AND success_count > fail_count`,
          )
          .get(matchedId) as any;

        if (sqliteData) {
          return {
            mapping: rowToMapping(sqliteData),
            similarity: 1 - (results.distances?.[0]?.[0] ?? 0),
            source: "semantic",
          };
        }
      }
    } catch (error) {
      console.warn("ChromaDB query failed:", error);
    }
  }

  // Strategy 3: Fuzzy match in SQLite (fallback)
  const fuzzyMatch = db
    .query(
      `SELECT * FROM step_mappings
       WHERE test_plan_id = ? AND success_count > fail_count
       ORDER BY success_count DESC`,
    )
    .all(testPlanId) as any[];

  for (const row of fuzzyMatch) {
    const sim = simpleSimilarity(
      stepDescription.toLowerCase(),
      row.step_description.toLowerCase(),
    );
    if (sim > 0.8) {
      return {
        mapping: rowToMapping(row),
        similarity: sim,
        source: "exact",
      };
    }
  }

  return null;
}

/**
 * ❌ FORGET — Record that a mapping failed (selector no longer works)
 * This doesn't delete the mapping, just increments the fail count.
 * If fail_count > success_count, recall() will ignore this mapping.
 */
export function recordFailure(
  stepDescription: string,
  testPlanId: string,
): void {
  const id = generateId(stepDescription, testPlanId);
  db.query(
    `UPDATE step_mappings SET
      fail_count = fail_count + 1,
      last_fail_at = datetime('now'),
      updated_at = datetime('now')
     WHERE id = ?`,
  ).run(id);
}

/**
 * 📊 GET STATS — Get memory statistics
 */
export function getMemoryStats(): {
  totalMappings: number;
  healthyMappings: number;
  staleMappings: number;
  chromaAvailable: boolean;
} {
  const total = db
    .query("SELECT COUNT(*) as count FROM step_mappings")
    .get() as { count: number };
  const healthy = db
    .query(
      "SELECT COUNT(*) as count FROM step_mappings WHERE success_count > fail_count",
    )
    .get() as { count: number };
  const stale = db
    .query(
      "SELECT COUNT(*) as count FROM step_mappings WHERE fail_count >= success_count AND fail_count > 0",
    )
    .get() as { count: number };

  return {
    totalMappings: total.count,
    healthyMappings: healthy.count,
    staleMappings: stale.count,
    chromaAvailable,
  };
}

/**
 * 🗑️ CLEAR — Clear all memory for a test plan
 */
export async function clearMemory(testPlanId?: string): Promise<number> {
  let deleted = 0;

  if (testPlanId) {
    const result = db
      .query("DELETE FROM step_mappings WHERE test_plan_id = ?")
      .run(testPlanId);
    deleted = result.changes;
  } else {
    const result = db.query("DELETE FROM step_mappings").run();
    deleted = result.changes;
  }

  // Also clear from ChromaDB
  const collection = await getCollection();
  if (collection && testPlanId) {
    try {
      // Get IDs to delete
      const ids = (
        db
          .query("SELECT id FROM step_mappings WHERE test_plan_id = ?")
          .all(testPlanId) as any[]
      ).map((r) => r.id);
      if (ids.length > 0) {
        await collection.delete({ ids });
      }
    } catch {
      /* ignore */
    }
  }

  return deleted;
}

/**
 * 🔧 RESET CONNECTION — Force reconnect to ChromaDB
 * (Used when user changes embedding settings)
 */
export function resetConnection(): void {
  stepsCollection = null;
  chromaClient = null;
  chromaAvailable = false;
  getCollection().catch(() => {});
}

/**
 * 📋 LIST — Get all mappings for a test plan
 */
export function listMappings(testPlanId?: string): StepMapping[] {
  const query = testPlanId
    ? "SELECT * FROM step_mappings WHERE test_plan_id = ? ORDER BY updated_at DESC"
    : "SELECT * FROM step_mappings ORDER BY updated_at DESC LIMIT 50";
  const rows = (
    testPlanId ? db.query(query).all(testPlanId) : db.query(query).all()
  ) as any[];
  return rows.map(rowToMapping);
}

// ----- Helper Functions -----

function generateId(description: string, testPlanId: string): string {
  const normalized = description.toLowerCase().trim().replace(/\s+/g, " ");
  // Simple hash for deterministic ID
  let hash = 0;
  const str = `${testPlanId}:${normalized}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `mem_${Math.abs(hash).toString(36)}`;
}

function rowToMapping(row: any): StepMapping {
  return {
    id: row.id,
    stepDescription: row.step_description,
    testPlanId: row.test_plan_id,
    targetUrl: row.target_url,
    selector: row.selector,
    selectorType: row.selector_type,
    actionType: row.action_type,
    actionValue: row.action_value,
    fingerprint: JSON.parse(row.fingerprint || "{}"),
    successCount: row.success_count,
    failCount: row.fail_count,
    lastSuccessAt: row.last_success_at,
  };
}

/**
 * Simple string similarity (Dice coefficient)
 * Returns 0-1 where 1 is identical
 */
function simpleSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigrams = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const bigram = a.substring(i, i + 2);
    bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
  }

  let intersections = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bigram = b.substring(i, i + 2);
    const count = bigrams.get(bigram) || 0;
    if (count > 0) {
      bigrams.set(bigram, count - 1);
      intersections++;
    }
  }

  return (2 * intersections) / (a.length + b.length - 2);
}

// Initialize ChromaDB connection on module load (non-blocking)
getCollection().catch(() => {});
