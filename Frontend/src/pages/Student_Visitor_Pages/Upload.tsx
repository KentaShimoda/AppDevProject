import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../../services/apiConfig";

const Upload: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // Check for Research ID
  const isVersionMode = !!id; // Auto-detect mode
  
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  // State Management
  const [researchers, setResearchers] = useState([
    { name: currentUser.fullName || "", email: currentUser.email || "" }
  ]);
  const [coordinator, setCoordinator] = useState({ name: "", email: "" });
  const [formData, setFormData] = useState({ title: "", tags: "", versionName: "" }); 
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const addResearcher = () => setResearchers([...researchers, { name: "", email: "" }]);
  
  const removeResearcher = (index: number) => {
    if (index !== 0 && researchers.length > 1) {
      setResearchers(researchers.filter((_, i) => i !== index));
    }
  };

  const handleResearcherChange = (index: number, field: string, value: string) => {
    if (index === 0) return;
    const updated = [...researchers];
    (updated[index] as any)[field] = value;
    setResearchers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return alert("Please select a PDF.");

    setIsUploading(true);
    const data = new FormData();
    const token = localStorage.getItem("token");

    try {
      let response;
      
      if (isVersionMode) {
        // MODE A: Upload New Version API
        data.append("VersionName", formData.versionName);
        data.append("PdfFile", selectedFile);
        
        response = await fetch(`${API_BASE_URL}/Research/${id}/version`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: data
        });
      } else {
        // MODE B: Standard New Submission API[cite: 10, 11]
        data.append("Title", formData.title);
        data.append("Tags", formData.tags); 
        data.append("CoordinatorName", coordinator.name);
        data.append("CoordinatorEmail", coordinator.email);
        data.append("ResearcherNames", researchers.map(r => r.name).join(", "));
        data.append("ResearcherEmails", researchers.map(r => r.email).join(", "));
        data.append("PdfFile", selectedFile);

        response = await fetch(`${API_BASE_URL}/Research/upload`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: data
        });
      }

      if (response.ok) {
        alert(isVersionMode ? "Revision pushed successfully!" : "Upload successful!");
        navigate("/Dashboard");
      } else {
        const err = await response.json();
        throw new Error(err.message || "Upload failed");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-white font-sans antialiased flex flex-col text-charcoal-black">
      {/* 1. Header (Mode-Aware) */}
      <header className="h-24 bg-white border-b border-orange-100 px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="w-12 h-12 rounded-2xl border border-orange-100 flex items-center justify-center text-charcoal-black hover:border-charcoal-black transition-all">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <span className="text-meta-label block mb-1">Scholar Terminal</span>
            <h1 className="text-xl font-black uppercase tracking-tight leading-none">
              {isVersionMode ? "Push Manuscript Revision" : "New Manuscript Submission"}
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 md:p-12 max-w-[1600px] mx-auto w-full">
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-10 items-start">
          
          {/* 2. File Upload Sidebar */}
          <div className="w-full lg:w-[450px] sticky lg:top-36">
            <div className="card-manuscript relative">
              <div className="absolute top-0 left-0 w-2 h-full bg-primary-orange"></div>
              <h2 className="text-meta-label mb-8">01. {isVersionMode ? "Revised" : "Digital"} Manuscript</h2>
              <div 
                onClick={() => fileInputRef.current?.click()} 
                className={`w-full aspect-square rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${selectedFile ? 'border-primary-orange bg-ember-soft' : 'border-orange-100 bg-warm-white hover:border-primary-orange'}`}
              >
                <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])} className="hidden" accept="application/pdf" />
                <i className={`fa-solid ${selectedFile ? 'fa-check-circle text-primary-orange' : 'fa-cloud-arrow-up text-orange-200'} text-6xl mb-6`}></i>
                <p className="text-data-value text-center px-6 leading-relaxed">
                  {selectedFile ? selectedFile.name : "Select PDF Document"}
                </p>
                {!selectedFile && <span className="text-[10px] font-black text-orange-300 uppercase tracking-widest mt-4">Required Format: PDF</span>}
              </div>
            </div>
          </div>

          {/* 3. Form Details (Changes based on isVersionMode) */}
          <div className="flex-1 space-y-10">
            <div className="bg-white p-12 rounded-manuscript shadow-2xl border border-orange-50 space-y-12">
              
              {isVersionMode ? (
                /* VERSION REVISION MODE: Only show Version Name[cite: 10] */
                <section>
                  <div className="flex items-center gap-6 mb-10">
                    <h2 className="text-h2 text-[12px] tracking-widest uppercase">02. Revision Context</h2>
                    <div className="flex-1 h-px bg-orange-100"></div>
                  </div>
                  <div className="w-full">
                    <label className="text-meta-label block mb-3 ml-1">Version Title (e.g., Final Draft, Review Revision)</label>
                    <input required value={formData.versionName} onChange={(e) => setFormData({...formData, versionName: e.target.value})} className="input-terminal px-6 py-5" placeholder="Name this specific version..." />
                  </div>
                </section>
              ) : (
                /* NEW SUBMISSION MODE: Show all metadata sections */
                <>
                  <section>
                    <div className="flex items-center gap-6 mb-10">
                      <h2 className="text-h2 text-[12px] tracking-widest uppercase">02. Study Metadata</h2>
                      <div className="flex-1 h-px bg-orange-100"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                      <div className="md:col-span-8">
                        <label className="text-meta-label block mb-3 ml-1">Research Title</label>
                        <input required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="input-terminal px-6 py-5" placeholder="Enter official study title..." />
                      </div>
                      <div className="md:col-span-4">
                        <label className="text-meta-label block mb-3 ml-1">Tags</label>
                        <input required value={formData.tags} onChange={(e) => setFormData({...formData, tags: e.target.value})} className="input-terminal px-6 py-5" placeholder="AI, Robotics, Data" />
                      </div>
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center gap-6 mb-10">
                      <h2 className="text-h2 text-[12px] tracking-widest uppercase">03. Faculty Coordinator</h2>
                      <div className="flex-1 h-px bg-orange-100"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-ember-soft p-8 rounded-[2.5rem] border border-orange-100">
                      <div>
                        <label className="text-meta-label block mb-3 ml-1">Full Name</label>
                        <input required value={coordinator.name} onChange={(e) => setCoordinator({...coordinator, name: e.target.value})} placeholder="Lead Faculty Name" className="w-full bg-white rounded-xl px-6 py-4 text-data-value outline-none border border-orange-50 focus:border-primary-orange" />
                      </div>
                      <div>
                        <label className="text-meta-label block mb-3 ml-1">Institutional Email</label>
                        <input required value={coordinator.email} onChange={(e) => setCoordinator({...coordinator, email: e.target.value})} placeholder="faculty@institution.edu" className="w-full bg-white rounded-xl px-6 py-4 text-data-value outline-none border border-orange-50 focus:border-primary-orange" />
                      </div>
                    </div>
                  </section>

                  <section>
                    <div className="flex justify-between items-center mb-10">
                      <div className="flex items-center gap-6 flex-1">
                        <h2 className="text-h2 text-[12px] tracking-widest uppercase">04. Research Team</h2>
                        <div className="flex-1 h-px bg-orange-100"></div>
                      </div>
                      <button type="button" onClick={addResearcher} className="btn-terminal-secondary py-2 px-6 ml-6">Add Member</button>
                    </div>
                    <div className="space-y-6">
                      {researchers.map((res, index) => (
                        <div key={index} className={`grid grid-cols-1 md:grid-cols-[1fr_1fr_60px] gap-6 items-center p-6 rounded-[2.5rem] border transition-all ${index === 0 ? 'bg-ember-soft border-primary-orange/30' : 'bg-white border-orange-100'}`}>
                          <div className="relative">
                            {index === 0 && <i className="fa-solid fa-lock absolute -left-2 -top-2 text-[10px] text-primary-orange bg-white p-1 rounded-full border border-orange-100"></i>}
                            <input required readOnly={index === 0} value={res.name} onChange={(e) => handleResearcherChange(index, 'name', e.target.value)} placeholder="Full Name" className={`w-full rounded-xl px-6 py-4 text-data-value outline-none ${index === 0 ? 'bg-white/50 text-slate-400' : 'bg-warm-white focus:border-primary-orange'}`} />
                          </div>
                          <input required readOnly={index === 0} value={res.email} onChange={(e) => handleResearcherChange(index, 'email', e.target.value)} placeholder="Institutional Email" className={`w-full rounded-xl px-6 py-4 text-data-value outline-none ${index === 0 ? 'bg-white/50 text-slate-400' : 'bg-warm-white focus:border-primary-orange'}`} />
                          {index !== 0 ? (
                            <button type="button" onClick={() => removeResearcher(index)} className="text-orange-200 hover:text-verified-red transition-colors text-xl"><i className="fa-solid fa-circle-minus"></i></button>
                          ) : (
                            <div className="flex items-center justify-center text-primary-orange opacity-40"><i className="fa-solid fa-shield-halved text-xl"></i></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {/* Submit Button */}
              <button 
                disabled={isUploading} 
                type="submit" 
                className={`btn-terminal-primary w-full py-6 text-xs tracking-[0.3em] ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isUploading ? (
                  <span className="flex items-center justify-center gap-3">
                    <i className="fa-solid fa-circle-notch fa-spin"></i> Synchronizing...
                  </span>
                ) : (isVersionMode ? "Push Updated Manuscript" : "Finalize and Publish Manuscript")}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default Upload;