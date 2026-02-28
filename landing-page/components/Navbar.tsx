'use client';

import { motion } from 'motion/react';
import { Terminal, Github, BookOpen } from 'lucide-react';

export default function Navbar() {
  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 glass-nav"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-6 h-6 text-neon-green" />
          <span className="font-display font-bold text-xl tracking-tight">
            AI QA Agent
          </span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#workflow" className="hover:text-white transition-colors">How it Works</a>
          <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
        </div>

        <div className="flex items-center gap-4">
          <a href="https://github.com/BrianLe188/ai-qa-agent" target="_blank" rel="noreferrer" className="text-sm font-medium text-white/70 hover:text-white transition-colors flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Docs
          </a>
          <a href="https://github.com/BrianLe188/ai-qa-agent" target="_blank" rel="noreferrer" className="glow-button px-4 py-2 text-sm flex items-center gap-2">
            <Github className="w-4 h-4" />
            Star on GitHub
          </a>
        </div>
      </div>
    </motion.nav>
  );
}
