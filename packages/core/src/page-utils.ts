// ============================================================
// Page Utilities — Context extraction, screenshots, helpers
// ============================================================

import type { Page } from "playwright";
import { nanoid } from "nanoid";
import type { PageContext, InteractiveElement } from "./types";

/**
 * Ensure URL has a protocol prefix
 */
export function normalizeUrl(url: string): string {
  if (!url.match(/^https?:\/\//)) {
    return `http://${url}`;
  }
  return url;
}

/**
 * Auto-dismiss browser dialogs (alert, confirm, prompt)
 */
export function setupDialogHandler(page: Page): void {
  page.on("dialog", async (dialog) => {
    console.log(
      `  📢 Dialog detected: [${dialog.type()}] "${dialog.message()}"`,
    );
    await dialog.accept();
  });
}

/**
 * Get the current page context for AI to understand the page
 */
export async function getPageContext(page: Page): Promise<PageContext> {
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
export async function takeScreenshot(
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
 * Inject visual overlay CSS & badge to indicate AI agent is controlling the browser.
 * Only used in headed mode.
 */
export function setupBrowserOverlay(page: Page): void {
  page.on("domcontentloaded", async () => {
    try {
      await page.addStyleTag({
        content: `
          @keyframes ai-pulse {
            0%, 100% { box-shadow: inset 0 0 80px 10px rgba(0, 255, 128, 0.15); }
            50% { box-shadow: inset 0 0 160px 40px rgba(0, 255, 128, 0.4); }
          }
          @keyframes ai-scanline {
            0% { transform: translateY(-100vh); }
            100% { transform: translateY(100vh); }
          }
          @keyframes ai-blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }

          html::before {
            content: '';
            position: fixed;
            top: 0; left: 0; right: 0;
            height: 15vh;
            background: linear-gradient(to bottom, transparent, rgba(0, 255, 128, 0.15), transparent);
            pointer-events: none;
            z-index: 2147483646;
            animation: ai-scanline 3s linear infinite;
          }

          body::before {
            content: '';
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            pointer-events: none;
            z-index: 2147483645;
            animation: ai-pulse 2.5s ease-in-out infinite;
            background: 
              linear-gradient(rgba(0, 255, 128, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 128, 0.03) 1px, transparent 1px);
            background-size: 30px 30px;
            border: 2px solid rgba(0, 255, 128, 0.3); 
          }
        `,
      });

      // Inject agent badge as a real DOM element (toggleable by HITL)
      await page.evaluate(() => {
        if (document.getElementById("__ai-agent-badge")) return;
        const badge = document.createElement("div");
        badge.id = "__ai-agent-badge";
        badge.textContent = "⚡ AI QA AGENT CONTROLLED";
        badge.style.cssText = `
          position:fixed; top:16px; right:16px;
          background:rgba(5,5,5,0.85); color:#00ff80;
          padding:8px 16px; border-radius:8px;
          border:1px solid rgba(0,255,128,0.4);
          font-family:'Courier New',Courier,monospace;
          font-size:14px; font-weight:bold; letter-spacing:0.5px;
          z-index:2147483647; pointer-events:none;
          backdrop-filter:blur(8px);
          box-shadow:0 4px 12px rgba(0,0,0,0.3),0 0 15px rgba(0,255,128,0.2);
          animation:ai-blink 2s infinite;
        `;
        document.body.appendChild(badge);
      });
    } catch {}
  });
}
