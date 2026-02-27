# 🤖 AI QA Agent

An AI-powered QA testing tool that reads test documents, automatically opens a browser to execute test cases, and generates additional test cases for comprehensive coverage.

## Features

- 📄 **Document Parsing** — Upload markdown test cases or user stories; AI extracts structured test cases
- 🧠 **AI Test Generation** — AI generates additional edge cases, security tests, and error handling scenarios
- 🎭 **Browser Automation** — Playwright executes tests in a real browser (Chrome)
- 📡 **Real-time Monitoring** — Watch test progress live via WebSocket
- 📸 **Failure Screenshots** — Automatic screenshots on test failures
- 🔌 **Multi-Provider AI** — Strategy pattern supports OpenAI (now), Gemini & Claude (coming soon)
- 💾 **Local-First** — All data stored locally in SQLite, your API keys never leave your machine

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) v1.1+ installed
- OpenAI API key

### Install & Run

```bash
# Install dependencies
bun install

# Install Playwright browsers (first time only)
bunx playwright install chromium

# Start the backend server
cd packages/server && bun run dev

# In another terminal, start the frontend
cd packages/web && bun run dev
```

Open **http://localhost:5173** in your browser.

### Configuration

1. Go to **Settings** page
2. Enter your **OpenAI API key**
3. Select your preferred model (GPT-4o recommended for best results)
4. Click **Save**

### Run Your First Test

1. Go to **New Test** page
2. Upload a test document (see `examples/login-tests.md` for format)
3. Enter the **Target URL** of the application to test
4. Click **Parse & Generate Test Cases**
5. Review the extracted + AI-generated test cases
6. Click **Run Test Cases**
7. Watch the AI execute tests in a real browser in real-time!

## Test Case Format

```markdown
# Feature Name Tests

## TC-001: Test case title

- **Priority:** High | Medium | Low | Critical
- **URL:** /relative-path
- **Steps:**
  1. Description of action
  2. Enter "value" into the field name
  3. Click the "Button Text" button
- **Expected:** What should happen
```

## Tech Stack

| Component | Technology                |
| --------- | ------------------------- |
| Runtime   | Bun                       |
| Backend   | Elysia (Bun-native)       |
| Frontend  | Vite + React              |
| AI        | OpenAI (Strategy Pattern) |
| Browser   | Playwright                |
| Database  | SQLite (Bun built-in)     |
| Real-time | WebSocket                 |

## Project Structure

```
ai-qa-agent/
├── packages/
│   ├── server/          # Backend API
│   │   └── src/
│   │       ├── index.ts           # Elysia server
│   │       ├── types.ts           # Shared types
│   │       ├── db/database.ts     # SQLite storage
│   │       └── services/
│   │           ├── ai/            # AI providers
│   │           │   ├── provider.ts      # Interface
│   │           │   ├── registry.ts      # Factory
│   │           │   └── openai.adapter.ts # OpenAI
│   │           └── test-runner.ts # Playwright engine
│   └── web/             # Frontend dashboard
│       └── src/
│           ├── App.tsx
│           ├── pages/        # Dashboard, NewTest, Live, Settings
│           ├── hooks/        # WebSocket hook
│           └── services/     # API client
├── examples/            # Sample test cases
└── package.json         # Workspace root
```

## License

MIT
