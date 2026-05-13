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

// ─── Types ───────────────────────────────────────────────────────────────────
interface Researcher { name: string; email: string; }
interface Coordinator { name: string; email: string; }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const parseResearchers = (raw: any): Researcher[] => {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) || []; } catch { return []; }
  }
  return Array.isArray(raw) ? raw : [];
};

const parseCoordinator = (raw: any): Coordinator | null => {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return typeof raw === 'object' ? raw : null;
};

// ─── Study Card Component (Matched with Dashboard) ───────────────────────────
interface StudyCardProps {
  study: any;
  isBookmarked: boolean;
  onBookmark: (id: number) => void;
  onView: (id: number) => void;
  activeTab: "uploads" | "bookmarks";
}

const StudyCard: React.FC<StudyCardProps> = ({ study, isBookmarked, onBookmark, onView, activeTab }) => {
  const researchers = parseResearchers(study.researchers);
  const coordinator = parseCoordinator(study.coordinator);
  const tags = study.tags?.split(",").map((t: string) => t.trim()).filter(Boolean) || [];

  // Abstract substitute
  const abstractSnippet = tags.length > 0
    ? `This study covers topics in ${tags.slice(0, 3).join(", ")}${tags.length > 3 ? `, and ${tags.length - 3} more area${tags.length - 3 > 1 ? "s" : ""}` : ""}.`
    : "No abstract available.";

  const badgeText = activeTab === 'uploads' ? study.status : 'Saved Content';
  const dateValue = study.dateBookmarked || study.createdAt;

  return (
    <article className="card-manuscript group relative overflow-hidden flex flex-col md:flex-row gap-0 p-0 rounded-[2rem] border border-orange-100 bg-white shadow-sm hover:shadow-xl transition-all duration-500">
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 w-1 h-0 group-hover:h-full bg-primary-orange transition-all duration-700 rounded-l-[2rem] z-10" />

      {/* PDF Preview Panel */}
      <div className="relative w-full md:w-48 shrink-0 bg-gradient-to-br from-orange-50 to-amber-50/60 overflow-hidden rounded-t-[2rem] md:rounded-l-[2rem] md:rounded-tr-none border-b md:border-b-0 md:border-r border-orange-100 min-h-[200px] md:min-h-0">
        <div
          style={{ pointerEvents: "none", lineHeight: 0, display: "block" }}
          className="opacity-60 group-hover:opacity-90 transition-opacity duration-500"
        >
          <Document file={researchService.getViewUrl(study.id)} loading={null} error={null}>
            <Page pageNumber={1} width={192} renderTextLayer={false} renderAnnotationLayer={false} />
          </Document>
        </div>
        {/* Bottom fade so the crop looks intentional */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-amber-50 to-transparent pointer-events-none" />
        <i className="fa-solid fa-file-pdf absolute bottom-3 right-3 text-primary-orange/60 group-hover:text-primary-orange text-base transition-colors" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-6 md:p-7 min-w-0">
        {/* Top row: badge + bookmark */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest border shrink-0 ${activeTab === 'uploads' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-primary-orange border-orange-100'}`}>
            {badgeText}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onBookmark(study.id); }}
            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all shrink-0 ${
              isBookmarked
                ? "bg-primary-orange text-white border-primary-orange shadow"
                : "bg-orange-50 text-orange-300 border-orange-100 hover:text-primary-orange"
            }`}
          >
            <i className={`${isBookmarked ? "fa-solid" : "fa-regular"} fa-bookmark text-sm`} />
          </button>
        </div>

        {/* Title */}
        <h3
          className="text-base font-black uppercase leading-tight text-charcoal-black group-hover:text-primary-orange transition-colors line-clamp-2 mb-3 cursor-pointer"
          onClick={() => onView(study.id)}
        >
          {study.title}
        </h3>

        {/* Abstract snippet */}
        <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mb-4">
          {abstractSnippet}
        </p>

        {/* Authors */}
        {(researchers.length > 0 || coordinator) && (
          <div className="mb-4">
            <span className="text-[9px] font-black uppercase tracking-widest text-primary-orange mb-1.5 block">Authors</span>
            <div className="flex flex-wrap gap-1.5">
              {researchers.map((r, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                  <i className="fa-solid fa-user-pen text-[8px] text-primary-orange" />
                  {r.name}
                </span>
              ))}
              {coordinator && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg">
                  <i className="fa-solid fa-chalkboard-user text-[8px] text-amber-500" />
                  {coordinator.name}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {tags.slice(0, 5).map((tag, i) => (
              <span key={i} className="text-[9px] font-black text-primary-orange uppercase bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100">
                {tag}
              </span>
            ))}
            {tags.length > 5 && (
              <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                +{tags.length - 5} more
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-orange-50 flex items-center justify-between gap-4">
          <div className="flex gap-4">
            <span className="text-[10px] font-black uppercase text-slate-400">
              <i className="fa-solid fa-eye mr-1.5 text-primary-orange" />{study.views || 0}
            </span>
            <span className="text-[10px] font-black uppercase text-slate-400">
              <i className="fa-solid fa-award mr-1.5 text-primary-orange" />{study.validations || 0}
            </span>
            <span className="text-[10px] font-black uppercase text-slate-400">
              <i className="fa-solid fa-calendar mr-1.5 text-primary-orange" />
              {new Date(dateValue).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </span>
          </div>
          <button
            onClick={() => onView(study.id)}
            className="btn-terminal-primary text-[10px] py-2.5 px-5 shrink-0"
          >
            View
          </button>
        </div>
      </div>
    </article>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const Myarchive: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const [activeTab, setActiveTab] = useState<"uploads" | "bookmarks">("uploads");
  const [uploads, setUploads] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // State to track bookmarked research IDs for UI synchronization
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());

  // 🚀 Protocol: Stability fix for JSONB fields
  const safeParse = (data: any, fallback: any) => {
    if (!data) return fallback;
    if (typeof data === 'string' && data.trim().length > 0) {
      try { return JSON.parse(data); } catch { return fallback; }
    }
    return (Array.isArray(data) || typeof data === 'object') ? data : fallback;
  };

  const fetchArchiveData = useCallback(() => {
    setLoading(true);
    // Parallel fetch for personal inventory and saved items
    Promise.all([
      researchService.getAll(),
      bookmarkService.getMyList()
    ]).then(([allStudies, savedList]) => {
      // Filter studies with safe parsing to prevent white-screen crashes
      const myUploads = allStudies.filter((s: any) => {
        const coord = safeParse(s.coordinator, {});
        const resList = safeParse(s.researchers, []);
        
        const isCoordinator = (coord?.email || "").toLowerCase() === currentUser.email?.toLowerCase();
        const isResearcher = resList?.some((r: any) => (r.email || r || "").toLowerCase() === (currentUser.email || "").toLowerCase());
        
        return isCoordinator || isResearcher;
      });
      
      setUploads(myUploads);
      setBookmarks(savedList || []);
      
      // Initialize the bookmark set for instant UI updates
      const savedSet = new Set<number>(savedList.map((b: any) => b.id));
      setBookmarkedIds(savedSet);
      
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [currentUser.email]);

  useEffect(() => {
    fetchArchiveData();
  }, [fetchArchiveData]);

  // Synchronized Toggle Logic for Save/Unsave
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

  // Real-time Statistics derived from filtered data
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
    
    // Improved search filter (matches Dashboard logic)
    return source.filter((item: any) => 
      item.title?.toLowerCase().includes(query) ||
      item.tags?.toLowerCase().includes(query) ||
      item.researchers?.toLowerCase().includes(query) ||
      item.coordinator?.toLowerCase().includes(query)
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
          {/* Header Section */}
          <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
            <div className="space-y-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-1 bg-primary-orange"></div>
                <span className="text-meta-label uppercase tracking-widest">Scholar Archive Terminal</span>
              </div>
              <h1 className="text-h1">My Research<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-orange to-red-600 uppercase">Archive</span></h1>
            </div>
            {/* Standardized Search Bar (Matches Dashboard layout) */}
            <div className="relative w-full lg:w-[450px]">
              <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-primary-orange"></i>
              <input 
                type="text" 
                placeholder={`SEARCH TITLES, TAGS OR AUTHORS...`} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-terminal pl-14 py-5" 
              />
            </div>
          </header>

          {/* 1. Personal Stats Grid */}
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

          {/* 2. Tab Navigation */}
          <div className="flex gap-10 mb-12 border-b border-orange-100">
            <button 
              onClick={() => { setActiveTab("uploads"); setSearchQuery(""); }}
              className={`pb-6 text-[11px] font-black uppercase tracking-widest transition-all relative ${activeTab === "uploads" ? "text-primary-orange" : "text-slate-300 hover:text-black"}`}
            >
              My Uploads ({uploads.length})
              {activeTab === "uploads" && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary-orange"></div>}
            </button>
            <button 
              onClick={() => { setActiveTab("bookmarks"); setSearchQuery(""); }}
              className={`pb-6 text-[11px] font-black uppercase tracking-widest transition-all relative ${activeTab === "bookmarks" ? "text-primary-orange" : "text-slate-300 hover:text-black"}`}
            >
              Saved Bookmarks ({bookmarks.length})
              {activeTab === "bookmarks" && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary-orange"></div>}
            </button>
          </div>

          {/* 3. Research Content Grid (Now uses the same StudyCard layout as Dashboard) */}
          {displayedItems.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {displayedItems.map((study) => (
                <StudyCard
                  key={study.id}
                  study={study}
                  isBookmarked={bookmarkedIds.has(study.id)}
                  onBookmark={handleToggleBookmark}
                  onView={(id) => navigate(`/preview/${id}`)}
                  activeTab={activeTab}
                />
              ))}
            </div>
          ) : (
            <div className="py-24 bg-white rounded-manuscript border-4 border-dashed border-orange-50 flex flex-col items-center justify-center opacity-40">
               <i className="fa-solid fa-folder-open text-6xl text-orange-100 mb-4"></i>
               <span className="text-meta-label tracking-[0.5em] uppercase">No archived items found</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Myarchive;