// ============================================================
// CLI Command — parse
// ============================================================
import { ProviderRegistry } from "@ai-qa-agent/core";
import chalk from "chalk";
import type { Command } from "commander";
import { existsSync, readFileSync } from "fs";
import { nanoid } from "nanoid";
import { basename, resolve } from "path";
import * as readLine from "readline/promises";
import { createLocalDatabase } from "@ai-qa-agent/core";
import { printTestCases } from "../utils";

export function registerParseCommand(program: Command) {
  program
    .command("parse")
    .description(
      "Parse document with AI, optionally generate extra test cases, and save as a test plan",
    )
    .argument("<path>", "Path to document file (.md, .txt, etc.)")
    .requiredOption(
      "-u, --url <url>",
      "Target URL of the application under test",
    )
    .option("-n, --name <name>", "Name for the test plan")
    .option("-k, --api-key <key>", "OpenAI API key (or set OPENAI_API_KEY env)")
    .option("-m, --model <model>", "AI model to use", "gpt-4o-mini")
    .option("--no-generate", "Skip AI generation of additional test cases")
    .option("-d, --dir <dir>", "Project directory for .ai-qa/ storage", ".")
    .action(async (inputPath: string, options) => {
      try {
        await parseAction(inputPath, options);
      } catch (error: any) {
        console.error(chalk.red(`\n❌ ${error.message}`));
        process.exit(1);
      }
    });
}

async function parseAction(inputPath: string, options: any) {
  const fullPath = resolve(inputPath);
  if (!existsSync(fullPath)) {
    throw new Error(`Path not found: ${fullPath}`);
  }

  // Step 0: Read the document content
  const document = readFileSync(fullPath, "utf-8");
  const fileName = basename(fullPath);
  const planName = options.name || fileName;

  console.log();
  console.log(
    chalk.bgHex("#6366f1").white.bold(" AI QA Agent ") +
      chalk.gray(" Parse & Create Test Plan"),
  );
  console.log(chalk.gray("─".repeat(50)));
  console.log(`  ${chalk.gray("File:")}     ${chalk.white(fullPath)}`);
  console.log(`  ${chalk.gray("URL:")}      ${chalk.cyan(options.url)}`);
  console.log(`  ${chalk.gray("Model:")}    ${chalk.white(options.model)}`);
  console.log(chalk.gray("─".repeat(50)));

  // Step 1: AI parses test cases from document (same as server)
  console.log(
    chalk.yellow("\n🤖 Step 1: AI is parsing test cases from document..."),
  );
  const ai = ProviderRegistry.getActive();
  const parsedCases = await ai.parseTestCases(document, {
    targetUrl: options.url,
  });

  console.log(
    chalk.green(`✅ AI parsed ${parsedCases.length} test case(s):\n`),
  );
  printTestCases(parsedCases);

  // Step 2: Optionally generate additional test cases (same as server)
  let allCases = [...parsedCases];

  if (options.generate !== false) {
    const rl = readLine.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await rl.question(
      chalk.cyan("✨ Generate additional test cases with AI? (Y/n): "),
    );

    if (answer.toLowerCase() !== "n" && answer.toLowerCase() !== "no") {
      console.log(
        chalk.yellow("\n🤖 Step 2: AI is generating additional test cases..."),
      );
      try {
        const additionalCases = await ai.generateTestCases({
          targetUrl: options.url,
          existingTestCases: parsedCases,
        });
        allCases = [...parsedCases, ...additionalCases];
        console.log(
          chalk.green(
            `✅ AI generated ${additionalCases.length} additional test case(s):\n`,
          ),
        );
        printTestCases(additionalCases, "NEW");
      } catch (e: any) {
        console.log(
          chalk.yellow(
            `⚠ Failed to generate additional test cases: ${e.message}`,
          ),
        );
      }
    }

    rl.close();
  }

  // Step 3: Save test plan to .ai-qa/ database (same as server)
  const projectDir = resolve(options.dir || ".");
  const localDb = createLocalDatabase(projectDir);
  const planId = nanoid(10);

  localDb.saveTestPlan({
    id: planId,
    name: planName,
    targetUrl: options.url,
    testCases: allCases,
    documentSource: fileName,
  });

  console.log(chalk.gray("\n─".repeat(50)));
  console.log(chalk.green.bold(`\n✅ Test Plan saved!`));
  console.log(`  ${chalk.gray("Plan ID:")}    ${chalk.cyan.bold(planId)}`);
  console.log(`  ${chalk.gray("Name:")}       ${chalk.white(planName)}`);
  console.log(
    `  ${chalk.gray("Tests:")}      ${chalk.white(String(allCases.length))} test cases`,
  );
  console.log(`  ${chalk.gray("Stored in:")}  ${chalk.gray(localDb.dataDir)}`);
  console.log();
  console.log(
    chalk.gray(
      `  Run them with: ${chalk.cyan(`ai-qa run ${inputPath} --url ${options.url}`)}`,
    ),
  );

  localDb.close();
}
