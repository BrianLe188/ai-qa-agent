// ============================================================
// CLI Shared Utilities
// ============================================================
import chalk from "chalk";

/**
 * Pretty-print an array of test cases to the console.
 */
export function printTestCases(testCases: any[], label?: string) {
  for (const tc of testCases) {
    const priorityColor =
      tc.priority === "critical"
        ? chalk.red
        : tc.priority === "high"
          ? chalk.yellow
          : tc.priority === "medium"
            ? chalk.blue
            : chalk.gray;

    const prefix = label ? `${chalk.magenta.bold(label)} ` : "";
    console.log(
      `  ${prefix}${chalk.white.bold(tc.id)} ${chalk.gray("—")} ${tc.title}`,
    );
    console.log(
      `    ${priorityColor(`■ ${tc.priority}`)} ${chalk.gray(`| ${tc.steps.length} steps`)}`,
    );
    for (const step of tc.steps) {
      console.log(chalk.gray(`    ${step.order}. ${step.action}`));
    }
    console.log();
  }
}
