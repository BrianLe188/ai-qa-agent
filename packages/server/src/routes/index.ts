// ============================================================
// API Root — Groups all routes under /api prefix
// ============================================================
import { Elysia } from "elysia";
import { settingsRoutes } from "./settings";
import { providerRoutes } from "./providers";
import { testPlanRoutes } from "./test-plans";
import { testRunRoutes } from "./test-runs";
import { screenshotRoutes } from "./screenshots";

export const apiRoutes = new Elysia({ prefix: "/api" })
  .get("/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }))
  .use(settingsRoutes)
  .use(providerRoutes)
  .use(testPlanRoutes)
  .use(testRunRoutes)
  .use(screenshotRoutes);
