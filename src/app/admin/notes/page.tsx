"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderCheck, X, Database, Search, Trash2, Eye, ExternalLink, RefreshCw, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";

interface CloudNoteModel {
   id: string;
   userId: string;
   title: string;
   subject: string;
   categoryType: 'core' | 'optional' | 'other';
   type: string;
   content: string;
   fileUrl?: string;
   tags?: string[];
   isVerified?: boolean;
}

export default function NotesStagingTriageCMS() {
   const [notes, setNotes] = useState<CloudNoteModel[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   
   // Triage Modal
   const [reviewNote, setReviewNote] = useState<CloudNoteModel | null>(null);

   useEffect(() => {
      fetchStagedNotes();
   }, []);

   const fetchStagedNotes = async () => {
      setIsLoading(true);
      try {
         const snap = await getDocs(collection(db, "cloud_notes"));
         const incoming: CloudNoteModel[] = [];
         snap.forEach((d) => {
            incoming.push({ id: d.id, ...d.data() } as CloudNoteModel);
         });
         
         setNotes(incoming.sort((a, b) => (a.isVerified === b.isVerified) ? 0 : a.isVerified ? 1 : -1));
      } catch (err) {
         console.error("Failed to fetch cloud notes globally:", err);
      }
      setIsLoading(false);
   };

   const openTriageModal = (n: CloudNoteModel) => {
      setReviewNote(n);
   };

   const purgeNote = async (id: string) => {
      if (!confirm(`Are you absolutely sure you want to permanently execute deletion protocol on raw note: [${id}]?`)) return;
      try {
         await deleteDoc(doc(db, "cloud_notes", id));
         setNotes(prev => prev.filter(n => n.id !== id));
         if (reviewNote?.id === id) setReviewNote(null);
      } catch (error) {
         console.error("Failed to purge note natively:", error);
      }
   };

   const verifyNote = async (id: string) => {
      try {
         await updateDoc(doc(db, "cloud_notes", id), {
            isVerified: true
         });
         setNotes(prev => prev.map(n => n.id === id ? { ...n, isVerified: true } : n).sort((a, b) => (a.isVerified === b.isVerified) ? 0 : a.isVerified ? 1 : -1));
         if (reviewNote?.id === id) setReviewNote({ ...reviewNote, isVerified: true });
      } catch (error) {
         console.error("Failed to verify note natively:", error);
      }
   };

   return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
         
         {/* CMS Navigation Header */}
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
            <div>
               <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">
                  <Database className="w-4 h-4" /> Global Triage Pipeline
               </div>
               <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-4">
                  <FolderCheck className="w-10 h-10 text-emerald-400" />
                  Notes Staging Triage
               </h1>
            </div>
            
            <button 
               onClick={fetchStagedNotes}
               className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl font-bold text-sm transition border border-white/10 flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
            >
               <RefreshCw className="w-4 h-4" /> Sync Engine
            </button>
         </div>

         {/* Native Dashboard Table Layout */}
         <div className="glass rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-[#0f172a] text-emerald-300/80 font-black uppercase tracking-widest text-[10px]">
                     <tr>
                        <th className="px-6 py-5 border-b border-white/5">Integrity State</th>
                        <th className="px-6 py-5 border-b border-white/5">Semantic Title Map</th>
                        <th className="px-6 py-5 border-b border-white/5">Subject Node</th>
                        <th className="px-6 py-5 border-b border-white/5">Format</th>
                        <th className="px-6 py-5 border-b border-white/5 text-right flex justify-end">Administrative Pipeline</th>
                     </tr>
                  </thead>
                  <tbody>
                     {isLoading ? (
                        <tr><td colSpan={5} className="text-center py-12 text-slate-500 font-bold uppercase tracking-widest">Querying Global Matrix...</td></tr>
                     ) : notes.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-12 text-slate-500 font-bold uppercase tracking-widest">Zero Unstaged Resources Pending</td></tr>
                     ) : (
                        notes.map((n, i) => (
                           <motion.tr 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              key={n.id} 
                              className={`border-b border-white/5 hover:bg-white/5 transition-colors group ${n.isVerified ? 'opacity-50' : ''}`}
                           >
                              <td className="px-6 py-5">
                                 {n.isVerified ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] items-baseline font-black uppercase tracking-widest border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                                       <CheckCircle2 className="w-3 h-3"/> Verified
                                    </span>
                                 ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] items-baseline font-black uppercase tracking-widest border bg-amber-500/10 border-amber-500/30 text-amber-400">
                                       <AlertTriangle className="w-3 h-3"/> Staged
                                    </span>
                                 )}
                              </td>
                              <td className="px-6 py-5 font-bold text-slate-200 truncate max-w-[200px]" title={n.title}>
                                 {n.title}
                              </td>
                              <td className="px-6 py-5">
                                 <span className="text-xs bg-slate-800 border border-slate-700 px-2 py-1 rounded text-slate-300 font-mono">
                                    {n.subject}
                                 </span>
                              </td>
                              <td className="px-6 py-5">
                                 <span className="flex items-center gap-1 text-xs text-slate-400 font-bold uppercase tracking-widest">
                                    <FileText className="w-3 h-3" /> {n.type}
                                 </span>
                              </td>
                              <td className="px-6 py-5 text-right">
                                 <button 
                                    onClick={() => openTriageModal(n)}
                                    className="bg-emerald-500 text-white px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 ml-auto"
                                 >
                                    <Eye className="w-3 h-3" /> Execute Triage
                                 </button>
                              </td>
                           </motion.tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Admin Triage Modal Wrapper */}
         <AnimatePresence>
            {reviewNote && (
               <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
               >
                  <motion.div 
                     initial={{ scale: 0.95, y: 20 }}
                     animate={{ scale: 1, y: 0 }}
                     exit={{ scale: 0.95, y: 20 }}
                     className="bg-[#0f172a] border border-white/10 rounded-3xl flex flex-col max-w-4xl w-full h-[85vh] shadow-2xl relative overflow-hidden"
                  >
                     {/* Header */}
                     <div className="p-6 border-b border-white/10 shrink-0 flex justify-between items-center bg-[#0b1120]">
                        <div>
                           <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                              <Search className="w-6 h-6 text-emerald-400"/> Triage Inspector
                           </h3>
                           <p className="text-slate-400 text-xs font-mono mt-1">Payload ID: {reviewNote.id}</p>
                        </div>
                        <button onClick={() => setReviewNote(null)} className="text-slate-500 hover:text-white transition p-2 bg-white/5 rounded-xl"><X className="w-5 h-5"/></button>
                     </div>

                     {/* Scrollable Content Engine */}
                     <div className="flex-1 overflow-y-auto p-8 space-y-8">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Extracted Title Node</label>
                              <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white font-bold">{reviewNote.title}</div>
                           </div>
                           <div>
                              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Subject Hierarchy</label>
                              <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white font-mono flex items-center gap-2">
                                 <span className="text-emerald-400">/{reviewNote.categoryType}/</span>{reviewNote.subject}
                              </div>
                           </div>
                        </div>

                        {reviewNote.tags && reviewNote.tags.length > 0 && (
                           <div>
                              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Attached Hashtag Vectors</label>
                              <div className="flex flex-wrap gap-2">
                                 {reviewNote.tags.map(t => (
                                    <span key={t} className="px-3 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-md font-mono text-sm">#{t}</span>
                                 ))}
                              </div>
                           </div>
                        )}

                        <div>
                           <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-black uppercase tracking-widest text-slate-500">AI Local Extracted NLP Array</label>
                              {reviewNote.fileUrl && (
                                 <a href={reviewNote.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition">
                                    <ExternalLink className="w-3 h-3" /> Inspect Raw Global PDF Blob
                                 </a>
                              )}
                           </div>
                           <textarea 
                              readOnly 
                              className="w-full h-64 bg-black/40 border border-white/10 rounded-xl p-4 text-slate-300 font-serif text-sm focus:outline-none resize-none"
                              value={reviewNote.content || "Empty payload transmission..."}
                           />
                        </div>

                     </div>

                     {/* Footer Action Matrix */}
                     <div className="p-6 border-t border-white/10 bg-[#0b1120] flex items-center justify-between shrink-0">
                        <button 
                           onClick={() => purgeNote(reviewNote.id)}
                           className="text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 px-5 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition flex items-center gap-2"
                        >
                           <Trash2 className="w-4 h-4" /> Purge Resource Array
                        </button>
                        
                        <div className="flex gap-3">
                           {!reviewNote.isVerified && (
                              <button 
                                 onClick={() => verifyNote(reviewNote.id)}
                                 className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                              >
                                 <CheckCircle2 className="w-4 h-4" /> Validate Integrity
                              </button>
                           )}
                           <button 
                              onClick={() => setReviewNote(null)}
                              className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition border border-white/10"
                           >
                              Close Extractor
                           </button>
                        </div>
                     </div>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>
   );
}
