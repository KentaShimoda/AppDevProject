import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { researchService } from "../../services/researchService";
import { Document, Page, pdfjs } from 'react-pdf';

// 🚀 PDF Worker Initialization for manuscript thumbnails
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  
  // Requirement: Extract user identity from local storage[cite: 12]
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  
  const [stats, setStats] = useState({ totalViews: 0, totalValidations: 0, studyCount: 0 });
  const [featuredStudy, setFeaturedStudy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🚀 Protocol: Stability fix for JSONB and raw strings to prevent render crashes[cite: 12]
  const safeParse = (data: any, fallback: any) => {
    if (!data) return fallback;
    if (typeof data === 'string' && data.trim().length > 0) {
      try { return JSON.parse(data); } catch { return fallback; }
    }
    return (Array.isArray(data) || typeof data === 'object') ? data : fallback;
  };

  const fetchProfileData = useCallback(() => {
    setLoading(true);
    // 🚀 Protocol: Fetch registry and filter for personal involvement[cite: 12]
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

        // Logic: Identify the manuscript with the highest reach[cite: 12]
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

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-warm-white">
      <span className="text-meta-label animate-pulse uppercase tracking-[0.3em]">Accessing Personal Archive...</span>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-warm-white font-sans antialiased text-charcoal-black">
      <Sidebar />
      <main className="ml-20 flex-1 relative">
        
        {/* Solid Brand Banner[cite: 12] */}
        <div className="h-64 w-full bg-charcoal-black border-b border-primary-orange" />
        
        <div className="px-8 md:px-12 -mt-32 relative z-10 pb-20 max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* 1. Account Info Card[cite: 12] */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-10 rounded-manuscript shadow-2xl border border-orange-100 flex flex-col items-center">
                <div className="w-40 h-40 bg-ember-soft rounded-[2.5rem] border-4 border-white shadow-xl mb-8 flex items-center justify-center relative overflow-hidden">
                   <i className="fa-solid fa-user-shield text-7xl text-orange-200"></i>
                </div>

                <h1 className="text-3xl font-black tracking-tight uppercase text-black leading-none mb-2">{currentUser.fullName}</h1> 
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

            {/* 2. Research Metrics & Top Study[cite: 12] */}
            <div className="lg:col-span-8 space-y-10">
              
              {/* Metrics Grid[cite: 12] */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Total Reach", val: stats.totalViews, icon: "fa-eye", color: "text-primary-orange" },
                  { label: "Validations", val: stats.totalValidations, icon: "fa-check-double", color: "text-green-600" },
                  { label: "Submissions", val: stats.studyCount, icon: "fa-file-signature", color: "text-black" }
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-8 rounded-terminal border border-orange-50 shadow-sm flex flex-col items-center justify-center transition-transform hover:scale-105">
                    <i className={`fa-solid ${stat.icon} text-orange-100 text-2xl mb-4`}></i>
                    <span className={`text-4xl font-black ${stat.color} tracking-tighter`}>{stat.val}</span>
                    <span className="text-meta-label mt-2 uppercase tracking-widest text-[9px]">{stat.label}</span> 
                  </div>
                ))}
              </div>

              {/* Top Performing Study Section[cite: 12] */}
              <div className="space-y-8">
                <div className="flex items-center gap-6">
                   <h2 className="text-h2 text-[12px] tracking-widest uppercase font-black">Top Performing Manuscript</h2> 
                   <div className="flex-1 h-px bg-orange-100"></div>
                </div>

                {featuredStudy ? (
                  <div className="card-manuscript group border border-orange-100 bg-white relative overflow-hidden p-8 rounded-manuscript shadow-xl">
                    <div className="absolute top-0 left-0 w-3 h-0 group-hover:h-full bg-primary-orange transition-all duration-700"></div>
                    
                    <div className="flex flex-col md:flex-row gap-10">
                      
                      {/* 🚀 PDF Preview Thumbnail Protocol */}
                      <div className="w-full md:w-56 h-56 bg-ember-soft rounded-[2.5rem] flex flex-col items-center justify-center text-orange-200 group-hover:text-white transition-all duration-700 shrink-0 overflow-hidden relative border border-orange-100/50">
                        <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-10 transition-opacity">
                           <i className="fa-solid fa-file-pdf text-7xl"></i>
                        </div>
                        <div className="z-10 scale-[0.35] origin-center">
                          <Document 
                            file={researchService.getViewUrl(featuredStudy.id)} 
                            loading={<i className="fa-solid fa-circle-notch fa-spin text-4xl text-primary-orange"></i>}
                          >
                            <Page pageNumber={1} renderTextLayer={false} renderAnnotationLayer={false} width={400} />
                          </Document>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col py-2">
                        <div className="flex justify-between items-start mb-6">
                          <span className="badge-verified bg-green-50 text-green-600 border-green-100 px-4 py-2 rounded-xl text-[9px] font-black uppercase">Top Iteration</span>
                          <div className="flex gap-6 text-meta-label text-[10px] uppercase font-black">
                            <span><i className="fa-solid fa-eye mr-2 text-primary-orange"></i>{featuredStudy.views} Views</span> 
                            <span><i className="fa-solid fa-check mr-2 text-green-500"></i>{featuredStudy.validations} Pts</span> 
                          </div>
                        </div>

                        <h3 className="text-2xl font-black mb-6 uppercase leading-tight text-black group-hover:text-primary-orange transition-colors">
                          {featuredStudy.title}
                        </h3>
                        
                        <div className="flex flex-wrap gap-2 mb-10">
                           {featuredStudy.tags?.split(',').map((tag: string, i: number) => (
                             <span key={i} className="bg-ember-soft text-primary-orange text-[9px] font-black px-3 py-1.5 rounded-lg uppercase border border-orange-100 tracking-widest">
                               {tag.trim()}
                             </span>
                           ))}
                        </div>

                        <div className="flex items-center justify-between pt-8 border-t border-orange-50 mt-auto">
                          <div className="flex flex-col">
                            <span className="text-meta-label text-[9px] mb-1 uppercase tracking-tighter">Archive Entry Date</span>
                            <span className="text-data-value text-slate-500 text-[10px]">
                                {new Date(featuredStudy.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          <button onClick={() => navigate(`/preview/${featuredStudy.id}`)} className="btn-terminal-primary px-8 py-3 bg-charcoal-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary-orange transition-all">
                            Open Study
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
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