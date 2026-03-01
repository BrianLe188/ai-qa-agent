// ============================================================
// Test Runner — Server Wrapper (delegates to @ai-qa-agent/core)
// ============================================================
import {
  runTests as coreRunTests,
  MemoryManager,
  saveReport,
  type RunnerConfig,
  type RunnerReporter,
  type TestCase,
  type TestRun,
} from "@ai-qa-agent/core";
import type { WSEvent } from "../types";
import { SCREENSHOTS_DIR, REPORTS_DIR } from "../db/database";
import { getMemoryManager } from "./memory-manager";

export type WSBroadcast = (event: WSEvent) => void;

interface RunnerOptions {
  headless: boolean;
  slowMo: number;
  viewport: { width: number; height: number };
  timeout: number;
}

/**
 * Create a RunnerReporter that bridges core events → WebSocket broadcasts
 */
function createWSReporter(broadcast: WSBroadcast): RunnerReporter {
  return {
    onTestRunStarted(runId, total) {
      broadcast({ type: "test-run:started", data: { runId, total } });
    },
    onTestCaseStarted(runId, testCaseId, title) {
      broadcast({
        type: "test-case:started",
        data: { runId, testCaseId, title },
      });
    },
    onTestStepCompleted(runId, testCaseId, step) {
      broadcast({
        type: "test-step:completed",
        data: { runId, testCaseId, step },
      });
    },
    onTestCaseCompleted(runId, result) {
      broadcast({ type: "test-case:completed", data: { runId, result } });
    },
    onTestRunCompleted(runId, summary) {
      broadcast({ type: "test-run:completed", data: { runId, summary } });
    },
    onTestRunError(runId, error) {
      broadcast({ type: "test-run:error", data: { runId, error } });
    },
    onReportReady(runId, reportUrl, downloadUrl) {
      broadcast({
        type: "report:ready",
        data: { runId, reportUrl, downloadUrl },
      });
    },
    onTestRunPaused(runId, pausedAt, stepOrder) {
      broadcast({
        type: "test-run:paused",
        data: { runId, pausedAt, stepOrder },
      });
    },
    onTestRunResumed(runId) {
      broadcast({ type: "test-run:resumed", data: { runId } });
    },
    onLog(runId, level, message) {
      broadcast({ type: "log", data: { runId, level, message } });
    },
  };
}

/**
 * Run all test cases in a test plan (Server entry point)
 */
export async function runTests(
  testPlanId: string,
  runId: string,
  testCases: TestCase[],
  targetUrl: string,
  options: Partial<RunnerOptions>,
  broadcast: WSBroadcast,
  existingRun?: TestRun,
): Promise<TestRun> {
  const memory = getMemoryManager();
  const reporter = createWSReporter(broadcast);

  const config: RunnerConfig = {
    reporter,
    memory,
    screenshotsDir: SCREENSHOTS_DIR,
    options,
  };

  const run = await coreRunTests(
    testPlanId,
    runId,
    testCases,
    targetUrl,
    config,
    existingRun,
  );

  // Auto-generate HTML report
  try {
    const reportFilename = saveReport(run, REPORTS_DIR);
    broadcast({
      type: "report:ready",
      data: {
        runId,
        reportUrl: `/api/reports/${runId}`,
        downloadUrl: `/api/reports/download/${reportFilename}`,
      },
    });
    broadcast({
      type: "log",
      data: {
        runId,
        level: "info",
        message: `📋 HTML Report: /api/reports/${runId}`,
      },
    });
  } catch (err: any) {
    console.error("Failed to generate report:", err.message);
  }

  return run;
}
