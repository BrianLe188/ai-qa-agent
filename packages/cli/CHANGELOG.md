# @ai-qa-agent/cli

## 0.2.0

### Minor Changes

- Added Human-in-the-Loop (HITL) feature. Agent pauses and requests user instructions via an interactive browser overlay when stuck (accessible via `--hitl` flag in `--headed` mode). User actions are recorded and converted into deterministic cached Memory for autonomous CI/CD runs.

### Patch Changes

- Updated dependencies
  - @ai-qa-agent/core@0.2.0

## 0.1.0

### Major Features

- **Initial Release:** Extracted CLI logic out of the server into the dedicated `@ai-qa-agent/cli` package for running tests natively in Node/Bun environments.
- **Parsing Engine:** Implemented `parse` command for AI-driven Markdown test case generation and validation.
- **Execution Engine:** Added `run` and `rerun` commands pointing to local endpoints or test plan IDs stored in `.ai-qa/`.
- **Management Hooks:** Introduced `plans` and `runs` visualization commands.
- **Reporting:** Replaced custom Markdown output with HTML report generation using `ora` spinners for clean output buffers.
