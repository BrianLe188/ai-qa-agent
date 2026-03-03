// ============================================================
// Action Executor — Handles Playwright action execution
// ============================================================

import type { Page } from "playwright";
import type { PlaywrightAction } from "./types";

/**
 * Execute a single Playwright action on the page
 */
export async function executeAction(
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
        const expectedCount = parseInt(action.value, 10);
        const actualCount = await page.locator(action.selector).count();
        if (actualCount !== expectedCount) {
          throw new Error(
            `Count assertion failed: expected ${expectedCount} elements matching "${action.selector}" but found ${actualCount}`,
          );
        }
      }
      break;

    case "screenshot":
      break;
  }
}

/**
 * Execute action with retry logic
 */
export async function executeActionWithRetry(
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
