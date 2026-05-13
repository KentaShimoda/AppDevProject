import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { researchService } from "../../services/researchService";
import { bookmarkService } from "../../services/bookmarkService";
import { API_BASE_URL } from "../../services/apiConfig";
import { Document, Page, pdfjs } from 'react-pdf';

// PDF Worker Initialization
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// --- Local Types ---
interface Researcher { name: string; email: string; }
interface Coordinator { name: string; email: string; }

const Preview: React.FC = () => {
  const { id } = useParams<{ id: string }>(); 
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");

  // --- 1. State Management ---
  const [study, setStudy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCitation, setActiveCitation] = useState("APA");
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [hasValidated, setHasValidated] = useState(false); 
  const [isBookmarked, setIsBookmarked] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isVersionOpen, setIsVersionOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [feedbackEdit, setFeedbackEdit] = useState<{version: number, text: string} | null>(null);
  
  const [editForm, setEditForm] = useState({ 
    title: "", tags: "",
    coordinatorName: "", coordinatorEmail: "",
    researchers: [] as { name: string, email: string }[]
  });
  
  const [versionForm, setVersionForm] = useState({ name: "", file: null as File | null });
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0); 

  // --- 2. Protocols & Stability Logic ---

  const safeParse = (data: any, fallback: any) => {
    if (!data) return fallback;
    if (typeof data === 'string' && data.trim().length > 0) {
      try { return JSON.parse(data); } catch { return fallback; }
    }
    return (Array.isArray(data) || typeof data === 'object') ? data : fallback;
  };

  const fetchStudy = useCallback(() => {
    if (!id) return;
    
    Promise.all([
      researchService.getById(Number(id)),
      bookmarkService.getMyList()
    ]).then(([data, bookmarks]) => {
      if (!data) { setLoading(false); return; }
      setStudy(data);
      
      // Check bookmark status against user's saved list
      const saved = (bookmarks || []).some((b: any) => (b.researchId || b.id) === Number(id));
      setIsBookmarked(!!saved);

      if (selectedVersion === null) {
        // Fix for Error 1 (line 68): Explicitly cast unknown properties to number
        const currentV = (data.version ?? data.Version) as number | undefined;
        setSelectedVersion(currentV ?? null);
      }
      
      const coord = safeParse(data.coordinator || data.Coordinator, {});
      const resList = safeParse(data.researchers || data.Researchers, []);

      setEditForm({ 
        title: data.title || (data.Title as string) || "", 
        // Fix for Error 2 (line 80): Ensure tags are formatted as a string
        tags: Array.isArray(data.tags) ? data.tags.join(", ") : (typeof data.tags === 'string' ? data.tags : ""),
        coordinatorName: coord?.name || coord?.Name || "", 
        coordinatorEmail: coord?.email || coord?.Email || "",
        researchers: resList.map((r: any) => ({ 
            name: r.name || r.Name || r, 
            email: r.email || r.Email || "" 
        }))
      });
      
      const valLog = safeParse(data.validationLog || data.ValidationLog, []);
      const validated = valLog?.some((v: any) => 
        (v.facultyEmail || v.FacultyEmail || "").toLowerCase().trim() === (currentUser.email || "").toLowerCase().trim()
      );

      setHasValidated(!!validated);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, currentUser.email, selectedVersion]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setPageNumber(p => Math.min(p + 1, numPages || p));
      if (e.key === "ArrowLeft") setPageNumber(p => Math.max(p - 1, 1));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [numPages]);

  useEffect(() => { 
    if (id) {
        researchService.recordView(Number(id));
        fetchStudy(); 
    }
  }, [id, fetchStudy]);

  const pdfAuthFile = useMemo(() => {
    return {
      url: researchService.getViewUrl(Number(id!)),
      httpHeaders: token ? { Authorization: `Bearer ${token}` } : {}
    };
  }, [id, token]);

  // --- 3. Handlers ---

  const handleToggleBookmark = async () => {
    try {
      const result = await bookmarkService.toggle(Number(id));
      setIsBookmarked(result.isBookmarked);
    } catch (err) {
      console.error("Bookmark toggle failed", err);
    }
  };

  const handleDeleteManuscript = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/Research/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      if (res.ok) {
        navigate("/Dashboard");
      } else {
        throw new Error();
      }
    } catch (err) {
      alert("Unauthorized: Manuscript removal restricted to coordinating authority.");
    }
  };

  const addResearcher = () => {
    setEditForm({ ...editForm, researchers: [...editForm.researchers, { name: "", email: "" }] });
  };

  const removeResearcher = (index: number) => {
    setEditForm({ ...editForm, researchers: editForm.researchers.filter((_, i) => i !== index) });
  };

  const handleResearcherChange = (index: number, field: string, value: string) => {
    const updated = [...editForm.researchers];
    (updated[index] as any)[field] = value;
    setEditForm({ ...editForm, researchers: updated });
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const submissionData = {
        title: editForm.title,
        tags: editForm.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
        coordinatorName: editForm.coordinatorName,
        coordinatorEmail: editForm.coordinatorEmail,
    };
    const success = await researchService.updateDetails(Number(id), submissionData);
    if (success) { setIsEditOpen(false); fetchStudy(); }
  };

  const handleUploadVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionForm.file || !versionForm.name) return alert("Select a PDF and version name.");
    const result = await researchService.uploadNewVersion(Number(id), {
      file: versionForm.file,
      notes: versionForm.name
    });
    if (result) { setIsVersionOpen(false); setVersionForm({ name: "", file: null }); fetchStudy(); }
  };

  const handleSaveFeedback = async () => {
    if (!feedbackEdit) return;
    const success = await researchService.updateFeedback(Number(id), feedbackEdit.version, feedbackEdit.text);
    if (success) { 
      setFeedbackEdit(null); 
      fetchStudy(); 
      alert("Coordinator Log Entry Updated Successfully."); 
    }
  };

  const handleSecureDownload = async () => {
    try {
      const res = await fetch(researchService.getViewUrl(Number(id)), {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${study.title || "Manuscript"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Download failed. The file may be restricted or unavailable.");
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-warm-white text-meta-label animate-pulse uppercase tracking-widest">Synchronizing Terminal...</div>;
  if (!study) return <div className="h-screen flex items-center justify-center bg-warm-white text-verified-red font-black uppercase">Research Not Found</div>;

  const coordinatorData = safeParse(study.coordinator || study.Coordinator, {});
  const researcherList = safeParse(study.researchers || study.Researchers, []);
  const historyList = safeParse(study.history || study.History, []);
  
  const isCoordinator = (coordinatorData?.email || coordinatorData?.Email)?.toLowerCase() === currentUser.email?.toLowerCase();
  const isOwner = isCoordinator || researcherList?.some((r: any) => (r.email || r.Email || r).toLowerCase() === currentUser.email?.toLowerCase());
  const isFaculty = currentUser.userType === "Faculty / Professional";

  const authors = researcherList?.map((r: any) => {
    const name = r.name || r.Name || r || "Unknown";
    const parts = name.trim().split(" ");
    return parts.length > 1 ? `${parts[parts.length - 1]}, ${parts[0][0]}.` : name;
  }).join(", ") || "Unknown";
  
  const citations = {
    APA: `${authors} (${new Date(study.createdAt).getFullYear()}). ${study.title}.`,
    MLA: `${authors}. "${study.title}." ${new Date(study.createdAt).getFullYear()}.`,
    Chicago: `${authors}. ${new Date(study.createdAt).getFullYear()}. "${study.title}."`
  };

  return (
    <div className="h-screen w-full bg-warm-white font-sans antialiased flex flex-col overflow-hidden text-charcoal-black">
      
      {/* HEADER */}
      <header className="h-24 bg-charcoal-black px-10 flex items-center justify-between shadow-2xl z-50 shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="w-12 h-12 bg-white/10 hover:bg-primary-orange text-white rounded-xl flex items-center justify-center border border-white/5 transition-all"><i className="fa-solid fa-arrow-left"></i></button>
          <div>
            <span className="text-meta-label text-orange-400 block mb-1 uppercase tracking-widest">Scholar Archive</span>
            <span className="text-white font-black uppercase tracking-tight text-sm">Manuscript Terminal</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleToggleBookmark} 
            className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${isBookmarked ? 'bg-primary-orange text-white border-primary-orange shadow-lg' : 'bg-white/10 text-white border-white/5 hover:bg-white/20'}`}
            title={isBookmarked ? "Remove from Library" : "Bookmark Manuscript"}
          >
            <i className={`${isBookmarked ? 'fa-solid' : 'fa-regular'} fa-bookmark text-base`}></i>
          </button>

          {isOwner && (
            <>
              <div className="h-8 w-px bg-white/10 mx-2"></div>
              <div className="flex items-center gap-3">
                <button onClick={() => setIsEditOpen(true)} className="bg-white/10 hover:bg-white text-white hover:text-charcoal-black px-5 py-2.5 rounded-xl text-[10px] font-black uppercase">Edit</button>
                <button onClick={() => setIsVersionOpen(true)} className="bg-white/10 hover:bg-white text-white hover:text-charcoal-black px-5 py-2.5 rounded-xl text-[10px] font-black uppercase">Upload Version</button>
                <button onClick={() => setIsDeleteOpen(true)} className="bg-verified-red/20 hover:bg-verified-red text-verified-red hover:text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all">Delete</button>
              </div>
            </>
          )}
          <div className="h-10 w-px bg-white/10 mx-2"></div>
          <button onClick={handleSecureDownload} className="bg-primary-orange hover:bg-white text-white hover:text-charcoal-black px-8 py-3 rounded-2xl text-[10px] font-black uppercase shadow-xl transition-all">
            Download PDF
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* PDF PREVIEW */}
        <div className="flex-1 bg-ember-soft p-6 flex flex-col items-center overflow-hidden relative">
          <div className="h-full w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl border border-orange-100 flex flex-col overflow-hidden relative group">
            
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
              <Document file={pdfAuthFile} onLoadSuccess={({numPages}) => setNumPages(numPages)}>
                <Page pageNumber={pageNumber} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} width={800} />
              </Document>
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="w-full lg:w-[500px] bg-white border-l border-orange-50 shadow-2xl z-20 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-12 space-y-16 scrollbar-hide">
            
            <section>
              {study.status === "Revision Requested" && isOwner && (
                <div className="bg-verified-red/10 border border-verified-red/30 text-verified-red p-6 rounded-3xl mb-10 flex flex-col gap-4 shadow-sm">
                  <div>
                    <h4 className="font-black uppercase tracking-widest text-[10px] mb-2 flex items-center gap-2"><i className="fa-solid fa-triangle-exclamation"></i> Action Required</h4>
                    <p className="text-xs font-bold leading-relaxed text-charcoal-black">Your coordinator has requested a revision. Review the feedback in the timeline below.</p>
                  </div>
                  <button onClick={() => setIsVersionOpen(true)} className="bg-verified-red text-white w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-red-700 transition-all">Upload Revision Now</button>
                </div>
              )}

              <div className="flex items-center justify-between mb-10">
                <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                  study.status === 'Approved' ? 'bg-green-50 text-green-600 border-green-100' :
                  study.status === 'Revision Requested' ? 'bg-red-50 text-verified-red border-red-100' :
                  'bg-orange-50 text-primary-orange border-orange-100'
                }`}>
                  {study.status}
                </span>
                
                {isFaculty && !isCoordinator && (
                  <button onClick={() => researchService.toggleValidation(Number(id)).then(fetchStudy)} className={`text-[10px] font-black uppercase px-6 py-2.5 rounded-2xl border-2 transition-all ${hasValidated ? 'bg-charcoal-black text-white' : 'text-charcoal-black hover:bg-orange-50'}`}>
                    {hasValidated ? "Remove Points" : "Validate Study"}
                  </button>
                )}
              </div>

              <h2 className="text-4xl font-black uppercase tracking-tight leading-[0.9] mb-8 text-charcoal-black">{study.title}</h2>
              <div className="grid grid-cols-2 gap-px bg-orange-100 border border-orange-100 rounded-[2.5rem] overflow-hidden text-[10px] font-black uppercase mb-10">
                <div className="p-8 bg-white"><span className="text-meta-label block mb-1">Created</span><p>{new Date(study.createdAt).toLocaleDateString()}</p></div>
                <div className="p-8 bg-white"><span className="text-meta-label block mb-1">Validations</span><p>{study.validations} Pts</p></div>
                <div className="p-8 bg-white"><span className="text-meta-label block mb-1">Expert Reach</span><p className="text-primary-orange font-black">{study.views} Views</p></div>
                <div className="p-8 bg-white"><span className="text-meta-label block mb-1">Iteration</span><p>v{study.version || study.Version}.0</p></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(study.tags || "").split(',').map((tag: string, i: number) => (
                  <span key={i} className="bg-orange-50 text-primary-orange text-[10px] font-black px-4 py-2 rounded-xl border border-orange-100 uppercase">{tag.trim()}</span>
                ))}
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-meta-label text-charcoal-black text-[11px] uppercase tracking-[0.4em]">Academic Oversight</h3>
              <div className="bg-white border border-orange-100 p-6 rounded-[2rem] flex items-center gap-5 shadow-sm">
                <div className="w-14 h-14 bg-ember-soft rounded-2xl flex items-center justify-center text-primary-orange font-black border border-orange-100">{coordinatorData?.name?.[0] || "C"}</div>
                <div>
                  <p className="text-[11px] font-black uppercase text-charcoal-black tracking-wider">{coordinatorData?.name || "Unassigned"}</p>
                  <p className="text-[9px] font-medium text-slate-400 lowercase">{coordinatorData?.email || "No email"}</p>
                  <p className="text-[9px] font-black uppercase text-primary-orange bg-orange-50 px-2 py-1 rounded-md inline-block mt-1">Lead Coordinator</p>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-meta-label text-charcoal-black text-[11px] uppercase tracking-[0.4em]">Research Team</h3>
              <div className="space-y-4">
                {researcherList?.map((r: any, i: number) => (
                  <div key={i} className="bg-orange-50/40 border border-orange-100 p-5 rounded-[1.5rem] flex items-center gap-4 group hover:bg-white transition-all">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-charcoal-black font-black text-xs border border-orange-100 group-hover:bg-primary-orange group-hover:text-white transition-colors">{(r.name || r.Name || r)[0]}</div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-charcoal-black tracking-wide">{r.name || r.Name || r}</p>
                      <p className="text-[9px] font-medium text-slate-400 lowercase">{r.email || r.Email || "No email recorded"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-8">
              <h3 className="text-meta-label text-charcoal-black text-[11px] uppercase tracking-[0.4em]">Manuscript Timeline</h3>
              <div className="relative pl-8 border-l-2 border-orange-100 space-y-12 ml-2">
                {historyList.map((h: any, i: number) => {
                    const vNum = h.version ?? h.Version;
                    const vFeedback = h.feedback ?? h.Feedback;
                    const currentActive = study.version ?? study.Version;
                    
                    return (
                        <div key={i} className="relative">
                            <div className={`absolute -left-[37px] top-1 w-5 h-5 rounded-full border-4 border-white shadow-xl cursor-pointer transition-all ${selectedVersion === vNum ? 'bg-primary-orange scale-125' : 'bg-orange-100'}`} onClick={() => setSelectedVersion(vNum)}></div>
                            <p className={`text-[11px] font-black uppercase tracking-wide ${vNum === currentActive ? 'text-charcoal-black' : 'text-slate-400'}`}>v{vNum}.0 {h.versionName || h.VersionName || (vNum === currentActive ? "Active" : "Archive")}</p>
                            {selectedVersion === vNum && (
                            <div className={`mt-6 p-8 rounded-[2.5rem] shadow-2xl ${vNum === currentActive ? 'bg-charcoal-black text-white' : 'bg-slate-100 text-charcoal-black border border-orange-100'}`}>
                                <div className="flex justify-between items-center mb-4">
                                <span className={`text-meta-label uppercase ${vNum === currentActive ? 'text-primary-orange' : 'text-slate-400'}`}>Log Remark</span>
                                {isCoordinator && <button onClick={() => setFeedbackEdit({version: vNum, text: vFeedback || ""})} className={`text-[10px] uppercase font-black underline underline-offset-4 ${vNum === currentActive ? 'text-orange-500' : 'text-primary-orange'}`}>Edit Log</button>}
                                </div>
                                <p className={`text-xs italic leading-relaxed ${vNum === currentActive ? 'text-orange-100/60' : 'text-slate-500'}`}>"{vFeedback || "Access cleared. No remarks recorded."}"</p>
                            </div>
                            )}
                        </div>
                    );
                })}
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-meta-label text-charcoal-black text-[11px] uppercase tracking-[0.4em]">Citation Engine</h3>
              <div className="bg-orange-50/40 rounded-[3rem] p-10 border border-orange-100 shadow-inner">
                <div className="flex gap-6 mb-8 border-b border-orange-100 pb-4">
                  {Object.keys(citations).map((k) => (
                    <button key={k} onClick={() => setActiveCitation(k)} className={`text-[10px] font-black uppercase tracking-wide transition-all ${activeCitation === k ? 'text-charcoal-black border-b-2 border-charcoal-black' : 'text-orange-200'}`}>{k}</button>
                  ))}
                </div>
                <p className="text-[11px] text-charcoal-black/70 leading-relaxed italic mb-10">{citations[activeCitation as keyof typeof citations]}</p>
                <button onClick={() => { navigator.clipboard.writeText(citations[activeCitation as keyof typeof citations]!); alert("Buffer Updated!"); }} className="btn-terminal-primary w-full bg-charcoal-black text-white py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-xl transition-all">Copy Citation</button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* --- ALL MODALS --- */}
      
      {/* 1. Edit Details Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-[100] bg-charcoal-black/60 backdrop-blur-md flex items-center justify-center p-12 overflow-y-auto">
          <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl w-full max-w-4xl border-t-8 border-charcoal-black my-auto">
            <div className="flex items-center justify-between mb-10">
                <div>
                    <span className="text-meta-label block mb-1">Scholar Terminal</span>
                    <h2 className="text-3xl font-black uppercase tracking-tight leading-none">Update Manuscript Record</h2>
                </div>
                <button onClick={() => setIsEditOpen(false)} className="text-orange-200 hover:text-charcoal-black transition-colors"><i className="fa-solid fa-circle-xmark text-3xl"></i></button>
            </div>
            <form onSubmit={handleUpdateDetails} className="space-y-12">
              <section>
                <div className="flex items-center gap-6 mb-8"><h2 className="text-h2 text-[12px] tracking-widest uppercase">02. Study Metadata</h2><div className="flex-1 h-px bg-orange-100"></div></div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  <div className="md:col-span-8"><label className="text-meta-label block mb-3 ml-1">Research Title</label><input required value={editForm.title} onChange={(e) => setEditForm({...editForm, title: e.target.value})} className="input-terminal px-6 py-5" /></div>
                  <div className="md:col-span-4"><label className="text-meta-label block mb-3 ml-1">Tags</label><input required value={editForm.tags} onChange={(e) => setEditForm({...editForm, tags: e.target.value})} className="input-terminal px-6 py-5" /></div>
                </div>
              </section>
              <section>
                <div className="flex items-center gap-6 mb-8"><h2 className="text-h2 text-[12px] tracking-widest uppercase">03. Faculty Coordinator</h2><div className="flex-1 h-px bg-orange-100"></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-ember-soft p-8 rounded-[2.5rem] border border-orange-100">
                  <input required disabled={isCoordinator} value={editForm.coordinatorName} onChange={(e) => setEditForm({...editForm, coordinatorName: e.target.value})} className={`w-full bg-white rounded-xl px-6 py-4 border border-orange-50 outline-none ${isCoordinator ? 'opacity-50' : 'focus:border-primary-orange'}`} />
                  <input required disabled={isCoordinator} value={editForm.coordinatorEmail} onChange={(e) => setEditForm({...editForm, coordinatorEmail: e.target.value})} className={`w-full bg-white rounded-xl px-6 py-4 border border-orange-50 outline-none ${isCoordinator ? 'opacity-50' : 'focus:border-primary-orange'}`} />
                </div>
              </section>
              <section>
                <div className="flex justify-between items-center mb-8"><div className="flex items-center gap-6 flex-1"><h2 className="text-h2 text-[12px] tracking-widest uppercase">04. Research Team</h2><div className="flex-1 h-px bg-orange-100"></div></div><button type="button" onClick={addResearcher} className="btn-terminal-secondary py-2 px-6 ml-6">Add Member</button></div>
                <div className="space-y-6 max-h-[300px] overflow-y-auto pr-4 scrollbar-hide">
                  {editForm.researchers.map((res: any, index: number) => {
                    const isSelf = (res.email || "").toLowerCase() === (currentUser.email || "").toLowerCase();
                    return (
                      <div key={index} className={`grid grid-cols-1 md:grid-cols-[1fr_1fr_60px] gap-6 items-center p-6 rounded-[2.5rem] border ${isSelf ? 'bg-ember-soft border-primary-orange/30' : 'bg-white border-orange-100'}`}>
                        <input required readOnly={isSelf} value={res.name} onChange={(e) => handleResearcherChange(index, 'name', e.target.value)} className={`w-full rounded-xl px-6 py-4 outline-none ${isSelf ? 'bg-white/50 text-slate-400' : 'bg-warm-white focus:border-primary-orange'}`} />
                        <input required readOnly={isSelf} value={res.email} onChange={(e) => handleResearcherChange(index, 'email', e.target.value)} className={`w-full rounded-xl px-6 py-4 outline-none ${isSelf ? 'bg-white/50 text-slate-400' : 'bg-warm-white focus:border-primary-orange'}`} />
                        {!isSelf ? <button type="button" onClick={() => removeResearcher(index)} className="text-orange-200 hover:text-verified-red text-xl"><i className="fa-solid fa-circle-minus"></i></button> : <i className="fa-solid fa-shield-halved text-xl text-primary-orange opacity-40 text-center"></i>}
                      </div>
                    );
                  })}
                </div>
              </section>
              <button type="submit" className="btn-terminal-primary w-full py-6 text-xs tracking-[0.3em] uppercase">Commit Record Changes</button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Upload New Version Modal */}
      {isVersionOpen && (
        <div className="fixed inset-0 z-[200] bg-charcoal-black/60 backdrop-blur-md flex items-center justify-center p-12">
          <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl w-full max-w-md border-t-8 border-primary-orange">
            <h2 className="text-3xl font-black uppercase mb-10 text-charcoal-black tracking-tight leading-none">Upload Revision</h2>
            <form onSubmit={handleUploadVersion} className="space-y-6">
              <div><label className="text-meta-label block mb-2">Version Title</label><input required value={versionForm.name} onChange={(e) => setVersionForm({...versionForm, name: e.target.value})} className="input-terminal w-full p-5" /></div>
              <div><label className="text-meta-label block mb-2">PDF Document</label><input type="file" required accept="application/pdf" onChange={(e) => setVersionForm({...versionForm, file: e.target.files?.[0] || null})} className="w-full text-xs font-bold file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-ember-soft file:text-primary-orange" /></div>
              <div className="flex gap-6 pt-6">
                <button type="button" onClick={() => setIsVersionOpen(false)} className="flex-1 font-black text-xs text-slate-400 uppercase tracking-widest hover:text-verified-red">Abort</button>
                <button type="submit" className="btn-terminal-primary flex-1 py-5">Push Version</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Feedback Modal (Log Editor) */}
      {feedbackEdit && (
        <div className="fixed inset-0 z-[200] bg-charcoal-black/60 backdrop-blur-md flex items-center justify-center p-12">
          <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl w-full max-w-md border-t-8 border-charcoal-black">
            <h2 className="text-3xl font-black uppercase mb-4 text-charcoal-black tracking-tight leading-none">Modify Log</h2>
            <textarea rows={5} value={feedbackEdit.text} onChange={(e) => setFeedbackEdit({...feedbackEdit, text: e.target.value})} className="input-terminal w-full p-6 text-sm resize-none" placeholder="Enter updated coordinator remarks..." />
            <div className="flex gap-6 pt-6">
              <button onClick={() => setFeedbackEdit(null)} className="flex-1 font-black text-xs text-slate-400 uppercase hover:text-verified-red">Cancel</button>
              <button onClick={handleSaveFeedback} className="btn-terminal-primary flex-1 py-5">Update Log</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Delete Confirmation Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-[300] bg-charcoal-black/80 backdrop-blur-lg flex items-center justify-center p-12">
          <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl w-full max-w-md border-t-8 border-verified-red text-center">
            <div className="w-20 h-20 bg-verified-red/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <i className="fa-solid fa-trash-can text-3xl text-verified-red"></i>
            </div>
            <h2 className="text-3xl font-black uppercase mb-4 text-charcoal-black tracking-tight leading-none">Terminate Record?</h2>
            <p className="text-sm font-bold text-slate-400 leading-relaxed mb-10">This action is irreversible. The manuscript and all associated iteration history will be purged from the archive.</p>
            <div className="flex gap-6">
              <button onClick={() => setIsDeleteOpen(false)} className="flex-1 py-5 rounded-2xl bg-slate-100 text-charcoal-black font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
              <button onClick={handleDeleteManuscript} className="flex-1 py-5 rounded-2xl bg-verified-red text-white font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-red-700 transition-all">Terminate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Preview;