import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { researchService } from "../../services/researchService";
import { Document, Page, pdfjs } from 'react-pdf';
import { API_BASE_URL } from "../../services/apiConfig";

// PDF Worker Initialization
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const Preview: React.FC = () => {
  const { id } = useParams<{ id: string }>(); 
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");

  // State Management
  const [study, setStudy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCitation, setActiveCitation] = useState("APA");
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [hasValidated, setHasValidated] = useState(false); 

  // Modal & Form States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isVersionOpen, setIsVersionOpen] = useState(false);
  const [feedbackEdit, setFeedbackEdit] = useState<{version: number, text: string} | null>(null);
  const [editForm, setEditForm] = useState({ title: "", tags: "" });
  const [versionForm, setVersionForm] = useState({ name: "", file: null as File | null });

  // PDF Navigation & Zoom States
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0); 

  const fetchStudy = () => {
    if (!id) return;
    researchService.getById(id).then(data => {
      setStudy(data);
      setEditForm({ title: data.title, tags: data.tags });
      
      const validated = data.validationLog?.some((v: any) => {
        const emailInLog = (v.facultyEmail || v.FacultyEmail || "").toLowerCase().trim();
        const myEmail = (currentUser.email || "").toLowerCase().trim();
        return emailInLog === myEmail;
      });

      setHasValidated(!!validated);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { 
    if (id) {
        fetch(`${API_BASE_URL}/Research/${id}/view`, { 
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` } 
        });
        fetchStudy(); 
    }
  }, [id]);

  // Ownership & Coordinator Logic[cite: 11]
  const coordinatorData = study?.coordinator ? (typeof study.coordinator === 'string' ? JSON.parse(study.coordinator) : study.coordinator) : null;
  const isCoordinator = coordinatorData?.email?.toLowerCase() === currentUser.email?.toLowerCase();
  
  const isOwner = study && (
    isCoordinator || 
    study.researchers?.some((r: any) => (r.email || r).toLowerCase() === currentUser.email?.toLowerCase())
  );
  
  const isFaculty = currentUser.userType === "Faculty / Professional";

  const handleToggleValidation = async () => {
    const res = await fetch(`${API_BASE_URL}/Research/${id}/validate`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) fetchStudy(); 
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE_URL}/Research/${id}/details`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(editForm)
    });
    if (res.ok) { setIsEditOpen(false); fetchStudy(); }
  };

  // IMPLEMENTED: Upload New Version functionality[cite: 9, 11]
  const handleUploadVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionForm.file || !versionForm.name) return alert("Please select a file and provide a version name.");
    
    const data = new FormData();
    data.append("VersionName", versionForm.name);
    data.append("PdfFile", versionForm.file);

    const res = await fetch(`${API_BASE_URL}/Research/${id}/version`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: data
    });

    if (res.ok) { 
      setIsVersionOpen(false); 
      setVersionForm({ name: "", file: null }); // Reset form
      fetchStudy(); 
      alert("New version uploaded successfully.");
    } else {
      alert("Failed to upload new version.");
    }
  };

  const handleSaveFeedback = async () => {
    if (!feedbackEdit) return;
    const res = await fetch(`${API_BASE_URL}/Research/${id}/history/${feedbackEdit.version}/feedback`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(feedbackEdit.text)
    });
    if (res.ok) { 
      setFeedbackEdit(null); 
      fetchStudy(); 
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-warm-white text-meta-label animate-pulse uppercase tracking-widest">Synchronizing Terminal...</div>;
  if (!study) return <div className="h-screen flex items-center justify-center bg-warm-white text-verified-red font-black uppercase">Research Not Found</div>;

  const researcherList = typeof study.researchers === 'string' ? JSON.parse(study.researchers) : study.researchers;
  const authors = researcherList?.map((r: any) => {
    const name = r.name || r;
    const parts = name.split(" ");
    return `${parts[parts.length - 1]}, ${parts[0][0]}.`;
  }).join(", ") || "Unknown";
  
  const citations = {
    APA: `${authors} (${new Date(study.createdAt).getFullYear()}). ${study.title}.`,
    MLA: `${authors}. "${study.title}." ${new Date(study.createdAt).getFullYear()}.`,
    Chicago: `${authors}. ${new Date(study.createdAt).getFullYear()}. "${study.title}."`
  };

  return (
    <div className="h-screen w-full bg-warm-white font-sans antialiased flex flex-col overflow-hidden text-charcoal-black">
      
      {/* 1. Header */}
      <header className="h-24 bg-charcoal-black px-10 flex items-center justify-between shadow-2xl z-50 shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="w-12 h-12 bg-white/10 hover:bg-primary-orange text-white rounded-xl flex items-center justify-center transition-all duration-300 active:scale-90 border border-white/5"><i className="fa-solid fa-arrow-left"></i></button>
          <div>
            <span className="text-meta-label text-orange-400 block mb-1 uppercase tracking-widest">Scholar Archive</span>
            <span className="text-white font-black uppercase tracking-tight text-sm">Manuscript Terminal</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isOwner && (
            <div className="flex items-center gap-3">
              <button onClick={() => setIsEditOpen(true)} className="bg-white/10 hover:bg-white text-white hover:text-charcoal-black px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Edit</button>
              <button onClick={() => setIsVersionOpen(true)} className="bg-white/10 hover:bg-white text-white hover:text-charcoal-black px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Upload New Version</button>
            </div>
          )}
          <div className="h-10 w-px bg-white/10 mx-2"></div>
          <button onClick={() => window.location.href=`${API_BASE_URL}/Research/${id}/download`} className="bg-primary-orange hover:bg-white text-white hover:text-charcoal-black px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl">Download PDF</button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* 2. PDF Preview */}
        <div className="flex-1 bg-ember-soft p-6 flex flex-col items-center overflow-hidden relative">
          <div className="h-full w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl border border-orange-100 flex flex-col overflow-hidden relative group">
            
            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-charcoal-black/90 backdrop-blur-xl px-8 py-3 rounded-2xl border border-white/10 shadow-2xl z-20 opacity-0 group-hover:opacity-100 transition-all duration-500">
               <div className="flex items-center gap-3 border-r border-white/10 pr-6">
                  <button onClick={() => setScale(s => Math.max(s - 0.2, 0.5))} className="text-white/40 hover:text-primary-orange transition-colors"><i className="fa-solid fa-minus text-[10px]"></i></button>
                  <span className="text-[10px] font-black text-white w-10 text-center">{Math.round(scale * 100)}%</span>
                  <button onClick={() => setScale(s => Math.min(s + 0.2, 3.0))} className="text-white/40 hover:text-primary-orange transition-colors"><i className="fa-solid fa-plus text-[10px]"></i></button>
               </div>
               <div className="flex gap-4 items-center">
                  <button disabled={pageNumber <= 1} onClick={() => setPageNumber(p => p - 1)} className="text-white/40 hover:text-primary-orange disabled:opacity-10 transition-colors"><i className="fa-solid fa-chevron-left text-xs"></i></button>
                  <span className="text-[10px] font-black text-white tracking-widest uppercase">PAGE {pageNumber} / {numPages || '--'}</span>
                  <button disabled={pageNumber >= (numPages || 1)} onClick={() => setPageNumber(p => p + 1)} className="text-white/40 hover:text-primary-orange disabled:opacity-10 transition-colors"><i className="fa-solid fa-chevron-right text-xs"></i></button>
               </div>
            </div>

            <div className="flex-1 overflow-auto bg-white flex justify-center p-12 scrollbar-hide">
              <Document file={`${API_BASE_URL}/Research/${id}/view`} onLoadSuccess={({numPages}) => setNumPages(numPages)}>
                <Page pageNumber={pageNumber} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} width={800} />
              </Document>
            </div>
          </div>
        </div>

        {/* 3. Details Panel */}
        <div className="w-full lg:w-[500px] bg-white border-l border-orange-50 shadow-2xl z-20 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-12 space-y-16 scrollbar-hide">
            
            <section>
              <div className="flex items-center justify-between mb-10">
                <span className="badge-verified bg-red-500/10 text-verified-red px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/20">{study.status}</span>
                {isFaculty && !isCoordinator && (
                  <button onClick={handleToggleValidation} className={`text-[10px] font-black uppercase px-6 py-2.5 rounded-2xl border-2 transition-all duration-300 ${hasValidated ? 'bg-charcoal-black text-white border-charcoal-black' : 'text-charcoal-black border-charcoal-black hover:bg-orange-50'}`}>
                    {hasValidated ? "Remove Points" : "Validate Study"}
                  </button>
                )}
              </div>
              
              <h2 className="text-4xl font-black uppercase tracking-tight leading-[0.9] mb-8 text-charcoal-black">{study.title}</h2>
              
              <div className="grid grid-cols-2 gap-px bg-orange-100 border border-orange-100 rounded-[2.5rem] overflow-hidden text-[10px] font-black uppercase mb-10">
                <div className="p-8 bg-white"><span className="text-meta-label block mb-1">Created</span><p className="text-charcoal-black font-black">{new Date(study.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p></div>
                <div className="p-8 bg-white"><span className="text-meta-label block mb-1">Validations</span><p className="text-charcoal-black font-black">{study.validations} Points</p></div>
                <div className="p-8 bg-white"><span className="text-meta-label block mb-1">Expert Reach</span><p className="text-primary-orange font-black">{study.views} Views</p></div>
                <div className="p-8 bg-white"><span className="text-meta-label block mb-1">Current Version</span><p className="text-charcoal-black font-black">v{study.version}.0</p></div>
              </div>

              <div className="flex flex-wrap gap-2">
                {study.tags?.split(',').map((tag: string, i: number) => (
                  <span key={i} className="bg-orange-50 text-primary-orange text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-wide border border-orange-100">{tag.trim()}</span>
                ))}
              </div>
            </section>

            <section className="space-y-8">
              <h3 className="text-meta-label text-charcoal-black text-[11px] uppercase tracking-[0.4em]">Manuscript Timeline</h3>
              <div className="relative pl-8 border-l-2 border-orange-100 space-y-12 ml-2">
                
                <div className="relative">
                  <div className={`absolute -left-[37px] top-1 w-5 h-5 rounded-full border-4 border-white shadow-xl cursor-pointer transition-all ${selectedVersion === study.version ? 'bg-primary-orange scale-125' : 'bg-orange-100'}`} onClick={() => setSelectedVersion(study.version)}></div>
                  <p className="text-[11px] font-black text-charcoal-black uppercase tracking-wide">v{study.version}.0 (Active Iteration)</p>
                  {selectedVersion === study.version && (
                    <div className="mt-6 bg-charcoal-black p-8 rounded-[2.5rem] text-white shadow-2xl">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-meta-label text-primary-orange uppercase">Coordinator Log</span>
                        {isCoordinator && (
                          <button onClick={() => setFeedbackEdit({version: study.version, text: study.feedback || ""})} className="text-[10px] uppercase font-black text-orange-500 hover:text-white transition-colors underline underline-offset-4">Edit Log</button>
                        )}
                      </div>
                      <p className="text-xs italic text-orange-100/60 leading-relaxed">"{study.feedback || "Access cleared. No remarks recorded."}"</p>
                    </div>
                  )}
                </div>

                {study.history?.filter((h: any) => h.version !== study.version).map((h: any, i: number) => (
                  <div key={i} className="relative">
                    <div className={`absolute -left-[37px] top-1 w-5 h-5 rounded-full border-4 border-white shadow-xl cursor-pointer transition-all ${selectedVersion === h.version ? 'bg-primary-orange scale-125' : 'bg-orange-100'}`} onClick={() => setSelectedVersion(h.version)}></div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wide">v{h.version}.0 Archived Entry</p>
                    {selectedVersion === h.version && (
                      <div className="mt-6 bg-slate-100 p-8 rounded-[2.5rem] text-charcoal-black border border-orange-100">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-[9px] font-black text-primary-orange uppercase tracking-widest">History Remark</span>
                          {isCoordinator && (
                            <button onClick={() => setFeedbackEdit({version: h.version, text: h.feedback || ""})} className="text-[10px] uppercase font-black text-primary-orange hover:text-charcoal-black transition-colors">Edit</button>
                          )}
                        </div>
                        <p className="text-xs italic text-slate-500 leading-relaxed">"{h.feedback || "No feedback recorded for this version."}"</p>
                      </div>
                    )}
                  </div>
                ))}
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
                <button onClick={() => { navigator.clipboard.writeText(citations[activeCitation as keyof typeof citations]!); alert("Buffer Updated!"); }} className="btn-terminal-primary w-full bg-charcoal-black text-white py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest hover:bg-primary-orange transition-all shadow-xl active:scale-95">Copy Citation</button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* MODALS */}

      {/* 1. Upload New Version Modal[cite: 11] */}
      {isVersionOpen && (
        <div className="fixed inset-0 z-[200] bg-charcoal-black/60 backdrop-blur-md flex items-center justify-center p-12">
          <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl w-full max-w-md border-t-8 border-primary-orange">
            <h2 className="text-3xl font-black uppercase mb-10 text-charcoal-black tracking-tight leading-none">Upload Revision</h2>
            <form onSubmit={handleUploadVersion} className="space-y-6">
              <div>
                <label className="text-meta-label block mb-2 ml-1">Version Title/Name</label>
                <input required value={versionForm.name} onChange={(e) => setVersionForm({...versionForm, name: e.target.value})} className="input-terminal w-full p-5" placeholder="e.g., Final Draft Revision" />
              </div>
              <div>
                <label className="text-meta-label block mb-2 ml-1">PDF Document</label>
                <input type="file" required accept="application/pdf" onChange={(e) => setVersionForm({...versionForm, file: e.target.files?.[0] || null})} className="w-full text-xs font-bold text-slate-400 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-ember-soft file:text-primary-orange hover:file:bg-primary-orange hover:file:text-white file:transition-all" />
              </div>
              <div className="flex gap-6 pt-6">
                <button type="button" onClick={() => setIsVersionOpen(false)} className="flex-1 font-black text-xs text-slate-400 uppercase hover:text-verified-red transition-colors">Abort</button>
                <button type="submit" className="btn-terminal-primary flex-1 py-5">Push Version</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* 2. feedbackEdit Modal for Coordinator */}
      {feedbackEdit && (
        <div className="fixed inset-0 z-[200] bg-charcoal-black/60 backdrop-blur-md flex items-center justify-center p-12">
          <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl w-full max-w-md border-t-8 border-charcoal-black">
            <h2 className="text-3xl font-black uppercase mb-4 text-charcoal-black tracking-tight leading-none">Modify Log</h2>
            <p className="text-meta-label mb-10 lowercase tracking-normal">Editing system log for version {feedbackEdit.version}.0</p>
            <textarea 
              rows={5} 
              value={feedbackEdit.text} 
              onChange={(e) => setFeedbackEdit({...feedbackEdit, text: e.target.value})} 
              className="input-terminal w-full p-6 text-sm resize-none" 
              placeholder="Enter new coordinator remarks..."
            />
            <div className="flex gap-6 pt-6">
              <button onClick={() => setFeedbackEdit(null)} className="flex-1 font-black text-xs text-slate-400 uppercase tracking-widest hover:text-verified-red transition-colors">Cancel</button>
              <button onClick={handleSaveFeedback} className="btn-terminal-primary flex-1 py-5">Update Log</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. isEditOpen Modal for Owners */}
      {isEditOpen && (
        <div className="fixed inset-0 z-[100] bg-charcoal-black/60 backdrop-blur-md flex items-center justify-center p-12">
          <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl w-full max-w-md border-t-8 border-charcoal-black">
            <h2 className="text-3xl font-black uppercase mb-10 text-charcoal-black tracking-tight leading-none">Update Record</h2>
            <form onSubmit={handleUpdateDetails} className="space-y-6">
              <input required value={editForm.title} onChange={(e) => setEditForm({...editForm, title: e.target.value})} className="input-terminal w-full p-6" placeholder="Manuscript Title" />
              <input required value={editForm.tags} onChange={(e) => setEditForm({...editForm, tags: e.target.value})} className="input-terminal w-full p-6" placeholder="Tags" />
              <div className="flex gap-6 pt-6">
                <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 font-black text-xs text-slate-400 uppercase tracking-widest hover:text-verified-red transition-colors">Abort</button>
                <button type="submit" className="btn-terminal-primary flex-1 py-5">Commit Change</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Preview;