// ============================================================
// Test Plan Routes — CRUD + AI Parse
// ============================================================
import { Elysia, t } from "elysia";
import { nanoid } from "nanoid";
import {
  saveTestPlan,
  getTestPlan,
  listTestPlans,
  deleteTestPlan,
} from "../db/database";
import { ProviderRegistry } from "../services/ai/registry";

export const testPlanRoutes = new Elysia({ prefix: "/test-plans" })

  // --- List all test plans ---
  .get("/", () => {
    return { testPlans: listTestPlans() };
  })

  // --- Get a single test plan ---
  .get("/:id", ({ params }) => {
    const plan = getTestPlan(params.id);
    if (!plan) {
      throw new Error("Test plan not found");
    }
    return { testPlan: plan };
  })

  // --- Delete a test plan ---
  .delete("/:id", ({ params }) => {
    deleteTestPlan(params.id);
    return { success: true };
  })

  // --- Parse document & create test plan ---
  .post(
    "/parse",
    async ({ body }) => {
      const ai = ProviderRegistry.getActive();

      // Step 1: Parse test cases from document
      const parsedCases = await ai.parseTestCases(body.document, {
        targetUrl: body.targetUrl,
      });

      // Step 2: Optionally generate additional test cases
      let allCases = [...parsedCases];
      if (body.generateAdditional !== false) {
        try {
          const additionalCases = await ai.generateTestCases({
            targetUrl: body.targetUrl,
            existingTestCases: parsedCases,
          });
          allCases = [...parsedCases, ...additionalCases];
        } catch (e) {
          console.warn("Failed to generate additional test cases:", e);
        }
      }

      // Save test plan
      const planId = nanoid(10);
      const plan = {
        id: planId,
        name: body.name,
        targetUrl: body.targetUrl,
        testCases: allCases,
        documentSource: body.name,
      };
      saveTestPlan(plan);

      return {
        testPlan: {
          ...plan,
          createdAt: new Date().toISOString(),
        },
      };
    },
    {
      body: t.Object({
        document: t.String(),
        targetUrl: t.String(),
        name: t.String(),
        generateAdditional: t.Optional(t.Boolean()),
      }),
    },
  )

  // --- Update test plan (edit test cases, name, url) ---
  .put("/:id", ({ params, body }) => {
    const existing = getTestPlan(params.id);
    if (!existing) {
      throw new Error("Test plan not found");
    }

    const { testCases, name, targetUrl } = body as {
      testCases?: any[];
      name?: string;
      targetUrl?: string;
    };

    saveTestPlan({
      id: params.id,
      name: name || existing.name,
      targetUrl: targetUrl || existing.targetUrl,
      testCases: testCases || existing.testCases,
      documentSource: existing.documentSource,
    });

    return { success: true };
  });
