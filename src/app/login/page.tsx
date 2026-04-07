"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/rbac";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, ArrowRight, Loader2, User, Phone, MapPin, Eye, EyeOff, BrainCircuit, Target } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" }); // type: "error" | "success"

  // Form Fields natively matching the DB Schema
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [city, setCity] = useState("");
  
  // Custom visibility toggle parameters
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Dynamically catch Route Queries routing users instantly to Registration Mode securely
  useEffect(() => {
    if (typeof window !== "undefined") {
       const params = new URLSearchParams(window.location.search);
       if (params.get("mode") === "register") {
          setIsLogin(false);
       }
       const refParams = params.get("ref");
       if (refParams) {
          setIsLogin(false); // Force switch to Registration
          localStorage.setItem("referralPayload", refParams);
       }
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });
    
    if (isLogin) {
      if (isAdminEmail(email)) {
         setLoading(false);
         return setMessage({ text: "System Conflict: Administrative accounts must exclusively authenticate via the dedicated Admin Gateway.", type: "error" });
      }

      // Direct Authentication Array
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage({ text: error.message, type: "error" });
      else window.location.href = "/dashboard";
    } else {
      // Deep Structural Registration Logic passing Metadata instantly
      if (password !== confirmPassword) {
         setLoading(false);
         return setMessage({ text: "Passwords do not match.", type: "error" });
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
      if (!passwordRegex.test(password)) {
         setLoading(false);
         return setMessage({ text: "Password must contain Upper Case, Lower Case, a Number, and a Special Character (min 8 chars).", type: "error" });
      }

      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
           data: {
              full_name: fullName,
              phone_number: phoneNumber,
              city: city
           }
        }
      });
      
      if (error) {
         setMessage({ text: error.message, type: "error" });
      } else {
         if (data.session) {
            window.location.href = "/dashboard";
         } else {
            setMessage({ text: "Registration completely successful! The system has mapped your metadata. You may now Sign In natively.", type: "success" });
            setIsLogin(true); // Switch smoothly back to view
         }
      }
    }
    
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) setMessage({ text: error.message, type: "error" });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
       return setMessage({ text: "Please enter your registered email address.", type: "error" });
    }
    setLoading(true);
    setMessage({ text: "", type: "" });
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
       redirectTo: `${window.location.origin}/update-password`
    });
    
    if (error) {
       setMessage({ text: error.message, type: "error" });
    } else {
       setMessage({ text: "Information received. If the email is registered, a password reset link has been dispatched.", type: "success" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] flex font-sans overflow-hidden">
      
      {/* LEFT MARKETING PANEL (Visible solely on Desktop) */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-between overflow-hidden shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-20">
         {/* Deep Marketing Background Generation */}
         <div className="absolute inset-0 z-0">
            <Image 
              src="/ai_upsc_marketing.png"
              alt="AI UPSC Ecosystem Platform Architecture"
              fill 
              className={`object-cover transition-all duration-[3000ms] ${isLogin ? 'scale-100 opacity-20' : 'scale-105 opacity-40'}`}
              priority
            />
            {/* Smooth Overlay Gradients */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/70 to-[#020617]/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/20 to-transparent" />
         </div>

         {/* Promotional Content Layer */}
         <div className="relative z-10 p-16 h-full flex flex-col justify-between max-w-2xl">
            {/* Header Logo */}
            <Link href="/" className="inline-block bg-white p-2.5 rounded-xl w-40 hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.1)]">
               <Image src="/logo.jpeg" quality={100} alt="PrepAssist Logo" width={160} height={50} className="object-contain" priority />
            </Link>

            <AnimatePresence mode="wait">
               <motion.div 
                 key={isLogin ? "login" : "register"}
                 initial={{ opacity: 0, x: -30 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 30 }}
                 transition={{ duration: 0.5, ease: "easeOut" }}
                 className="mt-auto mb-16"
               >
                 <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black tracking-widest text-sky-400 mb-6 backdrop-blur-md uppercase shadow-lg">
                    {isLogin ? "Secure Core Access Required" : "Join The Ecosystem Ecosystem"}
                 </div>
                 
                 <h1 className="text-5xl font-black text-white leading-[1.1] mb-6 tracking-tighter drop-shadow-2xl">
                    {isForgotPassword ? (
                      <>Recover your <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">access.</span></>
                    ) : isLogin 
                      ? <>Resume your <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">mastery.</span></>
                      : <>Add the <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-sky-400">Power of AI</span> to your UPSC prep.</>
                    }
                 </h1>
                 
                 <p className="text-lg text-white/60 font-medium leading-relaxed drop-shadow-md">
                    {isForgotPassword ? (
                      "Initiate secure recovery protocols for your identity in the ecosystem. Access instructions will be dispatched to your registered relay."
                    ) : isLogin 
                      ? "The unified True-RAG core is absolutely active. Sign in to access your instant Custom MCQs, Mains Artificial Evaluation, and Web Cloud Vault array."
                      : "Dominate the massive curriculum intelligently. Let PrepAssist automatically synthesize your study materials gracefully securely tracking your dimensional knowledge."
                    }
                 </p>

                 {!isLogin && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
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
                 )}
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
         {/* Mobile Ambience Elements */}
         <div className="lg:hidden absolute top-[-10%] -left-32 w-[600px] h-[600px] bg-indigo-500/10 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none fixed" />
         <div className="lg:hidden absolute bottom-[-10%] -right-32 w-[600px] h-[600px] bg-sky-500/10 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none fixed" />

         <motion.div 
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.5 }}
           className="w-full max-w-md p-8 glass rounded-3xl z-10 border border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl bg-[#0a0f1c]/80 my-auto"
         >
           
           {/* Mobile Only Native Header */}
           <div className="flex flex-col items-center mb-10 lg:hidden">
              <div className="bg-white p-2 rounded-xl mb-6 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                 <Image src="/logo.jpeg" quality={100} alt="PrepAssist Branding" width={130} height={45} className="object-contain" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
                {isForgotPassword ? "Reset Password" : (isLogin ? "Welcome Back" : "Register Free")}
              </h2>
           </div>

           {/* Desktop Dedicated Native Header */}
           <div className="hidden lg:block mb-8">
              <h2 className="text-4xl font-black text-white mb-2 tracking-tight">
                {isForgotPassword ? "Reset Password" : (isLogin ? "Sign In" : "Register Account")}
              </h2>
              <p className="text-white/40 text-sm font-medium">
                {isForgotPassword ? "Enter your registered email to request a secure reset link." : (isLogin ? "Welcome back! Please securely enter your credentials below." : "Join the unified preparation ecosystem natively.")}
              </p>
           </div>

           <form onSubmit={isForgotPassword ? handleForgotPassword : handleAuth} className="space-y-4">
             <AnimatePresence mode="popLayout">
               {(!isLogin && !isForgotPassword) && (
                 <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                   {/* Full Name */}
                   <div>
                     <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-2 ml-1">Full Name</label>
                     <div className="relative">
                       <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><User className="h-4 w-4 text-white/30" /></div>
                       <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="Shruti Sharma" required={!isLogin} />
                     </div>
                   </div>

                   {/* Phone & City Array */}
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-2 ml-1">Phone</label>
                       <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone className="h-4 w-4 text-white/30" /></div>
                         <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full pl-10 pr-3 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="+91 99999" required={!isLogin} />
                       </div>
                     </div>
                     <div>
                       <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-2 ml-1">City</label>
                       <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MapPin className="h-4 w-4 text-white/30" /></div>
                         <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full pl-10 pr-3 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="New Delhi" required={!isLogin} />
                       </div>
                     </div>
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>

             <div>
               <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-2 ml-1">Email Address</label>
               <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                   <Mail className="h-4 w-4 text-white/30" />
                 </div>
                 <input 
                   type="email" 
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   className="w-full pl-11 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors"
                   placeholder="ias.scholar@example.com"
                   required
                 />
               </div>
             </div>

             {!isForgotPassword && (
               <div>
                 <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-2 ml-1">Password</label>
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
                     required={!isForgotPassword}
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
                 {isLogin && (
                    <div className="flex justify-end mt-2">
                       <button type="button" onClick={() => { setIsForgotPassword(true); setMessage({text:"", type:""}); }} className="text-[10px] text-white/40 hover:text-white/80 transition-colors uppercase font-bold tracking-widest">Forgot Password?</button>
                    </div>
                 )}
               </div>
             )}

             <AnimatePresence mode="popLayout">
               {(!isLogin && !isForgotPassword) && (
                 <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden pt-1">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-2 ml-1">Re-Type Password</label>
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
                          required={!isLogin}
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
                    
                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                       <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Strict Password Vault Rules:</p>
                       <ul className="text-xs font-medium text-white/60 space-y-1 list-disc list-inside">
                          <li>Minimum 8 characters length</li>
                          <li>Contains Alphanumeric characters (A-Z, a-z, 0-9)</li>
                          <li>Contains at least one Special Character (!@#$%)</li>
                       </ul>
                    </div>
                 </motion.div>
               )}
             </AnimatePresence>

             {message.text && (
               <motion.div initial={{opacity:0, y:-5}} animate={{opacity:1, y:0}} className={`p-4 border rounded-xl flex items-center justify-center ${message.type === 'error' ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                 <p className={`text-sm text-center font-bold ${message.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>{message.text}</p>
               </motion.div>
             )}

             <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 mt-2 bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(99,102,241,0.3)]"
             >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                   <>
                      {isForgotPassword ? "Send Reset Link" : (isLogin ? "Secure Sign In" : "Register Credentials")} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                   </>
                )}
             </button>
           </form>

           {!isForgotPassword && (
             <>
               <div className="my-6 flex items-center gap-4">
                  <div className="h-px bg-white/10 flex-1"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30">OR CONTINUE WITH</span>
                  <div className="h-px bg-white/10 flex-1"></div>
               </div>

               <button 
                  onClick={handleGoogleLogin}
                  className="w-full py-4 bg-white text-black hover:bg-white/90 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] shadow-xl"
               >
                  <Image src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google Logo" width={18} height={18} />
                  Google Authentication
               </button>
             </>
           )}

           <div className="mt-8 text-center border-t border-white/5 pt-6">
              <p className="text-white/50 text-xs font-medium">
                {isForgotPassword ? (
                   <>
                     Remembered your identity payload?{" "}
                     <button 
                       onClick={() => { setIsForgotPassword(false); setIsLogin(true); setMessage({text:"", type:""}); }} 
                       className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors uppercase tracking-wider ml-2"
                     >
                       Sign In Instead
                     </button>
                   </>
                ) : (
                   <>
                     {isLogin ? "Don't have an active account yet?" : "Already mapped your identity?"}{" "}
                     <button 
                       onClick={() => { setIsLogin(!isLogin); setMessage({text:"", type:""}); }} 
                       className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors uppercase tracking-wider ml-2"
                     >
                       {isLogin ? "Register Now" : "Sign In Instead"}
                     </button>
                   </>
                )}
              </p>
              
              <div className="mt-6">
                 <Link href="/admin/login" className="text-[10px] text-white/30 hover:text-white/50 uppercase tracking-widest font-black transition-colors flex items-center justify-center gap-2">
                    <Lock className="w-3 h-3" /> Secure Administrative Gateway
                 </Link>
              </div>
           </div>
         </motion.div>
      </div>
    </div>
  );
}
