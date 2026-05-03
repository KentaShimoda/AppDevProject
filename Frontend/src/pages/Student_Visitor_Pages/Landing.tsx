import React from "react";
import { Link } from "react-router-dom";

const Landing: React.FC = () => {
  // Synchronized with your terminal button styles
  const btnPrimary = "btn-terminal-primary px-10 py-5 text-sm";
  const btnSecondary = "bg-white text-charcoal-black border-2 border-charcoal-black px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-charcoal-black hover:text-white transition-all shadow-lg active:scale-95";

  return (
    <div className="bg-warm-white text-charcoal-black min-h-screen font-sans antialiased overflow-x-hidden">
      
      {/* 1. SOLID NAVBAR */}
      <nav className="flex justify-between items-center px-[10%] py-8 bg-white border-b border-orange-100 sticky top-0 z-[100]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary-orange rounded-xl flex items-center justify-center shadow-lg shadow-orange-950/20">
            <i className="fa-solid fa-graduation-cap text-white text-xl"></i>
          </div>
          <div className="font-black text-xl leading-none uppercase tracking-tighter">
            Scholar<span className="text-primary-orange">Archive</span>
          </div>
        </div>
        <ul className="flex gap-10 list-none items-center">
          <li>
            <Link className="text-[11px] font-black uppercase tracking-widest hover:text-primary-orange transition-colors" to="/login">
              Login
            </Link>
          </li>
          <li>
            <Link className="btn-terminal-primary px-8 py-3 text-[10px]" to="/signup">
              Sign Up
            </Link>
          </li>
        </ul>
      </nav>

      {/* 2. HERO SECTION (High Contrast) */}
      <section className="relative flex flex-col justify-center items-center text-center min-h-[80vh] px-[10%] py-20 overflow-hidden">
        {/* Decorative Background Element */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-orange-50/30 -z-10 skew-x-12 transform translate-x-20"></div>
        
        <div className="inline-flex items-center gap-3 mb-8 px-4 py-2 bg-ember-soft rounded-full border border-orange-100">
          <div className="w-2 h-2 rounded-full bg-primary-orange animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-orange">National Innovation Hub</span>
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-9xl tracking-tighter mb-10 font-black uppercase leading-[0.85]">
          ARCHIVE YOUR <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-orange to-red-600">RESEARCH</span> <br />
          FOR THE FUTURE
        </h1>
        
        <p className="text-lg md:text-xl mb-12 text-slate-500 max-w-2xl font-bold leading-relaxed">
          The premier academic repository for Filipino students. <br />
          Secure your findings, gain expert validation, and drive national progress.
        </p>

        <div className="flex flex-col sm:flex-row gap-6">
          <Link className={btnPrimary} to="/signup">Start Archiving Now</Link>
          <Link className={btnSecondary} to="/login">View Public Library</Link>
        </div>
      </section>

      {/* 3. PROCESS SECTION (Card Manuscript Style) */}
      <section className="bg-charcoal-black text-white px-[10%] py-32 relative">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8 text-center md:text-left">
            <div>
              <span className="text-primary-orange font-black text-[11px] uppercase tracking-[0.5em] block mb-4">Protocol</span>
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase">How it works?</h2>
            </div>
            <p className="text-white/40 font-bold max-w-xs text-sm uppercase tracking-widest leading-relaxed">
              Standardized archiving process for academic integrity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { id: "01", title: "Standardize", desc: "Format your manuscript into a ready PDF with all relevant metadata and researchers.", icon: "fa-file-pdf" },
              { id: "02", title: "Transmit", desc: "Upload your study to the secure terminal and assign a faculty coordinator for review.", icon: "fa-microchip" },
              { id: "03", title: "Archive", desc: "Once approved, your work is indexed nationally for citation and peer recognition.", icon: "fa-database" }
            ].map((step, i) => (
              <div key={i} className="group bg-white/5 border border-white/10 rounded-[2.5rem] p-12 hover:bg-primary-orange transition-all duration-500 hover:-translate-y-4">
                <span className="text-white/10 font-black text-8xl block mb-[-40px] group-hover:text-white/20 transition-colors leading-none">{step.id}</span>
                <div className="w-20 h-20 rounded-2xl bg-primary-orange flex justify-center items-center text-3xl text-white mb-10 shadow-xl shadow-orange-950/50 group-hover:bg-white group-hover:text-primary-orange transition-all">
                  <i className={`fa-solid ${step.icon}`}></i>
                </div>
                <h3 className="text-2xl font-black mb-4 uppercase tracking-tight">{step.title}</h3>
                <p className="text-white/50 group-hover:text-white/80 font-medium leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. VISION & MISSION (High Contrast Blocks) */}
      <section className="bg-white px-[10%] py-32">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="p-16 bg-orange-50/50 rounded-[3.5rem] border border-orange-100 hover:shadow-2xl transition-all duration-700">
            <div className="w-12 h-1 bg-primary-orange mb-8"></div>
            <h2 className="text-4xl font-black tracking-tight text-charcoal-black uppercase mb-8">Our Vision</h2>
            <p className="text-lg leading-relaxed text-slate-600 font-bold text-justify">
              To become the central nervous system for academic innovation in the Philippines. We envision a future where every Filipino student's research is preserved, accessible, and utilized as a catalyst for nationwide technological and social progress.
            </p>
          </div>
          
          <div className="p-16 bg-charcoal-black rounded-[3.5rem] text-white hover:shadow-2xl transition-all duration-700">
            <div className="w-12 h-1 bg-primary-orange mb-8"></div>
            <h2 className="text-4xl font-black tracking-tight uppercase mb-8 text-primary-orange">Our Mission</h2>
            <p className="text-lg leading-relaxed text-white/60 font-bold text-justify">
              To provide a high-performance, secure digital repository that bridges the gap between student researchers and professional validation. We are committed to fostering academic integrity and empowering students to showcase their work to a global audience.
            </p>
          </div>
        </div>
      </section>

      {/* 5. FOOTER PROTOCOL */}
      <footer className="bg-white border-t border-orange-100 py-20 px-[10%]">
        <div className="flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="text-center md:text-left">
            <div className="font-black text-2xl uppercase tracking-tighter mb-2">ScholarArchive</div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Digital Manuscript Protocol © 2026</p>
          </div>
          <div className="flex gap-10">
            <Link to="/signup" className="text-[11px] font-black uppercase tracking-widest hover:text-primary-orange transition-colors">Register</Link>
            <Link to="/login" className="text-[11px] font-black uppercase tracking-widest hover:text-primary-orange transition-colors">Access</Link>
            <a href="#" className="text-[11px] font-black uppercase tracking-widest hover:text-primary-orange transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;