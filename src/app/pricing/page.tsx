"use client";

import { useState, useEffect, Suspense } from "react";
import { Check, Star, Zap, CreditCard, Loader2, ListTree, Target, PenTool, Database } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchUserProfile, addCredits } from "@/lib/credits";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

// LIVE Dodo Products Mapped from Legacy Data
const DODO_PRODUCTS = {
    sub_basic: 'pdt_0NWfLOSWmnFywSwZldAHa', // ₹399/mo
    sub_pro: 'pdt_0NWfLU5OfjnVhmPz86wWZ',   // ₹699/mo
    pack_50: 'pdt_0NWfLXQfz6P34vDNgGT6J',   // ₹99
    pack_120: 'pdt_0NWfLZHVYcwnA37B60iio',  // ₹199
    pack_300: 'pdt_0NWfLbT49dqQm9bNqVVjS',  // ₹399
};

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [currentCredits, setCurrentCredits] = useState<number | null>(null);
  const [currentTier, setCurrentTier] = useState<string>("free");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Custom Top-Up pack mapping explicitly to Dodo INR constants
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
     // We borrow the 199 INR Dodo ID as requested to fulfill the transaction securely
     const redirectUrl = encodeURIComponent(`${window.location.origin}/dashboard?dodo_success_cloudnotes=true`);
     window.open(`https://checkout.dodopayments.com/buy/${DODO_PRODUCTS.pack_120}?email=${encodeURIComponent(userEmail)}&quantity=1&redirect_url=${redirectUrl}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans w-full py-12 md:py-24 px-6 md:px-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-16 mt-4 md:mt-8">
      <div className="flex justify-between items-center w-full">
         <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm hidden sm:block">
               <Image 
                 src="/logo.jpeg" 
                 alt="PrepAssist Logo" 
                 width={130} 
                 height={40} 
                 className="object-contain" 
                 priority
               />
            </div>
            <div className="bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm sm:hidden">
               <Image 
                 src="/logo.jpeg" 
                 alt="PrepAssist Logo" 
                 width={100} 
                 height={30} 
                 className="object-contain" 
                 priority
               />
            </div>
         </Link>
         <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-900 font-bold text-sm bg-white px-5 py-2.5 rounded-xl border border-slate-200 transition-all shadow-sm flex items-center gap-2">
            ← Return
         </button>
      </div>
      {/* Universal Pricing Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 drop-shadow-sm tracking-tight">Supercharge your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-sky-500">UPSC Output.</span></h1>
        <p className="text-lg text-slate-600 font-medium">Access hyper-optimized analysis, unlimited semantic querying, and granular Mains evaluation arrays directly.</p>
      </div>

      {/* Subscription Tier Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
         {/* Free Tier */}
         <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col relative shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-2xl font-black text-slate-900 mb-2">UPSC Free</h3>
            <p className="text-slate-500 text-sm font-medium h-10">Essential tools to experience the foundational AI architecture.</p>
            <div className="my-8 flex items-baseline gap-1">
               <span className="text-5xl font-black text-slate-900">₹0</span>
               <span className="text-slate-500 font-bold">/mo</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
               <li className="flex items-center gap-3 text-slate-700 font-medium text-sm"><Check className="w-5 h-5 text-emerald-500 shrink-0"/> 10 Free AI Credits globally</li>
               <li className="flex items-center gap-3 text-slate-700 font-medium text-sm"><Check className="w-5 h-5 text-emerald-500 shrink-0"/> Standard News Analytics</li>
               <li className="flex items-center gap-3 text-slate-400 font-medium text-sm"><Check className="w-5 h-5 text-slate-300 shrink-0"/> Local Notes Tracker (No RAG)</li>
            </ul>
            <button disabled className="w-full py-4 rounded-xl font-bold bg-slate-100 text-slate-400 border border-slate-200">Active Default</button>
         </div>

         {/* Pro Tier */}
         <div className="bg-white border border-indigo-200 rounded-3xl p-8 flex flex-col relative shadow-xl transform md:-translate-y-4">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-sky-500 text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md">Most Popular</div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-2"><Star className="w-6 h-6 text-indigo-500 fill-indigo-500"/> UPSC Pro</h3>
            <p className="text-indigo-600/80 text-sm font-medium h-10">Aggressive extraction logic unlocking the full potential of Semantic AI.</p>
            <div className="my-8 flex items-baseline gap-1">
               <span className="text-5xl font-black text-slate-900">₹399</span>
               <span className="text-slate-500 font-bold">/mo</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
               <li className="flex items-center gap-3 text-slate-700 font-medium text-sm"><Check className="w-5 h-5 text-indigo-500 shrink-0"/> 200 AI Credits natively</li>
               <li className="flex items-center gap-3 text-slate-700 font-medium text-sm"><Check className="w-5 h-5 text-indigo-500 shrink-0"/> Premium RAG DB Interface</li>
               <li className="flex items-center gap-3 text-slate-700 font-medium text-sm"><Check className="w-5 h-5 text-indigo-500 shrink-0"/> Vision AI Mains Evaluator Access</li>
               <li className="flex items-center gap-3 text-slate-700 font-medium text-sm"><Check className="w-5 h-5 text-indigo-500 shrink-0"/> Priority Pipeline Extraction</li>
            </ul>
            <button onClick={() => handleSubscribe("UPSC Pro", 200, DODO_PRODUCTS.sub_basic)} className="w-full py-4 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all">Upgrade to Pro</button>
         </div>

         {/* Ultimate Tier */}
         <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col relative shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-2xl font-black text-slate-900 mb-2">Ultimate</h3>
            <p className="text-slate-500 text-sm font-medium h-10">Explicit maximum compute limits strictly tailored for extreme intensive preparation.</p>
            <div className="my-8 flex items-baseline gap-1">
               <span className="text-5xl font-black text-slate-900">₹699</span>
               <span className="text-slate-500 font-bold">/mo</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
               <li className="flex items-center gap-3 text-slate-700 font-medium text-sm"><Check className="w-5 h-5 text-indigo-500 shrink-0"/> 300 AI Credits natively</li>
               <li className="flex items-center gap-3 text-slate-700 font-medium text-sm"><Check className="w-5 h-5 text-indigo-500 shrink-0"/> 2 GB Cloud Storage Vault natively</li>
               <li className="flex items-center gap-3 text-slate-700 font-medium text-sm"><Check className="w-5 h-5 text-indigo-500 shrink-0"/> Dedicated Mentorship Dashboard</li>
               <li className="flex items-center gap-3 text-slate-700 font-medium text-sm"><Check className="w-5 h-5 text-indigo-500 shrink-0"/> Early Access LLM Testing</li>
            </ul>
            <button onClick={() => handleSubscribe("UPSC Ultimate", 300, DODO_PRODUCTS.sub_pro)} className="w-full py-4 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all">Select Ultimate</button>
         </div>
      </div>

      {/* Cloud Storage Expansion */}
      <div className="max-w-4xl mx-auto mt-16 bg-sky-50 border border-sky-200 rounded-3xl p-8 md:p-12 relative overflow-hidden">
         <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-sky-200/50 blur-[100px] pointer-events-none z-0"></div>
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="md:w-2/3 space-y-4">
               <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-100 text-sky-600 text-xs font-black uppercase tracking-widest border border-sky-300">Storage Expansion</div>
               <h2 className="text-3xl md:text-4xl font-black text-slate-900">PrepAssist Cloud Vault</h2>
               <p className="text-slate-600 text-sm md:text-base leading-relaxed max-w-xl">
                  Unlock the full power of native Document Tracking. Bypass the Free Tier restrictions and securely upload up to 1 GB Memory Size of encrypted PDFs directly into your Firebase Cloud Storage container to manage your Curriculum notes eternally.
               </p>
               <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <li className="flex items-center gap-2 text-slate-700 text-sm font-bold"><Check className="w-4 h-4 text-sky-500"/> 1 GB Maximum Configurable Size</li>
                  <li className="flex items-center gap-2 text-slate-700 text-sm font-bold"><Check className="w-4 h-4 text-sky-500"/> Permanent File Lifetime</li>
                  <li className="flex items-center gap-2 text-slate-700 text-sm font-bold"><Check className="w-4 h-4 text-sky-500"/> Zero Data Archiving</li>
                  <li className="flex items-center gap-2 text-slate-700 text-sm font-bold"><Check className="w-4 h-4 text-sky-500"/> Memory-Weight Analytics</li>
               </ul>
            </div>
            
            <div className="md:w-1/3 w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl flex flex-col items-center">
               <div className="text-slate-400 text-sm font-black uppercase tracking-widest mb-2">Monthly Fee</div>
               <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-sky-500 to-indigo-500">₹199</span>
               </div>
               <button onClick={handleBuyCloudNotes} className="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-xl shadow-lg transition-all">
                  Unlock Cloud Vault
               </button>
            </div>
         </div>
      </div>

      {/* Credit Packs Top-up Matrix */}
      <div className="mt-16 bg-white border border-slate-200 shadow-sm rounded-3xl p-10 flex flex-col md:flex-row items-center justify-between gap-10">
         <div className="md:w-1/2 space-y-4">
            <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3"><CreditCard className="w-8 h-8 text-emerald-500"/> Instant Credit Top-ups</h2>
            <p className="text-slate-500 text-sm max-w-md">Depleted your monthly credits but don't want to natively expand your tier limits? Buy instant non-expiring AI Credit bundles explicitly for one-off extraction workloads.</p>
         </div>
         <div className="md:w-1/2 w-full bg-slate-50 rounded-2xl p-6 border border-slate-200">
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
               {[50, 120, 300].map(amt => (
                  <button 
                     key={amt} 
                     onClick={() => setSelectedPack(amt)}
                     className={`flex-1 min-w-[80px] py-4 rounded-xl font-black transition-all ${selectedPack === amt ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                  >
                     {amt}
                  </button>
               ))}
            </div>
            <div className="flex items-center justify-between mt-4">
               <div>
                  <div className="text-slate-400 text-xs font-black uppercase tracking-widest">Total Cost</div>
                  <div className="text-4xl font-black text-slate-900">₹{topUpPricing[selectedPack as keyof typeof topUpPricing].price}</div>
               </div>
               <button 
                  onClick={handleTopUp}
                  disabled={isProcessing}
                  className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold font-sans shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
               >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin"/> : "Purchase Pack"}
               </button>
            </div>
         </div>
      </div>

      </div>

      {/* Compute Ledger Table */}
      <div className="mt-16 bg-white border border-slate-200 shadow-sm rounded-3xl p-10 max-w-7xl mx-auto mb-20 overflow-hidden relative">
         <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-slate-100 rounded-full blur-[100px] pointer-events-none opacity-50 -z-10"></div>
         <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
            <Database className="w-8 h-8 text-indigo-500" />
            <div>
               <h2 className="text-2xl font-black text-slate-900">Compute Cost Ledger</h2>
               <p className="text-sm font-medium text-slate-500 mt-1">Exact AI Credit requirements strictly mapped for every computational feature dynamically.</p>
            </div>
         </div>

         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[600px]">
               <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-y border-slate-200">
                     <th className="py-4 px-6 rounded-tl-xl w-1/3">Feature Subsystem</th>
                     <th className="py-4 px-6 w-1/3">Execution Volume</th>
                     <th className="py-4 px-6 rounded-tr-xl">Mandatory Ledger Cost</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50 transition-colors">
                     <td className="py-5 px-6 flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-500 border border-indigo-100"><ListTree className="w-4 h-4"/></div>
                        <span className="font-bold text-slate-700 text-sm">PDF to Quiz Parsing</span>
                     </td>
                     <td className="py-5 px-6 font-medium text-slate-500 text-sm">Per Standard Document Extracted</td>
                     <td className="py-5 px-6">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 font-black text-xs uppercase tracking-widest rounded-md border border-indigo-100 border-dashed">
                           5 AI Credits
                        </span>
                     </td>
                  </tr>
                  
                  <tr className="hover:bg-slate-50 transition-colors">
                     <td className="py-5 px-6 flex items-center gap-3">
                        <div className="p-2 bg-fuchsia-50 rounded-lg text-fuchsia-500 border border-fuchsia-100"><PenTool className="w-4 h-4"/></div>
                        <span className="font-bold text-slate-700 text-sm">Mains Answer Evaluation</span>
                     </td>
                     <td className="py-5 px-6 font-medium text-slate-500 text-sm">Per Handwritten or Typed Answer Scanned</td>
                     <td className="py-5 px-6">
                        <span className="px-3 py-1 bg-fuchsia-50 text-fuchsia-600 font-black text-xs uppercase tracking-widest rounded-md border border-fuchsia-100 border-dashed">
                           3 AI Credits
                        </span>
                     </td>
                  </tr>
                  
                  <tr className="hover:bg-slate-50 transition-colors">
                     <td className="py-5 px-6 flex items-center gap-3">
                        <div className="p-2 bg-amber-50 rounded-lg text-amber-500 border border-amber-100"><Target className="w-4 h-4"/></div>
                        <span className="font-bold text-slate-700 text-sm">AI Prelims Generation</span>
                     </td>
                     <td className="py-5 px-6 font-medium text-slate-500 text-sm">Per 10 Native Questions Forged</td>
                     <td className="py-5 px-6">
                        <span className="px-3 py-1 bg-amber-50 text-amber-600 font-black text-xs uppercase tracking-widest rounded-md border border-amber-100 border-dashed">
                           2 AI Credits
                        </span>
                     </td>
                  </tr>

                  <tr className="hover:bg-slate-50 transition-colors">
                     <td className="py-5 px-6 flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-500 border border-emerald-100"><Zap className="w-4 h-4"/></div>
                        <span className="font-bold text-slate-700 text-sm">Notes Tracker AI Merging</span>
                     </td>
                     <td className="py-5 px-6 font-medium text-slate-500 text-sm">Per Explicit RAG API Sequence Executed</td>
                     <td className="py-5 px-6">
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 font-black text-xs uppercase tracking-widest rounded-md border border-emerald-100 border-dashed">
                           0.5 AI Credits
                        </span>
                     </td>
                  </tr>
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8 text-center text-white/50 pt-32 font-bold animate-pulse">Loading Dodo Payments Ledger...</div>}>
      <PricingContent />
    </Suspense>
  );
}
