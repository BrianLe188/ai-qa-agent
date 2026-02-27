// ============================================================
// AI Provider Routes — Provider management
// ============================================================
import { Elysia, t } from "elysia";
import { setSetting } from "../db/database";
import { ProviderRegistry } from "../services/ai/registry";

export const providerRoutes = new Elysia({ prefix: "/providers" })

  // --- List all AI providers ---
  .get("/", () => {
    return { providers: ProviderRegistry.listAll() };
  })

  // --- Set active AI provider ---
  .post(
    "/active",
    ({ body }) => {
      ProviderRegistry.setActive(body.name);
      setSetting("active_provider", body.name);
      return { success: true };
    },
    {
      body: t.Object({
        name: t.String(),
      }),
    },
  );
