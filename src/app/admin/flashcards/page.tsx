"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenTool, Target, Layers, Database, CheckCircle2, Globe, Send, RefreshCcw } from "lucide-react";
import { addFlashcard } from "@/lib/flashcards";

export default function FlashcardsAdmin() {
  const [topic, setTopic] = useState("");
  const [frontText, setFrontText] = useState("");
  const [backText, setBackText] = useState("");
  const [language, setLanguage] = useState<"English" | "Hindi">("English");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !frontText.trim() || !backText.trim()) {
       alert("CRITICAL ERROR: Please populate all native faces.");
       return;
    }
    
    setIsSubmitting(true);
    try {
      await addFlashcard({ topic, frontText, backText, language });
      setSuccess(true);
      setTopic("");
      setFrontText("");
      setBackText("");
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      alert("Submission Collision Vector: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 mt-4 font-sans text-slate-100 pb-16">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 pb-6 border-b border-slate-700/50 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full mb-3 inline-flex shadow-inner">
             <RefreshCcw className="w-3 h-3" /> Core Memory Sequence
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Flash Card Hub</h1>
          <p className="text-slate-400 mt-1 text-sm font-medium leading-relaxed max-w-2xl">Engineer highly interactive 3D Flash Cards mapping complex definitions natively into student Dashboards.</p>
        </motion.div>
        
        {/* Language Extraction Map */}
        <div className="bg-slate-900/50 p-1.5 rounded-2xl flex border border-slate-700/50 shadow-inner">
           {(["English", "Hindi"] as const).map(lang => (
              <button 
                 key={lang}
                 onClick={() => setLanguage(lang)}
                 className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${language === lang ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'text-slate-400 hover:text-slate-100'}`}
              >
                 <Globe className="w-4 h-4"/> {lang} Nodes
              </button>
           ))}
        </div>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
        className="bg-[#0f172a]/60 backdrop-blur-xl p-8 rounded-3xl border border-slate-800 relative z-10 shadow-2xl"
      >
         <h2 className="text-xl font-black text-slate-100 flex items-center gap-3 mb-8 pb-4 border-b border-slate-700/50">
           <Database className="w-6 h-6 text-emerald-400" />
           Knowledge Component Uplink
         </h2>
         
         <form onSubmit={handleSubmit} className="space-y-6">
            <div>
               <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-400" /> Categorical Tag
               </label>
               <input 
                 type="text" 
                 value={topic}
                 onChange={e => setTopic(e.target.value)}
                 className="w-full bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 focus:border-emerald-500 rounded-xl px-4 py-3.5 text-slate-100 outline-none transition-all placeholder:text-slate-500"
                 placeholder="e.g. History, Economics, Art & Culture..."
               />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                     <Layers className="w-4 h-4 text-sky-400" /> Front Face (Concept)
                  </label>
                  <textarea 
                    value={frontText}
                    onChange={e => setFrontText(e.target.value)}
                    className="w-full h-40 bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 focus:border-sky-500 rounded-xl px-4 py-3.5 text-slate-100 outline-none transition-all placeholder:text-slate-500 resize-none font-medium leading-relaxed"
                    placeholder="Short query or term (e.g. What is the fundamental difference between Repo and Reverse Repo?)"
                  />
               </div>

               <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                     <CheckCircle2 className="w-4 h-4 text-fuchsia-400" /> Back Face (Definition)
                  </label>
                  <textarea 
                    value={backText}
                    onChange={e => setBackText(e.target.value)}
                    className="w-full h-40 bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 focus:border-fuchsia-500 rounded-xl px-4 py-3.5 text-slate-100 outline-none transition-all placeholder:text-slate-500 resize-none font-medium leading-relaxed"
                    placeholder="Complete answer natively mapped internally. This explicitly reveals upon 3D spin..."
                  />
               </div>
            </div>

            <div className="pt-6 border-t border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-6">
               <AnimatePresence>
                  {success ? (
                     <motion.div initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} exit={{opacity:0}} className="text-emerald-400 font-bold text-sm flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                        <CheckCircle2 className="w-5 h-5" /> Push Synced! Card active globally.
                     </motion.div>
                  ) : <div/>}
               </AnimatePresence>
               <button 
                 type="submit"
                 disabled={isSubmitting}
                 className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-black rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
               >
                 <Send className={`w-5 h-5 ${isSubmitting ? 'animate-bounce' : ''}`}/>
                 {isSubmitting ? 'Executing Upload...' : `Inject ${language} Card`}
               </button>
            </div>
         </form>
      </motion.div>
    </div>
  );
}
