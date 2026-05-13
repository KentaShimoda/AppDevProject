import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { researchService } from "../../services/researchService";
import { bookmarkService } from "../../services/bookmarkService";
import { authService } from "../../services/authService";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// ─── Types (aligned with ResearchResponseDto) ────────────────────────────────
interface Researcher { name: string; email: string; }
interface Coordinator { name: string; email: string; }
interface HistoryEntry { version: number; versionName: string; feedback?: string; uploadedAt: string; }
interface ValidationEntry { facultyEmail: string; }

interface Study {
  id: number;
  title: string;
  tags: string;
  category?: string;
  coordinator: string;      // JSON string → Coordinator
  researchers: string;      // JSON string → Researcher[]
  views: number;
  validations: number;
  status: string;
  currentVersion: number;
  currentVersionName: string;
  latestFeedback?: string;
  createdAt: string;
  history: HistoryEntry[];
  validationLog: ValidationEntry[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const parseResearchers = (raw: string): Researcher[] => {
  try { return JSON.parse(raw) || []; } catch { return []; }
};
const parseCoordinator = (raw: string): Coordinator | null => {
  try { return JSON.parse(raw); } catch { return null; }
};

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Alert Popup ──────────────────────────────────────────────────────────────
interface AlertPopupProps { message: string; onClose: () => void; }
const AlertPopup: React.FC<AlertPopupProps> = ({ message, onClose }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center px-6 animate-in fade-in duration-200">
    <div className="absolute inset-0 bg-charcoal-black/70 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 border border-orange-100 animate-in zoom-in-95 duration-300">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-orange/10 mx-auto mb-5">
        <svg className="w-7 h-7 text-primary-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <p className="text-center text-charcoal-black font-bold text-base leading-snug mb-6">{message}</p>
      <button onClick={onClose} className="w-full py-3.5 rounded-xl bg-primary-orange text-white font-black text-sm uppercase tracking-widest hover:bg-primary-orange/90 active:scale-95 transition-all duration-150">
        Got it
      </button>
    </div>
  </div>
);

// ─── Trend Bar (monthly upload count sparkline) ───────────────────────────────
interface TrendBarProps { studies: Study[]; }
const TrendBar: React.FC<TrendBarProps> = ({ studies }) => {
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    studies.forEach(s => {
      const d = new Date(s.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      map[key] = (map[key] || 0) + 1;
    });
    // Last 6 months
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      return { label: MONTH_NAMES[d.getMonth()], count: map[key] || 0 };
    });
  }, [studies]);

  const max = Math.max(...counts.map(c => c.count), 1);

  return (
    <div className="flex items-end gap-2 h-12">
      {counts.map((c, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div
            className="w-full rounded-t-sm bg-primary-orange/30 group-hover:bg-primary-orange transition-all duration-500"
            style={{ height: `${Math.max((c.count / max) * 40, 3)}px` }}
          />
          <span className="text-[8px] font-black text-slate-400 uppercase">{c.label}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Study Card ───────────────────────────────────────────────────────────────
interface StudyCardProps {
  study: Study;
  isBookmarked: boolean;
  onBookmark: (id: number) => void;
  onView: (id: number) => void;
}

const StudyCard: React.FC<StudyCardProps> = ({ study, isBookmarked, onBookmark, onView }) => {
  const researchers = parseResearchers(study.researchers);
  const coordinator = parseCoordinator(study.coordinator);
  const tags = study.tags?.split(",").map(t => t.trim()).filter(Boolean) || [];

  // Abstract substitute: use tags as topic keywords in a readable sentence
  const abstractSnippet = tags.length > 0
    ? `This study covers topics in ${tags.slice(0, 3).join(", ")}${tags.length > 3 ? `, and ${tags.length - 3} more area${tags.length - 3 > 1 ? "s" : ""}` : ""}.`
    : "No abstract available.";

  return (
    <article className="card-manuscript group relative overflow-hidden flex flex-col md:flex-row gap-0 p-0 rounded-[2rem] border border-orange-100 bg-white shadow-sm hover:shadow-xl transition-all duration-500">
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 w-1 h-0 group-hover:h-full bg-primary-orange transition-all duration-700 rounded-l-[2rem] z-10" />

      {/* PDF Preview Panel — renders at exact container width, clipped by overflow-hidden */}
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
          <span className="badge-verified text-[9px] shrink-0">{study.status}</span>
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
              <i className="fa-solid fa-eye mr-1.5 text-primary-orange" />{study.views}
            </span>
            <span className="text-[10px] font-black uppercase text-slate-400">
              <i className="fa-solid fa-award mr-1.5 text-primary-orange" />{study.validations}
            </span>
            <span className="text-[10px] font-black uppercase text-slate-400">
              <i className="fa-solid fa-calendar mr-1.5 text-primary-orange" />
              {new Date(study.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
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

// ─── Trending Card ────────────────────────────────────────────────────────────
interface TrendingCardProps { study: Study; rank: number; onClick: () => void; }
const TrendingCard: React.FC<TrendingCardProps> = ({ study, rank, onClick }) => {
  const researchers = parseResearchers(study.researchers);
  const tags = study.tags?.split(",").map(t => t.trim()).filter(Boolean) || [];

  return (
    <div
      onClick={onClick}
      className="trending-card group overflow-hidden relative cursor-pointer flex flex-col"
    >
      {/* Background PDF Preview */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-start justify-center pt-2">
        <div style={{ transform: "scale(0.38)", transformOrigin: "top center", width: "340px", opacity: 0.18, filter: "grayscale(1)" }}
          className="group-hover:opacity-35 group-hover:filter-none transition-all duration-700">
          <Document file={researchService.getViewUrl(study.id)} loading={null} error={null}>
            <Page pageNumber={1} width={340} renderTextLayer={false} renderAnnotationLayer={false} />
          </Document>
        </div>
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-5">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <i className="fa-solid fa-fire-flame-curved text-primary-orange text-sm" />
          </div>
          <span className="text-[8px] font-black text-primary-orange/80 uppercase tracking-widest bg-white/10 px-2 py-1 rounded-lg">
            #{rank}
          </span>
        </div>

        <h3 className="text-sm font-black text-white uppercase leading-tight mb-3 line-clamp-2 flex-1">
          {study.title}
        </h3>

        {/* Authors on trending card */}
        {researchers.length > 0 && (
          <p className="text-[9px] text-white/50 mb-3 line-clamp-1">
            {researchers.map(r => r.name).join(", ")}
          </p>
        )}

        {/* Tag pills */}
        <div className="flex flex-wrap gap-1 mb-4">
          {tags.slice(0, 2).map((t, i) => (
            <span key={i} className="text-[8px] font-black text-primary-orange/80 bg-white/10 px-2 py-0.5 rounded-md uppercase">{t}</span>
          ))}
        </div>

        <div className="flex gap-4 border-t border-white/10 pt-3">
          <span className="text-[10px] font-black text-white/60 uppercase">
            <i className="fa-solid fa-eye text-primary-orange mr-1.5" />{study.views}
          </span>
          <span className="text-[10px] font-black text-white/60 uppercase">
            <i className="fa-solid fa-star text-yellow-400 mr-1.5" />{study.validations}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSort, setSelectedSort] = useState<string>("Recently Uploaded");
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // ── Interest-based section ──
  const [userInterest, setUserInterest] = useState<string | null>(null);
  const [interestStudies, setInterestStudies] = useState<Study[]>([]);

  // ── Category filter dropdown ──
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<string[]>([]);

  const categoryRef = useRef<HTMLDivElement>(null);
  const categoryFilterRef = useRef<HTMLDivElement>(null);
  const sortOptions = ["Interest Match", "Recently Uploaded", "Most Validated", "Oldest Upload"];

  useEffect(() => {
    const token = localStorage.getItem("token") ?? sessionStorage.getItem("token") ?? "";
    Promise.all([
      researchService.getAll(),
      bookmarkService.getMyList(),
      token ? authService.getInterest(token).catch(() => null) : Promise.resolve(null),
    ])
      .then(([data, bookmarks, interestResult]) => {
        const approved: Study[] = Array.isArray(data)
          ? (data as any[]).filter((s: any) => s.status === "Approved") as Study[]
          : [];
        setStudies(approved);
        const savedSet = new Set<number>(bookmarks.map((b: any) => b.researchId || b.id));
        setBookmarkedIds(savedSet);

        if (interestResult?.researchInterest) {
          const interest = interestResult.researchInterest;
          setUserInterest(interest);
          // Match studies by category OR tags containing the interest keyword
          const matched = approved.filter(s => {
            const cat = s.category?.toLowerCase() ?? "";
            const tags = s.tags?.toLowerCase() ?? "";
            const kw = interest.toLowerCase();
            return cat.includes(kw) || tags.includes(kw);
          });
          setInterestStudies(
            matched.length >= 2
              ? matched.sort((a, b) => (b.views + b.validations) - (a.views + a.validations)).slice(0, 4)
              : approved.sort((a, b) => (b.views + b.validations) - (a.views + a.validations)).slice(0, 4)
          );
        } else {
          // No interest set — show top viewed as fallback
          setInterestStudies(
            approved.sort((a, b) => (b.views + b.validations) - (a.views + a.validations)).slice(0, 4)
          );
        }
      })
      .catch(() => setError("Failed to load the archive. Please refresh and try again."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node))
        setIsCategoryOpen(false);
      if (categoryFilterRef.current && !categoryFilterRef.current.contains(e.target as Node))
        setIsCategoryFilterOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const uniqueTags = useMemo(() => {
    const tags = studies.flatMap(s => s.tags?.split(",") || []).map(t => t.trim()).filter(Boolean);
    return Array.from(new Set(tags)).sort();
  }, [studies]);

  const uniqueCategories = useMemo(() => {
    const cats = studies.map(s => s.category).filter((c): c is string => !!c?.trim());
    return Array.from(new Set(cats)).sort();
  }, [studies]);

  const displayedStudies = useMemo(() => {
    let result = [...studies];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.tags?.toLowerCase().includes(q) ||
        s.researchers?.toLowerCase().includes(q)
      );
    }
    if (selectedCategories.length > 0) {
      result = result.filter(s => selectedCategories.some(cat => s.tags?.includes(cat)));
    }
    if (selectedCategoryFilters.length > 0) {
      result = result.filter(s => selectedCategoryFilters.some(cat => s.category === cat));
    }
    result.sort((a, b) => {
      if (selectedSort === "Interest Match") {
        // Sort by how well the study matches user interest, then by engagement
        if (userInterest) {
          const kw = userInterest.toLowerCase();
          const scoreA = (a.category?.toLowerCase().includes(kw) ? 2 : 0) + (a.tags?.toLowerCase().includes(kw) ? 1 : 0);
          const scoreB = (b.category?.toLowerCase().includes(kw) ? 2 : 0) + (b.tags?.toLowerCase().includes(kw) ? 1 : 0);
          if (scoreB !== scoreA) return scoreB - scoreA;
        }
        return (b.views + b.validations) - (a.views + a.validations);
      }
      if (selectedSort === "Recently Uploaded") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (selectedSort === "Most Validated") return b.validations - a.validations;
      if (selectedSort === "Oldest Upload") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return 0;
    });
    return result;
  }, [studies, searchQuery, selectedCategories, selectedCategoryFilters, selectedSort, userInterest]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedCategories, selectedCategoryFilters, selectedSort]);

  const totalPages = Math.ceil(displayedStudies.length / itemsPerPage);
  const paginatedStudies = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return displayedStudies.slice(start, start + itemsPerPage);
  }, [displayedStudies, currentPage]);

  const handleToggleBookmark = async (id: number) => {
    try {
      const result = await bookmarkService.toggle(id);
      setBookmarkedIds(prev => {
        const next = new Set(prev);
        result.isBookmarked ? next.add(id) : next.delete(id);
        return next;
      });
    } catch {
      setError("Could not update bookmark. Please try again.");
    }
  };

  const toggleCategory = (cat: string) =>
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  const toggleCategoryFilter = (cat: string) =>
    setSelectedCategoryFilters(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  return (
    <>
      {error && <AlertPopup message={error} onClose={() => setError(null)} />}

      <div className="flex min-h-screen bg-warm-white font-sans antialiased text-charcoal-black">
        <Sidebar />
        <main className="ml-20 flex-1 relative p-8 md:p-12">
          <div className="absolute top-0 right-0 w-1/2 h-screen bg-gradient-to-b from-orange-50/40 to-transparent -z-10 pointer-events-none" />

          <div className="max-w-[1600px] mx-auto">

            {/* ── Header ── */}
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
              <div className="space-y-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-1 bg-primary-orange" />
                  <span className="text-meta-label uppercase tracking-[0.3em]">Scholar Repository</span>
                </div>
                <h1 className="text-h1">
                  Archive<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-orange to-red-600">Terminal</span>
                </h1>
              </div>
              <div className="relative w-full lg:w-[450px]">
                <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-primary-orange" />
                <input
                  type="text"
                  placeholder="SEARCH TITLES, TAGS OR AUTHORS..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="input-terminal pl-14 py-5"
                />
              </div>
            </header>

            {/* ── For You / Interest-Based Section ── */}
            {!loading && studies.length > 0 && !searchQuery && (
              <section className="mb-20">
                <div className="flex items-end justify-between mb-8">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary-orange mb-1">
                      {userInterest ? `Based on your interest` : "Top Manuscripts"}
                    </p>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-charcoal-black">
                      {userInterest
                        ? <>For You — <span className="text-primary-orange">{userInterest}</span></>
                        : "Top Picks for You"
                      }
                    </h2>
                    {userInterest && (
                      <p className="text-[10px] text-slate-400 font-semibold mt-1 uppercase tracking-widest">
                        Manuscripts matching your research interest
                      </p>
                    )}
                  </div>
                  {/* Mini monthly upload trend chart */}
                  <div className="hidden lg:block w-48">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Monthly Uploads
                    </p>
                    <TrendBar studies={studies} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {interestStudies.map((study, idx) => (
                    <TrendingCard
                      key={study.id}
                      study={study}
                      rank={idx + 1}
                      onClick={() => navigate(`/preview/${study.id}`)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Filters Row ── */}
            <div className="flex flex-wrap items-center gap-3 mb-10" ref={categoryRef}>
              {/* Sort buttons */}
              <div className="flex flex-wrap gap-2">
                {sortOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setSelectedSort(opt)}
                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-200 ${
                      selectedSort === opt
                        ? "bg-primary-orange text-white border-primary-orange shadow"
                        : "bg-white text-slate-500 border-orange-100 hover:border-primary-orange hover:text-primary-orange"
                    }`}
                  >
                    {opt === "Interest Match" && userInterest ? (
                      <span className="flex items-center gap-1.5">
                        <i className="fa-solid fa-star text-[9px]" />
                        Interest Match
                      </span>
                    ) : opt}
                  </button>
                ))}
              </div>

              {/* Category filter */}
              <div className="relative ml-auto" ref={categoryFilterRef}>
                <button
                  onClick={() => { setIsCategoryFilterOpen(!isCategoryFilterOpen); setIsCategoryOpen(false); }}
                  className="bg-white px-6 py-2.5 rounded-xl shadow-sm border border-orange-100 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-primary-orange hover:text-primary-orange transition-all flex items-center gap-2"
                >
                  <i className="fa-solid fa-layer-group text-primary-orange" />
                  Category {selectedCategoryFilters.length > 0 && <span className="bg-primary-orange text-white rounded-full w-5 h-5 flex items-center justify-center text-[9px]">{selectedCategoryFilters.length}</span>}
                </button>
                {isCategoryFilterOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-orange-50 p-5 z-50">
                    {selectedCategoryFilters.length > 0 && (
                      <button
                        onClick={() => setSelectedCategoryFilters([])}
                        className="text-[9px] font-black uppercase text-primary-orange mb-3 hover:underline"
                      >
                        Clear all
                      </button>
                    )}
                    {uniqueCategories.length === 0 ? (
                      <p className="text-[10px] text-slate-400 font-semibold uppercase text-center py-2">No categories found</p>
                    ) : (
                      <div className="max-h-60 overflow-y-auto pr-1 space-y-0.5 custom-scrollbar">
                        {uniqueCategories.map(cat => (
                          <label key={cat} className="flex items-center gap-3 p-2 hover:bg-ember-soft rounded-xl cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedCategoryFilters.includes(cat)}
                              onChange={() => toggleCategoryFilter(cat)}
                              className="accent-primary-orange"
                            />
                            <span className="text-[10px] font-semibold text-slate-500 uppercase">{cat}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tag filter */}
              <div className="relative">
                <button
                  onClick={() => { setIsCategoryOpen(!isCategoryOpen); setIsCategoryFilterOpen(false); }}
                  className="bg-white px-6 py-2.5 rounded-xl shadow-sm border border-orange-100 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-primary-orange hover:text-primary-orange transition-all flex items-center gap-2"
                >
                  <i className="fa-solid fa-tags text-primary-orange" />
                  Tags {selectedCategories.length > 0 && <span className="bg-primary-orange text-white rounded-full w-5 h-5 flex items-center justify-center text-[9px]">{selectedCategories.length}</span>}
                </button>
                {isCategoryOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-orange-50 p-5 z-50">
                    {selectedCategories.length > 0 && (
                      <button
                        onClick={() => setSelectedCategories([])}
                        className="text-[9px] font-black uppercase text-primary-orange mb-3 hover:underline"
                      >
                        Clear all
                      </button>
                    )}
                    <div className="max-h-60 overflow-y-auto pr-1 space-y-0.5 custom-scrollbar">
                      {uniqueTags.map(tag => (
                        <label key={tag} className="flex items-center gap-3 p-2 hover:bg-ember-soft rounded-xl cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(tag)}
                            onChange={() => toggleCategory(tag)}
                            className="accent-primary-orange"
                          />
                          <span className="text-[10px] font-semibold text-slate-500 uppercase">{tag}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Results count */}
            {!loading && (
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">
                {displayedStudies.length} manuscript{displayedStudies.length !== 1 ? "s" : ""} found
              </p>
            )}

            {/* ── Main Grid ── */}
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center text-primary-orange gap-4">
                <i className="fa-solid fa-dna fa-spin text-4xl" />
                <span className="text-meta-label uppercase tracking-widest">Accessing Node...</span>
              </div>
            ) : paginatedStudies.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center gap-3 text-slate-400">
                <i className="fa-solid fa-folder-open text-4xl" />
                <p className="text-sm font-black uppercase tracking-widest">No manuscripts found</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {paginatedStudies.map(study => (
                    <StudyCard
                      key={study.id}
                      study={study}
                      isBookmarked={bookmarkedIds.has(study.id)}
                      onBookmark={handleToggleBookmark}
                      onView={(id) => navigate(`/preview/${id}`)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-16 flex items-center justify-center gap-3">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                      className="w-11 h-11 rounded-xl border border-orange-100 flex items-center justify-center text-slate-400 hover:border-primary-orange hover:text-primary-orange disabled:opacity-20 transition-all"
                    >
                      <i className="fa-solid fa-chevron-left text-xs" />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .reduce<(number | "…")[]>((acc, p, i, arr) => {
                        if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === "…" ? (
                          <span key={`dots-${i}`} className="text-slate-300 font-black text-sm px-1">…</span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => setCurrentPage(p as number)}
                            className={`w-11 h-11 rounded-xl text-sm font-black uppercase transition-all ${
                              currentPage === p
                                ? "bg-primary-orange text-white shadow-md"
                                : "border border-orange-100 text-slate-400 hover:border-primary-orange hover:text-primary-orange"
                            }`}
                          >
                            {p}
                          </button>
                        )
                      )}

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => p + 1)}
                      className="w-11 h-11 rounded-xl border border-orange-100 flex items-center justify-center text-slate-400 hover:border-primary-orange hover:text-primary-orange disabled:opacity-20 transition-all"
                    >
                      <i className="fa-solid fa-chevron-right text-xs" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default Dashboard;