'use client';

import { motion } from 'motion/react';
import { Github, Linkedin, Globe, MapPin, Code2, Rocket } from 'lucide-react';
import Image from 'next/image';

export default function Author() {
  return (
    <section id="author" className="py-32 relative border-t border-white/5 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
            Meet the Author
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            The mind behind AI QA Agent. Passionate about building impactful, scalable digital products.
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto bg-[#050505] border border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden"
        >
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-neon-green/10 blur-[100px] rounded-full pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 blur-[100px] rounded-full pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center md:items-start">
            {/* Avatar */}
            <div className="relative w-40 h-40 flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-green to-violet-500 rounded-full opacity-20 blur-md"></div>
              <Image 
                src="https://avatars.githubusercontent.com/BrianLe188"
                alt="Lê Việt Anh"
                fill
                className="rounded-full object-cover z-20 border-2 border-white/10"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                <h3 className="text-3xl font-display font-bold">Lê Việt Anh</h3>
                <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-mono text-white/80 border border-white/10">
                  @BrianLe188
                </span>
              </div>

              <div className="flex items-center justify-center md:justify-start gap-2 text-white/60 mb-6 text-sm">
                <MapPin className="w-4 h-4" />
                Da Nang, Vietnam
              </div>

              <p className="text-white/70 leading-relaxed mb-4">
                🚀 <strong className="text-white">Full-Stack Developer | Aspiring Product Founder</strong>
              </p>
              <p className="text-white/60 leading-relaxed mb-8">
                My expertise spans robust backend systems and intuitive, high-performance frontend experiences — with a strong drive to turn innovative ideas into production-ready solutions.
              </p>

              {/* Links */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <a 
                  href="https://github.com/BrianLe188" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-medium"
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </a>
                <a 
                  href="https://www.linkedin.com/in/viet-anh-le-033b29227/" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-medium"
                >
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </a>
                <a 
                  href="https://portfolio-vietanhle.vercel.app/" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-medium"
                >
                  <Globe className="w-4 h-4" />
                  Portfolio
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
