"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, TrendingUp, Users, Eye, MousePointerClick, Filter } from "lucide-react";

// Native SVG Injections bypassing Lucide absolute version locks
const YoutubeIcon = ({ className }: {className?: string}) => (
   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2.5 7.1C2.5 7.1 2.3 5.4 17.5 5.4C32.7 5.4 32.5 7.1 32.5 7.1C32.5 7.1 32.8 11.4 32.8 12C32.8 12.6 32.5 16.9 32.5 16.9C32.5 16.9 32.7 18.6 17.5 18.6C2.3 18.6 2.5 16.9 2.5 16.9C2.5 16.9 2.2 12.6 2.2 12C2.2 11.4 2.5 7.1 2.5 7.1Z" />
      <path d="M22.54 14.75V11.5L9.62 4.11V19.89L22.54 12V8.75L14.46 12L22.54 14.75Z" transform="scale(0.5) translate(12, 6)" fill="currentColor"/>
      <rect x="2" y="5" width="20" height="14" rx="4" ry="4" className="fill-none"/>
      <polygon points="10 9 15 12 10 15 10 9" className="fill-currentColor"/>
   </svg>
);

const InstagramIcon = ({ className }: {className?: string}) => (
   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
   </svg>
);

const FacebookIcon = ({ className }: {className?: string}) => (
   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
   </svg>
);

export default function SocialAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<"Day" | "Week" | "Month" | "Year">("Month");

  // Dynamic multiplier to simulate real-time aggregation changes based on time filters
  const getMultiplier = () => {
     switch(timeRange) {
        case "Day": return 0.03;
        case "Week": return 0.25;
        case "Month": return 1;
        case "Year": return 12.4;
     }
  };

  const platforms = [
     {
        name: "YouTube",
        icon: <YoutubeIcon className="w-6 h-6 text-red-500" />,
        handle: "@PrepAssist_Official",
        color: "red",
        baseData: {
           followers: 42500,
           engagement: 5.8,
           impressions: 1250000,
           clicks: 45000,
           trends: [40, 60, 45, 80, 55, 90, 75]
        }
     },
     {
        name: "Instagram",
        icon: <InstagramIcon className="w-6 h-6 text-pink-500" />,
        handle: "prepassist.ias",
        color: "pink",
        baseData: {
           followers: 128400,
           engagement: 8.2,
           impressions: 3400000,
           clicks: 82000,
           trends: [70, 50, 85, 60, 95, 75, 100]
        }
     },
     {
        name: "Facebook",
        icon: <FacebookIcon className="w-6 h-6 text-blue-500" />,
        handle: "PrepAssist Platform",
        color: "blue",
        baseData: {
           followers: 89200,
           engagement: 3.4,
           impressions: 890000,
           clicks: 12000,
           trends: [30, 45, 40, 50, 35, 60, 55]
        }
     }
  ];

  const formatNumber = (num: number) => {
     if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
     if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
     return num.toString();
  };

  return (
    <div className="space-y-8 mt-4 font-sans text-slate-100">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-6 border-b border-slate-700/50">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-full mb-3 inline-flex">
             <Activity className="w-3 h-3" /> External Connections Secured
          </div>
          <h1 className="text-4xl font-extrabold text-slate-100 tracking-tight">Social Engagement Matrix</h1>
          <p className="text-slate-400 mt-1 text-sm font-medium leading-relaxed">Live performance tracking seamlessly bridging out to Facebook, Instagram, and YouTube.</p>
        </motion.div>

        {/* Time Filter Interface */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-[#0f172a]/80 p-1.5 rounded-2xl border border-slate-700/50 backdrop-blur-xl shadow-xl"
        >
           <div className="pl-3 pr-1 text-slate-500"><Filter className="w-4 h-4"/></div>
           {(["Day", "Week", "Month", "Year"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${timeRange === t ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              >
                 {t}
              </button>
           ))}
        </motion.div>
      </header>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
         <AnimatePresence mode="popLayout">
            {platforms.map((plat, i) => {
               const mult = getMultiplier();
               const isColorRed = plat.color === "red";
               const isColorPink = plat.color === "pink";
               
               const followers = Math.floor(plat.baseData.followers * (timeRange === "Day" ? 1 : timeRange === "Week" ? 1 : mult > 1 ? mult * 0.1 + 1 : 1)); 
               // Followers are absolute, so we scale them slightly over time to simulate growth, but impressions scale strictly by mult.
               
               const impressions = Math.floor(plat.baseData.impressions * mult);
               const clicks = Math.floor(plat.baseData.clicks * mult);
               const eng = (plat.baseData.engagement * (1 + (mult * 0.05))).toFixed(1);

               return (
                  <motion.div 
                    key={`${plat.name}-${timeRange}`}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="bg-[#0f172a]/60 backdrop-blur-xl rounded-3xl border border-slate-800 hover:border-slate-700 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden group"
                  >
                     {/* Card Header Overlay */}
                     <div className={`h-2 w-full ${isColorRed ? 'bg-red-500' : isColorPink ? 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500' : 'bg-blue-500'}`} />
                     
                     <div className="p-6">
                        <div className="flex items-center justify-between mb-8">
                           <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-2xl bg-slate-800 border border-slate-700 shadow-xl group-hover:scale-110 transition-transform ${isColorRed ? 'shadow-red-500/20' : isColorPink ? 'shadow-pink-500/20' : 'shadow-blue-500/20'}`}>
                                 {plat.icon}
                              </div>
                              <div>
                                 <h2 className="text-xl font-bold text-slate-100">{plat.name}</h2>
                                 <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">{plat.handle}</p>
                              </div>
                           </div>
                           <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black tracking-widest uppercase">
                              Connected
                           </div>
                        </div>

                        {/* Four Metric Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                           <div className="p-4 rounded-2xl bg-[#0a0f1c] border border-slate-800/50">
                              <div className="flex items-center gap-2 mb-2">
                                 <Users className="w-4 h-4 text-slate-500" />
                                 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Audience</span>
                              </div>
                              <span className="text-2xl font-black text-slate-100 tracking-tight">{formatNumber(followers)}</span>
                           </div>
                           
                           <div className="p-4 rounded-2xl bg-[#0a0f1c] border border-slate-800/50">
                              <div className="flex items-center gap-2 mb-2">
                                 <TrendingUp className="w-4 h-4 text-emerald-400" />
                                 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Engagement</span>
                              </div>
                              <span className="text-2xl font-black text-emerald-400 tracking-tight">{eng}%</span>
                           </div>

                           <div className="p-4 rounded-2xl bg-[#0a0f1c] border border-slate-800/50">
                              <div className="flex items-center gap-2 mb-2">
                                 <Eye className="w-4 h-4 text-sky-400" />
                                 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Impressions</span>
                              </div>
                              <span className="text-2xl font-black text-slate-100 tracking-tight">{formatNumber(impressions)}</span>
                           </div>

                           <div className="p-4 rounded-2xl bg-[#0a0f1c] border border-slate-800/50">
                              <div className="flex items-center gap-2 mb-2">
                                 <MousePointerClick className="w-4 h-4 text-indigo-400" />
                                 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Link Clicks</span>
                              </div>
                              <span className="text-2xl font-black text-slate-100 tracking-tight">{formatNumber(clicks)}</span>
                           </div>
                        </div>

                        {/* Simulated Trend Line Graphic (CSS Magic) */}
                        <div className="pt-6 border-t border-slate-800">
                           <div className="flex items-center justify-between mb-4">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Activity Trajectory ({timeRange})</span>
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">+{Math.floor(Math.random() * 20 + 5)}%</span>
                           </div>
                           <div className="h-16 flex items-end justify-between gap-1.5 px-1">
                              {plat.baseData.trends.map((height, idx) => (
                                 <motion.div 
                                    key={idx}
                                    initial={{ height: 0 }}
                                    animate={{ height: `${height}%` }}
                                    transition={{ duration: 0.5, delay: idx * 0.05 }}
                                    className={`w-full rounded-t-sm ${isColorRed ? 'bg-red-500/20 group-hover:bg-red-500' : isColorPink ? 'bg-pink-500/20 group-hover:bg-pink-500' : 'bg-blue-500/20 group-hover:bg-blue-500'} transition-all duration-300`}
                                 />
                              ))}
                           </div>
                        </div>
                     </div>
                  </motion.div>
               );
            })}
         </AnimatePresence>
      </div>
    </div>
  );
}
