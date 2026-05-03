import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";

const ResetPassword: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState({ 
    email: location.state?.email || "", 
    code: "", 
    newPassword: "" 
  });

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Execute reset password protocol
      const success = await authService.resetPassword(data);
      if (success) {
        alert("Access restored. Protocol complete. Redirecting to login.");
        navigate("/Login");
      } else {
        alert("Invalid recovery key or session expired.");
      }
    } catch (err) {
      alert("Verification protocol failed. Please re-initialize recovery.");
    } finally {
      setIsLoading(false);
    }
  };

  // UI variable styling synchronized with index.css
  const inputWrapper = "relative group";
  const labelClass = "absolute -top-3 left-4 bg-white px-2 text-[10px] font-black tracking-widest text-primary-orange group-focus-within:text-primary-orange transition-colors uppercase";

  return (
    <div className="min-h-screen bg-charcoal-black flex items-center justify-center p-8 font-sans antialiased animate-in fade-in duration-500">
      {/* Manuscript Card Styling */}
      <div className="bg-white p-12 rounded-manuscript shadow-2xl w-full max-w-md text-center border-t-8 border-primary-orange relative overflow-hidden">
        
        {/* Decorative Ember Element */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-ember-soft rounded-full opacity-50"></div>
        
        <div className="mb-10">
          <h2 className="text-3xl font-black uppercase text-charcoal-black tracking-tighter">
            New Password
          </h2>
          <p className="text-meta-label mt-2 lowercase tracking-normal">
            Enter your <span className="text-charcoal-black font-bold">recovery key</span> to restore access
          </p>
        </div>

        <form onSubmit={handleReset} className="space-y-10">
          {/* Recovery Code Input */}
          <div className={inputWrapper}>
            <label className={labelClass}>Recovery Key</label>
            <input 
              required 
              maxLength={6} 
              value={data.code} 
              onChange={(e) => setData({...data, code: e.target.value})} 
              placeholder="000000" 
              className="input-terminal text-center text-3xl font-black tracking-[0.5em] py-6 placeholder:text-slate-100" 
            />
          </div>

          {/* New Password Input[cite: 13] */}
          <div className={inputWrapper}>
            <label className={labelClass}>Secure Password</label>
            <input 
              required 
              type="password" 
              value={data.newPassword} 
              onChange={(e) => setData({...data, newPassword: e.target.value})} 
              placeholder="••••••••" 
              className="input-terminal py-5 px-6 font-bold text-charcoal-black placeholder:text-slate-200" 
            />
          </div>

          <button 
            disabled={isLoading}
            type="submit" 
            className="btn-terminal-primary w-full py-5 text-sm uppercase tracking-[0.2em] disabled:opacity-50"
          >
            {isLoading ? "UPDATING ARCHIVE..." : "RESET PASSWORD"}
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-orange-50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Wrong account?
          </p>
          <button 
            onClick={() => navigate("/forgot-password")}
            className="text-primary-orange font-black text-[10px] uppercase tracking-[0.2em] hover:text-charcoal-black transition-colors"
          >
            Re-initiate Recovery
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;