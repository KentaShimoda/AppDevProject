import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { researchService } from "../../services/researchService";
import { bookmarkService } from "../../services/bookmarkService";

const Myarchive: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const [activeTab, setActiveTab] = useState<"uploads" | "bookmarks">("uploads");
  const [uploads, setUploads] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Logic from Dashboard: State to track bookmarked research IDs[cite: 10]
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Parallel fetch for personal inventory and saved items[cite: 10]
    Promise.all([
      researchService.getAll(),
      bookmarkService.getMyList()
    ]).then(([allStudies, savedList]) => {
      // Filter studies where current user is involved
      const myUploads = allStudies.filter((s: any) => 
        (s.coordinator?.email || "").toLowerCase() === currentUser.email?.toLowerCase() ||
        s.researchers?.some((r: any) => (r.email || r).toLowerCase() === currentUser.email?.toLowerCase())
      );
      
      setUploads(myUploads);
      setBookmarks(savedList || []);
      
      // Initialize the bookmark state for visual synchronization[cite: 10]
      const savedSet = new Set<number>(savedList.map((b: any) => b.id));
      setBookmarkedIds(savedSet);
      
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [currentUser.email]);

  // Synchronized Toggle Logic from Dashboard[cite: 10]
  const handleToggleBookmark = async (id: number) => {
    try {
      const result = await bookmarkService.toggle(id);
      setBookmarkedIds(prev => {
        const newSet = new Set(prev);
        if (result.isBookmarked) newSet.add(id);
        else {
            newSet.delete(id);
            // If in the bookmark tab, remove the item from local list immediately
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

  // Real-time Statistics derived from API data
  const stats = useMemo(() => ({
    totalUploads: uploads.length,
    totalViews: uploads.reduce((acc, s) => acc + (s.views || 0), 0),
    totalValidations: uploads.reduce((acc, s) => acc + (s.validations || 0), 0),
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
      <span className="text-meta-label animate-pulse">Synchronizing Personal Inventory...</span>
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
                <span className="text-meta-label uppercase">Personal Collection</span>
              </div>
              <h1 className="text-h1">My Research<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-orange to-red-600">Archive</span></h1>
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
                <span className="text-meta-label uppercase">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* 2. Tab Navigation with Functional Counts[cite: 10] */}
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

          {/* 3. Research Content Grid[cite: 10] */}
          {displayedItems.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
              {displayedItems.map((study) => (
                <div key={study.id} className="card-manuscript group">
                  <div className="absolute top-0 left-0 w-2 h-0 group-hover:h-full bg-primary-orange transition-all duration-700"></div>
                  
                  <div className="flex flex-col md:flex-row items-stretch gap-10">
                    <div className="w-full md:w-56 bg-ember-soft rounded-[2.5rem] flex flex-col items-center justify-center text-orange-200 group-hover:bg-primary-orange group-hover:text-white transition-all duration-700 shrink-0">
                      <i className="fa-solid fa-file-pdf text-7xl"></i>
                    </div>

                    <div className="flex-1 flex flex-col py-2">
                      <div className="flex justify-between items-start mb-6">
                        <span className={`text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest border ${activeTab === 'uploads' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-primary-orange border-orange-100'}`}>
                          {activeTab === 'uploads' ? study.status : 'Saved Content'}
                        </span>
                        
                        {/* Synchronized Bookmark Button matching Dashboard UI[cite: 10] */}
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

                      {/* Validations and Views */}
                      <div className="space-y-1 mb-8 border-l-2 border-orange-100 pl-4 text-xs font-bold text-gray-400">
                         <span><i className="fa-solid fa-eye mr-2"></i>{study.views || 0} Views</span>
                         <span className="ml-6"><i className="fa-solid fa-circle-check mr-2"></i>{study.validations || 0} Validations</span>
                      </div>

                      <div className="mt-auto pt-8 border-t border-orange-50 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-meta-label text-[9px] mb-1">{activeTab === 'uploads' ? 'Submission Date' : 'Archived On'}</span>
                          {/* Date and Validation Fix */}
                          <span className="text-data-value uppercase">
                            {new Date(study.dateBookmarked || study.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                        <button onClick={() => navigate(`/preview/${study.id}`)} className="btn-terminal-primary">Open Manuscript</button>
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