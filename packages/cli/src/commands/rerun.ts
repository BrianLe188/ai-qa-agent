import {
  MemoryManager,
  runTests,
  saveReport,
  type RunnerConfig,
} from "@ai-qa-agent/core";
import chalk from "chalk";
import type { Command } from "commander";
import { resolve } from "path";
import { createLocalDatabase } from "@ai-qa-agent/core";
import { createConsoleReporter, createJsonReporter } from "../reporter";

export function registerRerunCommand(program: Command) {
  program
    .command("rerun")
    .description("Rerun an existing test run by its ID")
    .argument("<runId>", "ID of the test run to rerun")
    .option("-k, --api-key <key>", "OpenAI API key (or set OPENAI_API_KEY env)")
    .option("-m, --model <model>", "AI model to use", "gpt-4o-mini")
    .option("-p, --provider <name>", "AI provider", "openai")
    .option("--headed", "Run browser in headed mode (visible)", false)
    .option("--headless", "Run browser in headless mode", true)
    .option("--slow-mo <ms>", "Slow down actions by N ms", "100")
    .option("--timeout <ms>", "Timeout per action in ms", "30000")
    .option("-f, --format <format>", "Output format: console | json", "console")
    .option("-o, --output <dir>", "Project output directory containing .ai-qa")
    .option("-v, --verbose", "Show detailed logs", false)
    .option("-q, --quiet", "Minimal output", false)
    .option("--no-memory", "Disable self-healing memory")
    .option("--no-report", "Skip HTML report generation")
    .action(async (runId: string, options) => {
      try {
        await rerunAction(runId, options);
      } catch (error: any) {
        console.error(chalk.red(`\n❌ ${error.message}`));
        process.exit(1);
      }
    });
}

async function rerunAction(runId: string, options: any) {
  // Setup database (project-local)
  const projectDir = resolve(options.output || ".");
  const localDb = createLocalDatabase(projectDir);

  const existingRun = localDb.getTestRun(runId);
  if (!existingRun) {
    throw new Error(`Test run with ID '${runId}' not found.`);
  }

  const plan = localDb.getTestPlan(existingRun.testPlanId);
  if (!plan) {
    throw new Error(
      `Associated test plan '${existingRun.testPlanId}' not found.`,
    );
  }

  // Reset the test run record inside the DB as well, so the frontend/CLI knows it's rerun
  existingRun.status = "running";
  existingRun.results = [];
  existingRun.summary = {
    total: plan.testCases.filter((tc: any) => tc.enabled).length,
    passed: 0,
    failed: 0,
    skipped: 0,
    error: 0,
  };
  // existingRun.startedAt = we keep it or reset it, core will overwrite it if we just pass existingRun or don't.
  localDb.saveTestRun(existingRun);

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
      chalk.bgHex("#6366f1").white.bold(" AI QA Agent ") + chalk.gray(" CLI "),
    );
    console.log(chalk.gray("─".repeat(50)));
    console.log(
      `  ${chalk.gray("Action:")}      ${chalk.cyan("Rerunning Test Run")} ${runId}`,
    );
    console.log(
      `  ${chalk.gray("Target URL:")}  ${chalk.cyan(plan.targetUrl)}`,
    );
    console.log(
      `  ${chalk.gray("Tests:")}       ${chalk.white(String(plan.testCases.length))} test cases`,
    );
    console.log(
      `  ${chalk.gray("Browser:")}     ${headed ? chalk.green("headed") : chalk.gray("headless")}`,
    );
    console.log(chalk.gray("─".repeat(50)));
  }

  const config: RunnerConfig = {
    reporter,
    memory,
    screenshotsDir: localDb.screenshotsDir,
    options: runnerOptions,
  };

  const run = await runTests(
    plan.id,
    runId,
    plan.testCases,
    plan.targetUrl,
    config,
    existingRun,
  );

  // Generate HTML report
  if (options.report !== false) {
    try {
      const reportFilename = saveReport(
        run,
        localDb.reportsDir,
        `CLI Test Run ${runId}`,
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

  // Update DB again at the end with the new run details
  localDb.saveTestRun(run);

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
