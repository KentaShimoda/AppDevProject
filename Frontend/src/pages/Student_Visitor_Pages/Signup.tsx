import React, { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService, type RegisterDto } from "../../services/authService";

// ─── Custom Alert Popup ───────────────────────────────────────────────────────
interface AlertPopupProps {
  message: string;
  type: "error" | "warning";
  onClose: () => void;
}

const AlertPopup: React.FC<AlertPopupProps> = ({ message, type, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center px-6 animate-in fade-in duration-200">
    {/* Backdrop */}
    <div
      className="absolute inset-0 bg-charcoal-black/70 backdrop-blur-sm"
      onClick={onClose}
    />
    {/* Card */}
    <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 border border-orange-100 animate-in zoom-in-95 duration-300">
      {/* Icon */}
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-orange/10 mx-auto mb-5">
        <svg
          className="w-7 h-7 text-primary-orange"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      {/* Message */}
      <p className="text-center text-charcoal-black font-bold text-base leading-snug mb-6">
        {message}
      </p>
      {/* Button */}
      <button
        onClick={onClose}
        className="w-full py-3.5 rounded-xl bg-primary-orange text-white font-black text-sm uppercase tracking-widest hover:bg-primary-orange/90 active:scale-95 transition-all duration-150"
      >
        Got it
      </button>
    </div>
  </div>
);

// ─── Password Strength ────────────────────────────────────────────────────────
interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "One uppercase letter (A–Z)", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One lowercase letter (a–z)", test: (pw) => /[a-z]/.test(pw) },
  { label: "One number (0–9)", test: (pw) => /[0-9]/.test(pw) },
  {
    label: "One special character (!@#$…)",
    test: (pw) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pw),
  },
  {
    label: "No emoji",
    test: (pw) => !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(pw),
  },
];

const getStrengthLabel = (passed: number): { label: string; color: string } => {
  if (passed <= 2) return { label: "Weak", color: "bg-red-400" };
  if (passed <= 4) return { label: "Fair", color: "bg-amber-400" };
  if (passed === 5) return { label: "Good", color: "bg-yellow-400" };
  return { label: "Strong", color: "bg-green-500" };
};

const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  if (!password) return null;
  const results = PASSWORD_RULES.map((r) => r.test(password));
  const passed = results.filter(Boolean).length;
  const { label, color } = getStrengthLabel(passed);
  const percent = Math.round((passed / PASSWORD_RULES.length) * 100);

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-orange-50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${color}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span
          className={`text-[10px] font-black tracking-widest uppercase ${
            passed <= 2
              ? "text-red-400"
              : passed <= 4
              ? "text-amber-500"
              : "text-green-600"
          }`}
        >
          {label}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-0.5">
        {PASSWORD_RULES.map((rule, i) => (
          <li
            key={i}
            className={`flex items-center gap-1.5 text-[10px] font-semibold transition-colors ${
              results[i] ? "text-green-600" : "text-slate-400"
            }`}
          >
            <span className="text-[11px]">{results[i] ? "✓" : "○"}</span>
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

// ─── Research Interest Topics ─────────────────────────────────────────────────
const RESEARCH_TOPICS = [
  "Computer Science & IT",
  "Engineering & Technology",
  "Natural Sciences",
  "Mathematics & Statistics",
  "Social Sciences",
  "Humanities & Arts",
  "Education & Pedagogy",
  "Medicine & Health Sciences",
  "Business & Economics",
  "Environmental Studies",
  "Law & Political Science",
  "Agriculture & Food Science",
  "Architecture & Planning",
  "Other",
];

// ─── Honorifics ───────────────────────────────────────────────────────────────
const HONORIFICS = [
  "",
  "Mr.",
  "Ms.",
  "Mrs.",
  "Dr.",
  "Prof.",
  "Engr.",
  "Atty.",
  "Rev.",
  "Hon.",
];

// ─── Form State ───────────────────────────────────────────────────────────────
interface SignupForm {
  honorific: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  organization: string;
  userType: string;
  researchInterest: string;
  email: string;
  password: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────
const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{
    message: string;
    type: "error" | "warning";
  } | null>(null);

  const [formData, setFormData] = useState<SignupForm>({
    honorific: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    organization: "",
    userType: "Student",
    researchInterest: "",
    email: "",
    password: "",
  });

  const [confirmPassword, setConfirmPassword] = useState("");

  const showAlert = useCallback(
    (message: string, type: "error" | "warning" = "error") => {
      setAlert({ message, type });
    },
    []
  );

  const validatePassword = (pw: string): string | null => {
    for (const rule of PASSWORD_RULES) {
      if (!rule.test(pw)) return `Password issue: ${rule.label.toLowerCase()}.`;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== confirmPassword) {
      showAlert(
        "Passwords do not match. Please re-enter your password.",
        "warning"
      );
      return;
    }

    const pwError = validatePassword(formData.password);
    if (pwError) {
      showAlert(pwError, "warning");
      return;
    }

    setIsLoading(true);
    try {
      // Build a strongly-typed DTO, omitting empty honorific
      const dto: RegisterDto = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        birthDate: formData.birthDate,           // "YYYY-MM-DD"
        organization: formData.organization.trim(),
        userType: formData.userType,
        researchInterest: formData.researchInterest.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        ...(formData.honorific ? { honorific: formData.honorific } : {}),
      };

      // authService.register now throws on error — no null check needed
      await authService.register(dto);

      // On success, redirect to email verification
      navigate("/VerifyEmail", { state: { email: dto.email } });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Registration failed. Please check your details and try again.";
      showAlert(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const field = (key: keyof SignupForm, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const inputWrapper = "relative group";
  const inputClass =
    "w-full border-2 border-orange-100 rounded-2xl p-4 focus:outline-none focus:border-primary-orange focus:ring-4 focus:ring-primary-orange/5 transition-all duration-300 font-bold text-charcoal-black bg-white placeholder:text-slate-300";
  const labelClass =
    "absolute -top-3 left-4 bg-white px-2 text-[10px] font-black tracking-widest text-primary-orange group-focus-within:text-primary-orange transition-colors uppercase";

  return (
    <>
      {/* Alert Popup */}
      {alert && (
        <AlertPopup
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="min-h-screen bg-charcoal-black flex items-center justify-center px-[5%] md:px-[10%] py-12 font-sans antialiased animate-in fade-in zoom-in-95 duration-700">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 w-full max-w-7xl items-stretch">

          {/* Left Branding Panel */}
          <div className="hidden lg:flex flex-col justify-between py-6">
            <div className="space-y-2">
              <div className="inline-block px-5 py-2 bg-white/10 text-white rounded-full text-[10px] font-black tracking-[0.3em] uppercase mb-4 border border-white/10">
                Join the Community
              </div>
              <h1 className="text-white text-5xl xl:text-7xl font-black uppercase tracking-tighter leading-[0.95]">
                SHARE YOUR <br /> STUDY FOR <br /> THE FUTURE <br />{" "}
                <span className="text-primary-orange">INNOVATION</span>
              </h1>
            </div>
            <div className="p-10 bg-white/5 border border-white/10 rounded-[2.5rem] backdrop-blur-sm">
              <p className="text-white/70 text-lg font-bold leading-snug">
                Already have an account in <br />
                <b className="text-white font-black text-xl uppercase tracking-tight">
                  Filipino Scholar Archive?
                </b>
              </p>
              <Link
                to="/login"
                className="inline-block mt-4 text-primary-orange font-black text-xl underline underline-offset-8 hover:text-white transition-colors"
              >
                Login!
              </Link>
            </div>
          </div>

          {/* Right Registration Card */}
          <div className="bg-white w-full max-w-2xl mx-auto lg:ml-auto p-10 md:p-12 rounded-manuscript shadow-2xl relative overflow-hidden border border-orange-50">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-ember-soft rounded-full opacity-50" />

            <h2 className="text-4xl font-black mb-10 tracking-tighter uppercase text-charcoal-black">
              Create Account
            </h2>

            <form onSubmit={handleSubmit} className="space-y-8">

              {/* Row 1: Honorific + First + Last Name */}
              <div className="flex gap-4 items-start">
                {/* Honorific */}
                <div className={`${inputWrapper} flex-none w-24`}>
                  <label className={labelClass}>TITLE</label>
                  <input
                    type="text"
                    list="honorifics-list"
                    className={inputClass}
                    placeholder="Mr."
                    value={formData.honorific}
                    onChange={(e) => field("honorific", e.target.value)}
                    autoComplete="off"
                  />
                  <datalist id="honorifics-list">
                    {HONORIFICS.filter(Boolean).map((h) => (
                      <option key={h} value={h} />
                    ))}
                  </datalist>
                </div>

                <div className={`${inputWrapper} flex-1`}>
                  <label className={labelClass}>FIRST NAME</label>
                  <input
                    required
                    type="text"
                    className={inputClass}
                    placeholder="Juan"
                    value={formData.firstName}
                    onChange={(e) => field("firstName", e.target.value)}
                  />
                </div>

                <div className={`${inputWrapper} flex-1`}>
                  <label className={labelClass}>LAST NAME</label>
                  <input
                    required
                    type="text"
                    className={inputClass}
                    placeholder="Dela Cruz"
                    value={formData.lastName}
                    onChange={(e) => field("lastName", e.target.value)}
                  />
                </div>
              </div>

              {/* Row 2: Birth Date + User Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className={inputWrapper}>
                  <label className={labelClass}>BIRTH DATE</label>
                  <input
                    required
                    type="date"
                    className={inputClass}
                    value={formData.birthDate}
                    onChange={(e) => field("birthDate", e.target.value)}
                  />
                </div>

                <div className={inputWrapper}>
                  <label className={labelClass}>USER TYPE</label>
                  <select
                    className={inputClass}
                    value={formData.userType}
                    onChange={(e) => field("userType", e.target.value)}
                  >
                    <option>Student</option>
                    <option>Faculty / Professional</option>
                  </select>
                </div>
              </div>

              {/* Row 3: School / Organization */}
              <div className={inputWrapper}>
                <label className={labelClass}>SCHOOL / ORGANIZATION</label>
                <input
                  required
                  type="text"
                  className={inputClass}
                  placeholder="University Name"
                  value={formData.organization}
                  onChange={(e) => field("organization", e.target.value)}
                />
              </div>

              {/* Row 4: Research Interest */}
              <div className={inputWrapper}>
                <label className={labelClass}>RESEARCH INTEREST / FIELD</label>
                <input
                  required
                  type="text"
                  list="research-topics-list"
                  className={inputClass}
                  placeholder="e.g. Computer Science, Medicine…"
                  value={formData.researchInterest}
                  onChange={(e) => field("researchInterest", e.target.value)}
                  autoComplete="off"
                />
                <datalist id="research-topics-list">
                  {RESEARCH_TOPICS.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>

              {/* Row 5: Email */}
              <div className={inputWrapper}>
                <label className={labelClass}>EMAIL ADDRESS</label>
                <input
                  required
                  type="email"
                  className={inputClass}
                  placeholder="name@email.com"
                  value={formData.email}
                  onChange={(e) => field("email", e.target.value)}
                />
              </div>

              {/* Row 6: Password + Confirm */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className={inputWrapper}>
                    <label className={labelClass}>PASSWORD</label>
                    <input
                      required
                      type="password"
                      className={inputClass}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => field("password", e.target.value)}
                    />
                  </div>
                  <PasswordStrength password={formData.password} />
                </div>

                <div className={inputWrapper}>
                  <label className={labelClass}>CONFIRM PASSWORD</label>
                  <input
                    required
                    type="password"
                    className={`${inputClass} ${
                      confirmPassword && confirmPassword !== formData.password
                        ? "border-red-300 focus:border-red-400"
                        : confirmPassword && confirmPassword === formData.password
                        ? "border-green-300 focus:border-green-400"
                        : ""
                    }`}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {confirmPassword && confirmPassword !== formData.password && (
                    <p className="mt-2 text-[10px] font-bold text-red-400 tracking-wide">
                      ✕ Passwords don't match
                    </p>
                  )}
                  {confirmPassword && confirmPassword === formData.password && (
                    <p className="mt-2 text-[10px] font-bold text-green-500 tracking-wide">
                      ✓ Passwords match
                    </p>
                  )}
                </div>
              </div>

              <button
                disabled={isLoading}
                type="submit"
                className="btn-terminal-primary w-full py-5 rounded-2xl text-xl font-black uppercase tracking-widest mt-4 disabled:opacity-50"
              >
                {isLoading ? "SYNCING REGISTRY..." : "SIGN UP"}
              </button>

              {/* Mobile login link */}
              <p className="text-center text-sm font-bold text-slate-400 lg:hidden">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-primary-orange underline underline-offset-4"
                >
                  Login
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default Signup;