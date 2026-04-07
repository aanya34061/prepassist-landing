"use client";

import { useState, useEffect } from "react";
import { createPromocode, getPromocodes, togglePromocodeStatus, Promocode } from "@/lib/promocodes";
import { Tag, Zap, Loader2, Play, Square, PlusCircle } from "lucide-react";

export default function PromocodesAdminPage() {
    const [codes, setCodes] = useState<Promocode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    
    const [newCode, setNewCode] = useState("");
    const [newCredits, setNewCredits] = useState(50);
    const [newMaxUses, setNewMaxUses] = useState(100);
    const [errorMsg, setErrorMsg] = useState("");

    const loadCodes = async () => {
        setIsLoading(true);
        try {
            const data = await getPromocodes();
            setCodes(data);
        } catch(e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCodes();
    }, []);

    const handleCreate = async () => {
        if (!newCode.trim() || newCredits <= 0 || newMaxUses <= 0) return setErrorMsg("Invalid parameter configurations.");
        setIsCreating(true);
        setErrorMsg("");
        try {
            await createPromocode(newCode, newCredits, newMaxUses);
            setNewCode("");
            setNewCredits(50);
            setNewMaxUses(100);
            await loadCodes();
        } catch(e: any) {
            setErrorMsg(e.message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleToggle = async (code: string, currentStatus: boolean) => {
        try {
            await togglePromocodeStatus(code, currentStatus);
            await loadCodes();
        } catch(e) {
            console.error(e);
        }
    };

    return (
        <div className="text-white space-y-8">
            <div>
                <h1 className="text-3xl font-black flex items-center gap-3"><Tag className="w-8 h-8 text-indigo-400" /> Promotional Matrix</h1>
                <p className="text-slate-400 mt-2">Generate and monitor absolute arbitrary free AI Credit injection codes for marketing campaigns globally.</p>
            </div>
            
            <div className="glass border border-white/5 p-6 rounded-2xl bg-slate-900/50 shadow-xl">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><PlusCircle className="w-5 h-5 text-indigo-400"/> Mint New Sequence</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-xs uppercase tracking-widest font-black text-slate-500 mb-2">Arbitrary Code String</label>
                        <input type="text" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} placeholder="e.g. UPSC50FREE" className="w-full bg-black/50 border border-white/10 p-3 rounded-xl uppercase font-bold text-white focus:outline-none focus:border-indigo-500 shadow-inner" />
                    </div>
                    <div>
                        <label className="block text-xs uppercase tracking-widest font-black text-slate-500 mb-2">Credits to Inject</label>
                        <input type="number" value={newCredits} onChange={(e) => setNewCredits(Number(e.target.value))} className="w-full bg-black/50 border border-white/10 p-3 rounded-xl font-bold text-white focus:outline-none focus:border-indigo-500 shadow-inner" />
                    </div>
                    <div>
                        <label className="block text-xs uppercase tracking-widest font-black text-slate-500 mb-2">Max Global Uses</label>
                        <input type="number" value={newMaxUses} onChange={(e) => setNewMaxUses(Number(e.target.value))} className="w-full bg-black/50 border border-white/10 p-3 rounded-xl font-bold text-white focus:outline-none focus:border-indigo-500 shadow-inner" />
                    </div>
                    <button onClick={handleCreate} disabled={isCreating} className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl font-black text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-indigo-400">
                        {isCreating ? <Loader2 className="w-5 h-5 animate-spin"/> : "Execute Mint"}
                    </button>
                </div>
                {errorMsg && <p className="text-rose-400 text-sm font-bold mt-4 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">{errorMsg}</p>}
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                    {codes.map(pc => (
                        <div key={pc.code} className={`glass p-6 rounded-2xl border transition-all relative overflow-hidden ${pc.isActive ? 'border-indigo-500/30 hover:border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.1)] bg-slate-900/50' : 'border-rose-500/20 bg-black/40 opacity-70'}`}>
                            {pc.currentUses >= pc.maxUses && <div className="absolute top-0 right-0 bg-rose-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-lg shadow-bl">Exhausted</div>}
                            <h3 className="text-2xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-md">{pc.code}</h3>
                            <p className="text-xs font-bold text-indigo-400 mb-6 flex items-center gap-1"><Zap className="w-4 h-4"/> +{pc.credits} Credits Injection</p>
                            
                            <div className="flex items-center justify-between mt-auto mb-6 bg-black/80 px-4 py-3 rounded-xl border border-white/5">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Global Uses Recorded</span>
                                <span className={`text-lg font-black drop-shadow-sm ${pc.currentUses >= pc.maxUses ? 'text-rose-400' : 'text-emerald-400'}`}>{pc.currentUses} <span className="text-slate-600 text-sm">/ {pc.maxUses}</span></span>
                            </div>

                            <button onClick={() => handleToggle(pc.code, pc.isActive)} className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md ${pc.isActive ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'}`}>
                                {pc.isActive ? <><Square className="w-4 h-4"/> Halt Protocol</> : <><Play className="w-4 h-4"/> Reactivate</>}
                            </button>
                        </div>
                    ))}
                    {codes.length === 0 && <div className="col-span-full text-center py-12 text-slate-500 font-bold uppercase tracking-widest border border-white/5 border-dashed rounded-2xl bg-white/[0.02]">No Promotional Codes Minted in Ledger</div>}
                </div>
            )}
        </div>
    );
}
