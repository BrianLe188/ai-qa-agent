#!/usr/bin/env bun
// ============================================================
// AI QA Agent CLI — Entry Point
// ============================================================
import { OpenAIProvider, ProviderRegistry } from "@ai-qa-agent/core";
import chalk from "chalk";
import { Command } from "commander";
import { registerMemoryCommand } from "./commands/memory";
import { registerParseCommand } from "./commands/parse";
import { registerPlansCommand } from "./commands/plans";
import { registerRunCommand } from "./commands/run";
import { registerRerunCommand } from "./commands/rerun";
import { registerRunsCommand } from "./commands/runs";

const program = new Command();

program
  .name("ai-qa")
  .description("🤖 AI QA Agent — AI-powered E2E testing from Markdown")
  .version("0.1.0");

// ─────────────── Global Provider Setup (runs once before any command) ───────────────
const COMMANDS_REQUIRING_AI = new Set(["run", "parse", "rerun"]);

program.hook("preAction", (_thisCommand, actionCommand) => {
  const commandName = actionCommand.name();
  if (!COMMANDS_REQUIRING_AI.has(commandName)) return;

  const opts = actionCommand.opts();
  const apiKey = opts.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error(
      chalk.red(
        "❌ API key required. Use --api-key <key> or set OPENAI_API_KEY environment variable.",
      ),
    );
    process.exit(1);
  }

  const openaiProvider = new OpenAIProvider();
  openaiProvider.setApiKey(apiKey);
  if (opts.model) openaiProvider.setModel(opts.model);
  ProviderRegistry.register(openaiProvider);
});

// ─────────────── Register Commands ───────────────
registerRunCommand(program);
registerRerunCommand(program);
registerParseCommand(program);
registerPlansCommand(program);
registerRunsCommand(program);
registerMemoryCommand(program);

program.parse();
