"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("Unknown Element");
  
  const [issueType, setIssueType] = useState<string>("Issue on AI Credits");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
     supabase.auth.getUser().then(({data}) => {
        if (data.user) {
           setUserEmail(data.user.email || "No Email Bound");
           setUserName(data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || "Unknown Client");
        }
     });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!message.trim()) return;

     setIsSubmitting(true);
     
     try {
        await fetch("https://formsubmit.co/ajax/support@prepassist.in", {
            method: "POST",
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                name: userName,
                email: userEmail,
                _subject: `[PrepAssist Incident] ${issueType} - ${userName}`,
                Issue_Category: issueType,
                User_Message: message,
                System_Timestamp: new Date().toISOString()
            })
        });

        setIsSuccess(true);
        setTimeout(() => {
           setIsOpen(false);
           setIsSuccess(false);
           setMessage("");
           setIssueType("Issue on AI Credits");
        }, 5000); // Allow them to read dialogue safely
     } catch (err) {
        alert("Failed to securely transport request. External network block.");
     }
     
     setIsSubmitting(false);
  };

  return (
    <div className="fixed bottom-6 left-[19rem] z-[100] flex flex-col items-start font-sans pointer-events-none">
       
       <AnimatePresence>
          {isOpen && (
             <motion.div 
               initial={{ opacity: 0, y: 20, scale: 0.95 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               exit={{ opacity: 0, y: 20, scale: 0.95 }}
               className="bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl w-[360px] md:w-[400px] mb-4 flex flex-col overflow-hidden origin-bottom-left pointer-events-auto"
             >
                {/* Header Sequence */}
                <div className="bg-indigo-600 p-5 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-lg">
                         <MessageSquare className="w-5 h-5 text-white" />
                      </div>
                      <div>
                         <h3 className="text-white font-black leading-tight">Support Command</h3>
                         <p className="text-indigo-200 text-xs font-semibold">Direct pipeline to Administration</p>
                      </div>
                   </div>
                   <button onClick={() => setIsOpen(false)} className="text-indigo-200 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-1.5 rounded-lg">
                      <X className="w-5 h-5"/>
                   </button>
                </div>

                {isSuccess ? (
                   <div className="p-8 flex flex-col items-center justify-center text-center bg-slate-50 h-[320px]">
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                         <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      </div>
                      <h4 className="text-slate-800 font-black text-lg mb-2">Transmission Secured</h4>
                      <p className="text-slate-500 text-sm font-medium leading-relaxed">
                         Your grievance has been successfully dropped into the High Command mail server. A response vector will lock onto your email within the next 24 Hours.
                      </p>
                   </div>
                ) : (
                   <form onSubmit={handleSubmit} className="p-5 bg-slate-50 flex flex-col gap-4">
                      
                      <div className="flex flex-col gap-2">
                         <label className="text-xs font-black uppercase tracking-widest text-slate-400">Target Issue Vector</label>
                         <select 
                            value={issueType}
                            onChange={(e) => setIssueType(e.target.value)}
                            className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-medium cursor-pointer"
                         >
                            <option>Issue on AI Credits</option>
                            <option>Cloud Storage Anomaly</option>
                            <option>Subscription & Billing</option>
                            <option>Critical Bug Report</option>
                            <option>General Support / Other</option>
                         </select>
                      </div>

                      <div className="flex flex-col gap-2">
                         <label className="text-xs font-black uppercase tracking-widest text-slate-400">Data Transmission</label>
                         <textarea 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Describe your complication securely..."
                            rows={4}
                            className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-medium resize-none shadow-sm"
                            required
                         />
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2 rounded-lg font-medium">
                         <AlertCircle className="w-4 h-4 shrink-0" /> Response will take 24 hours usually.
                      </div>

                      <button 
                         type="submit" 
                         disabled={isSubmitting || !message.trim()}
                         className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-indigo-600"
                      >
                         {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                         {isSubmitting ? "Executing Transmission..." : "Submit Grievance to Server"}
                      </button>
                   </form>
                )}
             </motion.div>
          )}
       </AnimatePresence>

       {/* Floating Toggle Bubble */}
       <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`pointer-events-auto flex items-center justify-center w-14 h-14 rounded-full shadow-[0_10px_25px_rgba(79,70,229,0.4)] transition-all duration-300 hover:scale-110 active:scale-95 ${isOpen ? 'bg-slate-800 text-white shadow-slate-900/30' : 'bg-indigo-600 text-white'}`}
       >
          {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
       </button>
       {/* Ambient Ring */}
       {!isOpen && (
          <div className="absolute top-0 right-0 w-14 h-14 bg-indigo-500 rounded-full animate-ping opacity-20 -z-10 pointer-events-none"></div>
       )}

    </div>
  );
}
