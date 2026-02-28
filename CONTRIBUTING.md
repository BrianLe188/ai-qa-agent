# Contributing to AI QA Agent

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features (like new AI Providers: Anthropic, Gemini, Mistral)
- Becoming a maintainer

## How to Contribute

### 1. Setup Your Development Environment

1. Fork the repo and clone it locally.
2. Ensure you have [Bun](https://bun.sh/) 1.1+ installed.
3. Install dependencies:
   ```bash
   bun install
   bunx playwright install chromium
   ```
4. Start ChromaDB using Docker:
   ```bash
   docker run -d -p 8000:8000 chromadb/chroma
   ```
5. Run the backend and frontend simultaneously:
   ```bash
   bun run dev
   ```

### 2. Project Architecture

Before making sweeping changes, please review our [ARCHITECTURE.md](docs/ARCHITECTURE.md) to understand the **Fast Path vs Slow Path** loop, our multi-layered memory system (SQLite + ChromaDB), and visual verification flow.

### 3. Adding New AI Providers (Anthropic, Google Gemini, Custom LLMs)

We use a **Strategy Pattern** for AI providers located in `packages/server/src/services/ai/`.

To add a new provider (e.g., Claude):

1. Implement the `AIProvider` interface.
2. Add your provider class (e.g., `AnthropicAdapter.ts`).
3. Register your provider in `ProviderRegistry` (`registry.ts`).
4. Update the Frontend UI (`packages/web/src/pages/Settings.tsx`) to surface the configuration to users.

### 4. Pull Request Guidelines

1. **Create a branch**: Branch off of `main`. Naming convention: `feature/my-feature` or `fix/issue-description`.
2. **Review your code**: Please use TypeScript best practices. Wait for any relevant TypeScript compiler errors on your end.
3. **Commit your changes**: Write clear, descriptive commit messages.
4. **Push your branch**: `git push origin feature/my-feature`
5. **Open a PR**: Describe what your change does, how to test it, and any issues it addresses.

## Issue Reporting

When filing an issue, make sure to include:

- A clear, descriptive title.
- Specific steps to reproduce the problem.
- Expected vs. actual behavior.
- Logs from the terminal or the browser console (if applicable).
- Version of Bun and your OS.

Thank you for making AI QA Agent better!
