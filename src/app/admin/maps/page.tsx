"use client";

import { motion } from "framer-motion";
import { Network, Database } from "lucide-react";

export default function CurriculumMaps() {
  return (
    <div className="space-y-8 mt-4 font-sans text-slate-100">
      <header className="flex justify-between items-center mb-10 pb-6 border-b border-slate-700/50">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
           <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest mb-4">
              <Database className="w-4 h-4" /> Global Taxonomy Framework
           </div>
           <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-4">
              <Network className="w-10 h-10 text-purple-400" />
              Curriculum Maps
           </h1>
           <p className="text-slate-400 mt-2 text-sm font-medium leading-relaxed max-w-2xl">
              Construct logical relationship models linking static syllabus domains directly to interconnected topics natively via AI.
           </p>
        </motion.div>
      </header>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="glass p-8 rounded-3xl border border-white/5 relative overflow-hidden bg-[#0a0f1c]/80 flex flex-col items-center justify-center min-h-[400px] text-center"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-full mb-6 z-10 shadow-2xl relative">
            <Network className="w-10 h-10 text-slate-400 opacity-50" />
            <div className="absolute top-0 right-0 w-3 h-3 bg-amber-400 rounded-full animate-ping"></div>
        </div>
        
        <h2 className="text-2xl font-black text-white tracking-tight z-10 relative mb-3">Map Visualization Offline</h2>
        <p className="text-slate-400 font-medium z-10 relative max-w-md mx-auto text-sm">
           The semantic visualization core for Curriculum Maps is currently undergoing structural maintenance. Full interactive UI will be deployed shortly.
        </p>
      </motion.div>
    </div>
  );
}
