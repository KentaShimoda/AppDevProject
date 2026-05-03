import React from "react";
import { Link, useLocation } from "react-router-dom";

const Sidebar: React.FC = () => {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isStudent = user.userType === "Student";

  // Base classes for navigation links
  const navItemClass = `
    group/item flex items-center h-12 w-full transition-all duration-300 
    cursor-pointer whitespace-nowrap overflow-hidden rounded-xl
  `;

  const inactiveClass = `${navItemClass} text-white/40 hover:bg-white/5 hover:text-primary-orange`;
  const activeClass = `${navItemClass} bg-primary-orange/10 text-primary-orange`;

  return (
    <nav className="fixed top-0 left-0 h-full w-20 hover:w-64 bg-charcoal-black flex flex-col items-center py-8 shadow-2xl z-[100] transition-all duration-500 ease-in-out group border-r border-white/5">
      
      {/* Brand Logo Section */}
      <div className="w-full px-5 mb-12 flex items-center justify-start gap-4">
        <div className="w-10 h-10 bg-primary-orange rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-orange-950/40">
          <i className="fa-solid fa-graduation-cap text-white text-xl"></i>
        </div>
        <span className="text-white font-black uppercase tracking-tight opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm">
          Scholar<span className="text-primary-orange ml-1">Archive</span>
        </span>
      </div>
      
      {/* Primary Navigation */}
      <div className="flex flex-col space-y-6 w-full px-4 flex-1">
        
        {/* Dashboard Link */}
        <Link to="/Dashboard" className={location.pathname === "/Dashboard" ? activeClass : inactiveClass}>
          <div className="min-w-[48px] flex justify-center">
            <i className="fa-solid fa-house-chimney text-xl"></i>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">Dashboard</span>
        </Link>

        {/* Student Role Links */}
        {isStudent ? (
          <>
            <Link to="/Myarchive" className={location.pathname === "/Myarchive" ? activeClass : inactiveClass}>
              <div className="min-w-[48px] flex justify-center">
                <i className="fa-solid fa-book-bookmark text-xl"></i>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">My Library</span>
            </Link>

            {/* DISTINCT UPLOAD BUTTON: Plus look[cite: 11] */}
            <div className="pt-4 border-t border-white/5">
              <Link to="/Upload" className="flex items-center h-12 w-full bg-primary-orange text-white rounded-xl shadow-lg shadow-orange-950/20 hover:bg-white hover:text-charcoal-black transition-all group/upload overflow-hidden">
                <div className="min-w-[48px] flex justify-center">
                  <i className="fa-solid fa-plus text-xl"></i>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">New Study</span>
              </Link>
            </div>
          </>
        ) : (
          /* Faculty Link[cite: 11] */
          <Link to="/Coordinator" className={location.pathname === "/Coordinator" ? activeClass : inactiveClass}>
            <div className="min-w-[48px] flex justify-center">
              <i className="fa-solid fa-clipboard-check text-xl"></i>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">Evaluations</span>
          </Link>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="w-full px-4 space-y-4">
        <Link to="/Profile" className={location.pathname === "/Profile" ? activeClass : inactiveClass}>
          <div className="min-w-[48px] flex justify-center">
            <i className="fa-solid fa-circle-user text-xl"></i>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">My Profile</span>
        </Link>
        
        <Link to="/Login" onClick={() => localStorage.clear()} className={`${inactiveClass} hover:text-red-500`}>
          <div className="min-w-[48px] flex justify-center">
            <i className="fa-solid fa-right-from-bracket text-xl"></i>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">Sign Out</span>
        </Link>
      </div>
    </nav>
  );
};

export default Sidebar;