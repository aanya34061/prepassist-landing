"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, Plus, Save, Loader2, CheckCircle2, FileText, UploadCloud, BrainCircuit, X, XCircle, FileType, CheckCircle } from "lucide-react";
import { addQuestion, bulkAddQuestions, fetchQuestions, Question } from "@/lib/questions";
import { formatUPSC } from "@/lib/formatUPSC";

// Simple Javascript CSV Parser to avoid external dependencies. Supports quotes containing commas.
function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let token = "";
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
     const c = text[i];
     if (c === '"') {
        if (inQuotes && text[i+1] === '"') {
           token += '"'; i++; // escaped quote
        } else {
           inQuotes = !inQuotes;
        }
     } else if (c === ',' && !inQuotes) {
        row.push(token.trim());
        token = "";
     } else if ((c === '\n' || c === '\r') && !inQuotes) {
        if (c === '\r' && text[i+1] === '\n') i++; // windows newline skip
        row.push(token.trim());
        if (row.some(t => t.length > 0)) result.push(row); // only push non-empty rows
        row = [];
        token = "";
     } else {
        token += c;
     }
  }
  if (token || row.length > 0) {
     row.push(token.trim());
     if (row.some(t => t.length > 0)) result.push(row);
  }
  return result;
}

export default function QuestionBankAdmin() {
  const [tab, setTab] = useState<"manual" | "bulk">("bulk");

  // Manual Entry
  const [question, setQuestion] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState<'A'|'B'|'C'|'D'>("A");
  const [explanation, setExplanation] = useState("");
  
  // Bulk CSV State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [parsedValid, setParsedValid] = useState<Omit<Question, 'id' | 'createdAt'>[]>([]);
  const [parsedInvalid, setParsedInvalid] = useState<{row: number, reason: string}[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isInjectingBulk, setIsInjectingBulk] = useState(false);

  // Global State
  const [adminLanguage, setAdminLanguage] = useState<"English" | "Hindi">("English");
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [recentQuestions, setRecentQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadQuestions(adminLanguage); }, [adminLanguage]);

  const loadQuestions = async (lang: string) => {
    setIsLoading(true);
    const data = await fetchQuestions(10, lang);
    setRecentQuestions(data);
    setIsLoading(false);
  };

  const handleManualPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || !optionA || !optionB || !optionC || !optionD || !explanation) return;
    
    setIsSaving(true);
    try {
      await addQuestion({ language: adminLanguage, question, optionA, optionB, optionC, optionD, correctAnswer, explanation });
      setSuccess(true);
      setQuestion(""); setOptionA(""); setOptionB(""); setOptionC(""); setOptionD(""); setExplanation("");
      loadQuestions(adminLanguage);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert("Failed to inject Question into Firebase.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     setBulkFile(file);
     setIsParsing(true);
     setParsedValid([]);
     setParsedInvalid([]);

     try {
        const text = await file.text();
        const rows = parseCSV(text);
        
        // Assume row 0 might be headers: question, optionA, optionB, optionC, optionD, correctAnswer, explanation
        const hasHeaders = rows[0]?.some(h => h.toLowerCase().includes('question') || h.toLowerCase().includes('option'));
        const dataRows = hasHeaders ? rows.slice(1) : rows;

        const valid: Omit<Question, 'id' | 'createdAt'>[] = [];
        const invalid: {row: number, reason: string}[] = [];

        dataRows.forEach((row, idx) => {
           const rowNum = hasHeaders ? idx + 2 : idx + 1;
           // We need exactly 7 populated columns
           if (row.length < 7) {
              invalid.push({ row: rowNum, reason: "Missing columns: Found " + row.length + "/7 required columns." });
              return;
           }
           
           const [q, a, b, c, d, ans, exp] = row;
           const cleanAns = ans.trim().toUpperCase();
           
           if (!q || !a || !b || !c || !d || !exp) {
              invalid.push({ row: rowNum, reason: "One or more required fields are completely empty." });
              return;
           }

           if (!['A','B','C','D'].includes(cleanAns)) {
              invalid.push({ row: rowNum, reason: "Invalid Correct Answer '" + ans + "'. Must be A, B, C, or D." });
              return;
           }

           valid.push({ language: adminLanguage, question: q, optionA: a, optionB: b, optionC: c, optionD: d, correctAnswer: cleanAns as any, explanation: exp });
        });

        setParsedValid(valid);
        setParsedInvalid(invalid);
     } catch (err: any) {
        alert("CRASH LOG: CSV Parsing Failed - " + err.message);
     } finally {
        setIsParsing(false);
     }
  };

    const approveAndInjectBulk = async () => {
     if (parsedValid.length === 0) return;
     setIsInjectingBulk(true);
     try {
        await bulkAddQuestions(parsedValid);
        setSuccess(true);
        setParsedValid([]);
        setParsedInvalid([]);
        setBulkFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        loadQuestions(adminLanguage);
        alert("SUCCESS: Injected exactly " + parsedValid.length + " secure Questions into the Database array!");
        setTimeout(() => setSuccess(false), 3000);
     } catch (error: any) {
        alert("CRASH LOG: " + error.message);
     } finally {
        setIsInjectingBulk(false);
     }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-12">
       <header className="mb-12 max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
         <motion.div initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}}>
           <p className="text-emerald-600 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2">
              <Database className="w-4 h-4"/> Firebase Questions DB
           </p>
           <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Question Bank Admin</h1>
         </motion.div>
         
         <div className="flex gap-4">
             <div className="bg-white border border-slate-200 rounded-2xl p-1 shrink-0 shadow-sm backdrop-blur-xl flex items-center">
               <select value={adminLanguage} onChange={e => setAdminLanguage(e.target.value as any)} className="bg-transparent text-sm font-bold text-slate-700 outline-none px-4 py-2 cursor-pointer w-full h-full">
                  <option value="English">ENG Nodes</option>
                  <option value="Hindi">HIN Nodes</option>
               </select>
             </div>
             <div className="flex bg-white border border-slate-200 rounded-2xl p-1 shrink-0 shadow-sm backdrop-blur-xl">
                <button onClick={() => setTab("bulk")} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'bulk' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>
                   Bulk CSV Pipeline
                </button>
                <button onClick={() => setTab("manual")} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'manual' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>
                   Manual Injection
                </button>
             </div>
         </div>
       </header>

       <div className="max-w-[1600px] mx-auto grid lg:grid-cols-12 gap-10">
          
          {/* DATA ENTRY PANEL (LEFT/CENTER) */}
          <div className={`flex flex-col gap-6 h-max transition-all duration-300 ${tab === 'manual' ? 'lg:col-span-8 lg:col-start-3' : 'lg:col-span-5'}`}>
             
             {success && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3 text-emerald-600 shadow-[0_0_20px_rgba(52,211,153,0.1)]">
                   <CheckCircle2 className="w-5 h-5"/>
                   <span className="font-bold">Successfully injected directly into Firestore Arrays!</span>
                </div>
             )}

             <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl">
                {tab === "manual" ? (
                  <form onSubmit={handleManualPublish} className="space-y-6">
                     <h2 className="text-xl font-bold flex items-center gap-3 border-b border-slate-200 pb-4 mb-6 text-slate-900">
                        <Plus className="w-6 h-6 text-indigo-500" /> Hardcode Question
                     </h2>
                     <div>
                        <label className="text-xs uppercase tracking-widest text-indigo-600 font-bold mb-2 block">UPSC Question Root</label>
                        <textarea required value={question} onChange={e => setQuestion(e.target.value)} className="w-full h-24 bg-slate-50 rounded-xl p-4 border border-slate-200 focus:border-indigo-500 outline-none resize-none transition-colors text-slate-900 placeholder:text-slate-400" placeholder="Consider the following statements..."/>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Option A</label>
                           <input type="text" required value={optionA} onChange={e=>setOptionA(e.target.value)} className="w-full bg-slate-50 rounded-lg p-3 border border-slate-200 outline-none text-sm text-slate-900" />
                        </div>
                        <div>
                           <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Option B</label>
                           <input type="text" required value={optionB} onChange={e=>setOptionB(e.target.value)} className="w-full bg-slate-50 rounded-lg p-3 border border-slate-200 outline-none text-sm text-slate-900" />
                        </div>
                        <div>
                           <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Option C</label>
                           <input type="text" required value={optionC} onChange={e=>setOptionC(e.target.value)} className="w-full bg-slate-50 rounded-lg p-3 border border-slate-200 outline-none text-sm text-slate-900" />
                        </div>
                        <div>
                           <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Option D</label>
                           <input type="text" required value={optionD} onChange={e=>setOptionD(e.target.value)} className="w-full bg-slate-50 rounded-lg p-3 border border-slate-200 outline-none text-sm text-slate-900" />
                        </div>
                     </div>

                     <div>
                        <label className="text-xs uppercase tracking-widest text-indigo-600 font-bold mb-2 block">Correct Answer Key</label>
                        <select required value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value as any)} className="w-full bg-slate-50 rounded-xl p-4 border border-slate-200 focus:border-indigo-500 outline-none text-slate-900">
                          <option value="A">Option A</option> <option value="B">Option B</option> <option value="C">Option C</option> <option value="D">Option D</option>
                        </select>
                     </div>

                     <div>
                        <label className="text-xs uppercase tracking-widest text-indigo-600 font-bold mb-2 block">Detailed Analysis / Explanation</label>
                        <textarea required value={explanation} onChange={e => setExplanation(e.target.value)} className="w-full h-32 bg-slate-50 rounded-xl p-4 border border-slate-200 focus:border-indigo-500 outline-none resize-none transition-colors text-slate-900 placeholder:text-slate-400" placeholder="Detailed syllabus breakdown proving why this is the strictly correct answer..." />
                     </div>

                     <button type="submit" disabled={isSaving} className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 rounded-2xl font-black text-lg transition-colors flex justify-center items-center gap-3 disabled:opacity-50 text-white">
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>} Push to Question Bank
                     </button>
                  </form>
                ) : (
                  <div className="space-y-8">
                     <h2 className="text-xl font-bold flex items-center gap-3 border-b border-slate-200 pb-4 text-slate-900">
                        <FileType className="w-6 h-6 text-emerald-500" /> CSV Deep Pipeline
                     </h2>
                     <p className="text-slate-600 text-sm font-medium leading-relaxed">Ensure your CSV operates precisely with completely clean commas matching exactly 7 columns in order: <span className="text-indigo-600 block mt-2 text-xs font-mono bg-slate-50 p-2 rounded-lg border border-slate-200">Question, OptionA, OptionB, OptionC, OptionD, CorrectAnswer(A/B/C/D), Explanation</span></p>

                     <div>
                        <label className={`w-full h-48 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all ${bulkFile ? 'border-emerald-500/50 bg-emerald-50/50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}`}>
                           <input type="file" ref={fileInputRef} accept=".csv" className="hidden" onChange={handleFileUpload} />
                           {isParsing ? (
                              <>
                                <Loader2 className="w-10 h-10 text-emerald-500 mb-3 animate-spin" />
                                <span className="font-bold text-emerald-600">Parsing Matrix Nodes...</span>
                              </>
                           ) : bulkFile ? (
                             <>
                               <CheckCircle className="w-10 h-10 text-emerald-500 mb-3" />
                               <span className="font-bold text-emerald-600 text-center px-4">{bulkFile.name}</span>
                               <span className="text-xs uppercase tracking-widest text-emerald-600/60 mt-1">{(bulkFile.size / 1024).toFixed(1)} KB DATA</span>
                             </>
                           ) : (
                             <>
                               <UploadCloud className="w-10 h-10 text-slate-400 mb-3" />
                               <span className="font-bold text-slate-500">Upload Source Data Array (.csv)</span>
                             </>
                           )}
                        </label>
                     </div>
                  </div>
                )}
             </motion.div>
          </div>

          {/* PARSING REPORT / VIEWER (RIGHT) */}
          {tab === "bulk" && (
             <div className="lg:col-span-7 flex flex-col gap-6 h-[85vh]">
                
                {bulkFile && !isParsing && (
               <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
                     <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                       Compiler Verification Report
                     </h3>
                     <span className="bg-slate-50 px-4 py-2 rounded-xl text-xs font-black uppercase text-slate-500 border border-slate-200">Strict Validation</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-8">
                     <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
                        <span className="text-4xl font-black text-emerald-600 block mb-2">{parsedValid.length}</span>
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-600/80">Valid Arrays Ready</span>
                     </div>
                     <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
                        <span className="text-4xl font-black text-rose-600 block mb-2">{parsedInvalid.length}</span>
                        <span className="text-xs font-bold uppercase tracking-widest text-rose-600/80">Critical Corruptions</span>
                     </div>
                  </div>

                  {parsedInvalid.length > 0 && (
                     <div className="mb-8">
                        <h4 className="text-sm font-black uppercase tracking-widest text-rose-500 flex items-center gap-2 mb-4">
                           <XCircle className="w-4 h-4" /> Dropped Rows (Ignored)
                        </h4>
                        <div className="space-y-2">
                           {parsedInvalid.slice(0, 50).map((inv, idx) => (
                              <div key={idx} className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start gap-4">
                                 <span className="bg-rose-100 text-rose-600 text-[10px] font-black uppercase px-2 py-1 rounded-md mt-0.5">Row {inv.row}</span>
                                 <span className="text-sm font-medium text-slate-700">{inv.reason}</span>
                              </div>
                           ))}
                           {parsedInvalid.length > 50 && (
                              <p className="text-xs text-rose-500/80 font-bold text-center mt-4">+ {parsedInvalid.length - 50} more errors omitted...</p>
                           )}
                        </div>
                     </div>
                  )}

                  <button 
                     onClick={approveAndInjectBulk}
                     disabled={isInjectingBulk || parsedValid.length === 0}
                     className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-lg transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                     {isInjectingBulk ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>} Push {parsedValid.length} Active Nodes
                  </button>
               </motion.div>
             )}

             {/* Standard Live Database Fallback */}
             {tab === "bulk" && !bulkFile && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl flex flex-col flex-1 overflow-hidden">
                   <div className="p-8 border-b border-slate-200 flex items-center justify-between">
                      <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                         <Database className="w-5 h-5 text-indigo-500" /> Recent Injections (Top 10)
                      </h3>
                   </div>
                   
                   <div className="p-8 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                      {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-50">
                           <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                        </div>
                      ) : recentQuestions.length === 0 ? (
                        <div className="text-center p-10 opacity-50 border border-dashed border-slate-300 rounded-3xl">
                           <FileText className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                           <p className="font-bold text-xl text-slate-500">Database array is bare.</p>
                        </div>
                      ) : (
                        recentQuestions.map(q => (
                          <div key={q.id} className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                             <div className="flex gap-4">
                               <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 font-black text-sm shrink-0 mt-1">
                                 {q.correctAnswer}
                               </div>
                               <div>
                                 <h4 className="font-bold text-slate-800 mb-3 whitespace-pre-wrap">{formatUPSC(q.question)}</h4>
                                 <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg inline-block">
                                   Explanation Array Attached
                                 </p>
                               </div>
                             </div>
                          </div>
                        ))
                      )}
                   </div>
                </div>
             )}
          </div>
          )}
       </div>
    </div>
  );
}
