"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Target, BrainCircuit, XCircle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { fetchUserProgress, QuizResult } from "@/lib/quiz";
import Link from "next/link";

export default function CumulativeProgressDashboard() {
  const [history, setHistory] = useState<QuizResult[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("All Sources");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    setIsLoading(true);
    const data = await fetchUserProgress("guest_user");
    setHistory(data);
    setIsLoading(false);
  };

  if (isLoading) {
     return (
        <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-white">
           <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-4" />
           <p className="font-bold tracking-widest uppercase text-xs text-white/50">Computing Historical Metrics...</p>
        </div>
     );
  }

  // Derive Filtered Analytics
  const filteredHistory = activeFilter === "All Sources" ? history : history.filter(h => h.source === activeFilter);
  
  const totalTests = filteredHistory.length;
  const totalQuestions = filteredHistory.reduce((sum, r) => sum + r.totalQuestions, 0);
  const totalCorrect = filteredHistory.reduce((sum, r) => sum + r.correctAnswers, 0);
  const totalWrong = filteredHistory.reduce((sum, r) => sum + r.wrongAnswers, 0);
  const cumulativeAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  // Aggregate Subject Telemetry exactly sequentially
  const globalSubjects: Record<string, { attempted: number; correct: number; wrong: number }> = {};
  filteredHistory.forEach(r => {
      if (r.subjectAnalytics) {
          Object.entries(r.subjectAnalytics).forEach(([sub, stats]) => {
              if (sub === "Unknown") return; // Skip tracking unidentified edge limits
              if (!globalSubjects[sub]) globalSubjects[sub] = { attempted: 0, correct: 0, wrong: 0 };
              globalSubjects[sub].attempted += stats.attempted;
              globalSubjects[sub].correct += stats.correct;
              globalSubjects[sub].wrong += stats.wrong;
          });
      }
  });

  const subjectArray = Object.entries(globalSubjects).sort((a,b) => b[1].attempted - a[1].attempted);

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden selection:bg-indigo-500/30 p-6 md:p-12">
      {/* Structural Glows */}
      <div className="fixed top-0 left-1/4 w-[800px] h-[800px] bg-green-500/5 rounded-full blur-[120px] pointer-events-none mix-blend-screen opacity-50"></div>
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-[100px] pointer-events-none mix-blend-screen opacity-50"></div>

      <div className="max-w-6xl mx-auto relative z-10">
         
         <Link href="/quiz" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-12 font-bold text-sm uppercase tracking-widest">
            <ArrowLeft className="w-4 h-4" /> Return to Quiz Engine
         </Link>

         <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-black uppercase tracking-widest mb-6">
               <Activity className="w-4 h-4 text-sky-400" /> Performance Telemetry
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
              Cumulative <span className="text-sky-400">Progress.</span>
            </h1>
            <p className="text-white/50 text-base md:text-lg font-medium leading-relaxed max-w-xl">
              Lifetime accuracy modeling aggregated across all historically processed Core Test Series modules.
            </p>

             <div className="mt-8 max-w-3xl bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 text-left shadow-[0_0_30px_rgba(16,185,129,0.05)] flex gap-5 items-start">
               <Activity className="w-8 h-8 text-emerald-500 shrink-0 mt-1" />
               <div>
                 <h3 className="text-emerald-400 font-black uppercase tracking-widest text-sm mb-2">How It Works</h3>
                 <p className="text-white/60 text-sm leading-relaxed font-medium">
                   This dashboard recursively computes cumulative behavioral analytics securely stored in the cloud. Toggle horizontally across testing origins (Global, AI Prelims, PDF Quiz) to instantly isolate identical capability weaknesses mapped across parallel disciplines.
                 </p>
               </div>
             </div>
         </motion.div>

         {/* Master Metrics Grid */}
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.1}} className="glass p-8 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group hover:bg-white/[0.02] transition-colors">
               <BrainCircuit className="w-8 h-8 text-indigo-400 mb-6" />
               <h3 className="text-4xl md:text-5xl font-black text-white mb-2">{totalTests}</h3>
               <p className="text-xs uppercase tracking-widest font-bold text-white/40">Exams Conquered</p>
            </motion.div>
            
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.2}} className="glass p-8 rounded-[2rem] border border-sky-500/20 shadow-[0_0_30px_rgba(56,189,248,0.1)] relative overflow-hidden group hover:bg-white/[0.02] transition-colors">
               <Target className="w-8 h-8 text-sky-400 mb-6" />
               <h3 className="text-4xl md:text-5xl font-black text-sky-400 mb-2">{cumulativeAccuracy}%</h3>
               <p className="text-xs uppercase tracking-widest font-bold text-sky-400/50">Overall Accuracy</p>
            </motion.div>

            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.3}} className="glass p-8 rounded-[2rem] border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.1)] relative overflow-hidden group hover:bg-white/[0.02] transition-colors">
               <CheckCircle2 className="w-8 h-8 text-green-400 mb-6" />
               <h3 className="text-4xl md:text-5xl font-black text-green-400 mb-2">{totalCorrect}</h3>
               <p className="text-xs uppercase tracking-widest font-bold text-green-400/50">Total Correct Hits</p>
            </motion.div>

            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.4}} className="glass p-8 rounded-[2rem] border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.1)] relative overflow-hidden group hover:bg-white/[0.02] transition-colors">
               <XCircle className="w-8 h-8 text-rose-400 mb-6" />
               <h3 className="text-4xl md:text-5xl font-black text-rose-400 mb-2">{totalWrong}</h3>
               <p className="text-xs uppercase tracking-widest font-bold text-rose-400/50">Missed Logic Vectors</p>
            </motion.div>
         </div>

         {/* Source Filters */}
         <div className="flex flex-wrap gap-4 mb-12">
            {["All Sources", "PDF Quiz", "Question Bank", "AI Prelims"].map(src => (
               <button 
                 key={src}
                 onClick={() => setActiveFilter(src)}
                 className={`px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest transition-all shadow-xl
                   ${activeFilter === src ? "bg-sky-500 text-white shadow-sky-500/20" : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10"}`}
               >
                  {src}
               </button>
            ))}
         </div>

         {/* Advanced Subject Analytics Matrix */}
         {subjectArray.length > 0 && (
           <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay: 0.5}} className="mb-16">
              <h3 className="text-2xl font-black text-white/90 mb-8 flex items-center gap-3">
                 <BrainCircuit className="w-6 h-6 text-indigo-400" /> Subject Wise Target Analysis 
                 <span className="text-xs font-bold uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full text-white/50 shadow-inner">Cumulative Drill-Down</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {subjectArray.map(([sub, stats]) => {
                    const acc = Math.round((stats.correct / (stats.attempted || 1)) * 100);
                    return (
                        <div key={sub} className="glass p-8 rounded-[2rem] border border-white/5 shadow-xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 blur-[50px] rounded-full pointer-events-none group-hover:bg-indigo-500/10 transition-colors"></div>
                           
                           <div className="flex justify-between items-start mb-6">
                              <h4 className="font-bold text-xl text-white/90">{sub}</h4>
                              <span className="text-2xl font-black text-white bg-white/5 px-4 py-1.5 rounded-xl border border-white/10 shadow-sm">{acc}%</span>
                           </div>
                           
                           {/* Horizontal Tracker */}
                           <div className="w-full bg-black/40 h-3 rounded-full overflow-hidden flex shadow-inner mb-4">
                               <div className="bg-green-500 h-full transition-all" style={{width: `${(stats.correct/stats.attempted)*100}%`}}></div>
                               <div className="bg-rose-500 h-full transition-all" style={{width: `${(stats.wrong/stats.attempted)*100}%`}}></div>
                           </div>
                           
                           <div className="flex justify-between mt-4 text-xs font-black uppercase tracking-widest">
                              <span className="text-white/40">Attempted: {stats.attempted}</span>
                              <span className="text-green-400/80">Correct: {stats.correct}</span>
                              <span className="text-rose-400/80">Wrong: {stats.wrong}</span>
                           </div>
                        </div>
                    );
                 })}
              </div>
           </motion.div>
         )}

         {/* Chronological History Log */}
         <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay: 0.6}}>
            <h3 className="text-xl font-black text-white/90 mb-8 flex items-center gap-3">
               <Activity className="w-5 h-5 text-indigo-400" /> Chronological Examination History
            </h3>
            
            {filteredHistory.length === 0 ? (
               <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.02]">
                  <Target className="w-12 h-12 text-white/10 mb-4" />
                  <p className="text-white/40 font-bold">No historical data found for {activeFilter}. Execute a Test Session to structurally map analytics.</p>
               </div>
            ) : (
               <div className="space-y-4">
                  {filteredHistory.map((record, i) => (
                     <div key={record.id} className="glass p-6 md:p-8 rounded-[2rem] border border-white/5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/[0.02] transition-colors">
                        <div>
                           <div className="flex items-center gap-3 mb-2">
                              {record.source === "PDF Quiz" && <span className="bg-sky-500/20 text-sky-400 text-[10px] uppercase font-black tracking-widest px-3 py-1.5 rounded-lg border border-sky-500/30">{record.source} Engine</span>}
                              {record.source === "Question Bank" && <span className="bg-emerald-500/20 text-emerald-400 text-[10px] uppercase font-black tracking-widest px-3 py-1.5 rounded-lg border border-emerald-500/30">{record.source} Engine</span>}
                              {record.source === "AI Prelims" && <span className="bg-purple-500/20 text-purple-400 text-[10px] uppercase font-black tracking-widest px-3 py-1.5 rounded-lg border border-purple-500/30">{record.source} Generator</span>}
                              {!record.source && <span className="bg-white/10 text-white/50 text-[10px] uppercase font-black tracking-widest px-3 py-1.5 rounded-lg border border-white/5">Legacy Exam Output</span>}
                           </div>
                           <h4 className="text-xl font-bold text-white/90">{record.source ? record.source + " Analytics" : "Test Series Execution"}</h4>
                           <p className="text-sm font-medium text-white/40 mt-1">Processed {record.totalQuestions} Deep Analytics Queries</p>
                        </div>

                        <div className="flex items-center gap-8 bg-[#0a0f1c] px-8 py-5 rounded-2xl border border-white/5">
                           <div className="text-center">
                              <p className="text-[10px] font-black uppercase tracking-widest text-sky-400/60 mb-1">Accuracy</p>
                              <p className="text-xl font-black text-sky-400">{record.accuracy}%</p>
                           </div>
                           <div className="text-center">
                              <p className="text-[10px] font-black uppercase tracking-widest text-green-400/60 mb-1">Correct</p>
                              <p className="text-xl font-black text-green-400">{record.correctAnswers}</p>
                           </div>
                           <div className="text-center">
                              <p className="text-[10px] font-black uppercase tracking-widest text-rose-400/60 mb-1">Wrong</p>
                              <p className="text-xl font-black text-rose-400">{record.wrongAnswers}</p>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </motion.div>
      </div>
    </div>
  );
}
