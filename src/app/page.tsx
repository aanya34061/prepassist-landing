"use client";

import { motion } from "framer-motion";
import { BrainCircuit, PenTool, Globe, ChevronRight, Target, Cloud, Database, Lock, Sparkles, Activity, ShieldCheck, Network, CheckCircle2, Menu, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const currentYear = new Date().getFullYear();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500/20 overflow-x-hidden">
      {/* Absolute Light Mode Mesh Gradients */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-indigo-100/60 via-slate-50 to-slate-50 pointer-events-none"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-rose-100/50 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[10%] right-[-10%] w-[600px] h-[600px] bg-sky-100/50 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Ultra-Premium Navigation */}
      <nav className="fixed w-full z-50 top-0 border-b border-slate-200/60 bg-white/80 backdrop-blur-3xl transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
             <div className="bg-white border border-slate-200 p-1.5 rounded-xl group-hover:bg-slate-50 transition-colors shadow-sm">
               <Image 
                 src="/logo.jpeg" 
                 alt="PrepAssist Logo" 
                 width={130} 
                 height={40} 
                 className="object-contain" 
                 priority
               />
             </div>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold tracking-wide">
            <a href="#platform" className="text-slate-600 hover:text-indigo-600 transition-colors">The Platform</a>
            <a href="#features" className="text-slate-600 hover:text-indigo-600 transition-colors">Capabilities</a>
            <Link href="/pricing" className="text-slate-600 hover:text-indigo-600 transition-colors">Billing</Link>
          </div>
          <div className="flex items-center gap-3">
             <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors hidden sm:block">
               Sign In
             </Link>
             <Link href="/login?mode=register" className="hidden sm:flex px-5 py-2.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 font-bold text-sm transition-all items-center gap-2 shadow-md hover:shadow-lg">
               Register <ChevronRight className="w-4 h-4"/>
             </Link>
             <button aria-label="Toggle Mobile Menu" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
               {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
             </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay Native Binding */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-24 px-6 md:hidden">
            <div className="flex flex-col gap-6 text-xl font-bold tracking-tight text-slate-800">
                <a href="#platform" onClick={() => setIsMobileMenuOpen(false)} className="border-b border-slate-100 pb-4">The Platform</a>
                <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="border-b border-slate-100 pb-4">Capabilities</a>
                <Link href="/pricing" onClick={() => setIsMobileMenuOpen(false)} className="border-b border-slate-100 pb-4">Billing Matrices</Link>
                <div className="flex flex-col gap-4 mt-6">
                    <Link href="/login" className="w-full py-4 text-center rounded-2xl bg-indigo-50 text-indigo-600 font-black" onClick={() => setIsMobileMenuOpen(false)}>Sign In to Workspace</Link>
                    <Link href="/login?mode=register" className="w-full py-4 text-center rounded-2xl bg-slate-900 text-white font-black flex items-center justify-center gap-2 shadow-lg" onClick={() => setIsMobileMenuOpen(false)}>Register Account <ChevronRight className="w-5 h-5"/></Link>
                </div>
            </div>
        </div>
      )}

      <main className="pt-32 pb-24 px-6 max-w-7xl mx-auto relative z-10 flex flex-col items-center">
        
        {/* Spotlight Hero Section */}
        <section className="text-center pt-20 pb-16 md:pt-32 md:pb-24 flex flex-col items-center w-full max-w-5xl">
          <motion.div
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5 }}
             className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700 mb-8 tracking-widest uppercase shadow-sm"
          >
            <Sparkles className="w-3 h-3 text-amber-500" /> PrepAssist V2 is Live
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-[84px] font-black tracking-tighter text-slate-900 mb-8 leading-[1.05]"
          >
            The ultimate AI engine for <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500 pr-2">UPSC preparation.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Synthesize vast syllabuses, automate Mains evaluation, and generate precision cloud notes instantly. Built specifically for rankers.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
          >
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30">
              Deploy Your Workspace <ChevronRight className="w-4 h-4" />
            </Link>
            <Link href="#platform" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white border border-slate-200 text-slate-700 font-bold text-base hover:bg-slate-50 transition-all flex items-center justify-center shadow-sm">
              Explore capabilities
            </Link>
          </motion.div>
        </section>



        {/* Brand Banner */}
        <section className="w-full py-16 border-y border-slate-200 flex flex-col items-center justify-center text-center -mt-10 mb-32 bg-white">
            <p className="text-sm font-black uppercase tracking-widest text-slate-400 mb-8">Trusted by serious UPSC Aspirants & Rankers</p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-60">
               <ShieldCheck className="w-8 h-8 text-slate-400" />
               <Network className="w-8 h-8 text-slate-400" />
               <BrainCircuit className="w-8 h-8 text-slate-400" />
               <Target className="w-8 h-8 text-slate-400" />
               <Database className="w-8 h-8 text-slate-400" />
            </div>
        </section>

        {/* Asymmetrical Bento Grid */}
        <section id="features" className="w-full flex flex-col items-center">
           <div className="text-center mb-16 max-w-3xl">
             <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-6">Engineered for absolute dominance.</h2>
             <p className="text-slate-600 text-lg font-medium leading-relaxed">Stop wasting hours manually creating notes. Let PrepAssist autonomously synthesize your data into structural matrices.</p>
           </div>

           <div className="w-full grid grid-cols-1 md:grid-cols-3 grid-rows-none md:grid-rows-[auto_auto] gap-4 md:gap-6">
              
              {/* Feature 1 - Massive Row Spanner */}
              <div className="md:col-span-2 group relative rounded-[32px] bg-white border border-slate-200 p-8 md:p-12 overflow-hidden hover:border-indigo-300 transition-colors shadow-sm hover:shadow-md">
                 <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50 blur-[100px] rounded-full group-hover:bg-indigo-100 transition-colors"></div>
                 <Database className="w-10 h-10 text-indigo-500 mb-6 relative z-10" />
                 <h3 className="text-3xl font-bold text-slate-900 mb-4 relative z-10">RAG Vector Data Vault</h3>
                 <p className="text-slate-600 font-medium leading-relaxed max-w-md relative z-10">
                    Upload your entire syllabus directly into our Cloud Storage. We utilize Retrieval-Augmented Generation to allow you to literally "speak" to your entire syllabus index securely.
                 </p>
                 {/* Native Visual Pipeline Rendering */}
                 <div className="hidden sm:block absolute bottom-0 right-[-5%] md:right-4 w-72 md:w-[480px] h-48 md:h-64 rounded-t-2xl shadow-2xl translate-y-[20%] group-hover:translate-y-[10%] transition-transform duration-500 overflow-hidden border border-slate-200 bg-white">
                    <Image 
                        src="/rag-pipeline.jpg" 
                        alt="PrepAssist RAG AI Pipeline Architecture diagram" 
                        fill 
                        className="object-contain p-2" 
                    />
                 </div>
              </div>

              {/* Feature 2 - Tall Block */}
              <div className="group relative rounded-[32px] bg-white border border-slate-200 p-8 md:p-10 overflow-hidden hover:border-emerald-300 transition-colors shadow-sm hover:shadow-md">
                 <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <PenTool className="w-10 h-10 text-emerald-500 mb-6 relative z-10" />
                 <h3 className="text-2xl font-bold text-slate-900 mb-4 relative z-10">Mains Evaluation AI</h3>
                 <p className="text-slate-600 font-medium leading-relaxed relative z-10">
                    Capture a raw image of your handwritten essay. Our computer vision LLMs will grade it precisely against the actual UPSC examiner rubrics, returning structural feedback.
                 </p>
                 <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col gap-3 relative z-10">
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> <span className="text-sm font-semibold text-slate-700">Handwriting Optics</span></div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> <span className="text-sm font-semibold text-slate-700">Structural Grading</span></div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> <span className="text-sm font-semibold text-slate-700">Model Answers</span></div>
                 </div>
              </div>

              {/* Feature 3 - Standard Block */}
              <div className="group relative rounded-[32px] bg-white border border-slate-200 p-8 overflow-hidden hover:border-sky-300 transition-colors shadow-sm hover:shadow-md">
                 <Cloud className="w-10 h-10 text-sky-500 mb-6" />
                 <h3 className="text-xl font-bold text-slate-900 mb-3">Cloud Protocol</h3>
                 <p className="text-slate-600 text-sm font-medium leading-relaxed">
                    Every byte you extract or evaluate is instantly synchronized securely to your individual Vault, available across global endpoints.
                 </p>
              </div>

              {/* Feature 4 - Standard Block */}
              <div className="group relative rounded-[32px] bg-white border border-slate-200 p-8 overflow-hidden hover:border-rose-300 transition-colors shadow-sm hover:shadow-md">
                 <Globe className="w-10 h-10 text-rose-500 mb-6" />
                 <h3 className="text-xl font-bold text-slate-900 mb-3">Core Analytics</h3>
                 <p className="text-slate-600 text-sm font-medium leading-relaxed">
                    Track every single milestone, attempt limit, and AI generation metric dynamically through visual Progress Hubs.
                 </p>
              </div>

              {/* Feature 5 - Wide Block */}
              <div className="group relative rounded-[32px] bg-white border border-slate-200 p-8 overflow-hidden hover:border-amber-300 transition-colors shadow-sm hover:shadow-md flex flex-col sm:flex-row items-center gap-6">
                 <div className="flex-1">
                    <Target className="w-10 h-10 text-amber-500 mb-6" />
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">PDF to Quiz Generator</h3>
                    <p className="text-slate-600 text-sm font-medium leading-relaxed max-w-sm">
                       Upload any un-formatted PDF or feed a massive topic to the engine. Watch as it instantly compiles rigorous Prelims matrices.
                    </p>
                 </div>
                 <Link href="/quiz" className="px-6 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold hover:bg-slate-800 transition-colors shadow-md">
                    Generate Quiz
                 </Link>
              </div>

           </div>
        </section>

      </main>

      {/* Massive Conversion Footer */}
      <footer className="w-full relative border-t border-slate-200 bg-slate-50 mt-32 overflow-hidden pt-32 pb-16">
         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-200/40 blur-[150px] rounded-full pointer-events-none"></div>
         <div className="max-w-4xl mx-auto px-6 text-center flex flex-col items-center relative z-10">
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight mb-8">Ready to secure your rank?</h2>
            <p className="text-slate-600 text-lg md:text-xl font-medium mb-12 max-w-2xl">
               Stop preparing manually. Integrate with PrepAssist V2 and radically multiply your daily execution speed.
            </p>
            <div className="flex items-center gap-4">
               <Link href="/login" className="px-8 py-4 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-bold text-lg shadow-lg shadow-indigo-600/30">
                  Start Your Free Trial
               </Link>
               <Link href="/pricing" className="px-8 py-4 rounded-full bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 transition-colors font-bold text-lg shadow-sm">
                  View Pricing Models
               </Link>
            </div>
         </div>
         
         <div className="max-w-7xl mx-auto px-6 mt-32 flex flex-col md:flex-row items-center justify-between border-t border-slate-200 pt-8 text-sm font-semibold text-slate-500">
            <p>© {currentYear} PrepAssist Cloud. All architecture reserved.</p>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
               <span className="hover:text-slate-800 cursor-pointer transition-colors">Privacy Paradigm</span>
               <span className="hover:text-slate-800 cursor-pointer transition-colors">Terms of Service</span>
               <Link href="/admin/login" className="hover:text-indigo-600 transition-colors">Admin Gateway</Link>
            </div>
         </div>
      </footer>
    </div>
  );
}
