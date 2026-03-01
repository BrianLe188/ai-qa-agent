// ============================================================
// @ai-qa-agent/core — Public API
// ============================================================

// Types
export type {
  TestStep,
  TestCase,
  TestPlan,
  TestStatus,
  StepResult,
  TestCaseResult,
  TestRun,
  ParseContext,
  AppContext,
  PageContext,
  InteractiveElement,
  PlaywrightAction,
  FailureAnalysis,
  AIProviderConfig,
  AppSettings,
  RunnerReporter,
  WSEvent,
} from "./types";

// AI Provider
export type { AIProvider } from "./ai/provider";
export { ProviderRegistry } from "./ai/registry";
export { OpenAIProvider } from "./ai/openai.adapter";

// Memory Manager
export { MemoryManager } from "./memory-manager";
export type {
  ElementFingerprint,
  StepMapping,
  RecallResult,
  MemoryDatabase,
  MemoryConfig,
} from "./memory-manager";

// Test Runner
export { runTests } from "./test-runner";
export type { RunnerOptions, RunnerConfig } from "./test-runner";

// Pause Controller
export {
  initPauseState,
  cleanupPauseState,
  waitIfPaused,
  isPaused,
  pauseRun,
  resumeRun,
  getPauseInfo,
} from "./pause-controller";

// Report Generator
export {
  generateHtmlReport,
  saveReport,
  getReportPath,
} from "./report-generator";
export type { ReportOptions } from "./report-generator";

// Database
export { createLocalDatabase } from "./database";
