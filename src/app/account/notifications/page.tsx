"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, Loader2, ArrowRight, LayoutList, FileText, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function UserNotificationsPage() {
   const [notifications, setNotifications] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const fetchNotifications = async () => {
         try {
            const { data, error } = await supabase
               .from('notifications')
               .select('*')
               .order('created_at', { ascending: false });
               
            if (error) throw error;
            
            setNotifications(data || []);
            
            // Mark all physically extracted arrays as explicitly "Local Read" natively bypassing DB state
            if (typeof window !== 'undefined') {
                const readSet = new Set(JSON.parse(localStorage.getItem('prepassist_read_notifs') || '[]'));
                data?.forEach((n: any) => readSet.add(n.id));
                localStorage.setItem('prepassist_read_notifs', JSON.stringify(Array.from(readSet)));
                
                // Dispatch event explicitly dropping the Bell counter
                window.dispatchEvent(new Event('dashboard_notifs_read'));
            }
         } catch (e) {
            console.error("Transmission Extraction Failed:", e);
         } finally {
            setLoading(false);
         }
      };
      
      fetchNotifications();
   }, []);

   return (
      <div className="relative w-full">
         <div className="relative z-10 text-left">
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="mb-8 font-sans">
               <h2 className="text-3xl font-black tracking-tight mb-2 text-white">
                  System Transmissions
               </h2>
               <p className="text-white/50 text-sm font-medium">
                  Complete chronological extraction of all global broadcast payloads emitted natively from Admin parameters to your structural ID.
               </p>
            </motion.div>

            <div className="glass rounded-2xl border border-white/5 shadow-2xl overflow-hidden relative">
               <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                  <h3 className="text-xl font-black text-white flex items-center gap-3">
                     <Bell className="w-5 h-5 text-indigo-400" /> Secure Push Ledgers
                  </h3>
               </div>
               
               {loading ? (
                   <div className="p-20 text-center flex flex-col items-center justify-center text-white/50">
                      <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                      <p className="text-xs uppercase tracking-widest font-black">Syncing Supabase Transmissions...</p>
                   </div>
               ) : notifications.length === 0 ? (
                  <div className="p-20 text-center flex flex-col items-center justify-center">
                     <Bell className="w-16 h-16 text-white/10 mb-6" />
                     <h4 className="text-xl font-bold text-white/50 mb-2">No Global Arrays Sent</h4>
                     <p className="text-white/30 text-sm max-w-sm mx-auto">You are fully caught up strictly across all channels.</p>
                  </div>
               ) : (
                  <div className="divide-y divide-white/5 font-sans">
                     {notifications.map((notif, idx) => (
                        <motion.div 
                           initial={{opacity: 0, x: -10}}
                           animate={{opacity: 1, x: 0}}
                           transition={{delay: idx * 0.05}}
                           key={notif.id}
                           className="p-6 md:p-8 hover:bg-white/[0.02] transition-colors group flex flex-col md:flex-row gap-6 items-start"
                        >
                           <div className="shrink-0">
                               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner border ${
                                   notif.type === 'article' ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' :
                                   notif.type === 'question_paper' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                   'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                               }`}>
                                  {notif.type === 'article' ? <FileText className="w-5 h-5" /> :
                                   notif.type === 'question_paper' ? <LayoutList className="w-5 h-5" /> :
                                   <Bell className="w-5 h-5" />}
                               </div>
                           </div>
                           
                           <div className="flex-1 min-w-0">
                               <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                                  <h4 className="text-lg font-bold text-white/90">{notif.title}</h4>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30 border border-white/5 bg-[#020617]/50 px-2 py-1 rounded inline-flex w-fit">
                                      {notif.type} Payload
                                  </span>
                               </div>
                               <p className="text-sm font-medium text-white/50 leading-relaxed mb-4">
                                   {notif.body}
                               </p>
                               <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-white/30">
                                  <span>Broadcast Frame: {notif.created_at ? new Date(notif.created_at).toLocaleString() : 'N/A'}</span>
                                  {notif.content_url && (
                                      <a href={notif.content_url} target="_blank" className="flex items-center gap-1 text-sky-400 hover:text-sky-300">
                                          Execute Link Navigation <ArrowRight className="w-3 h-3" />
                                      </a>
                                  )}
                               </div>
                           </div>
                        </motion.div>
                     ))}
                  </div>
               )}
            </div>
         </div>
      </div>
   );
}
