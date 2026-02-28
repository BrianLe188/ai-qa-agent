import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import ProblemSolution from '@/components/ProblemSolution';
import Workflow from '@/components/Workflow';
import CoreFeatures from '@/components/CoreFeatures';
import TechnicalExcellence from '@/components/TechnicalExcellence';
import Author from '@/components/Author';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-violet-500/30">
      <Navbar />
      <Hero />
      <ProblemSolution />
      <Workflow />
      <CoreFeatures />
      <TechnicalExcellence />
      <Author />
      <Footer />
    </main>
  );
}
