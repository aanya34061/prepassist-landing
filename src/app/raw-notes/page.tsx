"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderUp, File as FileIcon, X, Loader2, BookOpen, UploadCloud, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { saveCloudNote, uploadNoteStorage, CORE_SUBJECTS, OPTIONAL_SUBJECTS } from "@/lib/cloud_notes";
import { fetchUserProfile } from "@/lib/credits";
import Link from "next/link";

export default function RawNotesPage() {
  const [userId, setUserId] = useState<string>("");
  const [hasCloudNotes, setHasCloudNotes] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  
  // Staging Setup
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feeding Integration Modal
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [pageTitle, setPageTitle] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>(CORE_SUBJECTS[0]);
  const [hashtags, setHashtags] = useState("");
  
  const [isFeeding, setIsFeeding] = useState(false);
  const [feedingStatus, setFeedingStatus] = useState("");
  const [feedSuccess, setFeedSuccess] = useState(false);
  
  // Custom arrays fetched from LocalStorage
  const [optionalSubject, setOptionalSubject] = useState<string | null>(null);
  const [customCoreSubjects, setCustomCoreSubjects] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }: any) => {
       if (data.session?.user) {
          setUserId(data.session.user.id);
          try {
              const profile = await fetchUserProfile(data.session.user.id);
              if (profile.hasCloudNotes) setHasCloudNotes(true);
          } catch(e) {}
       } else {
          setUserId("local_guest_tracker");
       }
       setIsVerifying(false);
    });
  }, []);

  useEffect(() => {
    if (userId && userId !== "local_guest_tracker") {
       const storedOpt = localStorage.getItem(`local_optional_${userId}`);
       if (storedOpt) setOptionalSubject(storedOpt);
       
       const storedCore = localStorage.getItem(`local_custom_core_${userId}`);
       if (storedCore) {
          try { setCustomCoreSubjects(JSON.parse(storedCore)); } catch(e) {}
       }
    }
  }, [userId]);

  const allSubjects = [
    { title: "Core Studies", items: [...[CORE_SUBJECTS[0], CORE_SUBJECTS[1], CORE_SUBJECTS[3], CORE_SUBJECTS[4], CORE_SUBJECTS[5], CORE_SUBJECTS[6]], ...customCoreSubjects] },
    { title: "Optional Mastery", items: optionalSubject ? [optionalSubject] : [] },
  ];

  const handleDragOver = (e: React.DragEvent) => {
     e.preventDefault();
     setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
     e.preventDefault();
     setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
     e.preventDefault();
     setIsDragOver(false);
     
     if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const incoming = Array.from(e.dataTransfer.files).filter(f => 
           f.name.endsWith('.pdf') || f.name.endsWith('.doc') || f.name.endsWith('.docx')
        );
        setStagedFiles(prev => [...prev, ...incoming]);
     }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files.length > 0) {
        const incoming = Array.from(e.target.files).filter(f => 
           f.name.endsWith('.pdf') || f.name.endsWith('.doc') || f.name.endsWith('.docx')
        );
        setStagedFiles(prev => [...prev, ...incoming]);
     }
  };

  const openIntegrationModal = (file: File) => {
     setActiveFile(file);
     setPageTitle(file.name.split('.')[0]);
     setHashtags("");
     setFeedSuccess(false);
     setFeedingStatus("");
  };

  const finalizeFeed = async () => {
     if (!activeFile) return;
     if (!pageTitle.trim()) return alert("Title map required securely.");

     setIsFeeding(true);
     setFeedingStatus("Authenticating Blob Data...");
     try {
        setFeedingStatus("Executing Cloud NLP Vectors...");
        
        const formData = new FormData();
        formData.append('pdf', activeFile);

        const res = await fetch('/api/notes/extract-pdf', {
           method: 'POST',
           body: formData
        });
        const data = await res.json();
        
        // Map content even if API fails gracefully locally.
        const extractedText = res.ok ? data.text : "AI Extraction Offline: Local Byte payload deployed safely.";

        setFeedingStatus("Pushing Bytes to Vault Storage...");
        const secureUrl = await uploadNoteStorage(activeFile, userId);

        setFeedingStatus("Synchronizing Cloud Matrices...");
        const processedTags = hashtags.split(',').map(t => t.trim()).filter(Boolean);

        await saveCloudNote({
           userId: userId,
           title: pageTitle,
           subject: selectedSubject,
           categoryType: CORE_SUBJECTS.includes(selectedSubject) ? 'core' : (OPTIONAL_SUBJECTS.includes(selectedSubject) ? 'optional' : 'other'),
           type: 'file',
           content: extractedText,
           fileUrl: secureUrl,
           tags: processedTags,
           fileSizeBytes: activeFile.size
        });

        setFeedSuccess(true);
        // Wipe local staged blob safely
        setStagedFiles(prev => prev.filter(f => f !== activeFile));

        setTimeout(() => {
           setActiveFile(null);
           setIsFeeding(false);
        }, 2000);

     } catch(err: any) {
        alert("Failed to securely feed: " + err.message);
        setIsFeeding(false);
     }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#333333] font-sans pb-20 selection:bg-[#F97316]/20">
       <div className="max-w-4xl mx-auto px-6 pt-12">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
             <div>
                <h1 className="text-4xl font-serif font-black text-[#2A2A2A] tracking-tight shrink-0 mb-2">Raw Notes <span className="text-[#F97316]">Staging</span></h1>
                <p className="text-[#8B5A2B]/80 font-medium text-sm max-w-xl">
                   Drag your exclusive PDFs / Docs here to feed them directly into your assigned Cloud database using explicit dynamic hashtags and structural folders.
                </p>
             </div>
          </div>

          {isVerifying ? (
             <div className="w-full p-12 border-2 border-[#E5E0D8] rounded-3xl flex items-center justify-center min-h-[300px]">
                <Loader2 className="w-8 h-8 animate-spin text-[#A89F91]" />
             </div>
          ) : !hasCloudNotes ? (
             <div className="w-full p-12 border-2 border-slate-200 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all bg-gradient-to-br from-slate-50 to-indigo-50/10 min-h-[300px] shadow-sm relative overflow-hidden">
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-400"></div>
                <div className="p-4 bg-white rounded-full mb-4 shadow-sm border border-slate-200">
                   <UploadCloud className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Cloud Vault Locked</h3>
                <p className="text-slate-500 font-medium text-sm mb-6 text-center max-w-md">Blob file uploads are physically restricted to 1 GB capacities for Cloud Notes subscribers to protect database stability.</p>
                
                <Link href="/pricing" className="px-8 py-3 bg-indigo-600 border border-indigo-700 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)]">
                   Unlock 1GB Storage Vault for ₹199/mo
                </Link>
             </div>
          ) : (
             <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full p-12 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all bg-[#F3EFE9]/40 mb-12 ${isDragOver ? 'border-[#F97316] bg-[#FDF4ED]' : 'border-[#D1C8B8] hover:border-[#F97316]/60'} min-h-[300px] cursor-pointer`}
                onClick={() => (!isDragOver && stagedFiles.length === 0) ? fileInputRef.current?.click() : null}
             >
                <input type="file" ref={fileInputRef} onChange={handleFileInput} className="hidden" multiple accept=".pdf,.doc,.docx" />
                <div className={`p-4 bg-white rounded-full mb-4 shadow-sm border ${isDragOver ? 'border-[#F97316]/30' : 'border-[#E5E0D8]'}`}>
                   <UploadCloud className={`w-8 h-8 ${isDragOver ? 'text-[#F97316]' : 'text-[#8B5A2B]'}`} />
                </div>
                <h3 className="text-lg font-black text-[#2A2A2A] mb-2">{isDragOver ? "Release to Map Array" : "Drag Explicit PDFs Here"}</h3>
                <p className="text-[#8B5A2B] font-medium text-sm mb-6 text-center max-w-sm">Secure local staging buffer. Matrices synchronize to database purely upon your execution.</p>

                <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="px-6 py-2.5 bg-white border border-[#D1C8B8] text-[#2A2A2A] font-bold text-sm rounded-xl hover:bg-[#FDF4ED] hover:text-[#F97316] hover:border-[#F97316]/40 transition-all shadow-sm">
                   Browse Files Native
                </button>
             </div>
          )}

          {stagedFiles.length > 0 && (
             <div className="space-y-4">
                <div className="flex items-center justify-between mb-6 border-b border-[#E5E0D8] pb-4">
                   <h3 className="text-xl font-serif font-black text-[#2A2A2A] flex items-center gap-2">
                       <FolderUp className="w-5 h-5 text-[#F97316]"/> Staged Nodes ({stagedFiles.length})
                   </h3>
                   <button onClick={() => setStagedFiles([])} className="text-xs font-bold text-[#A89F91] uppercase hover:text-red-500 transition-colors">Clear All</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <AnimatePresence>
                      {stagedFiles.map((file, idx) => (
                         <motion.div 
                            key={`${file.name}-${idx}`} 
                            initial={{opacity:0, scale:0.95}} 
                            animate={{opacity:1, scale:1}} 
                            exit={{opacity:0, scale:0.9}} 
                            className="bg-white border border-[#E5E0D8] rounded-2xl p-5 shadow-sm group hover:border-[#D1C8B8] transition-all flex flex-col justify-between"
                         >
                            <div className="flex items-start justify-between mb-6">
                               <div className="flex items-start gap-4 flex-1 pr-4">
                                  <div className="w-10 h-10 rounded-xl bg-[#FDF4ED] border border-[#F97316]/20 flex items-center justify-center shrink-0">
                                     <FileIcon className="w-5 h-5 text-[#F97316]" />
                                  </div>
                                  <div>
                                     <h4 className="font-bold text-[#2A2A2A] text-[15px] truncate max-w-[180px] sm:max-w-xs">{file.name}</h4>
                                     <p className="text-xs font-medium text-[#8B5A2B]/60 mt-1 uppercase tracking-wider">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                  </div>
                               </div>
                               <button onClick={() => setStagedFiles(prev => prev.filter((_, i) => i !== idx))} className="text-[#A89F91] hover:text-red-500 transition-colors shrink-0 p-1">
                                  <X className="w-4 h-4"/>
                               </button>
                            </div>
                            
                            <button 
                               onClick={() => openIntegrationModal(file)}
                               className="w-full py-3 bg-[#EEF9F0] border border-[#D1E8D5] text-[#2E4A35] rounded-xl font-bold text-sm hover:bg-[#C6ECCC] transition-colors flex items-center justify-center gap-2"
                            >
                               Feed To Cloud Target <BookOpen className="w-4 h-4" />
                            </button>
                         </motion.div>
                      ))}
                   </AnimatePresence>
                </div>
             </div>
          )}

       </div>

       {/* Integration Modal Overlay */}
       <AnimatePresence>
          {activeFile && (
             <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{y:20, scale:0.95}} animate={{y:0, scale:1}} exit={{y:20, scale:0.95}} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-[#D1C8B8]">
                   <div className="p-6 border-b border-[#E5E0D8] flex items-center justify-between bg-[#FDFCFB]">
                      <h2 className="text-xl font-serif font-black text-[#2A2A2A]">Configure Cloud Node Metadata</h2>
                      <button onClick={() => !isFeeding && setActiveFile(null)} className="p-2 hover:bg-[#F3EFE9] rounded-xl transition-colors">
                         <X className="w-5 h-5 text-[#A89F91]" />
                      </button>
                   </div>
                   
                   {!feedSuccess ? (
                      <div className="p-6 space-y-5">
                         <div className="bg-[#FDF4ED] p-4 rounded-xl border border-[#F97316]/20 flex items-center gap-3">
                            <FileIcon className="w-5 h-5 text-[#F97316]"/>
                            <span className="font-bold text-[#8B5A2B] text-sm truncate">{activeFile.name}</span>
                         </div>
                         
                         <div>
                            <label className="block text-xs font-black text-[#8B5A2B] uppercase tracking-widest mb-2">Identifier Map</label>
                            <input 
                               type="text" 
                               value={pageTitle}
                               onChange={(e) => setPageTitle(e.target.value)}
                               className="w-full bg-[#F3EFE9] border border-[#E5E0D8] rounded-xl py-3 px-4 outline-none focus:bg-white focus:border-[#F97316]/50 font-bold text-[#2A2A2A]"
                            />
                         </div>

                         <div>
                            <label className="block text-xs font-black text-[#8B5A2B] uppercase tracking-widest mb-2">Hashtag Vectors (Optional)</label>
                            <input 
                               type="text" 
                               value={hashtags}
                               onChange={(e) => setHashtags(e.target.value)}
                               placeholder="#UPSC, #History, #Exam..."
                               className="w-full bg-[#F3EFE9] border border-[#E5E0D8] rounded-xl py-3 px-4 outline-none focus:bg-white focus:border-[#F97316]/50 font-medium text-[#2A2A2A]"
                            />
                            <p className="text-[10px] text-[#A89F91] mt-1 font-medium">Tracking tags strictly separated by commas. Used natively for retrieval architectures.</p>
                         </div>

                         <div>
                            <label className="block text-xs font-black text-[#8B5A2B] uppercase tracking-widest mb-2">Subject Folder Pipeline</label>
                            <select 
                               value={selectedSubject} 
                               onChange={(e) => setSelectedSubject(e.target.value)}
                               className="w-full appearance-none bg-[#F3EFE9] border border-[#E5E0D8] rounded-xl py-3 px-4 outline-none focus:bg-white focus:border-[#F97316]/50 font-bold text-[#2A2A2A] cursor-pointer"
                            >
                               {allSubjects.map((group, gIdx) => (
                                  <optgroup key={gIdx} label={group.title} className="font-black text-[#A89F91]">
                                     {group.items.map(sub => (
                                        <option key={sub} value={sub} className="text-[#2A2A2A] font-medium">{sub}</option>
                                     ))}
                                  </optgroup>
                               ))}
                            </select>
                         </div>

                         <div className="pt-4 border-t border-[#E5E0D8] flex gap-3">
                            <button onClick={() => setActiveFile(null)} disabled={isFeeding} className="flex-1 py-3 text-[#A89F91] font-bold text-sm bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors shrink-0 border border-gray-200 disabled:opacity-50">
                               Abort Sequence
                            </button>
                            <button onClick={finalizeFeed} disabled={isFeeding || !pageTitle.trim()} className="flex-[2] py-3 bg-[#F97316] text-white font-bold text-sm rounded-xl border border-[#D95F0E] hover:bg-[#D95F0E] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                               {isFeeding ? (
                                  <><Loader2 className="w-4 h-4 animate-spin"/> {feedingStatus}</>
                               ) : "Initialize Cloud Feeding"}
                            </button>
                         </div>
                      </div>
                   ) : (
                      <div className="p-12 flex flex-col items-center justify-center text-center">
                         <div className="w-16 h-16 bg-[#EEF9F0] border-[4px] border-[#D1E8D5] rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 className="w-8 h-8 text-[#2E4A35]" />
                         </div>
                         <h3 className="text-2xl font-serif font-black text-[#2E4A35] mb-2">Nodes Feed Successfully!</h3>
                         <p className="text-[#4E7658] font-medium text-sm">Target explicitly secured in Cloud Arrays.</p>
                      </div>
                   )}
                </motion.div>
             </motion.div>
          )}
       </AnimatePresence>

    </div>
  );
}
