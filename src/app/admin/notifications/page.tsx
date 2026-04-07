"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Send, Bell, Loader2, Globe, Database } from "lucide-react";

export default function AdminPushNotificationsPage() {
   const [title, setTitle] = useState("");
   const [body, setBody] = useState("");
   const [type, setType] = useState("general");
   const [url, setUrl] = useState("");
   const [isPushing, setIsPushing] = useState(false);

   const handleBroadcast = async () => {
      if (!title || !body) return alert("System Requires a strict Title and Broadcast Body natively.");
      setIsPushing(true);
      try {
         const { error } = await supabase.from('notifications').insert([{
            title,
            body,
            type,
            content_url: url || null,
            is_read: false
         }]);
         
         if (error) throw error;
         
         alert("Global Core Transmission Successful. Broadcast is active to all active terminals.");
         setTitle(""); setBody(""); setUrl("");
      } catch (err: any) {
         alert(`Global Transmission failed: ${err.message}`);
      } finally {
         setIsPushing(false);
      }
   };

   return (
      <div className="max-w-4xl mx-auto space-y-8 font-serif">
         <header className="flex items-center justify-between bg-[#0a0f1c]/80 p-8 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden font-sans">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none mix-blend-screen"></div>
            <div className="relative z-10">
               <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest mb-4">
                  <Globe className="w-3 h-3 animate-pulse" /> Legacy Firebase Broadcast
               </div>
               <h1 className="text-3xl font-black text-white tracking-tight mb-2">Push Transmission Engine</h1>
               <p className="text-white/50 text-sm font-medium">Bypass localized user arrays perfectly injecting raw systemic data blobs directly into the Supabase Universal 'Notifications' persistence layer.</p>
            </div>
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl hidden md:flex items-center justify-center shrink-0 z-10 shadow-inner group-hover:scale-110 transition-transform">
               <Bell className="w-8 h-8 text-amber-500" />
            </div>
         </header>

         <div className="bg-[#0a0f1c]/50 p-8 rounded-[2rem] border border-white/5 shadow-inner">
            <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-8 font-sans border-b border-white/5 pb-4">
                <Database className="w-5 h-5 text-sky-400" /> Payload Configuration
            </h2>
            
            <div className="space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-[0.2em] text-white/30">Transmission Title (Subject)</label>
                  <input 
                     value={title} 
                     onChange={(e)=>setTitle(e.target.value)} 
                     placeholder="e.g. UPSC Prelims 2026 Core Notification Released" 
                     className="w-full bg-[#020617] border border-white/5 focus:border-amber-500/50 outline-none rounded-xl px-4 py-4 font-bold text-white placeholder:text-white/20 transition-colors shadow-inner"
                  />
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-[0.2em] text-white/30">Broadcast Body</label>
                  <textarea 
                     value={body} 
                     onChange={(e)=>setBody(e.target.value)} 
                     placeholder="Deploy critical examination metrics or system telemetry changes here..." 
                     className="w-full h-32 bg-[#020617] border border-white/5 focus:border-amber-500/50 outline-none rounded-xl px-4 py-4 font-semibold text-white/80 placeholder:text-white/20 transition-colors resize-none custom-scrollbar shadow-inner"
                  />
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-[10px] uppercase font-black tracking-[0.2em] text-white/30">Vector Data Type</label>
                     <select 
                        value={type}
                        onChange={(e)=>setType(e.target.value)}
                        className="w-full bg-[#020617] border border-white/5 focus:border-amber-500/50 outline-none rounded-xl px-4 py-4 font-bold text-white/80 transition-colors shadow-inner appearance-none"
                     >
                        <option value="general">Core / General Update</option>
                        <option value="article">Editorial / Content Release</option>
                        <option value="question_paper">Question Bank Update / Exams</option>
                     </select>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] uppercase font-black tracking-[0.2em] text-white/30">Redirect Target Network (Optional)</label>
                     <input 
                        value={url} 
                        onChange={(e)=>setUrl(e.target.value)} 
                        placeholder="e.g. https://prepassist.com/upsc/new" 
                        className="w-full bg-[#020617] border border-white/5 focus:border-amber-500/50 outline-none rounded-xl px-4 py-4 font-bold text-sky-400 placeholder:text-white/20 transition-colors shadow-inner"
                     />
                  </div>
               </div>

               <button 
                  onClick={handleBroadcast}
                  disabled={isPushing || !title || !body}
                  className="w-full py-4 mt-8 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-amber-950 font-black tracking-wide text-lg rounded-xl flex items-center justify-center gap-3 transition-all font-sans"
               >
                  {isPushing ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5"/>}
                  {isPushing ? "Transmitting across Cloud Arrays..." : "Execute Global Broadcast Push"}
               </button>
            </div>
         </div>
      </div>
   );
}
