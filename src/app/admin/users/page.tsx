"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X, Database, Shield, ShieldAlert, CreditCard, Save, Settings } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

interface PrepUserModel {
   id: string;
   email: string;
   credits: number;
   role?: "admin" | "user" | "banned";
   tier?: "free" | "pro" | "ultimate";
   hasCloudNotes?: boolean;
   createdAt?: any;
}

export default function UserManagementCMS() {
   const [users, setUsers] = useState<PrepUserModel[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [editingUser, setEditingUser] = useState<PrepUserModel | null>(null);

   const [tempCredits, setTempCredits] = useState<number>(0);
   const [tempRole, setTempRole] = useState<"admin" | "user" | "banned">("user");
   const [tempTier, setTempTier] = useState<"free" | "pro" | "ultimate">("free");
   const [tempCloudNotes, setTempCloudNotes] = useState<boolean>(false);

   useEffect(() => {
      fetchUsers();
   }, []);

   const fetchUsers = async () => {
      setIsLoading(true);
      try {
         const snap = await getDocs(collection(db, "users"));
         const incoming: PrepUserModel[] = [];
         snap.forEach((d) => {
            incoming.push({ id: d.id, ...d.data() } as PrepUserModel);
         });
         setUsers(incoming);
      } catch (err) {
         console.error("Failed to fetch users natively:", err);
      }
      setIsLoading(false);
   };

   // Invoked when an admin clicks 'Edit' on a user row
   const openEditorModal = (u: PrepUserModel) => {
      setEditingUser(u);
      setTempCredits(u.credits || 0);
      setTempRole(u.role || "user");
      setTempTier(u.tier || "free");
      setTempCloudNotes(u.hasCloudNotes || false);
   };

   // Pushes the aggressive payload to Firebase remote instance
   const pushUpdate = async () => {
      if (!editingUser) return;
      try {
         const ref = doc(db, "users", editingUser.id);
         await updateDoc(ref, {
            credits: tempCredits,
            role: tempRole,
            tier: tempTier,
            hasCloudNotes: tempCloudNotes
         });
         
         // Synchronize Local Virtual DOM efficiently
         setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, credits: tempCredits, role: tempRole, tier: tempTier, hasCloudNotes: tempCloudNotes } : u));
         setEditingUser(null);
      } catch (error) {
         console.error("Firebase Mutation Locked:", error);
         alert("Action unauthorized or network disconnected.");
      }
   };

   return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
         
         {/* CMS Navigation Header */}
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
            <div>
               <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4">
                  <Database className="w-4 h-4" /> Global Auth Matrix
               </div>
               <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-4">
                  <Users className="w-10 h-10 text-indigo-400" />
                  User Ecosystem
               </h1>
            </div>
            
            <button 
               onClick={fetchUsers}
               className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl font-bold text-sm transition border border-white/10 hidden md:block"
            >
               Sync Engine
            </button>
         </div>

         {/* Native Dashboard Table Layout */}
         <div className="glass rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-[#0f172a] text-indigo-300/80 font-black uppercase tracking-widest text-[10px]">
                     <tr>
                        <th className="px-6 py-5 border-b border-white/5">Supabase Node ID</th>
                        <th className="px-6 py-5 border-b border-white/5">Registered Email</th>
                        <th className="px-6 py-5 border-b border-white/5">Role</th>
                        <th className="px-6 py-5 border-b border-white/5">AI Credit Ledger</th>
                        <th className="px-6 py-5 border-b border-white/5 text-right flex justify-end">Administrative Actions</th>
                     </tr>
                  </thead>
                  <tbody>
                     {isLoading ? (
                        <tr><td colSpan={5} className="text-center py-12 text-slate-500 font-bold uppercase tracking-widest">Querying Firebase Arrays...</td></tr>
                     ) : users.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-12 text-slate-500 font-bold uppercase tracking-widest">Zero Users Authenticated Natively</td></tr>
                     ) : (
                        users.map((u, i) => (
                           <motion.tr 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              key={u.id} 
                              className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                           >
                              <td className="px-6 py-5 font-mono text-[10px] text-slate-500">{u.id}</td>
                              <td className="px-6 py-5 font-bold text-slate-200">{u.email}</td>
                              <td className="px-6 py-5">
                                 <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] items-baseline font-black uppercase tracking-widest border ${
                                    u.role === 'admin' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                                    u.role === 'banned' ? 'bg-red-900/40 border-red-500/50 text-red-500' :
                                    'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                                 }`}>
                                    {u.role === 'admin' ? <ShieldAlert className="w-3 h-3"/> : <Shield className="w-3 h-3"/>}
                                    {u.role || 'user'}
                                 </span>
                              </td>
                              <td className="px-6 py-5">
                                 <span className="font-bold text-amber-400 flex items-center gap-1.5">
                                    <CreditCard className="w-4 h-4"/> {u.credits || 0}
                                 </span>
                              </td>
                              <td className="px-6 py-5 text-right">
                                 <button 
                                    onClick={() => openEditorModal(u)}
                                    className="bg-indigo-500 text-white px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg hover:bg-indigo-600 transition shadow-lg shadow-indigo-500/20"
                                 >
                                    Modify Target
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
            {editingUser && (
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
                     <button onClick={() => setEditingUser(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition"><X className="w-5 h-5"/></button>
                     
                     <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-3">
                        <Settings className="w-6 h-6 text-indigo-400"/> Overwrite Identity
                     </h3>
                     <p className="text-slate-400 text-sm mb-8 font-medium">Injecting structural modifications to payload <span className="text-indigo-400 font-mono bg-white/5 px-2 py-1 flex-1 rounded">{editingUser.email}</span></p>

                     <div className="space-y-6">
                        <div>
                           <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">AI Ledger Integrity</label>
                           <input 
                              type="number"
                              value={tempCredits}
                              onChange={(e) => setTempCredits(Number(e.target.value))}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:border-indigo-500 outline-none transition"
                           />
                        </div>

                        <div>
                           <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Security Clearance Protocol</label>
                           <select 
                              value={tempRole}
                              onChange={(e: any) => setTempRole(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-bold uppercase tracking-widest text-sm focus:border-indigo-500 outline-none transition appearance-none"
                           >
                              <option value="user">Standard Agent</option>
                              <option value="admin">Root Administrator</option>
                              <option value="banned">Banned / Isolated</option>
                           </select>
                        </div>

                        <div>
                           <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Global Subscription Tier</label>
                           <select 
                              value={tempTier}
                              onChange={(e: any) => setTempTier(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-bold uppercase tracking-widest text-sm focus:border-amber-500 outline-none transition appearance-none"
                           >
                              <option value="free">UPSC Default (Free)</option>
                              <option value="pro">UPSC Pro Engine</option>
                              <option value="ultimate">UPSC Ultimate Access</option>
                           </select>
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer bg-black/20 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                           <input type="checkbox" checked={tempCloudNotes} onChange={(e) => setTempCloudNotes(e.target.checked)} className="w-5 h-5 rounded border-white/10 bg-black/40 accent-indigo-500"/>
                           <div>
                              <div className="text-sm font-bold text-white uppercase tracking-widest">Manual Cloud Vault Unlock</div>
                              <div className="text-xs text-slate-500 font-medium">Bypass transaction gateway entirely to activate 2GB permanent object storage arrays natively.</div>
                           </div>
                        </label>

                        <button 
                           onClick={pushUpdate}
                           className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase tracking-widest text-sm py-4 rounded-xl shadow-lg shadow-indigo-500/20 transition flex items-center justify-center gap-2 mt-4"
                        >
                           <Save className="w-4 h-4"/> Commit Payload
                        </button>
                     </div>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>
   );
}
