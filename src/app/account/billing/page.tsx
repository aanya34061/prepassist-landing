"use client";

import { useState, useEffect, Suspense } from "react";
import { Check, Star, Zap, CreditCard, Loader2, Bot, ScanSearch, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchUserProfile } from "@/lib/credits";
import { redeemPromocode } from "@/lib/promocodes";
import { useRouter } from "next/navigation";

const DODO_PRODUCTS = {
    sub_basic: 'pdt_0NWfLOSWmnFywSwZldAHa', // ₹399/mo
    sub_pro: 'pdt_0NWfLU5OfjnVhmPz86wWZ',   // ₹699/mo
    pack_50: 'pdt_0NWfLXQfz6P34vDNgGT6J',   // ₹99
    pack_120: 'pdt_0NWfLZHVYcwnA37B60iio',  // ₹199
    pack_300: 'pdt_0NWfLbT49dqQm9bNqVVjS',  // ₹399
};

function AccountBillingContent() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [currentCredits, setCurrentCredits] = useState<number | null>(null);
  const [currentTier, setCurrentTier] = useState<string>("free");
  const [isProcessing, setIsProcessing] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [promoMessage, setPromoMessage] = useState<{text: string, type: 'error' | 'success'} | null>(null);
  
  const [selectedPack, setSelectedPack] = useState(50);
  const topUpPricing = {
     50: { price: 99, dodoId: DODO_PRODUCTS.pack_50 },
     120: { price: 199, dodoId: DODO_PRODUCTS.pack_120 },
     300: { price: 399, dodoId: DODO_PRODUCTS.pack_300 }
  };

  useEffect(() => {
     supabase.auth.getUser().then(async ({data}: any) => {
        if (data.user) {
           setUserId(data.user.id);
           setUserEmail(data.user.email);
           const profile = await fetchUserProfile(data.user.id);
           setCurrentCredits(profile.credits);
           setCurrentTier(profile.tier);
        }
     });
  }, []);

  const handleTopUp = async () => {
     if (!userId) return alert("Please authenticate first.");
     setIsProcessing(true);
     const pack = topUpPricing[selectedPack as keyof typeof topUpPricing];
     const redirectUrl = encodeURIComponent(`${window.location.origin}/dashboard?dodo_success_credits=${selectedPack}`);
     window.open(`https://checkout.dodopayments.com/buy/${pack.dodoId}?email=${encodeURIComponent(userEmail)}&quantity=1&redirect_url=${redirectUrl}`, '_blank');
     setIsProcessing(false);
  };

  const handleSubscribe = async (tierName: string, expectedCredits: number, dodoId: string) => {
     if (!userId) return alert("Please authenticate first.");
     const redirectUrl = encodeURIComponent(`${window.location.origin}/dashboard?dodo_success_credits=${expectedCredits}`);
     window.open(`https://checkout.dodopayments.com/buy/${dodoId}?email=${encodeURIComponent(userEmail)}&quantity=1&redirect_url=${redirectUrl}`, '_blank');
  };

  const handleBuyCloudNotes = async () => {
     if (!userId) return alert("Please authenticate first.");
     const redirectUrl = encodeURIComponent(`${window.location.origin}/dashboard?dodo_success_cloudnotes=true`);
     window.open(`https://checkout.dodopayments.com/buy/${DODO_PRODUCTS.pack_120}?email=${encodeURIComponent(userEmail)}&quantity=1&redirect_url=${redirectUrl}`, '_blank');
  };

  const handleRedeem = async () => {
     if (!userId || !promoCodeInput.trim()) return;
     setIsRedeeming(true);
     setPromoMessage(null);
     try {
         const credits = await redeemPromocode(promoCodeInput, userId);
         setPromoMessage({ text: `Success! ${credits} AI Credits mathematically injected safely.`, type: 'success' });
         setPromoCodeInput("");
     } catch (err: any) {
         setPromoMessage({ text: err.message, type: 'error' });
     } finally {
         setIsRedeeming(false);
     }
  };

  return (
    <div className="w-full text-white pb-20">
      <div className="mb-10 text-left">
        <h1 className="text-3xl font-black text-white drop-shadow-sm tracking-tight mb-2">Native Billing Matrix</h1>
        <p className="text-sm text-white/50 font-medium">Manage your UPSC Core Subscription, augment cloud endpoints, and execute AI Top-Ups directly from the internal ledger.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Free Tier */}
         <div className="glass border border-white/5 bg-[#020617]/50 rounded-3xl p-6 flex flex-col relative shadow-xl">
            <h3 className="text-xl font-black text-white mb-2">UPSC Default</h3>
            <p className="text-white/40 text-xs font-medium h-8">Essential tools for baseline navigation.</p>
            <div className="my-6 flex items-baseline gap-1">
               <span className="text-4xl font-black text-white">₹0</span>
               <span className="text-white/40 font-bold text-xs">/mo</span>
            </div>
            <ul className="space-y-4 mb-6 flex-1 text-xs">
               <li className="flex items-center gap-2 text-white/70 font-medium"><Check className="w-4 h-4 text-emerald-400 shrink-0"/> 10 Free AI Credits globally</li>
               <li className="flex items-center gap-2 text-white/70 font-medium"><Check className="w-4 h-4 text-emerald-400 shrink-0"/> Standard News Analytics</li>
               <li className="flex items-center gap-2 text-white/40 font-medium"><Check className="w-4 h-4 text-white/20 shrink-0"/> Local Notes Tracker (No RAG)</li>
            </ul>
            <button disabled className="w-full py-3 rounded-xl font-bold text-xs bg-white/5 text-white/30 border border-white/5">Active Primary Tier</button>
         </div>

         {/* Pro Tier */}
         <div className="glass border border-indigo-500/30 bg-indigo-500/5 rounded-3xl p-6 flex flex-col relative shadow-[0_0_30px_rgba(99,102,241,0.15)] transform lg:-translate-y-4">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-sky-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-lg border border-white/10">Most Popular</div>
            <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2"><Star className="w-5 h-5 text-indigo-400 fill-indigo-400"/> UPSC Pro</h3>
            <p className="text-indigo-200/60 text-xs font-medium h-8">Aggressive semantic extraction logic unchained.</p>
            <div className="my-6 flex items-baseline gap-1">
               <span className="text-4xl font-black text-white">₹399</span>
               <span className="text-white/40 font-bold text-xs">/mo</span>
            </div>
            <ul className="space-y-4 mb-6 flex-1 text-xs">
               <li className="flex items-center gap-2 text-white/80 font-bold"><Check className="w-4 h-4 text-indigo-400 shrink-0"/> 200 AI Credits natively</li>
               <li className="flex items-center gap-2 text-white/80 font-bold"><Check className="w-4 h-4 text-indigo-400 shrink-0"/> Premium RAG DB Interface</li>
               <li className="flex items-center gap-2 text-white/80 font-bold"><Check className="w-4 h-4 text-indigo-400 shrink-0"/> Vision AI Mains Evaluator</li>
            </ul>
            <button onClick={() => handleSubscribe("UPSC Pro", 200, DODO_PRODUCTS.sub_basic)} className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20 transition-all border border-indigo-400 flex items-center justify-center gap-2"><Zap className="w-4 h-4" /> Expand Limits</button>
         </div>

         {/* Ultimate Tier */}
         <div className="glass border border-white/5 bg-[#020617]/50 rounded-3xl p-6 flex flex-col relative shadow-xl hover:border-white/10 transition-colors">
            <h3 className="text-xl font-black text-white mb-2">UPSC Ultimate</h3>
            <p className="text-white/40 text-xs font-medium h-8">Maximum core compute capabilities dynamically unlocked.</p>
            <div className="my-6 flex items-baseline gap-1">
               <span className="text-4xl font-black text-white">₹699</span>
               <span className="text-white/40 font-bold text-xs">/mo</span>
            </div>
            <ul className="space-y-4 mb-6 flex-1 text-xs">
               <li className="flex items-center gap-2 text-white/80 font-medium"><Check className="w-4 h-4 text-amber-400 shrink-0"/> 300 AI Credits natively</li>
               <li className="flex items-center gap-2 text-white/80 font-medium"><Check className="w-4 h-4 text-amber-400 shrink-0"/> 2 GB Cloud Vault natively</li>
               <li className="flex items-center gap-2 text-white/80 font-medium"><Check className="w-4 h-4 text-amber-400 shrink-0"/> Private AI Network Tools</li>
            </ul>
            <button onClick={() => handleSubscribe("UPSC Ultimate", 300, DODO_PRODUCTS.sub_pro)} className="w-full py-3 rounded-xl font-bold text-xs bg-white text-black hover:bg-white/80 transition-all shadow-xl">Engage Ultimate Mode</button>
         </div>
      </div>

      {/* Cloud Storage & Top-Ups Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-10">
         {/* Cloud Notes Vault Upgrade */}
         <div className="glass border border-sky-500/20 bg-sky-500/5 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-sky-500/10 blur-[80px] pointer-events-none transition-all group-hover:bg-sky-500/20"></div>
            <div className="relative z-10">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-sky-500/20 text-sky-400 text-[10px] font-black uppercase tracking-widest border border-sky-500/30 mb-4">Cloud Component</div>
               <h2 className="text-2xl font-black text-white">Permanently Expand Vault</h2>
               <p className="text-white/50 text-xs leading-relaxed max-w-sm mt-2 mb-6">
                  Persist up to 1 GB of your intensive preparation vectors directly in the secure object array without limitations.
               </p>
               <div className="flex items-end justify-between border-t border-white/5 pt-6 mt-auto">
                  <div>
                     <div className="text-white/30 text-[10px] font-black uppercase tracking-widest">Base Rate</div>
                     <span className="text-3xl font-black text-sky-400 border-b border-sky-500/30">₹199</span>
                  </div>
                  <button onClick={handleBuyCloudNotes} className="py-2.5 px-6 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-black shadow-[0_0_15px_rgba(2,132,199,0.5)] transition-all">
                     Construct Storage
                  </button>
               </div>
            </div>
         </div>

         {/* AI Credits Direct Payload Top-Ups */}
         <div className="glass border border-white/10 bg-[#020617]/80 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
               <CreditCard className="w-6 h-6 text-emerald-400"/>
               <div>
                  <h2 className="text-xl font-black text-white">Direct Compute Top-ups</h2>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Non-Expiring Ledger Credits</p>
               </div>
            </div>
            
            <div className="flex gap-2 mb-6 bg-white/[0.02] p-1.5 rounded-xl border border-white/5">
               {[50, 120, 300].map(amt => (
                  <button 
                     key={amt} 
                     onClick={() => setSelectedPack(amt)}
                     className={`flex-1 min-w-[70px] py-2.5 rounded-lg text-xs font-black transition-all border ${selectedPack === amt ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-inner' : 'bg-transparent text-white/50 hover:bg-white/5 border-transparent'}`}
                  >
                     {amt} <span className="text-[9px] text-white/30 uppercase ml-1">Credits</span>
                  </button>
               ))}
            </div>
            
            <div className="flex items-end justify-between border-t border-white/5 pt-6 mt-auto">
               <div>
                  <div className="text-white/30 text-[10px] font-black uppercase tracking-widest">Calculated Cost</div>
                  <span className="text-3xl font-black text-white drop-shadow-md">₹{topUpPricing[selectedPack as keyof typeof topUpPricing].price}</span>
               </div>
               <button 
                  onClick={handleTopUp}
                  disabled={isProcessing}
                  className="py-2.5 px-6 bg-emerald-500/20 border border-emerald-500/50 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
               >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Zap className="w-3 h-3"/> Inject Funds</>}
               </button>
            </div>
         </div>
      </div>

      {/* Promotional Redemption Block natively tied to Ledger array */}
      <div className="glass border border-amber-500/20 bg-[#020617]/80 rounded-3xl p-6 mt-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden w-full">
          <div className="absolute top-0 right-1/4 w-64 h-64 bg-amber-500/5 blur-[80px] pointer-events-none"></div>
          <div className="relative z-10 w-full md:w-1/2">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest border border-amber-500/30 mb-4">Promotional Sequence</div>
             <h2 className="text-xl font-black text-white">Redeem Network Code</h2>
             <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1 mb-2 max-w-sm">Inject Free Compute limits seamlessly via designated external campaign arrays.</p>
             {promoMessage && (
                <div className={`mt-2 text-xs font-bold px-3 py-2 rounded-lg border ${promoMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                   {promoMessage.text}
                </div>
             )}
          </div>
          <div className="relative z-10 w-full md:w-1/2 flex items-center gap-3">
             <input type="text" value={promoCodeInput} onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())} placeholder="ENTER CODE" className="w-full bg-black/50 border border-white/10 p-4 rounded-xl uppercase font-black text-white focus:outline-none focus:border-amber-500/50 shadow-inner tracking-widest" />
             <button onClick={handleRedeem} disabled={isRedeeming || !promoCodeInput} className="min-w-[140px] px-6 py-4 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/50 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">
                 {isRedeeming ? <Loader2 className="w-4 h-4 animate-spin"/> : "Execute"}
             </button>
          </div>
      </div>

      {/* Feature AI Compute Table */}
      <div className="glass border border-white/10 bg-[#020617]/50 rounded-3xl p-6 md:p-10 mt-6 relative overflow-hidden w-full">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-indigo-500/5 blur-[120px] pointer-events-none"></div>
         <div className="relative z-10">
            <h2 className="text-2xl font-black text-white mb-2">Platform Compute Usage Table</h2>
            <p className="text-white/50 text-sm font-medium mb-8 max-w-xl">
               Various platform features dynamically deduct AI credits depending heavily on the intensity of the LLM compute requested by the native backend layer.
            </p>

            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="border-b border-white/10">
                        <th className="py-4 px-2 text-white/50 font-black uppercase tracking-widest text-[10px]">Matrix Feature</th>
                        <th className="py-4 px-2 text-white/50 font-black uppercase tracking-widest text-[10px]">Ledger Cost</th>
                        <th className="py-4 px-2 text-white/50 font-black uppercase tracking-widest text-[10px]">Description</th>
                     </tr>
                  </thead>
                  <tbody className="text-sm font-medium text-white/80">
                     <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="py-5 px-2 flex items-center gap-3">
                           <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><Bot className="w-4 h-4" /></div>
                           <span className="font-bold text-white uppercase tracking-wider text-xs">Standard AI Mentor Chat</span>
                        </td>
                        <td className="py-5 px-2">
                           <span className="bg-amber-500/20 text-amber-500 border border-amber-500/30 px-3 py-1 rounded font-black text-xs uppercase tracking-widest">-1 Credit</span>
                        </td>
                        <td className="py-5 px-2 text-white/50 text-xs">Standard conversational queries fired against the master intelligence cluster.</td>
                     </tr>
                     <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="py-5 px-2 flex items-center gap-3">
                           <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><FileText className="w-4 h-4" /></div>
                           <span className="font-bold text-white uppercase tracking-wider text-xs">Dynamic Raw Notes Builder</span>
                        </td>
                        <td className="py-5 px-2">
                           <span className="bg-amber-500/20 text-amber-500 border border-amber-500/30 px-3 py-1 rounded font-black text-xs uppercase tracking-widest">-2 Credits</span>
                        </td>
                        <td className="py-5 px-2 text-white/50 text-xs">Executing high-yield structural extractions natively within the Notes Tracker.</td>
                     </tr>
                     <tr className="border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="py-5 px-2 flex items-center gap-3">
                           <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400"><ScanSearch className="w-4 h-4" /></div>
                           <span className="font-bold text-white uppercase tracking-wider text-xs">Smart Book Scanner (X-Ray)</span>
                        </td>
                        <td className="py-5 px-2">
                           <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1 rounded font-black text-xs uppercase tracking-widest">-5 Credits</span>
                        </td>
                        <td className="py-5 px-2 text-white/50 text-xs">Heavy-duty Multimodal Image & Document ingestion utilizing intensive internal verification.</td>
                     </tr>
                  </tbody>
               </table>
            </div>
         </div>
      </div>

    </div>
  );
}

export default function AccountBillingPage() {
  return (
    <Suspense fallback={<div className="h-40 flex items-center justify-center text-white/30 font-bold text-sm uppercase tracking-widest animate-pulse"><Loader2 className="w-5 h-5 animate-spin mr-3"/> Establishing Ledger Array...</div>}>
      <AccountBillingContent />
    </Suspense>
  );
}
