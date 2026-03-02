# 🧠 Memory Manager

**Location:** `server/src/services/memory-manager.ts`

The memory system acts as the long-term knowledge base for the AI QA Agent. Whenever an atomic step relies on a user's natural language, the Memory Manager uses different caching and storage layers to retrieve the correct implementation context.

> [!NOTE]
> **Single vs Multiple Action Caching:** Steps that decompose into exactly _one_ Playwright action (N=1) are cached into Memory (Fast Path) to guarantee `<5ms` execution times on future runs. High-level business steps that decompose into _multiple_ sequential Playwright actions (N>1, e.g., "Login with admin credentials") are **not** cached to ensure accurate decision making on live DOMs.

## Technology Stack

### 1. Bun:SQLite

A high-performance, internally built-in SQLite database by Bun.

- **Purpose:** Used for exact matches, maintaining execution statistics (`success_count`, `fail_count`), mapping execution metrics, and managing the Fingerprint footprint.
- **Workflow:** When exact strings like "Click Submit" hit the server, SQLite acts as an O(1) retrieval index, serving the last known verified selector instantly. If the UI matches the Fingerprint Sanity Check, the Playwright action fires in `<5 milliseconds`.

### 2. ChromaDB

An advanced vector database utilized for storing contextual memory.

- **Purpose:** Helps retrieve semantically similar instructions that bypass typos or trivial rewrites.
- **Workflow:** If "Hit submit" is given as an instruction, but only "Click the submit button" is cached in SQLite, ChromaDB infers they share the same semantic meaning. The vector DB looks up the shared vector embeddings and successfully serves the button CSS selector regardless of linguistic variations.

### 3. Embeddings Provider

Controls the strategy implemented when embedding text to numerical patterns.

- **Default (Local):** Utilizing `all-MiniLM-L6-v2` for completely free, hardware-offline processing. Great for performance and complete privacy but restricted in understanding highly complicated semantics or multi-linguistics.
- **Premium (OpenAI):** Integrating `@chroma-core/openai` for paid, deep analysis, rendering extremely accurate linguistic patterns across different languages (e.g., matching "Bấm gửi" with "Click Submit").
- Configuration is dynamically adjustable at runtime from the settings via the Web UI Dashboard.
