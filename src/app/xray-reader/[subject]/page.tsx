"use client";

import { useState, use, useEffect } from "react";
import XrayDrawer from "@/components/XrayDrawer";
import { UploadCloud, ScanSearch, Loader2, Bot, FileText, Image as ImageIcon, Info, History, Database, Wand2 } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

interface XRayReaderProps {
  params: Promise<{
    subject: string;
  }>;
}

export default function XRayDynamicSubjectPage({ params }: XRayReaderProps) {
  const { subject } = use(params);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  // Capitalize subject dynamically
  const displaySubject = subject.charAt(0).toUpperCase() + subject.slice(1);

  // Load Real-time Firebase Extraction History
  useEffect(() => {
     let unsub = () => {};
     const loadHistory = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
           const q = query(collection(db, "users", user.id, "xray_history"), orderBy("createdAt", "desc"));
           unsub = onSnapshot(q, (snap) => {
              const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
              // Client-side filtering deliberately avoids Firebase Composite Index requirements
              setHistory(docs.filter((d: any) => d.subject === displaySubject));
           });
        }
     };
     loadHistory();
     return () => unsub();
  }, [displaySubject]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const triggerCrewAIEngine = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setParsedData(null);
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
         alert("Secure User Token missing. Please reload your dashboard.");
         setIsUploading(false);
         return;
      }

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("subject", displaySubject);

      const response = await fetch('/api/xray-agent', {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${session.access_token}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        setParsedData(data);
        setIsDrawerOpen(true);
      } else {
        console.error("Agent Engine failed:", data.error);
        alert(data.error || "CrewAI Python Proxy Failed.");
      }
    } catch (e) {
      console.error(e);
      alert("Network Error pinging Agent Interface.");
    } finally {
      setIsUploading(false);
    }
  };

  const openHistoryItem = (itemPayload: any) => {
     setParsedData(itemPayload);
     setIsDrawerOpen(true);
  };

  return (
    <div className="min-h-screen bg-white p-6 md:p-10">
      <div className="w-full space-y-8">
        
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-4 rounded-3xl shadow-lg shadow-indigo-200 ring-4 ring-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 bg-white/20 rounded-full blur-xl"></div>
              <Bot className="w-10 h-10 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                 <span className="bg-indigo-100 text-indigo-700 uppercase tracking-widest text-[10px] font-black px-2 py-1 rounded border border-indigo-200">
                    Smart Scanner Tool
                 </span>
                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                {displaySubject} X-Ray Matrix
              </h1>
              <p className="text-slate-500 font-medium mt-1">Upload a snapshot of any textbook page to receive an instant, highly detailed mentorship analysis.</p>
            </div>
          </div>
        </header>

        {/* Dynamic Instructional / Concept Module */}
        <section className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-950 border border-white/10 rounded-3xl p-8 relative overflow-hidden text-white shadow-xl shadow-indigo-900/20">
           <div className="absolute top-0 right-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
           <div className="absolute bottom-0 left-[-10%] w-64 h-64 bg-sky-500/20 rounded-full blur-3xl"></div>
           
           <h2 className="text-lg font-black tracking-widest uppercase text-indigo-300 flex items-center gap-2 mb-4 relative z-10">
              <Info className="w-5 h-5 text-indigo-400" /> How to Use the X-Ray Reader
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 text-sm leading-relaxed text-indigo-100/80">
              <div className="space-y-4">
                 <p className="font-bold text-white text-base">This tool is specifically designed to demystify complex paragraphs from your standard NCERT and Advanced UPSC textbooks.</p>
                 <ul className="space-y-3 list-none">
                    <li className="flex gap-3">
                        <ScanSearch className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                        <span><strong className="text-white">Step 1: Capture Source Material.</strong> Simply take a clear smartphone photo of the exact book page you are reading, or isolate a snippet from a standard PDF document.</span>
                    </li>
                    <li className="flex gap-3">
                        <Database className="w-5 h-5 text-sky-400 flex-shrink-0" />
                        <span><strong className="text-white">Step 2: Intelligent Extraction.</strong> Our advanced semantic system will read the dense text perfectly and compare it dynamically against verified reference materials to find the exact context of what you are studying.</span>
                    </li>
                 </ul>
              </div>
              <div className="space-y-4 border-l-2 border-indigo-500/30 pl-6 border-dashed bg-white/5 rounded-2xl p-6 backdrop-blur-sm border-r border-y">
                 <div className="flex items-center gap-2 text-rose-300 font-black mb-2 uppercase tracking-widest text-xs">
                    <Wand2 className="w-4 h-4" /> The Master Mentor Concept
                 </div>
                 <p>Sometimes, textbook paragraphs lack broad context. The X-Ray Matrix engine connects static text to dynamic <strong>Current Affairs</strong>, dives deeply into the <strong>Historical Background</strong>, and generates actionable <strong>Prelims Practice</strong> questions.</p>
                 <p>If explicit notes matching your snippet are missing from our centralized library, our highly advanced AI Assistant seamlessly steps in to comprehensively write the analysis from scratch, ensuring you never miss a study beat!</p>
              </div>
           </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
           {/* Upload Array */}
           <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-12 flex flex-col items-center justify-center text-center transition-all hover:bg-slate-50 hover:border-indigo-300 group">
             <div className="bg-slate-50 p-6 rounded-full mb-6 relative border border-slate-100 group-hover:bg-indigo-50 transition-colors">
                 <div className="absolute -top-1 -right-1 bg-white p-1 rounded-full shadow-sm">
                   <ImageIcon className="w-4 h-4 text-indigo-400" />
                 </div>
                <UploadCloud className="w-12 h-12 text-slate-400 group-hover:text-indigo-500 transition-colors" />
             </div>
             
             <h3 className="text-2xl font-bold text-slate-800 mb-2">Deploy Source Material</h3>
             <p className="text-slate-500 max-w-sm mx-auto mb-8 font-medium">Accepts standard PDF references or photographic Camera Snippets (.jpg, .png)</p>
             
             <label className="relative cursor-pointer bg-slate-900 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2">
                 <input type="file" accept="application/pdf,image/*" className="hidden" onChange={handleFileUpload} />
                 {selectedFile ? selectedFile.name : "Select Image or PDF Document"}
             </label>

             {selectedFile && (
               <button 
                 onClick={triggerCrewAIEngine}
                 disabled={isUploading}
                 className="mt-6 w-full max-w-xs bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-4 rounded-2xl font-bold shadow-xl shadow-indigo-200 transition-all flex justify-center items-center gap-2 relative overflow-hidden"
               >
                 {isUploading && <div className="absolute top-0 left-0 w-full h-full bg-indigo-700/50 animate-pulse"></div>}
                 {isUploading ? <Loader2 className="w-5 h-5 animate-spin relative z-10" /> : <ScanSearch className="w-5 h-5 relative z-10" />}
                 <span className="relative z-10">{isUploading ? "Constructing Matrix (-5 AI Credits)..." : "Execute Analysis"}</span>
               </button>
             )}
           </div>

           {/* Preview Array */}
           <div className="bg-slate-100 border border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center shadow-inner relative overflow-hidden h-[500px]">
              {filePreview ? (
                 <div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 shadow-sm flex items-center gap-2 z-10 border border-indigo-100">
                       <ScanSearch className="w-3 h-3 text-emerald-500" /> Target Isolated
                    </div>
                    <Image src={filePreview} alt="Target Document" fill className="object-contain p-4" />
                 </div>
              ) : selectedFile && selectedFile.type === "application/pdf" ? (
                 <div className="w-full h-full bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-4 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full"></div>
                    <FileText className="w-16 h-16 text-slate-300 relative z-10" />
                    <span className="font-bold tracking-widest uppercase text-xs relative z-10">PDF Document Staged</span>
                 </div>
              ) : (
                 <div className="w-full h-full bg-white/50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 gap-4">
                    <ImageIcon className="w-8 h-8 text-slate-300" />
                    <span className="font-bold tracking-widest uppercase text-[10px] text-slate-400 text-center px-8">Image Preview Window</span>
                 </div>
              )}
           </div>
        </div>

        {/* Dynamic Firebase Ledger Subsystem */}
        <section className="pt-8 border-t border-slate-200">
           <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-6">
              <History className="w-6 h-6 text-indigo-500" />
              Historical Synthesis Cache
           </h3>
           
           {history.length === 0 ? (
              <div className="bg-slate-100 rounded-3xl p-12 text-center text-slate-500 font-medium flex flex-col items-center gap-4">
                 <History className="w-12 h-12 text-slate-300" />
                 <p>No historical {displaySubject} models mapped in your Firebase ledger yet.</p>
              </div>
           ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {history.map((item, idx) => (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all flex flex-col group cursor-pointer hover:border-indigo-300" onClick={() => openHistoryItem(item.payload)}>
                       <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-1 rounded">
                             {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleDateString() : 'Just Now'}
                          </span>
                          {item.matchFound ? (
                             <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Database className="w-3 h-3"/> Library Match</span>
                          ) : (
                             <span className="text-fuchsia-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Wand2 className="w-3 h-3"/> Deep AI Synthesis</span>
                          )}
                       </div>
                       
                       <p className="text-sm font-semibold text-slate-700 mb-6 italic line-clamp-3 leading-relaxed">"{item.sentenceExtracted || 'Uploaded Payload'}"</p>
                       
                       <div className="mt-auto pt-4 border-t border-slate-50">
                          <span className="text-xs font-bold text-indigo-600 group-hover:text-indigo-500 flex items-center gap-1">
                             Re-Launch Drawer &rarr;
                          </span>
                       </div>
                    </div>
                 ))}
              </div>
           )}
        </section>
      </div>

      <XrayDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        targetSentence="Historical X-Ray Verification Matrix" 
        externalData={parsedData}
      />
    </div>
  );
}
