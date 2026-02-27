// ============================================================
// Test Runner — Playwright Browser Automation Engine
// ============================================================
import {
  chromium,
  type Browser,
  type Page,
  type BrowserContext,
} from "playwright";
import { join } from "path";
import { nanoid } from "nanoid";
import type {
  TestCase,
  TestCaseResult,
  StepResult,
  TestRun,
  PlaywrightAction,
  PageContext,
  InteractiveElement,
  WSEvent,
} from "../types";
import { ProviderRegistry } from "./ai/registry";
import { SCREENSHOTS_DIR } from "../db/database";
import { saveReport } from "./report-generator";
import {
  initPauseState,
  cleanupPauseState,
  waitIfPaused,
  isPaused,
} from "./pause-controller";

export type WSBroadcast = (event: WSEvent) => void;

interface RunnerOptions {
  headless: boolean;
  slowMo: number;
  viewport: { width: number; height: number };
  timeout: number;
}

/** Ensure URL has a protocol prefix */
function normalizeUrl(url: string): string {
  if (!url.match(/^https?:\/\//)) {
    return `http://${url}`;
  }
  return url;
}

const DEFAULT_OPTIONS: RunnerOptions = {
  headless: false,
  slowMo: 100,
  viewport: { width: 1280, height: 720 },
  timeout: 30000,
};

/**
 * Auto-dismiss browser dialogs (alert, confirm, prompt)
 */
function setupDialogHandler(page: Page): void {
  page.on("dialog", async (dialog) => {
    console.log(
      `  📢 Dialog detected: [${dialog.type()}] "${dialog.message()}"`,
    );
    await dialog.accept();
  });
}

/**
 * Execute a single Playwright action on the page
 */
async function executeAction(
  page: Page,
  action: PlaywrightAction,
): Promise<void> {
  const timeout = action.timeout ?? 10000;

  switch (action.type) {
    case "navigate":
      if (action.url) {
        // Resolve relative URLs against the current page origin
        let navUrl = action.url;
        if (!navUrl.match(/^https?:\/\//)) {
          try {
            navUrl = new URL(navUrl, page.url()).toString();
          } catch {
            // fallback: use as-is
          }
        }
        await page.goto(navUrl, { waitUntil: "domcontentloaded", timeout });
      }
      break;

    case "click":
      if (action.selector) {
        await page.locator(action.selector).first().click({ timeout });
      }
      break;

    case "dblclick":
      if (action.selector) {
        await page.locator(action.selector).first().dblclick({ timeout });
      }
      break;

    case "fill":
      if (action.selector && action.value !== undefined) {
        await page
          .locator(action.selector)
          .first()
          .fill(action.value, { timeout });
      }
      break;

    case "clear":
      if (action.selector) {
        await page.locator(action.selector).first().fill("", { timeout });
      }
      break;

    case "select":
      if (action.selector && action.value) {
        await page
          .locator(action.selector)
          .first()
          .selectOption(action.value, { timeout });
      }
      break;

    case "check":
      if (action.selector) {
        await page.locator(action.selector).first().check({ timeout });
      }
      break;

    case "uncheck":
      if (action.selector) {
        await page.locator(action.selector).first().uncheck({ timeout });
      }
      break;

    case "hover":
      if (action.selector) {
        await page.locator(action.selector).first().hover({ timeout });
      }
      break;

    case "press":
      if (action.selector && action.value) {
        await page
          .locator(action.selector)
          .first()
          .press(action.value, { timeout });
      } else if (action.value) {
        await page.keyboard.press(action.value);
      }
      break;

    case "scroll":
      if (action.selector) {
        await page
          .locator(action.selector)
          .first()
          .scrollIntoViewIfNeeded({ timeout });
      } else {
        // Scroll by amount: value = "down" | "up" | "bottom" | "top" | pixels
        const dir = action.value?.toLowerCase() ?? "down";
        if (dir === "bottom") {
          await page.evaluate(() =>
            window.scrollTo(0, document.body.scrollHeight),
          );
        } else if (dir === "top") {
          await page.evaluate(() => window.scrollTo(0, 0));
        } else if (dir === "up") {
          await page.evaluate(() => window.scrollBy(0, -500));
        } else {
          const px = parseInt(dir) || 500;
          await page.evaluate((y) => window.scrollBy(0, y), px);
        }
      }
      break;

    case "upload":
      if (action.selector && action.value) {
        await page
          .locator(action.selector)
          .first()
          .setInputFiles(action.value, { timeout });
      }
      break;

    case "wait":
      if (action.selector) {
        await page.locator(action.selector).first().waitFor({ timeout });
      } else {
        await page.waitForTimeout(action.timeout ?? 1000);
      }
      break;

    case "assert":
      if (action.selector) {
        const element = page.locator(action.selector).first();
        const atype = action.assertType ?? "contains-text";

        switch (atype) {
          case "visible":
            await element.waitFor({ state: "visible", timeout });
            break;
          case "hidden":
            await element.waitFor({ state: "hidden", timeout });
            break;
          case "has-attribute":
            if (action.value) {
              // value = "attr=expected" e.g. "class=active"
              const [attr, ...rest] = action.value.split("=");
              const expected = rest.join("=");
              const actual = await element.getAttribute(attr, { timeout });
              if (expected && !actual?.includes(expected)) {
                throw new Error(
                  `Assertion failed: attribute "${attr}" expected to contain "${expected}" but got "${actual}"`,
                );
              }
              if (!actual && !expected) {
                // Just check attribute exists
              }
            }
            break;
          default: {
            // contains-text (default)
            if (action.value) {
              const text = await element.textContent({ timeout });
              if (!text?.includes(action.value)) {
                throw new Error(
                  `Assertion failed: expected "${action.value}" but got "${text}"`,
                );
              }
            } else {
              await element.waitFor({ state: "visible", timeout });
            }
          }
        }
      }
      break;

    case "assert-url":
      if (action.value) {
        const currentUrl = page.url();
        if (!currentUrl.includes(action.value)) {
          throw new Error(
            `URL assertion failed: expected URL to contain "${action.value}" but got "${currentUrl}"`,
          );
        }
      }
      break;

    case "assert-count":
      if (action.selector && action.value) {
        const expectedCount = parseInt(action.value);
        const actualCount = await page.locator(action.selector).count();
        if (actualCount !== expectedCount) {
          throw new Error(
            `Count assertion failed: expected ${expectedCount} elements matching "${action.selector}" but found ${actualCount}`,
          );
        }
      }
      break;

    case "screenshot":
      // Handled externally
      break;

    default:
      console.warn(`Unknown action type: ${action.type}`);
  }
}

/**
 * Execute action with retry logic
 */
async function executeActionWithRetry(
  page: Page,
  action: PlaywrightAction,
  maxRetries: number = 2,
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await executeAction(page, action);
      return; // success
    } catch (error: any) {
      lastError = error;

      if (attempt < maxRetries) {
        // Wait briefly before retry
        await page.waitForTimeout(500);
      }
    }
  }

  throw lastError;
}

/**
 * Get the current page context for AI to understand the page
 */
async function getPageContext(page: Page): Promise<PageContext> {
  const url = page.url();
  const visibleText = await page.evaluate(
    () => document.body?.innerText?.slice(0, 2000) || "",
  );

  const interactiveElements: InteractiveElement[] = await page.evaluate(() => {
    const elements = document.querySelectorAll(
      'a, button, input, select, textarea, [role="button"], [onclick], [tabindex]',
    );
    return Array.from(elements)
      .slice(0, 50)
      .map((el) => {
        const htmlEl = el as HTMLElement;
        const inputEl = el as HTMLInputElement;
        return {
          tag: el.tagName.toLowerCase(),
          type: inputEl.type || undefined,
          text: htmlEl.innerText?.slice(0, 100) || undefined,
          placeholder: inputEl.placeholder || undefined,
          id: el.id || undefined,
          name: inputEl.name || undefined,
          selector: el.id
            ? `#${el.id}`
            : inputEl.name
              ? `[name="${inputEl.name}"]`
              : inputEl.placeholder
                ? `[placeholder="${inputEl.placeholder}"]`
                : htmlEl.innerText
                  ? `${el.tagName.toLowerCase()}:has-text("${htmlEl.innerText.slice(0, 30)}")`
                  : `${el.tagName.toLowerCase()}`,
        };
      });
  });

  const html = await page.content();

  return { url, html: html.slice(0, 5000), visibleText, interactiveElements };
}

/**
 * Take a screenshot and save it to disk
 */
async function takeScreenshot(page: Page, label: string): Promise<string> {
  const filename = `${label}-${nanoid(6)}.png`;
  const filepath = join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  return filename;
}

/**
 * Run a single test case
 */
async function runTestCase(
  page: Page,
  testCase: TestCase,
  targetUrl: string,
  runId: string,
  broadcast: WSBroadcast,
): Promise<TestCaseResult> {
  const startTime = Date.now();
  const stepResults: StepResult[] = [];
  let status: TestCaseResult["status"] = "passed";

  broadcast({
    type: "test-case:started",
    data: { runId, testCaseId: testCase.id, title: testCase.title },
  });

  broadcast({
    type: "log",
    data: { runId, level: "info", message: `▶ Starting: ${testCase.title}` },
  });

  const ai = ProviderRegistry.getActive();

  // Navigate to test case URL
  const baseUrl = normalizeUrl(targetUrl);
  const testUrl = testCase.url
    ? new URL(testCase.url, baseUrl).toString()
    : baseUrl;

  try {
    // Clear cookies first
    await page.context().clearCookies();

    // Navigate to establish origin, then clear storage for isolation
    await page.goto(testUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.evaluate(() => {
      try {
        localStorage.clear();
      } catch {}
      try {
        sessionStorage.clear();
      } catch {}
    });
    // Reload after clearing storage to get clean page state
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
    broadcast({ type: "test-case:completed", data: { runId, result } });
    return result;
  }

  // Execute each step
  for (const step of testCase.steps) {
    // Check if paused — wait until resumed
    if (isPaused(runId)) {
      broadcast({
        type: "log",
        data: {
          runId,
          level: "info",
          message: `  ⏸️ Paused before step ${step.order}. Waiting for resume...`,
        },
      });
      await waitIfPaused(runId);
      broadcast({
        type: "log",
        data: {
          runId,
          level: "info",
          message: `  ▶️ Resumed! Continuing from step ${step.order}`,
        },
      });
    }

    const stepStart = Date.now();

    try {
      // Get current page context
      const pageContext = await getPageContext(page);

      // Ask AI to map the step to a Playwright action
      const action = await ai.mapStepToAction(step, pageContext);

      broadcast({
        type: "log",
        data: {
          runId,
          level: "info",
          message: `  Step ${step.order}: ${action.description} → ${action.type}(${action.selector || action.url || ""})`,
        },
      });

      // Execute the action (with automatic retry)
      await executeActionWithRetry(page, action);

      // Wait for network to settle (handles AJAX-heavy pages)
      try {
        await page.waitForLoadState("networkidle", { timeout: 3000 });
      } catch {
        // Fallback: brief pause if networkidle times out
        await page.waitForTimeout(300);
      }
      // Take screenshot of each step for visual verification
      let stepScreenshot: string | undefined;
      try {
        stepScreenshot = await takeScreenshot(
          page,
          `step-${testCase.id}-${step.order}`,
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
      broadcast({
        type: "test-step:completed",
        data: { runId, testCaseId: testCase.id, step: stepResult },
      });
    } catch (error: any) {
      // Take failure screenshot
      let screenshotPath: string | undefined;
      try {
        screenshotPath = await takeScreenshot(
          page,
          `fail-${testCase.id}-step${step.order}`,
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

      broadcast({
        type: "test-step:completed",
        data: { runId, testCaseId: testCase.id, step: stepResult },
      });

      broadcast({
        type: "log",
        data: {
          runId,
          level: "error",
          message: `  ❌ Step ${step.order} failed: ${error.message}`,
        },
      });

      // Don't continue with remaining steps if one fails
      break;
    }
  }

  // Take final screenshot for failed tests
  let failScreenshot: string | undefined;
  if (status === "failed") {
    try {
      failScreenshot = await takeScreenshot(page, `result-${testCase.id}`);
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
  broadcast({
    type: "log",
    data: {
      runId,
      level: "info",
      message: `${statusEmoji} ${testCase.title} — ${status} (${result.durationMs}ms)`,
    },
  });

  broadcast({ type: "test-case:completed", data: { runId, result } });
  return result;
}

/**
 * Run all test cases in a test plan
 */
export async function runTests(
  testPlanId: string,
  runId: string,
  testCases: TestCase[],
  targetUrl: string,
  options: Partial<RunnerOptions>,
  broadcast: WSBroadcast,
): Promise<TestRun> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  targetUrl = normalizeUrl(targetUrl);
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
    startedAt: new Date().toISOString(),
  };

  broadcast({
    type: "test-run:started",
    data: { runId, total: enabledCases.length },
  });

  // Initialize pause state for this run
  initPauseState(runId);

  broadcast({
    type: "log",
    data: {
      runId,
      level: "info",
      message: `🚀 Starting test run with ${enabledCases.length} test cases against ${targetUrl}`,
    },
  });

  let browser: Browser | null = null;

  try {
    // Launch browser
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

    // Run each test case sequentially
    for (const testCase of enabledCases) {
      const result = await runTestCase(
        page,
        testCase,
        targetUrl,
        runId,
        broadcast,
      );
      run.results.push(result);

      // Update summary
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
    broadcast({
      type: "test-run:error",
      data: { runId, error: error.message },
    });

    broadcast({
      type: "log",
      data: {
        runId,
        level: "error",
        message: `💥 Test run crashed: ${error.message}`,
      },
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  run.status = "completed";
  run.completedAt = new Date().toISOString();
  run.durationMs = Date.now() - new Date(run.startedAt).getTime();

  // Clean up pause state
  cleanupPauseState(runId);

  broadcast({
    type: "test-run:completed",
    data: { runId, summary: run.summary },
  });

  broadcast({
    type: "log",
    data: {
      runId,
      level: "info",
      message: `\n📊 Results: ${run.summary.passed}/${run.summary.total} passed | ${run.summary.failed} failed | ${run.summary.error} errors | ${run.durationMs}ms`,
    },
  });

  // Auto-generate HTML report
  try {
    const reportFilename = saveReport(run);
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
