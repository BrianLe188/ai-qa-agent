'use client';

import { motion } from 'motion/react';
import { Terminal, Shield, Lock } from 'lucide-react';

const specs = [
  {
    title: 'Bun 1.1+ Native',
    description: 'Leverages the maximum speed of the most modern TypeScript runtime.',
    icon: Terminal
  },
  {
    title: 'Strict Isolation',
    description: 'Memory is isolated by testPlanId, ensuring no data overlap between projects.',
    icon: Shield
  },
  {
    title: 'Privacy First',
    description: 'Option to use Local Embedding (all-MiniLM-L6-v2) to ensure absolute data privacy.',
    icon: Lock
  }
];

export default function TechnicalExcellence() {
  return (
    <section className="py-32 relative border-t border-white/5 bg-[#050505]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
            Technical Excellence
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Built for performance, security, and privacy from the ground up.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {specs.map((spec, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                <spec.icon className="w-8 h-8 text-white/80" />
              </div>
              <h3 className="text-xl font-bold mb-4">{spec.title}</h3>
              <p className="text-white/60 leading-relaxed">{spec.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
