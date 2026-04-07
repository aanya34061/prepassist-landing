"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Bell, BellRing, FileText, Camera, Globe, UploadCloud, Plus, File, Search, Loader2, BookOpen, X, XCircle, Star, StarOff, Trash2, ListFilter, EyeOff, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "@/lib/supabase";
import { 
  CloudNote, fetchCloudNotes, saveCloudNote, deleteCloudNote, bulkDeleteCloudNotes, bulkUpdateCloudNotes,
  CORE_SUBJECTS, OPTIONAL_SUBJECTS, OTHER_SUBJECTS 
} from "@/lib/cloud_notes";
import { deductCredit } from "@/lib/credits";

export default function NotesTracker() {
  const [insufficientCredits, setInsufficientCredits] = useState(false);
  const [userId, setUserId] = useState<string>(""); 
  
  // Core Data State
  const [allNotes, setNotes] = useState<CloudNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // View State
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<string>("newest");
  
  // Ingestion State
  const [activeMode, setActiveMode] = useState<'text'|'file'|'camera'|'url'>('text');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [viewingNote, setViewingNote] = useState<CloudNote | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [cameraImage, setCameraImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [savingStatus, setSavingStatus] = useState("");
  const [isMerging, setIsMerging] = useState(false);
  const [noteTags, setNoteTags] = useState("");
  const [showBlockchainUpdates, setShowBlockchainUpdates] = useState<CloudNote | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [optionalSubject, setOptionalSubject] = useState<string | null>(null);
  const [isOptionalModalOpen, setIsOptionalModalOpen] = useState(false);
  const [customOptional, setCustomOptional] = useState("");
  
  const [customCoreSubjects, setCustomCoreSubjects] = useState<string[]>([]);
  const [isAddCoreModalOpen, setIsAddCoreModalOpen] = useState(false);
  const [newCoreSubject, setNewCoreSubject] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Unified Subject Array for Grid Display
  const allSubjects = [
    { title: "Core Studies", items: [...[CORE_SUBJECTS[0], CORE_SUBJECTS[1], CORE_SUBJECTS[3], CORE_SUBJECTS[4], CORE_SUBJECTS[5], CORE_SUBJECTS[6]], ...customCoreSubjects] },
    { title: "Optional Mastery", items: optionalSubject ? [optionalSubject] : [] },
  ];

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
    if (userId) {
       loadVault();
       const storedOpt = localStorage.getItem(`local_optional_${userId}`);
       if (storedOpt) setOptionalSubject(storedOpt);
       
       const storedCore = localStorage.getItem(`local_custom_core_${userId}`);
       if (storedCore) {
          try { setCustomCoreSubjects(JSON.parse(storedCore)); } catch(e) {}
       }
    }
  }, [userId]);

  const loadVault = async () => {
    setIsLoading(true);
    try {
      const dbNotes = await fetchCloudNotes(userId);
      setNotes(dbNotes);
    } catch(e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getNotesForSubject = (subject: string | null) => {
     if (!subject) return [];
     return allNotes.filter(n => n.subject === subject);
  };

  const handleSortNotes = (notes: CloudNote[]) => {
     let sorted = [...notes];
     if (sortOption === 'newest') sorted.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
     if (sortOption === 'az') sorted.sort((a,b) => a.title.localeCompare(b.title));
     if (sortOption === 'sync') sorted.sort((a,b) => (b.lastSyncDate || 0) - (a.lastSyncDate || 0));
     if (sortOption === 'starred') sorted.sort((a,b) => (b.isStarred === a.isStarred ? ((b.createdAt || 0) - (a.createdAt || 0)) : (b.isStarred ? 1 : -1)));
     return sorted;
  };

  const activeNotes = handleSortNotes(getNotesForSubject(activeSubject));
  const updateCount = activeNotes.filter(n => n.hasUpdates).length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files[0]) {
        setActiveFile(e.target.files[0]);
        if (!noteTitle) setNoteTitle(e.target.files[0].name.split('.')[0]);
     }
  };

  const handleCameraUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     const reader = new FileReader();
     reader.onloadend = () => setCameraImage(reader.result as string);
     reader.readAsDataURL(file);
  };

  const executeExtractionCall = async (endpoint: string, payload: any) => {
     setIsProcessing(true);
     try {
        const res = await fetch(endpoint, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        setNoteContent(data.text);
        if (data.pageTitle && !noteTitle) setNoteTitle(data.pageTitle);
     } catch (err: any) {
        alert(err.message);
     } finally {
        setIsProcessing(false);
     }
  };

  const toggleNoteSelection = (e: React.MouseEvent, noteId: string) => {
     e.stopPropagation();
     if (selectedNotes.includes(noteId)) {
        setSelectedNotes(selectedNotes.filter(id => id !== noteId));
     } else {
        setSelectedNotes([...selectedNotes, noteId]);
     }
  };

  const handleBulkAction = async (action: 'delete' | 'disable' | 'star') => {
     if (selectedNotes.length === 0) return;
     setIsProcessing(true);
     try {
        if (action === 'delete') {
           await bulkDeleteCloudNotes(userId, selectedNotes);
        } else if (action === 'disable') {
           await bulkUpdateCloudNotes(userId, selectedNotes, { disableUpdates: true });
        } else if (action === 'star') {
           // Ensure all selected are starred
           await bulkUpdateCloudNotes(userId, selectedNotes, { isStarred: true });
        }
        await loadVault();
        setSelectedNotes([]);
     } catch(e) {
        alert("Bulk operation failed.");
     } finally {
        setIsProcessing(false);
     }
  };

  const executeMerge = async (noteItem: CloudNote) => {
      if (userId === "local_guest_tracker") return alert("Secure Authentication Required. Please login to execute AI merging sequences natively.");
      setIsMerging(true);
      
      try {
          await deductCredit(userId, 0.5, "Notes RAG Pipeline Merging");
      } catch (err: any) {
          setIsMerging(false);
          if (err.message === "INSUFFICIENT_CREDITS") setInsufficientCredits(true);
          else alert("Ledger execution blocked: " + err.message);
          return;
      }

      try {
          const res = await fetch("/api/notes/merge-updates", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ existingContent: noteItem.content, updates: noteItem.updatesList })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          await saveCloudNote({
              ...noteItem,
              content: data.mergedText,
              hasUpdates: false,
              updatesList: [],
              lastSyncDate: Date.now()
          });

          await loadVault();
          setShowBlockchainUpdates(null);
          if (viewingNote && viewingNote.id === noteItem.id) setViewingNote(null);
      } catch (err: any) {
          alert("Merge Engine Crash: " + err.message);
      } finally {
          setIsMerging(false);
      }
   };

  const extractPDFContent = async () => {
     if (!activeFile) return alert("Select a PDF first.");
     if (userId === "local_guest_tracker") return alert("Secure Authentication Required. Please login to use AI Evaluation Arrays.");

     setIsProcessing(true);
     setSavingStatus("Initializing Structural Analysis...");

     try {
        await deductCredit(userId, 3, "CloudVault Insight Extract");
     } catch (creditErr: any) {
        setIsProcessing(false);
        setSavingStatus("");
        if (creditErr.message === "INSUFFICIENT_CREDITS") {
           setInsufficientCredits(true);
        } else {
           alert("Ledger validation failed natively.");
        }
        return;
     }

     try {
        const formData = new FormData();
        formData.append('pdf', activeFile);

        abortControllerRef.current = new AbortController();
        const res = await fetch('/api/notes/extract-pdf', {
           method: 'POST',
           body: formData,
           signal: abortControllerRef.current.signal
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        setNoteContent(data.text);
     } catch (err: any) {
        if (err.name === 'AbortError') {
           console.log("Extraction aborted safely by user.");
        } else {
           alert("PDF Extraction Failed: " + err.message);
        }
     } finally {
        setIsProcessing(false);
        setSavingStatus("");
     }
  };

  const saveToTracker = async () => {
      if (!noteTitle || !activeSubject) return alert("Title and explicit subject mapping require parameters.");
      setIsProcessing(true);
      
      try {
         setSavingStatus("Analyzing Global Updates (DB Map)...");
         
         const processedTags = noteTags.split(',').map(t => t.trim()).filter(Boolean);
         const notePayload: CloudNote = {
            userId,
            title: noteTitle,
            subject: activeSubject,
            categoryType: 'core',
            type: activeMode,
            content: noteContent || "Data Encrypted",
            fileUrl: "",
            sourceUrl: activeMode === 'url' ? sourceUrl : "",
            tags: processedTags
         };

         await saveCloudNote(notePayload);
         
         setSavingStatus("Finalizing Vault Arrays...");
         await loadVault();
         
         setIsEditorOpen(false);
         setNoteTitle(""); setNoteContent(""); setActiveFile(null); setCameraImage(null); setSourceUrl(""); setNoteTags("");
      } catch (err) {
         alert("Tracker Sync Failed.");
      } finally {
         setIsProcessing(false);
         setSavingStatus("");
      }
  };

  const handleCancelEditor = () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setIsEditorOpen(false);
      setNoteTags("");
  };

  const startIngestion = (mode: 'text'|'file'|'camera'|'url') => {
      setIsAddModalOpen(false);
      setActiveMode(mode);
      setIsEditorOpen(true);
  };


  const filteredGlobalNotes = handleSortNotes(searchQuery.trim() ? allNotes.filter(n => {
     const q = searchQuery.toLowerCase();
     return (
        n.title.toLowerCase().includes(q) ||
        n.subject.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.tags && n.tags.some(t => t.toLowerCase().includes(q)))
     );
  }) : []);

  if (isLoading) {
     return <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">

      {/* Insufficient Credits Banner */}
      <AnimatePresence>
        {insufficientCredits && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: "-50%" }} 
            animate={{ opacity: 1, y: 0, x: "-50%" }} 
            exit={{ opacity: 0, y: -20, x: "-50%" }} 
            className="fixed top-24 left-1/2 z-[100] w-[90%] max-w-[420px] bg-[#212121] text-white p-5 rounded-2xl shadow-2xl border border-white/5 font-sans"
          >
             <div className="flex items-center gap-2 mb-1.5">
                <XCircle className="w-5 h-5 text-white/50" />
                <h3 className="text-[17px] font-bold text-white/90">Insufficient AI Credits</h3>
             </div>
             <p className="text-[14px] text-white/50 mb-6 pl-7 font-medium">
                Your AI credits balance is too low to continue.
             </p>
             <div className="flex items-center gap-3 pl-7 flex-wrap">
                <button onClick={() => setInsufficientCredits(false)} className="px-5 py-2 bg-[#323232] hover:bg-[#3d3d3d] text-white/80 text-sm font-semibold rounded-xl transition-colors shadow-sm">
                   Dismiss
                </button>
                <Link href="/pricing" className="px-5 py-2 bg-[#323232] hover:bg-[#3d3d3d] text-white/80 text-sm font-semibold rounded-xl transition-colors shadow-sm">
                   See Plans
                </Link>
                <Link href="/pricing" className="px-5 py-2 bg-[#0078D4] hover:bg-[#0078D4]/90 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm tracking-wide">
                   Purchase Credits
                </Link>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
<Loader2 className="w-10 h-10 animate-spin text-[#8B5A2B]"/></div>;
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#333333] font-sans selection:bg-[#F97316]/20 pb-20">
       
       <div className="max-w-4xl mx-auto px-6 pt-12">
          
          <AnimatePresence mode="wait">
          {!activeSubject ? (
             // --- GRID VIEW ---
             <motion.div key="grid" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                   <h1 className="text-4xl font-serif font-black text-[#2A2A2A] tracking-tight shrink-0">Notes Tracker</h1>
                   <div className="w-full md:w-96 relative group">
                      <Search className="w-5 h-5 text-[#8B5A2B] absolute left-4 top-1/2 -translate-y-1/2"/>
                      <input 
                         type="text" 
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         placeholder="Search Subjects, Topics, or #Hashtags..." 
                         className="w-full bg-[#F3EFE9] border border-[#E5E0D8] rounded-full py-3 pl-12 pr-6 outline-none focus:bg-white focus:border-[#F97316]/50 transition-all font-medium text-sm text-[#2A2A2A]"
                      />
                      {searchQuery && (
                         <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B5A2B] font-bold text-[10px] uppercase">Clear</button>
                      )}
                   </div>
                </div>

                {/* Synchronization Notice Banner */}
                <div className="mb-4 bg-[#FDF4ED] border border-[#F97316]/20 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-5 shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-[#F97316]/60"></div>
                   <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-[#F97316]/10">
                      <BellRing className="w-6 h-6 text-[#F97316]"/>
                   </div>
                   <div>
                      <h4 className="text-sm font-black text-[#F97316] uppercase tracking-widest mb-1.5 flex items-center gap-2">Global Information Pipeline <span className="px-2 py-0.5 bg-[#F97316] text-white text-[10px] rounded-full animate-pulse">LIVE</span></h4>
                      <p className="text-sm font-medium text-[#8B5A2B]/80 leading-relaxed">
                         Notice: The flow of new information from all sources into this User panel will be synchronized precisely every day at <strong>9:00 AM IST</strong> mapping against your isolated tags natively!
                      </p>
                   </div>
                </div>

                <div className="mb-10 bg-[#FEF2F2] border border-[#EF4444]/20 p-4 rounded-xl flex items-center gap-3">
                   <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0" />
                   <p className="text-[#991B1B] text-sm font-bold">
                      Do not Upload the Current Affairs summary into the Cloud Core as the Admin has uploaded it already natively.
                   </p>
                </div>

                {searchQuery.trim() ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                      {filteredGlobalNotes.length === 0 ? (
                         <div className="col-span-full py-12 text-center text-[#A89F91] font-medium text-sm">No notes bound to this Hash/Sequence.</div>
                      ) : (
                         filteredGlobalNotes.map(note => (
                            <div key={note.id} onClick={(e) => { 
                               if ((e.target as HTMLElement).tagName.toLowerCase() === 'input') return;
                               if ((e.target as HTMLElement).closest('button')) return;
                               setActiveSubject(note.subject); 
                               setViewingNote(note); 
                            }} className={`bg-[#FDFBF7] ${selectedNotes.includes(note.id!) ? 'border-2 border-[#F97316] shadow-md' : 'border border-[#D1C8B8]'} rounded-xl p-6 relative shadow-sm hover:shadow-lg transition-all group flex flex-col cursor-pointer`}>
                               {/* Checkbox */}
                               <div className="absolute top-4 left-4 z-10">
                                   <input 
                                      type="checkbox" 
                                      checked={selectedNotes.includes(note.id!)}
                                      onChange={(e) => toggleNoteSelection(e as any, note.id!)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-5 h-5 accent-[#F97316] cursor-pointer"
                                   />
                               </div>

                               {note.hasUpdates ? (
                                  <div className="absolute top-4 right-4 bg-emerald-500/10 border border-emerald-500/60 px-4 py-1.5 rounded-full text-[10px] font-black uppercase text-emerald-600 flex items-center gap-1.5 shadow-sm transition-colors animate-pulse">
                                     <BellRing className="w-3 h-3"/> UPDATES
                                  </div>
                               ) : note.disableUpdates ? (
                                  <div className="absolute top-4 right-4 bg-[#FEE2E2] border border-[#EF4444]/30 px-3 py-1 rounded-full text-xs font-bold text-[#EF4444] flex items-center gap-1 shadow-sm opacity-90">
                                     <EyeOff className="w-3 h-3"/> DISABLED
                                  </div>
                               ) : (
                                  <div className="absolute top-4 right-4 bg-[#F3EFE9] border border-[#D1C8B8]/30 px-3 py-1 rounded-full text-xs font-bold text-[#A89F91] flex items-center gap-1 shadow-sm opacity-60">
                                     <Bell className="w-3 h-3"/> NO UPDATES
                                  </div>
                               )}
                               
                               <div className="flex gap-2 items-center mb-3 pr-24 mt-4 w-full">
                                  {note.isStarred && <Star className="w-5 h-5 text-[#F97316] fill-[#F97316] shrink-0" />}
                                  <h4 className="text-xl font-serif font-bold text-[#2A2A2A] group-hover:text-[#F97316] transition-colors truncate">{note.title}</h4>
                               </div>
                               
                               <p className="text-[#666666] text-sm leading-relaxed mb-6 line-clamp-3 overflow-hidden flex-1">
                                  {note.type === 'file' ? "Native file payload attached safely retaining original bytes entirely." : note.content}
                               </p>

                               <div className="flex items-center justify-between border-t border-[#E5E0D8] pt-4 mt-auto">
                                  <span className="flex items-center gap-2 text-xs font-bold text-[#8B5A2B] bg-[#F3EFE9] px-3 py-1.5 rounded-md">
                                     <BookOpen className="w-3 h-3"/> {note.subject}
                                  </span>
                                  <div className="flex items-center gap-4">
                                     <div className="flex flex-col text-right pr-2">
                                        <span className="text-[11px] font-bold text-[#8B5A2B]">
                                           Created: {note.createdAt ? new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'}) : 'Today'}
                                        </span>
                                        {note.lastSyncDate && (
                                           <span className="text-[10px] font-medium text-[#A89F91]">
                                              Synced: {new Date(note.lastSyncDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'})}
                                           </span>
                                        )}
                                     </div>
                                     <button onClick={async (e) => { e.stopPropagation(); await deleteCloudNote(note); await loadVault(); }} className="text-[#A89F91] hover:text-red-500 transition-colors" title="Delete Note">
                                        <Trash2 className="w-4 h-4"/>
                                     </button>
                                     {note.hasUpdates && (
                                        <button onClick={(e) => { e.stopPropagation(); setShowBlockchainUpdates(note); }} className="text-xs font-black text-emerald-500 underline underline-offset-2 hover:text-emerald-400 transition-colors relative z-10 block px-1">
                                           See Updates
                                        </button>
                                     )}
                                  </div>
                               </div>
                            </div>
                         ))
                      )}
                   </div>
                ) : (
                   allSubjects.map((group, idx) => (
                   <div key={idx} className="mb-10">
                      <h3 className="text-sm font-black uppercase tracking-widest text-[#A89F91] mb-4">{group.title}</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {group.items.length === 0 && group.title === "Optional Mastery" && (
                            <button onClick={() => setIsOptionalModalOpen(true)} className="p-6 bg-[#FDF4ED] border-2 border-dashed border-[#F97316]/30 rounded-2xl flex items-center justify-center gap-3 text-[#F97316] font-bold hover:bg-[#FDFCFB] transition-all min-h-[120px] col-span-full md:col-span-1 shadow-sm">
                               <Plus className="w-5 h-5"/> Configure Optional Track
                            </button>
                         )}
                         {group.items.map(subject => {
                            const notesCount = getNotesForSubject(subject).length;
                            const hUpdates = getNotesForSubject(subject).filter(n => n.hasUpdates).length;
                            const isCustomCore = customCoreSubjects.includes(subject) && group.title === "Core Studies";
                            return (
                               <div 
                                 key={subject} 
                                 className="relative group p-6 bg-white border border-[#E5E0D8] rounded-2xl transition-all flex items-start justify-between overflow-hidden hover:shadow-xl hover:border-[#D1C8B8]"
                               >
                                  <div className="flex-1 cursor-pointer pr-4" onClick={() => setActiveSubject(subject)}>
                                     <h4 className="text-xl font-serif font-bold text-[#2A2A2A] mb-1 group-hover:text-[#F97316] transition-colors">{subject}</h4>
                                     <p className="text-[#8B5A2B]/60 text-sm font-medium">{notesCount} Structural Notes</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                     {hUpdates > 0 && (
                                        <span className="w-8 h-8 rounded-full bg-[#FDF4ED] text-[#F97316] text-xs font-black flex items-center justify-center shrink-0 border border-[#F97316]/20">
                                           {hUpdates}
                                        </span>
                                     )}
                                     {isCustomCore && (
                                        <button 
                                           onClick={(e) => {
                                              e.stopPropagation();
                                              const updated = customCoreSubjects.filter(s => s !== subject);
                                              setCustomCoreSubjects(updated);
                                              localStorage.setItem(`local_custom_core_${userId}`, JSON.stringify(updated));
                                           }}
                                           className="p-2 opacity-0 group-hover:opacity-100 bg-[#FDF4ED] hover:bg-[#F97316]/20 text-[#D95F0E] rounded-md transition-all shrink-0"
                                           title="Delete Custom Folder"
                                        >
                                           <X className="w-4 h-4"/>
                                        </button>
                                     )}
                                  </div>
                               </div>
                            )
                         })}
                         {group.title === "Core Studies" && (
                            <button onClick={() => setIsAddCoreModalOpen(true)} className="p-6 bg-[#F3EFE9]/50 border-2 border-dashed border-[#D1C8B8] rounded-2xl flex items-center justify-center gap-3 text-[#A89F91] font-bold hover:bg-[#FDFCFB] hover:border-[#F97316]/30 hover:text-[#F97316] transition-all min-h-[120px] shadow-sm">
                               <Plus className="w-5 h-5"/> Add Subject
                            </button>
                         )}
                      </div>
                   </div>
                 ))
                )}
              </motion.div>
          ) : (
             // --- DETAIL SUBJECT VIEW ---
             <motion.div key="detail" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}}>
                
                {/* Header Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#E5E0D8] pb-6 mb-8 gap-4">
                   <div className="flex items-center gap-4">
                      <button onClick={() => setActiveSubject(null)} className="p-2 hover:bg-[#F3EFE9] rounded-xl transition-colors">
                         <ArrowLeft className="w-6 h-6 text-[#2A2A2A]" />
                      </button>
                      <h2 className="text-3xl font-serif font-bold text-[#2A2A2A]">{activeSubject}</h2>
                      <div className="relative">
                         {updateCount > 0 ? <BellRing className="w-6 h-6 text-[#F97316]" /> : <Bell className="w-6 h-6 text-[#A89F91]" />}
                         {updateCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#F97316] text-white text-[10px] font-black flex items-center justify-center animate-bounce border-2 border-[#FDFCFB]">
                               {updateCount}
                            </span>
                         )}
                      </div>
                   </div>
                   <div className="relative shrink-0 w-full md:w-auto">
                      <ListFilter className="w-5 h-5 text-[#8B5A2B] absolute left-3 top-1/2 -translate-y-1/2"/>
                      <select 
                         value={sortOption} 
                         onChange={(e) => setSortOption(e.target.value)}
                         className="w-full md:w-auto appearance-none bg-[#F3EFE9] border border-[#E5E0D8] rounded-xl py-3 pl-10 pr-8 outline-none focus:bg-white focus:border-[#F97316]/50 transition-all font-medium text-sm text-[#2A2A2A] cursor-pointer"
                      >
                         <option value="newest">Newest & Date</option>
                         <option value="az">Ascending (A-Z)</option>
                         <option value="sync">Last Synced</option>
                         <option value="starred">Starred Priority</option>
                      </select>
                   </div>
                </div>

                {/* Sub Header Badge */}
                <div className="mb-6">
                   <span className="px-3 py-1 bg-[#FDF4ED] text-[#8B5A2B] border border-[#F97316]/20 rounded-md text-xs font-bold flex items-center inline-flex gap-2">
                      <BookOpen className="w-3 h-3"/> Tracker Core Matrix
                   </span>
                </div>

                {/* Intelligent Update Alerts Panel */}
                <div className="p-6 bg-[#EEF9F0] border border-[#D1E8D5] rounded-xl mb-8 flex flex-col md:flex-row md:items-start justify-between gap-6 shadow-sm">
                   <div className="space-y-4 flex-1">
                      <div>
                         <h4 className="text-lg font-bold text-[#2E4A35]">Update Alerts</h4>
                         <p className="text-[#4E7658] text-sm">Choose which ingestion engines trigger active notifications.</p>
                      </div>
                      <div className="space-y-3">
                         <label className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#F97316] rounded" />
                            <span className="text-[#8B5A2B] text-sm font-medium group-hover:text-[#F97316] transition-colors">New PDF Uploaded Cross-Ref</span>
                         </label>
                         <label className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#F97316] rounded" />
                            <span className="text-[#8B5A2B] text-sm font-medium group-hover:text-[#F97316] transition-colors">Daily Current Affairs Scrapes</span>
                         </label>
                         <label className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#F97316] rounded" />
                            <span className="text-[#8B5A2B] text-sm font-medium group-hover:text-[#F97316] transition-colors">Vision AI Structural Vectors</span>
                         </label>
                      </div>
                   </div>
                   <button className="px-4 py-2 bg-[#C6ECCC] text-[#2E4A35] rounded-full text-xs font-bold shadow-sm whitespace-nowrap">
                      Receive Updates
                   </button>
                </div>

                {/* Add a Note Dashed Trigger */}
                {!isEditorOpen && (
                   <button onClick={() => setIsAddModalOpen(true)} className="w-full py-6 border-2 border-dashed border-[#D1C8B8] rounded-xl text-[#A89F91] hover:text-[#8B5A2B] hover:border-[#8B5A2B] hover:bg-[#F3EFE9] transition-all flex items-center justify-center gap-3 font-medium mb-8">
                      <Plus className="w-5 h-5"/> + Add a Node Vector
                   </button>
                )}

                {/* Editor Surface */}
                {isEditorOpen && (
                   <div className="mb-8 bg-white border border-[#E5E0D8] rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                      <div className="p-4 border-b border-[#E5E0D8] bg-[#FDFCFB]">
                         <div className="flex items-center justify-between mb-3">
                            <input type="text" value={noteTitle} onChange={e=>setNoteTitle(e.target.value)} placeholder="Note Title Identifier..." className="text-xl font-serif font-bold text-[#2A2A2A] outline-none bg-transparent w-full"/>
                            <button onClick={saveToTracker} disabled={isProcessing} className="px-5 py-2 bg-[#F97316] text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#D95F0E] transition-colors whitespace-nowrap disabled:opacity-50 ml-4 min-w-[160px] justify-center">
                               {isProcessing ? (
                                  <><Loader2 className="w-4 h-4 animate-spin"/> {savingStatus || "Processing"}</>
                               ) : "Save to Notes"}
                            </button>
                            <button onClick={handleCancelEditor} className="px-4 py-2 text-[#8B5A2B] font-bold text-sm ml-2 hover:bg-[#F3EFE9] rounded-md transition-colors">Cancel</button>
                         </div>
                         <input type="text" value={noteTags} onChange={e=>setNoteTags(e.target.value)} placeholder="Hashtags (comma separated e.g. #Economy, #UPSC)" className="w-full text-sm font-medium text-[#8B5A2B] outline-none bg-transparent border-t border-dashed border-[#E5E0D8] pt-3"/>
                      </div>

                      <div className="p-6">
                         {activeMode === 'file' && (
                            <div className="space-y-4">
                               <div className="flex flex-col md:flex-row gap-4">
                                  <div className="bg-[#F3EFE9] rounded-xl p-6 text-center border-2 border-dashed border-[#D1C8B8] flex-1">
                                     <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.doc,.docx" />
                                     {activeFile ? (
                                        <div className="font-bold text-[#8B5A2B]"><File className="w-8 h-8 mx-auto mb-2 text-[#F97316]"/> {activeFile.name} Attached</div>
                                     ) : (
                                        <button onClick={()=>fileInputRef.current?.click()} className="text-[#8B5A2B] font-bold text-sm hover:text-[#F97316] transition-colors"><UploadCloud className="w-8 h-8 mx-auto mb-2"/> Upload Local PDF/Document</button>
                                     )}
                                  </div>
                                  <button onClick={extractPDFContent} disabled={!activeFile || isProcessing} className="px-6 py-4 bg-[#EEF9F0] text-[#2E4A35] border border-[#D1E8D5] rounded-xl font-bold flex flex-col items-center justify-center gap-2 disabled:opacity-50 hover:bg-[#C6ECCC] transition-colors min-w-[160px]">
                                     {isProcessing && savingStatus.includes("Structural Analysis") ? (
                                         <><Loader2 className="animate-spin w-6 h-6"/> Extracting...</>
                                     ) : (
                                         <><FileText className="w-6 h-6 text-[#2E4A35]"/> Extract Content</>
                                     )}
                                  </button>
                               </div>
                               <textarea value={noteContent} onChange={e=>setNoteContent(e.target.value)} placeholder="Extracted AI PDF text will map here for your explicit review and modification before syncing..." className="w-full h-40 bg-[#FDFCFB] border border-[#E5E0D8] rounded-xl p-4 text-[#333] font-mono text-sm outline-none focus:border-[#F97316]/50 resize-none"/>
                            </div>
                         )}

                         {activeMode === 'camera' && (
                            <div className="space-y-4">
                               <div className="flex gap-4">
                                  <input type="file" ref={cameraInputRef} onChange={handleCameraUpload} className="hidden" accept="image/*" capture="environment" />
                                  <button onClick={()=>cameraInputRef.current?.click()} className="px-4 py-2 bg-[#F3EFE9] text-[#8B5A2B] rounded-lg font-bold text-sm flex items-center gap-2 border border-[#E5E0D8] hover:border-[#D1C8B8]">
                                     <Camera className="w-4 h-4"/> Select Image Map
                                  </button>
                                  <button onClick={() => executeExtractionCall('/api/notes/extract-ocr', { base64Image: cameraImage })} disabled={!cameraImage || isProcessing} className="px-4 py-2 bg-[#F97316] text-white rounded-lg font-bold text-sm flex items-center gap-2 disabled:opacity-30">
                                     {isProcessing ? <Loader2 className="animate-spin w-4 h-4"/> : "Decode Vision OCR"}
                                  </button>
                               </div>
                               {cameraImage && <div className="p-2 border border-[#E5E0D8] rounded-xl bg-gray-50"><img src={cameraImage} className="max-h-48 object-contain mx-auto rounded-lg"/></div>}
                               <textarea value={noteContent} onChange={e=>setNoteContent(e.target.value)} placeholder="OCR Mapping resolves here..." className="w-full h-48 bg-[#FDFCFB] border border-[#E5E0D8] rounded-xl p-4 text-[#333] font-mono text-sm outline-none focus:border-[#F97316]/50 resize-none"/>
                            </div>
                         )}

                         {activeMode === 'url' && (
                            <div className="space-y-4">
                               <div className="flex gap-4">
                                  <input type="url" value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="https:// target..." className="flex-1 bg-[#FDFCFB] border border-[#E5E0D8] rounded-lg px-4 font-medium text-sm outline-none focus:border-[#F97316]/50" />
                                  <button onClick={() => executeExtractionCall('/api/notes/extract-url', { url: sourceUrl })} disabled={!sourceUrl || isProcessing} className="px-6 py-3 bg-[#F97316] text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-30">
                                     {isProcessing ? <Loader2 className="animate-spin w-4 h-4"/> : "Scrape DOM"}
                                  </button>
                               </div>
                               <textarea value={noteContent} onChange={e=>setNoteContent(e.target.value)} placeholder="HTML structurally translates here..." className="w-full h-48 bg-[#FDFCFB] border border-[#E5E0D8] rounded-xl p-4 text-[#333] font-mono text-sm outline-none focus:border-[#F97316]/50 resize-none"/>
                            </div>
                         )}

                         {activeMode === 'text' && (
                            <textarea value={noteContent} onChange={e=>setNoteContent(e.target.value)} placeholder="Write absolute mastery..." className="w-full h-64 bg-transparent outline-none text-[#333] font-medium text-base resize-none"/>
                         )}
                      </div>
                   </div>
                )}

                {/* Display Notes Array */}
                {!isEditorOpen && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                      {activeNotes.length === 0 ? (
                         <div className="col-span-full py-12 text-center text-[#A89F91] font-medium text-sm">Target nodes explicitly empty.</div>
                      ) : (
                         activeNotes.map(note => (
                            <div key={note.id} onClick={(e) => { 
                               if ((e.target as HTMLElement).tagName.toLowerCase() === 'input') return;
                               if ((e.target as HTMLElement).closest('button')) return;
                               setViewingNote(note); 
                            }} className={`bg-[#FDFBF7] ${selectedNotes.includes(note.id!) ? 'border-2 border-[#F97316] shadow-md' : 'border border-[#D1C8B8]'} rounded-xl p-6 relative shadow-sm hover:shadow-lg transition-all group flex flex-col cursor-pointer`}>
                               {/* Checkbox */}
                               <div className="absolute top-4 left-4 z-10">
                                   <input 
                                      type="checkbox" 
                                      checked={selectedNotes.includes(note.id!)}
                                      onChange={(e) => toggleNoteSelection(e as any, note.id!)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-5 h-5 accent-[#F97316] cursor-pointer"
                                   />
                               </div>

                               {note.hasUpdates ? (
                                  <div className="absolute top-4 right-4 bg-emerald-500/10 border border-emerald-500/60 px-4 py-1.5 rounded-full text-[10px] font-black uppercase text-emerald-600 flex items-center gap-1.5 shadow-sm transition-colors animate-pulse">
                                     <BellRing className="w-3 h-3"/> UPDATES
                                  </div>
                               ) : note.disableUpdates ? (
                                  <div className="absolute top-4 right-4 bg-[#FEE2E2] border border-[#EF4444]/30 px-3 py-1 rounded-full text-xs font-bold text-[#EF4444] flex items-center gap-1 shadow-sm opacity-90">
                                     <EyeOff className="w-3 h-3"/> DISABLED
                                  </div>
                               ) : (
                                  <div className="absolute top-4 right-4 bg-[#F3EFE9] border border-[#D1C8B8]/30 px-3 py-1 rounded-full text-xs font-bold text-[#A89F91] flex items-center gap-1 shadow-sm opacity-60">
                                     <Bell className="w-3 h-3"/> NO UPDATES
                                  </div>
                               )}
                               
                               <div className="flex gap-2 items-center mb-3 pr-24 mt-4 w-full">
                                  {note.isStarred && <Star className="w-5 h-5 text-[#F97316] fill-[#F97316] shrink-0" />}
                                  <h4 className="text-xl font-serif font-bold text-[#2A2A2A] group-hover:text-[#F97316] transition-colors truncate">{note.title}</h4>
                               </div>
                               
                               <p className="text-[#666666] text-sm leading-relaxed mb-6 line-clamp-3 overflow-hidden flex-1">
                                  {note.type === 'file' ? "Native file payload attached safely retaining original bytes entirely." : note.content}
                               </p>

                               <div className="flex items-center justify-between border-t border-[#E5E0D8] pt-4 mt-auto">
                                  <span className="flex items-center gap-2 text-xs font-bold text-[#8B5A2B] bg-[#F3EFE9] px-3 py-1.5 rounded-md">
                                     {note.type === 'file' && <File className="w-3 h-3"/>}
                                     {note.type === 'camera' && <Camera className="w-3 h-3"/>}
                                     {note.type === 'url' && <Globe className="w-3 h-3"/>}
                                     {note.type === 'text' && <FileText className="w-3 h-3"/>}
                                     {note.type.toUpperCase()}
                                  </span>
                                  <div className="flex items-center gap-4">
                                     <div className="flex flex-col text-right pr-2">
                                        <span className="text-[11px] font-bold text-[#8B5A2B]">
                                           Created: {note.createdAt ? new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'}) : 'Today'}
                                        </span>
                                        {note.lastSyncDate && (
                                           <span className="text-[10px] font-medium text-[#A89F91]">
                                              Synced: {new Date(note.lastSyncDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'})}
                                           </span>
                                        )}
                                     </div>
                                     <button onClick={async (e) => { e.stopPropagation(); await deleteCloudNote(note); await loadVault(); }} className="text-[#A89F91] hover:text-red-500 transition-colors" title="Delete Note">
                                        <Trash2 className="w-4 h-4"/>
                                     </button>
                                     {note.hasUpdates && (
                                        <button onClick={(e) => { e.stopPropagation(); setShowBlockchainUpdates(note); }} className="text-xs font-black text-[#10B981] underline underline-offset-2 hover:text-[#059669] transition-colors relative z-10 block px-2">
                                           See Updates
                                        </button>
                                     )}
                                  </div>
                               </div>
                            </div>
                         ))
                      )}
                   </div>
                )}
             </motion.div>
          )}
          </AnimatePresence>
       </div>

       {/* Addition Modal Array */}
       <AnimatePresence>
          {isAddModalOpen && (
             <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <motion.div initial={{scale:0.95}} animate={{scale:1}} exit={{scale:0.95}} className="bg-[#FDFCFB] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl">
                   <div className="p-6 border-b border-[#E5E0D8] flex items-center justify-between">
                      <h3 className="text-xl font-serif font-bold text-[#2A2A2A]">Ingestion Core Matrix</h3>
                      <button onClick={() => setIsAddModalOpen(false)} className="text-[#8B5A2B] hover:text-[#2A2A2A] transition-colors font-bold text-sm">Close</button>
                   </div>
                   <div className="p-6 grid grid-cols-2 gap-4">
                      
                      <button onClick={() => startIngestion('file')} className="p-6 border border-[#E5E0D8] rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-[#EEF9F0] hover:border-[#D1E8D5] transition-all group">
                         <div className="w-12 h-12 rounded-full bg-[#E5E0D8] group-hover:bg-[#C6ECCC] flex items-center justify-center transition-colors">
                            <UploadCloud className="w-6 h-6 text-[#2A2A2A] group-hover:text-[#2E4A35]" />
                         </div>
                         <div className="text-center">
                            <h4 className="font-bold text-[#2A2A2A] text-sm">Local Array</h4>
                            <p className="text-xs text-[#8B5A2B]/60 mt-1">Upload PDF / Doc</p>
                         </div>
                      </button>

                      <button onClick={() => startIngestion('url')} className="p-6 border border-[#E5E0D8] rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-[#FDF4ED] hover:border-[#F97316]/30 transition-all group">
                         <div className="w-12 h-12 rounded-full bg-[#E5E0D8] group-hover:bg-[#F97316]/20 flex items-center justify-center transition-colors">
                            <Globe className="w-6 h-6 text-[#2A2A2A] group-hover:text-[#F97316]" />
                         </div>
                         <div className="text-center">
                            <h4 className="font-bold text-[#2A2A2A] text-sm">Parse Web</h4>
                            <p className="text-xs text-[#8B5A2B]/60 mt-1">URL Native Scrape</p>
                         </div>
                      </button>

                      <button onClick={() => startIngestion('text')} className="p-6 border border-[#E5E0D8] rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-[#F3EFE9] hover:border-[#D1C8B8] transition-all group">
                         <div className="w-12 h-12 rounded-full bg-[#E5E0D8] group-hover:bg-[#D1C8B8] flex items-center justify-center transition-colors">
                            <FileText className="w-6 h-6 text-[#2A2A2A]" />
                         </div>
                         <div className="text-center">
                            <h4 className="font-bold text-[#2A2A2A] text-sm">Construct Text</h4>
                            <p className="text-xs text-[#8B5A2B]/60 mt-1">Manual MD Entry</p>
                         </div>
                      </button>

                      <button onClick={() => startIngestion('camera')} className="p-6 border border-[#E5E0D8] rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-[#FDF4ED] hover:border-[#F97316]/30 transition-all group">
                         <div className="w-12 h-12 rounded-full bg-[#E5E0D8] group-hover:bg-[#F97316]/20 flex items-center justify-center transition-colors">
                            <Camera className="w-6 h-6 text-[#2A2A2A] group-hover:text-[#F97316]" />
                         </div>
                         <div className="text-center">
                            <h4 className="font-bold text-[#2A2A2A] text-sm">Vision Camera</h4>
                            <p className="text-xs text-[#8B5A2B]/60 mt-1">AI Handwrite OCR</p>
                         </div>
                      </button>
                      
                   </div>
                </motion.div>
             </motion.div>
          )}
       </AnimatePresence>

       {/* View Note Modal */}
       <AnimatePresence>
          {viewingNote && (
             <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-end z-50">
                <motion.div initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{type:"spring", damping:25, stiffness:200}} className="bg-[#FDFCFB] w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-[#E5E0D8]">
                   
                   <div className="p-8 border-b border-[#E5E0D8] flex items-start justify-between bg-white shrink-0">
                      <div className="pr-12">
                         <h2 className="text-3xl font-serif font-black text-[#2A2A2A] mb-3 leading-tight">{viewingNote.title}</h2>
                         <div className="flex flex-wrap items-center gap-3">
                            <span className="px-3 py-1 bg-[#EEF9F0] text-[#2E4A35] rounded font-bold text-xs uppercase tracking-wider">{viewingNote.subject}</span>
                            <span className="text-sm font-medium text-[#8B5A2B]">{viewingNote.createdAt ? new Date(viewingNote.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric'}) : 'Today'}</span>
                            
                            {viewingNote.fileUrl && (
                               <a href={viewingNote.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-black text-[#F97316] hover:text-[#D95F0E] bg-[#FDF4ED] px-3 py-1 rounded-md transition-colors">
                                  <File className="w-3 h-3"/> Download Native File
                               </a>
                            )}
                            {viewingNote.type === 'url' && viewingNote.sourceUrl && (
                               <a href={viewingNote.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-black text-[#F97316] hover:text-[#D95F0E] bg-[#FDF4ED] px-3 py-1 rounded-md transition-colors">
                                  <Globe className="w-3 h-3"/> View Source URL
                               </a>
                            )}
                         </div>
                      </div>
                      <button onClick={() => setViewingNote(null)} className="p-3 bg-[#F3EFE9] text-[#2A2A2A] rounded-full hover:bg-[#E5E0D8] hover:text-[#F97316] transition-colors shrink-0 absolute top-8 right-8">
                         <Plus className="w-6 h-6 rotate-45"/>
                      </button>
                   </div>

                   <div className="p-8 overflow-y-auto w-full custom-scrollbar flex-1 bg-[#FDFCFB]">
                      <div className="prose prose-orange max-w-none text-[#333] whitespace-pre-wrap font-sans leading-loose text-base">
                         {viewingNote.content.split('\n').map((line, idx) => {
                            if (line.trim().startsWith('### ')) return <strong key={idx} className="block text-lg font-black text-[#2A2A2A] mt-5 mb-1">{line.replace(/^\s*###\s*/, '')}</strong>;
                            if (line.trim().startsWith('## ')) return <strong key={idx} className="block text-xl font-black text-[#2A2A2A] mt-6 mb-2">{line.replace(/^\s*##\s*/, '')}</strong>;
                            if (line.trim().startsWith('# ')) return <strong key={idx} className="block text-2xl font-black text-[#2A2A2A] mt-8 mb-3">{line.replace(/^\s*#\s*/, '')}</strong>;
                            
                            if (line.includes('**')) {
                               const parts = line.split(/(\*\*.*?\*\*)/g);
                               return (
                                  <span key={idx} className="block min-h-[1.5rem]">
                                     {parts.map((p, i) => 
                                        p.startsWith('**') && p.endsWith('**') 
                                           ? <strong key={i} className="font-bold text-[#2A2A2A]">{p.slice(2, -2)}</strong>
                                           : p
                                     )}
                                  </span>
                               );
                            }
                            
                            return <span key={idx} className="block min-h-[1.5rem]">{line}</span>;
                         })}
                      </div>
                      
                      {/* Appended Global Updates internally within Modal */}
                      {viewingNote.hasUpdates && viewingNote.updatesList && viewingNote.updatesList.length > 0 && (
                         <div className="mt-16 pt-8 border-t-2 border-dashed border-[#F97316]/30">
                            <div className="bg-[#FDF4ED] rounded-2xl p-6 border border-[#F97316]/20">
                               <h4 className="text-sm font-black text-[#F97316] uppercase tracking-widest mb-6 flex items-center gap-2">
                                  <BellRing className="w-5 h-5"/> Global Synchronized Updates
                               </h4>
                               <div className="space-y-4">
                                  {viewingNote.updatesList.map((update, idx) => (
                                     <div key={idx} className="bg-white p-5 rounded-xl border border-[#F97316]/10 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-[#F97316]/60"></div>
                                        <div className="flex justify-between items-start mb-2 pl-3">
                                           <h5 className="text-base font-bold text-[#2A2A2A] leading-tight pr-4">{update.title}</h5>
                                           <span className="text-xs font-black text-white bg-[#F97316] px-2 py-1 rounded shadow-sm shrink-0">{update.date}</span>
                                        </div>
                                        <p className="text-[#8B5A2B]/90 text-sm font-medium leading-relaxed pl-3">{update.excerpt}</p>
                                        <div className="mt-3 pt-3 border-t border-[#E5E0D8] pl-3">
                                           <span className="text-xs font-bold text-[#A89F91] uppercase tracking-wider">Source: {update.source}</span>
                                        </div>
                                     </div>
                                  ))}
                               </div>
                            </div>
                         </div>
                      )}
                   </div>

                </motion.div>
             </motion.div>
          )}
       </AnimatePresence>

       {/* Global Updates Blockchain Modal */}
       <AnimatePresence>
          {showBlockchainUpdates && (
             <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-6 pt-16">
                <motion.div initial={{scale:0.95, y:20}} animate={{scale:1, y:0}} className="bg-[#FDFCFB] rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl relative flex flex-col border border-[#E5E0D8]">
                   <div className="p-6 border-b border-[#E5E0D8] bg-white shrink-0 flex items-center justify-between">
                      <div>
                         <h2 className="text-2xl font-serif font-black text-[#2A2A2A] mb-1">Blockchain Updates Sync</h2>
                         <p className="text-sm font-medium text-[#A89F91]">Global Current Affairs strictly mapping to: <span className="text-[#8B5A2B] font-bold">{showBlockchainUpdates.tags?.join(', ') || "No Tags"}</span></p>
                      </div>
                      <button onClick={() => setShowBlockchainUpdates(null)} className="p-3 bg-[#F3EFE9] text-[#2A2A2A] rounded-full hover:bg-[#E5E0D8] hover:text-[#F97316] transition-colors">
                         <Plus className="w-6 h-6 rotate-45"/>
                      </button>
                   </div>
                   
                   <div className="p-8 overflow-y-auto w-full custom-scrollbar flex-1 bg-[#FDFCFB]">
                      <div className="relative pl-6 border-l-4 border-[#E5E0D8] space-y-12">
                         {showBlockchainUpdates.updatesList?.map((update, idx) => (
                            <div key={idx} className="relative">
                               {/* Chain Element */}
                               <div className="absolute -left-[37px] top-4 w-6 h-6 rounded-full bg-[#F97316] border-4 border-[#FDFCFB] shadow-sm flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                               </div>
                               
                               <div className="bg-white p-6 rounded-2xl border border-[#D1C8B8] shadow-sm hover:shadow-md hover:border-[#F97316]/40 transition-all">
                                  <div className="flex justify-between items-start mb-3">
                                     <h5 className="text-xl font-bold text-[#2A2A2A] leading-tight pr-4">{update.title}</h5>
                                     <span className="text-xs font-black text-white bg-[#2A2A2A] px-3 py-1 rounded shadow-sm shrink-0 whitespace-nowrap">{update.date}</span>
                                  </div>
                                  <p className="text-[#666666] text-sm font-medium leading-relaxed mb-4">{update.excerpt}</p>
                                  <div className="pt-4 border-t border-dashed border-[#E5E0D8] flex items-center gap-2">
                                     <span className="text-[10px] font-black text-[#A89F91] uppercase tracking-widest bg-[#F3EFE9] px-2 py-1 rounded">Source: {update.source}</span>
                                  </div>
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>

                   {/* Embedded Summarization Control Core */}
                   <div className="p-6 border-t border-[#E5E0D8] bg-white shrink-0 flex items-center justify-between mt-auto">
                      <div className="text-left">
                         <p className="text-[10px] font-black uppercase text-[#8B5A2B] tracking-widest mb-1.5">Action Cost</p>
                         <p className="text-xs font-bold text-[#F97316] bg-[#FDF4ED] border border-[#F97316]/20 px-3 py-1.5 rounded-md inline-block">0.5 AI Credits</p>
                      </div>
                      <button onClick={() => executeMerge(showBlockchainUpdates)} disabled={isMerging} className="px-8 py-3.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 flex items-center gap-2">
                         {isMerging ? <Loader2 className="w-5 h-5 animate-spin"/> : "Summarize & Merge Updates"}
                      </button>
                   </div>
                </motion.div>
             </motion.div>
          )}
       </AnimatePresence>

       {/* Optional Subject Selection Modal */}
       <AnimatePresence>
          {isOptionalModalOpen && (
             <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-6 pt-16">
                <motion.div initial={{scale:0.95, y:20}} animate={{scale:1, y:0}} exit={{scale:0.95, y:20}} className="bg-[#FDFCFB] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl relative flex flex-col border border-[#E5E0D8]">
                   <div className="p-6 border-b border-[#E5E0D8] bg-white shrink-0 flex items-center justify-between">
                      <div>
                         <h2 className="text-2xl font-serif font-black text-[#2A2A2A] mb-1">Select Optional Subject</h2>
                         <p className="text-sm font-medium text-[#A89F91]">You can only configure one explicitly tracked Optional natively.</p>
                      </div>
                      <button onClick={() => {setIsOptionalModalOpen(false); setCustomOptional("")}} className="p-3 bg-[#F3EFE9] text-[#2A2A2A] rounded-full hover:bg-[#E5E0D8] hover:text-[#F97316] transition-colors">
                         <Plus className="w-6 h-6 rotate-45"/>
                      </button>
                   </div>
                   
                   <div className="p-6 overflow-y-auto max-h-[50vh] custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#FDFCFB]">
                      {OPTIONAL_SUBJECTS.map(sub => (
                         <button 
                            key={sub}
                            onClick={() => {
                               localStorage.setItem(`local_optional_${userId}`, sub);
                               setOptionalSubject(sub);
                               setIsOptionalModalOpen(false);
                            }}
                            className="p-4 border border-[#E5E0D8] rounded-xl text-left hover:border-[#F97316] hover:bg-[#FDF4ED] transition-colors font-bold text-[#2A2A2A] text-sm flex items-center justify-between group"
                         >
                            {sub}
                            {optionalSubject === sub && <div className="w-2 h-2 rounded-full bg-[#F97316]"></div>}
                         </button>
                      ))}
                      
                      {optionalSubject && !OPTIONAL_SUBJECTS.includes(optionalSubject) && (
                         <button 
                            disabled
                            className="p-4 border-2 border-[#F97316] bg-[#FDF4ED] rounded-xl text-left font-black text-[#F97316] text-sm flex items-center justify-between"
                         >
                            {optionalSubject}
                            <div className="w-2 h-2 rounded-full bg-[#F97316]"></div>
                         </button>
                      )}
                   </div>

                   <div className="p-6 border-t border-[#E5E0D8] bg-white flex flex-col gap-3">
                      <p className="text-xs font-black text-[#8B5A2B] uppercase tracking-widest">+ Others (Custom Structure)</p>
                      <div className="flex gap-3">
                         <input 
                            type="text" 
                            value={customOptional}
                            onChange={(e) => setCustomOptional(e.target.value)}
                            placeholder="Type unique Subject..." 
                            className="flex-1 bg-[#F3EFE9] border border-[#E5E0D8] rounded-xl px-4 font-medium text-sm outline-none focus:bg-white focus:border-[#F97316]/50"
                         />
                         <button 
                            disabled={!customOptional.trim()}
                            onClick={() => {
                               const fmt = customOptional.trim();
                               localStorage.setItem(`local_optional_${userId}`, fmt);
                               setOptionalSubject(fmt);
                               setIsOptionalModalOpen(false);
                               setCustomOptional("");
                            }}
                            className="px-6 py-3 bg-[#2A2A2A] text-white rounded-xl font-bold text-sm disabled:opacity-30 hover:bg-[#F97316] transition-colors whitespace-nowrap"
                         >
                            Map Custom
                         </button>
                      </div>
                   </div>
                </motion.div>
             </motion.div>
          )}
       </AnimatePresence>

       {/* Add Core Subject Modal */}
       <AnimatePresence>
          {isAddCoreModalOpen && (
             <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-6 pt-16">
                <motion.div initial={{scale:0.95, y:20}} animate={{scale:1, y:0}} exit={{scale:0.95, y:20}} className="bg-[#FDFCFB] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative flex flex-col border border-[#E5E0D8]">
                   <div className="p-6 border-b border-[#E5E0D8] bg-white shrink-0 flex items-center justify-between">
                      <h2 className="text-xl font-serif font-black text-[#2A2A2A]">New Core Folder</h2>
                      <button onClick={() => {setIsAddCoreModalOpen(false); setNewCoreSubject("")}} className="p-2 bg-[#F3EFE9] text-[#2A2A2A] rounded-full hover:bg-[#E5E0D8] hover:text-[#F97316] transition-colors">
                         <Plus className="w-5 h-5 rotate-45"/>
                      </button>
                   </div>
                   <div className="p-6 bg-[#FDFCFB]">
                      <label className="text-xs font-black text-[#A89F91] uppercase tracking-widest block mb-2">Subject Name</label>
                      <input 
                         type="text" 
                         value={newCoreSubject}
                         onChange={(e) => setNewCoreSubject(e.target.value)}
                         placeholder="e.g. Internal Security" 
                         className="w-full bg-[#F3EFE9] border border-[#E5E0D8] rounded-xl px-4 py-3 font-medium text-sm outline-none focus:bg-white focus:border-[#F97316]/50 mb-4"
                      />
                      <button 
                         disabled={!newCoreSubject.trim()}
                         onClick={() => {
                            const val = newCoreSubject.trim();
                            if(val && !customCoreSubjects.includes(val) && !CORE_SUBJECTS.includes(val)) {
                               const updated = [...customCoreSubjects, val];
                               setCustomCoreSubjects(updated);
                               localStorage.setItem(`local_custom_core_${userId}`, JSON.stringify(updated));
                            }
                            setIsAddCoreModalOpen(false);
                            setNewCoreSubject("");
                         }}
                         className="w-full py-3 bg-[#2A2A2A] text-white rounded-xl font-bold text-sm disabled:opacity-30 hover:bg-[#F97316] transition-colors"
                      >
                         Create Folder
                      </button>
                   </div>
                </motion.div>
             </motion.div>
          )}
       </AnimatePresence>

       {/* Floating Bulk Action Bar */}
       <AnimatePresence>
          {selectedNotes.length > 0 && (
             <motion.div 
               initial={{opacity:0, y:50}} 
               animate={{opacity:1, y:0}} 
               exit={{opacity:0, y:50}}
               className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#2A2A2A] text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 z-50 border border-white/10"
             >
                <div className="flex items-center gap-2">
                   <span className="w-6 h-6 rounded-full bg-[#F97316] text-[10px] font-black flex items-center justify-center shrink-0">
                      {selectedNotes.length}
                   </span>
                   <span className="text-sm font-bold opacity-80 uppercase tracking-wider">Selected</span>
                </div>
                <div className="w-px h-6 bg-white/20"></div>
                <div className="flex items-center gap-2">
                   <button onClick={() => handleBulkAction('delete')} disabled={isProcessing} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white hover:text-red-400 group" title="Delete Selected">
                      <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform"/>
                   </button>
                   <button onClick={() => handleBulkAction('disable')} disabled={isProcessing} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white hover:text-orange-400 group" title="Disable Updates">
                      <EyeOff className="w-5 h-5 group-hover:scale-110 transition-transform"/>
                   </button>
                   <button onClick={() => handleBulkAction('star')} disabled={isProcessing} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white hover:text-yellow-400 group" title="Star Required Focus">
                      <Star className="w-5 h-5 group-hover:scale-110 transition-transform"/>
                   </button>
                </div>
                <div className="w-px h-6 bg-white/20"></div>
                <button onClick={() => setSelectedNotes([])} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white" title="Unselect All">
                   <X className="w-5 h-5"/>
                </button>
             </motion.div>
          )}
       </AnimatePresence>

    </div>
  );
}
