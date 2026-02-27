// ============================================================
// Settings Routes — App configuration
// ============================================================
import { Elysia, t } from "elysia";
import { getAllSettings, setSetting } from "../db/database";
import { openaiProvider } from "./_context";

export const settingsRoutes = new Elysia({ prefix: "/settings" })

  // --- Get all settings (with masked API keys) ---
  .get("/", () => {
    const settings = getAllSettings();
    const masked: Record<string, string> = {};
    for (const [key, value] of Object.entries(settings)) {
      if (key.includes("api_key")) {
        masked[key] = value ? `${value.slice(0, 8)}...${value.slice(-4)}` : "";
      } else {
        masked[key] = value;
      }
    }
    return { settings: masked };
  })

  // --- Update a setting ---
  .post(
    "/",
    ({ body }) => {
      setSetting(body.key, body.value);

      // Apply settings to providers in real-time
      if (body.key === "openai_api_key") {
        openaiProvider.setApiKey(body.value);
      } else if (body.key === "openai_model") {
        openaiProvider.setModel(body.value);
      }

      return { success: true };
    },
    {
      body: t.Object({
        key: t.String(),
        value: t.String(),
      }),
    },
  );
