"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { LayoutDashboard, FileText, Target, Activity, Settings, User, LogOut, ChevronDown, PenTool, Globe, Cloud, ListChecks, BookOpen, CreditCard, Zap, Network, Bell, FolderUp, Database, HardDrive, Bot, BrainCircuit, ScanText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { fetchUserProfile } from "@/lib/credits";
import { fetchCloudNotes, formatBytes } from "@/lib/cloud_notes";
import { Engagespot } from "@engagespot/react-component";
import SupportWidget from "./SupportWidget";
import ReferralWidget from "./ReferralWidget";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
   const pathname = usePathname() || "";
   const router = useRouter();
   const [isMenuOpen, setIsMenuOpen] = useState(false);
   const [userEmail, setUserEmail] = useState<string | null>(null);
   const [userName, setUserName] = useState<string | null>(null);
   const [creditBalance, setCreditBalance] = useState<number | null>(null);
   const [dataVolumeBytes, setDataVolumeBytes] = useState<number>(0);
   const [unreadCount, setUnreadCount] = useState<number>(0);
   const [userTier, setUserTier] = useState<string>("free");
   const [userId, setUserId] = useState<string | null>(null);

   useEffect(() => {
     const getUser = async () => {
        try {
           const { data: { user } } = await supabase.auth.getUser();
           if (user) {
              setUserId(user.id);
              setUserEmail(user.email || null);
              setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Explorer');

           // Ensure native Firebase Profile is strictly initialized with Free Credits if new
           const cachedRef = typeof window !== 'undefined' ? localStorage.getItem('referralPayload') : null;
           await fetchUserProfile(user.id, user.email, cachedRef);
           if (cachedRef && typeof window !== 'undefined') localStorage.removeItem('referralPayload');

           // Fetch Vault Storage Native Weight
           try {
              const vaultNodes = await fetchCloudNotes(user.id);
              // Aggregating actual bytes OR assuming 102400 (100KB) for legacy objects mapping
              const nativeWeight = vaultNodes.reduce((acc, curr) => acc + (curr.fileSizeBytes || 102400), 0);
              setDataVolumeBytes(nativeWeight);
           } catch(e) {}

           // Bind Real-Time Ledger listener directly updating UI on deduction mathematically
           const unsub = onSnapshot(doc(db, "users", user.id), (docSnap) => {
              if (docSnap.exists()) {
                 const data = docSnap.data();
                 setCreditBalance(data.credits);
                 if (data.tier) setUserTier(data.tier);
              }
           });
           
           return () => unsub();
        }
        } catch (err: any) {
           // Silently catch Auth token lock steal issues natively
        }
     };
     getUser();

     // Notification Global Synchronization Array
     const syncNotifications = async () => {
        try {
           const { data } = await supabase.from('notifications').select('id');
           if (data) {
              const readArr = JSON.parse(localStorage.getItem('prepassist_read_notifs') || '[]');
              const unread = data.filter((n: { id: string }) => !readArr.includes(n.id)).length;
              setUnreadCount(unread);
           }
        } catch(e) {}
     };

     syncNotifications();
     window.addEventListener('dashboard_notifs_read', syncNotifications);
     
     return () => {
        window.removeEventListener('dashboard_notifs_read', syncNotifications);
     };
  }, []); // Performance Upgrade: Removed pathname dependency protecting Firestore arrays cleanly.

  const handleSignOut = async () => {
     await supabase.auth.signOut();
     router.push("/");
  };

  const publicRoutes = ["/", "/login", "/pricing"];
  if (publicRoutes.includes(pathname) || pathname.startsWith("/admin")) {
     return <>{children}</>;
  }

  const NavLink = ({ href, icon: Icon, label }: any) => {
     const isActive = pathname === href;
     return (
       <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${isActive ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
         <Icon className="w-5 h-5" /> {label}
       </Link>
     );
  };

  const ExpandableNavLink = ({ icon: Icon, label, defaultExpanded = false, subLinks }: any) => {
     const [isExpanded, setIsExpanded] = useState(defaultExpanded);
     const isChildActive = subLinks.some((sl: any) => pathname.startsWith(sl.href));
     
     return (
       <div className="flex flex-col">
          <button onClick={() => setIsExpanded(!isExpanded)} className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all w-full text-left ${isChildActive ? 'text-indigo-400' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5" /> {label}
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </button>
          
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? "max-h-96 mt-1 opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="pl-6 pr-2 py-2 flex flex-col gap-1 border-l-2 border-white/5 ml-6">
               {subLinks.map((link: any, idx: number) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link key={idx} href={link.href} className={`block px-4 py-2 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-indigo-500/20 text-indigo-300' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                      {link.label}
                    </Link>
                  )
               })}
            </div>
          </div>
       </div>
     );
  };

  return (
    <div className="min-h-screen bg-[#020617] flex">
      {/* Sidebar Navigation Matrix */}
      <aside className="fixed left-0 top-0 h-screen w-72 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950 backdrop-blur-3xl border-r border-white/5 flex flex-col z-50 shadow-[20px_0_50px_rgba(0,0,0,0.5)]">
        <div className="h-20 flex items-center px-6 border-b border-white/5 bg-transparent">
           <Link href="/dashboard" className="bg-white p-1 rounded-lg hover:scale-105 transition-transform">
             <Image src="/logo.jpeg" quality={100} alt="PrepAssist Branding" width={140} height={45} className="object-contain" priority/>
           </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto py-8 px-4 space-y-2">
           <div className="text-xs font-black uppercase tracking-widest text-white/30 px-4 mb-4 mt-2">Core Ecosystem</div>
           <NavLink href="/dashboard" icon={LayoutDashboard} label="Dashboard Hub" />
           <NavLink href="/ai-mentor" icon={Bot} label="AI Mentor" />
           <NavLink href="/account/billing" icon={CreditCard} label="Billing & Plans" />
           <NavLink href="/quiz" icon={FileText} label="PDF Extraction" />
           <ExpandableNavLink 
             icon={ScanText} 
             label="X-Ray Reading" 
             defaultExpanded={pathname.startsWith('/xray-reader')}
             subLinks={[
               { href: '/xray-reader/polity', label: 'Polity Agent' },
               { href: '/xray-reader/history', label: 'History Agent' },
               { href: '/xray-reader/economy', label: 'Economy Agent' },
               { href: '/xray-reader/geography', label: 'Geography Agent' },
               { href: '/xray-reader/environment', label: 'Environment Agent' },
               { href: '/xray-reader/science', label: 'Science Agent' },
             ]}
           />
           <NavLink href="/ai-prelims" icon={Target} label="AI Prelims Array" />
           <NavLink href="/progress" icon={Activity} label="Progress Analytics" />

           <div className="text-[10px] font-black uppercase tracking-widest text-white/30 px-4 mb-4 mt-8 pt-4 border-t border-white/5">Advanced Subsystems</div>
           <NavLink href="/mains-bank" icon={PenTool} label="Mains Answer Bank" />
           <NavLink href="/evaluate" icon={PenTool} label="Mains Evaluation" />
           <NavLink href="/daily-news" icon={Globe} label="Current Affairs" />
           <NavLink href="/question-bank" icon={ListChecks} label="Question Bank" />
           <NavLink href="/saved-articles" icon={Globe} label="Saved Articles" />
           <NavLink href="/raw-notes" icon={FolderUp} label="Raw Notes" />
           <NavLink href="/rag-notes" icon={Cloud} label="RAG Notes AI" />
           <NavLink href="/mindmaps" icon={Network} label="AI Mindmaps" />
           <NavLink href="/notes-tracker" icon={BookOpen} label="Notes Tracker" />
           <NavLink href="/cloud-vault" icon={Database} label="Cloud Data Vault" />
        </div>
        
        <div className="p-6 border-t border-white/5 bg-transparent flex flex-col gap-3">
           {userTier === 'ultimate' ? (
              <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 shadow-[0_0_20px_rgba(249,115,22,0.3)] border border-orange-400/50">
                 <Target className="w-4 h-4 text-white" />
                 <span className="font-black text-xs uppercase tracking-widest text-white shadow-sm">Ultimate Status</span>
              </div>
           ) : userTier === 'pro' ? (
              <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-indigo-500/20 backdrop-blur-md shadow-[0_0_20px_rgba(99,102,241,0.2)] border border-indigo-400/30">
                 <BrainCircuit className="w-4 h-4 text-indigo-400" />
                 <span className="font-black text-xs uppercase tracking-widest text-indigo-300">UPSC Pro Active</span>
              </div>
           ) : (
              <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10">
                 <Activity className="w-4 h-4 text-slate-400" />
                 <span className="font-black text-xs uppercase tracking-widest text-slate-400">UPSC Basic</span>
              </div>
           )}
           
           <div className="text-[10px] uppercase font-black tracking-widest text-indigo-200/40 text-center mt-1">
              PrepAssist Cloud Network
           </div>
        </div>
      </aside>

      {/* Main Execution Content Layer */}
      <main className="flex-1 ml-72 flex flex-col min-h-screen relative overflow-x-hidden text-white selection:bg-indigo-500/30">
         {/* Top Glass Header */}
         <header className="sticky top-0 h-20 bg-[#020617]/60 backdrop-blur-xl border-b border-white/5 z-40 px-8 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-3">
               <span className="text-xs font-black uppercase tracking-widest text-white/30 truncate max-w-[200px] md:max-w-none">
                  Authenticated Root <span className="mx-2 text-indigo-500">/</span> {pathname.replace('/', '').toUpperCase() || 'DASHBOARD'}
               </span>
            </div>
            <div className="flex items-center gap-5">
               {/* Realtime Engagespot Global Notification Hub */}
               {process.env.NEXT_PUBLIC_ENGAGESPOT_API_KEY ? (
                  <div className="relative p-1.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5 cursor-pointer shadow-inner z-[100] flex items-center justify-center">
                     <Engagespot 
                        apiKey={process.env.NEXT_PUBLIC_ENGAGESPOT_API_KEY} 
                        userId={userEmail || "anonymous"}
                        theme={{
                           colors: {
                              brandingPrimary: "#6366f1", // Indigo 500
                           }
                        }}
                     />
                  </div>
               ) : (
                  <Link href="/account/notifications" className="relative p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5 cursor-pointer shadow-inner">
                     <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-white' : 'text-white/40'}`} />
                     {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                           <span className="relative shadow-xl shadow-rose-500/50 inline-flex rounded-full h-5 w-5 bg-rose-500 border-2 border-[#020617] text-[9px] font-black items-center justify-center text-white z-10">{unreadCount > 9 ? '9+' : unreadCount}</span>
                        </span>
                     )}
                  </Link>
               )}

               {/* Realtime Credit Rendering Link */}
               <Link href="/account/billing" className="flex items-center gap-2 bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20 px-4 py-1.5 rounded-full hover:bg-orange-500/20 transition-all group">
                  <Zap className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-black text-orange-300">
                     {creditBalance !== null ? `${creditBalance} AI Credits` : 'Syncing...'}
                  </span>
               </Link>

               {/* Cloud Vault Volume Tracking Link */}
               <Link href="/cloud-vault" className="flex items-center gap-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full hover:bg-emerald-500/20 transition-all group">
                  <HardDrive className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-black text-emerald-300">
                     {formatBytes(dataVolumeBytes)} Vault
                  </span>
               </Link>

               {/* Account Management Dropdown */}
               <div className="relative">
                  <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)} 
                    className="flex items-center gap-3 bg-white/5 pl-2 pr-4 py-1.5 rounded-full border border-white/5 shadow-inner hover:bg-white/10 transition-colors group"
                  >
                     <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center font-black text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] group-hover:scale-105 transition-transform">
                        {userName ? userName.charAt(0).toUpperCase() : 'U'}
                     </div>
                     <span className="text-sm font-bold text-white/90 hidden md:block max-w-[150px] truncate">{userName || "User Profile"}</span>
                     <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${isMenuOpen ? 'rotate-180 text-indigo-400' : ''}`} />
                  </button>
               </div>

               {isMenuOpen && (
                 <>
                   <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsMenuOpen(false)} />
                   <div className="absolute right-0 mt-4 w-72 bg-[#0a0f1c] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 overflow-hidden backdrop-blur-3xl animate-in fade-in slide-in-from-top-4 duration-200">
                      <div className="p-5 border-b border-white/10 bg-gradient-to-br from-indigo-500/10 to-transparent">
                         <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-1 flex items-center gap-2"><User className="w-3 h-3"/> Identity Token</p>
                         <p className="text-sm font-bold text-white/90 truncate">{userEmail || "Secure Session Active"}</p>
                      </div>
                      
                      {/* Active RAG Referral Generation Core */}
                      <ReferralWidget userId={userId} />
                      
                      <div className="p-2 space-y-1">
                         <Link href="/account/settings" onClick={() => setIsMenuOpen(false)} className="w-full text-left px-4 py-3 text-sm font-semibold text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-colors flex items-center gap-3 group">
                            <User className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" /> Account Settings
                         </Link>
                         <Link href="/account/payments" onClick={() => setIsMenuOpen(false)} className="w-full text-left px-4 py-3 text-sm font-semibold text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-colors flex items-center gap-3 group">
                            <CreditCard className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform duration-300" /> Payments Made
                         </Link>
                         <div className="h-px bg-white/10 my-2 mx-4 rounded-full"></div>
                         <button onClick={handleSignOut} className="w-full text-left px-4 py-3 text-sm font-bold text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center gap-3 group">
                            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Terminate Auth Session
                         </button>
                      </div>
                   </div>
                 </>
               )}
            </div>
         </header>

         {/* Internal Payload Engine */}
         <div className="flex-1 relative pb-20 mt-6">
            {children}
         </div>

         <SupportWidget />
      </main>
    </div>
  );
}
