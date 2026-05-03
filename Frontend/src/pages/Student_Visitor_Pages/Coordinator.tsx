import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { researchService } from "../../services/researchService";
import { API_BASE_URL } from "../../services/apiConfig";

const Coordinator: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [studies, setStudies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Pending Review");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modal State for Evaluation
  const [evaluatingStudy, setEvalStudy] = useState<any | null>(null);
  const [feedback, setFeedback] = useState("");

  const fetchStudies = () => {
    setLoading(true);
    researchService.getAll()
      .then(data => {
        // FILTER: Only show studies where the current user is the listed coordinator
        const filtered = data.filter((s: any) => {
          const coord = typeof s.coordinator === 'string' ? JSON.parse(s.coordinator) : s.coordinator;
          return coord?.email?.toLowerCase() === currentUser.email?.toLowerCase();
        });
        setStudies(filtered);
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch Error:", err);
        setLoading(false);
      });
  };

  useEffect(() => { fetchStudies(); }, []);

  // 1. Grouping Logic (Folder System): Groups studies by Title to prevent version overload[cite: 8]
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

  // 2. Statistics (Counter Boxes matching MyArchive UI)
  const stats = useMemo(() => ({
    pending: studies.filter(s => s.status === "Pending Review").length,
    revision: studies.filter(s => s.status === "Revision Requested").length,
    approved: studies.filter(s => s.status === "Approved").length
  }), [studies]);

  // 3. Pagination Logic
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
      body: JSON.stringify({ status, feedback }) // Matches EvaluationDto[cite: 4]
    });

    if (res.ok) {
      setEvalStudy(null);
      setFeedback("");
      fetchStudies(); // Refresh the list[cite: 8]
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-warm-white">
      <span className="text-meta-label animate-pulse uppercase tracking-widest text-primary-orange">Accessing Coordinator Terminal...</span>
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
                <span className="text-meta-label uppercase tracking-widest">Faculty Evaluation Portal</span>
              </div>
              <h1 className="text-h1">Review<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-orange to-red-600">Terminal</span></h1>
            </div>
            
            {/* 4. Multi-Box Counters (Synchronized with MyArchive)[cite: 6] */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {[
                 { label: "Pending Action", val: stats.pending, icon: "fa-clock", color: "text-primary-orange" },
                 { label: "Revision Requested", val: stats.revision, icon: "fa-rotate-left", color: "text-verified-red" },
                 { label: "Approved Studies", val: stats.approved, icon: "fa-circle-check", color: "text-green-600" }
               ].map((box, i) => (
                 <div key={i} className="bg-white p-6 rounded-terminal border border-orange-50 shadow-sm flex flex-col min-w-[180px] group relative overflow-hidden">
                    <i className={`fa-solid ${box.icon} absolute -right-2 -bottom-2 text-4xl opacity-5`}></i>
                    <span className={`text-3xl font-black ${box.color} tracking-tighter mb-1`}>{box.val}</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{box.label}</span>
                 </div>
               ))}
            </div>
          </header>

          {/* Tab Navigation[cite: 8] */}
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

          {/* 5. Main Folder Grid[cite: 8, 9] */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
            {paginatedGroups.map((study: any) => (
              <div key={study.id} className="card-manuscript group">
                <div className="absolute top-0 left-0 w-2 h-0 group-hover:h-full bg-primary-orange transition-all duration-700"></div>
                
                <div className="flex flex-col md:flex-row items-stretch gap-10">
                  <div className="w-full md:w-56 bg-ember-soft rounded-[2.5rem] flex flex-col items-center justify-center text-orange-200 group-hover:bg-primary-orange group-hover:text-white transition-all duration-700 shrink-0">
                    <i className="fa-solid fa-folder-open text-7xl"></i>
                    <span className="text-[10px] font-black uppercase tracking-widest mt-4">Study Folder</span>
                  </div>

                  <div className="flex-1 flex flex-col py-2">
                    <div className="flex justify-between items-start mb-6">
                      <span className="badge-verified uppercase">{study.status}</span>
                      <span className="text-[10px] font-black text-orange-300">Contains {study.versions?.length || 1} Version(s)</span>
                    </div>

                    <h3 className="text-xl font-black mb-4 uppercase leading-tight text-charcoal-black group-hover:text-primary-orange transition-colors line-clamp-2">{study.title}</h3>

                    <div className="space-y-1 mb-8 border-l-2 border-orange-100 pl-4 text-xs font-bold text-gray-400">
                       <p className="text-meta-label">Lead Author: <span className="text-data-value normal-case ml-2 text-slate-500">
                          {Array.isArray(study.researchers) ? (study.researchers[0]?.name || study.researchers[0]) : "Unknown"}
                       </span></p>
                       <p className="text-meta-label">Current Version: <span className="text-data-value ml-2 text-primary-orange">v{study.version}.0</span></p>
                    </div>

                    {/* Updated Buttons */}
                    <div className="mt-auto pt-8 border-t border-orange-50 flex gap-3">
                      {activeTab !== 'Approved' && (
                        <button onClick={() => setEvalStudy(study)} className="btn-terminal-primary flex-1 py-4 text-[10px]">Validate Study</button>
                      )}
                      <button onClick={() => navigate(`/preview/${study.id}`)} className="bg-white border-2 border-charcoal-black text-charcoal-black px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-charcoal-black hover:text-white transition-all">
                        View Study
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 6. Pagination Controls */}
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

          {groupedStudies.length === 0 && (
            <div className="py-24 bg-white rounded-manuscript border-4 border-dashed border-orange-50 flex flex-col items-center justify-center opacity-40">
               <i className="fa-solid fa-inbox text-6xl text-orange-100 mb-4"></i>
               <span className="text-meta-label tracking-widest uppercase">The review queue is currently empty</span>
            </div>
          )}
        </div>
      </main>

      {/* Evaluation Modal[cite: 8] */}
      {evaluatingStudy && (
        <div className="fixed inset-0 z-[200] bg-charcoal-black/60 backdrop-blur-md flex items-center justify-center p-8">
          <div className="bg-white p-12 rounded-manuscript shadow-2xl w-full max-w-2xl border-t-8 border-primary-orange">
            <h2 className="text-3xl font-black uppercase mb-2 tracking-tight text-charcoal-black">Validate Manuscript</h2>
            <p className="text-meta-label mb-8 normal-case">{evaluatingStudy.title}</p>
            
            <div className="space-y-6">
              <div>
                <label className="text-meta-label block mb-3 ml-1">Reviewer Remarks</label>
                <textarea 
                  required
                  rows={5}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="input-terminal w-full p-6 text-sm resize-none"
                  placeholder="Record your expert findings or revision requirements..."
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button onClick={() => setEvalStudy(null)} className="flex-1 font-black text-[11px] text-slate-400 uppercase tracking-widest hover:text-verified-red">Cancel</button>
                <button onClick={() => handleEvaluate("Revision Requested")} className="flex-1 bg-ember-soft border-2 border-primary-orange text-primary-orange py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary-orange hover:text-white transition-all">Request Revision</button>
                <button onClick={() => handleEvaluate("Approved")} className="flex-1 btn-terminal-primary py-4 text-[10px]">Approve & Publish</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coordinator;