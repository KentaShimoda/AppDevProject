import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { researchService } from "../../services/researchService";
import { API_BASE_URL } from "../../services/apiConfig";
import { Document, Page, pdfjs } from 'react-pdf';

// 🚀 PDF Worker Initialization for manuscript thumbnails
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const Coordinator: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [studies, setStudies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Pending Review");
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [evaluatingStudy, setEvalStudy] = useState<any | null>(null);
  const [feedback, setFeedback] = useState("");
  
  // PDF Preview State for Validation Modal
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  // 🚀 Protocol: Stability fix for JSONB and raw strings
  const safeParse = (data: any, fallback: any) => {
    if (!data) return fallback;
    if (typeof data === 'string' && data.trim().length > 0) {
      try { return JSON.parse(data); } catch { return fallback; }
    }
    return (Array.isArray(data) || typeof data === 'object') ? data : fallback;
  };

  const fetchStudies = useCallback(() => {
    setLoading(true);
    researchService.getAll()
      .then(data => {
        // FILTER: Only show studies where the current user is the listed coordinator
        const filtered = data.filter((s: any) => {
          const coord = safeParse(s.coordinator, {});
          return (coord?.email || "").toLowerCase() === currentUser.email?.toLowerCase();
        });
        setStudies(filtered);
        setLoading(false);
      })
      .catch(err => {
        console.error("Synchronization Error:", err);
        setLoading(false);
      });
  }, [currentUser.email]);

  useEffect(() => { fetchStudies(); }, [fetchStudies]);

  // Keyboard navigation for PDF modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!evaluatingStudy) return;
      if (e.key === "ArrowRight") setPageNumber(p => Math.min(p + 1, numPages || p));
      if (e.key === "ArrowLeft") setPageNumber(p => Math.max(p - 1, 1));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [numPages, evaluatingStudy]);

  // Folder Grouping Logic: Groups versions by Title
  const groupedStudies = useMemo(() => {
    const tabFiltered = studies.filter(s => s.status === activeTab);
    const groups: { [key: string]: any } = {};

    tabFiltered.forEach(s => {
      if (!groups[s.title]) {
        groups[s.title] = { ...s, versions: [] };
      }
      groups[s.title].versions.push(s);
    });

    return Object.values(groups);
  }, [studies, activeTab]);

  const stats = useMemo(() => ({
    pending: studies.filter(s => s.status === "Pending Review").length,
    revision: studies.filter(s => s.status === "Revision Requested").length,
    approved: studies.filter(s => s.status === "Approved").length
  }), [studies]);

  const totalPages = Math.ceil(groupedStudies.length / itemsPerPage);
  const paginatedGroups = groupedStudies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const openEvaluateModal = (study: any) => {
    setEvalStudy(study);
    setFeedback("");
    setPageNumber(1);
    setScale(1.0);
    setNumPages(null);
  };

  const handleEvaluate = async (status: string) => {
    if (!evaluatingStudy) return;
    const token = localStorage.getItem("token");
    
    const res = await fetch(`${API_BASE_URL}/Research/${evaluatingStudy.id}/evaluate`, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify({ status, feedback })
    });

    if (res.ok) {
      setEvalStudy(null);
      setFeedback("");
      fetchStudies();
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-warm-white">
      <span className="text-meta-label animate-pulse uppercase tracking-widest text-primary-orange">Synchronizing Faculty Terminal...</span>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-warm-white font-sans antialiased text-charcoal-black">
      <Sidebar />
      <main className="ml-20 flex-1 relative p-8 md:p-12">
        <div className="absolute top-0 right-0 w-1/2 h-screen bg-orange-50/20 -z-10 pointer-events-none border-l border-orange-100/50"></div>

        <div className="max-w-[1600px] mx-auto">
          {/* Header with Stats Grid */}
          <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
            <div className="space-y-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-1 bg-primary-orange"></div>
                <span className="text-meta-label uppercase tracking-widest text-[10px]">Oversight Portal</span>
              </div>
              <h1 className="text-h1 uppercase">Review<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-orange to-red-600">Terminal</span></h1>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {[
                 { label: "Pending Review", val: stats.pending, icon: "fa-clock", color: "text-primary-orange" },
                 { label: "Revision Mode", val: stats.revision, icon: "fa-rotate-left", color: "text-verified-red" },
                 { label: "Approved Registry", val: stats.approved, icon: "fa-circle-check", color: "text-green-600" }
               ].map((box, i) => (
                 <div key={i} className="bg-white p-6 rounded-terminal border border-orange-50 shadow-sm flex flex-col min-w-[180px] group relative overflow-hidden">
                    <i className={`fa-solid ${box.icon} absolute -right-2 -bottom-2 text-4xl opacity-5`}></i>
                    <span className={`text-3xl font-black ${box.color} tracking-tighter mb-1`}>{box.val}</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{box.label}</span>
                 </div>
               ))}
            </div>
          </header>

          <div className="flex gap-10 mb-12 border-b border-orange-100">
             {['Pending Review', 'Revision Requested', 'Approved'].map((tab) => (
               <button 
                 key={tab} 
                 onClick={() => { setActiveTab(tab); setCurrentPage(1); }} 
                 className={`pb-6 text-[11px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab ? "text-primary-orange" : "text-slate-300 hover:text-black"}`}
               >
                 {tab}
                 {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary-orange"></div>}
               </button>
             ))}
          </div>

          {/* Folder Grid with PDF Previews - Matched Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {paginatedGroups.map((study: any) => {
              const resList = safeParse(study.researchers, []);
              const leadAuthor = resList?.[0]?.name || resList?.[0] || "Unknown";
              
              return (
                <article key={study.id} className="card-manuscript group relative overflow-hidden flex flex-col md:flex-row gap-0 p-0 rounded-[2rem] border border-orange-100 bg-white shadow-sm hover:shadow-xl transition-all duration-500">
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
                    {/* Bottom fade */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-amber-50 to-transparent pointer-events-none" />
                    <i className="fa-solid fa-file-pdf absolute bottom-3 right-3 text-primary-orange/60 group-hover:text-primary-orange text-base transition-colors" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col p-6 md:p-7 min-w-0">
                    {/* Top row: badge + build info */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shrink-0 ${
                        study.status === 'Approved' ? 'bg-green-50 text-green-600 border-green-100' :
                        study.status === 'Revision Requested' ? 'bg-red-50 text-verified-red border-red-100' :
                        'bg-orange-50 text-primary-orange border-orange-100'
                      }`}>
                        {study.status}
                      </span>
                      <span className="text-[10px] font-black text-orange-300 uppercase tracking-widest">
                        Contains {study.versions?.length || 1} Build(s)
                      </span>
                    </div>

                    {/* Title */}
                    <h3
                      className="text-base font-black uppercase leading-tight text-charcoal-black group-hover:text-primary-orange transition-colors line-clamp-2 mb-4 cursor-pointer"
                      onClick={() => navigate(`/preview/${study.id}`)}
                    >
                      {study.title}
                    </h3>

                    {/* Authors & Version */}
                    <div className="mb-4 space-y-2">
                      <p className="text-[11px] font-bold text-slate-500 flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary-orange">Lead Author:</span>
                        {leadAuthor}
                      </p>
                      <p className="text-[11px] font-bold text-slate-500 flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary-orange">Active Iteration:</span>
                        <span className="text-primary-orange uppercase">v{study.version || 1}.0</span>
                      </p>
                    </div>

                    {/* Tags */}
                    {study.tags && (
                      <div className="flex flex-wrap gap-1.5 mb-5">
                        {study.tags.split(",").slice(0, 4).map((tag: string, i: number) => (
                          <span key={i} className="text-[9px] font-black text-primary-orange uppercase bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer buttons */}
                    <div className="mt-auto pt-4 border-t border-orange-50 flex gap-3">
                      {activeTab !== 'Approved' && (
                        <button onClick={() => openEvaluateModal(study)} className="btn-terminal-primary flex-1 py-3 text-[10px] uppercase font-black rounded-xl">
                          Validate Build
                        </button>
                      )}
                      <button onClick={() => navigate(`/preview/${study.id}`)} className="bg-white border-2 border-charcoal-black text-charcoal-black px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-charcoal-black hover:text-white transition-all flex-1 text-center">
                        Inspect Code
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {groupedStudies.length === 0 && (
            <div className="py-24 bg-white rounded-manuscript border-4 border-dashed border-orange-50 flex flex-col items-center justify-center opacity-40">
               <i className="fa-solid fa-inbox text-6xl text-orange-100 mb-4"></i>
               <span className="text-meta-label tracking-widest uppercase">Registry queue is currently empty</span>
            </div>
          )}
        </div>
      </main>

      {/* Side-by-Side Evaluation Modal */}
      {evaluatingStudy && (
        <div className="fixed inset-0 z-[200] bg-charcoal-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-[95vw] lg:max-w-7xl h-[90vh] flex flex-col lg:flex-row overflow-hidden border border-orange-100">
            
            {/* Left Column: PDF Preview */}
            <div className="flex-1 bg-ember-soft p-6 flex flex-col items-center overflow-hidden relative border-b lg:border-b-0 lg:border-r border-orange-100">
              <div className="h-full w-full bg-white rounded-[2.5rem] shadow-xl border border-orange-50 flex flex-col overflow-hidden relative group">
                
                {/* PDF Controls Overlay */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-charcoal-black/90 backdrop-blur-xl px-8 py-3 rounded-2xl border border-white/10 shadow-2xl z-20 opacity-0 group-hover:opacity-100 transition-all duration-500">
                   <div className="flex items-center gap-3 border-r border-white/10 pr-6">
                      <button onClick={() => setScale(s => Math.max(s - 0.2, 0.5))} className="text-white/40 hover:text-primary-orange"><i className="fa-solid fa-minus"></i></button>
                      <span className="text-[10px] font-black text-white w-10 text-center">{Math.round(scale * 100)}%</span>
                      <button onClick={() => setScale(s => Math.min(s + 0.2, 3.0))} className="text-white/40 hover:text-primary-orange"><i className="fa-solid fa-plus"></i></button>
                   </div>
                   <div className="flex gap-4 items-center">
                      <button disabled={pageNumber <= 1} onClick={() => setPageNumber(p => p - 1)} className="text-white/40 hover:text-primary-orange disabled:opacity-10"><i className="fa-solid fa-chevron-left text-xs"></i></button>
                      <span className="text-[10px] font-black text-white tracking-widest uppercase">PAGE {pageNumber} / {numPages || '--'}</span>
                      <button disabled={pageNumber >= (numPages || 1)} onClick={() => setPageNumber(p => p + 1)} className="text-white/40 hover:text-primary-orange disabled:opacity-10"><i className="fa-solid fa-chevron-right text-xs"></i></button>
                   </div>
                </div>

                <div className="flex-1 overflow-auto bg-white flex justify-center p-12 scrollbar-hide">
                  <Document 
                    file={researchService.getViewUrl(evaluatingStudy.id)} 
                    onLoadSuccess={({numPages}) => setNumPages(numPages)}
                    loading={<i className="fa-solid fa-circle-notch fa-spin text-4xl text-primary-orange mt-20"></i>}
                  >
                    <Page pageNumber={pageNumber} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} width={800} />
                  </Document>
                </div>
              </div>
            </div>

            {/* Right Column: Feedback Form */}
            <div className="w-full lg:w-[450px] bg-white flex flex-col p-8 lg:p-10 overflow-y-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-tight text-charcoal-black">Validate Build</h2>
                <button onClick={() => setEvalStudy(null)} className="text-orange-200 hover:text-charcoal-black transition-colors">
                  <i className="fa-solid fa-circle-xmark text-3xl"></i>
                </button>
              </div>
              
              <div className="mb-8 p-6 bg-orange-50/50 rounded-2xl border border-orange-100">
                <span className="text-meta-label uppercase text-[9px] mb-1 block">Active Manuscript</span>
                <p className="text-sm font-black text-charcoal-black uppercase leading-tight">{evaluatingStudy.title}</p>
                <span className="text-primary-orange uppercase text-[10px] font-bold mt-2 block">Iteration: v{evaluatingStudy.version || 1}.0</span>
              </div>
              
              <div className="flex-1 flex flex-col space-y-4">
                <div className="flex-1 flex flex-col h-full min-h-[250px]">
                  <label className="text-meta-label block mb-3 ml-1 uppercase text-[10px]">Evaluation Remarks</label>
                  <textarea 
                    required
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="input-terminal flex-1 w-full p-6 text-sm resize-none h-full"
                    placeholder="Record findings or requested refactors..."
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4 mt-8 pt-8 border-t border-orange-50">
                <button 
                  onClick={() => handleEvaluate("Revision Requested")} 
                  className="w-full bg-ember-soft border-2 border-primary-orange text-primary-orange py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary-orange hover:text-white transition-all"
                >
                  Request Refactor
                </button>
                <button 
                  onClick={() => handleEvaluate("Approved")} 
                  className="w-full btn-terminal-primary py-4 text-[10px]"
                >
                  Approve & Commit
                </button>
                <button 
                  onClick={() => setEvalStudy(null)} 
                  className="w-full font-black text-[10px] text-slate-400 uppercase tracking-widest hover:text-verified-red mt-2"
                >
                  Abort Validation
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Coordinator;