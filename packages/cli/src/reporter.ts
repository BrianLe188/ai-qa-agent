// ============================================================
// Console Reporter — Pretty terminal output
// ============================================================
import chalk from "chalk";
import type {
  RunnerReporter,
  StepResult,
  TestCaseResult,
  TestRun,
} from "@ai-qa-agent/core";

/**
 * CLI Reporter that implements RunnerReporter with beautiful terminal output.
 * This is the CLI counterpart to the Server's WSBroadcast adapter.
 */
export function createConsoleReporter(options?: {
  verbose?: boolean;
  quiet?: boolean;
}): RunnerReporter {
  const verbose = options?.verbose ?? false;
  const quiet = options?.quiet ?? false;

  return {
    onTestRunStarted(runId: string, total: number) {
      if (quiet) return;
      console.log();
      console.log(
        chalk.bgHex("#6366f1").white.bold(" AI QA Agent ") +
          chalk.gray(` Run: ${runId}`),
      );
      console.log(
        chalk.cyan(
          `🚀 Starting test run with ${chalk.bold(String(total))} test cases`,
        ),
      );
      console.log(chalk.gray("─".repeat(60)));
    },

    onTestCaseStarted(runId: string, testCaseId: string, title: string) {
      if (quiet) return;
      console.log();
      console.log(
        chalk.white.bold(`▶ ${testCaseId}`) + chalk.gray(` — ${title}`),
      );
    },

    onTestStepCompleted(runId: string, testCaseId: string, step: StepResult) {
      if (quiet) return;
      const icon = step.status === "passed" ? chalk.green("✓") : chalk.red("✗");
      const duration = chalk.gray(`(${step.durationMs}ms)`);

      console.log(
        `  ${icon} ${chalk.gray(`Step ${step.stepOrder}:`)} ${step.action} ${duration}`,
      );

      if (step.status === "failed" && step.error) {
        console.log(chalk.red(`    └─ ${step.error}`));
      }
    },

    onTestCaseCompleted(runId: string, result: TestCaseResult) {
      if (quiet) return;
      const statusBadge =
        result.status === "passed"
          ? chalk.bgGreen.black.bold(" PASS ")
          : result.status === "failed"
            ? chalk.bgRed.white.bold(" FAIL ")
            : chalk.bgYellow.black.bold(` ${result.status.toUpperCase()} `);

      console.log(
        `  ${statusBadge} ${chalk.white(result.testCaseTitle)} ${chalk.gray(`${result.durationMs}ms`)}`,
      );
    },

    onTestRunCompleted(runId: string, summary: TestRun["summary"]) {
      console.log();
      console.log(chalk.gray("═".repeat(60)));
      console.log(chalk.white.bold("📊 Test Results"));
      console.log();

      const parts: string[] = [];
      parts.push(chalk.green.bold(`${summary.passed} passed`));
      if (summary.failed > 0)
        parts.push(chalk.red.bold(`${summary.failed} failed`));
      if (summary.error > 0)
        parts.push(chalk.yellow.bold(`${summary.error} errors`));
      if (summary.skipped > 0)
        parts.push(chalk.gray(`${summary.skipped} skipped`));

      console.log(
        `  ${parts.join(chalk.gray(" | "))} ${chalk.gray(`of ${summary.total} total`)}`,
      );

      // Pass rate bar
      const barWidth = 40;
      const passRatio = summary.total > 0 ? summary.passed / summary.total : 0;
      const passBlocks = Math.round(passRatio * barWidth);
      const failBlocks = barWidth - passBlocks;
      const bar =
        chalk.green("█".repeat(passBlocks)) + chalk.red("█".repeat(failBlocks));
      const passRate = (passRatio * 100).toFixed(1);

      console.log(`  ${bar} ${chalk.white.bold(`${passRate}%`)}`);
      console.log();

      if (summary.failed === 0 && summary.error === 0) {
        console.log(chalk.green.bold("  ✨ All tests passed!"));
      } else {
        console.log(
          chalk.red.bold(
            `  ⚠ ${summary.failed + summary.error} test(s) need attention`,
          ),
        );
      }
      console.log();
    },

    onTestRunError(runId: string, error: string) {
      console.log();
      console.log(chalk.bgRed.white.bold(" ERROR ") + ` ${chalk.red(error)}`);
    },

    onReportReady(runId: string, reportUrl: string, downloadUrl: string) {
      console.log(chalk.cyan(`📋 Report: ${reportUrl}`));
    },

    onTestRunPaused(runId: string, pausedAt: string, stepOrder: number | null) {
      console.log(chalk.yellow(`⏸️  Test run paused`));
    },

    onTestRunResumed(runId: string) {
      console.log(chalk.green(`▶️  Test run resumed`));
    },

    onLog(runId: string, level: "info" | "warn" | "error", message: string) {
      if (quiet && level === "info") return;

      if (verbose) {
        switch (level) {
          case "warn":
            console.log(chalk.yellow(message));
            break;
          case "error":
            console.log(chalk.red(message));
            break;
          default:
            console.log(chalk.gray(message));
        }
      }
    },
  };
}

/**
 * Create a JSON reporter for CI/CD pipelines
 */
export function createJsonReporter(): RunnerReporter & { getEvents(): any[] } {
  const events: any[] = [];

  const reporter: RunnerReporter & { getEvents(): any[] } = {
    onTestRunStarted(runId, total) {
      events.push({
        type: "test-run:started",
        runId,
        total,
        timestamp: Date.now(),
      });
    },
    onTestCaseStarted(runId, testCaseId, title) {
      events.push({
        type: "test-case:started",
        runId,
        testCaseId,
        title,
        timestamp: Date.now(),
      });
    },
    onTestStepCompleted(runId, testCaseId, step) {
      events.push({
        type: "test-step:completed",
        runId,
        testCaseId,
        step,
        timestamp: Date.now(),
      });
    },
    onTestCaseCompleted(runId, result) {
      events.push({
        type: "test-case:completed",
        runId,
        result,
        timestamp: Date.now(),
      });
    },
    onTestRunCompleted(runId, summary) {
      events.push({
        type: "test-run:completed",
        runId,
        summary,
        timestamp: Date.now(),
      });
    },
    onTestRunError(runId, error) {
      events.push({
        type: "test-run:error",
        runId,
        error,
        timestamp: Date.now(),
      });
    },
    onReportReady(runId, reportUrl, downloadUrl) {
      events.push({
        type: "report:ready",
        runId,
        reportUrl,
        downloadUrl,
        timestamp: Date.now(),
      });
    },
    onTestRunPaused(runId, pausedAt, stepOrder) {
      events.push({
        type: "test-run:paused",
        runId,
        pausedAt,
        stepOrder,
        timestamp: Date.now(),
      });
    },
    onTestRunResumed(runId) {
      events.push({ type: "test-run:resumed", runId, timestamp: Date.now() });
    },
    onLog(runId, level, message) {
      events.push({
        type: "log",
        runId,
        level,
        message,
        timestamp: Date.now(),
      });
    },
    getEvents() {
      return events;
    },
  };

  return reporter;
}
