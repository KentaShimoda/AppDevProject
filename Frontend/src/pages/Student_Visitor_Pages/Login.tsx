import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Execute the authentication protocol via the Auth Service
      const userData = await authService.login(credentials);
      
      // 2. PERSISTENCE: Securely store the JWT and user metadata[cite: 39]
      localStorage.setItem("token", userData.token);
      localStorage.setItem("user", JSON.stringify(userData));

      // 3. RBAC REDIRECTION: Route based on the verified UserType
      if (userData.userType === "Admin") {
        console.log("Accessing Oversight Terminal...");
        navigate("/Admin/UserManagement"); 
      } else {
        console.log("Accessing Manuscript Dashboard...");
        navigate("/Dashboard");
      }

    } catch (err: any) {
      // Parse the server response message for targeted handling
      const serverMessage = err.response?.data?.message || err.message || "";
      const lowerMessage = serverMessage.toLowerCase();
      
      // Verification Protocol: If the account isn't verified, redirect to verification terminal[cite: 36, 39]
      if (lowerMessage.includes("verify") || lowerMessage.includes("not verified")) {
        try {
          await authService.resendCode(credentials.email);
          navigate("/VerifyEmail", { state: { email: credentials.email } });
        } catch (resendErr) {
          // Navigate even if resend fails so user can manually request a new key[cite: 39]
          navigate("/VerifyEmail", { state: { email: credentials.email } });
        }
      } else {
        alert(serverMessage || "Invalid credentials provided.");
      }
    } finally {
      setIsLoading(false); 
    }
  };

  // Terminal UI Design Variables[cite: 39]
  const inputWrapper = "relative group";
  const inputClass = "w-full border-2 border-orange-100 rounded-2xl p-4 focus:outline-none focus:border-primary-orange focus:ring-4 focus:ring-primary-orange/5 transition-all duration-300 font-bold text-charcoal-black bg-white placeholder:text-slate-300";
  const labelClass = "absolute -top-3 left-4 bg-white px-2 text-[10px] font-black tracking-widest text-primary-orange group-focus-within:text-primary-orange transition-colors uppercase";

  return (
    <div className="min-h-screen bg-charcoal-black flex items-center justify-center px-[5%] md:px-[10%] py-12 font-sans antialiased animate-in fade-in zoom-in-95 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 w-full max-w-6xl items-stretch">
        
        {/* Left Branding Panel */}
        <div className="hidden lg:flex flex-col justify-between py-6">
          <div className="space-y-2">
            <div className="inline-block px-5 py-2 bg-white/10 text-white rounded-full text-[10px] font-black tracking-[0.3em] uppercase mb-4 border border-white/10">
              Security Portal
            </div>
            <h1 className="text-white text-5xl xl:text-7xl font-black uppercase tracking-tighter leading-[0.95]">
              SHARE YOUR <br /> RESEARCH FOR <br /> THE FUTURE <br /> <span className="text-primary-orange">INNOVATION</span>
            </h1>
          </div>
          <div className="p-10 bg-white/5 border border-white/10 rounded-[2.5rem] backdrop-blur-sm">
            <p className="text-white text-lg leading-snug opacity-90">
              Don't have an account in <br />
              <b className="text-white font-black text-xl uppercase tracking-tight">Filipino Scholar Archive?</b>
            </p>
            <Link to="/signup" className="inline-block mt-4 text-primary-orange font-black text-xl underline underline-offset-8 hover:text-white transition-colors">
              Sign Up!
            </Link>
          </div>
        </div>

        {/* Right Authentication Card */}
        <div className="bg-white w-full max-w-md mx-auto lg:ml-auto p-10 md:p-14 rounded-manuscript shadow-2xl relative overflow-hidden border border-orange-50">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-ember-soft rounded-full opacity-50"></div>
          
          <h2 className="text-4xl font-black mb-12 tracking-tighter uppercase text-charcoal-black">LOGIN</h2>
          
          <form onSubmit={handleLogin} className="space-y-8">
            <div className={inputWrapper}>
              <label className={labelClass}>EMAIL ADDRESS</label>
              <input 
                required 
                type="email" 
                className={inputClass} 
                placeholder="name@email.com" 
                value={credentials.email} 
                onChange={(e) => setCredentials({...credentials, email: e.target.value})} 
              />
            </div>

            <div className={inputWrapper}>
              <label className={labelClass}>PASSWORD</label>
              <input 
                required 
                type="password" 
                className={inputClass} 
                placeholder="••••••••" 
                value={credentials.password} 
                onChange={(e) => setCredentials({...credentials, password: e.target.value})} 
              />
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 group/check">
                  <input type="checkbox" id="remember" className="w-5 h-5 border-2 border-orange-100 rounded-lg cursor-pointer accent-primary-orange" />
                  <label htmlFor="remember" className="text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer group-hover/check:text-charcoal-black transition-colors">Remember Me</label>
                </div>
                <Link to="/forgot-password" virtual-link="true" className="text-xs font-black text-primary-orange hover:underline underline-offset-4">
                  Forgot Password?
                </Link>
              </div>
            </div>

            <button disabled={isLoading} type="submit" className="btn-terminal-primary w-full py-5 rounded-2xl text-xl font-black uppercase tracking-widest mt-4 disabled:opacity-50">
              {isLoading ? "AUTHENTICATING..." : "LOGIN"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;