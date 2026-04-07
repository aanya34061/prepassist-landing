"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, Globe, ArrowRight, Link as LinkIcon, Trash2, X, XCircle, FileText, Loader2, BookOpen, Plus, Search, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchSavedWebsites, addSavedWebsite, deleteSavedWebsite, SavedWebsite } from "@/lib/saved_articles";
import { saveCloudNote, CORE_SUBJECTS, OPTIONAL_SUBJECTS } from "@/lib/cloud_notes";

export default function SavedArticlesPage() {
  const [userId, setUserId] = useState<string>("");
  const [websites, setWebsites] = useState<SavedWebsite[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Extraction Modal State
  const [activeSite, setActiveSite] = useState<SavedWebsite | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedContent, setExtractedContent] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Saving to Notes State
  const [selectedSubject, setSelectedSubject] = useState<string>(CORE_SUBJECTS[0]);
  const [isSavingToNotes, setIsSavingToNotes] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [optionalSubject, setOptionalSubject] = useState<string | null>(null);
  const [customCoreSubjects, setCustomCoreSubjects] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: any) => {
       if (data.session?.user) {
          setUserId(data.session.user.id);
       } else {
          setUserId("local_guest_tracker");
       }
    });
  }, []);

  useEffect(() => {
    if (userId && userId !== "local_guest_tracker") {
       loadSavedSites();
       
       const storedOpt = localStorage.getItem(`local_optional_${userId}`);
       if (storedOpt) setOptionalSubject(storedOpt);
       
       const storedCore = localStorage.getItem(`local_custom_core_${userId}`);
       if (storedCore) {
          try { setCustomCoreSubjects(JSON.parse(storedCore)); } catch(e) {}
       }
    }
  }, [userId]);

  const loadSavedSites = async () => {
     const data = await fetchSavedWebsites(userId);
     setWebsites(data);
  };

  const handleSaveWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    let urlToSave = newUrl.trim();
    if (!urlToSave.startsWith('http')) {
       urlToSave = 'https://' + urlToSave;
    }

    try {
       setIsAdding(true);
       await addSavedWebsite(urlToSave, userId);
       setNewUrl("");
       await loadSavedSites();
    } catch(err) {
       console.error(err);
    } finally {
       setIsAdding(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
     e.stopPropagation();
     await deleteSavedWebsite(id, userId);
     await loadSavedSites();
  };

  const openExtractionModal = async (site: SavedWebsite) => {
     setActiveSite(site);
     setExtractedContent(null);
     setErrorMsg("");
     setSavedSuccess(false);
     setIsExtracting(true);

     try {
       const res = await fetch("/api/notes/extract-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: site.url })
       });
       
       const data = await res.json();
       
       if (!res.ok) {
          throw new Error(data.error || "Failed to extract website mapping natively.");
       }

       setExtractedContent(data.text);
       setPageTitle(data.pageTitle || site.domain);
     } catch(err: any) {
       setErrorMsg(err.message || "Failed to ping website extraction LLM.");
     } finally {
       setIsExtracting(false);
     }
  };

  const handleSaveToNotesTracker = async () => {
     if (!extractedContent || !activeSite) return;
     
     try {
        setIsSavingToNotes(true);
        await saveCloudNote({
           userId: userId,
           title: "Extracted: " + (pageTitle || activeSite.domain),
           subject: selectedSubject,
           categoryType: CORE_SUBJECTS.includes(selectedSubject) ? 'core' : (OPTIONAL_SUBJECTS.includes(selectedSubject) ? 'optional' : 'other'),
           type: 'url',
           content: extractedContent,
           sourceUrl: activeSite.url,
           tags: [activeSite.domain.split('.')[0]]
        });
        setSavedSuccess(true);
        setTimeout(() => {
           setActiveSite(null);
        }, 2000);
     } catch (err) {
        console.error("Failed to save to Notes", err);
        alert("Failed to securely save to Notes Tracker.");
     } finally {
        setIsSavingToNotes(false);
     }
  };

  const filteredWebsites = websites.filter(site => 
     site.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
     site.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
     site.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#333333] font-sans pb-20 selection:bg-[#F97316]/20">
       
       <div className="max-w-4xl mx-auto px-6 pt-12 relative z-10 w-full mb-32">
          
          {/* Header Section */}
          <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="mb-12">
             <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FDF4ED] border border-[#F97316]/20 text-[#F97316] text-[10px] font-black uppercase tracking-widest mb-6 shadow-sm">
                <Bookmark className="w-3.5 h-3.5" /> Bookmarks Tracking Hub
             </div>
             <h1 className="text-4xl font-serif font-black text-[#2A2A2A] tracking-tight mb-4 leading-tight">
               Saved Articles Vault
             </h1>
             <p className="text-[#8B5A2B]/80 text-base max-w-2xl font-medium leading-relaxed">
               Share or paste external editorial blogs or URLs here. Extensively parse them through LLM endpoints into raw readable Markdown natively tracking tightly against your active subjects.
             </p>
          </motion.div>

          <div className="grid lg:grid-cols-12 gap-8">
              
             {/* Left Column: Form & Search */}
             <div className="lg:col-span-12 space-y-6">
                
                {/* Save Input Controller */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#E5E0D8] shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-[#F97316]"></div>
                   <h3 className="text-lg font-black text-[#2A2A2A] mb-4 flex items-center gap-2 font-serif">
                      <Plus className="w-5 h-5 text-[#F97316]"/> Add New Resource URL
                   </h3>
                   <form onSubmit={handleSaveWebsite} className="flex flex-col md:flex-row gap-4">
                      <div className="relative flex-1">
                         <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <LinkIcon className="w-5 h-5 text-[#8B5A2B]" />
                         </div>
                         <input 
                            type="text" 
                            disabled={isAdding}
                            value={newUrl}
                            onChange={(e) => setNewUrl(e.target.value)}
                            placeholder="https://news.example.com/article-slug" 
                            className="w-full bg-[#F3EFE9] border border-[#E5E0D8] rounded-2xl py-4 pl-12 pr-4 text-[#2A2A2A] placeholder-[#A89F91] focus:bg-white focus:border-[#F97316]/50 outline-none transition-all font-medium text-sm"
                         />
                      </div>
                      <button 
                         type="submit" 
                         disabled={isAdding || !newUrl.trim()}
                         className="md:w-48 flex items-center justify-center gap-2 py-4 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold rounded-2xl transition-all shadow-md disabled:opacity-50"
                      >
                         {isAdding ? <Loader2 className="w-5 h-5 animate-spin"/> : <><Bookmark className="w-4 h-4"/> Secure Bookmark</>}
                      </button>
                   </form>
                </div>

                {/* Search Bar */}
                <div className="relative max-w-lg mb-8 pt-4">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none pt-4">
                      <Search className="w-5 h-5 text-[#8B5A2B]" />
                   </div>
                   <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search saved resources or domains..." 
                      className="w-full bg-[#F3EFE9] border border-[#E5E0D8] rounded-full py-3.5 pl-12 pr-4 text-[#2A2A2A] placeholder-[#A89F91] outline-none transition-all focus:bg-white focus:border-[#F97316]/50 font-medium text-sm"
                   />
                </div>
             </div>

             {/* Right Column: Bookmarks Grid */}
             <div className="lg:col-span-12 mt-4">
                {filteredWebsites.length === 0 ? (
                   <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-[#E5E0D8] rounded-3xl bg-white/50">
                      <Bookmark className="w-10 h-10 text-[#A89F91] mb-3" />
                      <p className="font-bold text-[#A89F91] text-sm">No Bookmarks Found in Vault.</p>
                   </motion.div>
                ) : (
                   <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-5">
                      <AnimatePresence>
                         {filteredWebsites.map((site) => (
                            <motion.div 
                               initial={{ opacity: 0, scale: 0.95 }} 
                               animate={{ opacity: 1, scale: 1 }} 
                               exit={{ opacity: 0, scale: 0.95 }} 
                               key={site.id} 
                               className="group p-6 rounded-2xl bg-white border border-[#E5E0D8] hover:border-[#F97316]/30 transition-colors shadow-sm relative overflow-hidden flex flex-col justify-between"
                            >
                               <div className="relative z-10">
                                  <div className="flex items-center justify-between mb-4">
                                     <div className="flex items-center gap-1.5 px-3 py-1 bg-[#FDF4ED] rounded-lg border border-[#F97316]/20 w-fit">
                                        <Globe className="w-3.5 h-3.5 text-[#F97316]" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#8B5A2B]">{site.domain}</span>
                                     </div>
                                     <button onClick={(e) => handleDelete(site.id, e)} className="p-2 text-[#A89F91] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4"/>
                                     </button>
                                  </div>
                                  <h4 className="font-bold text-[#2A2A2A] text-lg mb-2 line-clamp-2 leading-tight pr-4 font-serif">
                                     {site.title || site.domain}
                                  </h4>
                                  <p className="text-[#8B5A2B]/60 text-xs truncate font-medium">{site.url}</p>
                               </div>

                               <div className="mt-6 relative z-10 border-t border-[#E5E0D8] pt-4">
                                  <button 
                                     onClick={() => openExtractionModal(site)}
                                     className="w-full flex items-center justify-center gap-2 py-3 bg-[#FDF4ED] hover:bg-[#F97316] hover:text-white text-[#F97316] text-sm font-bold rounded-xl transition-colors border border-[#F97316]/20"
                                  >
                                     <FileText className="w-4 h-4"/> Extract Content
                                  </button>
                               </div>
                            </motion.div>
                         ))}
                      </AnimatePresence>
                   </div>
                )}
             </div>

          </div>
       </div>

       {/* Extraction Modal / Pop Window */}
       <AnimatePresence>
          {activeSite && (
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 md:p-12 bg-black/40 backdrop-blur-sm"
             >
                <div className="absolute inset-0" onClick={() => !isExtracting && !isSavingToNotes && setActiveSite(null)} />
                <motion.div 
                  initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                  className="relative w-full max-w-4xl h-[85vh] bg-[#FDFCFB] border border-[#E5E0D8] shadow-2xl rounded-3xl overflow-hidden flex flex-col z-10"
                >
                   {/* Modal Header */}
                   <div className="px-6 py-5 border-b border-[#E5E0D8] bg-white flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-[#FDF4ED] rounded-full flex items-center justify-center border border-[#F97316]/20">
                            <BookOpen className="w-5 h-5 text-[#F97316]"/>
                         </div>
                         <div>
                            <h3 className="font-bold text-[#2A2A2A] font-serif text-lg leading-tight truncate max-w-[200px] md:max-w-md">{pageTitle || activeSite.domain}</h3>
                            <p className="text-[#8B5A2B]/60 text-xs font-bold uppercase tracking-widest">{activeSite.domain}</p>
                         </div>
                      </div>
                      <button 
                         onClick={() => setActiveSite(null)}
                         disabled={isExtracting || isSavingToNotes}
                         className="p-2 bg-[#F3EFE9] hover:bg-gray-200 hover:text-gray-900 text-[#8B5A2B] rounded-full transition-colors disabled:opacity-50"
                      >
                         <X className="w-5 h-5" />
                      </button>
                   </div>

                   {/* Content Area */}
                   <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 relative bg-[#FDFCFB] text-[#333333]">
                      {isExtracting ? (
                         <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[#FDFCFB]/80 backdrop-blur-sm z-10">
                            <div className="relative">
                               <div className="w-16 h-16 border-4 border-[#F97316]/20 border-t-[#F97316] rounded-full animate-spin"></div>
                            </div>
                            <h4 className="mt-6 text-xl font-black text-[#2A2A2A] font-serif">Scraping Resource</h4>
                            <p className="text-[#8B5A2B]/80 text-sm mt-2 max-w-sm font-medium">Neural language models are parsing the HTML DOM and transforming unstructured data strictly into Markdown...</p>
                         </div>
                      ) : errorMsg ? (
                         <div className="flex flex-col items-center justify-center h-full text-center">
                            <XCircle className="w-16 h-16 text-red-500/40 mb-4" />
                            <h4 className="text-xl font-bold text-red-500 font-serif">{errorMsg}</h4>
                         </div>
                      ) : extractedContent ? (
                         <div className="prose prose-orange max-w-none prose-p:leading-relaxed prose-headings:text-[#2A2A2A] prose-headings:font-serif">
                             {/* Very minimal render array as pure text mapping */}
                             <pre className="font-sans whitespace-pre-wrap text-[15px] text-[#333333] leading-7 font-medium">{extractedContent}</pre>
                         </div>
                      ) : null}
                   </div>

                   {/* Footer Tools: Save to Notes */}
                   <div className="px-6 py-5 border-t border-[#E5E0D8] bg-white shrink-0">
                      <AnimatePresence mode="wait">
                         {savedSuccess ? (
                            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="w-full py-4 bg-green-50 border border-green-200 text-green-600 font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm">
                               <CheckCircle2 className="w-5 h-5" /> Embedded to Notes Vault Successfully!
                            </motion.div>
                         ) : !isExtracting && extractedContent && !errorMsg ? (
                            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex flex-col md:flex-row items-center gap-4">
                               <div className="w-full md:w-auto flex flex-col items-start gap-1">
                                  <label className="text-[11px] font-black uppercase tracking-widest text-[#8B5A2B]/80 pl-2">Select Destination Folder</label>
                                  <select 
                                     value={selectedSubject} 
                                     onChange={(e) => setSelectedSubject(e.target.value)}
                                     className="w-full md:w-64 bg-[#F3EFE9] border border-[#E5E0D8] rounded-xl px-4 py-3 text-sm font-bold text-[#2A2A2A] outline-none focus:bg-white focus:border-[#F97316]/50"
                                  >
                                  <optgroup label="Core Headquarters">
                                    {CORE_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                    {customCoreSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                                  </optgroup>
                                  {optionalSubject && (
                                     <optgroup label="Optional Mastery">
                                        <option value={optionalSubject}>{optionalSubject}</option>
                                     </optgroup>
                                  )}
                               </select>
                               </div>

                               <button 
                                  onClick={handleSaveToNotesTracker}
                                  disabled={isSavingToNotes}
                                  className="w-full md:flex-1 py-3.5 bg-[#F97316] hover:bg-[#EA580C] text-white font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                               >
                                  {isSavingToNotes ? <Loader2 className="w-4 h-4 animate-spin"/> : <Bookmark className="w-4 h-4"/> }
                                  {isSavingToNotes ? "Encrypting to Vault..." : "Save to Notes Tracker"}
                               </button>
                            </motion.div>
                         ) : <div></div>}
                      </AnimatePresence>
                   </div>
                </motion.div>
             </motion.div>
          )}
       </AnimatePresence>

    </div>
  );
}
