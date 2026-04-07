"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchCreditUsageHistory, CreditUsageRecord } from "@/lib/credits";
import { Zap, Clock, Loader2, ArrowRight, Activity, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function CreditUsageLedgerPage() {
   const [usageRecords, setUsageRecords] = useState<CreditUsageRecord[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const loadUsage = async () => {
         const { data: { user } } = await supabase.auth.getUser();
         if (user) {
            const records = await fetchCreditUsageHistory(user.id);
            setUsageRecords(records);
         }
         setLoading(false);
      };
      loadUsage();
   }, []);

   if (loading) return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-white/50 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="font-mono text-sm uppercase tracking-widest">Querying Physical AI Abstractions...</p>
      </div>
   );

   return (
      <div className="relative w-full">
         <div className="relative z-10 text-left">
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="mb-8 font-sans flex flex-col md:flex-row md:items-start justify-between gap-6">
               <div>
                  <h2 className="text-3xl font-black tracking-tight mb-2 text-white">
                     API Allocation Ledger
                  </h2>
                  <p className="text-white/50 text-sm font-medium max-w-lg leading-relaxed">
                     An absolute chronological record of every intelligent execution triggered by your UUID mapping precise mathematical AI credit burns.
                  </p>
               </div>
               <Link href="/pricing" className="shrink-0 flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-black px-6 py-3 rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-105 transition-all w-fit">
                  <Zap className="w-4 h-4" /> Top-Up API Cache
               </Link>
            </motion.div>

            <div className="glass rounded-2xl border border-white/5 shadow-2xl overflow-hidden relative">
               <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                  <h3 className="text-xl font-black text-white flex items-center gap-3">
                     <Activity className="w-5 h-5 text-orange-400" /> Global Core Telemetry Hooks
                  </h3>
                  <div className="text-xs font-bold text-white/30 uppercase tracking-widest bg-white/5 px-4 py-2 border border-white/5 rounded-lg">
                     {usageRecords.length} Executions
                  </div>
               </div>
               
               {usageRecords.length === 0 ? (
                  <div className="p-20 text-center flex flex-col items-center justify-center">
                     <TrendingDown className="w-16 h-16 text-white/10 mb-6" />
                     <h4 className="text-xl font-bold text-white/50 mb-2">No API Drops Detected</h4>
                     <p className="text-white/30 text-sm max-w-sm mx-auto">Initiate powerful logic abstraction across the dashboard to populate your physical burn arrays.</p>
                  </div>
               ) : (
                  <div className="overflow-x-auto font-sans">
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="bg-[#020617]/50 border-b border-white/5">
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Temporal Vector</th>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Intelligence Routing Component</th>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 text-right">Mathematical API Burn</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                           {usageRecords.map((req, idx) => (
                              <motion.tr 
                                 initial={{opacity:0, y:10}} 
                                 animate={{opacity:1, y:0}} 
                                 transition={{delay: idx * 0.05}}
                                 key={req.id} 
                                 className="hover:bg-white/[0.02] transition-colors group"
                              >
                                 <td className="px-8 py-6">
                                    <div className="flex items-center gap-3">
                                       <Clock className="w-4 h-4 text-white/20 group-hover:text-orange-400 transition-colors" />
                                       <span className="text-sm font-bold text-white/70">
                                          {req.createdAt ? new Date(req.createdAt.seconds * 1000).toLocaleString() : 'Processing Engine...'}
                                       </span>
                                    </div>
                                 </td>
                                 <td className="px-8 py-6 text-sm font-bold text-white/90">
                                    <div className="flex items-center gap-2">
                                       <ArrowRight className="w-3 h-3 text-sky-400" />
                                       {req.featureName}
                                    </div>
                                 </td>
                                 <td className="px-8 py-6 text-right">
                                    <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-4 py-2 rounded-lg text-xs font-black tracking-widest inline-flex items-center gap-1">
                                       -<Zap className="w-3 h-3 fill-rose-500/50" /> {req.cost}
                                    </span>
                                 </td>
                              </motion.tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               )}
            </div>
         </div>
      </div>
   );
}
