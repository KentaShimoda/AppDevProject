import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { researchService } from "../../services/researchService";
import { bookmarkService } from "../../services/bookmarkService";
import { Document, Page, pdfjs } from 'react-pdf';

// 🚀 PDF Worker Initialization for thumbnails
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const Myarchive: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const [activeTab, setActiveTab] = useState<"uploads" | "bookmarks">("uploads");
  const [uploads, setUploads] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // State to track bookmarked research IDs for UI synchronization[cite: 10, 15]
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());

  // 🚀 Protocol: Stability fix for JSONB fields (Coordinator/Researchers)
  const safeParse = (data: any, fallback: any) => {
    if (!data) return fallback;
    if (typeof data === 'string' && data.trim().length > 0) {
      try { return JSON.parse(data); } catch { return fallback; }
    }
    return (Array.isArray(data) || typeof data === 'object') ? data : fallback;
  };

  const fetchArchiveData = useCallback(() => {
    setLoading(true);
    // Parallel fetch for personal inventory and saved items[cite: 12, 13, 15]
    Promise.all([
      researchService.getAll(),
      bookmarkService.getMyList()
    ]).then(([allStudies, savedList]) => {
      // 🚀 Protocol: Filter studies with safe parsing to prevent white-screen crashes
      const myUploads = allStudies.filter((s: any) => {
        const coord = safeParse(s.coordinator, {});
        const resList = safeParse(s.researchers, []);
        
        const isCoordinator = (coord?.email || "").toLowerCase() === currentUser.email?.toLowerCase();
        const isResearcher = resList?.some((r: any) => (r.email || r || "").toLowerCase() === (currentUser.email || "").toLowerCase());
        
        return isCoordinator || isResearcher;
      });
      
      setUploads(myUploads);
      setBookmarks(savedList || []);
      
      // Initialize the bookmark set for instant UI updates[cite: 10, 15]
      const savedSet = new Set<number>(savedList.map((b: any) => b.id));
      setBookmarkedIds(savedSet);
      
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [currentUser.email]);

  useEffect(() => {
    fetchArchiveData();
  }, [fetchArchiveData]);

  // Synchronized Toggle Logic for Save/Unsave[cite: 12, 15]
  const handleToggleBookmark = async (id: number) => {
    try {
      const result = await bookmarkService.toggle(id);
      setBookmarkedIds(prev => {
        const newSet = new Set(prev);
        if (result.isBookmarked) newSet.add(id);
        else {
            newSet.delete(id);
            if (activeTab === "bookmarks") {
                setBookmarks(curr => curr.filter(b => b.id !== id));
            }
        }
        return newSet;
      });
    } catch (err) {
      console.error("Archive sync error:", err);
    }
  };

  // Real-time Statistics derived from filtered data[cite: 15]
  const stats = useMemo(() => ({
    totalUploads: uploads.length,
    totalViews: uploads.reduce((acc, s) => acc + (Number(s.views) || 0), 0),
    totalValidations: uploads.reduce((acc, s) => acc + (Number(s.validations) || 0), 0),
    totalBookmarks: bookmarks.length
  }), [uploads, bookmarks]);

  const displayedItems = useMemo(() => {
    const source = activeTab === "uploads" ? uploads : bookmarks;
    if (!searchQuery) return source;
    const query = searchQuery.toLowerCase();
    return source.filter((item: any) => 
      item.title.toLowerCase().includes(query) ||
      item.tags?.toLowerCase().includes(query)
    );
  }, [activeTab, uploads, bookmarks, searchQuery]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-warm-white">
      <span className="text-meta-label animate-pulse uppercase tracking-[0.3em]">Synchronizing Archive Terminal...</span>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-warm-white font-sans antialiased text-charcoal-black">
      <Sidebar />
      <main className="ml-20 flex-1 relative p-8 md:p-12">
        <div className="absolute top-0 right-0 w-1/2 h-screen bg-orange-50/20 -z-10 pointer-events-none border-l border-orange-100/50"></div>
        
        <div className="max-w-[1600px] mx-auto">
          {/* Header Section[cite: 15] */}
          <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
            <div className="space-y-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-1 bg-primary-orange"></div>
                <span className="text-meta-label uppercase tracking-widest">Scholar Archive Terminal</span>
              </div>
              <h1 className="text-h1">My Research<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-orange to-red-600 uppercase">Archive</span></h1>
            </div>
            <div className="relative w-full lg:w-[400px]">
              <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-primary-orange"></i>
              <input 
                type="text" 
                placeholder={`SEARCH IN ${activeTab.toUpperCase()}...`} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-terminal pl-14 py-5" 
              />
            </div>
          </header>

          {/* 1. Personal Stats Grid[cite: 15] */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {[
              { label: "My Submissions", val: stats.totalUploads, icon: "fa-file-arrow-up", color: "text-black" },
              { label: "Total Views", val: stats.totalViews, icon: "fa-eye", color: "text-primary-orange" },
              { label: "Validations", val: stats.totalValidations, icon: "fa-circle-check", color: "text-green-600" },
              { label: "My Bookmarks", val: stats.totalBookmarks, icon: "fa-bookmark", color: "text-orange-500" }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-8 rounded-terminal border border-orange-50 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                <i className={`fa-solid ${stat.icon} absolute -right-4 -bottom-4 text-6xl opacity-5 group-hover:scale-110 transition-transform`}></i>
                <span className={`text-4xl font-black ${stat.color} tracking-tighter mb-1`}>{stat.val}</span>
                <span className="text-meta-label uppercase tracking-widest text-[9px]">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* 2. Tab Navigation[cite: 15] */}
          <div className="flex gap-10 mb-12 border-b border-orange-100">
            <button 
              onClick={() => setActiveTab("uploads")}
              className={`pb-6 text-[11px] font-black uppercase tracking-widest transition-all relative ${activeTab === "uploads" ? "text-primary-orange" : "text-slate-300 hover:text-black"}`}
            >
              My Uploads ({uploads.length})
              {activeTab === "uploads" && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary-orange"></div>}
            </button>
            <button 
              onClick={() => setActiveTab("bookmarks")}
              className={`pb-6 text-[11px] font-black uppercase tracking-widest transition-all relative ${activeTab === "bookmarks" ? "text-primary-orange" : "text-slate-300 hover:text-black"}`}
            >
              Saved Bookmarks ({bookmarks.length})
              {activeTab === "bookmarks" && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary-orange"></div>}
            </button>
          </div>

          {/* 3. Research Content Grid with PDF Thumbnails */}
          {displayedItems.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
              {displayedItems.map((study) => (
                <div key={study.id} className="card-manuscript group">
                  <div className="absolute top-0 left-0 w-2 h-0 group-hover:h-full bg-primary-orange transition-all duration-700"></div>
                  
                  <div className="flex flex-col md:flex-row items-stretch gap-10">
                    
                    {/* 🚀 Restored: PDF Preview Thumbnail Section[cite: 13] */}
                    <div className="w-full md:w-56 h-auto bg-ember-soft rounded-[2.5rem] flex flex-col items-center justify-center text-orange-200 group-hover:text-white transition-all duration-700 shrink-0 overflow-hidden relative border border-orange-100/50 shadow-inner">
                      <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-10 transition-opacity">
                         <i className="fa-solid fa-file-pdf text-6xl"></i>
                      </div>
                      <div className="z-10 scale-[0.35] origin-center">
                        <Document 
                          file={researchService.getViewUrl(study.id)} 
                          loading={<i className="fa-solid fa-circle-notch fa-spin text-4xl text-primary-orange"></i>}
                        >
                          <Page pageNumber={1} renderTextLayer={false} renderAnnotationLayer={false} width={400} />
                        </Document>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col py-2">
                      <div className="flex justify-between items-start mb-6">
                        <span className={`text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest border ${activeTab === 'uploads' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-primary-orange border-orange-100'}`}>
                          {activeTab === 'uploads' ? study.status : 'Saved Content'}
                        </span>
                        
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleToggleBookmark(study.id); }}
                          className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center border ${bookmarkedIds.has(study.id) ? 'bg-primary-orange text-white border-primary-orange shadow-lg' : 'bg-orange-50 text-orange-300 border-orange-100 hover:text-primary-orange'}`}
                        >
                          <i className={`${bookmarkedIds.has(study.id) ? 'fa-solid' : 'fa-regular'} fa-bookmark`}></i>
                        </button>
                      </div>

                      <h3 className="text-xl font-black mb-4 uppercase leading-tight text-charcoal-black group-hover:text-primary-orange transition-colors line-clamp-2">{study.title}</h3>

                      <div className="flex flex-wrap gap-2 mb-8">
                        {study.tags?.split(',').map((tag: string, i: number) => (
                          <span key={i} className="bg-white text-orange-300 text-[9px] font-black px-3 py-1 rounded-lg uppercase border border-orange-50 tracking-widest">{tag.trim()}</span>
                        ))}
                      </div>

                      {/* Validations and Views Metrics[cite: 13] */}
                      <div className="space-y-1 mb-8 border-l-2 border-orange-100 pl-4 text-xs font-bold text-gray-400">
                         <span><i className="fa-solid fa-eye mr-2 text-primary-orange/50"></i>{study.views || 0} Views</span>
                         <span className="ml-6"><i className="fa-solid fa-circle-check mr-2 text-green-600/50"></i>{study.validations || 0} Validations</span>
                      </div>

                      <div className="mt-auto pt-8 border-t border-orange-50 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-meta-label text-[9px] mb-1 uppercase tracking-tighter">{activeTab === 'uploads' ? 'Submission Date' : 'Saved On'}</span>
                          <span className="text-data-value uppercase text-[10px]">
                            {new Date(study.dateBookmarked || study.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                        <button onClick={() => navigate(`/preview/${study.id}`)} className="btn-terminal-primary py-3 px-8">Open Manuscript</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-24 bg-white rounded-manuscript border-4 border-dashed border-orange-50 flex flex-col items-center justify-center opacity-40">
               <i className="fa-solid fa-folder-open text-6xl text-orange-100 mb-4"></i>
               <span className="text-meta-label tracking-[0.5em] uppercase">No archived items in this tab</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Myarchive;