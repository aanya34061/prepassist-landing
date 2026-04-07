"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchQuestions, Question } from "@/lib/questions";
import { formatUPSC } from "@/lib/formatUPSC";
import { Loader2, ListChecks, ChevronRight, ChevronLeft, CheckCircle2, XCircle, FileText, BrainCircuit, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchUserProfile } from "@/lib/credits";
import Link from "next/link";

export default function UserQuestionBank() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  const [userId, setUserId] = useState<string>("");
  const [userTier, setUserTier] = useState<string>("free");
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);
  const [activeLanguage, setActiveLanguage] = useState<"English" | "Hindi">("English");

  useEffect(() => {
    loadLibrary(activeLanguage);
    initializeUser();
  }, [activeLanguage]);

  const initializeUser = async () => {
     const { data: { user } } = await supabase.auth.getUser();
     if (user) {
        setUserId(user.id);
        try {
           const profile = await fetchUserProfile(user.id);
           setUserTier(profile.tier || 'free');

           if (profile.tier === 'free') {
              const dateKey = new Date().toISOString().split('T')[0];
              const localKey = `qbank_attempts_${dateKey}_${user.id}`;
              const count = parseInt(localStorage.getItem(localKey) || '0');
              setAttemptCount(count);
              if (count >= 20) {
                 setIsLockedOut(true);
              }
           }
        } catch(e) {}
     }
  };

  const loadLibrary = async (lang: string) => {
    setIsLoading(true);
    const data = await fetchQuestions(100, lang); 
    setQuestions(data);
    setIsLoading(false);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsRevealed(false);
  };

  const handleSelect = (option: string) => {
     if (isRevealed) return;
     setSelectedOption(option);
  };

  const handleReveal = () => {
     if (!selectedOption) return;

     if (userTier === 'free') {
        const dateKey = new Date().toISOString().split('T')[0];
        const localKey = `qbank_attempts_${dateKey}_${userId}`;
        const currentCount = parseInt(localStorage.getItem(localKey) || '0');
        
        if (currentCount >= 20) {
           setIsLockedOut(true);
           return;
        } else {
           localStorage.setItem(localKey, (currentCount + 1).toString());
           setAttemptCount(currentCount + 1);
        }
     }

     setIsRevealed(true);
  };

  const handleNext = () => {
     if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
        setIsRevealed(false);
     }
  };

  if (isLoading) {
     return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center text-indigo-500 bg-white">
           <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 rounded-full"></div>
              <Loader2 className="w-16 h-16 animate-spin relative z-10" />
           </div>
           <p className="mt-8 font-black uppercase tracking-widest text-indigo-400">Synchronizing Question Bank...</p>
        </div>
     );
  }

  const currentQ = questions.length > 0 ? questions[currentIndex] : null;
  const isCorrect = currentQ ? selectedOption === currentQ.correctAnswer : false;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-12 relative z-10 selection:bg-indigo-500/20">
       
       <div className="max-w-4xl mx-auto">
         {/* UI Header */}
         <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
           <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}}>
             <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
                <BrainCircuit className="w-4 h-4" /> Adaptive Quiz Engine
             </div>
             <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
               Global Question <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-sky-500">Bank.</span>
             </h1>
             <p className="text-slate-500 mt-2 text-base font-medium leading-relaxed max-w-xl">
               Sharpen your analytical execution against manually verified array datasets compiled strictly by PrepAssist Administrations.
             </p>
           </motion.div>

           <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay: 0.1}} className="flex bg-white border border-slate-200 rounded-2xl p-1 shrink-0 shadow-sm backdrop-blur-xl h-12">
              <button onClick={() => setActiveLanguage("English")} className={`px-5 py-1.5 rounded-xl text-sm font-black transition-all ${activeLanguage === 'English' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-700'}`}>
                 ENG Mode
              </button>
              <button onClick={() => setActiveLanguage("Hindi")} className={`px-5 py-1.5 rounded-xl text-sm font-black transition-all ${activeLanguage === 'Hindi' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-700'}`}>
                 HIN Mode
              </button>
           </motion.div>
         </header>

         {questions.length === 0 ? (
            <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center bg-white border border-slate-200 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
               <div className="w-24 h-24 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mb-6">
                  <ListChecks className="w-10 h-10 text-slate-300" />
               </div>
               <h2 className="text-3xl font-black text-slate-400 mb-4">Repository Empty</h2>
               <p className="text-slate-500 font-medium max-w-sm border-b pb-6 border-slate-200">No active nodes have been permanently injected into the global {activeLanguage} arrays by administrators yet.</p>
               <button onClick={() => setActiveLanguage(activeLanguage === "English" ? "Hindi" : "English")} className="mt-8 px-8 py-3 bg-indigo-50 text-indigo-500 font-bold rounded-xl border border-indigo-100 hover:bg-indigo-500 hover:text-white transition-colors">Switch back to {activeLanguage === "English" ? "Hindi" : "English"}</button>
            </div>
         ) : (
           <>
             {/* Progress Tracker */}
             <div className="mb-8 flex items-center justify-between">
                <div className="flex flex-col">
                   <span className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Completion Array</span>
                   <span className="text-2xl font-black text-slate-900">{currentIndex + 1} <span className="text-slate-300 text-lg">/ {questions.length}</span></span>
                </div>
                
                <div className="flex items-center gap-1.5">
                   {questions.map((_, i) => (
                     <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentIndex ? 'w-8 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : i < currentIndex ? 'w-3 bg-slate-300' : 'w-3 bg-slate-200'}`} />
                   ))}
                </div>
             </div>

             {/* The Active Question Terminal */}
             <AnimatePresence mode="wait">
            {isLockedOut ? (
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="bg-white border-2 border-rose-200 rounded-3xl p-10 md:p-16 shadow-[0_30px_60px_rgba(225,29,72,0.1)] text-center relative overflow-hidden"
               >
                 <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-rose-500 to-orange-400 left-0"></div>
                 <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-rose-100">
                    <Lock className="w-10 h-10 text-rose-500" />
                 </div>
                 <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">Recharge Limit Exhausted.</h2>
                 <p className="text-slate-500 font-medium text-lg max-w-xl mx-auto leading-relaxed mb-8">
                    Your UPSC Basic Tier is strictly capped at <span className="text-rose-500 font-bold">20 Free Question Attempts</span> per day to protect engine stabilization. You have completely exhausted your daily execution allowance.
                 </p>
                 <Link href="/pricing" className="inline-flex py-4 px-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-xl shadow-[0_0_25px_rgba(79,70,229,0.3)] transition-all items-center gap-3">
                    <BrainCircuit className="w-5 h-5"/> Upgrade to Pro (Unlimited)
                 </Link>
               </motion.div>
            ) : currentQ ? (
             <motion.div 
               key={currentQ.id}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               transition={{ duration: 0.3 }}
               className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)]"
             >
              <h2 className="text-lg md:text-xl font-bold leading-relaxed text-slate-900 mb-6 whitespace-pre-wrap">
                 {formatUPSC(currentQ?.question || "")}
              </h2>

              <div className="space-y-3 mb-6">
                 {[
                   { id: 'A', text: currentQ?.optionA || "" },
                   { id: 'B', text: currentQ?.optionB || "" },
                   { id: 'C', text: currentQ?.optionC || "" },
                   { id: 'D', text: currentQ?.optionD || "" },
                 ].map((opt) => {
                   const isSelected = selectedOption === opt.id;
                   const isActuallyCorrect = currentQ?.correctAnswer === opt.id;
                   
                   let styleClass = "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-600";
                   
                   if (isRevealed) {
                      if (isActuallyCorrect) styleClass = "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-[0_0_20px_rgba(16,185,129,0.1)]";
                      else if (isSelected && !isActuallyCorrect) styleClass = "border-rose-300 bg-rose-50 text-rose-600";
                      else styleClass = "border-slate-100 bg-white text-slate-300 opacity-60";
                   } else if (isSelected) {
                      styleClass = "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-[0_0_20px_rgba(99,102,241,0.1)]";
                   }

                   return (
                     <button 
                       key={opt.id}
                       onClick={() => handleSelect(opt.id)}
                       disabled={isRevealed}
                       className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-300 flex items-start gap-4 group ${styleClass}`}
                     >
                       <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-black transition-colors ${isRevealed && isActuallyCorrect ? 'bg-emerald-500 text-white' : isRevealed && isSelected && !isActuallyCorrect ? 'bg-rose-500 text-white' : isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500 group-hover:bg-slate-300 group-hover:text-slate-700'}`}>
                          {opt.id}
                       </div>
                       <span className={`font-semibold text-base leading-snug mt-0.5 ${isRevealed && isActuallyCorrect ? 'text-emerald-800' : isRevealed && isSelected ? 'text-rose-700' : isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{opt.text}</span>
                       
                       {isRevealed && isActuallyCorrect && <CheckCircle2 className="w-6 h-6 ml-auto text-emerald-500" />}
                       {isRevealed && isSelected && !isActuallyCorrect && <XCircle className="w-6 h-6 ml-auto text-rose-500" />}
                     </button>
                   );
                 })}
              </div>

              {/* Verification / Progress Controls */}
              {!isRevealed ? (
                 <button 
                   onClick={handleReveal}
                   disabled={!selectedOption}
                   className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-black text-lg text-white transition-all disabled:opacity-30 disabled:hover:bg-indigo-600 shadow-lg shadow-indigo-500/20"
                 >
                    Lock Answer & Verify
                 </button>
              ) : (
                 <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} className="overflow-hidden">
                    <div className={`p-6 rounded-2xl mb-6 border ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                       <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${isCorrect ? 'text-emerald-500' : 'text-rose-500'}`}>
                          <FileText className="w-4 h-4"/> Institutional Explanation
                       </h3>
                       <p className="font-semibold text-sm leading-relaxed whitespace-pre-wrap opacity-90">
                          {currentQ?.explanation || ""}
                       </p>
                    </div>
                    
                    <button 
                      onClick={handleNext}
                      className="w-full py-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-black text-lg transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
                    >
                       {currentIndex < questions.length - 1 ? (
                          <>Load Next Target <ChevronRight className="w-6 h-6"/></>
                       ) : (
                          <>Terminal Sequence Complete <CheckCircle2 className="w-6 h-6"/></>
                       )}
                    </button>
                 </motion.div>
               )}
             </motion.div>
            ) : null}
          </AnimatePresence>
          </>
         )}
       </div>
    </div>
  );
}
