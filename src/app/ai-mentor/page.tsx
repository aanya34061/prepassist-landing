"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Send, Bot, User as UserIcon, Loader2, Sparkles, ChevronRight, BookOpen, AlertCircle } from "lucide-react";

// Structure matches Google GenAI SDK expectation
type MessagePart = { text: string };
type ChatMessage = { role: "user" | "model"; parts: MessagePart[] };

// Lightweight structural parser for AI Output formatting perfectly mirroring the PrepAssist Markdown engine
const formatAIResponse = (text: string) => {
   const segments = text.split(/(\*\*.*?\*\*|###\s.*?$)/gm);
   return segments.map((seg, idx) => {
      if (seg.startsWith('**') && seg.endsWith('**')) {
         return <strong key={idx} className="font-black text-indigo-900 mx-1">{seg.slice(2, -2)}</strong>;
      }
      if (seg.startsWith('### ')) {
         return <h3 key={idx} className="text-xl md:text-2xl font-black text-slate-800 mt-6 mb-3 tracking-tight">{seg.replace('### ', '')}</h3>;
      }
      if (seg.trim() === '') return null;
      // Handle line breaks properly
      return <span key={idx}>{seg.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}</span>;
   });
};

export default function AIMentorPage() {
   const [messages, setMessages] = useState<ChatMessage[]>([]);
   const [input, setInput] = useState("");
   const [isGenerating, setIsGenerating] = useState(false);
   const [userId, setUserId] = useState<string | null>(null);
   const [errorParam, setErrorParam] = useState<string | null>(null);
   const scrollRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
      const authSync = async () => {
         const { data } = await supabase.auth.getSession();
         if (data.session) {
            setUserId(data.session.user.id);
            // Inject initial Greeting
            setMessages([{
               role: "model",
               parts: [{ text: "### Greetings, Aspirant.\nI am the PrepAssist Core Mentor. How can I assist you with your UPSC Strategy, Syllabus Analysis, or Conceptual doubt clearing today?" }]
            }]);
         } else {
            window.location.href = "/login";
         }
      };
      authSync();
   }, []);

   useEffect(() => {
      // Auto scroll to bottom
      if (scrollRef.current) {
         scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
   }, [messages, isGenerating]);

   const submitPrompt = async (forcedPrompt?: string) => {
      const payloadText = forcedPrompt || input;
      if (!payloadText.trim() || isGenerating || !userId) return;

      const newUserMsg: ChatMessage = { role: "user", parts: [{ text: payloadText }] };
      const currentHistory = [...messages, newUserMsg];
      
      setMessages(currentHistory);
      setInput("");
      setIsGenerating(true);
      setErrorParam(null);

      try {
         const { data: { session } } = await supabase.auth.getSession();
         if (!session?.access_token) throw new Error("Missing Secure Identity.");

         const res = await fetch("/api/agent", {
            method: "POST",
            headers: { 
               "Content-Type": "application/json",
               "Authorization": `Bearer ${session.access_token}`
            },
            // We explicitly filter out the initial UI Greeting because Gemini strictly requires 'user' as the first chronological payload in the matrix.
            body: JSON.stringify({ 
               messages: currentHistory.filter((m, i) => !(i === 0 && m.role === "model"))
            })
         });

         const data = await res.json();

         if (!res.ok) {
            if (res.status === 402) {
               setErrorParam("Insufficient AI Credits natively. Please navigate to the Billing Panel to replenish.");
               // Wipe the user message from UI so they can reuse it when they buy credits
               setMessages(messages);
               setInput(payloadText);
            } else {
               throw new Error(data.error || "Network matrix failure.");
            }
         } else {
            setMessages([...currentHistory, { role: "model", parts: [{ text: data.text }] }]);
         }
      } catch (err: any) {
         setErrorParam(err.message);
         // Fallback rollback
         setMessages(messages);
      } finally {
         setIsGenerating(false);
      }
   };

   const quickPrompts = [
      "Analyze the Geography GS1 Syllabus",
      "Draft a 250-word answer structure for IR Mains",
      "Explain the Monetary Policy Committee",
      "How should I track Current Affairs efficiently?"
   ];

   return (
      <div className="flex flex-col h-screen bg-[#FDFCFB] text-slate-800 font-sans selection:bg-indigo-500/20">
         
         {/* Top Header */}
         <div className="bg-white border-b border-slate-200 px-8 py-5 shrink-0 shadow-sm z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="bg-indigo-600 p-2.5 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)]">
                  <Sparkles className="w-6 h-6 text-white" />
               </div>
               <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">AI Study Mentor</h1>
                  <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Powered by PrepAssist Core Matrix</p>
               </div>
            </div>
            
            <div className="hidden md:flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-lg">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Online Pipeline</span>
            </div>
         </div>

         {/* Chat Interface Envelope */}
         <div className="flex-1 overflow-y-auto px-4 md:px-10 py-8 custom-scrollbar" ref={scrollRef}>
            <div className="max-w-4xl mx-auto space-y-6">
               <AnimatePresence initial={false}>
                  {messages.map((msg, idx) => (
                     <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                     >
                        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border shadow-sm ${msg.role === 'user' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gradient-to-br from-indigo-500 to-indigo-700 border-indigo-400 text-white'}`}>
                           {msg.role === 'user' ? <UserIcon className="w-5 h-5"/> : <Bot className="w-5 h-5"/>}
                        </div>
                        <div className={`p-5 rounded-2xl max-w-[85%] text-sm md:text-base leading-relaxed ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-sm shadow-md' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'}`}>
                           {msg.role === 'user' ? msg.parts[0].text : formatAIResponse(msg.parts[0].text)}
                        </div>
                     </motion.div>
                  ))}
               </AnimatePresence>

               {/* Generation Loading State */}
               {isGenerating && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                     <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center border border-indigo-400 bg-indigo-50 shadow-sm text-indigo-600">
                        <Loader2 className="w-5 h-5 animate-spin" />
                     </div>
                     <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm rounded-tl-sm flex items-center gap-2 text-indigo-600 text-xs font-black tracking-widest uppercase">
                        Synthesizing Neural Output <span className="flex gap-1"><span className="animate-bounce inline-block w-1 h-1 bg-indigo-600 rounded-full"></span><span className="animate-bounce inline-block w-1 h-1 bg-indigo-600 rounded-full delay-75"></span><span className="animate-bounce inline-block w-1 h-1 bg-indigo-600 rounded-full delay-150"></span></span>
                     </div>
                  </motion.div>
               )}
            </div>
         </div>

         {/* Error Alert Box */}
         {errorParam && (
             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 text-red-700 p-3 mx-4 md:mx-10 mb-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-red-200">
               <AlertCircle className="w-4 h-4" /> {errorParam}
             </motion.div>
         )}

         {/* Input Matrix */}
         <div className="bg-white border-t border-slate-200 p-4 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-10">
            <div className="max-w-4xl mx-auto">
               
               {/* Quick Action Chips */}
               {messages.length < 2 && (
                  <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-3 mb-1">
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">Quick Boot:</span>
                     {quickPrompts.map((p, i) => (
                        <button key={i} onClick={() => submitPrompt(p)} disabled={isGenerating} className="shrink-0 px-4 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                           {p}
                        </button>
                     ))}
                  </div>
               )}

               <div className="relative flex items-center shadow-sm">
                  <input 
                     type="text" 
                     value={input}
                     onChange={(e) => setInput(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && submitPrompt()}
                     disabled={isGenerating}
                     className="w-full bg-slate-50 hover:bg-slate-100 transition-colors border-2 border-slate-200 focus:border-indigo-500 focus:bg-white rounded-2xl py-4 pl-6 pr-16 outline-none text-slate-800 font-medium placeholder:text-slate-400 disabled:opacity-50"
                     placeholder="Formulate your query specifically..."
                  />
                  <button 
                     onClick={() => submitPrompt()}
                     disabled={isGenerating || !input.trim()}
                     className="absolute right-3 p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:bg-slate-400"
                  >
                     <Send className="w-4 h-4" />
                  </button>
               </div>
               
               <p className="text-center mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Usage deducts exactly <span className="text-orange-500">1 AI Credit</span> globally per executed query parameter.
               </p>
            </div>
         </div>

      </div>
   );
}
