"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenTool, Target, Layers, Database, CheckCircle2, Globe, Send } from "lucide-react";
import { addMainsQuestion } from "@/lib/mains-questions";

export default function MainsBankAdmin() {
  const [topic, setTopic] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [modelAnswer, setModelAnswer] = useState("");
  const [language, setLanguage] = useState<"English" | "Hindi">("English");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !questionText.trim() || !modelAnswer.trim()) {
       alert("CRITICAL ERROR: Please populate all absolute inputs natively.");
       return;
    }
    
    setIsSubmitting(true);
    try {
      await addMainsQuestion({ topic, questionText, modelAnswer, language });
      setSuccess(true);
      setTopic("");
      setQuestionText("");
      setModelAnswer("");
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      alert("Submission Collision Array: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 mt-4 font-sans text-slate-100 pb-16">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 pb-6 border-b border-slate-700/50 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-2 px-3 py-1 bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 text-[10px] font-black uppercase tracking-widest rounded-full mb-3 inline-flex shadow-inner">
             <PenTool className="w-3 h-3" /> Core Evaluation Matrix
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Mains Subject Injection</h1>
          <p className="text-slate-400 mt-1 text-sm font-medium leading-relaxed max-w-2xl">Construct advanced descriptive questions mapped exclusively with model answers locally.</p>
        </motion.div>
        
        {/* Language Extraction Map */}
        <div className="bg-slate-900/50 p-1.5 rounded-2xl flex border border-slate-700/50 shadow-inner">
           {(["English", "Hindi"] as const).map(lang => (
              <button 
                 key={lang}
                 onClick={() => setLanguage(lang)}
                 className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${language === lang ? 'bg-fuchsia-500 text-white shadow-[0_0_20px_rgba(217,70,239,0.3)]' : 'text-slate-400 hover:text-slate-100'}`}
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
           <Database className="w-6 h-6 text-fuchsia-400" />
           Single Extraction Injection
         </h2>
         
         <form onSubmit={handleSubmit} className="space-y-6">
            <div>
               <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-fuchsia-400" /> Specific Subject Topic
               </label>
               <input 
                 type="text" 
                 value={topic}
                 onChange={e => setTopic(e.target.value)}
                 className="w-full bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 focus:border-fuchsia-500 rounded-xl px-4 py-3.5 text-slate-100 outline-none transition-all placeholder:text-slate-500"
                 placeholder="e.g. Governance & Polity (GS2), Ethics Array..."
               />
            </div>
            
            <div>
               <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-400" /> Mains Core Question Block
               </label>
               <textarea 
                 value={questionText}
                 onChange={e => setQuestionText(e.target.value)}
                 className="w-full h-32 bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 focus:border-sky-500 rounded-xl px-4 py-3.5 text-slate-100 outline-none transition-all placeholder:text-slate-500 resize-none font-medium leading-relaxed"
                 placeholder="Paste the precise structural examination query safely..."
               />
            </div>

            <div>
               <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Ideal Evaluation Model Answer
               </label>
               <textarea 
                 value={modelAnswer}
                 onChange={e => setModelAnswer(e.target.value)}
                 className="w-full h-64 bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 focus:border-emerald-500 rounded-xl px-4 py-3.5 text-slate-100 outline-none transition-all placeholder:text-slate-500 resize-none font-medium leading-relaxed"
                 placeholder="Construct the precise native grading answer mapping. Students will view this directly beneath their active layout dynamically."
               />
            </div>

            <div className="pt-6 border-t border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-6">
               <AnimatePresence>
                  {success ? (
                     <motion.div initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} exit={{opacity:0}} className="text-emerald-400 font-bold text-sm flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                        <CheckCircle2 className="w-5 h-5" /> Push Synchronized to Mains Servers!
                     </motion.div>
                  ) : <div/>}
               </AnimatePresence>
               <button 
                 type="submit"
                 disabled={isSubmitting}
                 className="w-full sm:w-auto px-8 py-3.5 bg-fuchsia-500 hover:bg-fuchsia-600 active:bg-fuchsia-700 text-white font-black rounded-xl transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
               >
                 <Send className={`w-5 h-5 ${isSubmitting ? 'animate-bounce' : ''}`}/>
                 {isSubmitting ? 'Executing Push...' : `Deploy ${language} Matrix`}
               </button>
            </div>
         </form>
      </motion.div>
    </div>
  );
}
