// ============================================================
// Test Runner — Orchestrator (Core)
// ============================================================
// This module coordinates the test execution lifecycle:
//   1. Launches the browser
//   2. Runs each test case (Fast Path → Slow Path → HITL fallback)
//   3. Collects results and reports them
//
// Action execution, page utilities, and HITL are in separate modules.
// ============================================================

import {
  chromium,
  type Browser,
  type Page,
  type BrowserContext,
} from "playwright";
import type {
  TestCase,
  TestCaseResult,
  StepResult,
  TestRun,
  PlaywrightAction,
  RunnerReporter,
} from "./types";
import { ProviderRegistry } from "./ai/registry";
import {
  initPauseState,
  cleanupPauseState,
  waitIfPaused,
  isPaused,
} from "./pause-controller";
import type { MemoryManager, ElementFingerprint } from "./memory-manager";

// --- Extracted modules ---
import { executeAction, executeActionWithRetry } from "./action-executor";
import {
  normalizeUrl,
  setupDialogHandler,
  getPageContext,
  takeScreenshot,
  setupBrowserOverlay,
} from "./page-utils";
import { waitForUserAction } from "./hitl";

// Re-export for backward compatibility
export { executeAction, executeActionWithRetry } from "./action-executor";
export {
  normalizeUrl,
  setupDialogHandler,
  getPageContext,
  takeScreenshot,
} from "./page-utils";
export { waitForUserAction } from "./hitl";
export type { HITLResult } from "./hitl";

// ============================================================
// Config & Options
// ============================================================

export interface RunnerOptions {
  headless: boolean;
  slowMo: number;
  viewport: { width: number; height: number };
  timeout: number;
}

export interface RunnerConfig {
  reporter: RunnerReporter;
  memory: MemoryManager;
  screenshotsDir: string;
  options?: Partial<RunnerOptions>;
  /** Enable Human-in-the-Loop fallback when AI fails */
  hitl?: boolean;
}

const DEFAULT_OPTIONS: RunnerOptions = {
  headless: false,
  slowMo: 100,
  viewport: { width: 1280, height: 720 },
  timeout: 30000,
};

// ============================================================
// Run a Single Test Case
// ============================================================

async function runTestCase(
  page: Page,
  testCase: TestCase,
  targetUrl: string,
  runId: string,
  testPlanId: string,
  config: RunnerConfig,
): Promise<TestCaseResult> {
  const { reporter, memory, screenshotsDir } = config;
  const startTime = Date.now();
  const stepResults: StepResult[] = [];
  let status: TestCaseResult["status"] = "passed";

  reporter.onTestCaseStarted(runId, testCase.id, testCase.title);
  reporter.onLog(runId, "info", `▶ Starting: ${testCase.title}`);

  const ai = ProviderRegistry.getActive();

  // Navigate to test case URL
  const baseUrl = normalizeUrl(targetUrl);
  const testUrl = testCase.url
    ? new URL(testCase.url, baseUrl).toString()
    : baseUrl;

  try {
    await page.context().clearCookies();
    await page.goto(testUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.evaluate(() => {
      try {
        localStorage.clear();
      } catch {}
      try {
        sessionStorage.clear();
      } catch {}
    });
    await page.goto(testUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(500);
  } catch (e: any) {
    const result: TestCaseResult = {
      testCaseId: testCase.id,
      testCaseTitle: testCase.title,
      status: "error",
      stepResults: [],
      durationMs: Date.now() - startTime,
      startedAt: new Date(startTime).toISOString(),
      finishedAt: new Date().toISOString(),
      aiAnalysis: `Failed to navigate to ${testUrl}: ${e.message}`,
    };
    reporter.onTestCaseCompleted(runId, result);
    return result;
  }

  // Execute each step
  for (const step of testCase.steps) {
    if (isPaused(runId)) {
      reporter.onLog(
        runId,
        "info",
        `  ⏸️ Paused before step ${step.order}. Waiting for resume...`,
      );
      await waitIfPaused(runId);
      reporter.onLog(
        runId,
        "info",
        `  ▶️ Resumed! Continuing from step ${step.order}`,
      );
    }

    const stepStart = Date.now();

    try {
      // ======= MEMORY: Fast Path — Try cached selector first =======
      const cached = await memory.recall(step.action, testPlanId);
      let usedFastPath = false;

      if (cached) {
        const cachedAction: PlaywrightAction = {
          type: cached.mapping.actionType as any,
          selector: cached.mapping.selector,
          value: cached.mapping.actionValue || undefined,
          description: step.action,
        };

        const sourceName = cached.source === "exact" ? "SQLite" : "ChromaDB";

        reporter.onLog(
          runId,
          "info",
          `  Step ${step.order}: ⚡ Fast Path via ${sourceName} (${(cached.similarity * 100).toFixed(0)}% match) → ${cachedAction.type}(${cachedAction.selector})`,
        );

        try {
          await executeActionWithRetry(page, cachedAction);
          usedFastPath = true;
        } catch {
          memory.recordFailure(step.action, testPlanId);
          reporter.onLog(
            runId,
            "warn",
            `  Step ${step.order}: ⚡→🧠 Fast Path failed, switching to AI (Self-healing)`,
          );
          usedFastPath = false;
        }
      }

      // ======= MEMORY: Slow Path — Ask AI (supports 1 Step → N Actions) =======
      if (!usedFastPath) {
        const pageContext = await getPageContext(page);
        const actions = await ai.mapStepToActions(step, pageContext);

        if (actions.length === 1) {
          // Single action — behaves exactly like the old mapStepToAction
          const singleAction = actions[0];
          reporter.onLog(
            runId,
            "info",
            `  Step ${step.order}: 🧠 AI Path → ${singleAction.type}(${singleAction.selector || singleAction.url || ""})`,
          );

          await executeActionWithRetry(page, singleAction);

          // Save successful single-action mapping to memory (cacheable)
          if (singleAction.selector) {
            const fingerprint: ElementFingerprint = {
              tagName: "unknown",
              textContent: step.action,
            };

            try {
              const elInfo = await page.$eval(
                singleAction.selector,
                (el: any) => ({
                  tagName: el.tagName?.toLowerCase() || "unknown",
                  textContent: (el.textContent || "").trim().slice(0, 100),
                  ariaLabel: el.getAttribute("aria-label") || undefined,
                  placeholder: el.getAttribute("placeholder") || undefined,
                  name: el.getAttribute("name") || undefined,
                  type: el.getAttribute("type") || undefined,
                  className:
                    el.className?.toString()?.slice(0, 200) || undefined,
                }),
              );
              Object.assign(fingerprint, elInfo);
            } catch {
              /* can't fingerprint, that's ok */
            }

            await memory.learn({
              stepDescription: step.action,
              testPlanId,
              targetUrl: testUrl,
              selector: singleAction.selector,
              actionType: singleAction.type,
              actionValue: singleAction.value,
              fingerprint,
            });
          }
        } else {
          // Multiple actions — high-level step decomposed by AI
          reporter.onLog(
            runId,
            "info",
            `  Step ${step.order}: 🧠 AI Path (${actions.length} sub-actions) → ${actions.map((a) => a.type).join(" → ")}`,
          );

          for (let i = 0; i < actions.length; i++) {
            const subAction = actions[i];
            reporter.onLog(
              runId,
              "info",
              `    ↳ [${i + 1}/${actions.length}] ${subAction.type}(${subAction.selector || subAction.url || ""}) — ${subAction.description}`,
            );
            await executeActionWithRetry(page, subAction);

            // Brief wait between sub-actions for page to settle
            if (i < actions.length - 1) {
              await page.waitForTimeout(200);
            }
          }
          // Note: Multi-action steps are NOT cached in memory because
          // they depend on fresh page context each run (high-level intent).
        }
      } else {
        // Fast Path succeeded — reinforce the memory
        if (cached?.mapping.selector) {
          await memory.learn({
            stepDescription: step.action,
            testPlanId,
            targetUrl: testUrl,
            selector: cached.mapping.selector,
            actionType: cached.mapping.actionType || "click",
            actionValue: cached.mapping.actionValue || undefined,
            fingerprint: cached.mapping.fingerprint,
          });
        }
      }

      // Wait for network to settle
      try {
        await page.waitForLoadState("networkidle", { timeout: 3000 });
      } catch {
        await page.waitForTimeout(300);
      }

      // Take screenshot
      let stepScreenshot: string | undefined;
      try {
        stepScreenshot = await takeScreenshot(
          page,
          `step-${testCase.id}-${step.order}`,
          screenshotsDir,
        );
      } catch {
        /* ignore screenshot errors */
      }

      const stepResult: StepResult = {
        stepOrder: step.order,
        status: "passed",
        action: step.action,
        expected: step.expected,
        screenshotPath: stepScreenshot,
        durationMs: Date.now() - stepStart,
      };

      stepResults.push(stepResult);
      reporter.onTestStepCompleted(runId, testCase.id, stepResult);
    } catch (error: any) {
      // ======= HITL Fallback: Ask user for help (headed mode only) =======
      const isHeaded = !config.options?.headless;
      const hitlEnabled = config.hitl === true;

      if (hitlEnabled && isHeaded) {
        reporter.onLog(
          runId,
          "warn",
          `  ⚠️ Step ${step.order} failed: ${error.message}`,
        );
        reporter.onLog(
          runId,
          "warn",
          `  🖐️ HITL activated — switching to Human-in-the-Loop mode`,
        );

        try {
          const hitlResult = await waitForUserAction(
            page,
            step.action,
            reporter,
            runId,
          );

          // Execute the action the user showed us
          const hitlAction: PlaywrightAction = {
            type: hitlResult.type,
            selector: hitlResult.selector,
            value: hitlResult.value,
            description: `[HITL] ${step.action}`,
          };
          await executeAction(page, hitlAction);

          // Save to memory so we never need to ask again
          const fingerprint: ElementFingerprint = {
            tagName: hitlResult.tagName || "unknown",
            textContent: hitlResult.textContent || step.action,
          };
          await memory.learn({
            stepDescription: step.action,
            testPlanId,
            targetUrl: testUrl,
            selector: hitlResult.selector,
            actionType: hitlResult.type,
            actionValue: hitlResult.value,
            fingerprint,
          });

          reporter.onLog(
            runId,
            "info",
            `  ✅ HITL: Action learned and saved to memory`,
          );

          // Wait for network to settle
          try {
            await page.waitForLoadState("networkidle", { timeout: 3000 });
          } catch {
            await page.waitForTimeout(300);
          }

          // Take screenshot
          let stepScreenshot: string | undefined;
          try {
            stepScreenshot = await takeScreenshot(
              page,
              `hitl-${testCase.id}-${step.order}`,
              screenshotsDir,
            );
          } catch {
            /* ignore */
          }

          const stepResult: StepResult = {
            stepOrder: step.order,
            status: "passed",
            action: `[HITL] ${step.action}`,
            expected: step.expected,
            screenshotPath: stepScreenshot,
            durationMs: Date.now() - stepStart,
          };
          stepResults.push(stepResult);
          reporter.onTestStepCompleted(runId, testCase.id, stepResult);
          continue; // Move to next step
        } catch (hitlError: any) {
          reporter.onLog(
            runId,
            "error",
            `  ❌ HITL also failed: ${hitlError.message}`,
          );
          // Fall through to normal failure handling below
        }
      }

      // ======= Normal failure (no HITL, or HITL failed) =======
      let screenshotPath: string | undefined;
      try {
        screenshotPath = await takeScreenshot(
          page,
          `fail-${testCase.id}-step${step.order}`,
          screenshotsDir,
        );
      } catch {
        /* ignore screenshot errors */
      }

      const stepResult: StepResult = {
        stepOrder: step.order,
        status: "failed",
        action: step.action,
        expected: step.expected,
        actual: error.message,
        screenshotPath,
        durationMs: Date.now() - stepStart,
        error: error.message,
      };

      stepResults.push(stepResult);
      status = "failed";

      reporter.onTestStepCompleted(runId, testCase.id, stepResult);
      reporter.onLog(
        runId,
        "error",
        `  ❌ Step ${step.order} failed: ${error.message}`,
      );

      memory.recordFailure(step.action, testPlanId);
      break;
    }
  }

  // Take final screenshot for failed tests
  let failScreenshot: string | undefined;
  if (status === "failed") {
    try {
      failScreenshot = await takeScreenshot(
        page,
        `result-${testCase.id}`,
        screenshotsDir,
      );
    } catch {
      /* ignore */
    }
  }

  const result: TestCaseResult = {
    testCaseId: testCase.id,
    testCaseTitle: testCase.title,
    status,
    stepResults,
    screenshotPath: failScreenshot,
    durationMs: Date.now() - startTime,
    startedAt: new Date(startTime).toISOString(),
    finishedAt: new Date().toISOString(),
  };

  const statusEmoji = status === "passed" ? "✅" : "❌";
  reporter.onLog(
    runId,
    "info",
    `${statusEmoji} ${testCase.title} — ${status} (${result.durationMs}ms)`,
  );

  reporter.onTestCaseCompleted(runId, result);
  return result;
}

// ============================================================
// Run All Tests (Public Entry Point)
// ============================================================

export async function runTests(
  testPlanId: string,
  runId: string,
  testCases: TestCase[],
  targetUrl: string,
  config: RunnerConfig,
  existingRun?: TestRun,
): Promise<TestRun> {
  const opts = { ...DEFAULT_OPTIONS, ...(config.options || {}) };
  targetUrl = normalizeUrl(targetUrl);
  const { reporter } = config;

  const enabledCases = testCases.filter((tc) => tc.enabled);

  const run: TestRun = {
    id: runId,
    testPlanId,
    status: "running",
    targetUrl,
    results: [],
    summary: {
      total: enabledCases.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      error: 0,
    },
    startedAt: existingRun ? existingRun.startedAt : new Date().toISOString(),
  };

  reporter.onTestRunStarted(runId, enabledCases.length);
  initPauseState(runId);

  reporter.onLog(
    runId,
    "info",
    existingRun
      ? `🔄 Rerunning test run ${runId} with ${enabledCases.length} test cases against ${targetUrl}`
      : `🚀 Starting test run with ${enabledCases.length} test cases against ${targetUrl}`,
  );

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: opts.headless,
      slowMo: opts.slowMo,
    });

    const context: BrowserContext = await browser.newContext({
      viewport: opts.viewport,
    });

    const page = await context.newPage();
    page.setDefaultTimeout(opts.timeout);
    setupDialogHandler(page);

    // Show visual indicator that AI QA Agent is controlling the browser
    if (!opts.headless) {
      setupBrowserOverlay(page);
    }

    for (const testCase of enabledCases) {
      const result = await runTestCase(
        page,
        testCase,
        targetUrl,
        runId,
        testPlanId,
        config,
      );
      run.results.push(result);

      switch (result.status) {
        case "passed":
          run.summary.passed++;
          break;
        case "failed":
          run.summary.failed++;
          break;
        case "skipped":
          run.summary.skipped++;
          break;
        case "error":
          run.summary.error++;
          break;
      }
    }

    await context.close();
  } catch (error: any) {
    reporter.onTestRunError(runId, error.message);
    reporter.onLog(runId, "error", `💥 Test run crashed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  run.status = "completed";
  run.completedAt = new Date().toISOString();
  run.durationMs = Date.now() - new Date(run.startedAt).getTime();

  cleanupPauseState(runId);

  reporter.onTestRunCompleted(runId, run.summary);

  reporter.onLog(
    runId,
    "info",
    `\n📊 Results: ${run.summary.passed}/${run.summary.total} passed | ${run.summary.failed} failed | ${run.summary.error} errors | ${run.durationMs}ms`,
  );

  return run;
}
