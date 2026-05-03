import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", suffix: "", birthDate: "",
    organization: "", userType: "Student", email: "", password: ""
  });
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== confirmPassword) return alert("Passwords do not match!");
    setIsLoading(true);
    try {
      await authService.register(formData);
      // Implemented: Redirects to verify-email with state
      navigate("/VerifyEmail", { state: { email: formData.email } });
    } catch (err: any) {
      alert(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Styled using index.css terminal variables[cite: 13]
  const inputWrapper = "relative group";
  const inputClass = "w-full border-2 border-orange-100 rounded-2xl p-4 focus:outline-none focus:border-primary-orange focus:ring-4 focus:ring-primary-orange/5 transition-all duration-300 font-bold text-charcoal-black bg-white placeholder:text-slate-300";
  const labelClass = "absolute -top-3 left-4 bg-white px-2 text-[10px] font-black tracking-widest text-primary-orange group-focus-within:text-primary-orange transition-colors uppercase";

  return (
    <div className="min-h-screen bg-charcoal-black flex items-center justify-center px-[5%] md:px-[10%] py-12 font-sans antialiased animate-in fade-in zoom-in-95 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 w-full max-w-7xl items-stretch">
        
        {/* Left Side Content (Branding)[cite: 14] */}
        <div className="hidden lg:flex flex-col justify-between py-6">
          <div className="space-y-2">
            <div className="inline-block px-5 py-2 bg-white/10 text-white rounded-full text-[10px] font-black tracking-[0.3em] uppercase mb-4 border border-white/10">
              Join the Community
            </div>
            <h1 className="text-white text-5xl xl:text-7xl font-black uppercase tracking-tighter leading-[0.95]">
              SHARE YOUR <br /> STUDY FOR <br /> THE FUTURE <br /> <span className="text-primary-orange">INNOVATION</span>
            </h1>
          </div>
          <div className="p-10 bg-white/5 border border-white/10 rounded-[2.5rem] backdrop-blur-sm">
            <p className="text-white/70 text-lg font-bold leading-snug">
              Already have an account in <br />
              <b className="text-white font-black text-xl uppercase tracking-tight">Filipino Scholar Archive?</b>
            </p>
            <Link to="/login" className="inline-block mt-4 text-primary-orange font-black text-xl underline underline-offset-8 hover:text-white transition-colors">
              Login!
            </Link>
          </div>
        </div>

        {/* Right Side Signup Card[cite: 14] */}
        <div className="bg-white w-full max-w-2xl mx-auto lg:ml-auto p-10 md:p-12 rounded-manuscript shadow-2xl relative overflow-hidden border border-orange-50">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-ember-soft rounded-full opacity-50"></div>
          <h2 className="text-4xl font-black mb-10 tracking-tighter uppercase text-charcoal-black">Create Account</h2>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className={inputWrapper}>
                <label className={labelClass}>FIRST NAME</label>
                <input required type="text" className={inputClass} placeholder="Juan" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
              </div>
              <div className={inputWrapper}>
                <label className={labelClass}>LAST NAME</label>
                <input required type="text" className={inputClass} placeholder="Dela Cruz" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className={inputWrapper}>
                <label className={labelClass}>SUFFIX</label>
                <input type="text" className={inputClass} placeholder="Engr. / Dr." value={formData.suffix} onChange={(e) => setFormData({...formData, suffix: e.target.value})} />
              </div>
              <div className={inputWrapper}>
                <label className={labelClass}>BIRTH DATE</label>
                <input required type="date" className={inputClass} value={formData.birthDate} onChange={(e) => setFormData({...formData, birthDate: e.target.value})} />
              </div>
            </div>

            <div className={inputWrapper}>
              <label className={labelClass}>SCHOOL / ORGANIZATION</label>
              <input required type="text" className={inputClass} placeholder="University Name" value={formData.organization} onChange={(e) => setFormData({...formData, organization: e.target.value})} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className={inputWrapper}>
                <label className={labelClass}>USER TYPE</label>
                <select className={inputClass} value={formData.userType} onChange={(e) => setFormData({...formData, userType: e.target.value})}>
                  <option>Student</option>
                  <option>Faculty / Professional</option>
                </select>
              </div>
              <div className={inputWrapper}>
                <label className={labelClass}>EMAIL ADDRESS</label>
                <input required type="email" className={inputClass} placeholder="name@email.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className={inputWrapper}>
                <label className={labelClass}>PASSWORD</label>
                <input required type="password" className={inputClass} placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
              </div>
              <div className={inputWrapper}>
                <label className={labelClass}>CONFIRM PASSWORD</label>
                <input required type="password" className={inputClass} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>

            <button 
              disabled={isLoading} 
              type="submit" 
              className="btn-terminal-primary w-full py-5 rounded-2xl text-xl font-black uppercase tracking-widest mt-4"
            >
              {isLoading ? "AUTHENTICATING..." : "SIGN UP"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;