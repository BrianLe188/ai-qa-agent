// ============================================================
// Report Generator — Server Wrapper (delegates to @ai-qa-agent/core)
// ============================================================
import {
  generateHtmlReport as coreGenerateHtmlReport,
  saveReport as coreSaveReport,
  getReportPath as coreGetReportPath,
  type TestRun,
} from "@ai-qa-agent/core";
import { DATA_DIR } from "../db/database";
import { join } from "path";
import { mkdirSync } from "fs";

const REPORTS_DIR = join(DATA_DIR, "reports");
mkdirSync(REPORTS_DIR, { recursive: true });

/** Generate the full HTML report */
export function generateHtmlReport(run: TestRun, planName?: string): string {
  return coreGenerateHtmlReport(run, planName, {
    screenshotBaseUrl: "/api/screenshots",
  });
}

/** Save HTML report to file and return the filename */
export function saveReport(run: TestRun, planName?: string): string {
  return coreSaveReport(run, REPORTS_DIR, planName, {
    screenshotBaseUrl: "/api/screenshots",
  });
}

/** Get report file path */
export function getReportPath(filename: string): string | null {
  return coreGetReportPath(filename, REPORTS_DIR);
}

export { REPORTS_DIR };
