"use client";

import { motion } from "motion/react";
import { Play, Terminal, Activity, Github, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";

export default function Hero() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const initialLogs = [
      "[SYSTEM] Initializing Neural Network...",
      "[AGENT] Connecting to DOM tree...",
      "[WS] WebSocket connection established.",
      "[TEST] Running suite: Checkout Flow",
    ];

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < initialLogs.length) {
        setLogs((prev) => [...prev, initialLogs[currentIndex]]);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      {/* Abstract 3D Neural Network / Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-deep-violet/20 rounded-full blur-[120px] opacity-50 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
            <Activity className="w-4 h-4 text-neon-green" />
            <span className="text-xs font-mono text-white/80 uppercase tracking-wider">
              v0.1.0 Beta Live
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-display font-bold leading-[1.1] tracking-tight mb-6">
            The Death of <br />
            <span className="text-gradient-violet">Broken Tests.</span>
          </h1>

          <p className="text-lg md:text-xl text-white/60 mb-8 max-w-xl leading-relaxed">
            Write tests in natural language, run at Bun&apos;s native speed, and
            let AI automatically update Selectors when the UI changes.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <a
              href="https://github.com/BrianLe188/ai-qa-agent"
              target="_blank"
              rel="noreferrer"
              className="glow-button-green px-8 py-4 flex items-center gap-2 text-lg"
            >
              <Github className="w-5 h-5" />
              View on GitHub
            </a>
            <a
              href="https://github.com/BrianLe188/ai-qa-agent"
              target="_blank"
              rel="noreferrer"
              className="px-8 py-4 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-lg font-medium flex items-center gap-2"
            >
              <BookOpen className="w-5 h-5" />
              Read Documentation
            </a>
          </div>
        </motion.div>

        {/* Live Terminal Visual */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-deep-violet to-fuchsia-600 rounded-2xl blur opacity-20"></div>
          <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center px-4 py-3 border-b border-white/10 bg-white/5">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              </div>
              <div className="mx-auto flex items-center gap-2 text-xs font-mono text-white/40">
                <Terminal className="w-3 h-3" />
                Live Terminal
              </div>
            </div>
            <div className="p-6 font-mono text-sm h-[300px] overflow-y-auto flex flex-col gap-2">
              {logs.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`${log?.includes("[SYSTEM]") ? "text-violet-400" : log?.includes("[AGENT]") ? "text-blue-400" : log?.includes("[TEST]") ? "text-neon-green" : "text-white/70"}`}
                >
                  {log}
                </motion.div>
              ))}
              <motion.div
                animate={{ opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="w-2 h-4 bg-white/50 inline-block mt-1"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
