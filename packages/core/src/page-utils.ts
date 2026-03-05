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

  const interactiveElements: InteractiveElement[] = await page.evaluate(() => {
    // --- Helper: find the label text associated with a form element ---
    function findLabel(el: Element): string | undefined {
      // 1. Check for <label for="id">
      if (el.id) {
        const labelEl = document.querySelector(`label[for="${el.id}"]`);
        if (labelEl)
          return (labelEl as HTMLElement).innerText?.trim().slice(0, 50);
      }

      // 2. Check if wrapped inside a <label>
      const parentLabel = el.closest("label");
      if (parentLabel) {
        // Get label text without including the input's own text
        const clone = parentLabel.cloneNode(true) as HTMLElement;
        clone
          .querySelectorAll("input, select, textarea")
          .forEach((c) => c.remove());
        const text = clone.innerText?.trim();
        if (text) return text.slice(0, 50);
      }

      // 3. Look for preceding sibling or parent's preceding label-like text
      // Check previous sibling element
      let prev = el.previousElementSibling;
      if (prev) {
        const tag = prev.tagName.toLowerCase();
        if (tag === "label" || tag === "span" || tag === "p" || tag === "div") {
          const text = (prev as HTMLElement).innerText?.trim();
          if (text && text.length < 60) return text.slice(0, 50);
        }
      }

      // 4. Check parent container for a label-like child that appears before this element
      const parent = el.parentElement;
      if (parent) {
        // Look for a label/span/p within the same parent that comes before our element
        for (const child of Array.from(parent.children)) {
          if (child === el) break; // Stop when we reach our element
          const tag = child.tagName.toLowerCase();
          if (tag === "label" || tag === "span" || tag === "p") {
            const text = (child as HTMLElement).innerText?.trim();
            if (text && text.length < 60) return text.slice(0, 50);
          }
        }

        // 5. Check grandparent — common pattern: <div><label>Role</label><div><select></div></div>
        const grandparent = parent.parentElement;
        if (grandparent) {
          for (const child of Array.from(grandparent.children)) {
            if (child === parent || child.contains(el)) break;
            const tag = child.tagName.toLowerCase();
            if (tag === "label" || tag === "span" || tag === "p") {
              const text = (child as HTMLElement).innerText?.trim();
              if (text && text.length < 60) return text.slice(0, 50);
            }
          }
        }
      }

      return undefined;
    }

    // --- Helper: generate a robust CSS selector ---
    function generateSelector(el: Element, inputEl: HTMLInputElement): string {
      if (el.id) return `#${el.id}`;
      if (inputEl.name)
        return `${el.tagName.toLowerCase()}[name="${inputEl.name}"]`;
      if (inputEl.placeholder) return `[placeholder="${inputEl.placeholder}"]`;

      const tag = el.tagName.toLowerCase();

      // Try aria-label (unique per page usually)
      const ariaLabel = el.getAttribute("aria-label");
      if (ariaLabel) return `${tag}[aria-label="${ariaLabel}"]`;

      // Try to find an ancestor with an id and build a path
      let ancestor: Element | null = el.parentElement;
      let depth = 0;
      while (ancestor && depth < 4) {
        if (ancestor.id) {
          const descendants = Array.from(ancestor.querySelectorAll(tag));
          const idx = descendants.indexOf(el);
          if (descendants.length === 1) return `#${ancestor.id} ${tag}`;
          return `#${ancestor.id} ${tag} >> nth=${idx}`;
        }
        ancestor = ancestor.parentElement;
        depth++;
      }

      // Count ALL elements of this tag on the entire page for disambiguation
      const allSameTag = Array.from(document.querySelectorAll(tag));
      if (allSameTag.length === 1) {
        return tag; // Only one of this tag — simple
      }

      // Multiple of same tag — use page-level nth (Playwright chained syntax)
      const pageIndex = allSameTag.indexOf(el);
      return `${tag} >> nth=${pageIndex}`;
    }

    // --- Main: query interactive elements ---
    // Include standard form elements + any element with interactive attributes
    // For div/span: only include if they have interactive attributes (onclick, role, tabindex, contenteditable)
    const elements = document.querySelectorAll(
      'a, button, input, select, textarea, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="option"], [role="switch"], [role="checkbox"], [role="radio"], [role="combobox"], [role="listbox"], [onclick], [tabindex], [contenteditable="true"]',
    );

    return Array.from(elements)
      .filter((el) => {
        // Skip body, html, head
        const tag = el.tagName.toLowerCase();
        if (tag === "body" || tag === "html" || tag === "head") return false;

        // For div/span: only keep if they have interactive attributes
        if (tag === "div" || tag === "span") {
          const hasInteractive =
            el.hasAttribute("onclick") ||
            el.hasAttribute("role") ||
            el.hasAttribute("tabindex") ||
            el.getAttribute("contenteditable") === "true";
          if (!hasInteractive) return false;
        }

        // Filter out hidden elements
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          htmlEl.offsetParent !== null
        );
      })
      .map((el) => {
        const htmlEl = el as HTMLElement;
        const inputEl = el as HTMLInputElement;
        const tag = el.tagName.toLowerCase();

        // For select elements, get the selected option text instead of all options concatenated
        let text: string | undefined;
        if (tag === "select") {
          const selectEl = el as HTMLSelectElement;
          text =
            selectEl.options[selectEl.selectedIndex]?.text?.trim() || undefined;
        } else {
          text = htmlEl.innerText?.trim().slice(0, 100) || undefined;
        }

        return {
          tag,
          type: inputEl.type || undefined,
          text,
          placeholder: inputEl.placeholder || undefined,
          id: el.id || undefined,
          name: inputEl.name || undefined,
          selector: generateSelector(el, inputEl),
          label: findLabel(el),
          ariaLabel: el.getAttribute("aria-label") || undefined,
          value:
            tag === "select"
              ? (el as HTMLSelectElement).value || undefined
              : tag === "input" || tag === "textarea"
                ? inputEl.value?.slice(0, 50) || undefined
                : undefined,
          options:
            tag === "select"
              ? Array.from((el as HTMLSelectElement).options)
                  .map((o) => `${o.value}:${o.text.trim()}`)
                  .join(" | ")
              : undefined,
        };
      });
  });

  return { url, interactiveElements };
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
    } catch {}
  });
}
