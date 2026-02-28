# 🏗️ Architecture: AI QA Agent

The **AI QA Agent** is built around speed, accuracy, and self-healing. End-to-end tests are notoriously brittle—when developers change a button class or an ID, the test breaks. This project completely eliminates this issue by introducing a **Cognitive Test Runner**.

## The execution Engine (`server/src/services/test-runner.ts`)

The execution engine uses Playwright to interface with the browser. Instead of accepting hardcoded selectors, the Test Runner takes **natural language steps** (e.g., "Click the Submit button").

### The Execution Loop: Fast Path vs. Slow Path

Every single step goes through the Agent's decision loop:

1. **Memory Recall (sqlite + ChromaDB):**
   - The Agent asks the SQLite database: _Have I successfully completed the step "Click the Submit button" in this specific Test Plan before?_
   - If SQLite says NO, the Agent asks ChromaDB: _Have I completed a step that is "semantically similar" to this?_
   - Strict Isolation: The `testPlanId` is enforced. Memory across different projects is completely isolated to prevent false positives and collisions.

2. **The Fast Path (Instant execution):**
   - If a cached selector is found, the Agent performs a **Fingerprint Sanity Check**.
   - The fingerprint contains metadata about the element from its past success (e.g., Tag Name: `button`, Text: `Submit`, Aria-label).
   - If the element currently on the screen matches the fingerprint, the Agent instantly executes the Playwright action (clicks, fills, etc.). No AI API calls are made, and execution takes <5 milliseconds.

3. **The Slow Path (Self-Healing & Learning):**
   - If no cached selector exists, OR if the Fingerprint Sanity Check fails (meaning the UI has changed), the Agent falls back to the **Slow Path**.
   - The Agent takes a snapshot of the current DOM (accessible tree format).
   - It sends the DOM snapshot, the current URL, and the step instruction to the configured LLM (e.g., OpenAI `gpt-4o-mini`).
   - The LLM reasons about the page and returns a CSS selector that fulfills the intent of the step.
   - Playwright executes the action.

4. **Memory Retention (Learning):**
   - After a successful Slow Path execution, the Agent extracts the _new_ fingerprint of the target element and records it into both SQLite and ChromaDB alongside the natural language instruction.
   - The next time the test runs, it will exclusively use the Fast Path.

## Memory Manager (`server/src/services/memory-manager.ts`)

The memory system acts as the long-term knowledge base. It uses:

1. **Bun:SQLite:** A high-performance, built-in SQLite database. Used for exact matches, maintaining execution statistics (`success_count`, `fail_count`), and managing fingerprints.
2. **ChromaDB:** A vector database used to retrieve semantically similar instructions that bypass typos or trivial rewrites in instructions (e.g., "Hit submit" vs "Click the submit button").
3. **Embeddings Provider:** Supports the default Local model (`all-MiniLM-L6-v2`) for free, offline processing, and `@chroma-core/openai` for paid, highly accurate, and multilingual support. Configuration is dynamically adjustable from the Dashboard.

## Visual Verification (`server/src/services/visual-verification.ts`)

Some assertions cannot be verified by scanning the DOM (e.g., "Verify the image is visually aligned", or "Check if the graph is ascending").

For steps explicitly marked with `[VISUAL]`, the Agent takes a base64 screenshot of the page and passes it to a Vision Model (e.g., `gpt-4o`) along with the user's assertion. The model responds with a JSON object deciding if the visual assertion passes or fails, with reasoning attached.

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
