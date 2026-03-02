// ============================================================
// CLI Command — plans
// ============================================================
import chalk from "chalk";
import type { Command } from "commander";
import { resolve } from "path";
import { createLocalDatabase } from "@ai-qa-agent/core";

export function registerPlansCommand(program: Command) {
  program
    .command("plans")
    .description("List all saved test plans")
    .option("-d, --dir <dir>", "Project directory", ".")
    .option("-n, --limit <n>", "Limit number of plans shown", "20")
    .action(async (options) => {
      const projectDir = resolve(options.dir);
      const localDb = createLocalDatabase(projectDir);
      const allPlans = localDb.listTestPlans();
      const limit = parseInt(options.limit) || 20;
      const plans = allPlans.slice(0, limit);

      console.log();
      console.log(
        chalk.bgHex("#6366f1").white.bold(" AI QA Agent ") +
          chalk.gray(" Test Plans"),
      );
      console.log(chalk.gray("─".repeat(50)));

      if (plans.length === 0) {
        console.log(
          chalk.yellow(
            "  No test plans found. Use `ai-qa parse <file>` to create one.",
          ),
        );
      } else {
        for (const plan of plans) {
          console.log(
            `  ${chalk.cyan.bold(plan.id)} ${chalk.gray("—")} ${chalk.white.bold(plan.name)}`,
          );
          console.log(`    ${chalk.gray("URL:")} ${plan.targetUrl}`);
          console.log(
            `    ${chalk.gray("Tests:")} ${plan.testCases.length} test cases`,
          );
          console.log(
            `    ${chalk.gray("Source:")} ${plan.documentSource || "—"}`,
          );
          console.log(`    ${chalk.gray("Created:")} ${plan.createdAt}`);
          console.log();
        }
      }

      if (allPlans.length > limit) {
        console.log(
          chalk.gray(
            `  Showing ${limit} of ${allPlans.length} plans. Use --limit to see more.`,
          ),
        );
        console.log();
      }

      console.log(chalk.gray("─".repeat(50)));
      localDb.close();
    });
}
