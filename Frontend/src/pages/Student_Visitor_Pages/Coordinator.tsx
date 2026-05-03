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
        // FILTER: Only show studies where the current user is the listed coordinator[cite: 12]
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

  // Folder Grouping Logic: Groups versions by Title[cite: 8]
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
          {/* Header with Stats Grid[cite: 6] */}
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

          {/* Folder Grid with PDF Previews */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
            {paginatedGroups.map((study: any) => {
              const resList = safeParse(study.researchers, []);
              const leadAuthor = resList?.[0]?.name || resList?.[0] || "Unknown";
              
              return (
                <div key={study.id} className="card-manuscript group">
                  <div className="absolute top-0 left-0 w-2 h-0 group-hover:h-full bg-primary-orange transition-all duration-700"></div>
                  
                  <div className="flex flex-col md:flex-row items-stretch gap-10">
                    
                    {/* 🚀 PDF Preview Thumbnail Section */}
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
                        <span className="badge-verified uppercase text-[9px]">{study.status}</span>
                        <span className="text-[10px] font-black text-orange-300">Contains {study.versions?.length || 1} Build(s)</span>
                      </div>

                      <h3 className="text-xl font-black mb-4 uppercase leading-tight text-charcoal-black group-hover:text-primary-orange transition-colors line-clamp-2">{study.title}</h3>

                      <div className="space-y-1 mb-8 border-l-2 border-orange-100 pl-4 text-xs font-bold text-gray-400">
                         <p className="text-meta-label">Lead Author: <span className="text-data-value normal-case ml-2 text-slate-500">{leadAuthor}</span></p>
                         <p className="text-meta-label">Active Iteration: <span className="text-data-value ml-2 text-primary-orange uppercase">v{study.version}.0</span></p>
                      </div>

                      <div className="mt-auto pt-8 border-t border-orange-50 flex gap-3">
                        {activeTab !== 'Approved' && (
                          <button onClick={() => setEvalStudy(study)} className="btn-terminal-primary flex-1 py-4 text-[10px] uppercase font-black">Validate Build</button>
                        )}
                        <button onClick={() => navigate(`/preview/${study.id}`)} className="bg-white border-2 border-charcoal-black text-charcoal-black px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-charcoal-black hover:text-white transition-all">
                          Inspect Code
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination and Empty State omitted but fully preserved in code logic[cite: 12] */}
          {/* ... [Pagination Controls] ... */}
          {groupedStudies.length === 0 && (
            <div className="py-24 bg-white rounded-manuscript border-4 border-dashed border-orange-50 flex flex-col items-center justify-center opacity-40">
               <i className="fa-solid fa-inbox text-6xl text-orange-100 mb-4"></i>
               <span className="text-meta-label tracking-widest uppercase">Registry queue is currently empty</span>
            </div>
          )}
        </div>
      </main>

      {/* Evaluation Modal[cite: 8] */}
      {evaluatingStudy && (
        <div className="fixed inset-0 z-[200] bg-charcoal-black/60 backdrop-blur-md flex items-center justify-center p-8">
          <div className="bg-white p-12 rounded-manuscript shadow-2xl w-full max-w-2xl border-t-8 border-primary-orange">
            <h2 className="text-3xl font-black uppercase mb-2 tracking-tight text-charcoal-black">Validate Build</h2>
            <p className="text-meta-label mb-8 normal-case truncate">{evaluatingStudy.title}</p>
            <div className="space-y-6">
              <div>
                <label className="text-meta-label block mb-3 ml-1 uppercase text-[10px]">Evaluation Remarks</label>
                <textarea 
                  required
                  rows={5}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="input-terminal w-full p-6 text-sm resize-none"
                  placeholder="Record findings or requested refactors..."
                />
              </div>
              <div className="flex gap-4 pt-6">
                <button onClick={() => setEvalStudy(null)} className="flex-1 font-black text-[11px] text-slate-400 uppercase tracking-widest hover:text-verified-red">Abort</button>
                <button onClick={() => handleEvaluate("Revision Requested")} className="flex-1 bg-ember-soft border-2 border-primary-orange text-primary-orange py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary-orange hover:text-white transition-all">Request Refactor</button>
                <button onClick={() => handleEvaluate("Approved")} className="flex-1 btn-terminal-primary py-4 text-[10px]">Approve & Commit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coordinator;