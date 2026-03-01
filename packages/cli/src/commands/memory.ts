// ============================================================
// CLI Command — memory
// ============================================================
import { MemoryManager } from "@ai-qa-agent/core";
import chalk from "chalk";
import type { Command } from "commander";
import { resolve } from "path";
import { createLocalDatabase } from "@ai-qa-agent/core";

export function registerMemoryCommand(program: Command) {
  program
    .command("memory")
    .description("View or manage self-healing memory")
    .option("--stats", "Show memory statistics")
    .option("--clear", "Clear all memory")
    .option("-d, --dir <dir>", "Project directory", ".")
    .action(async (options) => {
      const projectDir = resolve(options.dir);
      const localDb = createLocalDatabase(projectDir);

      const memory = new MemoryManager({
        db: localDb.db,
        getSetting: localDb.getSetting,
      });

      if (options.clear) {
        const deleted = await memory.clearMemory();
        console.log(chalk.green(`🗑️  Cleared ${deleted} memory entries`));
      } else {
        const stats = memory.getMemoryStats();
        console.log();
        console.log(chalk.white.bold("🧠 Memory Statistics"));
        console.log(chalk.gray("─".repeat(40)));
        console.log(
          `  Total mappings:   ${chalk.cyan(String(stats.totalMappings))}`,
        );
        console.log(
          `  Healthy:          ${chalk.green(String(stats.healthyMappings))}`,
        );
        console.log(
          `  Stale:            ${chalk.yellow(String(stats.staleMappings))}`,
        );
        console.log(
          `  ChromaDB:         ${stats.chromaAvailable ? chalk.green("connected") : chalk.gray("offline")}`,
        );
        console.log();
      }

      localDb.close();
    });
}
