"use client";

import { motion } from "motion/react";
import { Terminal, Code2, Database, Repeat, Cpu } from "lucide-react";

const cliFeatures = [
  {
    icon: Terminal,
    title: "Global Install",
    description:
      "Install once via npm and run `ai-qa` anywhere across your projects without heavy configuration.",
    command: "$ npm link",
  },
  {
    icon: Cpu,
    title: "AI-Powered Parsing",
    description:
      "Point to any markdown or text file. The CLI uses AI to automatically extract and structure test cases.",
    command: "$ ai-qa parse ./docs/tests.md --url http://localhost",
  },
  {
    icon: Code2,
    title: "Headless Execution",
    description:
      "Run tests in headless mode for CI/CD pipelines, complete with automatic HTML report generation.",
    command: "$ ai-qa run ./tests.md --url http://localhost",
  },
  {
    icon: Repeat,
    title: "Instant Reruns",
    description:
      "Failed a test? Rerun exactly the same plan ID instantly after fixing the issue.",
    command: "$ ai-qa rerun <run_id>",
  },
  {
    icon: Database,
    title: "Local SQLite Storage",
    description:
      "All test plans, runs, and memory are stored locally in a `.ai-qa/` folder inside your project workspace.",
    command: "View reports in .ai-qa/reports/",
  },
];

export default function CliFeatures() {
  return (
    <section
      id="cli"
      className="py-32 relative bg-[#050505] border-t border-white/5"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
            <Terminal className="w-4 h-4 text-neon-green" />
            <span className="text-sm font-mono text-neon-green">
              Developer-First CLI
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
            Powerful Command Line Interface
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Not a fan of web dashboards? The AI QA Agent comes with a robust,
            standalone CLI designed for developers and CI/CD integration.
          </p>
        </div>

        <div className="grid md:grid-cols-12 gap-8 items-start">
          {/* CLI Window Preview */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="md:col-span-7 rounded-2xl border border-white/10 bg-[#0a0a0a] overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-xs font-mono text-white/40">
                zsh - ai-qa run
              </span>
            </div>
            <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto min-h-[400px]">
              <div className="flex gap-2 mb-4">
                <span className="text-neon-green">➜</span>
                <span className="text-white">
                  {"ai-qa run ./examples/login-tests-v2.md --url http://localhost:4000"
                    .split("")
                    .map((char, index) => (
                      <motion.span
                        key={index}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + index * 0.03, duration: 0 }}
                      >
                        {char}
                      </motion.span>
                    ))}
                </span>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 2.5 }}
                className="text-yellow-400 mb-2 flex gap-2"
              >
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                >
                  ⠧
                </motion.span>
                AI is parsing test cases from document...
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 4 }}
                className="text-emerald-400 mb-4"
              >
                ✔ AI parsed 8 test case(s) from 1 file(s)
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 4.2 }}
                className="px-4 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg mb-4"
              >
                <div className="text-indigo-400 font-bold mb-2">
                  AI QA Agent CLI v0.1.0
                </div>
                <div className="text-white/60 flex flex-col gap-1">
                  <span>URL: http://localhost:4000</span>
                  <span>Tests: 8 test cases from 1 file(s)</span>
                  <span>Model: gpt-4o-mini</span>
                  <span>Browser: headless</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 4.4 }}
                className="text-white/80 mb-2"
              >
                🚀 Starting test run with 8 test cases...
              </motion.div>

              <div className="flex flex-col gap-1 mb-4">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 5.0 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-emerald-400">▶</span>
                  <span className="text-white">
                    TC-001 — Login with valid credentials
                  </span>
                  <span className="ml-auto text-white/40">8.4s</span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 5.5 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-emerald-400">▶</span>
                  <span className="text-white">
                    TC-002 — Login with invalid password
                  </span>
                  <span className="ml-auto text-white/40">5.2s</span>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 6.0 }}
                className="text-emerald-400"
              >
                ✔ 8 passed | 0 errors
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 6.2 }}
                className="text-cyan-400 mt-2"
              >
                📋 HTML Report: ./.ai-qa/reports/report-abc123.html
              </motion.div>
            </div>
          </motion.div>

          {/* Features List */}
          <div className="md:col-span-5 flex flex-col gap-6">
            {cliFeatures.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-neon-green/30 group-hover:bg-neon-green/10 transition-colors">
                    <feature.icon className="w-5 h-5 text-white/60 group-hover:text-neon-green transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-white/60 mb-2 leading-relaxed">
                      {feature.description}
                    </p>
                    <code className="text-xs font-mono text-neon-green/80 bg-neon-green/10 px-2 py-1 rounded">
                      {feature.command}
                    </code>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
