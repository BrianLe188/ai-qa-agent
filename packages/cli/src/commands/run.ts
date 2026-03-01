// ============================================================
// CLI Command — run
// ============================================================
import {
  MemoryManager,
  ProviderRegistry,
  runTests,
  saveReport,
  type RunnerConfig,
} from "@ai-qa-agent/core";
import chalk from "chalk";
import type { Command } from "commander";
import { existsSync, readFileSync, statSync, readdirSync } from "fs";
import { nanoid } from "nanoid";
import ora from "ora";
import { resolve, join } from "path";
import { createLocalDatabase } from "@ai-qa-agent/core";
import { createConsoleReporter, createJsonReporter } from "../reporter";

export function registerRunCommand(program: Command) {
  program
    .command("run")
    .description(
      "Run test cases from a Markdown file or directory or existing test plan",
    )
    .argument(
      "[path]",
      "Path to test case .md file or directory (optional if --plan is provided)",
    )
    .option(
      "-t, --plan <planId>",
      "Run an existing test plan from the database by ID",
    )
    .option(
      "-u, --url <url>",
      "Base URL of the application under test (required if not using --plan)",
    )
    .option("-k, --api-key <key>", "OpenAI API key (or set OPENAI_API_KEY env)")
    .option("-m, --model <model>", "AI model to use", "gpt-4o-mini")
    .option("-p, --provider <name>", "AI provider", "openai")
    .option("--headed", "Run browser in headed mode (visible)", false)
    .option("--headless", "Run browser in headless mode", true)
    .option("--slow-mo <ms>", "Slow down actions by N ms", "100")
    .option("--timeout <ms>", "Timeout per action in ms", "30000")
    .option("-f, --format <format>", "Output format: console | json", "console")
    .option("-o, --output <dir>", "Output directory for reports")
    .option("-v, --verbose", "Show detailed logs", false)
    .option("-q, --quiet", "Minimal output", false)
    .option("--no-memory", "Disable self-healing memory")
    .option("--no-report", "Skip HTML report generation")
    .action(async (inputPath: string, options) => {
      try {
        await runAction(inputPath, options);
      } catch (error: any) {
        console.error(chalk.red(`\n❌ ${error.message}`));
        process.exit(1);
      }
    });
}

async function runAction(inputPath: string | undefined, options: any) {
  if (!inputPath && !options.plan) {
    throw new Error(
      "You must specify either a <path> to test cases or a --plan <planId>",
    );
  }

  // Setup database (project-local)
  const projectDir = resolve(options.output || ".");
  const localDb = createLocalDatabase(projectDir);

  let testCases;
  let filesCount = 0;
  let targetUrl = options.url;
  let testPlanId = `cli-${nanoid(6)}`;
  let planName = "CLI Test Run";

  if (options.plan) {
    const plan = localDb.getTestPlan(options.plan);
    if (!plan) {
      throw new Error(
        `Test plan with ID '${options.plan}' not found in the database.`,
      );
    }
    testCases = plan.testCases;
    testPlanId = plan.id;
    planName = plan.name;
    targetUrl = options.url || plan.targetUrl;
  } else {
    if (!options.url) {
      throw new Error("Missing required option: -u, --url <url>");
    }
    const fullPath = resolve(inputPath!);
    if (!existsSync(fullPath)) {
      throw new Error(`Path not found: ${fullPath}`);
    }

    // Read document content (file or directory)
    let documentContent = "";
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      const files = readdirSync(fullPath).filter((f) =>
        /\.(md|txt|markdown)$/i.test(f),
      );
      filesCount = files.length;
      documentContent = files
        .map((f) => readFileSync(join(fullPath, f), "utf-8"))
        .join("\n\n");
    } else {
      filesCount = 1;
      documentContent = readFileSync(fullPath, "utf-8");
    }

    if (!documentContent.trim()) {
      throw new Error("Document is empty. No content to parse.");
    }

    // Use AI to parse test cases from document (same as server)
    const spinner = ora({
      text: chalk.yellow("AI is parsing test cases from document..."),
      spinner: "dots12",
      color: "yellow",
    });
    if (options.format !== "json") spinner.start();
    try {
      const ai = ProviderRegistry.getActive();
      testCases = await ai.parseTestCases(documentContent, {
        targetUrl: options.url,
      });
      if (options.format !== "json")
        spinner.succeed(
          chalk.green(
            `AI parsed ${testCases.length} test case(s) from ${filesCount} file(s)`,
          ),
        );
    } catch (err: any) {
      spinner.fail(chalk.red(`AI parsing failed: ${err.message}`));
      throw err;
    }

    // Save parsed test cases as a test plan in the database (same as parse command)
    const fileName = fullPath.split("/").pop() || "unknown";
    planName = options.name || fileName;
    testPlanId = nanoid(10);
    localDb.saveTestPlan({
      id: testPlanId,
      name: planName,
      targetUrl: options.url,
      testCases,
      documentSource: fileName,
    });

    if (options.format !== "json") {
      console.log(
        chalk.gray(
          `  💾 Saved as test plan ${chalk.cyan(testPlanId)} — reuse with: ai-qa run --plan ${testPlanId}`,
        ),
      );
    }
  }

  if (!testCases || testCases.length === 0) {
    throw new Error("No test cases found.");
  }

  // Setup memory manager
  const memory = new MemoryManager({
    db: localDb.db,
    getSetting: localDb.getSetting,
  });

  // Setup reporter
  const reporter =
    options.format === "json"
      ? createJsonReporter()
      : createConsoleReporter({
          verbose: options.verbose,
          quiet: options.quiet,
        });

  // Browser options
  const headed = options.headed || false;
  const runnerOptions = {
    headless: !headed,
    slowMo: parseInt(options.slowMo) || 100,
    viewport: { width: 1280, height: 720 },
    timeout: parseInt(options.timeout) || 30000,
  };

  // Print summary before running
  if (options.format !== "json") {
    console.log();
    console.log(
      chalk.bgHex("#6366f1").white.bold(" AI QA Agent ") +
        chalk.gray(" CLI v0.1.0"),
    );
    console.log(chalk.gray("─".repeat(50)));
    console.log(`  ${chalk.gray("URL:")}       ${chalk.cyan(targetUrl)}`);
    console.log(
      `  ${chalk.gray("Tests:")}     ${chalk.white(String(testCases.length))} test cases${
        options.plan
          ? ` from plan '${planName}'`
          : ` from ${filesCount} file(s)`
      }`,
    );
    console.log(`  ${chalk.gray("Model:")}     ${chalk.white(options.model)}`);
    console.log(
      `  ${chalk.gray("Browser:")}   ${headed ? chalk.green("headed") : chalk.gray("headless")}`,
    );
    console.log(
      `  ${chalk.gray("Slow Mo:")}   ${chalk.white(String(runnerOptions.slowMo) + "ms")}`,
    );
    console.log(chalk.gray("─".repeat(50)));
  }

  // Run tests!
  const runId = nanoid(10);

  const config: RunnerConfig = {
    reporter,
    memory,
    screenshotsDir: localDb.screenshotsDir,
    options: runnerOptions,
  };

  const run = await runTests(testPlanId, runId, testCases, targetUrl, config);

  // Generate HTML report
  if (options.report !== false) {
    try {
      const reportFilename = saveReport(
        run,
        localDb.reportsDir,
        "CLI Test Run",
        {
          screenshotBaseUrl: localDb.screenshotsDir,
        },
      );
      const reportPath = `${localDb.reportsDir}/${reportFilename}`;
      if (options.format !== "json") {
        console.log(chalk.cyan(`📋 HTML Report: ${reportPath}`));
      }
    } catch (err: any) {
      if (options.format !== "json") {
        console.log(
          chalk.yellow(`⚠ Failed to generate report: ${err.message}`),
        );
      }
    }
  }

  // JSON output
  if (options.format === "json") {
    const jsonReporter = reporter as ReturnType<typeof createJsonReporter>;
    console.log(
      JSON.stringify(
        {
          run: {
            id: run.id,
            status: run.status,
            summary: run.summary,
            durationMs: run.durationMs,
            results: run.results,
          },
          events: jsonReporter.getEvents(),
        },
        null,
        2,
      ),
    );
  }

  // Cleanup
  localDb.close();

  // Exit with error code if tests failed
  if (run.summary.failed > 0 || run.summary.error > 0) {
    process.exit(1);
  }
}
