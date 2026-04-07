"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, FileText, ChevronRight, Hash, X, ChevronLeft, Loader2, BookOpen, LayoutGrid, List } from "lucide-react";
import { fetchAffairsByDate, CurrentAffair } from "@/lib/currentAffairs";

// Formatter to securely inject bold headings and structural readability 
const StructuralContentElement = ({ content }: { content: string }) => {
   if (!content) return null;
   const paragraphs = content.split('\n');

   return (
      <div className="w-full">
         {paragraphs.map((para, i) => {
            if (para.startsWith('### ')) return <h3 key={i} className="text-2xl font-black text-slate-900 mt-8 mb-3">{para.replace('### ', '')}</h3>;
            if (para.startsWith('## ')) return <h2 key={i} className="text-3xl font-black text-slate-900 mt-10 mb-4">{para.replace('## ', '')}</h2>;
            if (para.startsWith('# ')) return <h1 key={i} className="text-4xl font-black text-slate-900 mt-12 mb-5">{para.replace('# ', '')}</h1>;
            
            // Empty returns trigger breaks naturally
            if (para.trim().length === 0) return <div key={i} className="h-4" />;

            // Process inline bolding triggers via **Text** mappings
            const parts = para.split(/(\*\*.*?\*\*)/g);
            return (
               <p key={i} className="text-slate-700 text-lg md:text-[21px] leading-[1.85] font-medium mb-5">
                  {parts.map((p, j) => {
                     if (p.startsWith('**') && p.endsWith('**')) {
                        return <strong key={j} className="font-black text-slate-900">{p.slice(2, -2)}</strong>;
                     }
                     return p;
                  })}
               </p>
            );
         })}
      </div>
   );
};

export default function DailyNewsUserPanel() {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSource, setSelectedSource] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [articles, setArticles] = useState<CurrentAffair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeArticleIndex, setActiveArticleIndex] = useState<number | null>(null);

  const filteredArticles = selectedSource === "All" ? articles : articles.filter(a => a.source.toLowerCase() === selectedSource.toLowerCase());

  useEffect(() => {
    loadArticles(selectedDate);
  }, [selectedDate]);

  const loadArticles = async (date: string) => {
    setIsLoading(true);
    const data = await fetchAffairsByDate(date);
    setArticles(data);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-800 font-sans overflow-x-hidden selection:bg-indigo-500/20">
       
       <div className="relative max-w-7xl mx-auto px-6 py-8 lg:py-12 flex flex-col gap-8">
          
          {/* Professional Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
             <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-bold uppercase tracking-widest shadow-sm mb-2">
                   <BookOpen className="w-3 h-3" /> Live Syllabus Integration
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                   Daily News Analysis
                </h1>
                <p className="text-slate-500 font-medium md:text-lg max-w-2xl">UPSC-focused editorial extractions filtered by publication date.</p>
             </div>
             
             {/* Layout Controller (Top Right Corner via flex-end) */}
             <div className="flex items-center bg-white border border-slate-200 shadow-sm rounded-xl p-1 shrink-0">
                <button 
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-indigo-600 shadow-inner' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
                >
                  <LayoutGrid className="w-4 h-4"/> Grid
                </button>
                <button 
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-slate-100 text-indigo-600 shadow-inner' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
                >
                  <List className="w-4 h-4"/> List
                </button>
             </div>
          </div>
          
          {/* Filter Row: Mirroring the physical placement but with premium styling */}
          <div className="flex flex-col lg:flex-row items-stretch gap-4 w-full border-t border-slate-200 pt-8 mt-2">
            
            {/* Date Selection Card */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col justify-center min-w-[300px] shrink-0">
               <label className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3">
                  <CalendarIcon className="w-4 h-4 text-indigo-500" /> 1. Select Target Date
               </label>
               <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 font-semibold rounded-xl px-4 py-3 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-inner"
               />
            </div>

            {/* Publication Source Cards */}
            <div className="flex flex-1 gap-4 overflow-x-auto custom-scrollbar pb-2 lg:pb-0">
               {["All", "The Hindu", "Times of India", "PIB Release"].map((source) => {
                  const isActive = selectedSource === source;
                  return (
                     <button
                        key={source}
                        onClick={() => setSelectedSource(source)}
                        className={`min-w-[160px] flex-1 rounded-2xl p-5 flex flex-col justify-center items-start transition-all duration-200 border text-left
                           ${isActive 
                              ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-600/20 text-white translate-y-[-2px]' 
                              : 'bg-white border-slate-200 shadow-sm text-slate-600 hover:border-slate-300 hover:shadow-md hover:bg-slate-50'
                           }
                        `}
                     >
                        <span className={`text-xs uppercase tracking-widest font-black mb-1 ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                           Publication
                        </span>
                        <span className={`font-bold text-sm md:text-base ${isActive ? 'text-white' : 'text-slate-800'}`}>
                           {source}
                        </span>
                     </button>
                  );
               })}
            </div>
          </div>

          {/* Article Feed Layout Array */}
          <div className="w-full relative z-10 mt-4">
            {isLoading ? (
               <div className="flex flex-col items-center justify-center h-[40vh] opacity-70">
                  <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                  <p className="font-bold tracking-widest uppercase text-xs text-slate-400">Loading analysis...</p>
               </div>
            ) : filteredArticles.length === 0 ? (
               <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex flex-col items-center justify-center h-[40vh] text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                  <FileText className="w-12 h-12 text-slate-300 mb-4" />
                  <h3 className="text-xl font-bold text-slate-600">No Articles Found</h3>
                  <p className="text-slate-400 mt-2 font-medium text-sm">Please select a different date or publication source.</p>
               </motion.div>
            ) : (
               <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-6"}>
                 <AnimatePresence mode="popLayout">
                    {filteredArticles.map((article, idx) => (
                      <motion.article 
                        key={article.id}
                        initial={{opacity: 0, scale: viewMode === 'grid' ? 0.98 : 1, y: viewMode === 'list' ? 20 : 0}}
                        animate={{opacity: 1, scale: 1, y: 0}}
                        transition={{delay: idx * 0.05, duration: 0.3}}
                        className={`group ${viewMode === 'grid' ? 'h-full' : ''}`}
                      >
                         <div className={`bg-white rounded-3xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-indigo-200 flex ${viewMode === 'grid' ? 'flex-col h-full p-6 md:p-8' : 'flex-col md:flex-row p-6 md:px-10 md:py-8 items-center gap-8'}`}>
                           
                           {/* List View Structural Spacer OR Grid Metas */}
                           <div className={`flex flex-col gap-4 ${viewMode === 'list' ? 'md:w-1/4 shrink-0 border-r border-slate-100 pr-6' : ''}`}>
                              <div className="flex flex-wrap items-center gap-2">
                                 <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                   {article.source}
                                 </span>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-1.5">
                                 {article.tags?.slice(0,3).map((tag, i) => (
                                   <span key={i} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-md">
                                      <Hash className="w-3 h-3 block md:hidden xl:block"/> {tag}
                                   </span>
                                 ))}
                              </div>
                           </div>

                           {/* Article Preview Core */}
                           <div className={`flex flex-col flex-1 ${viewMode === 'list' ? '' : 'mt-5'}`}>
                              <h2 className="text-lg md:text-2xl font-bold text-slate-900 leading-snug mb-4 group-hover:text-indigo-600 transition-colors">
                                 {article.title}
                              </h2>

                              {viewMode === "grid" && (
                                 <div className="prose prose-sm max-w-none text-slate-600 mb-6">
                                    <p className="leading-relaxed font-medium line-clamp-3">
                                      {article.content.replace(/(\*\*|#)/g, '')}
                                    </p>
                                 </div>
                              )}
                           </div>

                           {/* Action Hooks */}
                           <div className={`${viewMode === 'grid' ? 'mt-auto pt-5 border-t border-slate-100' : 'md:w-[200px] shrink-0'}`}>
                              <button 
                                onClick={() => setActiveArticleIndex(idx)}
                                className={`flex items-center justify-center gap-2 bg-slate-50 group-hover:bg-indigo-50 text-slate-600 group-hover:text-indigo-600 rounded-xl font-bold text-sm transition-colors border border-slate-200 group-hover:border-indigo-100 ${viewMode === 'grid' ? 'w-full py-3' : 'w-full py-4 text-base shadow-sm'}`}
                              >
                                Read Full Analysis <ChevronRight className="w-4 h-4"/>
                              </button>
                           </div>

                         </div>
                      </motion.article>
                    ))}
                 </AnimatePresence>
               </div>
            )}
          </div>
       </div>

       {/* Ultimate Immersive "Big Window" Reading Frame */}
       <AnimatePresence>
         {activeArticleIndex !== null && (
           <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-slate-900/40 backdrop-blur-md"
           >
             <motion.div 
               initial={{ scale: 0.98, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.98, y: 30 }}
               className="relative w-full h-full md:w-[96vw] md:h-[96vh] max-w-[1600px] bg-white border border-slate-200 shadow-2xl md:rounded-[2.5rem] flex flex-col overflow-hidden"
             >
                {/* Massive Header Engine */}
                <div className="p-6 md:px-12 md:py-8 border-b border-slate-100 flex items-center justify-between bg-white z-10 shrink-0">
                   <div className="flex flex-wrap items-center gap-3">
                     <span className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest border border-indigo-100 shadow-sm">
                       {filteredArticles[activeArticleIndex].source}
                     </span>
                     <span className="bg-slate-50 text-slate-500 px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest border border-slate-200">
                       {filteredArticles[activeArticleIndex].publishDate}
                     </span>
                   </div>
                   <button 
                     onClick={() => setActiveArticleIndex(null)}
                     className="p-3 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 border border-slate-200 transition-colors shadow-sm"
                   >
                     <X className="w-5 h-5 md:w-6 md:h-6" />
                   </button>
                </div>

                {/* Immense Reading Scroll Envelope */}
                <div className="p-6 md:p-16 lg:px-32 overflow-y-auto custom-scrollbar flex-1 bg-white relative">
                   <div className="max-w-[1000px] mx-auto">
                     
                     <h2 className="text-3xl md:text-5xl lg:text-[64px] font-black text-slate-900 leading-[1.1] mb-10 tracking-tight">
                        {filteredArticles[activeArticleIndex].title}
                     </h2>
                     
                     <div className="flex flex-wrap items-center gap-2 mb-16 pb-8 border-b-2 border-slate-100">
                       {filteredArticles[activeArticleIndex].tags?.map((tag, i) => (
                         <span key={i} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest bg-slate-50 text-slate-600 px-4 py-2 rounded-lg border border-slate-200">
                            <Hash className="w-4 h-4 text-slate-400"/> {tag}
                         </span>
                       ))}
                     </div>

                     <div className="prose-none max-w-none pb-20">
                        {/* Dynamic Render Mapping for bolding and structure */}
                        <StructuralContentElement content={filteredArticles[activeArticleIndex].content} />
                     </div>

                   </div>
                </div>

                {/* Massive Footer Controls */}
                <div className="p-4 md:p-8 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-10">
                   <button 
                     onClick={() => setActiveArticleIndex(Math.max(0, activeArticleIndex - 1))}
                     disabled={activeArticleIndex === 0}
                     className="flex items-center gap-3 px-6 py-4 rounded-xl font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white text-slate-700 border border-slate-200 bg-white shadow-sm disabled:shadow-none text-base"
                   >
                     <ChevronLeft className="w-5 h-5"/> <span className="hidden sm:block">Previous Analysis</span>
                   </button>

                   <span className="text-xs md:text-sm font-black tracking-widest text-slate-400 uppercase bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-inner">
                     MAP {activeArticleIndex + 1} OF {filteredArticles.length}
                   </span>

                   <button 
                     onClick={() => setActiveArticleIndex(Math.min(filteredArticles.length - 1, activeArticleIndex + 1))}
                     disabled={activeArticleIndex === filteredArticles.length - 1}
                     className="flex items-center gap-3 px-6 py-4 rounded-xl font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white text-slate-700 border border-slate-200 bg-white shadow-sm disabled:shadow-none text-base"
                   >
                     <span className="hidden sm:block">Next Analysis</span> <ChevronRight className="w-5 h-5"/>
                   </button>
                </div>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
}
