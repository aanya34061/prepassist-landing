"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, CheckCircle2, FileText, AlertCircle, Loader2, ArrowUpCircle, PenTool, Lightbulb, Flame, Award, BookOpen, Clock, RotateCcw, Image as ImageIcon, Check, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { deductCredit } from "@/lib/credits";
import { fetchMainsQuestionById } from "@/lib/mains-questions";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function MainsEvaluationContent() {
  const searchParams = useSearchParams();
  const [insufficientCredits, setInsufficientCredits] = useState(false);
  const [inputType, setInputType] = useState<"text" | "upload">("upload");
  const [wordLimit, setWordLimit] = useState<number>(250);
  
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeCurrentAffairs, setIncludeCurrentAffairs] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  
  const [question, setQuestion] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
     supabase.auth.getUser().then((response: any) => {
        const data = response.data;
        if (data?.user) setUserId(data.user.id);
     });

     // Natively extract routed Core Question via dynamic ID references securely to bypass Raw String URI crashes
     const mainsId = searchParams.get('mains_id');
     if (mainsId) {
        fetchMainsQuestionById(mainsId).then(data => {
           if (data) {
              setQuestion(data.questionText);
              // Option: Disable word-count toggles slightly? We leave them active so students choose their limit independently. 
           }
        });
     }
  }, [searchParams]);

  // Mock History
  const [history, setHistory] = useState([
    { id: 1, title: "Federalism and Governance", score: 68, limit: 250, date: "2026-03-27", time: "14:30 PM", type: "upload" },
    { id: 2, title: "Impact of Climate Change on Agriculture", score: 75, limit: 300, date: "2026-03-25", time: "09:15 AM", type: "text" },
    { id: 3, title: "Judicial Activism in India", score: 82, limit: 1000, date: "2026-03-21", time: "18:45 PM", type: "upload" },
    { id: 4, title: "Economic Reforms of 1991", score: 55, limit: 200, date: "2026-03-18", time: "10:00 AM", type: "text" },
  ]);

  const displayedHistory = showAllHistory ? history : history.slice(0, 2);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (inputType !== "upload") return;
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      handleFileSelected(droppedFile);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const evaluateAnswer = async () => {
    if (inputType === "upload" && !preview) return;
    if (inputType === "text" && !answerText.trim()) return;

    if (!userId) {
       alert("Secure Authentication Required. Please login to use AI Evaluation Arrays.");
       return;
    }

    setIsEvaluating(true);
    setResult(null);

    try {
      await deductCredit(userId, 3, "UPSC Mains Answer Evaluation");
    } catch (creditErr: any) {
      setIsEvaluating(false);
      if (creditErr.message === "INSUFFICIENT_CREDITS") {
         setInsufficientCredits(true);
      } else {
         alert("Ledger validation failed natively.");
      }
      return;
    }

    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          imageBase64: inputType === "upload" ? preview : undefined,
          answerText: inputType === "text" ? answerText : undefined,
          questionContext: question,
          wordLimit: wordLimit,
          includeNotes: includeNotes,
          includeCurrentAffairs: includeCurrentAffairs
        })
      });
      
      const data = await response.json();
      setResult(data);
      
      setHistory(prev => [{
        id: Date.now(),
        title: question || "General Essay Evaluation",
        score: data.score || 0,
        limit: wordLimit,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        type: inputType
      }, ...prev]);

    } catch (error) {
      console.error(error);
      alert("Failed to evaluate. Please try again.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-[#2E4A35] bg-[#EEF9F0] border-[#D1E8D5]";
    if (score >= 60) return "text-[#F97316] bg-[#FDF4ED] border-[#F97316]/20";
    if (score >= 40) return "text-[#8B5A2B] bg-[#F3EFE9] border-[#E5E0D8]";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getScoreTextClass = (score: number) => {
    if (score >= 80) return "text-[#2E4A35]";
    if (score >= 60) return "text-[#F97316]";
    if (score >= 40) return "text-[#8B5A2B]";
    return "text-red-500";
  };

  const handleRetake = (hist: any) => {
    setQuestion(hist.title);
    setWordLimit(hist.limit);
    setInputType(hist.type);
    setResult(null);
    setPreview(null);
    setAnswerText("");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#333333] font-sans p-6 md:p-12 selection:bg-[#F97316]/20">

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

      <div className="max-w-[1000px] mx-auto pb-24">
        
        <header className="text-center mb-12">
          <motion.div initial={{opacity:0, y:-20}} animate={{opacity:1, y:0}}>
            <h1 className="text-4xl md:text-5xl font-serif font-black mb-4 text-[#2A2A2A]">
              AI Mains Evaluation
            </h1>
            <p className="text-[#666666] text-lg max-w-2xl mx-auto font-medium">
              Submit your UPSC answer below. Our advanced pipeline analyzes handwritten texts alongside your personal knowledge vaults.
            </p>
          </motion.div>
        </header>

        {/* --- SECTION 1: UPLOAD & FORM --- */}
        <section className="mb-12">
            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#FDFBF7] p-8 md:p-10 rounded-3xl border border-[#D1C8B8] shadow-lg relative z-10"
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                   <h2 className="text-2xl font-serif font-black flex items-center gap-3 text-[#2A2A2A]">
                     <UploadCloud className="text-[#F97316] w-7 h-7" /> Submission Panel
                   </h2>
                   
                   {/* Input Engine Toggle */}
                   <div className="flex gap-2 p-1.5 bg-[#F3EFE9] rounded-xl border border-[#E5E0D8] shrink-0">
                     <button onClick={() => setInputType("upload")} className={`flex items-center gap-2 px-5 py-2.5 ${inputType==="upload"? "bg-white text-[#2A2A2A] shadow-sm border border-[#E5E0D8]" : "text-[#A89F91] hover:text-[#2A2A2A]"} rounded-lg transition-all text-sm font-bold`}>
                        <ImageIcon className="w-4 h-4"/> Hand-Written
                     </button>
                     <button onClick={() => setInputType("text")} className={`flex items-center gap-2 px-5 py-2.5 ${inputType==="text"? "bg-white text-[#2A2A2A] shadow-sm border border-[#E5E0D8]" : "text-[#A89F91] hover:text-[#2A2A2A]"} rounded-lg transition-all text-sm font-bold`}>
                        <PenTool className="w-4 h-4"/> Typed Answer
                     </button>
                   </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  {/* Question Input */}
                  <div>
                    <label className="block text-[11px] font-black text-[#8B5A2B] uppercase tracking-widest mb-3">Topic / Question Focus</label>
                    <textarea 
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Paste the exact UPSC Mains question..."
                      className="w-full bg-white border border-[#E5E0D8] rounded-2xl p-5 text-[#2A2A2A] placeholder-[#D1C8B8] focus:ring-2 focus:ring-[#F97316]/50 outline-none h-44 resize-none transition-all shadow-inner text-sm leading-relaxed"
                    />
                  </div>

                  {/* Configurations */}
                  <div className="flex flex-col gap-6">
                    {/* Word Limits */}
                    <div className="bg-white p-5 rounded-2xl border border-[#E5E0D8]">
                       <label className="block text-[11px] font-black text-[#8B5A2B] uppercase tracking-widest mb-3">Strict Word Limit</label>
                       <div className="flex flex-wrap gap-3">
                         {[200, 250, 300, 1000].map(limit => (
                           <button
                             key={limit}
                             onClick={() => setWordLimit(limit)}
                             className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all ${wordLimit === limit ? 'bg-[#F97316] text-white border-transparent shadow-md hover:scale-105' : 'bg-[#F3EFE9] text-[#A89F91] border border-[#E5E0D8] hover:bg-white'}`}
                           >
                             {limit}
                           </button>
                         ))}
                       </div>
                    </div>

                    {/* RAG Configurations */}
                    <div className="bg-white p-5 rounded-2xl border border-[#E5E0D8]">
                       <label className="block text-[11px] font-black text-[#8B5A2B] uppercase tracking-widest mb-3">Evaluation Context (RAG)</label>
                       <div className="space-y-4">
                         <label className="flex items-center gap-3 cursor-pointer group">
                           <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${includeNotes ? 'bg-[#F97316] border-[#F97316]' : 'bg-[#F3EFE9] border-[#D1C8B8] group-hover:border-[#A89F91]'}`}>
                              {includeNotes && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                           </div>
                           <span className={`text-sm font-bold transition-colors ${includeNotes ? 'text-[#2A2A2A]' : 'text-[#A89F91] group-hover:text-[#2A2A2A]'}`}>Include my Notes for this topic</span>
                         </label>
                         <label className="flex items-center gap-3 cursor-pointer group">
                           <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${includeCurrentAffairs ? 'bg-[#F97316] border-[#F97316]' : 'bg-[#F3EFE9] border-[#D1C8B8] group-hover:border-[#A89F91]'}`}>
                              {includeCurrentAffairs && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                           </div>
                           <span className={`text-sm font-bold transition-colors ${includeCurrentAffairs ? 'text-[#2A2A2A]' : 'text-[#A89F91] group-hover:text-[#2A2A2A]'}`}>Include Current Affairs context</span>
                         </label>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Input Handler (File Drop or Textarea) */}
                {inputType === "upload" ? (
                  <label 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className={`block w-full h-80 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative ${preview ? 'border-[#F97316] bg-[#FDF4ED] shadow-inner' : 'border-[#D1C8B8] hover:border-[#F97316]/50 bg-white hover:bg-[#F3EFE9]/50'}`}
                  >
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileSelected(e.target.files[0]); }} />
                    {preview ? (
                      <div className="relative w-full h-full group p-2">
                        <img src={preview} alt="Answer Preview" className="w-full h-full object-cover rounded-2xl opacity-60 group-hover:opacity-40 transition-opacity" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="bg-white/90 p-6 rounded-2xl border border-[#E5E0D8] flex flex-col items-center backdrop-blur-md shadow-xl">
                            <UploadCloud className="w-10 h-10 text-[#F97316] mb-3" />
                            <span className="text-[#2A2A2A] font-black tracking-wide">Click to Select Different File</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-center">
                        <FileText className="w-16 h-16 text-[#D1C8B8] mb-6" />
                        <p className="text-[#8B5A2B] font-black mb-2 text-xl">Drag & Drop Handwriting Image</p>
                        <p className="text-[#A89F91] text-sm font-bold uppercase tracking-wider">Browse JPG, PNG</p>
                      </div>
                    )}
                  </label>
                ) : (
                    <div className="h-80 border border-[#E5E0D8] rounded-3xl flex flex-col items-center justify-center transition-all overflow-hidden bg-white shadow-inner">
                      <textarea 
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        className="w-full h-full bg-transparent p-8 outline-none text-[#2A2A2A] placeholder-[#A89F91] resize-none font-medium leading-relaxed text-lg"
                        placeholder="Type or paste your complete essay answer here. The AI will strictly grade against your selected word limit and context metrics..."
                      />
                      <div className="w-full bg-[#F3EFE9] p-4 flex justify-end border-t border-[#E5E0D8]">
                         <span className={`text-sm font-black ${answerText.trim().split(/\s+/).length > wordLimit ? 'text-red-500' : 'text-[#A89F91]'}`}>
                            {answerText.length === 0 ? 0 : answerText.trim().split(/\s+/).length} / {wordLimit} words
                         </span>
                      </div>
                    </div>
                )}

                <button 
                  onClick={evaluateAnswer}
                  disabled={(inputType === "upload" && !preview) || (inputType === "text" && !answerText) || isEvaluating}
                  className="w-full mt-8 py-6 bg-[#2A2A2A] hover:bg-[#F97316] text-white rounded-2xl font-black text-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-3 shadow-lg group cursor-pointer"
                >
                  {isEvaluating ? (
                    <><Loader2 className="w-6 h-6 animate-spin" /> Deep Scanning Vault...</>
                  ) : (
                    <>Run UPSC Evaluation <CheckCircle2 className="w-6 h-6 group-hover:scale-110 transition-transform" /></>
                  )}
                </button>
            </motion.div>
        </section>

        {/* --- SECTION 2: RESULTS --- */}
        <section className="mb-12">
            <AnimatePresence mode="wait">
            {isEvaluating && (
                <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-24 rounded-3xl border border-[#F97316]/20 bg-[#FDF4ED] shadow-inner"
                >
                <div className="w-32 h-32 rounded-full border-[4px] border-[#F97316]/20 border-t-[#F97316] animate-spin mb-8 shadow-md" />
                <p className="text-3xl font-serif font-black text-[#F97316] mb-4 animate-pulse">Running Multi-Modal Analysis...</p>
                <p className="text-[#8B5A2B] text-center font-bold max-w-[500px] leading-relaxed">
                    Computing UPSC rubrics across Structure, Arguments, and Presentation. 
                    {includeNotes && " Cross-checking against your Vault!"}
                </p>
                </motion.div>
            )}

            {result && !isEvaluating && (
                <motion.div 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-8"
                >
                {/* Success Notification Banner */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-[#EEF9F0] border border-[#D1E8D5] text-[#2E4A35] px-8 py-5 rounded-2xl flex items-center gap-5 shadow-sm"
                >
                    <div className="bg-white p-2.5 rounded-full shadow-sm">
                        <CheckCircle2 className="w-7 h-7 text-[#2E4A35]" />
                    </div>
                    <div>
                        <span className="block font-black text-xl mb-1">Successfully Evaluated!</span>
                        <span className="block text-[#4E7658] text-sm font-bold">Your {inputType === "upload" ? "handwritten note" : "typed answer"} was instantly analyzed against historic UPSC thresholds.</span>
                    </div>
                </motion.div>

                {/* Top Score Card */}
                <div className="bg-white p-8 md:p-10 rounded-3xl border border-[#D1C8B8] flex flex-col md:flex-row items-center justify-between shadow-lg relative overflow-hidden">
                    <div className="mb-6 md:mb-0 max-w-2xl relative z-10">
                    <p className="text-[#8B5A2B] text-[11px] font-black uppercase tracking-widest mb-3">Examiner's Remark</p>
                    <h3 className="text-xl md:text-2xl font-serif font-black text-[#2A2A2A] leading-relaxed border-l-4 border-[#F97316] pl-5">{result.examinerRemark}</h3>
                    </div>
                    <div className={`flex flex-col items-center ${getScoreColor(result.score)} p-8 rounded-3xl border shadow-inner min-w-[240px] relative z-10`}>
                    <p className="text-current opacity-70 text-xs font-black uppercase tracking-widest mb-3">Total Score</p>
                    <p className={`text-7xl font-black ${getScoreTextClass(result.score)} tracking-tight`}>
                        {result.score} <span className="text-3xl opacity-40 tracking-normal">/ 100</span>
                    </p>
                    </div>
                </div>

                {/* Strengths / Weaknesses Grid */}
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-[#EEF9F0] p-8 md:p-10 rounded-3xl border border-[#D1E8D5]">
                    <h4 className="text-xl font-black text-[#2E4A35] mb-8 flex items-center gap-3 border-b border-[#2E4A35]/10 pb-4">
                        <CheckCircle2 className="w-7 h-7" /> Core Strengths
                    </h4>
                    <ul className="space-y-5">
                        {result.strengths?.map((item: string, i: number) => (
                        <li key={i} className="flex gap-4 text-[#4E7658] font-bold">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#2E4A35] mt-2 flex-shrink-0 shadow-sm" />
                            <span className="leading-relaxed text-lg">{item}</span>
                        </li>
                        ))}
                    </ul>
                    </div>

                    <div className="bg-[#FDF4ED] p-8 md:p-10 rounded-3xl border border-[#F97316]/20">
                    <h4 className="text-xl font-black text-[#F97316] mb-8 flex items-center gap-3 border-b border-[#F97316]/20 pb-4">
                        <Flame className="w-7 h-7" /> Areas of Weakness
                    </h4>
                    <ul className="space-y-5">
                        {result.weaknesses?.map((item: string, i: number) => (
                        <li key={i} className="flex gap-4 text-[#8B5A2B] font-bold">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#F97316] mt-2 flex-shrink-0 shadow-sm" />
                            <span className="leading-relaxed text-lg">{item}</span>
                        </li>
                        ))}
                    </ul>
                    </div>
                </div>

                {/* 5-Points Feedback Layout */}
                <div className="bg-white p-8 md:p-10 rounded-3xl border border-[#D1C8B8]">
                    <h4 className="text-2xl font-serif font-black text-[#2A2A2A] mb-10 flex items-center gap-4 border-b border-[#E5E0D8] pb-6">
                    <Award className="w-8 h-8 text-[#F97316]" /> Detailed Structural Analysis
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(result.detailedFeedback || {}).map(([key, feedback]: any, idx) => (
                        <div key={idx} className={`bg-[#FDFBF7] rounded-2xl p-6 border border-[#E5E0D8] shadow-sm ${idx === 4 ? 'break-inside-avoid shadow-sm' : ''}`}>
                        <p className="text-[#8B5A2B] text-xs uppercase tracking-widest font-black mb-3">{key}</p>
                        <p className="text-[#666666] text-base leading-relaxed font-bold">{feedback}</p>
                        </div>
                    ))}
                    </div>
                </div>

                {/* Improvement Plan */}
                <div className="bg-[#FDF4ED] p-8 md:p-10 rounded-3xl border border-[#F97316]/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#F97316]" />
                    <h4 className="text-2xl font-serif font-black text-[#F97316] mb-8 flex items-center gap-3 pl-4">
                    <ArrowUpCircle className="w-8 h-8" /> Actionable Improvement Plan
                    </h4>
                    <div className="space-y-5 mb-10 pl-4">
                        {result.improvementPlan?.map((item: string, i: number) => (
                        <div key={i} className="flex gap-5 text-[#8B5A2B] font-bold bg-white p-5 rounded-2xl border border-[#E5E0D8] shadow-sm">
                            <span className="text-[#F97316] font-black text-xl">{i+1}.</span>
                            <span className="text-lg leading-relaxed">{item}</span>
                        </div>
                        ))}
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 pl-4">
                    <div className="bg-white p-8 rounded-3xl border border-[#D1C8B8] shadow-sm">
                        <p className="text-[#F97316] text-[11px] uppercase font-black tracking-widest mb-4 flex items-center gap-2"><PenTool className="w-4 h-4"/> AI Rewritten Intro</p>
                        <p className="text-[#4A4A4A] text-base leading-relaxed italic border-l-4 border-[#F97316] pl-5 font-medium">"{result.rewrittenIntro}"</p>
                    </div>
                    <div className="bg-white p-8 rounded-3xl border border-[#D1C8B8] shadow-sm">
                        <p className="text-[#F97316] text-[11px] uppercase font-black tracking-widest mb-4 flex items-center gap-2"><Lightbulb className="w-4 h-4"/> AI Rewritten Conclusion</p>
                        <p className="text-[#4A4A4A] text-base leading-relaxed italic border-l-4 border-[#F97316] pl-5 font-medium">"{result.rewrittenConclusion}"</p>
                    </div>
                    </div>
                </div>
                </motion.div>
            )}
            </AnimatePresence>
        </section>

        {/* --- SECTION 3: HISTORY --- */}
        <section className="pt-8 border-t border-[#D1C8B8]">
           <div className="flex flex-col md:flex-row items-center justify-between mb-8 pb-4">
              <h3 className="text-2xl font-serif font-black text-[#2A2A2A] flex items-center gap-3 mb-4 md:mb-0"><Clock className="w-6 h-6 text-[#F97316]" /> Evaluation History</h3>
              {history.length > 2 && (
                <button 
                  onClick={() => setShowAllHistory(!showAllHistory)}
                  className="px-6 py-2.5 rounded-xl bg-white hover:bg-[#F3EFE9] text-[#2A2A2A] text-sm font-black transition-colors border border-[#D1C8B8] flex items-center gap-2 shadow-sm"
                >
                  <BookOpen className="w-4 h-4" /> 
                  {showAllHistory ? "Collapse Sub-Tab" : `View Read More (${history.length} Logs)`}
                </button>
              )}
           </div>
           
           <div className="bg-white border border-[#D1C8B8] rounded-3xl overflow-hidden shadow-md">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FDFBF7] text-[#A89F91] text-[10px] uppercase font-black tracking-widest border-b border-[#E5E0D8]">
                     <th className="p-6 w-1/3">Topic / Question</th>
                     <th className="p-6">Input Engine</th>
                     <th className="p-6">Score</th>
                     <th className="p-6">Date & Time</th>
                     <th className="p-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D8]">
                  {displayedHistory.map((hist) => (
                    <tr key={hist.id} className="hover:bg-[#FDF4ED] transition-colors group">
                       <td className="p-6">
                          <p className="text-[#2A2A2A] font-black text-sm md:text-base group-hover:text-[#F97316] transition-colors">{hist.title}</p>
                          <p className="text-[#8B5A2B] text-xs font-bold mt-2 px-3 py-1 bg-[#F3EFE9] inline-block rounded-md tracking-wider">Target: {hist.limit}</p>
                       </td>
                       <td className="p-6 text-[#666666] text-sm font-bold">
                           <div className="flex items-center gap-2 bg-[#F3EFE9] w-max px-3 py-2 rounded-lg border border-[#E5E0D8] shadow-sm text-[#8B5A2B]">
                             {hist.type === "upload" ? <ImageIcon className="w-4 h-4 text-[#F97316]"/> : <PenTool className="w-4 h-4 text-[#F97316]"/>}
                             {hist.type === "upload" ? "Handwritten Image" : "Typed Text"}
                           </div>
                       </td>
                       <td className="p-6">
                          <span className={`px-4 py-2 rounded-xl text-sm font-black ${getScoreColor(hist.score)} shadow-sm`}>
                             {hist.score} / 100
                          </span>
                       </td>
                       <td className="p-6 text-sm font-bold text-[#A89F91]">
                          {hist.date} <br/> <span className="text-[#D1C8B8] text-xs mt-1 inline-block font-black">{hist.time}</span>
                       </td>
                       <td className="p-6 text-center">
                          <button 
                            onClick={() => handleRetake(hist)}
                            className="px-6 py-3 rounded-xl bg-white text-[#F97316] font-black text-xs hover:bg-[#F97316] hover:text-white transition-all flex items-center justify-center gap-2 mx-auto border border-[#D1C8B8] shadow-sm w-full md:w-auto uppercase tracking-wide group-hover:border-[#F97316]"
                          >
                             <RotateCcw className="w-4 h-4"/> Re-Assess
                          </button>
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </section>

      </div>
    </div>
  );
}

export default function MainsEvaluationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white/50"><Loader2 className="w-8 h-8 animate-spin text-[#F97316]" /></div>}>
      <MainsEvaluationContent />
    </Suspense>
  );
}
