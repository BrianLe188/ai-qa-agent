# @ai-qa-agent/core

## 0.3.0

### Minor Changes

- **Refactored `test-runner.ts` into specialized modules**:
  - **`action-executor.ts`**: Executes all 17 Playwright action types with built-in retry logic.
  - **`page-utils.ts`**: Handles DOM context extraction, screenshots, dialogs, and visual overlays.
  - **`hitl.ts`**: Manages Human-in-the-Loop UI, 9-level selector generation, and multi-mode handlers (Click/Hover/Assert/Scroll).
  - **`test-runner.ts`**: Orchestrates the test lifecycle (Fast Path → Slow Path → HITL fallback), reduced from 1,321 to ~490 lines.
- **Demo App Enhancements**:
  - Added user menu dropdowns and expanded product lists (20 items) to support HITL Hover and Scroll mode testing.
  - Added `hitl-advanced-v2.md` test case following realistic ShopDemo application structures.
- **Backward Compatibility**: Maintained public APIs by re-exporting from the original `test-runner.ts` entry point.

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
