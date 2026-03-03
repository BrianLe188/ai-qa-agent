// ============================================================
// CLI Command — memory
// ============================================================
import { MemoryManager } from "@ai-qa-agent/core";
import chalk from "chalk";
import type { Command } from "commander";
import { resolve } from "path";
import { readFileSync, writeFileSync } from "fs";
import { createLocalDatabase } from "@ai-qa-agent/core";

export function registerMemoryCommand(program: Command) {
  program
    .command("memory")
    .description("View or manage self-healing memory")
    .option("--stats", "Show memory statistics")
    .option("--clear", "Clear all memory")
    .option("--export <file>", "Export memory mappings to a JSON file")
    .option("--import <file>", "Import memory mappings from a JSON file")
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
      } else if (options.export) {
        const file = resolve(options.export);
        const data = memory.exportMemory();
        writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
        console.log(
          chalk.green(
            `✅ Exported ${data.length} memory entries to ${options.export}`,
          ),
        );
      } else if (options.import) {
        const file = resolve(options.import);
        try {
          const content = readFileSync(file, "utf-8");
          const data = JSON.parse(content);
          if (!Array.isArray(data)) {
            throw new Error(
              "Invalid file format: Expected an array of step mappings",
            );
          }
          const { imported, errors } = await memory.importMemory(data);
          console.log(
            chalk.green(
              `✅ Imported ${imported} memory entries from ${options.import}`,
            ),
          );
          if (errors > 0) {
            console.log(
              chalk.yellow(
                `⚠️  Failed to import ${errors} entries due to errors.`,
              ),
            );
          }
        } catch (err: any) {
          console.error(
            chalk.red(`❌ Failed to import memory: ${err.message}`),
          );
        }
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
