import { useState, useEffect } from "react";
import { Key, Bot, Monitor, Save, Check } from "lucide-react";
import * as api from "../services/api";

export default function SettingsPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const [settingsRes, providersRes] = await Promise.all([
        api.getSettings(),
        api.getProviders(),
      ]);
      setSettings(settingsRes.settings);
      setProviders(providersRes.providers);

      // Pre-fill if API key exists (masked)
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

  async function handleSave() {
    setSaving(true);
    try {
      // Only save if it's a real key (not masked)
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
                GPT-4o Mini (Fast & affordable)
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
