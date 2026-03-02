# @ai-qa-agent/core

## 0.2.0

### Minor Changes

- Added Human-in-the-Loop (HITL) feature. Agent pauses and requests user instructions via an interactive browser overlay when stuck (accessible via `--hitl` flag in `--headed` mode). User actions are recorded and converted into deterministic cached Memory for autonomous CI/CD runs.

## 0.1.0

### Major Features

- **Cognitive Test Runner**: Implemented the core test runner using Playwright, translating natural language strings into browser actions.
- **Self-Healing Memory System**: Added SQLite (fast path exact matching) and ChromaDB (semantic similarity) integration to cache selectors and learn from the AI over time.
- **AI Step Decomposition**: Enabled AI decomposition of high-level test steps into multiple Playwright actions (1 -> N action mapping).
- **Visual Verification**: Integrated OpenAI Vision models to assert complex states from screenshots that cannot be checked via the DOM.
- **Shared Architecture**: Refactored logic from the server into this dedicated `@ai-qa-agent/core` monolith layer, enabling seamless usage across the Server, CLI, and Web Dashboard.
