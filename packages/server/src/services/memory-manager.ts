// ============================================================
// Memory Manager — Server Wrapper (delegates to @ai-qa-agent/core)
// ============================================================
import { MemoryManager, type MemoryDatabase } from "@ai-qa-agent/core";
import db, { getSetting } from "../db/database";

// Re-export types from core
export type {
  ElementFingerprint,
  StepMapping,
  RecallResult,
} from "@ai-qa-agent/core";

// Create a database adapter that wraps Bun:SQLite
const dbAdapter: MemoryDatabase = {
  exec(sql: string) {
    db.exec(sql);
  },
  query(sql: string) {
    return {
      get(...args: any[]) {
        return db.query(sql).get(...args);
      },
      all(...args: any[]) {
        return db.query(sql).all(...args);
      },
      run(...args: any[]) {
        return db.query(sql).run(...args);
      },
    };
  },
};

// Singleton memory manager instance
let memoryInstance: MemoryManager | null = null;

export function getMemoryManager(): MemoryManager {
  if (!memoryInstance) {
    memoryInstance = new MemoryManager({
      db: dbAdapter,
      getSetting,
    });
  }
  return memoryInstance;
}

// ----- Backward-compatible function exports -----
// These wrap the singleton instance for existing server code that imports these functions

export async function learn(
  params: Parameters<MemoryManager["learn"]>[0],
): Promise<void> {
  return getMemoryManager().learn(params);
}

export async function recall(stepDescription: string, testPlanId: string) {
  return getMemoryManager().recall(stepDescription, testPlanId);
}

export function recordFailure(
  stepDescription: string,
  testPlanId: string,
): void {
  return getMemoryManager().recordFailure(stepDescription, testPlanId);
}

export function getMemoryStats() {
  return getMemoryManager().getMemoryStats();
}

export async function clearMemory(testPlanId?: string) {
  return getMemoryManager().clearMemory(testPlanId);
}

export function resetConnection(): void {
  return getMemoryManager().resetConnection();
}

export function listMappings(testPlanId?: string) {
  return getMemoryManager().listMappings(testPlanId);
}
