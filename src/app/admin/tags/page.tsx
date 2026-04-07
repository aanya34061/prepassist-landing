"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hash, X, Database, Save, Settings, Trash2, Plus, RefreshCw } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";

interface HashtagModel {
   id: string;
   name: string;
   count?: number;
   createdAt?: any;
}

export default function HashtagOntologyCMS() {
   const [tags, setTags] = useState<HashtagModel[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [isModalOpen, setIsModalOpen] = useState(false);
   
   // Editor State
   const [tempTagId, setTempTagId] = useState("");
   const [isEditing, setIsEditing] = useState(false);

   useEffect(() => {
      fetchTags();
   }, []);

   const fetchTags = async () => {
      setIsLoading(true);
      try {
         const snap = await getDocs(collection(db, "hashtags"));
         const incoming: HashtagModel[] = [];
         snap.forEach((d) => {
            incoming.push({ id: d.id, ...(d.data() as any) } as HashtagModel);
         });
         setTags(incoming);
      } catch (err) {
         console.error("Failed to fetch hashtags natively:", err);
      }
      setIsLoading(false);
   };

   const openCreateModal = () => {
      setTempTagId("");
      setIsEditing(false);
      setIsModalOpen(true);
   };

   const pushUpdate = async () => {
      if (!tempTagId.trim()) return;
      
      // Force tag to be lowercase, cleanly hyphenated for strictly validated ontology
      const normalizedId = tempTagId.trim().toLowerCase().replace(/\s+/g, '-');

      try {
         const ref = doc(db, "hashtags", normalizedId);
         await setDoc(ref, {
            name: normalizedId,
            createdAt: new Date()
         }, { merge: true });
         
         // Synchronize Local Virtual DOM efficiently
         if (!tags.find(t => t.id === normalizedId)) {
             setTags(prev => [...prev, { id: normalizedId, name: normalizedId, count: 0 }]);
         }
         setIsModalOpen(false);
      } catch (error) {
         console.error("Firebase Mutation Locked:", error);
         alert("Action unauthorized or network disconnected.");
      }
   };

   const deleteTag = async (id: string) => {
       if (!confirm(`Are you absolutely sure you want to permanently delete the tracking tag: [${id}]?`)) return;
       try {
           await deleteDoc(doc(db, "hashtags", id));
           setTags(prev => prev.filter(t => t.id !== id));
       } catch (error) {
           console.error("Failed to delete tag natively:", error);
       }
   };

   return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
         
         {/* CMS Navigation Header */}
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
            <div>
               <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold uppercase tracking-widest mb-4">
                  <Database className="w-4 h-4" /> Global Taxonomy Framework
               </div>
               <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-4">
                  <Hash className="w-10 h-10 text-sky-400" />
                  Hashtag Ontology
               </h1>
            </div>
            
            <div className="flex items-center gap-3">
               <button 
                  onClick={fetchTags}
                  className="bg-white/5 hover:bg-white/10 text-white px-4 py-3 rounded-xl font-bold text-sm transition border border-white/10 flex items-center gap-2"
               >
                  <RefreshCw className="w-4 h-4" /> Sync Engine
               </button>
               <button 
                  onClick={openCreateModal}
                  className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl font-bold text-sm transition shadow-[0_0_20px_rgba(14,165,233,0.3)] flex items-center gap-2"
               >
                  <Plus className="w-4 h-4" /> Inject Variable
               </button>
            </div>
         </div>

         {/* Native Dashboard Table Layout */}
         <div className="glass rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-[#0f172a] text-sky-300/80 font-black uppercase tracking-widest text-[10px]">
                     <tr>
                        <th className="px-6 py-5 border-b border-white/5">Semantic Identifier</th>
                        <th className="px-6 py-5 border-b border-white/5">Global Attachments</th>
                        <th className="px-6 py-5 border-b border-white/5 text-right">Destructive Actions</th>
                     </tr>
                  </thead>
                  <tbody>
                     {isLoading ? (
                        <tr><td colSpan={3} className="text-center py-12 text-slate-500 font-bold uppercase tracking-widest">Querying Firebase Arrays...</td></tr>
                     ) : tags.length === 0 ? (
                        <tr><td colSpan={3} className="text-center py-12 text-slate-500 font-bold uppercase tracking-widest">Zero Semantic Nodes Defined</td></tr>
                     ) : (
                        tags.map((t, i) => (
                           <motion.tr 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              key={t.id} 
                              className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                           >
                              <td className="px-6 py-5">
                                 <span className="font-mono text-sm inline-flex items-center gap-1.5 bg-sky-500/10 text-sky-300 px-3 py-1 rounded-md border border-sky-500/20 font-bold">
                                    <Hash className="w-3 h-3 text-sky-400 opacity-50" />
                                    {t.id}
                                 </span>
                              </td>
                              <td className="px-6 py-5 font-bold text-slate-400">
                                 {t.count || 0} referenced edges
                              </td>
                              <td className="px-6 py-5 text-right">
                                 <button 
                                    onClick={() => deleteTag(t.id)}
                                    className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white p-2 rounded-lg transition"
                                    title="Destructive Deletion"
                                 >
                                    <Trash2 className="w-4 h-4"/>
                                 </button>
                              </td>
                           </motion.tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Admin Mutation Modal Wrapper */}
         <AnimatePresence>
            {isModalOpen && (
               <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
               >
                  <motion.div 
                     initial={{ scale: 0.95, y: 20 }}
                     animate={{ scale: 1, y: 0 }}
                     exit={{ scale: 0.95, y: 20 }}
                     className="bg-[#0f172a] border border-white/10 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative"
                  >
                     <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition"><X className="w-5 h-5"/></button>
                     
                     <h3 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-3">
                        <Settings className="w-6 h-6 text-sky-400"/> Inject Node Variable
                     </h3>
                     <p className="text-slate-400 text-sm mb-8 font-medium">Create a globally tracked semantic identifier for classifying syllabus edges natively.</p>

                     <div className="space-y-6">
                        <div>
                           <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Primary Keyword / Slug</label>
                           <div className="relative">
                              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                              <input 
                                 type="text"
                                 autoFocus
                                 value={tempTagId}
                                 onChange={(e) => setTempTagId(e.target.value)}
                                 placeholder="e.g. upsc-polity-2024"
                                 className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white font-mono focus:border-sky-500 outline-none transition"
                              />
                           </div>
                        </div>

                        <button 
                           onClick={pushUpdate}
                           disabled={!tempTagId.trim()}
                           className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-sm py-4 rounded-xl shadow-lg shadow-sky-500/20 transition flex items-center justify-center gap-2 mt-4"
                        >
                           <Save className="w-4 h-4"/> Commit Node Payload
                        </button>
                     </div>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>
   );
}
