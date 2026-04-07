"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, CheckCircle2, XCircle, ChevronRight, FileText, Loader2, BrainCircuit, Activity, Globe } from "lucide-react";
import { saveQuizResult } from "@/lib/quiz";
import { supabase } from "@/lib/supabase";
import { deductCredit } from "@/lib/credits";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

export default function InteractiveQuizEngine() {
  const router = useRouter();
  
  // Upload State
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<"English" | "Hindi">("English");
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  
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
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [insufficientCredits, setInsufficientCredits] = useState(false);

  useEffect(() => {
     if (typeof window !== "undefined") {
        const saved = localStorage.getItem("prepAssistActiveQuiz");
        if (saved) setHasSavedSession(true);
     }
     const fetchUser = async () => {
        try {
           const response: any = await supabase.auth.getUser();
           if (response?.data?.user) setUserId(response.data.user.id);
        } catch (authError: any) {
           // Natively absorbing Supabase Dev "Lock Steal" warning natively avoiding UI Crash Drop outs
           console.log("Ignored Stealth Auth Lock:", authError.message);
        }
     };

     fetchUser();
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
        const saved = localStorage.getItem("prepAssistActiveQuiz");
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
        localStorage.setItem("prepAssistActiveQuiz", JSON.stringify({
           questions, currentIndex, correctCount, wrongCount, userAnswers
        }));
     }

     const finalAttempted = isRevealed ? currentIndex + 1 : currentIndex;
     if (finalAttempted > 0) {
        setIsProcessing(true);
        try {
           const accuracy = Math.round((correctCount / finalAttempted) * 100);
           
           const subjectAnalytics: Record<string, { attempted: number; correct: number; wrong: number }> = {};
           for (let i = 0; i < finalAttempted; i++) {
              const sq = questions[i];
              const sbj = sq.subject || "Unknown";
              if (!subjectAnalytics[sbj]) subjectAnalytics[sbj] = { attempted: 0, correct: 0, wrong: 0 };
              
              const ans = userAnswers[i];
              if (ans !== undefined) {
                 subjectAnalytics[sbj].attempted++;
                 if (ans) subjectAnalytics[sbj].correct++;
                 else subjectAnalytics[sbj].wrong++;
              }
           }

           await saveQuizResult({
              userId: userId || "guest_user",
              source: "PDF Quiz",
              totalQuestions: finalAttempted,
              correctAnswers: correctCount,
              wrongAnswers: wrongCount,
              accuracy,
              subjectAnalytics
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
     if (typeof window !== "undefined") localStorage.removeItem("prepAssistActiveQuiz");
     
     // Reset UI utterly deleting progress
     setQuestions([]);
     setCorrectCount(0);
     setWrongCount(0);
     setUserAnswers({});
     setIsCloseModalOpen(false);
     setHasSavedSession(false);
  };

  // Core Pipeline Execution
  const handleFileUpload = async () => {
     if (!file) return;
     
     const controller = new AbortController();
     setAbortController(controller);
     setIsProcessing(true);
     
     const t0 = performance.now();
     
     try {
       if (!userId) throw new Error("Authentication required to utilize premium PDF Extraction.");
       await deductCredit(userId, 5, "PDF Data Extraction");

       const formData = new FormData();
       formData.append("pdf", file);
       formData.append("language", selectedLanguage);
       
       const res = await fetch("/api/quiz/process-pdf", {
         method: "POST",
         body: formData,
         signal: controller.signal
       });
       
       if (!res.ok) throw new Error(await res.text());
       
       const { results } = await res.json();
       if (!results || results.length === 0) throw new Error("AI failed to extract questions. Please check the PDF.");
       
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
       setSuccessMessage(`Extraction Complete: ${results.length} questions parsed natively in ${timeTaken} seconds.`);
       setTimeout(() => setSuccessMessage(null), 5000);
       
     } catch (err: any) {
       if (err.name === 'AbortError') {
          console.log("User violently terminated the Extraction Loop.");
       } else if (err.message === "INSUFFICIENT_CREDITS") {
          setInsufficientCredits(true);
       } else {
          alert("CRASH LOG: " + err.message);
       }
     } finally {
       setIsProcessing(false);
       setAbortController(null);
     }
  };

  const handleAbortExtraction = () => {
      if (abortController) {
          abortController.abort();
          setIsProcessing(false);
          setAbortController(null);
      }
  };

  const handleSelectOption = (optionId: string) => {
     if (isRevealed) return; // Prevent changing answer
     setSelectedOptionId(optionId);
     setIsRevealed(true);
     
     const isCorrect = optionId === questions[currentIndex].correctOptionId;
     setUserAnswers(prev => ({ ...prev, [currentIndex]: isCorrect }));
     
     if (isCorrect) setCorrectCount(prev => prev + 1);
     else setWrongCount(prev => prev + 1);
  };

  const handeNextQuestion = async () => {
     if (currentIndex === questions.length - 1) {
        // Conclude Quiz & Sync to Cloud
        setIsProcessing(true);
        try {
          const accuracy = Math.round((correctCount / questions.length) * 100);
          await saveQuizResult({
            userId: "guest_user",
            totalQuestions: questions.length,
            correctAnswers: correctCount,
            wrongAnswers: wrongCount,
            accuracy
          });
          
          if (typeof window !== "undefined") localStorage.removeItem("prepAssistActiveQuiz");
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
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden selection:bg-indigo-500/30 p-6 md:p-12">
      {/* Insufficient Credits Banner */}
      <AnimatePresence>
        {insufficientCredits && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: "-50%" }} 
            animate={{ opacity: 1, y: 0, x: "-50%" }} 
            exit={{ opacity: 0, y: -20, x: "-50%" }} 
            className="fixed top-24 left-1/2 z-[100] w-[90%] max-w-[420px] bg-[#212121] text-white p-5 rounded-2xl shadow-2xl border border-white/5 font-sans"
          >
             <div className="flex items-center gap-2 mb-1.5">
                <XCircle className="w-5 h-5 text-white/50" />
                <h3 className="text-[17px] font-bold text-white/90">Insufficient AI Credits</h3>
             </div>
             <p className="text-[14px] text-white/50 mb-6 pl-7 font-medium">
                Your AI credits balance is too low to continue.
             </p>
             <div className="flex items-center gap-3 pl-7 flex-wrap">
                <button onClick={() => setInsufficientCredits(false)} className="px-5 py-2 bg-[#323232] hover:bg-[#3d3d3d] text-white/80 text-sm font-semibold rounded-xl transition-colors shadow-sm">
                   Dismiss
                </button>
                <Link href="/pricing" className="px-5 py-2 bg-[#323232] hover:bg-[#3d3d3d] text-white/80 text-sm font-semibold rounded-xl transition-colors shadow-sm">
                   See Plans
                </Link>
                <Link href="/pricing" className="px-5 py-2 bg-[#0078D4] hover:bg-[#0078D4]/90 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm tracking-wide">
                   Purchase Credits
                </Link>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Structural Glows */}
      <div className="fixed top-0 left-1/4 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen opacity-50"></div>
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-[100px] pointer-events-none mix-blend-screen opacity-50"></div>

      <AnimatePresence>
         {successMessage && (
            <motion.div initial={{opacity:0, y:-20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-900 px-6 py-3 rounded-full font-black text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center gap-3">
               <CheckCircle2 className="w-5 h-5" /> {successMessage}
            </motion.div>
         )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* VIEW 1: Document Upload Screen */}
        {questions.length === 0 && !isProcessing && (
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="pt-20 text-center">
             <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black uppercase tracking-widest mb-6 shadow-2xl">
               <BrainCircuit className="w-4 h-4" /> AI Document Processor
             </div>
             
             <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
               Test Series <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-sky-400">Extractor.</span>
             </h1>
             <p className="text-slate-500 text-base md:text-lg font-medium leading-relaxed max-w-xl mx-auto mb-10">
               Upload the PDF containing questions and transform those questions into a Interactive Quiz session. Get the assessment of it and see the analytics in the Progress section.
             </p>

              <div className="max-w-2xl mx-auto mb-12 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 text-left shadow-[0_0_30px_rgba(99,102,241,0.05)] flex gap-5 items-start">
               <FileText className="w-8 h-8 text-indigo-500 shrink-0 mt-1" />
               <div>
                 <h3 className="text-indigo-400 font-black uppercase tracking-widest text-sm mb-2">How It Works</h3>
                 <p className="text-slate-600 text-sm leading-relaxed font-medium">
                   Upload your active PDF securely. The underlying Pipeline utilizes parallel GCP arrays to bypass layout complexity and map valid questions natively. Answer questions exactly as an active exam environment. All metrics uniquely sync to the Progress Dashboard upon termination.
                 </p>
               </div>
              </div>

             <div className="glass rounded-[3rem] p-8 border border-slate-200 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                
                {/* Language Toggles */}
                <div className="flex justify-center mb-8 relative z-10">
                   <div className="bg-slate-50 p-1.5 rounded-2xl flex border border-slate-300 shadow-inner">
                      {(["English", "Hindi"] as const).map(lang => (
                        <button
                          key={lang}
                          onClick={() => setSelectedLanguage(lang)}
                          className={`px-8 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${selectedLanguage === lang ? 'bg-indigo-500 text-slate-900 shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'text-slate-400 hover:text-slate-700'}`}
                        >
                           <Globe className="w-4 h-4" /> {lang} Only
                        </button>
                      ))}
                   </div>
                </div>

                <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-slate-300 rounded-[2rem] hover:border-indigo-400/50 hover:bg-indigo-500/5 cursor-pointer transition-all relative z-10 bg-slate-50">
                  <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  {file ? (
                    <>
                      <FileText className="w-12 h-12 text-indigo-400 mb-4" />
                      <span className="font-bold text-lg text-slate-900">{file.name}</span>
                      <span className="text-xs font-bold uppercase tracking-widest text-indigo-400/60 mt-2">{(file.size / 1024 / 1024).toFixed(2)} MB Payload Prepared</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-16 h-16 text-slate-300 mb-6 group-hover:text-indigo-400 transition-colors" />
                      <span className="font-black text-xl text-slate-700">Drag & Drop PDF Routine</span>
                      <span className="text-sm font-medium text-slate-400 mt-2">Max 50 Questions per sync limits.</span>
                    </>
                  )}
                </label>

                  <button 
                    onClick={handleFileUpload}
                    disabled={!file}
                    className={`w-full mt-6 py-6 rounded-2xl font-black text-lg transition-colors flex justify-center items-center gap-3 shadow-xl ${file ? 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20 text-slate-900 cursor-pointer' : 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed opacity-70'}`}
                  >
                    Generate Interactive Exam
                  </button>
                
                {hasSavedSession && (
                  <button 
                    onClick={handleResumeSession} 
                    className="w-full mt-4 py-6 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 rounded-2xl font-black text-lg transition-colors flex justify-center items-center gap-3 shadow-xl shadow-emerald-500/10"
                  >
                    <Activity className="w-6 h-6" /> Resume Active Session
                  </button>
                )}

                {/* UI Upload Instructions Panel */}
                <div className="mt-8 text-left bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
                   <h3 className="text-slate-900 font-bold text-lg mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-400" /> Instructions for optimal extraction:
                   </h3>
                   <ul className="space-y-3 text-slate-500 font-medium text-sm list-disc pl-5">
                      <li>Please ensure the PDF contains MCQs clearly numbered (e.g., Q1, 1.).</li>
                      <li>The system actively auto-translates and physically isolates multi-lingual versions utilizing your Selected Language Toggle.</li>
                      <li>Processing massively dense 100-Question UPSC modules logically executes in about 15-20 seconds. Please do not refresh!</li>
                      <li>Double check your source PDF is completely unencrypted and not strictly password-protected prior to initiating sync routines.</li>
                   </ul>
                </div>
             </div>
          </motion.div>
        )}

        {/* LOADING STATE - Deep Processing */}
        {isProcessing && !isFinished && (
           <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 rounded-full animate-pulse"></div>
                <Loader2 className="w-16 h-16 text-indigo-400 animate-spin relative z-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-800">Deep Decoding Exam Buffer...</h3>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-4 mb-10">Simultaneously solving up to 100 UPSC logic pathways.</p>
              
              <AnimatePresence mode="wait">
                 <motion.div 
                    key={tipIndex}
                    initial={{opacity: 0, y: 10}} 
                    animate={{opacity: 1, y: 0}} 
                    exit={{opacity: 0, y: -10}}
                    transition={{duration: 0.5}}
                    className="max-w-md bg-slate-100 border border-slate-300 p-6 rounded-2xl shadow-inner text-sm md:text-base font-medium text-indigo-200"
                 >
                    <Activity className="w-5 h-5 text-indigo-400 mb-3 mx-auto" />
                    {UPSC_TIPS[tipIndex]}
                 </motion.div>
              </AnimatePresence>

              <button 
                 onClick={handleAbortExtraction}
                 className="mt-12 px-8 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-black text-sm uppercase tracking-widest rounded-full hover:bg-rose-500/20 transition-all flex items-center gap-2"
              >
                 <XCircle className="w-4 h-4" /> Abort PDF Extraction Process
              </button>
           </motion.div>
        )}

        {/* VIEW 2: Interactive Quiz Mode */}
        {questions.length > 0 && !isProcessing && !isFinished && (
          <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="pt-8">
             {/* Header HUD */}
             <div className="flex items-center justify-between mb-8 glass px-6 py-4 rounded-2xl border border-slate-200 shadow-inner">
                <span className="text-xs font-black uppercase tracking-widest text-sky-400 flex items-center gap-2">
                   <Activity className="w-4 h-4"/> Question {currentIndex + 1} of {questions.length}
                </span>
                
                <div className="flex items-center gap-6">
                   <span className="text-xs md:text-sm font-black bg-slate-100 px-4 py-2 rounded-lg border border-slate-200 shadow-sm text-slate-700">
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
             <div className="glass rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-slate-200 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                
                {questions[currentIndex].subject && (
                   <span className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 text-sky-400 font-black text-[10px] tracking-widest uppercase rounded-lg mb-6">
                      Domain Syllabus: {questions[currentIndex].subject}
                   </span>
                )}

                <h2 className="text-lg md:text-xl font-bold text-slate-800 leading-relaxed mb-8 whitespace-pre-wrap">
                   <span className="font-black text-indigo-400 mr-2 text-xl md:text-2xl">Q{currentIndex + 1}.</span> 
                   {questions[currentIndex].questionText}
                </h2>

                <div className="space-y-3 relative z-10">
                   {questions[currentIndex].options.map(opt => {
                      const isSelected = selectedOptionId === opt.id;
                      const isCorrectAnswer = opt.id === questions[currentIndex].correctOptionId;
                      
                      // Explicit Logic Maps
                      let boxStyle = "bg-slate-100 border-slate-300 hover:border-slate-400 hover:bg-slate-100 text-slate-600";
                      let icon = null;

                      if (isRevealed) {
                         if (isCorrectAnswer) {
                            boxStyle = "bg-green-500/10 border-green-500 text-green-300 shadow-[0_0_20px_rgba(34,197,94,0.15)]";
                            icon = <CheckCircle2 className="w-5 h-5 text-green-400" />;
                         } else if (isSelected && !isCorrectAnswer) {
                            boxStyle = "bg-rose-500/5 border-rose-500/50 text-rose-300";
                            icon = <XCircle className="w-5 h-5 text-rose-400" />;
                         } else {
                            boxStyle = "bg-slate-50 border-slate-200 text-slate-400 opacity-50"; 
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
                         <div className="bg-white border border-slate-300 p-6 md:p-8 rounded-2xl relative shadow-inner">
                            <h4 className="text-xs uppercase tracking-widest text-sky-400 font-black mb-3">AI Deep Explanation</h4>
                            <p className="text-slate-600 leading-relaxed prose ">
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
                       className="px-8 py-5 bg-indigo-500 hover:bg-indigo-600 rounded-2xl font-black text-lg transition-colors flex items-center gap-3 shadow-xl shadow-indigo-500/20"
                     >
                       {currentIndex === questions.length - 1 ? "Submit Exam Matrix" : "Queue Next Question"} <ChevronRight className="w-5 h-5" />
                     </button>
                  </motion.div>
               )}
             </AnimatePresence>
          </motion.div>
        )}

         {/* VIEW 3: Final Results Matrix */}
        {isFinished && (
           <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="pt-20 text-center">
             <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-500/50 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                <CheckCircle2 className="w-12 h-12 text-green-400" />
             </div>
             <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Exam <span className="text-green-400">Captured.</span></h1>
             <p className="text-slate-500 text-lg mb-12">Your systemic reasoning has been synced to the primary tracking core.</p>

             <div className="grid grid-cols-3 gap-6 mb-12">
                <div className="glass p-8 rounded-3xl border border-slate-200">
                   <h3 className="text-5xl font-black text-slate-900 mb-2">{questions.length}</h3>
                   <p className="text-xs uppercase tracking-widest font-bold text-slate-500">Total Array</p>
                </div>
                <div className="glass p-8 rounded-3xl border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                   <h3 className="text-5xl font-black text-green-400 mb-2">{correctCount}</h3>
                   <p className="text-xs uppercase tracking-widest font-bold text-green-400/50">Correct Hits</p>
                </div>
                <div className="glass p-8 rounded-3xl border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.1)]">
                   <h3 className="text-5xl font-black text-rose-400 mb-2">{wrongCount}</h3>
                   <p className="text-xs uppercase tracking-widest font-bold text-rose-400/50">Missed Logic</p>
                </div>
             </div>

             <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                 <button 
                   onClick={() => router.push('/progress')}
                   className="w-full md:w-auto px-10 py-5 bg-slate-900 text-white hover:bg-slate-800 rounded-2xl font-black text-lg transition-colors flex justify-center items-center gap-3 shadow-2xl"
                 >
                   View Cumulative Analytics <Activity className="w-5 h-5" />
                 </button>
                 <button 
                   onClick={() => window.location.reload()}
                   className="w-full md:w-auto px-10 py-5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-2xl font-black text-lg transition-colors flex justify-center items-center gap-3 shadow-2xl border border-indigo-500/20"
                 >
                   Upload New Test Series
                 </button>
             </div>
           </motion.div>
        )}

        {/* MODAL: Close Session Confirmation */}
        <AnimatePresence>
           {isCloseModalOpen && (
             <motion.div 
               initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} 
               className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-6"
             >
                <motion.div 
                   initial={{scale:0.95, y:20}} animate={{scale:1, y:0}} exit={{scale:0.95, y:20}}
                   className="bg-white border border-slate-300 p-8 rounded-[2.5rem] shadow-2xl max-w-lg w-full relative overflow-hidden"
                >
                   <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                   
                   <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Active Session Halt.</h2>
                   <p className="text-slate-600 font-medium leading-relaxed mb-8">
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
                        className="text-slate-400 hover:text-slate-700 font-bold transition-colors text-sm uppercase tracking-widest"
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
