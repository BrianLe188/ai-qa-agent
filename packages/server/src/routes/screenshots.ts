// ============================================================
// Screenshot Routes — Serve test failure screenshots
// ============================================================
import { Elysia } from "elysia";
import { SCREENSHOTS_DIR } from "../db/database";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export const screenshotRoutes = new Elysia({ prefix: "/screenshots" }).get(
  "/:filename",
  ({ params }) => {
    const filepath = join(SCREENSHOTS_DIR, params.filename);
    if (!existsSync(filepath)) {
      throw new Error("Screenshot not found");
    }
    return new Response(readFileSync(filepath), {
      headers: { "Content-Type": "image/png" },
    });
  },
);
