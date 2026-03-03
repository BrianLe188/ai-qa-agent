// ============================================================
// CLI Command — rm-run
// ============================================================
import chalk from "chalk";
import type { Command } from "commander";
import { resolve } from "path";
import { createLocalDatabase } from "@ai-qa-agent/core";

export function registerRmRunCommand(program: Command) {
  program
    .command("rm-run <runId>")
    .description("Delete a specific test run")
    .option("-d, --dir <dir>", "Project directory", ".")
    .action(async (runId, options) => {
      const projectDir = resolve(options.dir);
      const localDb = createLocalDatabase(projectDir);

      const run = localDb.getTestRun(runId);
      if (!run) {
        console.error(chalk.red(`❌ Test run not found: ${runId}`));
        localDb.close();
        process.exit(1);
      }

      localDb.deleteTestRun(runId);

      console.log(chalk.green(`✅ Deleted test run: ${runId}`));
      localDb.close();
    });
}
