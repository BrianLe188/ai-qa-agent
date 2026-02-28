# 🤖 AI QA Agent (Bun + Elysia + React + Playwright + ChromaDB)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=flat&logo=bun&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)

An **autonomous AI-powered QA testing tool** designed to drastically reduce the cost and time of E2E test maintenance.

Instead of writing brittle CSS selectors, you write tests in **plain English**. The Agent interprets your intent, finds the right elements on the page, and executes the actions using Playwright. Most importantly, it features a **Self-Healing Memory System** (powered by SQLite + ChromaDB) that remembers selectors across test runs, ensuring blazingly fast execution while automatically recovering from UI changes.

---

## ✨ Key Features

- **🗣️ Natural Language Tests:** Write test steps like "Click the Login button" or "Type password". No coding required.
- **🧠 Self-Healing Memory (Fast Path vs. Slow Path):**
  - _Slow Path:_ The AI analyzes the DOM to find the correct element for a step.
  - _Fast Path:_ The Agent remembers (via SQLite + ChromaDB) the exact selector and "element fingerprint". On subsequent runs, it executes instantly without calling the AI API.
  - _Self-Healing:_ If a UI change breaks the cached selector, the Agent instantly detects the fingerprint mismatch and falls back to the AI (Slow Path) to learn the new layout.
- **🛡️ Strict Isolation:** Memory and selectors are isolated by `testPlanId` to prevent cross-project pollution.
- **👁️ Visual Verification:** Uses AI vision models to look at screenshots and assert complex states (e.g., "Is the chart showing an upward trend?").
- **⚡ Insanely Fast Backend:** Built on top of **Bun** and **ElysiaJS**.
- **🌐 Local Vector DB (ChromaDB):** Semantically matches test steps to reuse learned behaviors. Optional OpenAI embedding support for multilingual testing.

---

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) v1.1.x or higher
- [Docker](https://www.docker.com/) (Required for running ChromaDB server)
- OpenAI API Key (or other supported providers)

### 1. Installation

```bash
# Clone the repository
git clone git@github.com:BrianLe188/ai-qa-agent.git
cd ai-qa-agent

# Install dependencies for all workspaces
bun install

# Install Playwright browser binaries
bunx playwright install chromium
```

### 2. Start ChromaDB (Vector Database)

The agent uses ChromaDB to store semantic memories of test steps.

```bash
# Start a local ChromaDB instance on port 8000
docker run -d -p 8000:8000 chromadb/chroma
```

### 3. Start the Development Servers

```bash
# Start the Backend Server (Elysia + SQLite) -> http://localhost:3100
bun run dev:server

# Start the Frontend Dashboard (Vite + React) -> http://localhost:5173
bun run dev:web

# (Optional) Start the Demo E-commerce App to run tests against -> http://localhost:3000
bun run dev:demo
```

### 4. Configuration

1. Open your browser to **http://localhost:5173**.
2. Navigate to the **Settings** page.
3. Enter your **OpenAI API Key** and select your preferred model (e.g., `gpt-4o-mini`).
4. Under **Agent Memory**, ensure the ChromaDB status shows 🟢 **Online**. You can choose between the free Local embedding model or OpenAI's embeddings for better multilingual support.

---

## 📂 Project Structure (Monorepo)

```text
ai-qa-agent/
├── packages/
│   ├── server/               # Core Agent Backend (Bun + Elysia)
│   │   └── src/
│   │       ├── services/
│   │       │   ├── test-runner.ts     # Playwright engine + execution loop
│   │       │   ├── memory-manager.ts  # SQLite + ChromaDB memory logic
│   │       │   ├── visual-verification.ts # Vision assertions
│   │       │   └── ai/                # LLM Adapters (OpenAI, etc.)
│   │       ├── routes/       # API Endpoints
│   │       └── db/           # SQLite Database config
│   ├── web/                  # Dashboard UI (React + TailwindCSS)
│   └── demo-app/             # Target application for testing
├── docs/                     # Architecture & Contribution guides
├── package.json              # Monorepo root
└── README.md
```

## 🧠 How the Memory System Works

The AI QA Agent uses a dual-layer memory system to balance speed and resilience:

1. **SQLite (The Reflex):** Stores exact matches of step descriptions to selectors, along with element fingerprints (tag names, text content, roles). If a step perfectly matches, the Agent verifies the fingerprint and clicks instantly (<5ms).
2. **ChromaDB (The Intuition):** If an exact match isn't found, the Agent performs a semantic search. If a conceptually similar step was solved previously in the _same project_, it tries that selector.
3. **AI Vision/DOM Analyzer (The Brain):** If all memory fails (or the UI changed significantly), the Agent captures the DOM, sends it to the LLM, finds the new selector, and writes it back to memory for next time.

For a deep dive into the architecture, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 🤝 Contributing

We welcome contributions! Whether you're fixing bugs, adding new AI providers (Anthropic, Gemini), or improving the UI. Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
