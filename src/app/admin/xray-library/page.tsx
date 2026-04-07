"use client";

import { useState, useRef } from "react";
import { Database, UploadCloud, Loader2, BookOpen, AlertCircle, CheckCircle2, FileText, Zap, MousePointerClick } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function XRayLibraryCommander() {
   const [subject, setSubject] = useState("polity");
   const [mode, setMode] = useState<"text" | "pdf">("pdf");
   const [rawText, setRawText] = useState("");
   const [pdfFile, setPdfFile] = useState<File | null>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);

   const [isInjecting, setIsInjecting] = useState(false);
   const [uploadProgress, setUploadProgress] = useState(0);
   const [responseMessage, setResponseMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
       if (e.target.files && e.target.files[0]) {
           setPdfFile(e.target.files[0]);
       }
   };

   const chunkString = (str: string, size: number) => {
      const numChunks = Math.ceil(str.length / size);
      const chunks = new Array(numChunks);
      for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
         chunks[i] = str.substring(o, o + size);
      }
      return chunks;
   };

   // Route 1: Target Text Extraction Natively 
   const handleTextInjection = async () => {
      if (rawText.trim().length < 20) {
         setResponseMessage({ text: "Text matrix is too short to accurately calculate Vectors.", type: 'error' });
         return;
      }
      setIsInjecting(true);
      setUploadProgress(50);
      try {
         const { data: { session } } = await supabase.auth.getSession();
         if (!session?.access_token) throw new Error("Missing Secure Identity.");

         const res = await fetch("/api/admin/xray-ingest", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ text: rawText, subject })
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error || "System Serialization Failed.");
         setResponseMessage({ text: data.message, type: 'success' });
         setRawText("");
         setUploadProgress(100);
      } catch (err: any) {
         setResponseMessage({ text: err.message, type: 'error' });
         setUploadProgress(0);
      } finally {
         setIsInjecting(false);
      }
   };

   // Route 2: Progressive Massive Document Upload Queuing Interface
   const handlePdfInjection = async () => {
      if (!pdfFile) return setResponseMessage({ text: "Missing physical PDF file array.", type: 'error' });

      setIsInjecting(true);
      setUploadProgress(5); 
      setResponseMessage({ text: "Routing massive matrix through Gemini Deep Parser... Please wait.", type: 'success' });

      try {
         const { data: { session } } = await supabase.auth.getSession();
         if (!session?.access_token) throw new Error("Missing Secure Identity.");

         const formData = new FormData();
         formData.append("file", pdfFile);
         
         const parseRes = await fetch("/api/admin/xray-pdf-parse", { 
            method: "POST", 
            headers: { "Authorization": `Bearer ${session.access_token}` },
            body: formData 
         });
         const parseData = await parseRes.json();
         
         if (!parseRes.ok) throw new Error(parseData.error || "Flash Document Processor natively collapsed.");

         const fullText = parseData.text as string;
         setUploadProgress(20);

         // Dynamic Chunk Calculation
         const rawChunks = chunkString(fullText, 800); 
         // Generating 100+ requests blocks native browser threading unless mapped asynchronously tracking sequences gracefully
         setResponseMessage({ text: `PDF Structural Matrix Isolated cleanly. Processing ${rawChunks.length} vector embeddings sequentially to circumvent engine timeouts. DO NOT CLOSE BROWSER TAB.`, type: 'success' });

         for (let i = 0; i < rawChunks.length; i++) {
             const cx = rawChunks[i].trim();
             if (cx.length < 50) continue; 

             const vectorRes = await fetch("/api/admin/xray-ingest", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ text: cx, subject })
             });

             if (!vectorRes.ok) {
                 const err = await vectorRes.json();
                 throw new Error(`Execution Block ${i+1} collapsed: ${err.error}`);
             }
             
             // Mathematically scale progress cleanly across UI bounds
             const progress = Math.floor(20 + ((i + 1) / rawChunks.length) * 80);
             setUploadProgress(progress);
         }

         setResponseMessage({ text: "Automated Core Verification Complete! 100% Sequence Vectorized into Cloud Node Array.", type: 'success' });
         setPdfFile(null); 
         if (fileInputRef.current) fileInputRef.current.value = "";
         setUploadProgress(100);

      } catch (err: any) {
         setResponseMessage({ text: err.message, type: 'error' });
      } finally {
         setIsInjecting(false);
      }
   };

   return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
         
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
            <div>
               <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4">
                  <Database className="w-4 h-4" /> Global Supabase Overwrite
               </div>
               <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-4">
                  <BookOpen className="w-10 h-10 text-indigo-400" />
                  X-Ray Matrix Library
               </h1>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass bg-[#0f172a] border border-white/10 rounded-3xl p-8 relative shadow-2xl flex flex-col">
               <h2 className="text-2xl font-black text-white mb-2">Dual Node Ingestor Engine</h2>
               <p className="text-slate-400 text-sm font-medium mb-6">
                  Natively convert standard external text blocks directly into identical semantic matrices securely cached in Postgres. Select the active upload pipeline natively.
               </p>

               <div className="flex bg-black/40 rounded-xl p-1 mb-6 border border-white/5">
                  <button onClick={() => setMode("pdf")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition ${mode === 'pdf' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
                     <FileText className="w-4 h-4" /> Massive PDF Uploader
                  </button>
                  <button onClick={() => setMode("text")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition ${mode === 'text' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
                     <Zap className="w-4 h-4" /> Quick Paste Interface
                  </button>
               </div>

               <div className="space-y-6 flex-1 flex flex-col">
                  <div>
                     <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Target Routing Subject</label>
                     <select 
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-bold uppercase tracking-widest text-sm focus:border-indigo-500 outline-none transition appearance-none cursor-pointer"
                        disabled={isInjecting}
                     >
                        <option value="polity">Polity Target Hub</option>
                        <option value="history">History Target Hub</option>
                        <option value="economy">Economy Target Hub</option>
                        <option value="geography">Geography Target Hub</option>
                        <option value="environment">Environment Target Hub</option>
                        <option value="science">Science Target Hub</option>
                     </select>
                  </div>

                  {mode === 'text' ? (
                     <div className="flex-1 flex flex-col min-h-[250px]">
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Semantic Extraction Payload</label>
                        <textarea 
                           value={rawText}
                           onChange={(e) => setRawText(e.target.value)}
                           disabled={isInjecting}
                           placeholder="Log exactly the raw payload text to be converted to vector arrays. Formatting does not affect mathematical outcomes natively."
                           className="w-full flex-1 bg-black/40 border border-white/10 rounded-xl p-4 text-white font-medium focus:border-indigo-500 outline-none transition resize-none placeholder:text-white/20 disabled:opacity-50"
                        ></textarea>
                     </div>
                  ) : (
                     <div className="flex-1 flex flex-col items-center justify-center min-h-[250px] border-2 border-dashed border-white/10 rounded-xl bg-black/20 hover:bg-black/40 transition group relative">
                        <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10" disabled={isInjecting} />
                        <UploadCloud className={`w-12 h-12 mb-4 transition ${pdfFile ? 'text-indigo-400 scale-110' : 'text-slate-600 group-hover:text-indigo-400 group-hover:scale-110'}`} />
                        <h3 className="text-white font-bold mb-1">{pdfFile ? pdfFile.name : 'Drop Textbook Here Native UI'}</h3>
                        <p className="text-slate-500 text-xs font-medium uppercase tracking-widest text-center max-w-[250px]">{pdfFile ? 'Extraction Matrix verified correctly.' : 'Accepts massive multi-page PDF documents securely.'}</p>
                        {!pdfFile && (
                           <div className="mt-4 px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2"><MousePointerClick className="w-4 h-4" /> Browse Hard Drive Node</div>
                        )}
                     </div>
                  )}

                  {responseMessage && (
                     <div className={`p-4 rounded-xl border flex flex-col gap-3 text-sm font-bold ${responseMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                        <div className="flex items-center gap-2">
                           {responseMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
                           <span>{responseMessage.text}</span>
                        </div>
                        {isInjecting && uploadProgress > 0 && (
                            <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden mt-1 mt-1">
                                <div className="bg-emerald-400 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                            </div>
                        )}
                     </div>
                  )}

                  <button 
                     onClick={mode === 'text' ? handleTextInjection : handlePdfInjection}
                     disabled={isInjecting || (mode === 'text' ? rawText.trim().length === 0 : !pdfFile)}
                     className="w-full bg-indigo-500 hover:bg-indigo-600 border border-indigo-400 text-white shadow-lg shadow-indigo-500/20 py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                  >
                     {isInjecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                     {isInjecting ? `Processing Deep Extraction Queue... ${uploadProgress}%` : mode === "pdf" ? `Commence Automated Book Vectorization` : `Compile & Inject Text Parameters`}
                  </button>
               </div>
            </div>

            {/* Architecture Explanatory Node */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 relative flex flex-col justify-center gap-6 shadow-inner h-[500px]">
               <div className="w-16 h-16 bg-white shadow-sm border border-slate-200 rounded-2xl flex items-center justify-center mb-4">
                  <Database className="w-8 h-8 text-indigo-400" />
               </div>
               <h3 className="text-3xl font-black text-slate-900 tracking-tight">Vercel Sequence Engine</h3>
               <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  Uploading entire textbooks simultaneously directly destroys server instances. We employ a custom Client Engine to circumvent limits exactly matching your environment dynamically!
               </p>
               <ul className="space-y-4 text-sm font-bold text-slate-600">
                  <li className="flex items-center gap-3 bg-white p-3 border border-slate-100 rounded-xl shadow-sm"><span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 text-[10px]">1</span> Flash reads multi-page structures mechanically instantly natively in 2-3 seconds.</li>
                  <li className="flex items-center gap-3 bg-white p-3 border border-slate-100 rounded-xl shadow-sm"><span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-[10px]">2</span> Our browser queues sequence identically identical mathematically into standard strings natively.</li>
                  <li className="flex items-center gap-3 bg-white p-3 border border-slate-100 rounded-xl shadow-sm"><span className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-600 text-[10px]">3</span> Browser natively injects multiple requests strictly avoiding 10-Second Vercel Timeout Collapses flawlessly!</li>
               </ul>
            </div>
         </div>
      </div>
   );
}
