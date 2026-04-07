"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ChevronRight, Loader2, Target, Activity, Zap, Sparkles } from "lucide-react";
import { saveQuizResult } from "@/lib/quiz";
import { useRouter } from "next/navigation";

interface QuizOption {
  id: string;
  text: string;
}

interface Question {
  subject?: string;
  questionText: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
}

const UPSC_TIPS = [
  "Strategy Tip: Linking static concepts with dynamic current affairs is the key to mastering GS Papers.",
  "Did you know? The UPSC syllabus strictly emphasizes 'Governance' and 'Social Justice' in GS-II.",
  "Exam Hack: In Prelims, practice the '3-Sweep Method'—attempt 100% known MCQs first.",
  "Consistency is absolute: Reading the newspaper daily is non-negotiable for an IAS aspirant.",
  "Analytical Insight: Focus strictly on the logic behind incorrect options, not just finding the right one."
];

export default function AIPrelimsEngine() {
  const router = useRouter();
  
  // Generation State
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"Beginner" | "Medium" | "Advanced">("Medium");
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [selectedLanguage, setSelectedLanguage] = useState<"English" | "Hindi">("English");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  // Quiz Session State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  
  // Analytics
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, boolean>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
     if (typeof window !== "undefined") {
        const saved = localStorage.getItem("prepAssistAIQuiz");
        if (saved) setHasSavedSession(true);
     }
  }, []);

  useEffect(() => {
     if (isProcessing) {
        setTipIndex(0);
        const interval = setInterval(() => setTipIndex(prev => (prev + 1) % UPSC_TIPS.length), 3500);
        return () => clearInterval(interval);
     }
  }, [isProcessing]);

  const attemptedCount = correctCount + wrongCount;

  const handleResumeSession = () => {
     if (typeof window !== "undefined") {
        const saved = localStorage.getItem("prepAssistAIQuiz");
        if (saved) {
           const data = JSON.parse(saved);
           setQuestions(data.questions);
           setCurrentIndex(data.currentIndex);
           setCorrectCount(data.correctCount);
           setWrongCount(data.wrongCount);
           setUserAnswers(data.userAnswers || {});
           setHasSavedSession(false);
           setIsRevealed(false);
           setSelectedOptionId(null);
        }
     }
  };

  const handleSaveAndSync = async () => {
     if (typeof window !== "undefined") {
        localStorage.setItem("prepAssistAIQuiz", JSON.stringify({
           questions, currentIndex, correctCount, wrongCount, userAnswers
        }));
     }

     const finalAttempted = isRevealed ? currentIndex + 1 : currentIndex;
     if (finalAttempted > 0) {
        setIsProcessing(true);
        try {
           const accuracy = Math.round((correctCount / finalAttempted) * 100);
           
           await saveQuizResult({
              userId: "guest_user",
              source: "AI Prelims",
              totalQuestions: finalAttempted,
              correctAnswers: correctCount,
              wrongAnswers: wrongCount,
              accuracy
           });
        } catch (e) {
           console.error("Partial Sync Failed.");
        } finally {
           setIsProcessing(false);
        }
     }
     
     // Reset UI to Dashboard
     setQuestions([]);
     setIsCloseModalOpen(false);
     setHasSavedSession(true);
  };

  const handleExitWithoutSaving = () => {
     if (typeof window !== "undefined") localStorage.removeItem("prepAssistAIQuiz");
     
     // Reset UI utterly deleting progress
     setQuestions([]);
     setCorrectCount(0);
     setWrongCount(0);
     setUserAnswers({});
     setIsCloseModalOpen(false);
     setHasSavedSession(false);
  };

  const generateAIQuestions = async () => {
     if (!topic.trim()) {
        alert("Please enter a valid Topic to generate MCQs.");
        return;
     }

     const controller = new AbortController();
     setAbortController(controller);
     setIsProcessing(true);
     
     const t0 = performance.now();
     
     try {
       const res = await fetch("/api/quiz/generate-ai", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ topic, difficulty, numQuestions, language: selectedLanguage }),
         signal: controller.signal
       });
       
       if (!res.ok) throw new Error(await res.text());
       
       const { results } = await res.json();
       if (!results || results.length === 0) throw new Error("AI failed to generate questions. Please try a different topic.");
       
       setQuestions(results);
       setCurrentIndex(0);
       setCorrectCount(0);
       setWrongCount(0);
       setUserAnswers({});
       setIsFinished(false);
       setSelectedOptionId(null);
       setIsRevealed(false);
       
       const t1 = performance.now();
       const timeTaken = ((t1 - t0) / 1000).toFixed(1);
       setSuccessMessage(`AI Generation Complete: ${results.length} questions forged natively in ${timeTaken} seconds.`);
       setTimeout(() => setSuccessMessage(null), 5000);
       
     } catch (err: any) {
       if (err.name === 'AbortError') console.log("User violently terminated the Generation Loop.");
       else alert("CRASH LOG: " + err.message);
     } finally {
       setIsProcessing(false);
       setAbortController(null);
     }
  };

  const handleAbortGeneration = () => {
      if (abortController) {
          abortController.abort();
          setIsProcessing(false);
          setAbortController(null);
      }
  };

  const handleSelectOption = (optionId: string) => {
     if (isRevealed) return;
     setSelectedOptionId(optionId);
     setIsRevealed(true);
     
     const isCorrect = optionId === questions[currentIndex].correctOptionId;
     setUserAnswers(prev => ({ ...prev, [currentIndex]: isCorrect }));
     
     if (isCorrect) setCorrectCount(prev => prev + 1);
     else setWrongCount(prev => prev + 1);
  };

  const handeNextQuestion = async () => {
     if (currentIndex === questions.length - 1) {
        setIsProcessing(true);
        try {
          const accuracy = Math.round((correctCount / questions.length) * 100);
          await saveQuizResult({
            userId: "guest_user",
            source: "AI Prelims",
            totalQuestions: questions.length,
            correctAnswers: correctCount,
            wrongAnswers: wrongCount,
            accuracy
          });
          
          if (typeof window !== "undefined") localStorage.removeItem("prepAssistAIQuiz");
          setIsFinished(true);
        } catch(e) {
          alert("Failed to sync structural analytics to Firestore.");
        } finally {
          setIsProcessing(false);
        }
     } else {
        setSelectedOptionId(null);
        setIsRevealed(false);
        setCurrentIndex(prev => prev + 1);
     }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden selection:bg-amber-500/30 p-6 md:px-12 md:py-6">
      {/* Structural Glows customized for AI Prelims (Amber/Orange Theme) */}
      <div className="fixed top-0 left-1/4 w-[800px] h-[800px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen opacity-50"></div>
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-orange-600/5 rounded-full blur-[100px] pointer-events-none mix-blend-screen opacity-50"></div>

      <AnimatePresence>
         {successMessage && (
            <motion.div initial={{opacity:0, y:-20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-full font-black text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center gap-3">
               <CheckCircle2 className="w-5 h-5" /> {successMessage}
            </motion.div>
         )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* VIEW 1: Generation Configuration Screen */}
        {questions.length === 0 && !isProcessing && (
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="pt-2 md:pt-4 text-center">
             <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black uppercase tracking-widest mb-6 shadow-2xl">
               <Target className="w-4 h-4" /> Prelims Generator
             </div>
             
             <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
               Dynamic AI <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400">Prelims.</span>
             </h1>
             <p className="text-white/50 text-base md:text-lg font-medium leading-relaxed max-w-xl mx-auto mb-10">
               Specify any UPSC topic and select your difficulty framework. The AI will instantly forge {numQuestions} highly analytical MCQs matching native Prelims standards.
             </p>

             <div className="max-w-2xl mx-auto mb-12 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 text-left shadow-[0_0_30px_rgba(245,158,11,0.05)] flex gap-5 items-start">
               <Target className="w-8 h-8 text-amber-500 shrink-0 mt-1" />
               <div>
                 <h3 className="text-amber-400 font-black uppercase tracking-widest text-sm mb-2">How It Works</h3>
                 <p className="text-white/60 text-sm leading-relaxed font-medium">
                   Type any UPSC topic dynamically into the interface and toggle your conceptual difficulty matrix. The OpenRouter infrastructure natively generates {numQuestions} unique, highly-accurate analytical MCQs without repetitive overlaps. Read explanations thoroughly after selection.
                 </p>
               </div>
             </div>

             <div className="glass rounded-[3rem] p-8 md:p-12 border border-white/5 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                
                {/* Topic Input Field */}
                <div className="mb-10 relative z-10 text-left">
                   <label className="block text-sm font-black uppercase tracking-widest text-white/50 mb-3">Target Topic Domain</label>
                   <div className="relative">
                      <input 
                         type="text"
                         value={topic}
                         onChange={e => setTopic(e.target.value)}
                         placeholder="e.g., Ocean Currents, DPSP, Monetary Policy..."
                         className="w-full bg-black/40 border-2 border-white/10 rounded-2xl p-6 text-xl font-bold text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 transition-all shadow-inner"
                      />
                      <Sparkles className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-amber-400/50 pointer-events-none" />
                   </div>
                </div>

                {/* Number of Extractions */}
                <div className="mb-10 relative z-10 text-left">
                   <label className="block text-sm font-black uppercase tracking-widest text-white/50 mb-3">Generation Array Size</label>
                   <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[5, 10, 15, 20].map(num => (
                         <button
                            key={num}
                            onClick={() => setNumQuestions(num)}
                            className={`py-4 px-6 rounded-2xl font-black text-lg border-2 transition-all ${numQuestions === num ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] border-indigo-400' : 'bg-white/5 border-white/10 text-white/50 hover:bg-indigo-500/10 hover:text-indigo-300'}`}
                         >
                            {num} MCQs
                         </button>
                      ))}
                   </div>
                </div>

                {/* Difficulty Toggles */}
                <div className="mb-10 relative z-10 text-left">
                   <label className="block text-sm font-black uppercase tracking-widest text-white/50 mb-3">Complexity Matrix Framework</label>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(["Beginner", "Medium", "Advanced"] as const).map(level => {
                         const isActive = difficulty === level;
                         let colorClasses = "";
                         if (level === "Beginner") colorClasses = isActive ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] border-emerald-400" : "bg-white/5 border-white/10 text-white/50 hover:bg-emerald-500/10 hover:text-emerald-300";
                         if (level === "Medium") colorClasses = isActive ? "bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] border-amber-400" : "bg-white/5 border-white/10 text-white/50 hover:bg-amber-500/10 hover:text-amber-300";
                         if (level === "Advanced") colorClasses = isActive ? "bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)] border-rose-400" : "bg-white/5 border-white/10 text-white/50 hover:bg-rose-500/10 hover:text-rose-300";

                         return (
                            <button
                               key={level}
                               onClick={() => setDifficulty(level)}
                               className={`py-4 px-6 rounded-2xl font-black text-lg border-2 transition-all ${colorClasses}`}
                            >
                               {level}
                            </button>
                         )
                      })}
                   </div>
                </div>

                {/* Language Toggles */}
                 <div className="mb-10 relative z-10 text-left">
                   <label className="block text-sm font-black uppercase tracking-widest text-white/50 mb-3">Generation Language Priority</label>
                   <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-inner">
                      {(["English", "Hindi"] as const).map(lang => (
                        <button
                          key={lang}
                          onClick={() => setSelectedLanguage(lang)}
                          className={`flex-1 py-3.5 rounded-xl font-black text-sm transition-all flex justify-center items-center gap-2 ${selectedLanguage === lang ? 'bg-amber-500 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'text-white/40 hover:text-white/80'}`}
                        >
                           {lang} Nodes
                        </button>
                      ))}
                   </div>
                 </div>

                <div className="relative z-10">
                  <button 
                    onClick={generateAIQuestions} 
                    className="w-full py-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 rounded-2xl font-black text-xl text-white transition-all flex justify-center items-center gap-3 shadow-[0_0_40px_rgba(245,158,11,0.3)] group hover:scale-[1.01]"
                  >
                    Initiate Creation Sequence <Zap className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
                
                {hasSavedSession && (
                  <button 
                    onClick={handleResumeSession} 
                    className="w-full mt-4 py-6 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 rounded-2xl font-black text-lg transition-colors flex justify-center items-center gap-3 shadow-xl shadow-emerald-500/10 relative z-10"
                  >
                    <Activity className="w-6 h-6" /> Resume Active Session
                  </button>
                )}
             </div>
          </motion.div>
        )}

        {/* LOADING STATE - Deep Processing */}
        {isProcessing && !isFinished && (
           <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-amber-500 blur-2xl opacity-20 rounded-full animate-pulse"></div>
                <Loader2 className="w-16 h-16 text-amber-400 animate-spin relative z-10" />
              </div>
              <h3 className="text-2xl font-black text-white/90">Forging Topic Arrays...</h3>
              <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-4 mb-10">Connecting analytical logic strings dynamically.</p>
              
              <AnimatePresence mode="wait">
                 <motion.div 
                    key={tipIndex}
                    initial={{opacity: 0, y: 10}} 
                    animate={{opacity: 1, y: 0}} 
                    exit={{opacity: 0, y: -10}}
                    transition={{duration: 0.5}}
                    className="max-w-md bg-white/5 border border-white/10 p-6 rounded-2xl shadow-inner text-sm md:text-base font-medium text-amber-200"
                 >
                    <Target className="w-5 h-5 text-amber-400 mb-3 mx-auto" />
                    {UPSC_TIPS[tipIndex]}
                 </motion.div>
              </AnimatePresence>

              <button 
                 onClick={handleAbortGeneration}
                 className="mt-12 px-8 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-black text-sm uppercase tracking-widest rounded-full hover:bg-rose-500/20 transition-all flex items-center gap-2"
              >
                 <XCircle className="w-4 h-4" /> Abort Generation Process
              </button>
           </motion.div>
        )}

        {/* VIEW 2: Interactive Quiz Mode */}
        {questions.length > 0 && !isProcessing && !isFinished && (
          <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="pt-8">
             {/* Header HUD */}
             <div className="flex items-center justify-between mb-8 glass px-6 py-4 rounded-2xl border border-white/5 shadow-inner">
                <span className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                   <Activity className="w-4 h-4"/> AI Generated | Q{currentIndex + 1} of {questions.length}
                </span>
                
                <div className="flex items-center gap-6">
                   <span className="text-xs md:text-sm font-black bg-white/5 px-4 py-2 rounded-lg border border-white/5 shadow-sm text-white/80">
                      Attempted: <span className="text-indigo-400">{attemptedCount}</span> <span className="mx-2 opacity-20">|</span> 
                      Correct: <span className="text-green-400">{correctCount}</span> <span className="mx-2 opacity-20">|</span> 
                      Wrong: <span className="text-rose-400">{wrongCount}</span>
                   </span>
                   
                   <button 
                      onClick={() => setIsCloseModalOpen(true)}
                      className="text-rose-400/60 hover:text-rose-400 transition-colors p-1"
                   >
                     <XCircle className="w-5 h-5" />
                   </button>
                </div>
             </div>

             {/* Question Card */}
             <div className="glass rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-amber-500/10 shadow-[0_0_40px_rgba(245,158,11,0.05)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                
                <h2 className="text-lg md:text-xl font-bold text-white/90 leading-relaxed mb-8 whitespace-pre-wrap">
                   <span className="font-black text-amber-400 mr-2 text-xl md:text-2xl">Q{currentIndex + 1}.</span> 
                   {questions[currentIndex].questionText}
                </h2>

                <div className="space-y-3 relative z-10">
                   {questions[currentIndex].options.map(opt => {
                      const isSelected = selectedOptionId === opt.id;
                      const isCorrectAnswer = opt.id === questions[currentIndex].correctOptionId;
                      
                      let boxStyle = "bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10 text-white/70";
                      let icon = null;

                      if (isRevealed) {
                         if (isCorrectAnswer) {
                            boxStyle = "bg-green-500/10 border-green-500 text-green-300 shadow-[0_0_20px_rgba(34,197,94,0.15)]";
                            icon = <CheckCircle2 className="w-5 h-5 text-green-400" />;
                         } else if (isSelected && !isCorrectAnswer) {
                            boxStyle = "bg-rose-500/5 border-rose-500/50 text-rose-300";
                            icon = <XCircle className="w-5 h-5 text-rose-400" />;
                         } else {
                            boxStyle = "bg-white/[0.02] border-white/5 text-white/30 opacity-50"; 
                         }
                      }

                      return (
                         <button 
                           key={opt.id}
                           onClick={() => handleSelectOption(opt.id)}
                           disabled={isRevealed}
                           className={`w-full text-left p-4 md:p-5 rounded-xl border-2 transition-all flex items-center justify-between font-medium text-sm md:text-base ${boxStyle}`}
                         >
                           <div className="flex gap-4 items-start">
                             <span className="font-black opacity-50 uppercase">[{opt.id}]</span>
                             {opt.text}
                           </div>
                           {icon}
                         </button>
                      );
                   })}
                </div>

                {/* Explanation Reveal */}
                <AnimatePresence>
                   {isRevealed && (
                      <motion.div 
                        initial={{opacity:0, height:0, marginTop:0}} 
                        animate={{opacity:1, height:'auto', marginTop:40}} 
                        className="overflow-hidden"
                      >
                         <div className="bg-[#0a0f1c] border border-white/10 p-6 md:p-8 rounded-2xl relative shadow-inner">
                            <h4 className="text-xs uppercase tracking-widest text-amber-400 font-black mb-3 text-center md:text-left">AI Analytical Breakdown</h4>
                            <p className="text-white/70 leading-relaxed prose prose-invert italic font-medium">
                               {questions[currentIndex].explanation}
                            </p>
                         </div>
                      </motion.div>
                   )}
                </AnimatePresence>
             </div>

             {/* Footer Controls */}
             <AnimatePresence>
               {isRevealed && (
                  <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="mt-8 flex justify-end">
                     <button 
                       onClick={handeNextQuestion}
                       className="px-8 py-5 bg-amber-500 hover:bg-amber-600 rounded-2xl font-black text-lg transition-colors flex items-center gap-3 shadow-xl shadow-amber-500/20 text-white"
                     >
                       {currentIndex === questions.length - 1 ? "Submit AI Matrix" : "Queue Next Question"} <ChevronRight className="w-5 h-5" />
                     </button>
                  </motion.div>
               )}
             </AnimatePresence>
          </motion.div>
        )}

         {/* VIEW 3: Final Results Matrix */}
        {isFinished && (
           <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="pt-8 text-center">
             <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-500/50 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                <CheckCircle2 className="w-12 h-12 text-green-400" />
             </div>
             <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Exam <span className="text-green-400">Captured.</span></h1>
             <p className="text-white/50 text-lg mb-12">Your systemic reasoning has been natively synced to the Progress Dashboard.</p>

             <div className="grid grid-cols-3 gap-6 mb-12">
                <div className="glass p-8 rounded-3xl border border-white/5">
                   <h3 className="text-5xl font-black text-white mb-2">{questions.length}</h3>
                   <p className="text-xs uppercase tracking-widest font-bold text-white/50">Total Extractions</p>
                </div>
                <div className="glass p-8 rounded-3xl border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                   <h3 className="text-5xl font-black text-green-400 mb-2">{correctCount}</h3>
                   <p className="text-xs uppercase tracking-widest font-bold text-green-400/50">Accurate Logic</p>
                </div>
                <div className="glass p-8 rounded-3xl border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.1)]">
                   <h3 className="text-5xl font-black text-rose-400 mb-2">{wrongCount}</h3>
                   <p className="text-xs uppercase tracking-widest font-bold text-rose-400/50">Missed Flows</p>
                </div>
             </div>

             <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                 <button 
                   onClick={() => router.push('/progress')}
                   className="w-full md:w-auto px-10 py-5 bg-white text-black hover:bg-white/90 rounded-2xl font-black text-lg transition-colors flex justify-center items-center gap-3 shadow-2xl"
                 >
                   View Dashboard Analytics <Activity className="w-5 h-5" />
                 </button>
                 <button 
                   onClick={() => window.location.reload()}
                   className="w-full md:w-auto px-10 py-5 bg-琥珀-500/10 text-amber-500 hover:bg-amber-500/20 rounded-2xl font-black text-lg transition-colors flex justify-center items-center gap-3 shadow-2xl border border-amber-500/20 bg-amber-500/10"
                 >
                   Generate New Setup
                 </button>
             </div>
           </motion.div>
        )}

        {/* MODAL: Close Session Confirmation */}
        <AnimatePresence>
           {isCloseModalOpen && (
             <motion.div 
               initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} 
               className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-6"
             >
                <motion.div 
                   initial={{scale:0.95, y:20}} animate={{scale:1, y:0}} exit={{scale:0.95, y:20}}
                   className="bg-[#020617] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl max-w-lg w-full relative overflow-hidden"
                >
                   <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                   
                   <h2 className="text-3xl font-black text-white/90 mb-4 tracking-tight">Active Generation Halt.</h2>
                   <p className="text-white/60 font-medium leading-relaxed mb-8">
                      You are about to terminate the active Quiz Session loop. Do you want to explicitly pause your progress locally while syncing your active analytics to the cloud, or permanently discard this session without syncing?
                   </p>

                   <div className="space-y-4">
                      <button 
                         onClick={handleSaveAndSync}
                         className="w-full py-4 px-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-2xl font-bold flex items-center justify-between transition-all"
                      >
                         Save Session & Sync Analytics <Activity className="w-5 h-5" />
                      </button>

                      <button 
                         onClick={handleExitWithoutSaving}
                         className="w-full py-4 px-6 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 rounded-2xl font-bold flex items-center justify-between transition-all"
                      >
                         Exit without Saving <XCircle className="w-5 h-5" />
                      </button>
                   </div>
                   
                   <div className="mt-8 flex justify-center">
                     <button 
                        onClick={() => setIsCloseModalOpen(false)}
                        className="text-white/40 hover:text-white/80 font-bold transition-colors text-sm uppercase tracking-widest"
                     >
                        Abort Halt Request
                     </button>
                   </div>
                </motion.div>
             </motion.div>
           )}
        </AnimatePresence>

      </div>
    </div>
  );
}
