"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Network, Globe, Target, Loader2 } from "lucide-react";

import { BookOpen, BookText } from "lucide-react";

interface XrayData {
  match: boolean;
  similarity?: number;
  deep_dive: string;
  current_affairs: string;
  prelims_practice: string;
  history: string;
  references: string;
}

export default function XrayDrawer({ 
  isOpen, 
  onClose, 
  targetSentence,
  externalData = null
}: { 
  isOpen: boolean; 
  onClose: () => void;
  targetSentence?: string;
  externalData?: XrayData | null;
}) {
  const [activeTab, setActiveTab] = useState<"DEEP" | "CURRENT" | "PRELIMS" | "HISTORY" | "REFERENCES">("DEEP");
  const [isSearching, setIsSearching] = useState(false);
  const [xrayData, setXrayData] = useState<XrayData | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (externalData) {
        setXrayData(externalData);
        setIsSearching(false);
      } else if (targetSentence) {
        triggerBackendXRay();
      }
    }
  }, [isOpen, targetSentence, externalData]);

  const triggerBackendXRay = async () => {
    setIsSearching(true);
    setXrayData(null);
    try {
      const response = await fetch('/api/xray-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence: targetSentence })
      });
      const data = await response.json();
      setXrayData(data);
    } catch (e) {
      console.error("XRay Drawer Network Sequence Failed:", e);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Transparent Dark Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-[100]"
          />
          
          {/* Main X-Ray Drawer Core */}
          <motion.div 
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-screen w-full max-w-[500px] bg-white border-l border-slate-200 shadow-[0_0_80px_rgba(0,0,0,0.1)] z-[101] flex flex-col"
          >
             <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl mix-blend-multiply"></div>
                <div>
                   <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                     X-Ray Analytics
                   </h2>
                   <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Semantic Extraction</p>
                </div>
                <button onClick={onClose} className="p-2 bg-white rounded-full hover:bg-slate-200 transition-colors shadow-sm z-10">
                   <X className="w-5 h-5 text-slate-600" />
                </button>
             </div>

             <div className="p-6 bg-indigo-900 text-white">
                <span className="text-[10px] font-black tracking-widest text-indigo-300 uppercase mb-2 block">Target Sequence</span>
                <p className="text-indigo-50 font-serif leading-relaxed line-clamp-3">
                  "{targetSentence}"
                </p>
             </div>

             {/* Tab Navigation */}
             <div className="flex px-6 pt-4 gap-4 border-b border-slate-100 overflow-x-auto whitespace-nowrap scrollbar-hide">
                <button 
                  onClick={() => setActiveTab("DEEP")}
                  className={`pb-3 font-bold text-sm tracking-wide transition-colors relative ${activeTab === "DEEP" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
                >
                  <div className="flex items-center gap-2"><Network className="w-4 h-4"/> Deep Depth</div>
                  {activeTab === "DEEP" && <motion.div layoutId="xrayTab" className="absolute bottom-0 left-0 w-full h-[3px] bg-indigo-600 rounded-t-full" />}
                </button>
                <button 
                  onClick={() => setActiveTab("CURRENT")}
                  className={`pb-3 font-bold text-sm tracking-wide transition-colors relative ${activeTab === "CURRENT" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
                >
                  <div className="flex items-center gap-2"><Globe className="w-4 h-4"/> Context</div>
                  {activeTab === "CURRENT" && <motion.div layoutId="xrayTab" className="absolute bottom-0 left-0 w-full h-[3px] bg-indigo-600 rounded-t-full" />}
                </button>
                <button 
                  onClick={() => setActiveTab("PRELIMS")}
                  className={`pb-3 font-bold text-sm tracking-wide transition-colors relative ${activeTab === "PRELIMS" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
                >
                  <div className="flex items-center gap-2"><Target className="w-4 h-4"/> Prelims</div>
                  {activeTab === "PRELIMS" && <motion.div layoutId="xrayTab" className="absolute bottom-0 left-0 w-full h-[3px] bg-indigo-600 rounded-t-full" />}
                </button>
                <button 
                  onClick={() => setActiveTab("HISTORY")}
                  className={`pb-3 font-bold text-sm tracking-wide transition-colors relative ${activeTab === "HISTORY" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
                >
                  <div className="flex items-center gap-2"><BookOpen className="w-4 h-4"/> History</div>
                  {activeTab === "HISTORY" && <motion.div layoutId="xrayTab" className="absolute bottom-0 left-0 w-full h-[3px] bg-indigo-600 rounded-t-full" />}
                </button>
                <button 
                  onClick={() => setActiveTab("REFERENCES")}
                  className={`pb-3 font-bold text-sm tracking-wide transition-colors relative ${activeTab === "REFERENCES" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
                >
                  <div className="flex items-center gap-2"><BookText className="w-4 h-4"/> Sources</div>
                  {activeTab === "REFERENCES" && <motion.div layoutId="xrayTab" className="absolute bottom-0 left-0 w-full h-[3px] bg-indigo-600 rounded-t-full" />}
                </button>
             </div>

             {/* Dynamic Body Content */}
             <div className="flex-1 overflow-y-auto p-6">
                {isSearching ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                     <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
                     <p className="font-bold text-sm animate-pulse tracking-wide text-center max-w-[200px]">Executing Secure Synthesis and Verification Array...</p>
                  </div>
                ) : xrayData ? (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    {activeTab === "DEEP" && (
                      <div>
                         <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b pb-2 mb-4">Constitutional Implications</h3>
                         <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-line">{xrayData.deep_dive}</p>
                      </div>
                    )}
                    {activeTab === "CURRENT" && (
                      <div>
                         <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b pb-2 mb-4">Current Affairs Dynamics</h3>
                         <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-line">{xrayData.current_affairs}</p>
                      </div>
                    )}
                    {activeTab === "HISTORY" && (
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-16 h-16 bg-slate-200/50 rounded-full blur-2xl"></div>
                         <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                           <BookOpen className="w-4 h-4" />
                           Historical Evolution
                         </h3>
                         <p className="text-slate-900 leading-relaxed font-medium whitespace-pre-line">{xrayData.history}</p>
                      </div>
                    )}
                    {activeTab === "REFERENCES" && (
                      <div>
                         <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b pb-2 mb-4">Scholarly References</h3>
                         <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-line text-xs">{xrayData.references}</p>
                      </div>
                    )}
                    {activeTab === "PRELIMS" && (
                      <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-16 h-16 bg-amber-200/50 rounded-full blur-2xl"></div>
                         <h3 className="text-xs font-black text-amber-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                           <Target className="w-4 h-4" />
                           Static Practice Array
                         </h3>
                         <p className="text-amber-900 leading-relaxed font-bold whitespace-pre-line">{xrayData.prelims_practice}</p>
                      </div>
                    )}
                    
                    <div className="mt-8 flex items-center justify-between text-[10px] font-black tracking-widest uppercase text-slate-400 border-t pt-4">
                      <span>Source Identity Mechanism</span>
                      {xrayData.match ? (
                        <span className="text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 flex items-center gap-1">
                          {((xrayData.similarity || 0) * 100).toFixed(1)}% PgVector Match
                        </span>
                      ) : (
                        <span className="text-fuchsia-500 bg-fuchsia-50 px-2 py-1 rounded-md border border-fuchsia-100 flex items-center gap-1">
                          Gemini 1.5 Synthesis Matrix
                        </span>
                      )}
                    </div>
                  </motion.div>
                ) : null}
             </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
