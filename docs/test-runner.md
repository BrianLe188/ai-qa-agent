# 🏃‍♂️ Cognitive Test Runner

**Location:** `server/src/services/test-runner.ts`

The execution engine uses Microsoft Playwright to interface with the browser. Instead of accepting hardcoded selectors (e.g., `#submit-btn`), the Test Runner executes test scripts written entirely in **natural language steps** (e.g., "Click the Submit button", or high-level intents like "Login with admin credentials").

## The Execution Loop: Fast Path vs. Slow Path

Every single step evaluated runs through the Agent's decision loop, ensuring speed without fragility.

### 1. Memory Recall (SQLite + ChromaDB)

The internal AI Agent begins by consulting its memory.

- **Exact Matches:** The Agent first asks the SQLite database: _"Have I successfully completed the step 'Click the submit button' in this specific Test Plan before?"_
- **Semantic Similarity:** If the exact test string is not found, the Agent queries ChromaDB: _"Have I completed a step that is semantically similar to this?"_
- **Strict Isolation:** The `testPlanId` is rigidly enforced. Memory learned across different projects or distinct applications is completely isolated. This prevents false positives, collisions, or hallucinated UI components.

### 2. The Fast Path (Instant Execution)

If a cached selector is successfully retrieved from memory, the Agent performs a critical **Fingerprint Sanity Check**.

- The cached footprint contains key metadata about the HTML element from its previous successful interaction (e.g., Tag Name: `button`, Text Content: `Submit`, Aria-label, and structural uniqueness).
- The Agent quickly queries the provided selector on the _current_ UI. If the element found matches the historical fingerprint, the Agent instantly executes the action via Playwright (click, fill, hover...etc).
- **Result:** No AI API calls are necessary. Execution overhead drops to `<5 milliseconds`.

### 3. The Slow Path (Self-Healing & UI Adaptation)

If no cached selector exists (e.g., running the step for the first time), OR if the Fingerprint Sanity Check fails (meaning the UI layout or button properties have changed), the Agent seamlessly falls back to the **Slow Path**.

- The Agent halts and captures an **Accessibility-focused DOM snapshot**. This snapshot is stripped of noise, keeping only interactive elements, texts, relationships, and coordinates.
- It formulates a highly precise prompt combining: the DOM snapshot, the current Page URL, and the user's Natural Language Step.
- It dispatches this context to the active LLM (e.g., OpenAI `gpt-4o-mini`).
- The LLM reasoning engine decomposes the step into **one or more** atomic CSS selectors and actions (the **1 Step → N Actions** feature).
- The Playwright agent tests the selectors and executes the actions sequentially.

### 4. Memory Retention (Learning & Solidification)

Post-execution, whenever the Slow Path succeeds, the Agent does not simply forget what it just deduced—**if the step resulted in a single atomic action (N=1)**.

- It extracts the _newly discovered_ UI element's fingerprint.
- It caches this new fingerprint, selector, and exact step text back into both its SQLite and ChromaDB memory storages.
- **Result:** The next time the test sequence is run on this page, the Agent exclusively shifts back to using the Fast Path, running without human intervention.
- **Note on High-Level Steps:** If a step was decomposed into multiple actions (N>1, e.g., "Login with admin"), it is **not cached**. High-level steps depend on the fresh page context of each run to generate the correct sequence of actions safely.

### 5. The HITL Path (Human-in-the-Loop)

Sometimes, user interfaces are too ambiguous, or elements are hidden beneath complex shadow DOMs that even the **Slow Path (AI Agent)** struggles to understand. When the AI fails to find the right action, it will typically throw an error. However, when the `--hitl` flag is enabled (and running in `--headed` mode):

- The Agent pauses the test execution instead of immediately failing.
- It intercepts the browser, injecting an interactive **User Action Required** overlay that explicitly states which step it cannot resolve.
- **User Intervention:** The developer executing the test can manually hover over the necessary element (which highlights it in amber) and either click or type into it.
- **Learning & Solidification:** The `test-runner` captures the exact JavaScript event, generates a robust CSS selector for the chosen element, and feeds this data directly into the **Memory Retention** cycle.

Because the action was learned and solidified in Memory, all subsequent runs of this Test Plan (even when executed in strict `--headless` CI/CD modes where HITL is unavailable) will autonomously execute using the cached selector via the **Fast Path**.
