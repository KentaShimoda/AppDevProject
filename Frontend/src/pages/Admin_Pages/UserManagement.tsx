import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { adminService } from "../../services/adminService";

const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const PAGE_SIZE = 5;

  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [userSearch, setUserSearch] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [logTimeFilter, setLogTimeFilter] = useState("all");

  const [userPage, setUserPage] = useState(1);
  const [logPage, setLogPage] = useState(1);

  const roles = ["Student", "Faculty / Professional", "Admin"];

  const parseSafeDate = (timestamp: any) => {
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? null : d;
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Parallel sync matching AdminController endpoints
      const [userData, logData] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getAuditLogs()
      ]);
      setUsers(Array.isArray(userData) ? userData : []);
      setLogs(Array.isArray(logData) ? logData : []);
    } catch (e) { 
      console.error("Registry Synchronization Failed"); 
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle Secure Metadata Export[cite: 20]
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

  // Filtering Logic
  const filteredUsers = users.filter(u => {
    const name = (u.fullName || u.FullName || "").toLowerCase();
    const email = (u.email || u.Email || "").toLowerCase();
    return name.includes(userSearch.toLowerCase()) || email.includes(userSearch.toLowerCase());
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
        <header className="mb-20">
          <h1 className="text-6xl font-black uppercase tracking-tighter leading-none mb-3">REGISTRY <span className="text-primary-orange">/ ARCHIVE</span></h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">System Control Console</p>
        </header>

        {/* Researcher Registry */}
        <section className="mb-24">
          <div className="flex justify-between items-end mb-8 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-black uppercase tracking-tight">Researcher Registry</h2>
            <input type="text" placeholder="SEARCH REGISTRY..." className="outline-none text-[10px] font-black uppercase tracking-widest text-primary-orange w-64 bg-transparent" value={userSearch} onChange={(e) => {setUserSearch(e.target.value); setUserPage(1);}} />
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
                )) : <tr><td colSpan={3} className="p-20 text-center text-slate-200 font-black uppercase tracking-widest">No User Records Synchronized</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex justify-center items-center gap-6">
            <button disabled={userPage === 1} onClick={() => setUserPage(p => p - 1)} className="text-[10px] font-black uppercase text-slate-400 disabled:opacity-10">Previous</button>
            <span className="text-[10px] font-black text-primary-orange uppercase tracking-widest">Page {userPage}</span>
            <button disabled={userPage * PAGE_SIZE >= filteredUsers.length} onClick={() => setUserPage(p => p + 1)} className="text-[10px] font-black uppercase text-slate-400 disabled:opacity-10">Next</button>
          </div>
        </section>

        {/* Audit Archive */}
        <section className="mb-24">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-slate-100 pb-4 gap-6">
            <div className="space-y-4">
              <h2 className="text-xl font-black uppercase tracking-tight">Audit Archive</h2>
              <div className="flex gap-4">
                {["all", "day", "month", "year"].map(time => (
                  <button key={time} onClick={() => {setLogTimeFilter(time); setLogPage(1);}} className={`text-[9px] font-black uppercase tracking-[0.2em] pb-1 border-b-2 transition-all ${logTimeFilter === time ? "border-primary-orange text-charcoal-black" : "border-transparent text-slate-200"}`}>{time}</button>
                ))}
              </div>
            </div>
            <input type="text" placeholder="SEARCH ARCHIVE..." className="outline-none text-[10px] font-black uppercase tracking-widest text-primary-orange w-64 bg-transparent" value={logSearch} onChange={(e) => {setLogSearch(e.target.value); setLogPage(1);}} />
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
            <button disabled={logPage === 1} onClick={() => setLogPage(p => p - 1)} className="text-[10px] font-black uppercase text-slate-400 disabled:opacity-10">Previous</button>
            <span className="text-[10px] font-black text-primary-orange uppercase tracking-widest">Log Page {logPage}</span>
            <button disabled={logPage * PAGE_SIZE >= filteredLogs.length} onClick={() => setLogPage(p => p + 1)} className="text-[10px] font-black uppercase text-slate-400 disabled:opacity-10">Next</button>
          </div>
        </section>

        {/* System Tools */}
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