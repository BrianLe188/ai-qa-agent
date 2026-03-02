"use client";

import { motion } from "motion/react";
import { FileText, Settings, PlayCircle, LayoutDashboard } from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "1. Upload & Parse",
    description:
      "Upload your test document (.md, .txt) or paste test cases directly. The AI Parser extracts structured test cases automatically.",
  },
  {
    icon: Settings,
    title: "2. Review & Configure",
    description:
      "Review extracted test cases, set your target URL, and configure your preferred AI provider (OpenAI, Gemini, Claude).",
  },
  {
    icon: PlayCircle,
    title: "3. Execute & Heal",
    description:
      "Run the test plan. The Cognitive Runner uses the Fast Path for known UIs and the Slow Path to self-heal when the UI changes.",
  },
  {
    icon: LayoutDashboard,
    title: "4. Dashboard & Reports",
    description:
      "View real-time execution logs, track passed/failed steps, and manage your test plans from a unified dashboard.",
  },
];

export default function Workflow() {
  return (
    <section
      id="workflow"
      className="py-32 relative border-t border-white/5 bg-[#0a0a0a]"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
            Web Dashboard Experience
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            A seamless visual workflow from natural language requirements to
            robust, self-healing test execution.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="relative"
            >
              {/* Connector Line */}
              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[25%] w-full h-px bg-gradient-to-r from-white/20 to-transparent" />
              )}

              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 relative z-10">
                <step.icon className="w-8 h-8 text-neon-green" />
              </div>

              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
