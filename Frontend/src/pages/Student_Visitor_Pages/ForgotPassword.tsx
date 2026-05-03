import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // 🚀 Protocol: Request recovery key from the identity service[cite: 32, 36]
      const success = await authService.forgotPassword(email);
      
      if (success) {
        // Redirect to reset terminal and preserve email in the navigation state[cite: 41]
        navigate("/reset-password", { state: { email } });
      } else {
        throw new Error("Archive failed to issue recovery key.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to initialize recovery protocol. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal-black flex items-center justify-center p-8 font-sans antialiased animate-in fade-in duration-500">
      <div className="bg-white p-12 rounded-manuscript shadow-2xl w-full max-w-md text-center border-t-8 border-primary-orange relative overflow-hidden">
        
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-ember-soft rounded-full opacity-50"></div>
        
        <div className="mb-10">
          <h2 className="text-3xl font-black uppercase text-charcoal-black tracking-tighter">
            Reset Access
          </h2>
          <p className="text-meta-label mt-2 lowercase tracking-normal">
            Enter your email to receive a <span className="text-charcoal-black font-bold">recovery key</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="relative group">
            <label className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-black tracking-widest text-primary-orange uppercase">
              Registered Email
            </label>
            <input 
              required 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="RESEARCHER@EMAIL.COM" 
              className="input-terminal py-5 px-6 font-bold text-charcoal-black bg-white placeholder:text-slate-200" 
            />
          </div>

          <button 
            disabled={isLoading}
            type="submit" 
            className="btn-terminal-primary w-full py-5 text-sm uppercase tracking-[0.2em] disabled:opacity-50"
          >
            {isLoading ? "Transmitting..." : "Send Code"}
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-orange-50">
          <button 
            onClick={() => navigate("/Login")}
            className="text-primary-orange font-black text-[10px] uppercase tracking-[0.2em] hover:text-charcoal-black transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;