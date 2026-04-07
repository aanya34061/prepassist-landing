"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Send, UploadCloud, Database, Sparkles, Loader2, Key, Clock, ArrowRight, BookOpen, Plus, Network, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { deductCredit } from "@/lib/credits";
import { fetchRagHistory, saveRagHistory, RAGHistoryEntry } from "@/lib/rag_history";
import { saveCloudNote, CORE_SUBJECTS, OPTIONAL_SUBJECTS, OTHER_SUBJECTS } from "@/lib/cloud_notes";

export default function RAGNotesPage() {
  const [insufficientCredits, setInsufficientCredits] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Knowledge Ingestion
  const [ingestText, setIngestText] = useState("");
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  // RAG Chat Engine
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{role: 'user'|'assistant', content: string}[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // History & Persistence
  const [history, setHistory] = useState<RAGHistoryEntry[]>([]);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [activeNoteContent, setActiveNoteContent] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: any) => {
       if (data.session?.user) {
         setUserId(data.session.user.id);
         loadHistory(data.session.user.id);
       }
    });
  }, []);

  const loadHistory = async (uid: string) => {
    const hist = await fetchRagHistory(uid);
    setHistory(hist);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSeed = async () => {
     if (!ingestText.trim()) return alert("Provide contextual data to embed.");
     setIsSeeding(true);
     setSeedSuccess(false);
     
     try {
        const res = await fetch('/api/notes/seed', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ content: ingestText, source: "Manual User Input Natively" })
        });
        
        if (!res.ok) throw new Error("Vector Embedding Failed.");
        
        setIngestText("");
        setSeedSuccess(true);
        setTimeout(() => setSeedSuccess(false), 3000);
     } catch (err) {
        alert("Failed to seed vector DB.");
     } finally {
        setIsSeeding(false);
     }
  };

  const handleGenerate = async () => {
     if (!query.trim()) return;
     if (!userId) return alert("Secure Authentication Required.");

     const userQ = query;
     setQuery("");
     setMessages([{ role: 'user', content: userQ }]);
     setIsGenerating(true);

     try {
        await deductCredit(userId, 4, "RAG Knowledge Synthesis");
     } catch (creditErr: any) {
        setIsGenerating(false);
        if (creditErr.message === "INSUFFICIENT_CREDITS") {
           return setInsufficientCredits(true);
        } else {
           setMessages(prev => [...prev, { role: 'assistant', content: `[LEDGER ERROR] Database synchronization failed.` }]);
        }
        return;
     }

     try {
        const res = await fetch('/api/notes/generate', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ topic: userQ })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        const answer = data.resultText || data.markdownContext || "Generation failed";
        setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
        
        await saveRagHistory(userId, userQ, answer);
        loadHistory(userId);
     } catch (err: any) {
        setMessages(prev => [...prev, { role: 'assistant', content: `[RAG System Error: ${err.message}]` }]);
     } finally {
        setIsGenerating(false);
     }
  };

  const openSaveNotesModal = (content: string) => {
     setActiveNoteContent(content);
     setIsNotesModalOpen(true);
  };

  const commitToNotesTracker = async () => {
     if (!selectedSubject) return alert("Select a subject mapping.");
     if (!userId) return;
     
     setIsSavingNote(true);
     try {
        const titleMatch = activeNoteContent.split('\n')[0].replace(/#/g, '').trim();
        const baseTitle = titleMatch ? titleMatch.substring(0, 40) + "..." : "RAG Synthesis Note";
        
        await saveCloudNote({
           userId,
           title: baseTitle,
           subject: selectedSubject,
           categoryType: 'core',
           type: 'text',
           content: activeNoteContent,
           fileUrl: '',
           sourceUrl: '',
           hasUpdates: false
        });
        
        alert("Saved to Notes Tracker Successfully!");
        setIsNotesModalOpen(false);
     } catch (e) {
        alert("Failed to securely save to Notes Tracker.");
     } finally {
        setIsSavingNote(false);
     }
  };

  const loadFromHistory = (hist: RAGHistoryEntry) => {
     setMessages([
        { role: 'user', content: hist.query },
        { role: 'assistant', content: hist.answer }
     ]);
     window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Ultra-Fast Native Markdown Parser for Rich Text Generation
  const formatRichText = (text: string) => {
     // Replace isolated hashes ## Heading with Bold blocks
     let formatted = text.replace(/### (.*?)\n/g, '<span class="block text-lg font-black text-slate-800 mt-6 mb-2 border-b border-slate-100 pb-2">$1</span>\n');
     formatted = formatted.replace(/## (.*?)\n/g, '<span class="block text-xl font-black text-slate-900 mt-8 mb-3 border-b border-slate-200 pb-2">$1</span>\n');
     formatted = formatted.replace(/# (.*?)\n/g, '<span class="block text-2xl font-black text-indigo-900 mt-8 mb-4">$1</span>\n');
     
     // Replace Bolds **text**
     formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-slate-800">$1</strong>');
     
     // Replace Italics *text*
     formatted = formatted.replace(/\*(.*?)\*/g, '<em class="text-slate-700 italic">$1</em>');

     return formatted;
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-900 p-6 md:p-12 font-serif overflow-x-hidden selection:bg-indigo-500/30">

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

      
      {/* Structural Header Area */}
      <header className="max-w-5xl mx-auto mb-16 flex flex-col items-center text-center gap-8">
         <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs font-black uppercase tracking-widest mb-6 tracking-[0.2em]">
               <Database className="w-4 h-4" /> Multi-Source Synthesis
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 mb-6 drop-shadow-sm font-sans">
               Retrieval-Augmented Logic
            </h1>
            <div className="text-slate-500 font-medium max-w-4xl mx-auto font-sans leading-relaxed bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
               <p className="text-lg text-slate-700 font-bold mb-6">
                  This intelligent engine seamlessly combines three isolated vectors to generate an exhaustive, comprehensive Answer or Note exclusively styled in the UPSC Civil Services format:
               </p>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-8">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                     <div className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-2">Source 1</div>
                     <h4 className="font-bold text-slate-800 text-lg mb-1">Vault Uploads</h4>
                     <p className="text-sm text-slate-500">Searches across all documents and notes you explicitly uploaded to extraction arrays.</p>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                     <div className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-2">Source 2</div>
                     <h4 className="font-bold text-slate-800 text-lg mb-1">Current Affairs DB</h4>
                     <p className="text-sm text-slate-500">Matches daily events and real-time statistics aggregated natively by our system.</p>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                     <div className="text-xs font-black uppercase tracking-widest text-amber-500 mb-2">Source 3</div>
                     <h4 className="font-bold text-slate-800 text-lg mb-1">Core AI Knowledge</h4>
                     <p className="text-sm text-slate-500">Deep structural weights filling conceptual gaps mathematically scaling the output.</p>
                  </div>
               </div>

               <div className="text-left bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100/50">
                  <h4 className="font-black text-indigo-900 mb-3 flex items-center gap-2"><div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div> Instructions to Use</h4>
                  <ul className="text-sm text-slate-700 space-y-2 list-disc list-inside marker:text-indigo-300">
                     <li>Type an explicit UPSC query or topic in the generation box below.</li>
                     <li>Click <strong>Synthesize</strong> to trigger the neural matching (Costs 4 Credits).</li>
                     <li>Review the multi-source dimensional breakdown mapping Historical Analysis to Current Events natively.</li>
                     <li>Click <strong>Save to Notes Tracker</strong> explicitly committing it permanently to your CloudVault!</li>
                  </ul>
               </div>

               <div className="mt-8 text-center pt-6 border-t border-slate-100">
                  <span className="text-indigo-600 font-black tracking-widest uppercase bg-indigo-50 px-4 py-2 rounded-lg text-sm border border-indigo-100">
                     Costs 4 AI Credits Per Execution
                  </span>
               </div>
            </div>
         </div>

         {/* Generation Input Grid */}
         <div className="w-full max-w-4xl bg-white p-2 rounded-2xl border border-slate-200 flex shadow-xl shadow-slate-200/50 mt-4 relative z-20">
            <input 
               type="text"
               value={query}
               onChange={(e) => setQuery(e.target.value)}
               placeholder="Enter Complex Query (e.g., Analyze the evolution of Federalism in India)..."
               className="flex-1 bg-transparent border-none outline-none px-6 text-lg font-medium text-slate-800 placeholder-slate-400 font-sans"
               onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <button 
               onClick={handleGenerate}
               disabled={isGenerating || !query.trim()}
               className="px-8 py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold transition-all flex items-center gap-2 font-sans"
            >
               {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-5 h-5 text-indigo-400" /> Synthesize</>}
            </button>
         </div>
      </header>

      <div className="max-w-4xl mx-auto font-sans mb-16">
         {/* RAG Chat Matrix */}
         {messages.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/40 relative">
               <div className="space-y-8">
                  {messages.map((m, idx) => (
                     <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        key={idx} 
                        className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                     >
                        <div className={`p-6 rounded-2xl max-w-[95%] leading-relaxed shadow-sm border ${m.role === 'user' ? 'bg-slate-900 border-slate-800 text-white rounded-tr-sm' : 'bg-slate-50 border-slate-200 text-slate-800 rounded-tl-sm w-full'}`}>
                           <div className="flex items-center justify-between mb-4 border-b border-black/5 pb-4">
                              {m.role === 'user' ? (
                                 <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">User Sequence</div>
                              ) : (
                                 <div className="flex items-center gap-3">
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 flex items-center gap-1 bg-indigo-100 px-3 py-1 rounded-md border border-indigo-200">
                                       <Sparkles className="w-3 h-3"/> Multi-Source Output
                                    </div>
                                 </div>
                              )}

                              {m.role === 'assistant' && !isGenerating && (
                                 <button onClick={() => openSaveNotesModal(m.content)} className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900 px-4 py-2 rounded-lg transition-colors shadow-sm">
                                    <BookOpen className="w-4 h-4 text-emerald-500"/> Save to Notes Tracker
                                 </button>
                              )}
                           </div>
                           <div 
                              className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-slate-700"
                              dangerouslySetInnerHTML={{ __html: m.role === 'assistant' ? formatRichText(m.content + '\n') : m.content }}
                           />
                        </div>
                     </motion.div>
                  ))}
               </div>
               
               {isGenerating && (
                  <div className="mt-8 flex justify-start">
                     <div className="px-6 py-4 rounded-2xl bg-white border border-slate-200 text-slate-500 rounded-tl-sm w-full flex items-center justify-center gap-3 font-semibold shadow-sm animate-pulse">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-600"/> Scanning Semantic Database (Vault / Current Affairs / Logic)...
                     </div>
                  </div>
               )}
               <div ref={chatEndRef} />
            </div>
         )}
      </div>

      {/* Manual Vector Seeding Layer */}
      <div className="max-w-4xl mx-auto mb-16">
         <div className="bg-white border border-slate-200 rounded-3xl flex flex-col overflow-hidden shadow-sm font-sans hover:shadow-md transition-shadow">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
               <h2 className="font-bold flex items-center gap-2 text-slate-800">
                  <UploadCloud className="w-5 h-5 text-indigo-500"/> Explicit Pre-Training Ingestion
               </h2>
               <span className="text-xs font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 px-3 py-1 rounded-md border border-emerald-200">Vector Space Active</span>
            </div>
            <div className="p-6 flex flex-col gap-4">
               <textarea
                  value={ingestText}
                  onChange={(e) => setIngestText(e.target.value)}
                  placeholder="Paste raw unstructured text natively here to aggressively fuse it into the internal Vector Embeddings array globally..."
                  className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none font-sans text-sm"
               />
               <button 
                  onClick={handleSeed}
                  disabled={isSeeding || !ingestText.trim()}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2 self-end disabled:opacity-50 transition-colors"
               >
                  {isSeeding ? <Loader2 className="w-5 h-5 animate-spin"/> : <Key className="w-4 h-4 text-emerald-400"/>}
                  {seedSuccess ? "Embed Success" : "Commit to Neural Vector"}
               </button>
            </div>
         </div>
      </div>

      {/* Persistence Cached History Grid */}
      <section className="max-w-5xl mx-auto pt-16 border-t border-slate-200 relative z-20 font-sans pb-32">
         <h3 className="text-2xl font-black mb-8 flex items-center gap-3 text-slate-800"><Clock className="w-6 h-6 text-slate-400" /> Recent Extractions (0 Credits)</h3>
         {history.length === 0 ? (
            <div className="text-center p-12 rounded-3xl bg-slate-50 border border-slate-100 text-slate-400 font-bold uppercase tracking-widest text-sm">No historical RAG arrays extracted.</div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {history.map(hist => (
                  <div key={hist.id} onClick={() => loadFromHistory(hist)} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg cursor-pointer transition-all hover:-translate-y-1 group flex flex-col justify-between min-h-[160px]">
                     <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-200 group-hover:bg-slate-900 group-hover:text-indigo-400 text-slate-400 transition-colors shrink-0 mt-1">
                           <Database className="w-5 h-5" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                           <h4 className="font-bold text-slate-800 text-base line-clamp-3 leading-snug">{hist.query}</h4>
                        </div>
                     </div>
                     <div className="flex items-center justify-between mt-4">
                        <span className="text-[10px] font-black tracking-[0.2em] uppercase text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-100">
                           {hist.createdAt ? new Date(hist.createdAt.seconds * 1000).toLocaleDateString() : 'Active'}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-800 transition-colors" />
                     </div>
                  </div>
               ))}
            </div>
         )}
      </section>

      {/* Save to Notes Modal */}
      <AnimatePresence>
      {isNotesModalOpen && (
         <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm font-sans"
         >
            <motion.div 
               initial={{ scale: 0.95, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl border border-slate-100 relative"
            >
               <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Save to Notes Tracker</h3>
               <p className="text-slate-500 text-sm font-medium mb-8">Securely commit this structural RAG synthesis. It will natively map into your CloudVault with the <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Updates: Disabled</span> bell schema natively!</p>
               
               <div className="mb-8">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 block">UPSC Subject Mapping</label>
                  <select 
                     value={selectedSubject}
                     onChange={(e) => setSelectedSubject(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                     <option value="" disabled>Strictly isolate Subject...</option>
                     <optgroup label="Core General Studies">
                        {CORE_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                     </optgroup>
                     <optgroup label="Optional Subsystems">
                        {OPTIONAL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                     </optgroup>
                  </select>
               </div>
               
               <div className="flex gap-4">
                  <button 
                     onClick={() => setIsNotesModalOpen(false)}
                     className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold transition-all"
                  >
                     Cancel Phase
                  </button>
                  <button 
                     onClick={commitToNotesTracker}
                     disabled={isSavingNote || !selectedSubject}
                     className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                  >
                     {isSavingNote ? <Loader2 className="w-4 h-4 animate-spin"/> : <BookOpen className="w-4 h-4 text-emerald-400"/>}
                     Commit Structure
                  </button>
               </div>
            </motion.div>
         </motion.div>
      )}
      </AnimatePresence>

    </div>
  );
}
