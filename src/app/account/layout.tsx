"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { User, CreditCard, Shield, Settings, Bell, Zap } from "lucide-react";

export default function AccountSettingsLayout({ children }: { children: React.ReactNode }) {
   const pathname = usePathname() || "";

   const NavLink = ({ href, icon: Icon, label }: any) => {
      const isActive = pathname === href;
      return (
         <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${isActive ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}>
            <Icon className="w-5 h-5" /> {label}
         </Link>
      );
   };

   return (
      <div className="min-h-screen bg-[#020617] p-6 lg:p-12 relative overflow-hidden">
         {/* Ambient Core Lighting */}
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen opacity-50 z-0"></div>

         <div className="max-w-7xl mx-auto relative z-10">
            <h1 className="text-4xl font-black text-white mb-8 tracking-tight">System Settings</h1>
            
            <div className="flex flex-col md:flex-row gap-8">
               
               {/* V1 Replicated Inner Navigation Settings Menu */}
               <aside className="w-full md:w-72 shrink-0 space-y-2">
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl mb-6">
                     <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-1">Configuration Matrix</p>
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Global Account Subsystems</p>
                  </div>
                  
                  <nav className="space-y-1">
                     <NavLink href="/account/settings" icon={User} label="Profile Coordinates" />
                     <NavLink href="/account/payments" icon={CreditCard} label="Payments Made" />
                     <NavLink href="/account/usage" icon={Zap} label="Core API Telemetry" />
                     <NavLink href="/account/notifications" icon={Bell} label="System Transmissions" />
                     <NavLink href="/account/billing" icon={CreditCard} label="Upgrade Native Tier" />
                  </nav>
               </aside>

               {/* Dynamic Feature Sub-Layout */}
               <main className="flex-1">
                  {children}
               </main>
               
            </div>
         </div>
      </div>
   );
}
