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
- **📝 Markdown Test Cases:** Write your test cases in standard Markdown format. The Agent parses them and executes them directly.
- **🖥️ Powerful CLI:** Run tests directly from your terminal using the built-in CLI, perfect for CI/CD pipelines.
- **🧠 Self-Healing Memory (Fast Path vs. Slow Path):**
  - _Slow Path:_ The AI analyzes the DOM to find the correct element for a step.
  - _Fast Path:_ The Agent remembers (via SQLite + ChromaDB) the exact selector and "element fingerprint". On subsequent runs, it executes instantly without calling the AI API.
  - _Self-Healing:_ If a UI change breaks the cached selector, the Agent instantly detects the fingerprint mismatch and falls back to the AI (Slow Path) to learn the new layout.
- **🖐️ Human-in-the-Loop (HITL):** When enabled, if the AI agent gets completely stuck on a step, it will pause the browser and show an interactive overlay asking for your help. Click or type on the page to teach the agent, and it will save your actions to memory for all future runs!
- **🛡️ Strict Isolation:** Memory and selectors are isolated per project in the `.ai-qa/` directory.
- **👁️ Visual Verification:** Uses AI vision models to look at screenshots and assert complex states.
- **⚡ Insanely Fast Backend:** Built on top of **Bun**, **ElysiaJS**, and a unified **Core Engine**.
- **🌐 Shared Data Directory:** Both the Server Dashboard and CLI share the same `.ai-qa/` directory, meaning memory learned in the CLI is instantly available in the UI, and vice versa.

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

# (Optional but recommended) Make the CLI available globally as `ai-qa`
cd packages/cli && npm link
cd ../..
```

### 2. Start ChromaDB (Vector Database)

The agent uses ChromaDB to store semantic memories of test steps.

```bash
# Start a local ChromaDB instance on port 8000
docker run -d -p 8000:8000 chromadb/chroma
```

### 3. Start the Development Servers (UI Mode)

```bash
# Start the Backend Server (Elysia) -> http://localhost:3100
bun run dev:server

# Start the Frontend Dashboard (Vite + React) -> http://localhost:5173
bun run dev:web

# (Optional) Start the Demo targets -> http://localhost:4000
bun run dev:demo
```

### 4. Configuration

1. Open your browser to **http://localhost:5173**.
2. Navigate to the **Settings** page.
3. Enter your **OpenAI API Key** and select your preferred model.
4. Under **Agent Memory**, ensure the ChromaDB status shows 🟢 **Online**.

---

## 🖥️ Using the CLI

You can write tests in Markdown and run them directly from your terminal!

### 1. Create a Markdown Test (`examples/login-tests.md`)

```markdown
## TC-001: Login with valid credentials

**Priority:** High

**Steps:**

1. Navigate to /
2. Enter "user@example.com" into the email field
3. Enter "Password123!" into the password field
4. Click the Sign In button

**Expected:** User should be redirected to the dashboard
```

### 2. Run the CLI

```bash
# Set your API key
export OPENAI_API_KEY="sk-..."

# Run the test against your local app
ai-qa run examples/login-tests.md --url http://localhost:4000 --headed

# Alternatively, run an existing test plan from the database without a markdown file
ai-qa run --plan cli-1a2b3c
```

The CLI will execute the test, use the Self-Healing Memory to speed up execution, and generate an HTML report in the `.ai-qa/reports/` directory.

### CLI Arguments & Flags

**Command:** `ai-qa run <path>`

| Argument / Flag         | Description                                                         | Default       |
| ----------------------- | ------------------------------------------------------------------- | ------------- |
| `[path]`                | Path to the test case `.md` file (optional if using `--plan`)       | —             |
| `-t, --plan <planId>`   | Run an existing test plan from the database by ID                   | —             |
| `-u, --url <url>`       | Base URL of the application under test (required if no `--plan`)    | —             |
| `-k, --api-key <key>`   | OpenAI API key (or set `OPENAI_API_KEY` env)                        | —             |
| `-m, --model <model>`   | AI model to use                                                     | `gpt-4o-mini` |
| `-p, --provider <name>` | AI provider string identifier                                       | `openai`      |
| `--headed`              | Run browser in headed mode (visible UI)                             | `false`       |
| `--headless`            | Run browser in headless mode                                        | `true`        |
| `--hitl`                | Enable Human-in-the-Loop mode if AI is stuck (requires headed mode) | `false`       |
| `--slow-mo <ms>`        | Slow down browser actions by specified milliseconds                 | `100`         |
| `--timeout <ms>`        | Timeout per action in milliseconds                                  | `30000`       |
| `-f, --format <format>` | Output format: `console` or `json`                                  | `console`     |
| `-o, --output <dir>`    | Output directory for reports                                        | `.`           |
| `-v, --verbose`         | Show detailed logs in the console                                   | `false`       |
| `-q, --quiet`           | Minimal console output                                              | `false`       |
| `--no-memory`           | Disable the self-healing memory feature (force AI path)             | —             |
| `--no-report`           | Skip HTML report generation                                         | —             |

### 3. Parse Document & Create Test Plan (AI-Powered)

The `parse` command uses AI to read any document (Markdown, text, etc.), extract structured test cases, optionally generate additional ones, and save the result as a **Test Plan** in the shared `.ai-qa/` database — the exact same flow as the Server Dashboard.

**Command:** `ai-qa parse <path>`

| Argument / Flag       | Description                                  | Default       |
| --------------------- | -------------------------------------------- | ------------- |
| `<path>`              | Path to document file (required)             | —             |
| `-u, --url <url>`     | Target URL of the app under test (required)  | —             |
| `-n, --name <name>`   | Name for the test plan                       | filename      |
| `-k, --api-key <key>` | OpenAI API key (or set `OPENAI_API_KEY` env) | —             |
| `-m, --model <model>` | AI model to use                              | `gpt-4o-mini` |
| `--no-generate`       | Skip AI generation of additional test cases  | —             |
| `-d, --dir <dir>`     | Project directory for `.ai-qa/` storage      | `.`           |

```bash
# Parse a document and create a test plan
ai-qa parse examples/login-tests.md --url http://localhost:4000
```

### 4. List Saved Test Plans

View all test plans that have been created via `parse` (or the Server Dashboard).

> [!NOTE]
> The `ai-qa` command looks for the `.ai-qa/` database directory within your current working directory. To access your project's test plans and memory, ensure you run these commands from the **root of your project**.

```bash
ai-qa plans
```

### 5. Manage Self-Healing Memory

The memory caching layer can be inspected or cleared directly from the CLI.

**Command:** `ai-qa memory [options]`

| Option            | Description                                           |
| ----------------- | ----------------------------------------------------- |
| `--stats`         | Show memory usage statistics (healthy/stale mappings) |
| `--clear`         | Clear the self-healing memory and cached selectors    |
| `-d, --dir <dir>` | Specify the project directory                         |

```bash
ai-qa memory --stats
```

### 6. Rerun a Previous Test Run

If a test run failed (or you just want to run it again quickly), you can rerun it by its ID. This preserves the historical run ID but refreshes the results and uses the cached Test Plan details.

```bash
ai-qa rerun <runId>
```

### 7. Building a Standalone Executable

You can compile the CLI into a **single, standalone binary** that doesn't require Bun to run!

```bash
# From the project root, build the CLI executable
bun run build:cli

# The binary will be output to packages/cli/ai-qa
./packages/cli/ai-qa run --plan cli-12345
```

_(Note: Target machines still need a local `node_modules` with `playwright` installed to launch the browser)._

---

## 📂 Project Structure (Monorepo)

```text
ai-qa-agent/
├── .ai-qa/                   # Shared data directory (Memory DB, Screenshots, Reports)
├── packages/
│   ├── core/                 # Shared Core Engine (Test Runner, Memory, Providers)
│   ├── cli/                  # Terminal Interface
│   │   └── src/
│   │       ├── index.ts      # Entry point — program setup, preAction hook, command registration
│   │       ├── commands/     # Each CLI command in its own file
│   │       │   ├── run.ts    # `ai-qa run` — execute test cases
│   │       │   ├── parse.ts  # `ai-qa parse` — AI parse + generate + save plan
│   │       │   ├── plans.ts  # `ai-qa plans` — list saved test plans
│   │       │   └── memory.ts # `ai-qa memory` — manage self-healing memory
│   │       ├── database.ts   # SQLite adapter (shared .ai-qa/ with server)
│   │       ├── parser.ts     # Markdown test case parser
│   │       ├── reporter.ts   # Console & JSON reporters
│   │       └── utils.ts      # Shared helpers (printTestCases, etc.)
│   ├── server/               # Dashboard API Backend (Wraps core for WebSocket/HTTP)
│   ├── web/                  # Dashboard UI (React + TailwindCSS)
│   └── demo-app/             # Target application for testing
├── examples/                 # Example Markdown test files
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
