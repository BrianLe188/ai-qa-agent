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
import {
  pauseRun,
  resumeRun,
  getPauseInfo,
} from "../services/pause-controller";

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

  // --- Pause a running test ---
  .post("/:id/pause", ({ params }) => {
    const success = pauseRun(params.id);
    if (success) {
      const info = getPauseInfo(params.id);
      broadcast({
        type: "test-run:paused",
        data: {
          runId: params.id,
          pausedAt: info.pausedAt!,
          stepOrder: info.pausedAtStep,
        },
      });
      broadcast({
        type: "log",
        data: {
          runId: params.id,
          level: "warn",
          message: "⏸️ Test run paused by user",
        },
      });
    }
    return { success, ...getPauseInfo(params.id) };
  })

  // --- Resume a paused test ---
  .post("/:id/resume", ({ params }) => {
    const success = resumeRun(params.id);
    if (success) {
      broadcast({
        type: "test-run:resumed",
        data: { runId: params.id },
      });
      broadcast({
        type: "log",
        data: {
          runId: params.id,
          level: "info",
          message: "▶️ Test run resumed by user",
        },
      });
    }
    return { success, ...getPauseInfo(params.id) };
  })

  // --- Get pause status ---
  .get("/:id/pause-status", ({ params }) => {
    return getPauseInfo(params.id);
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
  )

  // --- Rerun an existing test run ---
  .post("/:id/rerun", async ({ params, body }) => {
    const run = getTestRun(params.id);
    if (!run) {
      throw new Error("Test run not found");
    }

    const plan = getTestPlan(run.testPlanId);
    if (!plan) {
      throw new Error("Associated test plan not found");
    }

    if (activeRuns.has(run.id)) {
      throw new Error("Test run is already running");
    }

    const runControl = { abort: false };
    activeRuns.set(run.id, runControl);

    // Reset the test run record
    run.status = "running";
    run.results = [];
    run.summary = {
      total: plan.testCases.filter((tc: TestCase) => tc.enabled).length,
      passed: 0,
      failed: 0,
      skipped: 0,
      error: 0,
    };
    run.startedAt = new Date().toISOString();
    run.completedAt = undefined;
    run.durationMs = undefined;

    saveTestRun(run);

    // Start test execution in background
    runTests(
      plan.id,
      run.id,
      plan.testCases,
      plan.targetUrl,
      (body as any)?.options || {},
      broadcast,
      run, // Pass existingRun to preserve its original started date if we wanted, but we just reset it above, which is fine.
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
        activeRuns.delete(run.id);
      })
      .catch((error) => {
        console.error("Test run failed:", error);
        activeRuns.delete(run.id);
      });

    return { runId: run.id, status: "rerun_started" };
  });
