import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { researchService } from "../../services/researchService";
import { bookmarkService } from "../../services/bookmarkService"; // New import[cite: 10]

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [studies, setStudies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSort, setSelectedSort] = useState<string>("Recently Uploaded");
  
  // Pagination State[cite: 10]
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // State to track bookmarked research IDs for the current user[cite: 10]
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());

  const categoryRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const sortOptions = ["Trending", "Recently Uploaded", "Validated", "Oldest Upload"];

  useEffect(() => {
    // Parallel fetch for studies and user bookmarks
    Promise.all([
      researchService.getAll(),
      bookmarkService.getMyList()
    ]).then(([data, bookmarks]) => {
      const approved = Array.isArray(data) ? data.filter((s: any) => s.status === "Approved") : [];
      setStudies(approved);
      
      // Initialize the set of bookmarked IDs[cite: 10]
      const savedSet = new Set<number>(bookmarks.map((b: any) => b.id));
      setBookmarkedIds(savedSet);
      
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Handle the bookmark toggle action[cite: 10]
  const handleToggleBookmark = async (id: number) => {
    try {
      const result = await bookmarkService.toggle(id);
      setBookmarkedIds(prev => {
        const newSet = new Set(prev);
        if (result.isBookmarked) newSet.add(id);
        else newSet.delete(id);
        return newSet;
      });
    } catch (err) {
      console.error("Bookmark Error:", err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) setIsCategoryOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const trendingStudies = useMemo(() => {
    return [...studies]
      .sort((a, b) => ((b.views || 0) + (b.validations || 0)) - ((a.views || 0) + (a.validations || 0)))
      .slice(0, 4);
  }, [studies]);

  const uniqueTags = useMemo(() => {
    const tags = studies.flatMap(s => s.tags?.split(',') || []).map(t => t.trim());
    return Array.from(new Set(tags)).sort();
  }, [studies]);

  const displayedStudies = useMemo(() => {
    let result = [...studies];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.title.toLowerCase().includes(query) || 
        s.tags?.toLowerCase().includes(query) ||
        (s.coordinator?.name || s.coordinator || "").toLowerCase().includes(query) ||
        s.researchers?.some((r: any) => (r.name || r).toLowerCase().includes(query))
      );
    }
    if (selectedCategories.length > 0) {
      result = result.filter(s => selectedCategories.some(cat => s.tags?.includes(cat)));
    }
    result.sort((a, b) => {
      if (selectedSort === "Trending") return ((b.views || 0) + (b.validations || 0)) - ((a.views || 0) + (a.validations || 0));
      if (selectedSort === "Recently Uploaded") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });

    // Reset pagination to first page when filters change[cite: 10]
    return result;
  }, [studies, searchQuery, selectedCategories, selectedSort]);

  // Reset page logic[cite: 10]
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategories, selectedSort]);

  // Pagination Logic[cite: 10]
  const totalPages = Math.ceil(displayedStudies.length / itemsPerPage);
  const paginatedStudies = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return displayedStudies.slice(start, start + itemsPerPage);
  }, [displayedStudies, currentPage]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  return (
    <div className="flex min-h-screen bg-warm-white font-sans antialiased text-charcoal-black">
      <Sidebar />
      <main className="ml-20 flex-1 relative p-8 md:p-12">
        <div className="absolute top-0 right-0 w-1/2 h-screen bg-gradient-to-b from-orange-50/40 to-transparent -z-10 pointer-events-none"></div>
        
        <div className="max-w-[1600px] mx-auto">
          {/* Header */}
          <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
            <div className="space-y-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-1 bg-primary-orange"></div>
                <span className="text-meta-label">Digital Archive</span>
              </div>
              <h1 className="text-h1">Scholar<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-orange to-red-600">Archive</span></h1>
            </div>
            <div className="relative w-full lg:w-[450px]">
              <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-primary-orange"></i>
              <input type="text" placeholder="SEARCH TITLES, TAGS, OR AUTHORS..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input-terminal pl-14 py-5" />
            </div>
          </header>

          {/* 1. Trending Row */}
          {!loading && studies.length > 0 && !searchQuery && (
            <section className="mb-20">
              <h2 className="text-h2 tracking-tight mb-8 text-[11px] uppercase opacity-50">Trending Access</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {trendingStudies.map((study, idx) => (
                  <div key={study.id} onClick={() => navigate(`/preview/${study.id}`)} className="trending-card">
                    <div className="flex items-center justify-between mb-8">
                      <div className="w-10 h-10 rounded-xl bg-primary-orange/20 flex items-center justify-center text-primary-orange">
                        <i className="fa-solid fa-fire text-xs"></i>
                      </div>
                      <span className="text-[8px] font-black text-primary-orange uppercase tracking-widest">Rank {idx + 1}</span>
                    </div>
                    <h3 className="text-sm font-black text-white uppercase leading-tight mb-6 line-clamp-2">{study.title}</h3>
                    <div className="flex gap-4">
                      <span className="text-[10px] font-black text-white/40 uppercase"><i className="fa-solid fa-eye text-primary-orange mr-1.5"></i>{study.views} Views</span>
                      <span className="text-[10px] font-black text-white/40 uppercase"><i className="fa-solid fa-circle-check text-green-500 mr-1.5"></i>{study.validations || 0} Validations</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 2. Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-12">
            <div className="relative" ref={categoryRef}>
              <button onClick={() => setIsCategoryOpen(!isCategoryOpen)} className="bg-white px-8 py-4 rounded-2xl shadow-sm border border-orange-50 text-meta-label text-black hover:border-primary-orange transition-all">
                Filter Tags ({selectedCategories.length})
              </button>
              {isCategoryOpen && (
                <div className="absolute top-full left-0 mt-4 w-64 bg-white rounded-3xl shadow-2xl border border-orange-50 p-6 z-50">
                  <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {uniqueTags.map(tag => (
                      <label key={tag} className="flex items-center gap-3 p-2 hover:bg-ember-soft rounded-xl cursor-pointer">
                        <input type="checkbox" checked={selectedCategories.includes(tag)} onChange={() => toggleCategory(tag)} className="accent-primary-orange" />
                        <span className="text-data-value text-slate-500 uppercase">{tag}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Main Grid */}
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-primary-orange gap-4">
               <i className="fa-solid fa-circle-notch fa-spin text-4xl"></i>
               <span className="text-meta-label">Accessing Archive...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                {paginatedStudies.map((study) => (
                  <div key={study.id} className="card-manuscript group">
                    <div className="absolute top-0 left-0 w-2 h-0 group-hover:h-full bg-primary-orange transition-all duration-700"></div>

                    <div className="flex flex-col md:flex-row items-stretch gap-10">
                      <div className="w-full md:w-56 bg-orange-50/40 rounded-[2.5rem] flex flex-col items-center justify-center text-orange-100 group-hover:bg-primary-orange group-hover:text-white transition-all duration-700 shrink-0">
                        <i className="fa-solid fa-file-pdf text-7xl opacity-40 group-hover:opacity-100"></i>
                      </div>

                      <div className="flex-1 flex flex-col py-2">
                        <div className="flex justify-between items-start mb-6">
                          <span className="badge-verified">Verified Study</span>
                          
                          {/* BOOKMARK BUTTON[cite: 10] */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleToggleBookmark(study.id); }}
                            className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center border ${bookmarkedIds.has(study.id) ? 'bg-primary-orange text-white border-primary-orange shadow-lg' : 'bg-orange-50 text-orange-300 border-orange-100 hover:text-primary-orange'}`}
                          >
                            <i className={`${bookmarkedIds.has(study.id) ? 'fa-solid' : 'fa-regular'} fa-bookmark`}></i>
                          </button>
                        </div>

                        <h3 className="text-xl font-black mb-4 uppercase leading-tight text-charcoal-black group-hover:text-primary-orange transition-colors line-clamp-2">{study.title}</h3>

                        <div className="flex flex-wrap gap-2 mb-6">
                          {study.tags?.split(',').map((tag: string, i: number) => (
                            <span key={i} className="text-[9px] font-black text-primary-orange uppercase bg-orange-50 px-3 py-1 rounded-lg border border-orange-100">{tag.trim()}</span>
                          ))}
                        </div>

                        <div className="space-y-2 mb-8 border-l-2 border-orange-100 pl-4 text-xs font-bold text-gray-400">
                           <span><i className="fa-solid fa-eye mr-1.5"></i> {study.views} Views</span>
                           <span className="ml-4"><i className="fa-solid fa-circle-check mr-1.5"></i> {study.validations} Validations</span>
                        </div>

                        <div className="mt-auto pt-8 border-t border-orange-50 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-meta-label text-[9px] mb-1">Archived Date</span>
                            <span className="text-data-value">{new Date(study.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                          </div>
                          <button onClick={() => navigate(`/preview/${study.id}`)} className="btn-terminal-primary">View Archive</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls[cite: 10] */}
              {totalPages > 1 && (
                <div className="mt-16 flex items-center justify-center gap-4">
                  <button 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="w-12 h-12 rounded-xl border border-orange-100 flex items-center justify-center text-slate-400 hover:border-primary-orange hover:text-primary-orange disabled:opacity-20 transition-all"
                  >
                    <i className="fa-solid fa-chevron-left text-xs"></i>
                  </button>
                  <span className="text-meta-label font-black uppercase tracking-widest">Page {currentPage} / {totalPages}</span>
                  <button 
                    disabled={currentPage === totalPages} 
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="w-12 h-12 rounded-xl border border-orange-100 flex items-center justify-center text-slate-400 hover:border-primary-orange hover:text-primary-orange disabled:opacity-20 transition-all"
                  >
                    <i className="fa-solid fa-chevron-right text-xs"></i>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;