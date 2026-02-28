import { Terminal, Github } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#050505] py-12">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-neon-green" />
          <span className="font-display font-bold tracking-tight">
            AI QA Agent
          </span>
        </div>
        
        <div className="flex items-center gap-6 text-sm text-white/50">
          <a href="https://github.com/BrianLe188/ai-qa-agent" target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
            <Github className="w-4 h-4" />
            GitHub Repository
          </a>
          <a href="https://github.com/BrianLe188/ai-qa-agent/blob/main/LICENSE" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
            MIT License
          </a>
        </div>
        
        <div className="text-sm text-white/40">
          An open-source project.
        </div>
      </div>
    </footer>
  );
}
