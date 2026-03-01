// ============================================================
// SQLite Database — Local-first Storage
// ============================================================
import { join } from "path";
import { createLocalDatabase } from "@ai-qa-agent/core";

// Shared data directory at project root — used by both Server and CLI
const PROJECT_ROOT = join(import.meta.dir, "../../../..");

// Initialize unified database from core
const localDb = createLocalDatabase(PROJECT_ROOT);

// Export instances and functions directly to maintain compatibility
// with existing server code without having to update every route file.
export const {
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
  screenshotsDir: SCREENSHOTS_DIR,
  dataDir: DATA_DIR,
  reportsDir: REPORTS_DIR,
} = localDb;

export default localDb.rawDb;
