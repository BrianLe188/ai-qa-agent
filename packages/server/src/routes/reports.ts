// ============================================================
// Report Routes — Generate & Serve HTML Test Reports
// ============================================================
import { Elysia, t } from "elysia";
import { getTestRun, getTestPlan } from "../db/database";
import {
  generateHtmlReport,
  saveReport,
  getReportPath,
  REPORTS_DIR,
} from "../services/report-generator";
import { readFileSync, existsSync, readdirSync } from "fs";

export const reportRoutes = new Elysia({ prefix: "/reports" })

  /**
   * Generate HTML report for a test run
   * GET /api/reports/:runId
   */
  .get("/:runId", ({ params }) => {
    const run = getTestRun(params.runId);
    if (!run) {
      throw new Error("Test run not found");
    }

    // Get plan name if available
    const plan = getTestPlan(run.testPlanId);
    const planName = plan?.name;

    // Generate and save the report
    const filename = saveReport(run, planName);

    // Return the HTML directly
    const html = generateHtmlReport(run, planName);
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  })

  /**
   * Download saved report file
   * GET /api/reports/download/:filename
   */
  .get("/download/:filename", ({ params }) => {
    const filepath = getReportPath(params.filename);
    if (!filepath) {
      throw new Error("Report not found");
    }
    return new Response(readFileSync(filepath), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${params.filename}"`,
      },
    });
  })

  /**
   * List all saved reports
   * GET /api/reports
   */
  .get("/", () => {
    if (!existsSync(REPORTS_DIR)) return [];
    const files = readdirSync(REPORTS_DIR)
      .filter((f) => f.endsWith(".html"))
      .map((f) => ({
        filename: f,
        runId: f.replace("report-", "").replace(".html", ""),
      }));
    return files;
  });
