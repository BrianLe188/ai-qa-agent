// ============================================================
// Report Generator — Beautiful HTML Test Reports (Core)
// ============================================================
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, basename } from "path";
import type { TestRun, TestCaseResult, StepResult } from "./types";

/** Format milliseconds to human-readable string */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(0);
  return `${mins}m ${secs}s`;
}

/** Get status badge color */
function statusColor(status: string): string {
  switch (status) {
    case "passed":
      return "#10b981";
    case "failed":
      return "#ef4444";
    case "error":
      return "#f59e0b";
    case "skipped":
      return "#6b7280";
    default:
      return "#8b5cf6";
  }
}

/** Get status emoji */
function statusEmoji(status: string): string {
  switch (status) {
    case "passed":
      return "✅";
    case "failed":
      return "❌";
    case "error":
      return "⚠️";
    case "skipped":
      return "⏭️";
    default:
      return "⏳";
  }
}

/** Generate the donut chart SVG for pass/fail ratio */
function generateDonutChart(summary: TestRun["summary"]): string {
  const total = summary.total || 1;
  const passPercent = (summary.passed / total) * 100;
  const failPercent = (summary.failed / total) * 100;
  const errorPercent = (summary.error / total) * 100;
  const skipPercent = (summary.skipped / total) * 100;

  const circumference = 2 * Math.PI * 40;
  const passLen = (passPercent / 100) * circumference;
  const failLen = (failPercent / 100) * circumference;
  const errorLen = (errorPercent / 100) * circumference;
  const skipLen = (skipPercent / 100) * circumference;

  let offset = 0;
  const segments: string[] = [];

  if (summary.passed > 0) {
    segments.push(
      `<circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" stroke-width="12" stroke-dasharray="${passLen} ${circumference - passLen}" stroke-dashoffset="${-offset}" transform="rotate(-90 50 50)"/>`,
    );
    offset += passLen;
  }
  if (summary.failed > 0) {
    segments.push(
      `<circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" stroke-width="12" stroke-dasharray="${failLen} ${circumference - failLen}" stroke-dashoffset="${-offset}" transform="rotate(-90 50 50)"/>`,
    );
    offset += failLen;
  }
  if (summary.error > 0) {
    segments.push(
      `<circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" stroke-width="12" stroke-dasharray="${errorLen} ${circumference - errorLen}" stroke-dashoffset="${-offset}" transform="rotate(-90 50 50)"/>`,
    );
    offset += errorLen;
  }
  if (summary.skipped > 0) {
    segments.push(
      `<circle cx="50" cy="50" r="40" fill="none" stroke="#6b7280" stroke-width="12" stroke-dasharray="${skipLen} ${circumference - skipLen}" stroke-dashoffset="${-offset}" transform="rotate(-90 50 50)"/>`,
    );
  }

  return `
    <svg width="120" height="120" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" stroke-width="12"/>
      ${segments.join("\n      ")}
      <text x="50" y="46" text-anchor="middle" fill="#f1f5f9" font-size="18" font-weight="bold">${summary.passed}/${summary.total}</text>
      <text x="50" y="62" text-anchor="middle" fill="#94a3b8" font-size="10">passed</text>
    </svg>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Generate step results table */
function generateStepRows(
  steps: StepResult[],
  screenshotBaseUrl?: string,
): string {
  return steps
    .map(
      (step) => `
    <tr class="step-row step-${step.status}">
      <td class="step-order">${step.stepOrder}</td>
      <td class="step-action">${escapeHtml(step.action)}</td>
      <td class="step-expected">${step.expected ? escapeHtml(step.expected) : "—"}</td>
      <td class="step-actual">${step.actual ? escapeHtml(step.actual) : step.status === "passed" ? "✓ As expected" : "—"}</td>
      <td><span class="badge" style="background:${statusColor(step.status)}">${step.status}</span></td>
      <td class="step-duration">${formatDuration(step.durationMs)}</td>
      <td>${step.screenshotPath ? `<a href="${screenshotBaseUrl || "/api/screenshots"}/${basename(step.screenshotPath)}" target="_blank">📸</a>` : ""}</td>
    </tr>`,
    )
    .join("\n");
}

/** Generate test case card */
function generateTestCaseCard(
  result: TestCaseResult,
  index: number,
  screenshotBaseUrl?: string,
): string {
  const screenshotHtml = result.screenshotPath
    ? `<div class="failure-screenshot">
        <h4>📸 Failure Screenshot</h4>
        <img src="${screenshotBaseUrl || "/api/screenshots"}/${basename(result.screenshotPath)}" alt="Failure screenshot" />
       </div>`
    : "";

  const analysisHtml = result.aiAnalysis
    ? `<div class="ai-analysis">
        <h4>🤖 AI Analysis</h4>
        <p>${escapeHtml(result.aiAnalysis)}</p>
       </div>`
    : "";

  return `
    <div class="test-case-card" id="tc-${index}">
      <div class="tc-header" onclick="toggleDetails(${index})">
        <div class="tc-title">
          <span class="tc-emoji">${statusEmoji(result.status)}</span>
          <span class="tc-name">${escapeHtml(result.testCaseTitle)}</span>
        </div>
        <div class="tc-meta">
          <span class="badge" style="background:${statusColor(result.status)}">${result.status.toUpperCase()}</span>
          <span class="tc-duration">${formatDuration(result.durationMs)}</span>
          <span class="tc-toggle">▼</span>
        </div>
      </div>
      <div class="tc-details" id="details-${index}">
        <table class="steps-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Action</th>
              <th>Expected</th>
              <th>Actual</th>
              <th>Status</th>
              <th>Duration</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${generateStepRows(result.stepResults, screenshotBaseUrl)}
          </tbody>
        </table>
        ${screenshotHtml}
        ${analysisHtml}
      </div>
    </div>`;
}

export interface ReportOptions {
  screenshotBaseUrl?: string;
}

/** Generate the full HTML report */
export function generateHtmlReport(
  run: TestRun,
  planName?: string,
  options?: ReportOptions,
): string {
  const screenshotBaseUrl = options?.screenshotBaseUrl;
  const passRate =
    run.summary.total > 0
      ? ((run.summary.passed / run.summary.total) * 100).toFixed(1)
      : "0";

  const testCaseCards = run.results
    .map((r, i) => generateTestCaseCard(r, i, screenshotBaseUrl))
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Report — ${escapeHtml(planName || run.id)}</title>
  <style>
    :root {
      --bg-primary: #0f172a;
      --bg-secondary: #1e293b;
      --bg-card: #1e293b;
      --border: #334155;
      --text-primary: #f1f5f9;
      --text-secondary: #94a3b8;
      --accent: #6366f1;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
    }

    .container { max-width: 1200px; margin: 0 auto; padding: 24px; }

    .report-header {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 24px;
    }
    .report-header h1 {
      font-size: 28px;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #818cf8, #6366f1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .report-meta { color: var(--text-secondary); font-size: 14px; }
    .report-meta span { margin-right: 24px; }

    .summary-grid {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 24px;
      margin-bottom: 32px;
      align-items: center;
    }
    .summary-chart { text-align: center; }
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
    }
    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }
    .stat-value { font-size: 28px; font-weight: 700; }
    .stat-label {
      color: var(--text-secondary);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .filter-bar { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
    .filter-btn {
      padding: 6px 16px;
      border-radius: 20px;
      border: 1px solid var(--border);
      background: var(--bg-secondary);
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }
    .filter-btn:hover, .filter-btn.active {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
    }

    .test-case-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      margin-bottom: 12px;
      overflow: hidden;
      transition: border-color 0.2s;
    }
    .test-case-card:hover { border-color: var(--accent); }

    .tc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      cursor: pointer;
      user-select: none;
    }
    .tc-title { display: flex; align-items: center; gap: 10px; }
    .tc-emoji { font-size: 18px; }
    .tc-name { font-weight: 500; }
    .tc-meta { display: flex; align-items: center; gap: 12px; }
    .tc-duration { color: var(--text-secondary); font-size: 13px; }
    .tc-toggle {
      color: var(--text-secondary);
      transition: transform 0.2s;
      font-size: 12px;
    }

    .tc-details {
      display: none;
      padding: 0 20px 20px;
      border-top: 1px solid var(--border);
    }
    .tc-details.open { display: block; }

    .badge {
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      color: white;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .steps-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 16px; }
    .steps-table th {
      text-align: left;
      padding: 8px 12px;
      color: var(--text-secondary);
      font-weight: 500;
      border-bottom: 1px solid var(--border);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .steps-table td {
      padding: 10px 12px;
      border-bottom: 1px solid rgba(51, 65, 85, 0.5);
      vertical-align: top;
    }
    .step-row.step-failed td { background: rgba(239, 68, 68, 0.05); }
    .step-order { color: var(--text-secondary); width: 40px; }
    .step-duration { color: var(--text-secondary); white-space: nowrap; }

    .failure-screenshot {
      margin-top: 16px;
      padding: 16px;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 8px;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    .failure-screenshot h4 { margin-bottom: 12px; font-size: 14px; }
    .failure-screenshot img {
      max-width: 100%;
      border-radius: 8px;
      border: 1px solid var(--border);
    }

    .ai-analysis {
      margin-top: 16px;
      padding: 16px;
      background: rgba(99, 102, 241, 0.1);
      border-radius: 8px;
      border: 1px solid rgba(99, 102, 241, 0.2);
    }
    .ai-analysis h4 { margin-bottom: 8px; font-size: 14px; }
    .ai-analysis p { color: var(--text-secondary); font-size: 13px; }

    .timeline-bar {
      display: flex;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 32px;
    }
    .timeline-segment { transition: width 0.3s; }

    .report-footer {
      text-align: center;
      padding: 24px;
      color: var(--text-secondary);
      font-size: 12px;
    }

    @media print {
      body { background: white; color: #1e293b; }
      .tc-details { display: block !important; }
      .filter-bar { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="report-header">
      <h1>📋 ${escapeHtml(planName || "Test Report")}</h1>
      <div class="report-meta">
        <span>🆔 Run: ${run.id}</span>
        <span>🎯 URL: ${escapeHtml(run.targetUrl)}</span>
        <span>📅 ${new Date(run.startedAt).toLocaleString()}</span>
        <span>⏱️ ${run.durationMs ? formatDuration(run.durationMs) : "N/A"}</span>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-chart">
        ${generateDonutChart(run.summary)}
      </div>
      <div class="summary-stats">
        <div class="stat-card">
          <div class="stat-value" style="color:var(--text-primary)">${run.summary.total}</div>
          <div class="stat-label">Total</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--success)">${run.summary.passed}</div>
          <div class="stat-label">Passed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--danger)">${run.summary.failed}</div>
          <div class="stat-label">Failed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--warning)">${run.summary.error}</div>
          <div class="stat-label">Errors</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--text-secondary)">${run.summary.skipped}</div>
          <div class="stat-label">Skipped</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--accent)">${passRate}%</div>
          <div class="stat-label">Pass Rate</div>
        </div>
      </div>
    </div>

    <div class="timeline-bar">
      <div class="timeline-segment" style="width:${(run.summary.passed / (run.summary.total || 1)) * 100}%;background:var(--success)"></div>
      <div class="timeline-segment" style="width:${(run.summary.failed / (run.summary.total || 1)) * 100}%;background:var(--danger)"></div>
      <div class="timeline-segment" style="width:${(run.summary.error / (run.summary.total || 1)) * 100}%;background:var(--warning)"></div>
      <div class="timeline-segment" style="width:${(run.summary.skipped / (run.summary.total || 1)) * 100}%;background:#6b7280"></div>
    </div>

    <div class="filter-bar">
      <button class="filter-btn active" onclick="filterTests('all')">All (${run.summary.total})</button>
      <button class="filter-btn" onclick="filterTests('passed')">✅ Passed (${run.summary.passed})</button>
      <button class="filter-btn" onclick="filterTests('failed')">❌ Failed (${run.summary.failed})</button>
      ${run.summary.error > 0 ? `<button class="filter-btn" onclick="filterTests('error')">⚠️ Error (${run.summary.error})</button>` : ""}
    </div>

    <div id="test-cases">
      ${testCaseCards}
    </div>

    <div class="report-footer">
      Generated by AI QA Agent • ${new Date().toISOString()}
    </div>
  </div>

  <script>
    function toggleDetails(index) {
      const el = document.getElementById('details-' + index);
      el.classList.toggle('open');
      const toggle = el.parentElement.querySelector('.tc-toggle');
      toggle.style.transform = el.classList.contains('open') ? 'rotate(180deg)' : '';
    }

    function filterTests(status) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');

      document.querySelectorAll('.test-case-card').forEach(card => {
        const badge = card.querySelector('.badge');
        const cardStatus = badge.textContent.trim().toLowerCase();
        card.style.display = (status === 'all' || cardStatus === status) ? '' : 'none';
      });
    }

    // Auto-expand failed test cases
    document.querySelectorAll('.test-case-card').forEach((card, i) => {
      const badge = card.querySelector('.badge');
      if (badge && badge.textContent.trim().toLowerCase() === 'failed') {
        toggleDetails(i);
      }
    });
  </script>
</body>
</html>`;
}

/** Save HTML report to a directory and return the filename */
export function saveReport(
  run: TestRun,
  reportsDir: string,
  planName?: string,
  options?: ReportOptions,
): string {
  mkdirSync(reportsDir, { recursive: true });
  const html = generateHtmlReport(run, planName, options);
  const filename = `report-${run.id}.html`;
  const filepath = join(reportsDir, filename);
  writeFileSync(filepath, html, "utf-8");
  return filename;
}

/** Get report file path */
export function getReportPath(
  filename: string,
  reportsDir: string,
): string | null {
  const filepath = join(reportsDir, filename);
  return existsSync(filepath) ? filepath : null;
}
