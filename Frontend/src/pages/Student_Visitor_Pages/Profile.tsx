import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { researchService } from "../../services/researchService";

// Interface for type safety[cite: 9]
interface ResearchItem {
  id: number;
  title: string;
  category: string;
  coordinator: { name: string; email: string };
  researchers: Array<{ name: string; email: string }>;
  views: number;
  validations: number;
  status: string;
  createdAt: string;
  tags?: string;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  
  // Account info from local storage[cite: 9]
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  
  const [stats, setStats] = useState({ totalViews: 0, totalValidations: 0, studyCount: 0 });
  const [featuredStudy, setFeaturedStudy] = useState<ResearchItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    researchService.getAll()
      .then((allStudies: ResearchItem[]) => {
        // Filter studies based on email[cite: 9]
        const myStudies = allStudies.filter((s: ResearchItem) => {
          const isCoord = s.coordinator?.email === currentUser.email;
          const isResearcher = s.researchers?.some((r: any) => r.email === currentUser.email);
          return isCoord || isResearcher;
        });

        const totalViews = myStudies.reduce((acc: number, s: ResearchItem) => acc + (Number(s.views) || 0), 0);
        const totalValidations = myStudies.reduce((acc: number, s: ResearchItem) => acc + (Number(s.validations) || 0), 0);

        const topStudy = myStudies.length > 0 
          ? [...myStudies].sort((a, b) => (b.views || 0) - (a.views || 0))[0] 
          : null;

        setStats({ 
            totalViews: totalViews, 
            totalValidations: totalValidations, 
            studyCount: myStudies.length 
        });
        setFeaturedStudy(topStudy);
        setLoading(false);
      })
      .catch(err => {
        console.error("Profile API Error:", err);
        setLoading(false);
      });
  }, [currentUser.email]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-warm-white">
      <span className="text-meta-label animate-pulse">Accessing Archive Data...</span>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-warm-white font-sans antialiased text-charcoal-black">
      <Sidebar />
      <main className="ml-20 flex-1 relative">
        
        {/* Solid Brand Banner (No Fades)[cite: 5] */}
        <div className="h-64 w-full bg-charcoal-black border-b border-primary-orange" />
        
        <div className="px-8 md:px-12 -mt-32 relative z-10 pb-20 max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* 1. Account Info Card[cite: 9] */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-10 rounded-manuscript shadow-2xl border border-orange-100 flex flex-col items-center">
                <div className="w-40 h-40 bg-ember-soft rounded-[2.5rem] border-4 border-white shadow-xl mb-8 flex items-center justify-center relative overflow-hidden">
                   <i className="fa-solid fa-user-shield text-7xl text-orange-200"></i>
                </div>

                <h1 className="text-3xl font-black tracking-tight uppercase text-black leading-none mb-2">{currentUser.fullName}</h1> 
                <span className="badge-verified mb-4">{currentUser.userType}</span> 
                <p className="text-meta-label tracking-wide lowercase mb-8">{currentUser.email}</p> 
                
                <div className="w-full pt-10 border-t border-orange-50 space-y-8 text-left">
                  <div className="flex justify-between items-center bg-ember-soft p-4 rounded-2xl border border-orange-100">
                    <span className="text-meta-label">User Reference ID</span> 
                    <p className="text-data-value">#{currentUser.id}</p> 
                  </div>

                  {/* Restored Birth Date Field[cite: 9] */}
                  <div className="flex justify-between items-center px-2">
                    <span className="text-meta-label">Birth Date</span> 
                    <p className="text-data-value normal-case">
                        {currentUser.birthDate ? new Date(currentUser.birthDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "Not Provided"}
                    </p> 
                  </div>

                  <div className="flex justify-between items-center px-2">
                    <span className="text-meta-label">Organization</span> 
                    <p className="text-data-value normal-case">{currentUser.organization || "Independent"}</p> 
                  </div>

                  <button className="btn-terminal-primary w-full mt-4">Secure Logout</button>
                </div>
              </div>
            </div>

            {/* 2. Research Metrics & Top Study[cite: 9] */}
            <div className="lg:col-span-8 space-y-10">
              
              {/* Solid Metric Boxes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Total Reach", val: stats.totalViews, icon: "fa-eye", color: "text-primary-orange" },
                  { label: "Validations", val: stats.totalValidations, icon: "fa-check-double", color: "text-green-600" },
                  { label: "Submissions", val: stats.studyCount, icon: "fa-file-signature", color: "text-black" }
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-8 rounded-terminal border border-orange-50 shadow-sm flex flex-col items-center justify-center">
                    <i className={`fa-solid ${stat.icon} text-orange-100 text-2xl mb-4`}></i>
                    <span className={`text-4xl font-black ${stat.color} tracking-tighter`}>{stat.val}</span>
                    <span className="text-meta-label mt-2">{stat.label}</span> 
                  </div>
                ))}
              </div>

              {/* Featured Study Section */}
              <div className="space-y-8">
                <div className="flex items-center gap-6">
                   <h2 className="text-h2 text-[12px] tracking-widest">Top Performing Study</h2> 
                   <div className="flex-1 h-px bg-orange-100"></div>
                </div>

                {featuredStudy ? (
                  <div className="card-manuscript group border-2 border-orange-100">
                    <div className="absolute top-0 left-0 w-3 h-0 group-hover:h-full bg-primary-orange transition-all duration-700"></div>
                    
                    <div className="flex flex-col md:flex-row gap-10">
                      <div className="w-full md:w-56 h-56 bg-ember-soft rounded-[2.5rem] flex items-center justify-center text-orange-100 group-hover:bg-primary-orange group-hover:text-white transition-all duration-700 shrink-0">
                        <i className="fa-solid fa-file-pdf text-7xl"></i>
                      </div>

                      <div className="flex-1 flex flex-col py-2">
                        <div className="flex justify-between items-start mb-6">
                          <span className="badge-verified">Top Manuscript</span>
                          <div className="flex gap-6 text-meta-label">
                            <span><i className="fa-solid fa-eye mr-2"></i>{featuredStudy.views} Views</span> 
                            <span><i className="fa-solid fa-check mr-2 text-green-500"></i>{featuredStudy.validations} Points</span> 
                          </div>
                        </div>

                        <h3 className="text-2xl font-black mb-6 uppercase leading-tight text-black group-hover:text-primary-orange transition-colors">
                          {featuredStudy.title}
                        </h3>
                        
                        {/* Tags Display[cite: 5] */}
                        <div className="flex flex-wrap gap-2 mb-10">
                           {featuredStudy.tags?.split(',').map((tag, i) => (
                             <span key={i} className="bg-ember-soft text-primary-orange text-[9px] font-black px-3 py-1.5 rounded-lg uppercase border border-orange-100 tracking-widest">
                               {tag.trim()}
                             </span>
                           ))}
                        </div>

                        <div className="flex items-center justify-between pt-8 border-t border-orange-50 mt-auto">
                          <div className="flex flex-col">
                            <span className="text-meta-label text-[9px] mb-1">Archived Date</span>
                            <span className="text-data-value text-slate-500">
                                {new Date(featuredStudy.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          <button onClick={() => navigate(`/preview/${featuredStudy.id}`)} className="btn-terminal-primary">
                            Open Study
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 bg-white rounded-manuscript border-2 border-dashed border-orange-50 flex flex-col items-center justify-center">
                    <p className="text-meta-label opacity-40">No entries currently archived.</p>
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