// ============================================================
// Shared context — WebSocket broadcast & AI provider init
// ============================================================
import { ProviderRegistry } from "../services/ai/registry";
import { OpenAIProvider } from "../services/ai/openai.adapter";
import { getSetting } from "../db/database";
import type { WSEvent } from "../types";

// --- Initialize AI Providers ---
const openaiProvider = new OpenAIProvider();

const savedOpenAIKey = getSetting("openai_api_key");
if (savedOpenAIKey) {
  openaiProvider.setApiKey(savedOpenAIKey);
}
const savedOpenAIModel = getSetting("openai_model");
if (savedOpenAIModel) {
  openaiProvider.setModel(savedOpenAIModel);
}

ProviderRegistry.register(openaiProvider);

// --- WebSocket Connections ---
const wsConnections = new Set<{ send: (data: string) => void }>();

export function broadcast(event: WSEvent): void {
  const data = JSON.stringify(event);
  for (const ws of wsConnections) {
    try {
      ws.send(data);
    } catch {
      wsConnections.delete(ws);
    }
  }
}

export function addWsConnection(ws: { send: (data: string) => void }): void {
  wsConnections.add(ws);
}

export function removeWsConnection(ws: { send: (data: string) => void }): void {
  wsConnections.delete(ws);
}

export { openaiProvider };
