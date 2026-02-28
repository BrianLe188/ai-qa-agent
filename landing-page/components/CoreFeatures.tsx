'use client';

import { motion } from 'motion/react';
import { Zap, BrainCircuit, Database, Eye } from 'lucide-react';

const features = [
  {
    title: 'Fast Path (Reflex)',
    description: 'Instant execution speed for known UIs.',
    technical: 'SQLite query with <5ms latency.',
    icon: Zap,
    color: 'text-neon-green',
    bg: 'bg-neon-green/10',
    border: 'border-neon-green/20'
  },
  {
    title: 'Slow Path (Intelligence)',
    description: 'Completely eliminates manual test maintenance.',
    technical: 'Self-healing using GPT-4o when UI changes.',
    icon: BrainCircuit,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20'
  },
  {
    title: 'Semantic Memory',
    description: 'No need to write exact words, just the right intent.',
    technical: 'Uses ChromaDB to understand similar commands.',
    icon: Database,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20'
  },
  {
    title: 'Visual Verification',
    description: 'Validates what HTML code cannot express.',
    technical: 'Checks graphics, charts, and layouts using Vision LLM.',
    icon: Eye,
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/20'
  }
];

export default function CoreFeatures() {
  return (
    <section className="py-32 relative border-t border-white/5 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
            Dual Memory Architecture
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Our core features are built on a revolutionary architecture that combines lightning-fast reflexes with deep AI intelligence.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={`p-8 rounded-3xl border ${feature.border} bg-[#050505] relative overflow-hidden group hover:border-white/20 transition-colors`}
            >
              <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-6`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
              <p className="text-white/70 mb-6">{feature.description}</p>
              
              <div className="mt-auto pt-6 border-t border-white/5">
                <div className="text-sm font-mono text-white/40 mb-1">Technical Detail</div>
                <div className={`text-sm ${feature.color}`}>{feature.technical}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
