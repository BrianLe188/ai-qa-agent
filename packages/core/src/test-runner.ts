// ============================================================
// Test Runner — Playwright Browser Automation Engine (Core)
// ============================================================
import {
  chromium,
  type Browser,
  type Page,
  type BrowserContext,
} from "playwright";
import { nanoid } from "nanoid";
import type {
  TestCase,
  TestCaseResult,
  StepResult,
  TestRun,
  PlaywrightAction,
  PageContext,
  InteractiveElement,
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
      return;
    } catch (error: any) {
      lastError = error;
      if (attempt < maxRetries) {
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
async function takeScreenshot(
  page: Page,
  label: string,
  screenshotsDir: string,
): Promise<string> {
  const { join } = await import("path");
  const { mkdirSync } = await import("fs");
  mkdirSync(screenshotsDir, { recursive: true });
  const filename = `${label}-${nanoid(6)}.png`;
  const filepath = join(screenshotsDir, filename);
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
      let action: PlaywrightAction;
      let usedFastPath = false;

      if (cached) {
        action = {
          type: cached.mapping.actionType as any,
          selector: cached.mapping.selector,
          value: cached.mapping.actionValue || undefined,
          description: step.action,
        };

        const sourceName = cached.source === "exact" ? "SQLite" : "ChromaDB";

        reporter.onLog(
          runId,
          "info",
          `  Step ${step.order}: ⚡ Fast Path via ${sourceName} (${(cached.similarity * 100).toFixed(0)}% match) → ${action.type}(${action.selector})`,
        );

        try {
          await executeActionWithRetry(page, action);
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

      // ======= MEMORY: Slow Path — Ask AI to find the element =======
      if (!usedFastPath) {
        const pageContext = await getPageContext(page);
        action = await ai.mapStepToAction(step, pageContext);

        reporter.onLog(
          runId,
          "info",
          `  Step ${step.order}: 🧠 AI Path → ${action.type}(${action.selector || action.url || ""})`,
        );

        await executeActionWithRetry(page, action);

        // Save successful AI mapping to memory
        if (action.selector) {
          const fingerprint: ElementFingerprint = {
            tagName: "unknown",
            textContent: step.action,
          };

          try {
            const elInfo = await page.$eval(action.selector, (el: any) => ({
              tagName: el.tagName?.toLowerCase() || "unknown",
              textContent: (el.textContent || "").trim().slice(0, 100),
              ariaLabel: el.getAttribute("aria-label") || undefined,
              placeholder: el.getAttribute("placeholder") || undefined,
              name: el.getAttribute("name") || undefined,
              type: el.getAttribute("type") || undefined,
              className: el.className?.toString()?.slice(0, 200) || undefined,
            }));
            Object.assign(fingerprint, elInfo);
          } catch {
            /* can't fingerprint, that's ok */
          }

          await memory.learn({
            stepDescription: step.action,
            testPlanId,
            targetUrl: testUrl,
            selector: action.selector,
            actionType: action.type,
            actionValue: action.value,
            fingerprint,
          });
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

  // If we are rerunning and want to only run failed tests, we could filter here.
  // For now, we rerun all enabled test cases, but we reset the run state.
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
