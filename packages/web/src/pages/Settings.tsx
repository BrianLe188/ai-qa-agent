import { useState, useEffect } from "react";
import {
  Key,
  Bot,
  Monitor,
  Save,
  Check,
  Brain,
  Trash2,
  Database,
  Zap,
} from "lucide-react";
import * as api from "../services/api";

export default function SettingsPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Memory state
  const [memoryStats, setMemoryStats] = useState<any>(null);
  const [embeddingProvider, setEmbeddingProvider] = useState("default");
  const [embeddingModel, setEmbeddingModel] = useState(
    "text-embedding-3-small",
  );
  const [savingMemory, setSavingMemory] = useState(false);
  const [savedMemory, setSavedMemory] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    loadSettings();
    loadMemoryStats();
  }, []);

  async function loadSettings() {
    try {
      const [settingsRes, providersRes] = await Promise.all([
        api.getSettings(),
        api.getProviders(),
      ]);
      setSettings(settingsRes.settings);
      setProviders(providersRes.providers);

      if (settingsRes.settings.openai_api_key) {
        setApiKey(settingsRes.settings.openai_api_key);
      }
      if (settingsRes.settings.openai_model) {
        setSelectedModel(settingsRes.settings.openai_model);
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  }

  async function loadMemoryStats() {
    try {
      const stats = await api.getMemoryStats();
      setMemoryStats(stats);
      setEmbeddingProvider(stats.embeddingProvider || "default");
      setEmbeddingModel(stats.embeddingModel || "text-embedding-3-small");
    } catch (e) {
      console.error("Failed to load memory stats:", e);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (apiKey && !apiKey.includes("...")) {
        await api.saveSetting("openai_api_key", apiKey);
      }
      await api.saveSetting("openai_model", selectedModel);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      loadSettings();
    } catch (e: any) {
      alert("Failed to save: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveMemorySettings() {
    setSavingMemory(true);
    try {
      await api.updateEmbeddingSettings({
        embeddingProvider,
        embeddingModel,
      });
      setSavedMemory(true);
      setTimeout(() => setSavedMemory(false), 2000);
      loadMemoryStats();
    } catch (e: any) {
      alert("Failed to save: " + e.message);
    } finally {
      setSavingMemory(false);
    }
  }

  async function handleClearMemory() {
    if (
      !confirm(
        "Are you sure you want to clear all memory? This cannot be undone.",
      )
    )
      return;
    setClearing(true);
    try {
      const result = await api.clearMemory();
      alert(result.message);
      loadMemoryStats();
    } catch (e: any) {
      alert("Failed: " + e.message);
    } finally {
      setClearing(false);
    }
  }

  async function handleSetActive(name: string) {
    try {
      await api.setActiveProvider(name);
      loadSettings();
    } catch (e: any) {
      alert(e.message);
    }
  }

  const openaiProvider = providers.find((p) => p.name === "openai");

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">
          Configure AI providers and testing preferences
        </p>
      </div>

      {/* AI Provider Settings */}
      <div className="settings-section">
        <h2 className="settings-section-title">
          <Bot size={20} />
          AI Provider
        </h2>

        <div className="card mb-4">
          <div
            className={`provider-card ${openaiProvider?.isActive ? "active" : ""}`}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--radius-md)",
                background: "linear-gradient(135deg, #10a37f, #1a7f64)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
                fontWeight: 800,
                color: "white",
                flexShrink: 0,
              }}
            >
              G
            </div>
            <div className="provider-info">
              <div className="provider-name">OpenAI</div>
              <div className="provider-status">
                {openaiProvider?.isConfigured ? (
                  <span style={{ color: "var(--accent-success)" }}>
                    ✅ Configured
                  </span>
                ) : (
                  <span style={{ color: "var(--accent-warning)" }}>
                    ⚠️ API key required
                  </span>
                )}
              </div>
            </div>
            {openaiProvider?.isActive && (
              <span
                style={{
                  padding: "4px 10px",
                  background: "var(--accent-primary-glow)",
                  color: "var(--accent-primary-hover)",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}
              >
                ACTIVE
              </span>
            )}
          </div>

          {/* Coming soon providers */}
          {[
            {
              name: "Google Gemini",
              emoji: "🔷",
              gradient: "linear-gradient(135deg, #4285f4, #34a853)",
            },
            {
              name: "Anthropic Claude",
              emoji: "🟠",
              gradient: "linear-gradient(135deg, #d97757, #b8533e)",
            },
          ].map((p) => (
            <div
              key={p.name}
              className="provider-card"
              style={{ opacity: 0.5 }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-md)",
                  background: p.gradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                  flexShrink: 0,
                }}
              >
                {p.emoji}
              </div>
              <div className="provider-info">
                <div className="provider-name">{p.name}</div>
                <div className="provider-status">Coming soon</div>
              </div>
              <span
                style={{
                  padding: "4px 10px",
                  background: "rgba(100,116,139,0.1)",
                  color: "var(--text-tertiary)",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                SOON
              </span>
            </div>
          ))}
        </div>

        {/* API Key Input */}
        <div className="card">
          <div className="card-title mb-4">
            <Key size={18} />
            OpenAI Configuration
          </div>

          <div className="input-group">
            <label className="input-label">API Key</label>
            <input
              className="input input-mono"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <div
              style={{
                fontSize: "0.78rem",
                color: "var(--text-tertiary)",
                marginTop: 4,
              }}
            >
              Your API key is stored locally and never sent to our servers
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Model</label>
            <select
              className="input"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              <option value="gpt-4o">GPT-4o (Most capable)</option>
              <option value="gpt-4o-mini">
                GPT-4o Mini (Fast &amp; affordable)
              </option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fastest)</option>
            </select>
          </div>

          <button
            className={`btn ${saved ? "btn-success" : "btn-primary"}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="spinner" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Check size={16} />
                Saved!
              </>
            ) : (
              <>
                <Save size={16} />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* ===== Agent Memory Section ===== */}
      <div className="settings-section">
        <h2 className="settings-section-title">
          <Brain size={20} />
          Agent Memory
        </h2>

        {/* Memory Stats */}
        {memoryStats && (
          <div className="card mb-4">
            <div className="card-title mb-4">
              <Database size={18} />
              Memory Statistics
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12,
                marginBottom: 16,
              }}
            >
              {/* Total Mappings */}
              <div
                style={{
                  padding: "12px 16px",
                  background: "rgba(99, 102, 241, 0.08)",
                  borderRadius: "var(--radius-md)",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    color: "var(--accent-primary)",
                  }}
                >
                  {memoryStats.totalMappings}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-tertiary)",
                    marginTop: 2,
                  }}
                >
                  Total Mappings
                </div>
              </div>

              {/* Healthy Mappings */}
              <div
                style={{
                  padding: "12px 16px",
                  background: "rgba(34,197,94,0.08)",
                  borderRadius: "var(--radius-md)",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    color: "var(--accent-success)",
                  }}
                >
                  {memoryStats.healthyMappings}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-tertiary)",
                    marginTop: 2,
                  }}
                >
                  Healthy
                </div>
              </div>

              {/* Stale Mappings */}
              <div
                style={{
                  padding: "12px 16px",
                  background: "rgba(239,68,68,0.08)",
                  borderRadius: "var(--radius-md)",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    color: "var(--accent-error)",
                  }}
                >
                  {memoryStats.staleMappings}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-tertiary)",
                    marginTop: 2,
                  }}
                >
                  Stale
                </div>
              </div>

              {/* ChromaDB Status */}
              <div
                style={{
                  padding: "12px 16px",
                  background: memoryStats.chromaAvailable
                    ? "rgba(34,197,94,0.08)"
                    : "rgba(100,116,139,0.06)",
                  borderRadius: "var(--radius-md)",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 800,
                    color: memoryStats.chromaAvailable
                      ? "var(--accent-success)"
                      : "var(--text-tertiary)",
                  }}
                >
                  {memoryStats.chromaAvailable ? "🟢 Online" : "⚪ Offline"}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-tertiary)",
                    marginTop: 2,
                  }}
                >
                  ChromaDB
                </div>
              </div>
            </div>

            <button
              className="btn btn-ghost"
              onClick={handleClearMemory}
              disabled={clearing || memoryStats.totalMappings === 0}
              style={{ color: "var(--accent-error)", fontSize: "0.82rem" }}
            >
              {clearing ? (
                <>
                  <div className="spinner" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  Clear All Memory ({memoryStats.totalMappings} entries)
                </>
              )}
            </button>
          </div>
        )}

        {/* Embedding Configuration */}
        <div className="card">
          <div className="card-title mb-4">
            <Zap size={18} />
            Embedding Configuration
          </div>

          <div
            style={{
              fontSize: "0.82rem",
              color: "var(--text-secondary)",
              marginBottom: 16,
              lineHeight: 1.6,
              padding: "10px 14px",
              background: "rgba(99, 102, 241, 0.06)",
              borderRadius: "var(--radius-md)",
              borderLeft: "3px solid var(--accent-primary)",
            }}
          >
            Embedding controls how the agent understands the{" "}
            <strong>meaning</strong> of test steps.{" "}
            <strong>Default (Local)</strong> is free and runs offline.{" "}
            <strong>OpenAI</strong> provides better multilingual support and
            semantic accuracy.
          </div>

          <div className="input-group">
            <label className="input-label">Embedding Provider</label>
            <select
              className="input"
              value={embeddingProvider}
              onChange={(e) => setEmbeddingProvider(e.target.value)}
            >
              <option value="default">
                🖥️ Default (Local) — Free, offline, good for English
              </option>
              <option value="openai">
                🌐 OpenAI — Paid, best accuracy, multilingual
              </option>
            </select>
          </div>

          {embeddingProvider === "openai" && (
            <div className="input-group">
              <label className="input-label">Embedding Model</label>
              <select
                className="input"
                value={embeddingModel}
                onChange={(e) => setEmbeddingModel(e.target.value)}
              >
                <option value="text-embedding-3-small">
                  text-embedding-3-small (Fast, $0.02/1M tokens)
                </option>
                <option value="text-embedding-3-large">
                  text-embedding-3-large (Best, $0.13/1M tokens)
                </option>
                <option value="text-embedding-ada-002">
                  text-embedding-ada-002 (Legacy)
                </option>
              </select>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--text-tertiary)",
                  marginTop: 4,
                }}
              >
                Uses the same OpenAI API key configured above
              </div>
            </div>
          )}

          <button
            className={`btn ${savedMemory ? "btn-success" : "btn-primary"}`}
            onClick={handleSaveMemorySettings}
            disabled={savingMemory}
          >
            {savingMemory ? (
              <>
                <div className="spinner" />
                Saving...
              </>
            ) : savedMemory ? (
              <>
                <Check size={16} />
                Saved!
              </>
            ) : (
              <>
                <Save size={16} />
                Save Embedding Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Browser Settings */}
      <div className="settings-section">
        <h2 className="settings-section-title">
          <Monitor size={20} />
          Browser Settings
        </h2>

        <div className="card">
          <div
            style={{
              fontSize: "0.88rem",
              color: "var(--text-secondary)",
              lineHeight: 1.7,
            }}
          >
            <p>
              Browser settings can be configured per test run. Default settings:
            </p>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li>
                <strong>Mode:</strong> Headful (visible browser) — you can watch
                the AI test
              </li>
              <li>
                <strong>Slow Motion:</strong> 100ms delay between actions
              </li>
              <li>
                <strong>Viewport:</strong> 1280×720
              </li>
              <li>
                <strong>Timeout:</strong> 30 seconds per action
              </li>
              <li>
                <strong>Screenshots:</strong> Captured on every failure
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
