import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { researchService } from "../../services/researchService";
import { Document, Page, pdfjs } from 'react-pdf';

// 🚀 PDF Worker Initialization for manuscript thumbnails
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// ─── Types & Helpers ─────────────────────────────────────────────────────────
interface Researcher { name: string; email: string; }
interface Coordinator { name: string; email: string; }

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

// ─── Main Component ──────────────────────────────────────────────────────────
const Profile: React.FC = () => {
  const navigate = useNavigate();
  
  // Extract user identity from local storage
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  
  const [stats, setStats] = useState({ totalViews: 0, totalValidations: 0, studyCount: 0 });
  const [featuredStudy, setFeaturedStudy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Stability fix for JSONB and raw strings
  const safeParse = (data: any, fallback: any) => {
    if (!data) return fallback;
    if (typeof data === 'string' && data.trim().length > 0) {
      try { return JSON.parse(data); } catch { return fallback; }
    }
    return (Array.isArray(data) || typeof data === 'object') ? data : fallback;
  };

  const fetchProfileData = useCallback(() => {
    setLoading(true);
    // Fetch registry and filter for personal involvement
    researchService.getAll()
      .then((allStudies: any[]) => {
        const myStudies = allStudies.filter((s: any) => {
          const coord = safeParse(s.coordinator, {});
          const resList = safeParse(s.researchers, []);
          
          const isCoord = (coord?.email || "").toLowerCase() === currentUser.email?.toLowerCase();
          const isResearcher = resList?.some((r: any) => 
            (r.email || r || "").toLowerCase() === (currentUser.email || "").toLowerCase()
          );
          return isCoord || isResearcher;
        });

        const totalViews = myStudies.reduce((acc: number, s: any) => acc + (Number(s.views) || 0), 0);
        const totalValidations = myStudies.reduce((acc: number, s: any) => acc + (Number(s.validations) || 0), 0);

        // Identify the manuscript with the highest reach
        const topStudy = myStudies.length > 0 
          ? [...myStudies].sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0))[0] 
          : null;

        setStats({ 
            totalViews, 
            totalValidations, 
            studyCount: myStudies.length 
        });
        setFeaturedStudy(topStudy);
        setLoading(false);
      })
      .catch(err => {
        console.error("Profile Synchronization Error:", err);
        setLoading(false);
      });
  }, [currentUser.email]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // Pre-compute user display name with honorific if available
  const honorific = currentUser.honorific ? `${currentUser.honorific} ` : "";
  const fullName = currentUser.fullName || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || "Unknown User";
  const displayName = `${honorific}${fullName}`;

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-warm-white">
      <span className="text-meta-label animate-pulse uppercase tracking-[0.3em]">Accessing Personal Archive...</span>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-warm-white font-sans antialiased text-charcoal-black">
      <Sidebar />
      <main className="ml-20 flex-1 relative">
        
        {/* Solid Brand Banner */}
        <div className="h-64 w-full bg-charcoal-black border-b border-primary-orange" />
        
        <div className="px-8 md:px-12 -mt-32 relative z-10 pb-20 max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
            
            {/* 1. Account Info Card */}
            <div className="xl:col-span-4 space-y-6">
              <div className="bg-white p-10 rounded-manuscript shadow-2xl border border-orange-100 flex flex-col items-center">
                <div className="w-40 h-40 bg-ember-soft rounded-[2.5rem] border-4 border-white shadow-xl mb-8 flex items-center justify-center relative overflow-hidden">
                   <i className="fa-solid fa-user-shield text-7xl text-orange-200"></i>
                </div>

                <h1 className="text-2xl lg:text-3xl font-black tracking-tight uppercase text-black leading-none mb-3 text-center">
                  {displayName}
                </h1> 
                <span className="badge-verified mb-4 bg-orange-50 text-primary-orange border-orange-100">{currentUser.userType}</span> 
                <p className="text-meta-label tracking-wide lowercase mb-8">{currentUser.email}</p> 
                
                <div className="w-full pt-10 border-t border-orange-50 space-y-8 text-left">
                  <div className="flex justify-between items-center bg-ember-soft p-4 rounded-2xl border border-orange-100">
                    <span className="text-meta-label uppercase text-[9px]">Archive Reference</span> 
                    <p className="text-data-value">#{currentUser.id || "N/A"}</p> 
                  </div>

                  <div className="flex justify-between items-center px-2">
                    <span className="text-meta-label uppercase text-[9px]">Birth Date</span> 
                    <p className="text-data-value normal-case">
                        {currentUser.birthDate ? new Date(currentUser.birthDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "Not Recorded"}
                    </p> 
                  </div>

                  <div className="flex justify-between items-center px-2">
                    <span className="text-meta-label uppercase text-[9px]">Institutional Affiliation</span> 
                    <p className="text-data-value normal-case">{currentUser.organization || "Independent Researcher"}</p> 
                  </div>

                  <button onClick={handleLogout} className="btn-terminal-primary w-full mt-4 bg-charcoal-black hover:bg-primary-orange text-white py-5 rounded-2xl font-black uppercase tracking-widest transition-all">Secure Logout</button>
                </div>
              </div>
            </div>

            {/* 2. Research Metrics & Top Study */}
            <div className="xl:col-span-8 space-y-10">
              
              {/* Metrics Grid (Matched with Myarchive) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Total Reach", val: stats.totalViews, icon: "fa-eye", color: "text-primary-orange" },
                  { label: "Validations", val: stats.totalValidations, icon: "fa-circle-check", color: "text-green-600" },
                  { label: "Submissions", val: stats.studyCount, icon: "fa-file-arrow-up", color: "text-black" }
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-8 rounded-terminal border border-orange-50 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                    <i className={`fa-solid ${stat.icon} absolute -right-4 -bottom-4 text-6xl opacity-5 group-hover:scale-110 transition-transform`}></i>
                    <span className={`text-4xl font-black ${stat.color} tracking-tighter mb-1`}>{stat.val}</span>
                    <span className="text-meta-label uppercase tracking-widest text-[9px]">{stat.label}</span>
                  </div>
                ))}
              </div>

              {/* Top Performing Study Section (Matched with Dashboard StudyCard) */}
              <div className="space-y-8">
                <div className="flex items-center gap-6">
                   <h2 className="text-h2 text-[12px] tracking-widest uppercase font-black">Top Performing Manuscript</h2> 
                   <div className="flex-1 h-px bg-orange-100"></div>
                </div>

                {featuredStudy ? (
                  <article className="card-manuscript group relative overflow-hidden flex flex-col md:flex-row gap-0 p-0 rounded-[2rem] border border-orange-100 bg-white shadow-sm hover:shadow-xl transition-all duration-500">
                    {/* Left accent bar */}
                    <div className="absolute left-0 top-0 w-1 h-0 group-hover:h-full bg-primary-orange transition-all duration-700 rounded-l-[2rem] z-10" />

                    {/* PDF Preview Panel */}
                    <div className="relative w-full md:w-48 shrink-0 bg-gradient-to-br from-orange-50 to-amber-50/60 overflow-hidden rounded-t-[2rem] md:rounded-l-[2rem] md:rounded-tr-none border-b md:border-b-0 md:border-r border-orange-100 min-h-[200px] md:min-h-0">
                      <div
                        style={{ pointerEvents: "none", lineHeight: 0, display: "block" }}
                        className="opacity-60 group-hover:opacity-90 transition-opacity duration-500"
                      >
                        <Document file={researchService.getViewUrl(featuredStudy.id)} loading={null} error={null}>
                          <Page pageNumber={1} width={192} renderTextLayer={false} renderAnnotationLayer={false} />
                        </Document>
                      </div>
                      {/* Bottom fade */}
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-amber-50 to-transparent pointer-events-none" />
                      <i className="fa-solid fa-file-pdf absolute bottom-3 right-3 text-primary-orange/60 group-hover:text-primary-orange text-base transition-colors" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col p-6 md:p-7 min-w-0">
                      {/* Top row: badge */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <span className="bg-green-50 text-green-600 border-green-100 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shrink-0">
                          Top Iteration
                        </span>
                      </div>

                      {/* Title */}
                      <h3
                        className="text-base font-black uppercase leading-tight text-charcoal-black group-hover:text-primary-orange transition-colors line-clamp-2 mb-3 cursor-pointer"
                        onClick={() => navigate(`/preview/${featuredStudy.id}`)}
                      >
                        {featuredStudy.title}
                      </h3>

                      {/* Abstract snippet */}
                      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mb-4">
                        {featuredStudy.tags?.split(",").length > 0 
                          ? `This study covers topics in ${featuredStudy.tags.split(",").slice(0, 3).join(", ")}.`
                          : "No abstract available."}
                      </p>

                      {/* Authors */}
                      <div className="mb-4">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary-orange mb-1.5 block">Authors</span>
                        <div className="flex flex-wrap gap-1.5">
                          {parseResearchers(featuredStudy.researchers).map((r, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                              <i className="fa-solid fa-user-pen text-[8px] text-primary-orange" />
                              {r.name}
                            </span>
                          ))}
                          {parseCoordinator(featuredStudy.coordinator) && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg">
                              <i className="fa-solid fa-chalkboard-user text-[8px] text-amber-500" />
                              {parseCoordinator(featuredStudy.coordinator)?.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tags */}
                      {featuredStudy.tags && (
                        <div className="flex flex-wrap gap-1.5 mb-5">
                          {featuredStudy.tags.split(",").slice(0, 5).map((tag: string, i: number) => (
                            <span key={i} className="text-[9px] font-black text-primary-orange uppercase bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100">
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="mt-auto pt-4 border-t border-orange-50 flex items-center justify-between gap-4">
                        <div className="flex gap-4">
                          <span className="text-[10px] font-black uppercase text-slate-400">
                            <i className="fa-solid fa-eye mr-1.5 text-primary-orange" />{featuredStudy.views || 0}
                          </span>
                          <span className="text-[10px] font-black uppercase text-slate-400">
                            <i className="fa-solid fa-award mr-1.5 text-primary-orange" />{featuredStudy.validations || 0}
                          </span>
                          <span className="text-[10px] font-black uppercase text-slate-400">
                            <i className="fa-solid fa-calendar mr-1.5 text-primary-orange" />
                            {new Date(featuredStudy.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                          </span>
                        </div>
                        <button
                          onClick={() => navigate(`/preview/${featuredStudy.id}`)}
                          className="btn-terminal-primary text-[10px] py-2.5 px-5 shrink-0"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </article>
                ) : (
                  <div className="py-20 bg-white rounded-manuscript border-2 border-dashed border-orange-50 flex flex-col items-center justify-center opacity-40">
                    <i className="fa-solid fa-folder-open text-5xl mb-4 text-orange-100"></i>
                    <p className="text-meta-label uppercase tracking-widest">No entries currently archived.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;