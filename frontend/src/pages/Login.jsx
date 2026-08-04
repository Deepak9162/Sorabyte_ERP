import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowRight,
  GraduationCap,
  BookOpen,
  Wallet,
  BarChart3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import SchoolLogo from "../components/ui/SchoolLogo";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const hasLoggedInRef = useRef(false);

  useEffect(() => {
    // If we just logged in and are redirecting, bypass auto-logout
    if (hasLoggedInRef.current) return;

    // Auto-logout when user lands on login page but has a token (e.g., using Back button)
    const token = localStorage.getItem("token");
    if (token) {
      logout();
    }

    // Check if redirected due to inactivity
    const wasInactive = localStorage.getItem("inactivityLogout");
    if (wasInactive) {
      setError("Your session has expired due to inactivity. Please log in again.");
      localStorage.removeItem("inactivityLogout");
    }
  }, [logout]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const user = await login(email, password);
      hasLoggedInRef.current = true;
      // Redirect based on role
      if (user.role === "admin") {
        navigate("/dashboard");
      } else {
        navigate("/teacher-dashboard");
      }
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const featureCards = [
    {
      icon: GraduationCap,
      title: "Student Management",
      desc: "Complete profiles, roll numbers & academic tracking.",
      color: "text-[#FF6B35] bg-orange-50 border-orange-100",
    },
    {
      icon: BookOpen,
      title: "Academics & Classes",
      desc: "Timetables, subject mapping & curriculum organization.",
      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
    },
    {
      icon: Wallet,
      title: "Fees & Finance",
      desc: "Seamless fee collection, transaction logs & instant receipts.",
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      icon: BarChart3,
      title: "Reports & Analytics",
      desc: "Real-time attendance insights & institutional metrics.",
      color: "text-sky-600 bg-sky-50 border-sky-100",
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-sky-50/30 to-orange-50/20 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10 font-sans selection:bg-[#FF6B35] selection:text-white">
      {/* Decorative Background Elements */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-200/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-6xl relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center my-auto">
        
        {/* Mobile-Only Header Branding (Displays top on mobile only) */}
        <div className="lg:hidden space-y-3.5 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/80 border border-orange-200/80 text-orange-700 text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-sm">
            <Sparkles size={14} className="text-[#FF6B35]" />
            Official ERP Portal
          </div>

          <div className="flex items-center gap-3.5">
            <div className="p-1 bg-white rounded-2xl shadow-md border border-slate-100 shrink-0">
              <SchoolLogo className="w-12 h-12 sm:w-14 sm:h-14" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                Little Flower English School
              </h1>
              <p className="text-xs sm:text-sm font-bold bg-gradient-to-r from-[#FF6B35] to-indigo-900 bg-clip-text text-transparent mt-0.5">
                Nurturing Knowledge, Building Character
              </p>
            </div>
          </div>
        </div>

        {/* Right Section: Floating Glass Login Card (Appears Second on Mobile, Right on Desktop) */}
        <div className="lg:col-span-5 lg:order-2 animate-in fade-in slide-in-from-right-6 duration-700">
          <div className="bg-white/85 backdrop-blur-xl border border-white/90 rounded-3xl p-6 sm:p-9 shadow-2xl shadow-slate-900/10 relative overflow-hidden">
            {/* Top Accent Gradient Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-slate-900 via-[#FF6B35] to-orange-400" />

            {/* Card Header */}
            <div className="space-y-2 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center shadow-md text-white mb-3">
                <ShieldCheck size={22} className="text-[#FF6B35]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Welcome Back
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Sign in to continue to your school dashboard.
              </p>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="mb-6 p-4 bg-rose-50/90 border border-rose-200/80 rounded-2xl flex items-start gap-3 text-rose-800 text-xs sm:text-sm font-semibold shadow-sm animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider mb-0.5">
                    Authentication Error
                  </p>
                  <p className="text-xs font-bold text-rose-800">{error}</p>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF6B35] transition-colors"
                    size={18}
                  />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/15 transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  Password
                </label>
                <div className="relative group">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF6B35] transition-colors"
                    size={18}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-10 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/15 transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#FF6B35] transition-colors p-1 focus:outline-none"
                    tabIndex="-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3.5 px-6 bg-gradient-to-r from-[#FF6B35] to-[#FF8A3D] hover:from-[#e85a24] hover:to-[#ff7a2c] active:scale-[0.99] text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/35 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 group cursor-pointer border border-orange-400/30 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin text-white" />
                ) : (
                  <>
                    <span>Sign In Securely</span>
                    <ArrowRight
                      size={18}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </>
                )}
              </button>
            </form>

            {/* Footer Links inside Login Box */}
            <div className="mt-6 pt-5 border-t border-slate-100 space-y-2.5">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>© 2026 Little Flower School</span>
              </div>

              {/* Sorabyte Branding */}
              <div className="text-center pt-2 border-t border-slate-100/60 text-[11px] font-bold text-slate-400">
                Powered & Developed by{" "}
                <a
                  href="https://www.sorabyte.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#FF6B35] hover:text-indigo-900 transition-colors font-black tracking-wide underline underline-offset-2"
                >
                  Sorabyte
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Left Section: Desktop Full Branding & Mobile Feature Cards (Appears Third on Mobile, Left on Desktop) */}
        <div className="lg:col-span-7 lg:order-1 space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-left-6 duration-700">
          {/* Desktop Only Header & Logo */}
          <div className="hidden lg:block space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/80 border border-orange-200/80 text-orange-700 text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-sm">
              <Sparkles size={14} className="text-[#FF6B35]" />
              Official ERP Portal
            </div>

            <div className="flex items-center gap-4">
              <div className="p-1 bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 shrink-0">
                <SchoolLogo className="w-14 h-14 sm:w-16 sm:h-16" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  Little Flower English School
                </h1>
                <p className="text-sm sm:text-base font-bold bg-gradient-to-r from-[#FF6B35] to-indigo-900 bg-clip-text text-transparent mt-0.5">
                  Nurturing Knowledge, Building Character
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-xl">
            An integrated, enterprise-grade school management platform designed for students, parents, teachers, and administrators.
          </p>

          {/* 4 Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {featureCards.map((card, idx) => (
              <div
                key={idx}
                className="bg-white/70 backdrop-blur-md border border-white/80 p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-orange-200/80 transition-all duration-300 hover:-translate-y-0.5 group flex gap-3.5 items-start"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${card.color} shadow-sm group-hover:scale-105 transition-transform`}
                >
                  <card.icon size={20} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide group-hover:text-[#FF6B35] transition-colors">
                    {card.title}
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-500 leading-snug mt-0.5">
                    {card.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Global Page Footer Branding */}
      <div className="w-full max-w-6xl relative z-10 text-center mt-4 sm:mt-6 text-xs font-semibold text-slate-400">
        <span>© 2026 Little Flower English School • Powered & Developed by </span>
        <a
          href="https://www.sorabyte.in"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#FF6B35] hover:text-slate-900 font-extrabold transition-colors underline underline-offset-2"
        >
          Sorabyte
        </a>
      </div>
    </div>
  );
};

export default Login;
