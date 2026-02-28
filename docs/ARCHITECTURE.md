# 🏗️ Architecture: AI QA Agent

The **AI QA Agent** is built around speed, accuracy, and self-healing. End-to-end tests are notoriously brittle—when developers change a button class or an ID, the test breaks. This project completely eliminates this issue by introducing a **Cognitive Test Runner**.

## Documentation Map

To keep things modular and easy to read, the documentation is split into logical components:

- 🔄 **[Core Workflows (Mermaid Diagrams)](./workflows.md)**
  Complete visual diagrams explaining the sequence of generating a Test Plan and the flowchart geometry of how the Cognitive Test Runner performs instantaneous memory lookups, falling back to LLM self-healing on failure.
- 🏃‍♂️ **[Cognitive Test Runner](./test-runner.md)**
  Deep dive into `test-runner.ts` and the "Fast Path" vs "Slow Path" execution logic using Playwright and OpenAI.

- 🧠 **[Memory Manager](./memory-manager.md)**
  Explanation of how `memory-manager.ts` utilizes Bun's native high-performance SQLite alongside ChromaDB to construct the embedded vector knowledge base.

- 👁️ **[Visual Verification](./visual-verification.md)**
  Details on `visual-verification.ts` and how the execution engine integrates Vision LLMs (`gpt-4o`) to synthetically grade graphical UI consistency that cannot simply be scanned mathematically from a DOM tree.

## The Frontend (`web/src`)

A standard Vite + React application styled with TailwindCSS and Lucide-React icons.

- **WebSocket Integration:** The entire test execution streams live updates (log messages, step completion status, and screenshots) to the frontend via WebSockets managed by Elysia.
- **Dynamic Configuration:** Settings for OpenAI models, Agent Memory Providers, and Test Runner parameters.

## Technology Stack

- **Runtime:** Bun 1.1+ (TypeScript Native)
- **Backend Framework:** ElysiaJS
- **Database:** Bun:SQLite (Relational), ChromaDB (Vector)
- **Testing Engine:** Microsoft Playwright
- **Frontend Framework:** React 18, Vite, TailwindCSS
- **AI Integration:** OpenAI API Adapter (Extensible Strategy Pattern for Anthropic/Gemini)
