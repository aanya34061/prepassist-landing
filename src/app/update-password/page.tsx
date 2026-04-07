"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ArrowRight, Loader2, Target, BrainCircuit, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function UpdatePasswordPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" }); // type: "error" | "success"
  const router = useRouter();

  // Form Fields
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Visibility toggle
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Authentication check block for standard route handling
  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
       if (event === 'PASSWORD_RECOVERY') {
         // This confirms the user is authenticated via the reset link
         setMessage({ text: "Authentication successful via recovery. You can now update your password.", type: "success" });
       }
    });
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });
    
    if (password !== confirmPassword) {
       setLoading(false);
       return setMessage({ text: "Passwords do not match.", type: "error" });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(password)) {
       setLoading(false);
       return setMessage({ text: "Password must contain Upper Case, Lower Case, a Number, and a Special Character (min 8 chars).", type: "error" });
    }

    const { error } = await supabase.auth.updateUser({ password });
    
    if (error) {
       setMessage({ text: error.message, type: "error" });
    } else {
       setMessage({ text: "Password Updated successfully! Securing connection to dashboard...", type: "success" });
       setTimeout(() => {
           window.location.href = "/dashboard";
       }, 2000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] flex font-sans overflow-hidden">
      
      {/* LEFT MARKETING PANEL (Visible solely on Desktop) */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-between overflow-hidden shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-20">
         <div className="absolute inset-0 z-0">
            <Image 
              src="/ai_upsc_marketing.png"
              alt="AI UPSC Ecosystem Platform Architecture"
              fill 
              className={`object-cover transition-all duration-[3000ms] scale-100 opacity-20`}
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/70 to-[#020617]/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/20 to-transparent" />
         </div>

         <div className="relative z-10 p-16 h-full flex flex-col justify-between max-w-2xl">
            <Link href="/" className="inline-block bg-white p-2.5 rounded-xl w-40 hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.1)]">
               <Image src="/logo.jpeg" quality={100} alt="PrepAssist Logo" width={160} height={50} className="object-contain" priority />
            </Link>

            <AnimatePresence mode="wait">
               <motion.div 
                 initial={{ opacity: 0, x: -30 }}
                 animate={{ opacity: 1, x: 0 }}
                 className="mt-auto mb-16"
               >
                 <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black tracking-widest text-sky-400 mb-6 backdrop-blur-md uppercase shadow-lg">
                    Secure Recovery Route
                 </div>
                 
                 <h1 className="text-5xl font-black text-white leading-[1.1] mb-6 tracking-tighter drop-shadow-2xl">
                    Reinstate your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-sky-400">Security</span>.
                 </h1>
                 
                 <p className="text-lg text-white/60 font-medium leading-relaxed drop-shadow-md">
                    You have successfully initiated a recovery sequence. Please enter your new desired security parameters below to re-enter the preparation ecosystem.
                 </p>

                 <motion.div 
                   className="mt-10 grid grid-cols-2 gap-4"
                 >
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors">
                       <BrainCircuit className="w-8 h-8 text-emerald-400 mb-3" />
                       <h4 className="text-white font-bold mb-1 text-sm">True-RAG Architecture</h4>
                       <p className="text-white/40 text-xs font-medium">Extract exact historical context dynamically pulled from live Vector databases absolutely without hallucination.</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors">
                       <Target className="w-8 h-8 text-sky-400 mb-3" />
                       <h4 className="text-white font-bold mb-1 text-sm">Adaptive Formations</h4>
                       <p className="text-white/40 text-xs font-medium">Auto-generate hyper-accurate multi-difficulty MCQ layers testing specifically exactly on parameters you missed.</p>
                    </div>
                 </motion.div>
               </motion.div>
            </AnimatePresence>

            <div className="flex items-center gap-4 text-[10px] font-black text-white/30 uppercase tracking-widest">
               <span>&copy; 2026 PREPASSIST V2</span>
               <div className="w-1 h-1 rounded-full bg-white/20" />
               <span>ENGINEERED FOR EXCELLENCE</span>
            </div>
         </div>
      </div>

      {/* RIGHT AUTHENTICATION PANEL */}
      <div className="w-full lg:w-1/2 flex items-center justify-center relative p-6 h-screen overflow-y-auto custom-scrollbar">
         <div className="lg:hidden absolute top-[-10%] -left-32 w-[600px] h-[600px] bg-indigo-500/10 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none fixed" />
         <div className="lg:hidden absolute bottom-[-10%] -right-32 w-[600px] h-[600px] bg-sky-500/10 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none fixed" />

         <motion.div 
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.5 }}
           className="w-full max-w-md p-8 glass rounded-3xl z-10 border border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl bg-[#0a0f1c]/80 my-auto"
         >
           
           <div className="flex flex-col items-center mb-10 lg:hidden">
              <div className="bg-white p-2 rounded-xl mb-6 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                 <Image src="/logo.jpeg" quality={100} alt="PrepAssist Branding" width={130} height={45} className="object-contain" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
                Update Password
              </h2>
           </div>

           <div className="hidden lg:block mb-8">
              <h2 className="text-4xl font-black text-white mb-2 tracking-tight">
                Update Password
              </h2>
              <p className="text-white/40 text-sm font-medium">
                Please securely construct your new password vault parameters below.
              </p>
           </div>

           <form onSubmit={handleUpdatePassword} className="space-y-4">
             <div>
               <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-2 ml-1">New Password</label>
               <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                   <Lock className="h-4 w-4 text-white/30" />
                 </div>
                 <input 
                   type={showPassword ? "text" : "password"} 
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="w-full pl-11 pr-12 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors"
                   placeholder="••••••••••••"
                   required
                 />
                 <button 
                   type="button"
                   onClick={() => setShowPassword(!showPassword)}
                   className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/30 hover:text-white/60 transition-colors"
                   tabIndex={-1}
                 >
                   {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                 </button>
               </div>
             </div>

             <div>
               <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-2 ml-1">Re-Type New Password</label>
               <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                   <Lock className="h-4 w-4 text-white/30" />
                 </div>
                 <input 
                   type={showConfirmPassword ? "text" : "password"} 
                   value={confirmPassword}
                   onChange={(e) => setConfirmPassword(e.target.value)}
                   className="w-full pl-11 pr-12 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors"
                   placeholder="••••••••••••"
                   required
                 />
                 <button 
                   type="button"
                   onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                   className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/30 hover:text-white/60 transition-colors"
                   tabIndex={-1}
                 >
                   {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                 </button>
               </div>
             </div>
             
             <div className="p-3 bg-white/5 border border-white/10 rounded-xl mt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Strict Password Vault Rules:</p>
                <ul className="text-xs font-medium text-white/60 space-y-1 list-disc list-inside">
                   <li>Minimum 8 characters length</li>
                   <li>Contains Alphanumeric characters (A-Z, a-z, 0-9)</li>
                   <li>Contains at least one Special Character (!@#$%)</li>
                </ul>
             </div>

             {message.text && (
               <motion.div initial={{opacity:0, y:-5}} animate={{opacity:1, y:0}} className={`p-4 border rounded-xl flex items-center justify-center ${message.type === 'error' ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                 <p className={`text-sm text-center font-bold ${message.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>{message.text}</p>
               </motion.div>
             )}

             <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 mt-2 bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.3)]"
             >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                   <>
                      Confirm New Password <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                   </>
                )}
             </button>
           </form>

           <div className="mt-8 text-center border-t border-white/5 pt-6">
              <Link href="/login" className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors uppercase tracking-wider text-xs ml-2">
                Return to Login Session
              </Link>
           </div>
         </motion.div>
      </div>
    </div>
  );
}
