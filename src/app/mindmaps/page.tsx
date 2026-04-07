"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Network, Sparkles, Loader2, Save, Download, Clock, ArrowRight, BookOpen, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { deductCredit } from "@/lib/credits";
import { MindmapNode, saveMindmap, fetchUserMindmaps, UserMindmap } from "@/lib/mindmap";

// Recursive Framer Motion Renderer (Light Mode Adjusted)
const MapNodeVisualizer = ({ node, level = 0 }: { node: MindmapNode, level?: number }) => {
  const [isOpen, setIsOpen] = useState(level < 2);

  const getLevelColor = (lvl: number) => {
     if (lvl === 0) return "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-xl px-8 py-4 text-2xl font-black rounded-3xl z-20 border border-orange-400/30";
     if (lvl === 1) return "bg-slate-100 border border-slate-300 text-slate-800 px-6 py-3 text-lg font-bold rounded-2xl shadow-sm z-10";
     if (lvl === 2) return "bg-white border border-slate-200 text-slate-700 px-5 py-2.5 text-base font-semibold rounded-xl";
     return "bg-slate-50 border border-slate-150 text-slate-600 px-4 py-2 text-sm font-medium rounded-lg";
  };

  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col items-center group/node relative">
      <motion.div 
         initial={{ opacity: 0, scale: 0.9 }}
         animate={{ opacity: 1, scale: 1 }}
         onClick={() => hasChildren && setIsOpen(!isOpen)}
         className={`${getLevelColor(level)} relative cursor-pointer hover:scale-105 transition-transform whitespace-nowrap text-center max-w-[300px] md:max-w-[400px] whitespace-normal`}
      >
         {node.title}
         {hasChildren && (
            <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border ${isOpen ? 'border-amber-500 text-amber-500' : 'border-slate-300 text-slate-400'} flex items-center justify-center text-xs font-black shadow-md transition-colors`}>
               {node.children!.length}
            </div>
         )}
      </motion.div>

      <AnimatePresence>
         {hasChildren && isOpen && (
            <motion.div 
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: 1, height: "auto" }}
               exit={{ opacity: 0, height: 0 }}
               className="flex flex-col items-center mt-6"
            >
               <div className="w-px h-8 bg-slate-200 -mt-6"></div>
               <div className="flex gap-8 relative mt-4 pt-4 border-t border-slate-200">
                  {node.children!.map((child, idx) => (
                     <div key={idx} className="relative flex flex-col items-center">
                        <div className="absolute top-0 w-px h-4 bg-slate-200 -mt-4"></div>
                        <MapNodeVisualizer node={child} level={level + 1} />
                     </div>
                  ))}
               </div>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
};

export default function MindmapsPage() {
  const [insufficientCredits, setInsufficientCredits] = useState(false);
  const [topic, setTopic] = useState("");
  const [userId, setUserId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeMap, setActiveMap] = useState<MindmapNode | null>(null);
  const [activeTopic, setActiveTopic] = useState<string>("");
  const [history, setHistory] = useState<UserMindmap[]>([]);

  useEffect(() => {
     supabase.auth.getUser().then(async (response: any) => {
        const data = response.data;
        if (data?.user) {
           setUserId(data.user.id);
           const cachedMaps = await fetchUserMindmaps(data.user.id);
           setHistory(cachedMaps);
        }
     });
  }, []);

  const handleGenerate = async () => {
     if (!topic.trim()) return alert("Provide a Topic first.");
     if (!userId) return alert("Please authenticate to run the AI Mindmap Generator.");

     setIsGenerating(true);
     setActiveMap(null);
     
     try {
        await deductCredit(userId, 4, "Recursive AI Mindmap Rendering"); // User requested explicitly 4 Credits
     } catch (err: any) {
        setIsGenerating(false);
        if (err.message === "INSUFFICIENT_CREDITS") {
           return setInsufficientCredits(true);
        }
        return alert("Ledger validation failed natively.");
     }

     try {
        const res = await fetch('/api/mindmaps/generate', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ topic })
        });

        if (!res.ok) throw new Error("Synthesis Failed.");
        
        const data = await res.json();
        setActiveMap(data.mapData);
        setActiveTopic(topic);
        
        // Caching locally to Firebase natively
        const mapDocId = await saveMindmap(userId, topic, data.mapData);
        
        // Push into active view history seamlessly
        setHistory(prev => [{ id: mapDocId, userId, topic, mapData: data.mapData }, ...prev]);
        setTopic("");
     } catch (err) {
        alert("Exception triggered natively during LLM structural recursion.");
     } finally {
        setIsGenerating(false);
     }
  };

  const loadFromHistory = (historicalMap: UserMindmap) => {
      setActiveMap(historicalMap.mapData);
      setActiveTopic(historicalMap.topic);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const downloadMindmapText = () => {
     if (!activeMap || !activeTopic) return;
     let textOut = `${activeTopic.toUpperCase()} - AI Mindmap\n=========================================\n\n`;
     
     const traverse = (node: MindmapNode, depth: number) => {
        textOut += `${'    '.repeat(depth)}• ${node.title}\n`;
        if (node.children) {
           node.children.forEach(c => traverse(c, depth + 1));
        }
     };
     
     traverse(activeMap, 0);
     
     const blob = new Blob([textOut], { type: 'text/plain' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `${activeTopic.replace(/\s+/g, '_')}_Mindmap.txt`;
     a.click();
     URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-900 p-6 md:p-12 font-serif overflow-x-hidden selection:bg-amber-500/30">

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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-xs font-black uppercase tracking-widest mb-6 tracking-[0.2em]">
               <Network className="w-4 h-4" /> Cognitive Topography
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 mb-6 drop-shadow-sm font-sans">
               AI Mindmap Engine
            </h1>
            <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto font-sans">
               Instantly construct deeply nested structural visualization trees breaking down massive UPSC concepts. <span className="text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-md">Costs 4 AI Credits</span>
            </p>
         </div>

         {/* Generation Input Grid */}
         <div className="w-full max-w-3xl bg-white p-2 rounded-2xl border border-slate-200 flex shadow-xl shadow-slate-200/50 mt-4">
            <input 
               type="text"
               value={topic}
               onChange={e => setTopic(e.target.value)}
               placeholder="Enter UPSC Mains Topic (e.g., Inflation Impacts)..."
               className="flex-1 bg-transparent border-none outline-none px-6 text-lg font-medium text-slate-800 placeholder-slate-400 font-sans"
               onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            />
            <button 
               onClick={handleGenerate}
               disabled={isGenerating || !topic.trim()}
               className="px-8 py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold transition-all flex items-center gap-2 font-sans"
            >
               {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-5 h-5 text-amber-400" /> Generate Root</>}
            </button>
         </div>
      </header>

      {/* Primary Mindmap Visualizer Viewport */}
      {isGenerating && (
         <div className="max-w-5xl mx-auto w-full h-96 my-8 rounded-3xl border border-amber-200 bg-amber-50/50 flex flex-col items-center justify-center animate-pulse shadow-sm font-sans pt-12">
            <Network className="w-16 h-16 text-amber-400 mb-4 animate-bounce" />
            <p className="text-xl font-black text-amber-600 tracking-[0.2em] uppercase">Synthesizing Structural Tree...</p>
         </div>
      )}

      {/* Modal Popup for Active Map */}
      <AnimatePresence>
      {activeMap && !isGenerating && (
         <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-12"
         >
            <motion.div 
               initial={{ scale: 0.95, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               className="w-full h-full bg-[#FDFCFB] rounded-[2rem] border border-slate-200 shadow-2xl relative flex flex-col overflow-hidden font-sans"
            >
               {/* Modal Header Controls */}
               <div className="w-full px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white z-20">
                  <div className="flex items-center gap-4">
                     <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></div>
                     <span className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">{activeTopic} — Neural Map</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                     <button onClick={downloadMindmapText} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors text-sm">
                        <Download className="w-4 h-4" /> Download Text
                     </button>
                     <button onClick={() => setActiveMap(null)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors text-sm">
                        Close Modal
                     </button>
                  </div>
               </div>
               
               {/* Draggable Graph Canvas */}
               <div className="flex-1 overflow-auto custom-scrollbar relative bg-[#FDFCFB]">
                  <div className="w-max min-w-full flex justify-center pt-24 pb-32 px-24 cursor-grab active:cursor-grabbing">
                     <MapNodeVisualizer node={activeMap} />
                  </div>
               </div>
            </motion.div>
         </motion.div>
      )}
      </AnimatePresence>

      {/* Persistence Cached History Grid */}
      <section className="max-w-5xl mx-auto pt-16 border-t border-slate-200 relative z-20 font-sans">
         <h3 className="text-2xl font-black mb-8 flex items-center gap-3 text-slate-800"><Clock className="w-6 h-6 text-slate-400" /> Cached Arrays (0 Credits)</h3>
         {history.length === 0 ? (
            <div className="text-center p-12 rounded-3xl bg-slate-50 border border-slate-100 text-slate-400 font-bold uppercase tracking-widest text-sm">No historical Mindmaps structurally committed.</div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {history.map(hist => (
                  <div key={hist.id} onClick={() => loadFromHistory(hist)} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg cursor-pointer transition-all hover:-translate-y-1 group">
                     <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-200 group-hover:bg-slate-900 group-hover:text-amber-400 text-slate-400 transition-colors">
                           <Network className="w-6 h-6" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                           <h4 className="font-bold text-slate-800 text-lg truncate leading-tight">{hist.topic}</h4>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{hist.mapData.children?.length || 0} Primary Nodes</p>
                        </div>
                     </div>
                     <div className="flex items-center justify-between mt-6">
                        <span className="text-[10px] font-black tracking-widest uppercase text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-100"><BookOpen className="w-3 h-3 inline mr-1"/> Saved Array</span>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-800 transition-colors" />
                     </div>
                  </div>
               ))}
            </div>
         )}
      </section>

    </div>
  );
}
