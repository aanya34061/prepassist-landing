"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { User, Mail, Shield, Zap, Edit3, Loader2, Key } from "lucide-react";
import { motion } from "framer-motion";

export default function AccountSettingsPage() {
   const [profile, setProfile] = useState<any>(null);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const getProfile = async () => {
         const { data: { user } } = await supabase.auth.getUser();
         if (user) {
            const docSnap = await getDoc(doc(db, "users", user.id));
            setProfile({
               name: user.user_metadata?.full_name || "PrepAssist User",
               email: user.email,
               id: user.id,
               credits: docSnap.exists() ? docSnap.data().credits : 0,
               tier: docSnap.exists() ? docSnap.data().tier : 'free',
            });
         }
         setLoading(false);
      };
      getProfile();
   }, []);

   if (loading) return (
     <div className="min-h-[60vh] flex flex-col items-center justify-center text-white/50 space-y-4">
       <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
       <p className="font-mono text-sm uppercase tracking-widest">Decrypting Identity Vector...</p>
     </div>
   );

   return (
      <div className="relative w-full">
         <div className="relative z-10 text-left">
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="mb-8">
               <h2 className="text-3xl font-black tracking-tight mb-2 text-white">
                  Profile Coordinates
               </h2>
               <p className="text-white/50 text-sm font-medium">
                  Manage your personal telemetry, security credentials, and AI Subscription allocations.
               </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               
               {/* Left Core Profile Data */}
               <motion.div initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} transition={{delay: 0.1}} className="space-y-6">
                  
                  <div className="glass p-8 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                     <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3 border-b border-white/5 pb-4">
                        <Shield className="w-5 h-5 text-indigo-400" /> Basic Coordinates
                     </h3>
                     
                     <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-[10px] uppercase font-black tracking-widest text-white/30">Display Identification</label>
                              <div className="bg-[#020617]/50 border border-white/5 px-4 py-3 rounded-xl text-white/90 font-semibold flex items-center justify-between group-hover:border-indigo-500/30 transition-colors">
                                 {profile?.name}
                                 <Edit3 className="w-4 h-4 text-white/20 cursor-not-allowed" />
                              </div>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] uppercase font-black tracking-widest text-white/30">Verified Email Vector</label>
                              <div className="bg-[#020617]/50 border border-white/5 px-4 py-3 rounded-xl text-white/90 font-semibold flex items-center gap-3 relative overflow-hidden group-hover:border-indigo-500/30 transition-colors">
                                 <Mail className="w-4 h-4 text-emerald-400" />
                                 <span className="truncate">{profile?.email}</span>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-2 pt-4">
                           <label className="text-[10px] uppercase font-black tracking-widest text-white/30">Master Identity ID (UUID)</label>
                           <div className="bg-[#020617]/50 border border-white/5 px-4 py-3 rounded-xl text-white/50 font-mono text-xs w-full overflow-x-auto whitespace-nowrap custom-scrollbar">
                              {profile?.id}
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="glass p-8 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                     <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3 border-b border-white/5 pb-4">
                        <Key className="w-5 h-5 text-rose-400" /> Security Array
                     </h3>
                     <div className="flex items-center justify-between p-4 bg-[#020617]/50 border border-white/5 rounded-2xl">
                        <div>
                           <h4 className="font-bold text-white/90">Identity Protection</h4>
                           <p className="text-xs text-white/40 mt-1">Your password is encrypted deeply matching Supabase Core security hashes.</p>
                        </div>
                        <button disabled className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">Locked</button>
                     </div>
                  </div>

               </motion.div>

               {/* Right Side Allocation Ledger */}
               <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} transition={{delay: 0.2}} className="space-y-6">
                  
                  <div className="glass p-8 rounded-[2rem] border border-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.1)] relative overflow-hidden text-center flex flex-col items-center justify-center">
                     <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/30 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <Zap className="w-8 h-8 text-indigo-400" />
                     </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400/70 mb-2">Available Intelligence Cache</div>
                     <div className="text-6xl font-black text-white mb-4 tracking-tighter">{profile?.credits}</div>
                     <div className="w-full bg-white/5 h-px my-6"></div>
                     <div className="flex justify-between items-center w-full px-4 text-sm font-bold">
                        <span className="text-white/40">Current Plan</span>
                        <span className="text-amber-400 uppercase tracking-widest text-xs px-3 py-1 bg-amber-400/10 rounded-md border border-amber-400/20">{profile?.tier} Tier</span>
                     </div>
                  </div>

               </motion.div>

            </div>
         </div>
      </div>
   );
}
