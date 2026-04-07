"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchMainsQuestions, MainsQuestion } from "@/lib/mains-questions";
import { FileText, Loader2, Target, Globe, ChevronDown, CheckCircle2, Search, PenTool, ArrowRight, RotateCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MainsBankUser() {
  const [questions, setQuestions] = useState<MainsQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<"English" | "Hindi">("English");
  
  // Continuous Extractor Logic
  const [pageIndex, setPageIndex] = useState(0);
  const questionsPerPage = 3;

  // Accordion Native Tracker
  const [openAnswerId, setOpenAnswerId] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setOpenAnswerId(null);
    setPageIndex(0); // Reset pagination naturally on language swap
    fetchMainsQuestions(language).then((data) => {
      if (mounted) {
        setQuestions(data);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [language]);

  const visibleQuestions = questions.slice(pageIndex * questionsPerPage, (pageIndex + 1) * questionsPerPage);

  const handleNextCycle = () => {
     setOpenAnswerId(null);
     // Loop recursively explicitly targeting infinite UI retention
     if ((pageIndex + 1) * questionsPerPage >= questions.length) {
         setPageIndex(0);
     } else {
         setPageIndex(prev => prev + 1);
     }
     window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleAnswer = (id: string) => {
     if (openAnswerId === id) setOpenAnswerId(null);
     else setOpenAnswerId(id);
  };

  const handleEvaluate = (questionId: string) => {
     // Natively route to the specialized engine passing ONLY the ID pointer
     router.push(`/evaluate?mains_id=${questionId}`);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-fuchsia-500/30">
      <div className="max-w-6xl mx-auto p-6 md:p-12 relative z-10">
        
        {/* Main Header */}
        <header className="mb-12">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 text-xs font-black uppercase tracking-widest mb-4 shadow-sm">
                 <PenTool className="w-4 h-4" /> Global Execution Arrays
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">Mains Answer Bank</h1>
              <p className="text-white/40 text-lg font-medium max-w-xl">Study historically accurate descriptive model answers or execute your own structural evaluations instantly against the core AI engine.</p>
            </div>
            
            {/* Language Extractor */}
            <div className="bg-white/5 p-1.5 rounded-2xl flex border border-white/10 shadow-inner w-full md:w-auto">
               {(["English", "Hindi"] as const).map(lang => (
                  <button 
                     key={lang}
                     onClick={() => setLanguage(lang)}
                     className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${language === lang ? 'bg-fuchsia-500 text-white shadow-[0_0_20px_rgba(217,70,239,0.3)]' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
                  >
                     <Globe className="w-4 h-4"/> {lang} Nodes
                  </button>
               ))}
            </div>
          </motion.div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-50">
             <Loader2 className="w-10 h-10 animate-spin text-fuchsia-400 mb-4" />
             <p className="font-bold tracking-widest uppercase text-xs text-fuchsia-400">Extracting Mains Node Vectors...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="glass flex flex-col items-center justify-center py-32 rounded-[2rem] border border-white/5 text-center px-4">
             <Search className="w-16 h-16 text-white/20 mb-6" />
             <h3 className="text-2xl font-black text-white/50 mb-2">No nodes found in {language}</h3>
             <p className="text-white/30 text-sm font-medium">The Global DB arrays are empty for this specific Language segment. Please notify Central Administrators.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence mode="wait">
             <motion.div 
               key={pageIndex}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               transition={{ duration: 0.3 }}
               className="space-y-6"
             >
            {visibleQuestions.map((q, index) => (
              <motion.div 
                key={q.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden"
              >
                 <div className="p-8">
                    {/* Header: Topic & Tags */}
                    <div className="flex items-center gap-3 mb-6">
                       <span className="px-3 py-1 bg-white/5 text-white/50 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-md">
                          Database ID: {q.id?.slice(0,6)}
                       </span>
                       <span className="px-3 py-1 bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 text-[10px] font-black uppercase tracking-widest rounded-md flex items-center gap-1.5">
                          <Target className="w-3 h-3" /> {q.topic}
                       </span>
                    </div>
                    
                    {/* The Core Question String */}
                    <h2 className="text-xl md:text-2xl font-bold text-white/90 leading-relaxed max-w-4xl font-serif">
                       Q. {q.questionText}
                    </h2>

                    {/* Interactive Action Clusters */}
                    <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                       <button 
                         onClick={() => toggleAnswer(q.id!)}
                         className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-black flex items-center justify-center gap-3 transition-colors text-white/80"
                       >
                         {openAnswerId === q.id ? "Hide Model Framework" : "Reveal Model Answer"}
                         <ChevronDown className={`w-5 h-5 transition-transform ${openAnswerId === q.id ? 'rotate-180' : ''}`} />
                       </button>

                       <button 
                         onClick={() => handleEvaluate(q.id!)}
                         className="flex-1 py-4 bg-fuchsia-600 hover:bg-fuchsia-500 active:bg-fuchsia-700 text-white rounded-xl font-black flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] group"
                       >
                         Write Answer via Evaluation Engine
                         <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                       </button>
                    </div>
                 </div>

                 {/* Dropdown Answer Matrix */}
                 <AnimatePresence>
                    {openAnswerId === q.id && (
                       <motion.div 
                         initial={{ height: 0, opacity: 0 }}
                         animate={{ height: "auto", opacity: 1 }}
                         exit={{ height: 0, opacity: 0 }}
                         transition={{ duration: 0.3 }}
                         className="border-t border-fuchsia-500/20 bg-fuchsia-500/5 relative overflow-hidden text-fuchsia-50/90 font-medium leading-relaxed"
                       >
                          <div className="absolute top-0 left-0 w-1 h-full bg-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,1)]" />
                          <div className="p-8 md:p-10 text-base md:text-lg whitespace-pre-wrap">
                             {q.modelAnswer}
                          </div>
                          <div className="px-8 py-4 bg-black/40 border-t border-fuchsia-500/10 flex items-center gap-2 text-[10px] text-fuchsia-400 font-black uppercase tracking-widest">
                             <CheckCircle2 className="w-4 h-4" /> Strictly curated Centralized Model Tracker. Do not perfectly copy dynamically.
                          </div>
                       </motion.div>
                    )}
                 </AnimatePresence>
              </motion.div>
            ))}
             </motion.div>
            </AnimatePresence>
            
            {/* Infinite Cycle Loader Target */}
            {questions.length > questionsPerPage && (
               <div className="mt-12 flex justify-center pb-8 border-t border-white/10 pt-8">
                  <button 
                     onClick={handleNextCycle}
                     className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-sm rounded-2xl flex items-center gap-3 transition-colors border border-white/20 shadow-lg group hover:shadow-white/5"
                  >
                     <RotateCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" /> Cycle Next Nodes
                  </button>
               </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
