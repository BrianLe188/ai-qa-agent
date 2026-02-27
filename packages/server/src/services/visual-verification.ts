// ============================================================
// Visual Verification — Screenshot Comparison Between Runs
// ============================================================
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from "fs";
import { join, basename } from "path";
import { DATA_DIR, SCREENSHOTS_DIR } from "../db/database";
import type { TestRun, TestCaseResult } from "../types";

const BASELINES_DIR = join(DATA_DIR, "baselines");
const DIFFS_DIR = join(DATA_DIR, "diffs");
mkdirSync(BASELINES_DIR, { recursive: true });
mkdirSync(DIFFS_DIR, { recursive: true });

export interface VisualDiff {
  testCaseId: string;
  testCaseTitle: string;
  baselineScreenshot: string | null;
  currentScreenshot: string | null;
  diffScreenshot: string | null;
  mismatchPercentage: number;
  status: "new" | "match" | "mismatch" | "no-screenshot";
}

export interface VisualReport {
  runId: string;
  baselineRunId: string | null;
  diffs: VisualDiff[];
  summary: {
    total: number;
    matched: number;
    mismatched: number;
    newBaselines: number;
    noScreenshot: number;
  };
  createdAt: string;
}

/**
 * Simple pixel-by-pixel comparison using raw PNG buffer comparison.
 * For production, you'd use pixelmatch/resemble.js, but this gives
 * a quick & effective comparison without extra dependencies.
 */
function compareBuffers(
  buf1: Buffer,
  buf2: Buffer,
): { match: boolean; mismatchPercent: number } {
  if (buf1.length !== buf2.length) {
    return { match: false, mismatchPercent: 100 };
  }

  let diffPixels = 0;
  const totalPixels = buf1.length;

  for (let i = 0; i < totalPixels; i++) {
    if (buf1[i] !== buf2[i]) {
      diffPixels++;
    }
  }

  const mismatchPercent = (diffPixels / totalPixels) * 100;
  // Allow 0.5% tolerance for rendering differences
  return {
    match: mismatchPercent < 0.5,
    mismatchPercent: Math.round(mismatchPercent * 100) / 100,
  };
}

/**
 * Generate a simple visual diff image (side-by-side HTML)
 */
function generateDiffHtml(
  baselinePath: string,
  currentPath: string,
  testTitle: string,
  mismatch: number,
): string {
  const baselineData = readFileSync(baselinePath).toString("base64");
  const currentData = readFileSync(currentPath).toString("base64");

  return `<!DOCTYPE html>
<html>
<head>
  <title>Visual Diff — ${testTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f172a; color: #f1f5f9; font-family: 'Inter', sans-serif; padding: 20px; }
    h1 { font-size: 20px; margin-bottom: 8px; color: #818cf8; }
    .meta { color: #94a3b8; font-size: 13px; margin-bottom: 20px; }
    .diff-container { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .diff-panel { background: #1e293b; border-radius: 12px; padding: 16px; border: 1px solid #334155; }
    .diff-panel h3 { font-size: 14px; margin-bottom: 12px; color: #94a3b8; }
    .diff-panel img { width: 100%; border-radius: 8px; border: 1px solid #334155; }
    .slider-container { margin-top: 20px; background: #1e293b; border-radius: 12px; padding: 16px; border: 1px solid #334155; }
    .slider-wrapper { position: relative; overflow: hidden; border-radius: 8px; }
    .slider-wrapper img { display: block; width: 100%; }
    .slider-overlay { position: absolute; top: 0; left: 0; height: 100%; overflow: hidden; border-right: 3px solid #6366f1; }
    .slider-overlay img { display: block; height: 100%; min-width: 100vw; }
    input[type="range"] { width: 100%; margin-top: 12px; accent-color: #6366f1; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .badge-match { background: #10b981; color: white; }
    .badge-mismatch { background: #ef4444; color: white; }
  </style>
</head>
<body>
  <h1>🔍 Visual Diff: ${testTitle}</h1>
  <div class="meta">
    Mismatch: <span class="badge ${mismatch < 0.5 ? "badge-match" : "badge-mismatch"}">${mismatch}%</span>
  </div>

  <div class="diff-container">
    <div class="diff-panel">
      <h3>📌 Baseline (Expected)</h3>
      <img src="data:image/png;base64,${baselineData}" alt="Baseline" />
    </div>
    <div class="diff-panel">
      <h3>📸 Current (Actual)</h3>
      <img src="data:image/png;base64,${currentData}" alt="Current" />
    </div>
  </div>

  <div class="slider-container">
    <h3 style="font-size:14px;color:#94a3b8;margin-bottom:12px;">🎚️ Overlay Slider</h3>
    <div class="slider-wrapper" id="slider">
      <img src="data:image/png;base64,${currentData}" alt="Current" />
      <div class="slider-overlay" id="overlay" style="width:50%">
        <img src="data:image/png;base64,${baselineData}" alt="Baseline" />
      </div>
    </div>
    <input type="range" min="0" max="100" value="50" oninput="document.getElementById('overlay').style.width = this.value + '%'" />
  </div>
</body>
</html>`;
}

/**
 * Save baseline screenshots from a test run.
 * Called when user marks a run as the "baseline".
 */
export function saveBaseline(
  run: TestRun,
  testPlanId: string,
): { saved: number } {
  const planBaselineDir = join(BASELINES_DIR, testPlanId);
  mkdirSync(planBaselineDir, { recursive: true });

  let saved = 0;
  for (const result of run.results) {
    if (result.screenshotPath && existsSync(result.screenshotPath)) {
      const dest = join(planBaselineDir, `${result.testCaseId}.png`);
      writeFileSync(dest, readFileSync(result.screenshotPath));
      saved++;
    }
    // Also save per-step screenshots
    for (const step of result.stepResults) {
      if (step.screenshotPath && existsSync(step.screenshotPath)) {
        const dest = join(
          planBaselineDir,
          `${result.testCaseId}-step${step.stepOrder}.png`,
        );
        writeFileSync(dest, readFileSync(step.screenshotPath));
        saved++;
      }
    }
  }

  return { saved };
}

/**
 * Compare a test run against saved baselines
 */
export function compareWithBaseline(
  run: TestRun,
  testPlanId: string,
): VisualReport {
  const planBaselineDir = join(BASELINES_DIR, testPlanId);
  const hasBaselines = existsSync(planBaselineDir);

  const diffs: VisualDiff[] = [];
  let matched = 0,
    mismatched = 0,
    newBaselines = 0,
    noScreenshot = 0;

  for (const result of run.results) {
    const baselinePath = hasBaselines
      ? join(planBaselineDir, `${result.testCaseId}.png`)
      : null;
    const hasBaseline = baselinePath && existsSync(baselinePath);
    const currentPath = result.screenshotPath || null;
    const hasCurrent = currentPath && existsSync(currentPath);

    if (!hasCurrent) {
      diffs.push({
        testCaseId: result.testCaseId,
        testCaseTitle: result.testCaseTitle,
        baselineScreenshot: hasBaseline ? basename(baselinePath) : null,
        currentScreenshot: null,
        diffScreenshot: null,
        mismatchPercentage: 0,
        status: "no-screenshot",
      });
      noScreenshot++;
      continue;
    }

    if (!hasBaseline) {
      diffs.push({
        testCaseId: result.testCaseId,
        testCaseTitle: result.testCaseTitle,
        baselineScreenshot: null,
        currentScreenshot: basename(currentPath!),
        diffScreenshot: null,
        mismatchPercentage: 0,
        status: "new",
      });
      newBaselines++;
      continue;
    }

    // Compare screenshots
    const baselineBuffer = readFileSync(baselinePath!);
    const currentBuffer = readFileSync(currentPath!);
    const comparison = compareBuffers(baselineBuffer, currentBuffer);

    let diffFilename: string | null = null;
    if (!comparison.match) {
      // Generate diff HTML
      const diffHtml = generateDiffHtml(
        baselinePath!,
        currentPath!,
        result.testCaseTitle,
        comparison.mismatchPercent,
      );
      diffFilename = `diff-${run.id}-${result.testCaseId}.html`;
      writeFileSync(join(DIFFS_DIR, diffFilename), diffHtml, "utf-8");
    }

    diffs.push({
      testCaseId: result.testCaseId,
      testCaseTitle: result.testCaseTitle,
      baselineScreenshot: basename(baselinePath!),
      currentScreenshot: basename(currentPath!),
      diffScreenshot: diffFilename,
      mismatchPercentage: comparison.mismatchPercent,
      status: comparison.match ? "match" : "mismatch",
    });

    if (comparison.match) matched++;
    else mismatched++;
  }

  return {
    runId: run.id,
    baselineRunId: null,
    diffs,
    summary: {
      total: run.results.length,
      matched,
      mismatched,
      newBaselines,
      noScreenshot,
    },
    createdAt: new Date().toISOString(),
  };
}

export { BASELINES_DIR, DIFFS_DIR };
