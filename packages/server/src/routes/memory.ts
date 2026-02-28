// ============================================================
// Memory Routes — View & Manage Agent Memory
// ============================================================
import { Elysia } from "elysia";
import {
  getMemoryStats,
  clearMemory,
  listMappings,
  resetConnection,
} from "../services/memory-manager";
import { getSetting, setSetting } from "../db/database";

export const memoryRoutes = new Elysia({ prefix: "/memory" })

  // --- Get memory statistics ---
  .get("/stats", () => {
    const stats = getMemoryStats();
    const embeddingProvider = getSetting("embedding_provider") || "default";
    const embeddingModel =
      getSetting("embedding_model") || "text-embedding-3-small";
    return {
      ...stats,
      embeddingProvider,
      embeddingModel,
    };
  })

  // --- List all cached mappings ---
  .get("/mappings", ({ query }) => {
    const testPlanId = query.testPlanId as string | undefined;
    return { mappings: listMappings(testPlanId) };
  })

  // --- Update embedding settings ---
  .post("/settings", async ({ body }) => {
    const { embeddingProvider, embeddingModel } = body as {
      embeddingProvider: string;
      embeddingModel?: string;
    };

    setSetting("embedding_provider", embeddingProvider);
    if (embeddingModel) {
      setSetting("embedding_model", embeddingModel);
    }

    // Force reconnect to pick up new embedding settings
    resetConnection();

    return {
      success: true,
      message: `Embedding provider set to: ${embeddingProvider}`,
    };
  })

  // --- Clear memory ---
  .delete("/", async ({ query }) => {
    const testPlanId = query.testPlanId as string | undefined;
    const deleted = await clearMemory(testPlanId);
    return { deleted, message: `Cleared ${deleted} memory entries` };
  });
