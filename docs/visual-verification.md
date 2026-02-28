# 👁️ Visual Verification

**Location:** `server/src/services/visual-verification.ts`

Some functional assertions in modern E2E testing cannot be strictly parsed or verified by solely mathematically querying and scanning the DOM (e.g., _"Verify the image is visually aligned with the container border"_, _"Check that this 3D WebGL element loaded properly"_, or _"Verify the graph trend is ascending over the last month"_).

For testing steps explicitly authored with `[VISUAL]`, the AI Agent skips standard DOM interaction.

## Vision Model Loop

1. **DOM Capture:** The execution Engine detects a `[VISUAL]` flag and orchestrates Playwright to capture a highly compressed, optimized base64 `.png` screenshot of the currently loaded page frame.
2. **Vision Interaction:** The Agent connects to a Vision Model (e.g., `gpt-4o`). The raw visual screenshot and the tester's natural language assertion are synthesized and forwarded natively into the LLM context.
3. **Reasoning Return:** The Vision Model mathematically interprets the colors, bounds, graphs, alignment, text clarity, or image resolution to determine success.
4. **Conclusion Mapping:** The LLM responds exclusively through an explicit, parsable JSON object, explicitly denoting the test as `PASS` or `FAIL`. Alongside its decision, it outputs a detailed natural language explanation (e.g., `{"success": false, "reason": "The container padding seems entirely stripped, pushing the logo abruptly into the leftmost viewport edge."}`).

## Real-Time Reporting

If the execution determines a failure, the Agent maps its explanation dynamically into the WebSocket UI logs. The frontend observer receives real-time failure reasons visually constructed purely from LLM pixel computation.
