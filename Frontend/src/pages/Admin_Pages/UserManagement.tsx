import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { adminService } from "../../services/adminService";
import { researchService } from "../../services/researchService";

const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const PAGE_SIZE = 5;

  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [studies, setStudies] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [userSearch, setUserSearch] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [logTimeFilter, setLogTimeFilter] = useState("all");
  
  // State for Tabs
  const [activeUserTab, setActiveUserTab] = useState("All Accounts");

  const [userPage, setUserPage] = useState(1);
  const [logPage, setLogPage] = useState(1);

  const roles = ["Student", "Faculty / Professional", "Admin"];
  const tabs = ["All Accounts", "Student", "Faculty / Professional", "Admin"];

  const parseSafeDate = (timestamp: any) => {
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? null : d;
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Parallel sync fetching Users, Logs, and Research Data for stats
      const [userData, logData, studiesData] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getAuditLogs(),
        researchService.getAll().catch(() => []) // Graceful fallback
      ]);
      setUsers(Array.isArray(userData) ? userData : []);
      setLogs(Array.isArray(logData) ? logData : []);
      setStudies(Array.isArray(studiesData) ? studiesData : []);
    } catch (e) { 
      console.error("Registry Synchronization Failed"); 
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle Secure Metadata Export
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const backupData = await adminService.exportMetadata();
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Scholar_Archive_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Metadata Export Protocol Failed.");
    } finally {
      setIsExporting(false);
    }
  };

  // --- Statistics & Graphing Logic ---
  
  // 1. User Demographics
  const userStats = useMemo(() => {
    const total = users.length || 1; // prevent division by zero
    const students = users.filter(u => (u.userType || u.UserType) === "Student").length;
    const faculty = users.filter(u => (u.userType || u.UserType) === "Faculty / Professional").length;
    const admins = users.filter(u => (u.userType || u.UserType) === "Admin").length;
    
    return {
      total: users.length,
      students,
      faculty,
      admins,
      pStudents: (students / total) * 100,
      pFaculty: (faculty / total) * 100,
      pAdmins: (admins / total) * 100
    };
  }, [users]);

  // 2. Content Analytics (Tags & Categories)
  const contentStats = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};

    studies.forEach(s => {
      const cat = s.category || s.Category;
      if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      const tags = s.tags || s.Tags;
      if (tags) {
        tags.split(',').map((t: string) => t.trim()).filter(Boolean).forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    const maxCatCount = Math.max(...Object.values(categoryCounts), 1);
    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // Get top 5 categories
      .map(([name, count]) => ({ name, count, percent: (count / maxCatCount) * 100 }));

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15) // Get top 15 tags
      .map(([name, count]) => ({ name, count }));

    return { topCategories, topTags, totalStudies: studies.length };
  }, [studies]);

  // --- Filtering Logic ---
  const filteredUsers = users.filter(u => {
    const role = u.userType || u.UserType;
    const matchTab = activeUserTab === "All Accounts" || role === activeUserTab;
    
    const name = (u.fullName || u.FullName || "").toLowerCase();
    const email = (u.email || u.Email || "").toLowerCase();
    const matchSearch = name.includes(userSearch.toLowerCase()) || email.includes(userSearch.toLowerCase());
    
    return matchTab && matchSearch;
  });

  const filteredLogs = logs.filter(log => {
    const action = (log.action || log.Action || "").toLowerCase();
    const details = (log.details || log.Details || "").toLowerCase();
    const timestamp = log.timestamp || log.Timestamp;
    
    if (!(`${action} ${details}`.includes(logSearch.toLowerCase()))) return false;
    if (logTimeFilter === "all") return true;

    const logDate = parseSafeDate(timestamp);
    if (!logDate) return false; 
    const diffDays = (new Date().getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24);

    if (logTimeFilter === "day") return diffDays <= 1;
    if (logTimeFilter === "month") return diffDays <= 30;
    if (logTimeFilter === "year") return diffDays <= 365;
    return true;
  });

  const pUsers = filteredUsers.slice((userPage - 1) * PAGE_SIZE, userPage * PAGE_SIZE);
  const pLogs = filteredLogs.slice((logPage - 1) * PAGE_SIZE, logPage * PAGE_SIZE);

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-white text-meta-label animate-pulse uppercase tracking-widest">Synchronizing Oversight Terminal...</div>;

  return (
    <div className="min-h-screen bg-white font-sans antialiased text-charcoal-black selection:bg-primary-orange/20">
      
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-primary-orange rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black tracking-[0.3em] uppercase opacity-70">Oversight Terminal</span>
        </div>
        <button onClick={() => {localStorage.clear(); navigate("/Login");}} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary-orange transition-colors">Terminate Session</button>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-16">
        <header className="mb-16">
          <h1 className="text-6xl font-black uppercase tracking-tighter leading-none mb-3">REGISTRY <span className="text-primary-orange">/ ARCHIVE</span></h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">System Control Console</p>
        </header>

        {/* 1. Statistics Graphs (Demographics) */}
        <section className="mb-16 space-y-8">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
             <h2 className="text-xl font-black uppercase tracking-tight">System Demographics</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="col-span-1 md:col-span-4 bg-slate-50 border border-slate-100 p-8 rounded-[2rem] shadow-sm">
              <div className="flex justify-between items-end mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total User Distribution</span>
                <span className="text-3xl font-black text-charcoal-black tracking-tighter">{userStats.total}</span>
              </div>
              
              {/* Stacked Bar Chart */}
              <div className="w-full h-6 flex rounded-full overflow-hidden bg-slate-200">
                {userStats.pStudents > 0 && <div style={{ width: `${userStats.pStudents}%` }} className="bg-blue-500 hover:opacity-80 transition-opacity" title={`Students: ${userStats.students}`}></div>}
                {userStats.pFaculty > 0 && <div style={{ width: `${userStats.pFaculty}%` }} className="bg-emerald-500 hover:opacity-80 transition-opacity" title={`Faculty: ${userStats.faculty}`}></div>}
                {userStats.pAdmins > 0 && <div style={{ width: `${userStats.pAdmins}%` }} className="bg-primary-orange hover:opacity-80 transition-opacity" title={`Admins: ${userStats.admins}`}></div>}
              </div>
            </div>

            {/* Individual Metric Cards */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Student</span>
              <div className="flex justify-between items-end">
                 <span className="text-4xl font-black tracking-tighter text-blue-500">{userStats.students}</span>
                 <span className="text-[10px] font-bold text-slate-400 mb-1">{Math.round(userStats.pStudents)}%</span>
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Faculty / Prof.</span>
              <div className="flex justify-between items-end">
                 <span className="text-4xl font-black tracking-tighter text-emerald-500">{userStats.faculty}</span>
                 <span className="text-[10px] font-bold text-slate-400 mb-1">{Math.round(userStats.pFaculty)}%</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary-orange"></div> Admin</span>
              <div className="flex justify-between items-end">
                 <span className="text-4xl font-black tracking-tighter text-primary-orange">{userStats.admins}</span>
                 <span className="text-[10px] font-bold text-slate-400 mb-1">{Math.round(userStats.pAdmins)}%</span>
              </div>
            </div>

             <div className="bg-charcoal-black border border-charcoal-black p-6 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-6 flex items-center gap-2"><i className="fa-solid fa-bolt text-yellow-400"></i> Total Traffic</span>
              <div className="flex justify-between items-end">
                 <span className="text-4xl font-black tracking-tighter text-white">{logs.length}</span>
                 <span className="text-[10px] font-bold text-white/40 mb-1 uppercase">Operations</span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Repository Content Analytics */}
        <section className="mb-24 space-y-8">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
             <h2 className="text-xl font-black uppercase tracking-tight">Repository Analytics</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Categories Graph */}
            <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm flex flex-col">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-8">Dominant Categories</h3>
              
              <div className="space-y-5 flex-1">
                {contentStats.topCategories.length > 0 ? contentStats.topCategories.map((cat, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] font-bold uppercase text-charcoal-black">{cat.name}</span>
                      <span className="text-[10px] font-black text-primary-orange">{cat.count} Docs</span>
                    </div>
                    <div className="w-full h-2.5 bg-orange-50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary-orange rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${cat.percent}%` }}
                      ></div>
                    </div>
                  </div>
                )) : (
                  <div className="h-full flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">No Category Data</span>
                  </div>
                )}
              </div>
            </div>

            {/* Trending Tags Cloud */}
            <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Trending Tags</h3>
                <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-md uppercase tracking-widest">Top {contentStats.topTags.length}</span>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {contentStats.topTags.length > 0 ? contentStats.topTags.map((tag, i) => (
                  <div key={i} className="flex items-center gap-2 bg-orange-50/50 hover:bg-orange-50 border border-orange-100 px-4 py-2.5 rounded-xl transition-colors cursor-default">
                    <span className="text-[10px] font-black uppercase text-charcoal-black">{tag.name}</span>
                    <span className="bg-white text-primary-orange shadow-sm text-[9px] font-black px-2 py-0.5 rounded-md">
                      {tag.count}
                    </span>
                  </div>
                )) : (
                  <div className="w-full h-32 flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">No Tag Data</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Researcher Registry with Tabs */}
        <section className="mb-24">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-xl font-black uppercase tracking-tight">Researcher Registry</h2>
            <input type="text" placeholder="SEARCH REGISTRY..." className="outline-none text-[10px] font-black uppercase tracking-widest text-primary-orange w-64 bg-transparent border-b border-orange-100 pb-1 focus:border-primary-orange transition-colors" value={userSearch} onChange={(e) => {setUserSearch(e.target.value); setUserPage(1);}} />
          </div>

          {/* Interactive Tabs */}
          <div className="flex gap-8 mb-6 border-b border-slate-100 overflow-x-auto scrollbar-hide">
             {tabs.map((tab) => (
               <button 
                 key={tab} 
                 onClick={() => { setActiveUserTab(tab); setUserPage(1); }} 
                 className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeUserTab === tab ? "text-primary-orange" : "text-slate-300 hover:text-charcoal-black"}`}
               >
                 {tab}
                 {activeUserTab === tab && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary-orange"></div>}
               </button>
             ))}
          </div>

          <div className="border border-slate-200 rounded-manuscript overflow-hidden bg-white mb-6 shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest">Identify</th>
                  <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest">Protocol</th>
                  <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pUsers.length > 0 ? pUsers.map((u) => (
                  <tr key={u.id || u.Id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <p className="text-charcoal-black font-black text-xs uppercase mb-1">{u.fullName || u.FullName || "Unknown"}</p>
                      <p className="text-slate-400 text-[10px] font-bold">{u.email || u.Email}</p>
                    </td>
                    <td className="px-8 py-6">
                      <select value={u.userType || u.UserType} onChange={(e) => adminService.updateUserRole(u.id || u.Id, e.target.value).then(loadData)} className="bg-transparent text-[10px] font-black uppercase border-b-2 border-slate-100 outline-none pb-1 focus:border-primary-orange">
                        {roles.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button onClick={() => { if(window.confirm("Delete record?")) adminService.deleteUser(u.id || u.Id).then(loadData); }} className="text-[9px] font-black text-slate-300 hover:text-red-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Delete Account</button>
                    </td>
                  </tr>
                )) : <tr><td colSpan={3} className="p-20 text-center text-slate-200 font-black uppercase tracking-widest">No Records Found in {activeUserTab}</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex justify-center items-center gap-6">
            <button disabled={userPage === 1} onClick={() => setUserPage(p => p - 1)} className="text-[10px] font-black uppercase text-slate-400 hover:text-primary-orange disabled:opacity-10 transition-colors">Previous</button>
            <span className="text-[10px] font-black text-primary-orange uppercase tracking-widest">Page {userPage}</span>
            <button disabled={userPage * PAGE_SIZE >= filteredUsers.length} onClick={() => setUserPage(p => p + 1)} className="text-[10px] font-black uppercase text-slate-400 hover:text-primary-orange disabled:opacity-10 transition-colors">Next</button>
          </div>
        </section>

        {/* 4. Audit Archive */}
        <section className="mb-24">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-slate-100 pb-4 gap-6">
            <div className="space-y-4">
              <h2 className="text-xl font-black uppercase tracking-tight">Audit Archive</h2>
              <div className="flex gap-4">
                {["all", "day", "month", "year"].map(time => (
                  <button key={time} onClick={() => {setLogTimeFilter(time); setLogPage(1);}} className={`text-[9px] font-black uppercase tracking-[0.2em] pb-1 border-b-2 transition-all ${logTimeFilter === time ? "border-primary-orange text-charcoal-black" : "border-transparent text-slate-200 hover:text-slate-400"}`}>{time}</button>
                ))}
              </div>
            </div>
            <input type="text" placeholder="SEARCH ARCHIVE..." className="outline-none text-[10px] font-black uppercase tracking-widest text-primary-orange w-64 bg-transparent border-b border-orange-100 pb-1 focus:border-primary-orange transition-colors" value={logSearch} onChange={(e) => {setLogSearch(e.target.value); setLogPage(1);}} />
          </div>

          <div className="border border-slate-200 rounded-manuscript overflow-hidden bg-white mb-6 shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest">Protocol</th>
                  <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest">Operation Details</th>
                  <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pLogs.length > 0 ? pLogs.map((l) => {
                  const date = parseSafeDate(l.timestamp || l.Timestamp);
                  return (
                    <tr key={l.id || l.Id || Math.random()} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6"><span className="bg-charcoal-black text-white px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter">{l.action || l.Action}</span></td>
                      <td className="px-8 py-6 text-[10px] font-medium text-slate-500 max-w-sm">{l.details || l.Details}</td>
                      <td className="px-8 py-6 text-[10px] font-black text-slate-400 text-right uppercase">
                        {date ? <>{date.toLocaleDateString()} <span className="opacity-40 ml-2">{date.toLocaleTimeString()}</span></> : "N/A"}
                      </td>
                    </tr>
                  );
                }) : <tr><td colSpan={3} className="p-20 text-center text-slate-200 font-black uppercase tracking-widest">Audit Archive Empty</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex justify-center items-center gap-6">
            <button disabled={logPage === 1} onClick={() => setLogPage(p => p - 1)} className="text-[10px] font-black uppercase text-slate-400 hover:text-primary-orange disabled:opacity-10 transition-colors">Previous</button>
            <span className="text-[10px] font-black text-primary-orange uppercase tracking-widest">Log Page {logPage}</span>
            <button disabled={logPage * PAGE_SIZE >= filteredLogs.length} onClick={() => setLogPage(p => p + 1)} className="text-[10px] font-black uppercase text-slate-400 hover:text-primary-orange disabled:opacity-10 transition-colors">Next</button>
          </div>
        </section>

        {/* 5. System Tools */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-16">
          <div className="p-10 border border-slate-200 rounded-2xl bg-slate-50/30">
            <h3 className="text-sm font-black uppercase mb-2">Node Configuration</h3>
            <p className="text-[11px] text-slate-400 font-medium mb-4 leading-relaxed">System-wide limits for repository node density and manuscript constraints.</p>
            <span className="text-[9px] font-black uppercase text-slate-300 tracking-widest cursor-not-allowed">Access Restricted</span>
          </div>
          <button disabled={isExporting} onClick={handleExport} className={`p-10 bg-charcoal-black rounded-2xl transition-all text-left shadow-lg group ${isExporting ? 'opacity-50 cursor-wait' : 'hover:bg-primary-orange'}`}>
            <h3 className="text-sm font-black uppercase mb-2 text-white">Metadata Preservation</h3>
            <p className="text-[11px] text-white/40 font-medium group-hover:text-white/80 transition-colors mb-4 leading-relaxed">{isExporting ? "SYNCHRONIZING STREAM..." : "Execute secure JSON export of all registry metadata."}</p>
            <span className="text-[10px] font-black uppercase text-white tracking-widest border-b border-white/20">Initiate Export Protocol</span>
          </button>
        </section>
      </main>
    </div>
  );
};

export default UserManagement;