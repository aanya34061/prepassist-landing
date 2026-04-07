"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/rbac";
import { motion } from "framer-motion";
import { ShieldCheck, Mail, Lock, Loader2, ArrowRight, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });


  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });

    // 1. Authenticate via Supabase first to prove identity mathematically
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
       setLoading(false);
       return setMessage({ text: error.message, type: "error" });
    }

    // 2. Cross-reference Firebase users table for assigned Role clearance
    if (authData.user) {
       try {
          const userDoc = await getDoc(doc(db, "users", authData.user.id));
          const userData = userDoc.exists() ? userDoc.data() : null;
          
          const isAssignedAdmin = userData?.role === "admin";
          const isStaticAdmin = isAdminEmail(email);

          if (!isAssignedAdmin && !isStaticAdmin) {
             await supabase.auth.signOut(); // Revoke tokens immediately
             setLoading(false);
             return setMessage({ text: "UNAUTHORIZED: The provided identity lacks Administrative clearance.", type: "error" });
          }

          setMessage({ text: "Authentication successful. Accessing Admin Portal...", type: "success" });
          setTimeout(() => {
             window.location.href = "/admin"; // Redirect safely to Admin Root
          }, 800);

       } catch (dbError) {
          await supabase.auth.signOut();
          setLoading(false);
          return setMessage({ text: "Database sync failed. Could not verify admin role.", type: "error" });
       }
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center font-sans relative overflow-hidden">
      {/* Sleek Premium Ambience Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#6366f110_1px,transparent_1px),linear-gradient(to_bottom,#6366f110_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none" />
      <div className="absolute top-[-20%] -left-64 w-[800px] h-[800px] bg-indigo-500/10 rounded-full mix-blend-screen filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] -right-64 w-[800px] h-[800px] bg-sky-500/10 rounded-full mix-blend-screen filter blur-[120px] pointer-events-none" />
      
      <motion.div 
         initial={{ opacity: 0, scale: 0.95, y: 20 }}
         animate={{ opacity: 1, scale: 1, y: 0 }}
         transition={{ duration: 0.5, ease: "easeOut" }}
         className="w-full max-w-md p-10 bg-[#0a0f1c]/90 border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] z-10 relative backdrop-blur-2xl"
      >
         
         <div className="flex flex-col items-center mb-10 text-center">
            <div className="bg-white p-3 rounded-2xl mb-8 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:scale-105 transition-transform duration-500">
               <Image src="/logo.jpeg" quality={100} alt="PrepAssist Platform Logo" width={160} height={50} className="object-contain" priority />
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black tracking-widest uppercase mb-4">
               <ShieldCheck className="w-3 h-3" /> Secure Administrative Gateway
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white mb-2">Admin Portal</h1>
            <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Authorized Personnel Only</p>
         </div>

         <form onSubmit={handleAdminAuth} className="space-y-5">
            <div>
               <label className="text-[10px] text-white/50 uppercase tracking-widest pl-1 mb-2 block font-black">
                 Admin Email ID
               </label>
               <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#020617] border border-white/10 rounded-xl px-11 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm"
                    placeholder="admin@prepassist.com"
                    required
                  />
               </div>
            </div>

            <div>
               <label className="text-[10px] text-white/50 uppercase tracking-widest pl-1 mb-2 block font-black">
                 Security Key
               </label>
               <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#020617] border border-white/10 rounded-xl px-11 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm tracking-widest"
                    placeholder="••••••••••••"
                    required
                  />
               </div>
            </div>

            {message.text && (
               <motion.div initial={{opacity:0, y:-5}} animate={{opacity:1, y:0}} className={`p-4 rounded-xl border ${message.type === 'error' ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'} text-xs font-bold flex items-center justify-center gap-3`}>
                  {message.type === 'error' ? <ShieldCheck className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                  {message.text}
               </motion.div>
            )}

            <button 
               type="submit"
               disabled={loading}
               className="w-full py-4 mt-4 bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 rounded-xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-50 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
            >
               {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>Secure Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
               )}
            </button>
         </form>
         
         <div className="mt-8 flex flex-col items-center justify-center gap-4 pt-6 border-t border-white/5">
             <div className="flex items-center gap-2 opacity-50">
                <ShieldCheck className="w-3 h-3 text-white" />
                <span className="text-[10px] text-white uppercase tracking-widest font-black">256-Bit SSL Encrypted Connection</span>
             </div>
             <Link href="/login" className="text-[10px] text-white/30 hover:text-white/50 uppercase tracking-widest font-black transition-colors flex items-center gap-2 mt-2">
                <User className="w-3 h-3" /> Return to Student Portal
             </Link>
         </div>
      </motion.div>
    </div>
  );
}
