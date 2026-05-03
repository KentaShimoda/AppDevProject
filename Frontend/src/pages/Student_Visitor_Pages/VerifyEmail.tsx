import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";

const VerifyEmail: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Retrieve the email from the navigation state carried over from Signup or Login[cite: 34]
  const email = location.state?.email || "";
  
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); 
    setIsVerifying(true);

    try {
      // 🚀 Protocol: Verify the security key against the identity registry
      const success = await authService.verifyEmail({ email, code });
      
      if (success) {
        alert("Identity Verified. Account access cleared. You can now login.");
        navigate("/Login");
      } else {
        setError("Invalid or expired security key. Please request a new transmission.");
      }
    } catch (err: any) {
      setError(err.message || "Verification protocol failed. System sync error.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email) return setError("No registered email detected in terminal state.");
    
    setIsResending(true);
    setError(""); 
    try {
      // 🚀 Protocol: Re-transmit a fresh security key
      const success = await authService.resendCode(email);
      if (success) {
        alert("A fresh security code has been transmitted to your email.");
      } else {
        setError("Failed to re-transmit verification code. Account may already be verified.");
      }
    } catch (err: any) {
      setError("Transmission error. Failed to connect to the mail server.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal-black flex items-center justify-center p-8 font-sans antialiased">
      {/* Manuscript Card Styling[cite: 34] */}
      <div className="bg-white p-12 rounded-manuscript shadow-2xl w-full max-w-md text-center border-t-8 border-primary-orange relative overflow-hidden">
        
        {/* Decorative Ember Element */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-ember-soft rounded-full opacity-50"></div>
        
        <div className="mb-10">
          <h2 className="text-3xl font-black uppercase text-charcoal-black tracking-tighter">
            Verify Email
          </h2>
          <p className="text-meta-label mt-2 lowercase tracking-normal">
            Protocol sent to: <span className="text-charcoal-black font-bold">{email || "UNKNOWN_SUBJECT"}</span>
          </p>
        </div>
        
        {error && (
          <p className="bg-red-50 text-red-600 font-black p-4 rounded-xl mb-8 uppercase text-[10px] border border-red-100 tracking-widest">
            {error}
          </p>
        )}
        
        <form onSubmit={handleVerify} className="space-y-8">
          <div className="relative group">
            <label className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-black tracking-widest text-primary-orange uppercase">
              6-Digit Security Key
            </label>
            <input 
              type="text" 
              maxLength={6} 
              value={code} 
              onChange={(e) => setCode(e.target.value)}
              className="input-terminal text-center text-3xl font-black tracking-[0.5em] py-6"
              placeholder="000000"
              required
              disabled={isVerifying}
            />
          </div>

          <button 
            type="submit" 
            disabled={isVerifying}
            className="btn-terminal-primary w-full py-5 text-sm uppercase tracking-[0.2em] disabled:opacity-50"
          >
            {isVerifying ? "Verifying..." : "Verify Account"}
          </button>
        </form>
        
        <div className="mt-12 pt-8 border-t border-orange-50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            Didn't receive the transmission?
          </p>
          <button 
            disabled={isResending || isVerifying}
            onClick={handleResend}
            className="text-primary-orange font-black text-xs uppercase tracking-[0.2em] hover:text-charcoal-black transition-colors disabled:opacity-50"
          >
            {isResending ? "Transmitting..." : "Resend Code"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;