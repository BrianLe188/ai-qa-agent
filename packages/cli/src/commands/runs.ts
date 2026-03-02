// ============================================================
// CLI Command — runs (list test runs)
// ============================================================
import chalk from "chalk";
import type { Command } from "commander";
import { resolve } from "path";
import { createLocalDatabase } from "@ai-qa-agent/core";

function formatDuration(ms?: number): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function statusBadge(status: string): string {
  switch (status) {
    case "completed":
      return chalk.bgGreen.black.bold(" DONE ");
    case "running":
      return chalk.bgYellow.black.bold(" RUNNING ");
    case "pending":
      return chalk.bgGray.white.bold(" PENDING ");
    case "aborted":
      return chalk.bgRed.white.bold(" ABORTED ");
    default:
      return chalk.gray(status);
  }
}

function resultSummary(summary: any): string {
  if (!summary || !summary.total) return chalk.gray("No results");

  const parts: string[] = [];
  if (summary.passed > 0) parts.push(chalk.green(`${summary.passed} passed`));
  if (summary.failed > 0) parts.push(chalk.red(`${summary.failed} failed`));
  if (summary.error > 0) parts.push(chalk.redBright(`${summary.error} error`));
  if (summary.skipped > 0)
    parts.push(chalk.yellow(`${summary.skipped} skipped`));

  return `${parts.join(chalk.gray(" · "))} ${chalk.gray(`/ ${summary.total} total`)}`;
}

export function registerRunsCommand(program: Command) {
  program
    .command("runs")
    .description("List all test runs (optionally filter by plan)")
    .option("-d, --dir <dir>", "Project directory", ".")
    .option("-p, --plan <planId>", "Filter by test plan ID")
    .option("-n, --limit <n>", "Limit number of runs shown", "20")
    .action(async (options) => {
      const projectDir = resolve(options.dir);
      const localDb = createLocalDatabase(projectDir);
      const allRuns = localDb.listTestRuns(options.plan || undefined);
      const limit = parseInt(options.limit) || 20;
      const runs = allRuns.slice(0, limit);

      // Header
      console.log();
      console.log(
        chalk.bgHex("#6366f1").white.bold(" AI QA Agent ") +
          chalk.gray(" Test Runs"),
      );
      console.log(chalk.gray("═".repeat(72)));

      if (runs.length === 0) {
        console.log();
        console.log(
          chalk.yellow(
            "  No test runs found. Use `ai-qa run <file>` to start a run.",
          ),
        );
        console.log();
      } else {
        // Fetch plan names for display
        const planCache = new Map<string, string>();

        for (const run of runs) {
          // Get plan name (cached)
          let planName = planCache.get(run.testPlanId);
          if (!planName) {
            const plan = localDb.getTestPlan(run.testPlanId);
            planName = plan?.name || run.testPlanId;
            planCache.set(run.testPlanId, planName!);
          }

          console.log();
          console.log(
            `  ${chalk.cyan.bold(run.id)}  ${statusBadge(run.status)}  ${chalk.gray(formatDuration(run.durationMs))}`,
          );
          console.log(
            `    ${chalk.gray("Plan:")}  ${chalk.white(planName)}  ${chalk.gray(`(${run.testPlanId})`)}`,
          );
          console.log(
            `    ${chalk.gray("URL:")}   ${chalk.white(run.targetUrl)}`,
          );
          console.log(
            `    ${chalk.gray("Result:")} ${resultSummary(run.summary)}`,
          );
          console.log(
            `    ${chalk.gray("Started:")} ${run.startedAt}${run.completedAt ? chalk.gray("  →  ") + run.completedAt : ""}`,
          );
        }
        console.log();

        if (allRuns.length > limit) {
          console.log(
            chalk.gray(
              `  Showing ${limit} of ${allRuns.length} runs. Use --limit to see more.`,
            ),
          );
          console.log();
        }
      }

      console.log(chalk.gray("═".repeat(72)));
      console.log(
        chalk.gray(
          `  💡 Tip: Use ${chalk.cyan("ai-qa rerun <runId>")} to re-execute a run`,
        ),
      );
      console.log();

      localDb.close();
    });
}
