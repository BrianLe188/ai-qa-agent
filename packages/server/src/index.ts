// ============================================================
// Elysia API Server — Entry Point
// ============================================================
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { apiRoutes } from "./routes";
import { addWsConnection, removeWsConnection } from "./routes/_context";

const app = new Elysia()
  .use(cors())
  .use(apiRoutes)

  // --- WebSocket ---
  .ws("/ws", {
    open(ws) {
      addWsConnection(ws as any);
      console.log("📡 WebSocket client connected");
    },
    message(_ws, _message) {},
    close(ws) {
      removeWsConnection(ws as any);
      console.log("📡 WebSocket client disconnected");
    },
  })

  .listen(3100);

console.log(`
╔══════════════════════════════════════════════╗
║  🤖 AI QA Agent Server                      ║
║  Running on http://localhost:${app.server?.port}           ║
║  WebSocket: ws://localhost:${app.server?.port}/ws          ║
╚══════════════════════════════════════════════╝
`);

export type App = typeof app;
