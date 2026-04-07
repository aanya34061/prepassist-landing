"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchTransactionHistory, TransactionRecord } from "@/lib/credits";
import { CreditCard, ArrowDownToLine, Clock, Loader2, CheckCircle2, History, XCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function PaymentsHistoryPage() {
   const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const loadTx = async () => {
         const { data: { user } } = await supabase.auth.getUser();
         if (user) {
            const txs = await fetchTransactionHistory(user.id);
            setTransactions(txs);
         }
         setLoading(false);
      };
      loadTx();
   }, []);

   if (loading) return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-white/50 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="font-mono text-sm uppercase tracking-widest">Querying Global Ledgers...</p>
      </div>
   );

   return (
      <div className="relative w-full">
         <div className="relative z-10 text-left">
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="mb-8">
               <h2 className="text-3xl font-black tracking-tight mb-2 text-white">
                  Payments Made
               </h2>
               <p className="text-white/50 text-sm font-medium">
                  Every AI Credit pack you purchase is physically recorded here mapping explicitly against your exact subscription plan history chronologically.
               </p>
            </motion.div>

            <div className="glass rounded-2xl border border-white/5 shadow-2xl overflow-hidden relative">
               <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                  <h3 className="text-xl font-black text-white flex items-center gap-3">
                     <CreditCard className="w-5 h-5 text-indigo-400" /> Absolute Transaction History
                  </h3>
                  <div className="text-xs font-bold text-white/30 uppercase tracking-widest bg-white/5 px-4 py-2 border border-white/5 rounded-lg">
                     {transactions.length} Records Found
                  </div>
               </div>
               
               {transactions.length === 0 ? (
                  <div className="p-20 text-center flex flex-col items-center justify-center">
                     <History className="w-16 h-16 text-white/10 mb-6" />
                     <h4 className="text-xl font-bold text-white/50 mb-2">No Transactions Mapped</h4>
                     <p className="text-white/30 text-sm max-w-sm mx-auto">Purchase AI Credits securely via the Billing matrices to log your initial receipt.</p>
                  </div>
               ) : (
                  <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="bg-[#020617]/50 border-b border-white/5">
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Temporal Stamp (Date)</th>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Package ID</th>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 text-right">Value (INR)</th>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 text-center">AI Credits Injected</th>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 text-right">Gateway Status</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                           {transactions.map((tx, idx) => (
                              <motion.tr 
                                 initial={{opacity:0, y:10}} 
                                 animate={{opacity:1, y:0}} 
                                 transition={{delay: idx * 0.05}}
                                 key={tx.id} 
                                 className="hover:bg-white/[0.02] transition-colors group"
                              >
                                 <td className="px-8 py-6">
                                    <div className="flex items-center gap-3">
                                       <Clock className="w-4 h-4 text-white/20 group-hover:text-indigo-400 transition-colors" />
                                       <span className="text-sm font-bold text-white/70">
                                          {tx.createdAt ? new Date(tx.createdAt.seconds * 1000).toLocaleString() : 'Processing Engine...'}
                                       </span>
                                    </div>
                                 </td>
                                 <td className="px-8 py-6 text-sm font-bold text-white/90">
                                    <div className="flex items-center gap-2">
                                       <ArrowDownToLine className="w-3 h-3 text-sky-400" />
                                       {tx.planName}
                                    </div>
                                 </td>
                                 <td className="px-8 py-6 text-sm font-black text-white text-right">
                                    ₹{tx.costINR}.00
                                 </td>
                                 <td className="px-8 py-6 text-center">
                                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-md text-xs font-black tracking-widest">
                                       +{tx.amount} AI
                                    </span>
                                 </td>
                                 <td className="px-8 py-6 text-right">
                                    {tx.status === 'Success' ? (
                                       <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                                          <CheckCircle2 className="w-4 h-4" /> Cleared
                                       </div>
                                    ) : (
                                       <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400">
                                          <XCircle className="w-4 h-4" /> Failed / Blocked
                                       </div>
                                    )}
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
