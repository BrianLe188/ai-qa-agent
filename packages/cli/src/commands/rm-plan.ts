// ============================================================
// CLI Command — rm-plan
// ============================================================
import chalk from "chalk";
import type { Command } from "commander";
import { resolve } from "path";
import { createLocalDatabase } from "@ai-qa-agent/core";

export function registerRmPlanCommand(program: Command) {
  program
    .command("rm-plan <planId>")
    .description("Delete a saved test plan and all its associated runs")
    .option("-d, --dir <dir>", "Project directory", ".")
    .action(async (planId, options) => {
      const projectDir = resolve(options.dir);
      const localDb = createLocalDatabase(projectDir);

      const plan = localDb.getTestPlan(planId);
      if (!plan) {
        console.error(chalk.red(`❌ Test plan not found: ${planId}`));
        localDb.close();
        process.exit(1);
      }

      // get runs to notify user
      const runs = localDb.listTestRuns(planId);

      localDb.deleteTestPlan(planId);

      console.log(chalk.green(`✅ Deleted test plan: ${planId}`));
      if (runs.length > 0) {
        console.log(
          chalk.gray(`   Removed ${runs.length} associated test runs.`),
        );
      }
      localDb.close();
    });
}
