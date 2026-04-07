"use client";

import { ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LayoutDashboard, Users, FileText, Settings, LogOut, BookOpen, Share2, ListChecks, Hash, Network, FolderCheck, FileKey, Tag, PenTool, Layers, Database } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "";

  const handleAdminSignOut = async () => {
     await supabase.auth.signOut();
     router.push("/admin/login");
  };

  if (pathname === "/admin/login") {
     return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex dark font-sans">
      {/* Sidebar rigidly enforcing absolute click priorities */}
      <aside className="w-72 border-r border-white/5 glass flex flex-col p-4 fixed left-0 top-0 h-full z-50 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 backdrop-blur-3xl shadow-[20px_0_50px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-2 mb-10 px-2 mt-4 pb-6 border-b border-white/5">
           <div className="bg-white p-2 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:scale-105 transition-transform duration-300 w-full flex items-center justify-center">
              <Image src="/logo.jpeg" quality={100} alt="PrepAssist Logo" width={140} height={45} className="object-contain" priority />
           </div>
        </div>
        
        <nav className="flex-1 space-y-2">
          {[
            { name: 'Dashboard Overview', icon: <LayoutDashboard className="w-5 h-5" />, href: '/admin' },
            { name: 'User Ecosystem', icon: <Users className="w-5 h-5 text-indigo-400" />, href: '/admin/users' },
            { name: 'Hashtag Ontology', icon: <Hash className="w-5 h-5" />, href: '/admin/tags' },
            { name: 'Notes Staging Triage', icon: <FolderCheck className="w-5 h-5" />, href: '/admin/notes' },
            { name: 'X-Ray Matrix Library', icon: <Database className="w-5 h-5 text-sky-400" />, href: '/admin/xray-library' },
            { name: 'Curriculum Maps', icon: <Network className="w-5 h-5" />, href: '/admin/maps' },
            { name: 'Current Affairs Bank', icon: <BookOpen className="w-5 h-5" />, href: '/admin/current-affairs' },
            { name: 'Question Bank DB', icon: <ListChecks className="w-5 h-5" />, href: '/admin/question-bank' },
            { name: 'Mains Answer Bank DB', icon: <PenTool className="w-5 h-5 text-fuchsia-400" />, href: '/admin/mains-bank' },
            { name: 'Flash Cards Config', icon: <Layers className="w-5 h-5 text-emerald-400" />, href: '/admin/flashcards' },
            { name: 'Test Series Builder', icon: <FileKey className="w-5 h-5" />, href: '/admin/question-paper' },
            { name: 'Promotional Matrix', icon: <Tag className="w-5 h-5" />, href: '/admin/promocodes' },
            { name: 'Push Notifications', icon: <span className="relative flex"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-30"></span><span className="relative inline-flex"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></span></span>, href: '/admin/notifications' },
            { name: 'System Logs', icon: <FileText className="w-5 h-5" />, href: '#' },
          ].map((item, i) => (
            <Link key={i} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === item.href ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 shadow-[inset_0_0_20px_rgba(99,102,241,0.2)]' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}>
              {item.icon}
              <span className="font-bold text-sm tracking-wide">{item.name}</span>
            </Link>
          ))}
        </nav>
        
        <div onClick={handleAdminSignOut} className="mt-auto px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl cursor-pointer flex gap-3 transition">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </div>
      </aside>

      {/* Main Content Area natively spaced from Sidebar bounds */}
      <main className="flex-1 ml-72 p-8 relative overflow-x-hidden min-h-screen w-full">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 blur-[120px] rounded-full pointer-events-none opacity-50" />
        <div className="relative z-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
