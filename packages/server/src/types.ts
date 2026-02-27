// ============================================================
// Shared Types for AI QA Agent
// ============================================================

// --- Test Case Types ---
export interface TestStep {
  order: number;
  action: string; // e.g. "Click the Sign In button"
  target?: string; // e.g. "button with text 'Sign In'"
  value?: string; // e.g. "test@example.com"
  expected?: string; // e.g. "Navigate to dashboard"
}

export interface TestCase {
  id: string;
  title: string;
  description?: string;
  priority: "critical" | "high" | "medium" | "low";
  preconditions?: string[];
  url?: string; // relative URL path e.g. "/login"
  steps: TestStep[];
  expectedResult: string;
  tags?: string[];
  source: "document" | "ai-generated";
  enabled: boolean;
}

export interface TestPlan {
  id: string;
  name: string;
  targetUrl: string;
  testCases: TestCase[];
  createdAt: string;
  documentSource?: string; // original document filename
}

// --- Test Run / Execution Types ---
export type TestStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed"
  | "skipped"
  | "error";

export interface StepResult {
  stepOrder: number;
  status: TestStatus;
  action: string;
  expected?: string;
  actual?: string;
  screenshotPath?: string;
  durationMs: number;
  error?: string;
}

export interface TestCaseResult {
  testCaseId: string;
  testCaseTitle: string;
  status: TestStatus;
  stepResults: StepResult[];
  screenshotPath?: string; // failure screenshot
  durationMs: number;
  startedAt: string;
  finishedAt?: string;
  aiAnalysis?: string; // AI's analysis of the failure
}

export interface TestRun {
  id: string;
  testPlanId: string;
  status: "pending" | "running" | "completed" | "aborted";
  targetUrl: string;
  results: TestCaseResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    error: number;
  };
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}

// --- AI Provider Types ---
export interface ParseContext {
  targetUrl?: string;
  appDescription?: string;
}

export interface AppContext {
  targetUrl: string;
  existingTestCases: TestCase[];
  pageStructure?: string; // HTML structure hints
}

export interface PageContext {
  url: string;
  html: string;
  visibleText: string;
  interactiveElements: InteractiveElement[];
}

export interface InteractiveElement {
  tag: string;
  type?: string;
  text?: string;
  placeholder?: string;
  id?: string;
  name?: string;
  selector: string;
}

export interface PlaywrightAction {
  type:
    | "navigate"
    | "click"
    | "fill"
    | "select"
    | "check"
    | "wait"
    | "assert"
    | "screenshot"
    | "hover"
    | "press";
  selector?: string;
  value?: string;
  url?: string;
  timeout?: number;
  description: string;
}

export interface FailureAnalysis {
  summary: string;
  possibleCauses: string[];
  suggestedFix?: string;
  severity: "critical" | "major" | "minor" | "cosmetic";
}

// --- Settings Types ---
export interface AIProviderConfig {
  name: string;
  displayName: string;
  apiKey: string;
  model?: string;
  isActive: boolean;
}

export interface AppSettings {
  aiProviders: AIProviderConfig[];
  activeProvider: string;
  browserOptions: {
    headless: boolean;
    slowMo: number; // ms delay between actions
    viewport: { width: number; height: number };
    timeout: number; // ms
  };
  screenshotOnFailure: boolean;
  screenshotOnEveryStep: boolean;
  maxConcurrentTests: number;
}

// --- WebSocket Event Types ---
export type WSEvent =
  | { type: "test-run:started"; data: { runId: string; total: number } }
  | {
      type: "test-case:started";
      data: { runId: string; testCaseId: string; title: string };
    }
  | {
      type: "test-step:completed";
      data: { runId: string; testCaseId: string; step: StepResult };
    }
  | {
      type: "test-case:completed";
      data: { runId: string; result: TestCaseResult };
    }
  | {
      type: "test-run:completed";
      data: { runId: string; summary: TestRun["summary"] };
    }
  | { type: "test-run:error"; data: { runId: string; error: string } }
  | {
      type: "log";
      data: {
        runId: string;
        level: "info" | "warn" | "error";
        message: string;
      };
    };
