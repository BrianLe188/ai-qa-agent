// ============================================================
// HITL — Human-in-the-Loop Fallback
// ============================================================
// When the AI agent gets stuck, this module injects an interactive
// overlay into the browser page and waits for the user to demonstrate
// the correct action (click, hover, assert, scroll).
// ============================================================

import type { Page } from "playwright";
import type { PlaywrightAction, RunnerReporter } from "./types";

// ----- Types -----

export interface HITLResult {
  type: PlaywrightAction["type"];
  selector: string;
  value?: string;
  inputType?: string;
  tagName?: string;
  textContent?: string;
  skipped?: boolean;
}

// ----- Main Function -----

/**
 * Wait for the user to perform an action on the browser page.
 * Injects a visual overlay and JS tracker that captures the user's click/fill.
 * Only works in headed mode.
 */
export async function waitForUserAction(
  page: Page,
  stepDescription: string,
  reporter: RunnerReporter,
  runId: string,
): Promise<HITLResult> {
  // Expose a bridge function from the browser back to Node.js
  let resolveAction: (result: HITLResult) => void;
  const actionPromise = new Promise<HITLResult>((resolve) => {
    resolveAction = resolve;
  });

  const bridgeName = `__hitlReport_${Date.now()}`;

  await page.exposeFunction(bridgeName, (data: string) => {
    try {
      const result = JSON.parse(data) as HITLResult;
      resolveAction(result);
    } catch {}
  });

  // Inject the HITL overlay & tracker into the page
  await page.evaluate(
    ({ step, bridge }) => {
      // --- Helper: Generate a robust CSS selector for an element ---
      function generateSelector(el: Element): string {
        // Priority 1: ID
        if (el.id) return `#${el.id}`;

        // Priority 2: data-testid / data-cy / data-test
        const testId =
          el.getAttribute("data-testid") ||
          el.getAttribute("data-cy") ||
          el.getAttribute("data-test");
        if (testId) return `[data-testid="${testId}"]`;

        // Priority 3: Name attribute (form elements)
        const input = el as HTMLInputElement;
        if (input.name) return `[name="${input.name}"]`;

        // Priority 4: Placeholder
        if (input.placeholder) return `[placeholder="${input.placeholder}"]`;

        // Priority 5: Aria-label
        const ariaLabel = el.getAttribute("aria-label");
        if (ariaLabel) return `[aria-label="${ariaLabel}"]`;

        // Priority 6: Role + text content combo
        const role = el.getAttribute("role");
        const text = (el as HTMLElement).innerText?.trim().slice(0, 40);
        if (role && text) return `[role="${role}"]:has-text("${text}")`;

        // Priority 7: Tag + nth-child for sibling disambiguation
        const parent = el.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(
            (c) => c.tagName === el.tagName,
          );
          if (siblings.length > 1) {
            const idx = siblings.indexOf(el) + 1;
            const parentSel = parent.id
              ? `#${parent.id}`
              : parent.className
                ? `${parent.tagName.toLowerCase()}.${parent.className
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .join(".")}`
                : parent.tagName.toLowerCase();
            return `${parentSel} > ${el.tagName.toLowerCase()}:nth-child(${idx})`;
          }
        }

        // Priority 8: Class name combo (max 2 classes)
        if (el.className && typeof el.className === "string") {
          const classes = el.className
            .trim()
            .split(/\s+/)
            .filter((c) => !c.match(/^(active|hover|focus|selected|open)/))
            .slice(0, 2);
          if (classes.length)
            return `${el.tagName.toLowerCase()}.${classes.join(".")}`;
        }

        // Priority 9: Tag + text content
        if (text) return `${el.tagName.toLowerCase()}:has-text("${text}")`;

        return el.tagName.toLowerCase();
      }

      // Current action mode
      type ActionMode = "click" | "hover" | "assert" | "scroll";
      let currentMode: ActionMode = "click";

      // --- Create overlay (top-right widget with action mode buttons) ---
      const overlay = document.createElement("div");
      overlay.id = "__hitl-overlay";
      overlay.innerHTML = `
        <div id="__hitl-panel" style="
          position:fixed; top:16px; right:16px;
          background:rgba(5,5,5,0.92);
          border:1px solid #f59e0b;
          border-radius:10px;
          padding:12px 14px;
          z-index:2147483647;
          font-family:system-ui,sans-serif;
          display:flex; flex-direction:column; gap:8px;
          backdrop-filter:blur(10px);
          box-shadow:0 4px 12px rgba(0,0,0,0.4),0 0 15px rgba(245,158,11,0.15);
          width:340px;
          animation: ai-blink 2s infinite;
          cursor: default;
        ">
          <div id="__hitl-header" style="display:flex; align-items:center; justify-content:space-between; gap:8px; cursor:move; user-select:none; margin-bottom:4px; padding-bottom:4px; border-bottom:1px solid rgba(245,158,11,0.2)">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:16px">🖐️</span>
              <span style="color:#f59e0b;font-weight:700;font-size:13px;font-family:'Courier New',Courier,monospace;letter-spacing:0.5px">USER ACTION</span>
            </div>
            <button id="__hitl-minimize" style="background:none; border:none; color:#f59e0b; cursor:pointer; font-size:16px; padding:0 4px;">−</button>
          </div>
          <div id="__hitl-content" style="display:flex; flex-direction:column; gap:8px;">
            <div style="color:#ccc;font-size:12px;line-height:1.4;">
              <div style="background:rgba(245,158,11,0.08);padding:4px 8px;border-radius:4px;color:#f59e0b;font-family:'Courier New',monospace;word-break:break-word;font-size:11px;">
                ${step.replace(/"/g, "&quot;")}
              </div>
            </div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;" id="__hitl-modes">
              <button data-mode="click" class="__hitl-mode-btn __hitl-mode-active" style="
                padding:4px 10px;border-radius:5px;border:1px solid #555;
                background:#f59e0b;color:#000;font-size:11px;font-weight:600;
                cursor:pointer;font-family:system-ui;
              ">🖱 Click</button>
              <button data-mode="hover" class="__hitl-mode-btn" style="
                padding:4px 10px;border-radius:5px;border:1px solid #555;
                background:#222;color:#ccc;font-size:11px;font-weight:600;
                cursor:pointer;font-family:system-ui;
              ">👆 Hover</button>
              <button data-mode="assert" class="__hitl-mode-btn" style="
                padding:4px 10px;border-radius:5px;border:1px solid #555;
                background:#222;color:#ccc;font-size:11px;font-weight:600;
                cursor:pointer;font-family:system-ui;
              ">✅ Assert</button>
              <button data-mode="scroll" class="__hitl-mode-btn" style="
                padding:4px 10px;border-radius:5px;border:1px solid #555;
                background:#222;color:#ccc;font-size:11px;font-weight:600;
                cursor:pointer;font-family:system-ui;
              ">↕ Scroll</button>
            </div>
            <div style="display:flex;gap:4px;margin-top:2px;">
              <button id="__hitl-fail-btn" style="
                flex:1;padding:5px 10px;border-radius:5px;border:1px solid #ef4444;
                background:rgba(239,68,68,0.15);color:#ef4444;font-size:11px;font-weight:600;
                cursor:pointer;font-family:system-ui;
              ">❌ Mark as Failed</button>
            </div>
            <div id="__hitl-selector-preview" style="
              color:#666;font-size:10px;font-family:'Courier New',monospace;
              overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
              min-height:14px;
            "></div>
          </div>
        </div>
        <div id="__hitl-tooltip" style="
          position:fixed;display:none;
          background:rgba(0,0,0,0.85);color:#f59e0b;
          padding:3px 8px;border-radius:4px;
          font-size:10px;font-family:'Courier New',monospace;
          z-index:2147483647;pointer-events:none;
          white-space:nowrap;max-width:300px;overflow:hidden;text-overflow:ellipsis;
        "></div>
      `;
      document.body.appendChild(overlay);

      const panel = document.getElementById("__hitl-panel")!;
      const header = document.getElementById("__hitl-header")!;
      const content = document.getElementById("__hitl-content")!;
      const minBtn = document.getElementById("__hitl-minimize")!;

      // --- Minimize/Maximize toggle ---
      let isMinimized = false;
      minBtn.onclick = (e) => {
        e.stopPropagation();
        isMinimized = !isMinimized;
        content.style.display = isMinimized ? "none" : "flex";
        minBtn.textContent = isMinimized ? "+" : "−";
        panel.style.width = isMinimized ? "auto" : "340px";
      };

      // --- Fail button handler ---
      const failBtn = document.getElementById("__hitl-fail-btn")!;
      failBtn.onclick = (e) => {
        e.stopPropagation();
        cleanup();
        (window as any)[bridge](
          JSON.stringify({
            type: "assert",
            selector: "body",
            skipped: true,
          }),
        );
      };

      // --- Draggable logic for Panel ---
      let isDragging = false;
      let offset = { x: 0, y: 0 };

      header.onmousedown = (e) => {
        isDragging = true;
        offset = {
          x: panel.offsetLeft - e.clientX,
          y: panel.offsetTop - e.clientY,
        };
        panel.style.animation = "none";
      };

      document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        panel.style.left = e.clientX + offset.x + "px";
        panel.style.top = e.clientY + offset.y + "px";
        panel.style.right = "auto";
        panel.style.bottom = "auto";
      });

      document.addEventListener("mouseup", () => {
        isDragging = false;
        if (!isMinimized) panel.style.animation = "ai-blink 2s infinite";
      });

      // --- Action mode buttons handler ---
      const modeContainer = document.getElementById("__hitl-modes")!;
      modeContainer.addEventListener("click", (e) => {
        const btn = (e.target as HTMLElement).closest(
          "[data-mode]",
        ) as HTMLElement | null;
        if (!btn) return;
        currentMode = btn.getAttribute("data-mode") as ActionMode;
        // Update button styles
        modeContainer.querySelectorAll("button").forEach((b) => {
          const isActive = b === btn;
          b.style.background = isActive ? "#f59e0b" : "#222";
          b.style.color = isActive ? "#000" : "#ccc";
        });
      });

      // --- Highlight hovered elements with tooltip ---
      let lastHighlight: HTMLElement | null = null;
      const tooltip = document.getElementById("__hitl-tooltip")!;
      const selectorPreview = document.getElementById(
        "__hitl-selector-preview",
      )!;

      const hoverHandler = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (overlay.contains(target)) return;
        if (lastHighlight) lastHighlight.style.outline = "";

        // Mode-specific outline colors
        const colors: Record<ActionMode, string> = {
          click: "#f59e0b",
          hover: "#3b82f6",
          assert: "#22c55e",
          scroll: "#a855f7",
        };
        target.style.outline = `3px solid ${colors[currentMode]}`;
        lastHighlight = target;

        // Show live selector in tooltip and the panel
        const sel = generateSelector(target);
        tooltip.textContent = sel;
        tooltip.style.display = "block";
        tooltip.style.left = e.clientX + 12 + "px";
        tooltip.style.top = e.clientY + 12 + "px";
        selectorPreview.textContent = `→ ${sel}`;
      };

      const moveHandler = (e: MouseEvent) => {
        tooltip.style.left = e.clientX + 12 + "px";
        tooltip.style.top = e.clientY + 12 + "px";
      };

      const unhoverHandler = () => {
        if (lastHighlight) lastHighlight.style.outline = "";
        tooltip.style.display = "none";
      };

      document.addEventListener("mouseover", hoverHandler, true);
      document.addEventListener("mousemove", moveHandler, true);
      document.addEventListener("mouseout", unhoverHandler, true);

      // --- Listen for user actions ---
      document.addEventListener(
        "click",
        (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          if (overlay.contains(target)) return;
          e.preventDefault();
          e.stopPropagation();

          const selector = generateSelector(target);
          const input = target as HTMLInputElement;
          const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(
            target.tagName,
          );

          // --- Handle ASSERT mode ---
          if (currentMode === "assert") {
            cleanup();
            (window as any)[bridge](
              JSON.stringify({
                type: "assert",
                selector,
                value: (target.innerText || target.textContent || "")
                  .trim()
                  .slice(0, 200),
                tagName: target.tagName.toLowerCase(),
                textContent: (target.innerText || "").slice(0, 100),
              }),
            );
            return;
          }

          // --- Handle HOVER mode ---
          if (currentMode === "hover") {
            cleanup();
            (window as any)[bridge](
              JSON.stringify({
                type: "hover",
                selector,
                tagName: target.tagName.toLowerCase(),
                textContent: (target.innerText || "").slice(0, 100),
              }),
            );
            return;
          }

          // --- Handle SCROLL mode ---
          if (currentMode === "scroll") {
            cleanup();
            (window as any)[bridge](
              JSON.stringify({
                type: "scroll",
                selector,
                tagName: target.tagName.toLowerCase(),
                textContent: (target.innerText || "").slice(0, 100),
              }),
            );
            return;
          }

          // --- Handle CLICK mode (default) ---
          if (isInput && input.type !== "submit" && input.type !== "button") {
            // For inputs, wait for the user to type and press Enter or blur
            target.style.outline = "3px solid #22c55e";
            selectorPreview.innerHTML =
              '<span style="color:#22c55e">✎ Type value, then press Enter</span>';

            const finishInput = () => {
              const value = input.value || "";
              cleanup();
              (window as any)[bridge](
                JSON.stringify({
                  type: "fill",
                  selector,
                  value,
                  inputType: input.type || "text",
                  tagName: target.tagName.toLowerCase(),
                  textContent: (target.innerText || "").slice(0, 100),
                }),
              );
            };

            target.addEventListener("keydown", (ke: KeyboardEvent) => {
              if (ke.key === "Enter") finishInput();
            });
            target.addEventListener("blur", finishInput, { once: true });
          } else {
            // Button/link click
            cleanup();
            (window as any)[bridge](
              JSON.stringify({
                type: "click",
                selector,
                tagName: target.tagName.toLowerCase(),
                textContent: (target.innerText || "").slice(0, 100),
              }),
            );
          }
        },
        { capture: true, once: false },
      );

      function cleanup() {
        document.removeEventListener("mouseover", hoverHandler, true);
        document.removeEventListener("mousemove", moveHandler, true);
        document.removeEventListener("mouseout", unhoverHandler, true);
        if (lastHighlight) lastHighlight.style.outline = "";
        overlay.remove();
      }
    },
    { step: stepDescription, bridge: bridgeName },
  );

  reporter.onLog(
    runId,
    "warn",
    `  🖐️ HITL: Waiting for user action on browser...`,
  );

  // Wait indefinitely for the user to act
  const result = await actionPromise;

  reporter.onLog(
    runId,
    "info",
    `  🖐️ HITL: User performed ${result.type}(${result.selector}${result.value ? `, "${result.value}"` : ""})`,
  );

  return result;
}
