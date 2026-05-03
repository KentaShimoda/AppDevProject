import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminService } from "../../services/adminService";

const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const PAGE_SIZE = 5;

  // Data States
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter States
  const [userSearch, setUserSearch] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [logTimeFilter, setLogTimeFilter] = useState("all");

  // Pagination States
  const [userPage, setUserPage] = useState(1);
  const [logPage, setLogPage] = useState(1);

  const roles = ["Student", "Faculty / Professional", "Admin"];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    
    // Independent Fetching: Prevents one error from breaking both tables
    try {
      const userData = await adminService.getAllUsers();
      setUsers(Array.isArray(userData) ? userData : []);
    } catch (e) { console.error("User Registry Sync Failed"); }

    try {
      const logData = await adminService.getAuditLogs();
      setLogs(Array.isArray(logData) ? logData : []);
    } catch (e) { console.error("Audit Archive Sync Failed"); }

    setIsLoading(false);
  };

  // --- FILTERING LOGIC (Casing-Agnostic) ---
  const filteredUsers = users.filter(u => {
    const firstName = u.firstName || u.FirstName || "";
    const lastName = u.lastName || u.LastName || "";
    const email = u.email || u.Email || "";
    return `${firstName} ${lastName} ${email}`.toLowerCase().includes(userSearch.toLowerCase());
  });

  const filteredLogs = logs.filter(log => {
    const action = log.action || log.Action || "";
    const details = log.details || log.Details || "";
    const timestamp = log.timestamp || log.Timestamp;

    const matchesSearch = `${action} ${details}`.toLowerCase().includes(logSearch.toLowerCase());
    if (!matchesSearch) return false;

    if (logTimeFilter === "all") return true;
    const logDate = new Date(timestamp);
    if (isNaN(logDate.getTime())) return false; 

    const now = new Date();
    const diffDays = (now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24);

    if (logTimeFilter === "day") return diffDays <= 1;
    if (logTimeFilter === "month") return diffDays <= 30;
    if (logTimeFilter === "year") return diffDays <= 365;
    return true;
  });

  const pUsers = filteredUsers.slice((userPage - 1) * PAGE_SIZE, userPage * PAGE_SIZE);
  const pLogs = filteredLogs.slice((logPage - 1) * PAGE_SIZE, logPage * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-white font-sans antialiased text-charcoal-black selection:bg-primary-orange/20">
      
      {/* Top Utility Navigation */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-primary-orange rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black tracking-[0.3em] uppercase opacity-70">Oversight Terminal</span>
        </div>
        <button onClick={() => {localStorage.clear(); navigate("/Login");}} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary-orange transition-colors">
          Terminate Session
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-16">
        <header className="mb-20">
          <h1 className="text-6xl font-black uppercase tracking-tighter leading-none mb-3">
            REGISTRY <span className="text-primary-orange">/ ARCHIVE</span>
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Control Console</p>
        </header>

        {/* --- SECTION: USER REGISTRY --- */}
        <section className="mb-24">
          <div className="flex justify-between items-end mb-8 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-black uppercase tracking-tight">Researcher Registry</h2>
            <input 
              type="text" placeholder="Search registry..." 
              className="outline-none text-[10px] font-black uppercase tracking-widest text-primary-orange placeholder:text-slate-200 w-64"
              value={userSearch} onChange={(e) => {setUserSearch(e.target.value); setUserPage(1);}}
            />
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
                      <p className="text-charcoal-black font-black text-xs uppercase leading-none mb-1">{u.firstName || u.FirstName} {u.lastName || u.LastName}</p>
                      <p className="text-slate-400 text-[10px] font-bold">{u.email || u.Email}</p>
                    </td>
                    <td className="px-8 py-6">
                      <select 
                        value={u.userType || u.UserType} 
                        onChange={(e) => adminService.updateUserRole(u.id || u.Id, e.target.value).then(loadData)}
                        className="bg-transparent text-[10px] font-black uppercase border-b-2 border-slate-100 outline-none pb-1 focus:border-primary-orange"
                      >
                        {roles.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button onClick={() => adminService.deleteUser(u.id || u.Id).then(loadData)} className="text-[9px] font-black text-slate-300 hover:text-red-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Delete Account</button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={3} className="p-20 text-center text-slate-200 font-black uppercase tracking-widest">No User Records Synchronized</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-center items-center gap-6">
            <button disabled={userPage === 1} onClick={() => setUserPage(p => p - 1)} className="text-[10px] font-black uppercase text-slate-400 disabled:opacity-10">Previous</button>
            <span className="text-[10px] font-black text-primary-orange uppercase tracking-widest">Archive Page {userPage}</span>
            <button disabled={userPage * PAGE_SIZE >= filteredUsers.length} onClick={() => setUserPage(p => p + 1)} className="text-[10px] font-black uppercase text-slate-400 disabled:opacity-10">Next</button>
          </div>
        </section>

        {/* --- SECTION: AUDIT TRAIL --- */}
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
            <input 
              type="text" placeholder="Search archive..." 
              className="outline-none text-[10px] font-black uppercase tracking-widest text-primary-orange placeholder:text-slate-200 w-64"
              value={logSearch} onChange={(e) => {setLogSearch(e.target.value); setLogPage(1);}}
            />
          </div>

          <div className="border border-slate-200 rounded-manuscript overflow-hidden bg-white mb-6 shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest">Protocol</th>
                  <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest">Operation Details</th>
                  <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pLogs.length > 0 ? pLogs.map((l) => (
                  <tr key={l.id || l.Id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <span className="bg-charcoal-black text-white px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter">{l.action || l.Action}</span>
                    </td>
                    <td className="px-8 py-6 text-[10px] font-medium text-slate-500 leading-relaxed max-w-sm">{l.details || l.Details}</td>
                    <td className="px-8 py-6 text-[10px] font-black text-slate-400 text-right uppercase">
                      {new Date(l.timestamp || l.Timestamp).toLocaleDateString()} 
                      <span className="opacity-40 ml-2">{new Date(l.timestamp || l.Timestamp).toLocaleTimeString()}</span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={3} className="p-20 text-center text-slate-200 font-black uppercase tracking-widest">Audit Archive Empty</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-center items-center gap-6">
            <button disabled={logPage === 1} onClick={() => setLogPage(p => p - 1)} className="text-[10px] font-black uppercase text-slate-400 disabled:opacity-10">Previous</button>
            <span className="text-[10px] font-black text-primary-orange uppercase tracking-widest">Log Page {logPage}</span>
            <button disabled={logPage * PAGE_SIZE >= filteredLogs.length} onClick={() => setLogPage(p => p + 1)} className="text-[10px] font-black uppercase text-slate-400 disabled:opacity-10">Next</button>
          </div>
        </section>

        {/* --- SECTION: SYSTEM PROTOCOLS --- */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-16">
          <div className="p-10 border border-slate-200 rounded-2xl bg-slate-50/30">
            <h3 className="text-sm font-black uppercase mb-2">System Configuration</h3>
            <p className="text-[11px] text-slate-400 font-medium mb-4 leading-relaxed"> Manual configuration of research categories, repository node limits, and file size constraints.</p>
            <span className="text-[9px] font-black uppercase text-slate-300 tracking-widest cursor-not-allowed">Access Restricted</span>
          </div>
          <button 
            onClick={() => adminService.exportMetadata()} 
            className="p-10 bg-charcoal-black rounded-2xl hover:bg-primary-orange transition-all text-left shadow-lg group"
          >
            <h3 className="text-sm font-black uppercase mb-2 text-white">Metadata Backup</h3>
            <p className="text-[11px] text-white/40 font-medium group-hover:text-white/80 transition-colors mb-4 leading-relaxed">Execute secure JSON export of all researcher registry metadata for long-term preservation.</p>
            <span className="text-[10px] font-black uppercase text-white tracking-widest border-b border-white/20">Initiate Export Protocol</span>
          </button>
        </section>
      </main>
    </div>
  );
};

export default UserManagement;