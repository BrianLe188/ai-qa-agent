// ============================================================
// OpenAI Provider — Primary AI Implementation
// Uses Structured Outputs (json_schema) for guaranteed format
// ============================================================
import OpenAI from "openai";
import type { AIProvider } from "./provider";
import type {
  TestCase,
  TestStep,
  ParseContext,
  AppContext,
  PageContext,
  PlaywrightAction,
  FailureAnalysis,
  TokenUsage,
} from "../types";

// ─── JSON Schemas for Structured Outputs ────────────────────

const TEST_STEP_SCHEMA = {
  type: "object" as const,
  properties: {
    order: { type: "number" as const, description: "Step order number" },
    action: {
      type: "string" as const,
      description:
        "Natural language action description, e.g. 'Click the Sign In button'",
    },
    target: {
      type: ["string", "null"] as const,
      description: "Target element (optional)",
    },
    value: {
      type: ["string", "null"] as const,
      description: "Value to enter (optional)",
    },
    expected: {
      type: ["string", "null"] as const,
      description: "Expected result of this step (optional)",
    },
  },
  required: ["order", "action", "target", "value", "expected"] as const,
  additionalProperties: false as const,
};

const TEST_CASE_SCHEMA = {
  type: "object" as const,
  properties: {
    id: { type: "string" as const, description: "Unique ID like TC-001" },
    title: { type: "string" as const, description: "Short descriptive title" },
    description: {
      type: ["string", "null"] as const,
      description: "What this test verifies",
    },
    priority: {
      type: "string" as const,
      enum: ["critical", "high", "medium", "low"],
      description: "Test priority",
    },
    preconditions: {
      type: "array" as const,
      items: { type: "string" as const },
      description: "Precondition strings",
    },
    url: {
      type: ["string", "null"] as const,
      description: "Relative URL path e.g. /login",
    },
    steps: {
      type: "array" as const,
      items: TEST_STEP_SCHEMA,
      description: "Test steps",
    },
    expectedResult: {
      type: "string" as const,
      description: "Final expected outcome",
    },
    tags: {
      type: "array" as const,
      items: { type: "string" as const },
      description: "Relevant tags",
    },
    source: {
      type: "string" as const,
      enum: ["document", "ai-generated"],
      description: "Where this test case came from",
    },
    enabled: {
      type: "boolean" as const,
      description: "Whether test is enabled",
    },
  },
  required: [
    "id",
    "title",
    "description",
    "priority",
    "preconditions",
    "url",
    "steps",
    "expectedResult",
    "tags",
    "source",
    "enabled",
  ] as const,
  additionalProperties: false as const,
};

/** Schema for parseTestCases and generateTestCases responses */
const TEST_CASES_RESPONSE_SCHEMA = {
  name: "test_cases_response",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      testCases: {
        type: "array" as const,
        items: TEST_CASE_SCHEMA,
        description: "Array of test cases",
      },
    },
    required: ["testCases"] as const,
    additionalProperties: false as const,
  },
};

/** Schema for mapStepToAction response */
const PLAYWRIGHT_ACTION_SCHEMA = {
  name: "playwright_action",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      type: {
        type: "string" as const,
        enum: [
          "navigate",
          "click",
          "dblclick",
          "fill",
          "clear",
          "select",
          "check",
          "uncheck",
          "wait",
          "assert",
          "assert-url",
          "assert-count",
          "screenshot",
          "hover",
          "press",
          "scroll",
          "upload",
        ],
        description: "The Playwright action type",
      },
      selector: {
        type: ["string", "null"] as const,
        description: "CSS/text selector for target element",
      },
      value: {
        type: ["string", "null"] as const,
        description:
          "Value for fill/select/press. For scroll: 'down'|'up'|'bottom'|'top'|pixels. For assert-url: expected URL substring. For assert-count: expected count. For upload: file path.",
      },
      url: {
        type: ["string", "null"] as const,
        description: "URL for navigate action",
      },
      timeout: {
        type: ["number", "null"] as const,
        description: "Custom timeout in ms",
      },
      description: {
        type: "string" as const,
        description: "Human-readable action description",
      },
      assertType: {
        type: ["string", "null"] as const,
        description:
          "For assert: 'visible' | 'hidden' | 'contains-text' | 'has-attribute'. Default: 'contains-text'",
      },
    },
    required: [
      "type",
      "selector",
      "value",
      "url",
      "timeout",
      "description",
      "assertType",
    ] as const,
    additionalProperties: false as const,
  },
};

/** Schema for mapStepToActions response (array of actions) */
const PLAYWRIGHT_ACTIONS_SCHEMA = {
  name: "playwright_actions",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      actions: {
        type: "array" as const,
        items: PLAYWRIGHT_ACTION_SCHEMA.schema,
        description:
          "Array of Playwright actions to execute in order. For simple steps, return a single action. For complex/high-level steps (e.g. 'Login with admin/123'), decompose into multiple atomic actions.",
      },
    },
    required: ["actions"] as const,
    additionalProperties: false as const,
  },
};

/** Schema for analyzeFailure response */
const FAILURE_ANALYSIS_SCHEMA = {
  name: "failure_analysis",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      summary: {
        type: "string" as const,
        description: "Brief description of what went wrong",
      },
      possibleCauses: {
        type: "array" as const,
        items: { type: "string" as const },
        description: "Possible root causes",
      },
      suggestedFix: {
        type: ["string", "null"] as const,
        description: "Suggestion for developer",
      },
      severity: {
        type: "string" as const,
        enum: ["critical", "major", "minor", "cosmetic"],
        description: "Bug severity",
      },
    },
    required: [
      "summary",
      "possibleCauses",
      "suggestedFix",
      "severity",
    ] as const,
    additionalProperties: false as const,
  },
};

// ─── System Prompts ─────────────────────────────────────────

const PARSE_SYSTEM_PROMPT = `You are an expert QA engineer. Your job is to analyze documents (test cases, user stories, requirements) and extract structured test cases.

For each test case you identify, provide:
- id: unique identifier (use format TC-XXX)
- title: short descriptive title
- description: what this test verifies
- priority: "critical" | "high" | "medium" | "low"
- preconditions: array of precondition strings
- url: the EXACT relative URL path from the document. If it says "Navigate to /", url must be "/". Do NOT change, guess, or infer URLs. Set to null if not specified.
- steps: array of { order, action, target, value, expected }
  - action: copy the EXACT step text from the document verbatim. If it says "Navigate to /", write "Navigate to /". Do NOT rephrase to "Navigate to the login page". Preserve original wording exactly.
  - target: element mentioned in the document, or null
  - value: value mentioned in the document, or null
  - expected: what should happen after this step, or null
- expectedResult: the final expected outcome
- tags: array of relevant tags
- source: always "document"
- enabled: always true

CRITICAL: Preserve ALL URLs, paths, values, and step descriptions EXACTLY as they appear in the source document. Do NOT infer, rename, or rephrase. "/" means root path, NOT "/login". Extract faithfully.`;

const GENERATE_SYSTEM_PROMPT = `You are an expert QA engineer specializing in test coverage analysis. Given existing test cases and web application info, generate ADDITIONAL test cases to improve coverage.

Focus on:
1. Edge cases and boundary values
2. Error handling and validation
3. Security (XSS, SQL injection, CSRF)
4. Accessibility concerns
5. Performance edge cases (empty states, large data)
6. Negative testing (invalid inputs, unauthorized access)
7. Cross-browser/responsive issues
8. User flow interruptions (back button, refresh, timeout)

Set source to "ai-generated" for all generated test cases. Do NOT duplicate existing tests.`;

const STEP_TO_ACTION_PROMPT = `You are a Playwright automation expert. Given a test step description and the current page context (HTML elements), generate the appropriate Playwright action.

CRITICAL RULES — YOU MUST FOLLOW THESE EXACTLY:

1. **Follow the step description LITERALLY.** Do NOT interpret, rephrase, or guess what the step means.
   - If the step says "Navigate to /", you MUST navigate to "/" (the root), NOT "/login" or any other path.
   - If the step says "Navigate to /register.html", navigate to exactly "/register.html".
   - NEVER invent or assume a URL path that is NOT explicitly written in the step.

2. **For navigate actions:** The url field must be the EXACT path from the step description, combined with the base URL of the current page origin.
   - Step says "Navigate to /" → url = current origin + "/"
   - Step says "Navigate to /products.html" → url = current origin + "/products.html"
   - If no path is mentioned but the step says "Navigate to login page", look at the current page elements for the login link/URL.

3. **For interact actions (click, fill, select, etc.):**
   - First try to match by id selector (#id)
   - Then by name attribute ([name="..."])
   - Then by placeholder text ([placeholder="..."])
   - Then by text content (text="...")
   - Then by role (role=button[name="..."])
   - Choose the MOST SPECIFIC selector available from the page context

4. **For fill actions:** If the step says "Enter email" or "Enter 'X' into the email field", use the value from the step, not a made-up value.

5. **Set unused fields to null.** For example, if the action is "click", set value, url, and assertType to null.

6. **If the step says "Leave field empty"**, use type "clear" with the selector of the field, or "fill" with value "".

7. **Available action types and when to use them:**
   - navigate: go to a URL
   - click: single click on element
   - dblclick: double-click on element
   - fill: type text into an input/textarea (requires selector + value)
   - clear: clear an input field (uses selector, no value needed)
   - select: choose from dropdown/select (requires selector + value)
   - check: check a checkbox
   - uncheck: uncheck a checkbox
   - hover: hover over an element
   - press: press a keyboard key (value = key name like "Enter", "Escape", "Tab")
   - scroll: scroll page. Use selector to scroll element into view, or value "down"/"up"/"bottom"/"top"/pixels
   - upload: upload a file (selector = file input, value = file path)
   - wait: wait for element to appear or fixed time
   - assert: verify element state. Set assertType to "visible", "hidden", "contains-text", or "has-attribute"
   - assert-url: verify current URL contains expected substring (put expected in value, no selector needed)
   - assert-count: verify number of matching elements (selector = CSS selector, value = expected count as string)
   - screenshot: take a screenshot

8. **For assert actions:** Always set assertType. If checking text, use "contains-text". If checking visibility, use "visible" or "hidden".`;

const FAILURE_ANALYSIS_PROMPT = `You are a QA expert analyzing test failures. Given a screenshot and expected vs actual results, provide a detailed analysis of what went wrong, possible root causes, and suggested fixes.`;

const STEP_TO_ACTIONS_PROMPT = `You are a Playwright automation expert. Given a test step description and the current page context (HTML elements), generate the appropriate Playwright action(s).

IMPORTANT: The test step may be a HIGH-LEVEL business instruction (e.g. "Login with admin@test.com / 123456") or a LOW-LEVEL atomic action (e.g. "Click the Submit button").

- If the step is HIGH-LEVEL (involves multiple UI interactions to complete), decompose it into multiple atomic Playwright actions in the correct order.
  Example: "Login with admin@test.com / 123456" → [
    { type: "fill", selector: "#email", value: "admin@test.com", description: "Fill email field" },
    { type: "fill", selector: "#password", value: "123456", description: "Fill password field" },
    { type: "click", selector: "button:has-text('Login')", description: "Click login button" }
  ]

- If the step is LOW-LEVEL (a single UI interaction), return exactly one action in the array.
  Example: "Click the Sign In button" → [
    { type: "click", selector: "button:has-text('Sign In')", description: "Click Sign In button" }
  ]

CRITICAL RULES:

1. **Follow the step description LITERALLY.** Do NOT invent actions beyond what the step requires.
   - If the step says "Navigate to /", you MUST navigate to "/" (the root), NOT "/login".
   - If the step says "Login with X/Y", you should fill credentials + click submit. Do NOT add assertions or extra navigations.

2. **For navigate actions:** The url field must be the EXACT path from the step description, combined with the base URL.

3. **For interact actions (click, fill, select, etc.):**
   - First try to match by id selector (#id)
   - Then by name attribute ([name="..."])
   - Then by placeholder text ([placeholder="..."])
   - Then by text content (text="...")
   - Then by role (role=button[name="..."])
   - Choose the MOST SPECIFIC selector available from the page context

4. **For fill actions:** Use the value from the step. If the step says "Enter email" with a specific value, use that value.

5. **Set unused fields to null.** For example, if the action is "click", set value, url, and assertType to null.

6. **Available action types:** navigate, click, dblclick, fill, clear, select, check, uncheck, wait, assert, assert-url, assert-count, screenshot, hover, press, scroll, upload.

7. **For assert actions:** Always set assertType to "visible", "hidden", "contains-text", or "has-attribute".

8. **Keep the array concise.** Only include actions that are truly necessary to complete the step. Do NOT add unnecessary waits, screenshots, or assertions unless explicitly requested.`;

// ─── OpenAI Provider Class ─────────────────────────────────

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  readonly displayName = "OpenAI";

  private client: OpenAI | null = null;
  private apiKey: string = "";
  private model: string = "gpt-4o-mini";

  constructor(apiKey?: string) {
    if (apiKey) {
      this.setApiKey(apiKey);
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.client = new OpenAI({ apiKey });
  }

  setModel(model: string): void {
    this.model = model;
  }

  getAvailableModels(): string[] {
    return ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"];
  }

  private getClient(): OpenAI {
    if (!this.client) {
      throw new Error("OpenAI API key not configured");
    }
    return this.client;
  }

  /**
   * Chat completion with Structured Outputs (json_schema).
   * Guarantees response always matches the provided schema.
   */
  private async chatCompletion<T>(
    systemPrompt: string,
    userMessage: string,
    jsonSchema: {
      name: string;
      strict: boolean;
      schema: Record<string, unknown>;
    },
    options?: { maxTokens?: number },
  ): Promise<{ data: T; usage?: TokenUsage }> {
    const client = this.getClient();
    const response = await client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: options?.maxTokens ?? 4096,
      temperature: 0.3,
      response_format: {
        type: "json_schema",
        json_schema: jsonSchema,
      },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const data = JSON.parse(content) as T;
    return {
      data,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
    };
  }

  async parseTestCases(
    document: string,
    context?: ParseContext,
  ): Promise<TestCase[]> {
    let userMessage = `Parse the following document and extract test cases:\n\n${document}`;
    if (context?.targetUrl) {
      userMessage += `\n\nTarget application URL: ${context.targetUrl}`;
    }
    if (context?.appDescription) {
      userMessage += `\n\nApplication description: ${context.appDescription}`;
    }

    const result = await this.chatCompletion<{ testCases: TestCase[] }>(
      PARSE_SYSTEM_PROMPT,
      userMessage,
      TEST_CASES_RESPONSE_SCHEMA,
      { maxTokens: 8192 },
    );

    // Normalize fields
    return result.data.testCases.map((tc, index) => ({
      ...tc,
      id: tc.id || `TC-${String(index + 1).padStart(3, "0")}`,
      source: "document" as const,
      enabled: tc.enabled ?? true,
      steps: (tc.steps || []).map((s, i) => ({
        ...s,
        order: s.order ?? i + 1,
      })),
    }));
  }

  async generateTestCases(context: AppContext): Promise<TestCase[]> {
    const existingDesc = context.existingTestCases
      .map((tc) => `- ${tc.id}: ${tc.title} (${tc.priority})`)
      .join("\n");

    let userMessage = `Target URL: ${context.targetUrl}\n\n`;
    userMessage += `Existing test cases:\n${existingDesc}\n\n`;
    userMessage += `Existing test case details:\n${JSON.stringify(context.existingTestCases, null, 2)}\n\n`;
    userMessage += `Generate additional test cases to improve coverage. Focus on edge cases, security, and error handling that aren't covered by the existing tests.`;

    if (context.pageStructure) {
      userMessage += `\n\nPage HTML structure:\n${context.pageStructure}`;
    }

    const result = await this.chatCompletion<{ testCases: TestCase[] }>(
      GENERATE_SYSTEM_PROMPT,
      userMessage,
      TEST_CASES_RESPONSE_SCHEMA,
      { maxTokens: 8192 },
    );

    const startIndex = context.existingTestCases.length + 1;
    return result.data.testCases.map((tc, index) => ({
      ...tc,
      id: tc.id || `TC-AI-${String(startIndex + index).padStart(3, "0")}`,
      source: "ai-generated" as const,
      enabled: true,
      tags: [...(tc.tags || []), "ai-generated"],
      steps: (tc.steps || []).map((s, i) => ({
        ...s,
        order: s.order ?? i + 1,
      })),
    }));
  }

  async mapStepToAction(
    step: TestStep,
    pageContext: PageContext,
  ): Promise<PlaywrightAction> {
    const elementsDesc = pageContext.interactiveElements
      .slice(0, 50)
      .map(
        (el) =>
          `<${el.tag}${el.type ? ` type="${el.type}"` : ""}${el.id ? ` id="${el.id}"` : ""}${el.name ? ` name="${el.name}"` : ""}${el.placeholder ? ` placeholder="${el.placeholder}"` : ""} selector="${el.selector}">${el.text || ""}</${el.tag}>`,
      )
      .join("\n");

    let pageOrigin: string;
    try {
      pageOrigin = new URL(pageContext.url).origin;
    } catch {
      pageOrigin = pageContext.url;
    }

    const userMessage = `Current page URL: ${pageContext.url}
Page origin (base URL): ${pageOrigin}

Test step to execute:
- Action: ${step.action}
${step.target ? `- Target: ${step.target}` : ""}
${step.value ? `- Value: ${step.value}` : ""}
${step.expected ? `- Expected: ${step.expected}` : ""}

Available interactive elements on the page:
${elementsDesc}

REMINDER: Follow the step description LITERALLY. If it says "Navigate to /", the url must be "${pageOrigin}/", NOT "${pageOrigin}/login" or any other guessed path.
Generate the Playwright action for this step.`;

    const result = await this.chatCompletion<PlaywrightAction>(
      STEP_TO_ACTION_PROMPT,
      userMessage,
      PLAYWRIGHT_ACTION_SCHEMA,
    );

    return {
      type: result.data.type || "click",
      selector: result.data.selector,
      value: result.data.value,
      url: result.data.url,
      timeout: result.data.timeout,
      description: result.data.description || step.action,
      assertType: result.data.assertType,
    };
  }

  async mapStepToActions(
    step: TestStep,
    pageContext: PageContext,
  ): Promise<{ actions: PlaywrightAction[]; usage?: TokenUsage }> {
    const elementsDesc = pageContext.interactiveElements
      .slice(0, 50)
      .map(
        (el) =>
          `<${el.tag}${el.type ? ` type="${el.type}"` : ""}${el.id ? ` id="${el.id}"` : ""}${el.name ? ` name="${el.name}"` : ""}${el.placeholder ? ` placeholder="${el.placeholder}"` : ""} selector="${el.selector}">${el.text || ""}</${el.tag}>`,
      )
      .join("\n");

    let pageOrigin: string;
    try {
      pageOrigin = new URL(pageContext.url).origin;
    } catch {
      pageOrigin = pageContext.url;
    }

    const userMessage = `Current page URL: ${pageContext.url}
Page origin (base URL): ${pageOrigin}

Test step to execute:
- Action: ${step.action}
${step.target ? `- Target: ${step.target}` : ""}
${step.value ? `- Value: ${step.value}` : ""}
${step.expected ? `- Expected: ${step.expected}` : ""}

Available interactive elements on the page:
${elementsDesc}

Generate the Playwright action(s) for this step. If this is a high-level business step, decompose it into multiple atomic actions.`;

    const result = await this.chatCompletion<{ actions: PlaywrightAction[] }>(
      STEP_TO_ACTIONS_PROMPT,
      userMessage,
      PLAYWRIGHT_ACTIONS_SCHEMA,
    );

    // Normalize the returned actions
    return {
      actions: (result.data.actions || []).map((a) => ({
        type: a.type || "click",
        selector: a.selector,
        value: a.value,
        url: a.url,
        timeout: a.timeout,
        description: a.description || step.action,
        assertType: a.assertType,
      })),
      usage: result.usage,
    };
  }

  async analyzeFailure(
    screenshot: Buffer,
    expected: string,
    actual: string,
  ): Promise<FailureAnalysis> {
    const client = this.getClient();
    const base64Image = screenshot.toString("base64");

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: FAILURE_ANALYSIS_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Expected: ${expected}\nActual: ${actual}\n\nAnalyze the failure shown in the screenshot.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
                detail: "low",
              },
            },
          ],
        },
      ],
      max_tokens: 1024,
      response_format: {
        type: "json_schema",
        json_schema: FAILURE_ANALYSIS_SCHEMA,
      },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    try {
      return JSON.parse(content) as FailureAnalysis;
    } catch {
      return {
        summary: "Failed to analyze the failure",
        possibleCauses: ["AI analysis unavailable"],
        severity: "major",
      };
    }
  }
}
