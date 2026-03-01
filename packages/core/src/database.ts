// ============================================================
// Core Database — Unified SQLite for Server and CLI
// ============================================================
import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";
import { join } from "path";
import type { MemoryDatabase } from "./memory-manager";

export function createLocalDatabase(projectDir: string) {
  const dataDir = join(projectDir, ".ai-qa");
  const dbPath = join(dataDir, "qa-agent.db");
  const screenshotsDir = join(dataDir, "screenshots");
  const reportsDir = join(dataDir, "reports");

  // Create directories
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(screenshotsDir, { recursive: true });
  mkdirSync(reportsDir, { recursive: true });

  const sqliteDb = new Database(dbPath, { create: true });

  // Enable WAL mode for better concurrent read performance
  sqliteDb.exec("PRAGMA journal_mode = WAL");
  sqliteDb.exec("PRAGMA foreign_keys = ON");

  // Initialize tables
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS test_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target_url TEXT NOT NULL,
      test_cases TEXT NOT NULL,
      document_source TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS test_runs (
      id TEXT PRIMARY KEY,
      test_plan_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      target_url TEXT NOT NULL,
      results TEXT NOT NULL DEFAULT '[]',
      summary TEXT NOT NULL DEFAULT '{}',
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      duration_ms INTEGER,
      FOREIGN KEY (test_plan_id) REFERENCES test_plans(id)
    );
  `);

  // MemoryDatabase adapter for MemoryManager
  const dbAdapter: MemoryDatabase = {
    exec(sql: string) {
      sqliteDb.exec(sql);
    },
    query(sql: string) {
      return {
        get(...args: any[]) {
          return sqliteDb.query(sql).get(...args);
        },
        all(...args: any[]) {
          return sqliteDb.query(sql).all(...args);
        },
        run(...args: any[]) {
          return sqliteDb.query(sql).run(...args);
        },
      };
    },
  };

  // --- Settings ---
  function getSetting(key: string): string | null {
    const row = sqliteDb
      .query("SELECT value FROM settings WHERE key = ?")
      .get(key) as { value: string } | null;
    return row?.value ?? null;
  }

  function setSetting(key: string, value: string): void {
    sqliteDb
      .query(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')`,
      )
      .run(key, value, value);
  }

  function getAllSettings(): Record<string, string> {
    const rows = sqliteDb
      .query("SELECT key, value FROM settings")
      .all() as Array<{
      key: string;
      value: string;
    }>;
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  // --- Test Plans ---
  function saveTestPlan(plan: {
    id: string;
    name: string;
    targetUrl: string;
    testCases: unknown[];
    documentSource?: string;
  }): void {
    sqliteDb
      .query(
        `INSERT INTO test_plans (id, name, target_url, test_cases, document_source)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = ?, target_url = ?, test_cases = ?, document_source = ?, updated_at = datetime('now')`,
      )
      .run(
        plan.id,
        plan.name,
        plan.targetUrl,
        JSON.stringify(plan.testCases),
        plan.documentSource || null,
        plan.name,
        plan.targetUrl,
        JSON.stringify(plan.testCases),
        plan.documentSource || null,
      );
  }

  function getTestPlan(id: string): any | null {
    const row = sqliteDb
      .query("SELECT * FROM test_plans WHERE id = ?")
      .get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      targetUrl: row.target_url,
      testCases: JSON.parse(row.test_cases),
      documentSource: row.document_source,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function listTestPlans(): any[] {
    const rows = sqliteDb
      .query("SELECT * FROM test_plans ORDER BY updated_at DESC")
      .all() as any[];
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      targetUrl: row.target_url,
      testCases: JSON.parse(row.test_cases),
      documentSource: row.document_source,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  function deleteTestPlan(id: string): void {
    sqliteDb.query("DELETE FROM test_plans WHERE id = ?").run(id);
  }

  // --- Test Runs ---
  function saveTestRun(run: {
    id: string;
    testPlanId: string;
    status: string;
    targetUrl: string;
    results: unknown[];
    summary: unknown;
    startedAt: string;
    completedAt?: string;
    durationMs?: number;
  }): void {
    sqliteDb
      .query(
        `INSERT INTO test_runs (id, test_plan_id, status, target_url, results, summary, started_at, completed_at, duration_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           status = ?, results = ?, summary = ?, completed_at = ?, duration_ms = ?`,
      )
      .run(
        run.id,
        run.testPlanId,
        run.status,
        run.targetUrl,
        JSON.stringify(run.results),
        JSON.stringify(run.summary),
        run.startedAt,
        run.completedAt || null,
        run.durationMs || null,
        run.status,
        JSON.stringify(run.results),
        JSON.stringify(run.summary),
        run.completedAt || null,
        run.durationMs || null,
      );
  }

  function getTestRun(id: string): any | null {
    const row = sqliteDb
      .query("SELECT * FROM test_runs WHERE id = ?")
      .get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      testPlanId: row.test_plan_id,
      status: row.status,
      targetUrl: row.target_url,
      results: JSON.parse(row.results),
      summary: JSON.parse(row.summary),
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationMs: row.duration_ms,
    };
  }

  function listTestRuns(testPlanId?: string): any[] {
    const query = testPlanId
      ? "SELECT * FROM test_runs WHERE test_plan_id = ? ORDER BY started_at DESC"
      : "SELECT * FROM test_runs ORDER BY started_at DESC";
    const rows = (
      testPlanId
        ? sqliteDb.query(query).all(testPlanId)
        : sqliteDb.query(query).all()
    ) as any[];
    return rows.map((row) => ({
      id: row.id,
      testPlanId: row.test_plan_id,
      status: row.status,
      targetUrl: row.target_url,
      results: JSON.parse(row.results),
      summary: JSON.parse(row.summary),
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationMs: row.duration_ms,
    }));
  }

  return {
    db: dbAdapter,
    rawDb: sqliteDb,
    dataDir,
    screenshotsDir,
    reportsDir,
    getSetting,
    setSetting,
    getAllSettings,
    saveTestPlan,
    getTestPlan,
    listTestPlans,
    deleteTestPlan,
    saveTestRun,
    getTestRun,
    listTestRuns,
    close: () => sqliteDb.close(),
  };
}
