// ============================================================
// Memory Manager — Self-healing Memory with ChromaDB + SQLite
// ============================================================
// ChromaDB: Semantic search (find similar steps by meaning)
// SQLite:   Structured metadata (selector, fingerprint, stats)
// ============================================================

import { OpenAIEmbeddingFunction } from "@chroma-core/openai";
import { ChromaClient, type Collection } from "chromadb";

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

// ----- Database Abstraction -----
export interface MemoryDatabase {
  exec(sql: string): void;
  query(sql: string): {
    get(...args: any[]): any;
    all(...args: any[]): any[];
    run(...args: any[]): { changes: number };
  };
}

export interface MemoryConfig {
  db: MemoryDatabase;
  getSetting: (key: string) => string | null;
  chromaUrl?: string;
}

// ----- Memory Manager Class -----
export class MemoryManager {
  private db: MemoryDatabase;
  private getSetting: (key: string) => string | null;
  private chromaUrl: string;
  private chromaClient: ChromaClient | null = null;
  private stepsCollection: Collection | null = null;
  private chromaAvailable = false;

  constructor(config: MemoryConfig) {
    this.db = config.db;
    this.getSetting = config.getSetting;
    this.chromaUrl = config.chromaUrl || "http://localhost:8000";

    // Initialize SQLite schema
    this.db.exec(`
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

    // Initialize ChromaDB connection (non-blocking)
    this.getCollection().catch(() => {});
  }

  private async getCollection(): Promise<Collection | null> {
    if (this.stepsCollection) return this.stepsCollection;

    try {
      if (!this.chromaClient) {
        this.chromaClient = new ChromaClient({ path: this.chromaUrl });
      }
      // Test connection
      await this.chromaClient.heartbeat();

      // Check if user wants OpenAI embedding
      const embeddingProvider =
        this.getSetting("embedding_provider") || "default";

      if (embeddingProvider === "openai") {
        const apiKey = this.getSetting("openai_api_key");
        if (apiKey) {
          try {
            const embeddingModel =
              this.getSetting("embedding_model") || "text-embedding-3-small";

            const embedder = new OpenAIEmbeddingFunction({
              apiKey,
              modelName: embeddingModel,
            });

            this.stepsCollection =
              await this.chromaClient.getOrCreateCollection({
                name: "test_steps_memory",
                embeddingFunction: embedder,
              });
            this.chromaAvailable = true;
            console.log(
              `✅ ChromaDB connected — OpenAI Embedding (${embeddingModel})`,
            );
            return this.stepsCollection;
          } catch (e) {
            console.warn("⚠️ OpenAI Embedding failed, using default:", e);
          }
        }
      }

      // Default: use built-in embedding (local, free)
      this.stepsCollection = await this.chromaClient.getOrCreateCollection({
        name: "test_steps_memory",
      });
      this.chromaAvailable = true;
      console.log("✅ ChromaDB connected — Default local embedding");
      return this.stepsCollection;
    } catch (error) {
      this.chromaAvailable = false;
      console.log(
        "⚠️  ChromaDB not available — Falling back to SQLite-only mode",
      );
      return null;
    }
  }

  // ----- Core API -----

  /**
   * 🧠 LEARN — Save a successful step mapping to memory
   */
  async learn(params: {
    stepDescription: string;
    testPlanId: string;
    targetUrl: string;
    selector: string;
    selectorType?: string;
    actionType: string;
    actionValue?: string;
    fingerprint: ElementFingerprint;
  }): Promise<void> {
    const id = this.generateId(params.stepDescription, params.testPlanId);

    // 1. Save to SQLite
    const existing = this.db
      .query("SELECT id, success_count FROM step_mappings WHERE id = ?")
      .get(id) as { id: string; success_count: number } | null;

    if (existing) {
      this.db
        .query(
          `UPDATE step_mappings SET
            selector = ?, selector_type = ?, action_type = ?, action_value = ?,
            fingerprint = ?, success_count = success_count + 1,
            last_success_at = datetime('now'), updated_at = datetime('now')
           WHERE id = ?`,
        )
        .run(
          params.selector,
          params.selectorType || "css",
          params.actionType,
          params.actionValue || null,
          JSON.stringify(params.fingerprint),
          id,
        );
    } else {
      this.db
        .query(
          `INSERT INTO step_mappings
            (id, step_description, test_plan_id, target_url, selector, selector_type,
             action_type, action_value, fingerprint)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
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

    // 2. Save to ChromaDB
    const collection = await this.getCollection();
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
        console.warn("ChromaDB upsert failed:", error);
      }
    }
  }

  /**
   * 🔍 RECALL — Find a previously successful mapping for a step
   */
  async recall(
    stepDescription: string,
    testPlanId: string,
  ): Promise<RecallResult | null> {
    // Strategy 1: Exact match in SQLite
    const exactId = this.generateId(stepDescription, testPlanId);
    const exactMatch = this.db
      .query(
        `SELECT * FROM step_mappings
         WHERE id = ? AND success_count > fail_count`,
      )
      .get(exactId) as any;

    if (exactMatch) {
      return {
        mapping: this.rowToMapping(exactMatch),
        similarity: 1.0,
        source: "exact",
      };
    }

    // Strategy 2: Semantic search in ChromaDB
    const collection = await this.getCollection();
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
          results.distances[0][0] < 0.3
        ) {
          const matchedId = results.ids[0][0];
          const sqliteData = this.db
            .query(
              `SELECT * FROM step_mappings
               WHERE id = ? AND success_count > fail_count`,
            )
            .get(matchedId) as any;

          if (sqliteData) {
            return {
              mapping: this.rowToMapping(sqliteData),
              similarity: 1 - (results.distances?.[0]?.[0] ?? 0),
              source: "semantic",
            };
          }
        }
      } catch (error) {
        console.warn("ChromaDB query failed:", error);
      }
    }

    // Strategy 3: Fuzzy match in SQLite
    const fuzzyMatch = this.db
      .query(
        `SELECT * FROM step_mappings
         WHERE test_plan_id = ? AND success_count > fail_count
         ORDER BY success_count DESC`,
      )
      .all(testPlanId) as any[];

    for (const row of fuzzyMatch) {
      const sim = this.simpleSimilarity(
        stepDescription.toLowerCase(),
        row.step_description.toLowerCase(),
      );
      if (sim > 0.8) {
        return {
          mapping: this.rowToMapping(row),
          similarity: sim,
          source: "exact",
        };
      }
    }

    return null;
  }

  /**
   * ❌ FORGET — Record that a mapping failed
   */
  recordFailure(stepDescription: string, testPlanId: string): void {
    const id = this.generateId(stepDescription, testPlanId);
    this.db
      .query(
        `UPDATE step_mappings SET
          fail_count = fail_count + 1,
          last_fail_at = datetime('now'),
          updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(id);
  }

  /**
   * 📊 GET STATS — Get memory statistics
   */
  getMemoryStats(): {
    totalMappings: number;
    healthyMappings: number;
    staleMappings: number;
    chromaAvailable: boolean;
  } {
    const total = this.db
      .query("SELECT COUNT(*) as count FROM step_mappings")
      .get() as { count: number };
    const healthy = this.db
      .query(
        "SELECT COUNT(*) as count FROM step_mappings WHERE success_count > fail_count",
      )
      .get() as { count: number };
    const stale = this.db
      .query(
        "SELECT COUNT(*) as count FROM step_mappings WHERE fail_count >= success_count AND fail_count > 0",
      )
      .get() as { count: number };

    return {
      totalMappings: total.count,
      healthyMappings: healthy.count,
      staleMappings: stale.count,
      chromaAvailable: this.chromaAvailable,
    };
  }

  /**
   * 🗑️ CLEAR — Clear all memory for a test plan
   */
  async clearMemory(testPlanId?: string): Promise<number> {
    let deleted = 0;

    if (testPlanId) {
      const result = this.db
        .query("DELETE FROM step_mappings WHERE test_plan_id = ?")
        .run(testPlanId);
      deleted = result.changes;
    } else {
      const result = this.db.query("DELETE FROM step_mappings").run();
      deleted = result.changes;
    }

    // Also clear from ChromaDB
    const collection = await this.getCollection();
    if (collection && testPlanId) {
      try {
        const ids = (
          this.db
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
   */
  resetConnection(): void {
    this.stepsCollection = null;
    this.chromaClient = null;
    this.chromaAvailable = false;
    this.getCollection().catch(() => {});
  }

  /**
   * 📋 LIST — Get all mappings for a test plan
   */
  listMappings(testPlanId?: string): StepMapping[] {
    const query = testPlanId
      ? "SELECT * FROM step_mappings WHERE test_plan_id = ? ORDER BY updated_at DESC"
      : "SELECT * FROM step_mappings ORDER BY updated_at DESC LIMIT 50";
    const rows = (
      testPlanId
        ? this.db.query(query).all(testPlanId)
        : this.db.query(query).all()
    ) as any[];
    return rows.map(this.rowToMapping);
  }

  // ----- Helper Functions -----

  private generateId(description: string, testPlanId: string): string {
    const normalized = description.toLowerCase().trim().replace(/\s+/g, " ");
    let hash = 0;
    const str = `${testPlanId}:${normalized}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `mem_${Math.abs(hash).toString(36)}`;
  }

  private rowToMapping(row: any): StepMapping {
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

  private simpleSimilarity(a: string, b: string): number {
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
}
