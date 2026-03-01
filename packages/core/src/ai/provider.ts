// ============================================================
// AI Provider Interface — Strategy Pattern
// ============================================================
import type {
  TestCase,
  ParseContext,
  AppContext,
  TestStep,
  PageContext,
  PlaywrightAction,
  FailureAnalysis,
} from "../types";

/**
 * Abstract AI Provider interface.
 * All AI providers (OpenAI, Gemini, Claude, etc.) must implement this.
 */
export interface AIProvider {
  readonly name: string;
  readonly displayName: string;

  /** Check if the provider has a valid API key configured */
  isConfigured(): boolean;

  /** Set the API key for this provider */
  setApiKey(apiKey: string): void;

  /** Set the model to use */
  setModel(model: string): void;

  /** Get available models for this provider */
  getAvailableModels(): string[];

  /**
   * Parse a document (markdown, text) and extract structured test cases.
   * The AI reads the document and returns an array of TestCase objects.
   */
  parseTestCases(document: string, context?: ParseContext): Promise<TestCase[]>;

  /**
   * Generate additional test cases based on existing ones.
   * The AI analyzes the existing test cases and generates new ones
   * to improve coverage (edge cases, security, error handling, etc.)
   */
  generateTestCases(context: AppContext): Promise<TestCase[]>;

  /**
   * Given a natural language test step and the current page context,
   * generate a Playwright action to execute.
   */
  mapStepToAction(
    step: TestStep,
    pageContext: PageContext,
  ): Promise<PlaywrightAction>;

  /**
   * Analyze a test failure: given the screenshot, expected vs actual,
   * provide an analysis of what went wrong.
   */
  analyzeFailure(
    screenshot: Buffer,
    expected: string,
    actual: string,
  ): Promise<FailureAnalysis>;
}
