'use client';

import { motion } from 'motion/react';
import { AlertOctagon, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ProblemSolution() {
  return (
    <section className="py-32 relative border-t border-white/5 bg-[#050505]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Problem */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-3xl bg-red-500/5 border border-red-500/20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <AlertOctagon className="w-32 h-32 text-red-500" />
            </div>
            <h3 className="text-2xl font-display font-bold text-red-400 mb-4 flex items-center gap-3">
              <AlertOctagon className="w-6 h-6" />
              The Problem
            </h3>
            <p className="text-white/70 text-lg leading-relaxed mb-6">
              Traditional E2E tests are incredibly brittle. Change a single class or ID, and the entire test suite collapses.
            </p>
            <div className="font-mono text-sm bg-black/50 p-4 rounded-xl border border-red-500/20 text-red-300">
              <div className="opacity-50 line-through">await page.click(&apos;#submit-btn-v2&apos;);</div>
              <div className="mt-2 text-red-400">Error: locator resolved to hidden element</div>
            </div>
          </motion.div>

          {/* Solution */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="p-8 rounded-3xl bg-neon-green/5 border border-neon-green/20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <CheckCircle2 className="w-32 h-32 text-neon-green" />
            </div>
            <h3 className="text-2xl font-display font-bold text-neon-green mb-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6" />
              The Solution
            </h3>
            <p className="text-white/70 text-lg leading-relaxed mb-6">
              <strong>Cognitive Test Runner.</strong> Instead of hardcoding, our Agent understands your intent and dynamically finds elements based on semantics.
            </p>
            <div className="font-mono text-sm bg-black/50 p-4 rounded-xl border border-neon-green/20 text-neon-green">
              <div>await agent.act(&apos;Click the Sign Up button&apos;);</div>
              <div className="mt-2 text-neon-green/70 flex items-center gap-2">
                <ArrowRight className="w-4 h-4" /> Found element by semantic meaning
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
