"use client";

import { useState } from "react";
import { Gift, Copy, CheckCircle } from "lucide-react";

export default function ReferralWidget({ userId }: { userId: string | null }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!userId) return;
    const inviteLink = `${window.location.origin}/login?ref=${userId}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-4 my-2 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 group hover:from-emerald-500/20 hover:to-teal-500/20 transition-colors">
       <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
             <Gift className="w-4 h-4 text-emerald-400" />
             <span className="text-xs font-black uppercase text-emerald-300 tracking-widest">Refer & Earn 20 Credits</span>
          </div>
       </div>
       <p className="text-[10px] font-medium text-emerald-200/60 leading-relaxed mb-3">
          Invite friends using your unique link below. You both get <span className="font-bold text-emerald-300">+20 AI Credits</span> instantly when they register.
       </p>
       <button 
          onClick={handleCopy}
          className={`w-full py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${copied ? 'bg-emerald-500/20 text-emerald-300 pointer-events-none' : 'bg-black/40 text-emerald-400 hover:bg-black/60 shadow-inner'}`}
       >
          {copied ? (
             <><CheckCircle className="w-3 h-3" /> Copied to Clipboard!</>
          ) : (
             <><Copy className="w-3 h-3" /> Copy Invite Link</>
          )}
       </button>
    </div>
  );
}
