// ============================================================
// Visual Verification Routes — Baseline & Screenshot Diff APIs
// ============================================================
import { Elysia, t } from "elysia";
import { getTestRun } from "../db/database";
import {
  saveBaseline,
  compareWithBaseline,
  DIFFS_DIR,
} from "../services/visual-verification";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export const visualRoutes = new Elysia({ prefix: "/visual" })

  /**
   * Save current run's screenshots as baseline
   * POST /api/visual/baseline/:runId
   */
  .post(
    "/baseline/:runId",
    ({ params, body }) => {
      const run = getTestRun(params.runId);
      if (!run) {
        throw new Error("Test run not found");
      }

      const result = saveBaseline(
        run,
        (body as any)?.testPlanId || run.testPlanId,
      );
      return {
        success: true,
        message: `Saved ${result.saved} baseline screenshots`,
        ...result,
      };
    },
    {
      body: t.Optional(
        t.Object({
          testPlanId: t.Optional(t.String()),
        }),
      ),
    },
  )

  /**
   * Compare a test run against baselines
   * GET /api/visual/compare/:runId
   */
  .get("/:runId/compare", ({ params, query }) => {
    const run = getTestRun(params.runId);
    if (!run) {
      throw new Error("Test run not found");
    }

    const testPlanId = (query as any)?.testPlanId || run.testPlanId;
    const report = compareWithBaseline(run, testPlanId);
    return report;
  })

  /**
   * Serve diff HTML file
   * GET /api/visual/diffs/:filename
   */
  .get("/diffs/:filename", ({ params }) => {
    const filepath = join(DIFFS_DIR, params.filename);
    if (!existsSync(filepath)) {
      throw new Error("Diff not found");
    }
    return new Response(readFileSync(filepath), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  });
