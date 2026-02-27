// ============================================================
// Test Run Routes — Execute & Monitor
// ============================================================
import { Elysia, t } from "elysia";
import { nanoid } from "nanoid";
import {
  getTestPlan,
  saveTestRun,
  getTestRun,
  listTestRuns,
} from "../db/database";
import { runTests } from "../services/test-runner";
import { broadcast } from "./_context";
import type { TestCase } from "../types";

// Track active test runs
const activeRuns = new Map<string, { abort: boolean }>();

export const testRunRoutes = new Elysia({ prefix: "/test-runs" })

  // --- List test runs (optionally filter by test plan) ---
  .get("/", ({ query }) => {
    const testPlanId = query.testPlanId as string | undefined;
    return { testRuns: listTestRuns(testPlanId) };
  })

  // --- Get a single test run ---
  .get("/:id", ({ params }) => {
    const run = getTestRun(params.id);
    if (!run) {
      throw new Error("Test run not found");
    }
    return { testRun: run };
  })

  // --- Start a new test run ---
  .post(
    "/start",
    async ({ body }) => {
      const plan = getTestPlan(body.testPlanId);
      if (!plan) {
        throw new Error("Test plan not found");
      }

      const runId = nanoid(10);
      const runControl = { abort: false };
      activeRuns.set(runId, runControl);

      // Save initial run record
      saveTestRun({
        id: runId,
        testPlanId: body.testPlanId,
        status: "running",
        targetUrl: plan.targetUrl,
        results: [],
        summary: {
          total: plan.testCases.filter((tc: TestCase) => tc.enabled).length,
          passed: 0,
          failed: 0,
          skipped: 0,
          error: 0,
        },
        startedAt: new Date().toISOString(),
      });

      // Start test execution in background
      runTests(
        body.testPlanId,
        runId,
        plan.testCases,
        plan.targetUrl,
        body.options || {},
        broadcast,
      )
        .then((completedRun) => {
          saveTestRun({
            id: completedRun.id,
            testPlanId: completedRun.testPlanId,
            status: completedRun.status,
            targetUrl: completedRun.targetUrl,
            results: completedRun.results,
            summary: completedRun.summary,
            startedAt: completedRun.startedAt,
            completedAt: completedRun.completedAt,
            durationMs: completedRun.durationMs,
          });
          activeRuns.delete(runId);
        })
        .catch((error) => {
          console.error("Test run failed:", error);
          activeRuns.delete(runId);
        });

      return { runId, status: "started" };
    },
    {
      body: t.Object({
        testPlanId: t.String(),
        options: t.Optional(
          t.Object({
            headless: t.Optional(t.Boolean()),
            slowMo: t.Optional(t.Number()),
            timeout: t.Optional(t.Number()),
          }),
        ),
      }),
    },
  );
