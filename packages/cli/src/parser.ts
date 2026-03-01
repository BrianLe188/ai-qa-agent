// ============================================================
// Markdown Test Parser — Parse .md files into TestCase[]
// ============================================================
import type { TestCase, TestStep } from "@ai-qa-agent/core";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

/**
 * Parse a Markdown test document into TestCase objects.
 * Supports the format:
 *
 * ## TC-001: Test title
 * **Priority:** High
 * **URL:** /login
 * **Steps:**
 * 1. Navigate to /login
 * 2. Enter "user@example.com" into the email field
 * **Expected:** User should be logged in
 */
export function parseMarkdownTestFile(
  content: string,
  filename?: string,
): TestCase[] {
  const testCases: TestCase[] = [];

  // Split by test case headers (## TC-XXX: Title)
  const tcPattern = /^##\s+(TC-\d+)\s*:\s*(.+)$/gm;
  const matches = [...content.matchAll(tcPattern)];

  if (matches.length === 0) {
    // Try alternative format: ## Title (without TC-XXX prefix)
    const altPattern = /^##\s+(.+)$/gm;
    const altMatches = [...content.matchAll(altPattern)];

    for (let i = 0; i < altMatches.length; i++) {
      const match = altMatches[i];
      const startIdx = match.index!;
      const endIdx =
        i + 1 < altMatches.length ? altMatches[i + 1].index! : content.length;
      const section = content.slice(startIdx, endIdx);

      const tc = parseSingleTestCase(
        `TC-${String(i + 1).padStart(3, "0")}`,
        match[1].trim(),
        section,
      );
      if (tc.steps.length > 0) {
        testCases.push(tc);
      }
    }
  } else {
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const startIdx = match.index!;
      const endIdx =
        i + 1 < matches.length ? matches[i + 1].index! : content.length;
      const section = content.slice(startIdx, endIdx);

      const tc = parseSingleTestCase(match[1], match[2].trim(), section);
      if (tc.steps.length > 0) {
        testCases.push(tc);
      }
    }
  }

  return testCases;
}

function parseSingleTestCase(
  id: string,
  title: string,
  section: string,
): TestCase {
  // Parse priority
  const priorityMatch = section.match(
    /\*\*Priority:?\*\*\s*(critical|high|medium|low)/i,
  );
  const priority = (priorityMatch?.[1]?.toLowerCase() ||
    "medium") as TestCase["priority"];

  // Parse URL
  const urlMatch = section.match(/\*\*URL:?\*\*\s*(\S+)/i);
  const url = urlMatch?.[1] || undefined;

  // Parse tags
  const tagsMatch = section.match(/\*\*Tags?:?\*\*\s*(.+)/i);
  const tags =
    tagsMatch?.[1]
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean) || [];

  // Parse description
  const descMatch = section.match(/\*\*Description:?\*\*\s*(.+)/i);
  const description = descMatch?.[1]?.trim();

  // Parse steps (numbered list: 1. Action text)
  const steps: TestStep[] = [];
  const stepPattern = /^\d+\.\s+(.+)$/gm;
  let stepMatch: RegExpExecArray | null;
  let order = 1;

  while ((stepMatch = stepPattern.exec(section)) !== null) {
    const action = stepMatch[1].trim();
    // Check if line after step has "Expected:" inline
    const expectedInline = action.match(/\(expected:\s*(.+)\)$/i);

    steps.push({
      order: order++,
      action: expectedInline
        ? action.replace(expectedInline[0], "").trim()
        : action,
      expected: expectedInline?.[1]?.trim(),
    });
  }

  // Parse expected result
  const expectedMatch = section.match(
    /\*\*Expected(?:\s+Result)?:?\*\*\s*(.+)/i,
  );
  const expectedResult = expectedMatch?.[1]?.trim() || title;

  return {
    id,
    title,
    description,
    priority,
    url,
    steps,
    expectedResult,
    tags,
    source: "document",
    enabled: true,
  };
}

/**
 * Load test cases from a file or directory path.
 * Supports .md files.
 */
export function loadTestCases(inputPath: string): {
  testCases: TestCase[];
  files: string[];
} {
  const stat = statSync(inputPath);
  const files: string[] = [];
  const testCases: TestCase[] = [];

  if (stat.isDirectory()) {
    // Scan directory for .md files
    const entries = readdirSync(inputPath, { recursive: true }) as string[];
    for (const entry of entries) {
      if (extname(entry) === ".md") {
        const fullPath = join(inputPath, entry);
        files.push(fullPath);
        const content = readFileSync(fullPath, "utf-8");
        testCases.push(...parseMarkdownTestFile(content, entry));
      }
    }
  } else {
    // Single file
    files.push(inputPath);
    const content = readFileSync(inputPath, "utf-8");
    testCases.push(...parseMarkdownTestFile(content, inputPath));
  }

  return { testCases, files };
}
