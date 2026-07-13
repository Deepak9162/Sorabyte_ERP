import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  School,
  AlertCircle,
  Loader2,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { cn } from "../utils/cn";
import SchoolLogo from "../components/ui/SchoolLogo";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 sm:p-8 font-sans">
      <div className="w-full max-w-md space-y-8">
        {/* Logo & Branding */}
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-2 animate-bounce-subtle">
            <SchoolLogo className="w-24 h-24 filter drop-shadow-xl" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              Little Flower English School Portal
            </h1>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">
              Secure Educational Enterprise
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white p-8 sm:p-12 rounded-[3rem] shadow-2xl shadow-indigo-50/50 border border-gray-100 animate-in fade-in slide-in-from-bottom-10 duration-700">
          {/* Role Switcher */}
          {/* <div className="grid grid-cols-2 p-2 bg-gray-50 rounded-2xl mb-10 border border-gray-100">
            <button
              onClick={() => setRole("admin")}
              className={cn(
                "py-3.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300",
                role === "admin"
                  ? "bg-white text-indigo-700 shadow-xl shadow-indigo-100/50 scale-105"
                  : "text-gray-400 hover:text-gray-600",
              )}
            >
            
            </button>
            <button
              onClick={() => setRole("teacher")}
              className={cn(
                "py-3.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300",
                role === "teacher"
                  ? "bg-white text-indigo-700 shadow-xl shadow-indigo-100/50 scale-105"
                  : "text-gray-400 hover:text-gray-600",
              )}
            >
            
            </button>
          </div> */}

          {error && (
            <div className="mb-8 p-6 bg-red-50 border border-red-100 rounded-[1.5rem] flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                <AlertCircle className="text-red-500" size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest leading-none mb-1">
                  Access Denied
                </p>
                <p className="text-sm text-red-800 font-bold leading-tight">
                  {error}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="User Email"
              placeholder="name@littleflowerschool.edu.in"
              type="email"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Secure Password"
              placeholder="••••••••"
              type={showPassword ? "text" : "password"}
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-indigo-600 transition-colors p-1 focus:outline-none"
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              }
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <label className="flex items-center gap-3 cursor-pointer group w-full sm:w-auto">
                <div className="relative flex items-center">
               
                  <CheckCircle
                    size={14}
                    className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                  />
                </div>
                
              </label>
              
            </div>

            <Button
              type="submit"
              className="w-full mt-6 h-16 text-lg font-black uppercase tracking-tight rounded-[1.5rem] shadow-[0_20px_50px_-15px_rgba(79,70,229,0.3)] hover:shadow-indigo-200 relative"
              loading={isLoading}
            >
              {!isLoading && (
                <div className="relative w-full flex items-center justify-center">
                  <span>Authenticate</span>
                  <ArrowRight
                    size={22}
                    className="absolute right-0 group-hover:translate-x-1 transition-transform"
                  />
                </div>
              )}
            </Button>
          </form>
        </div>

        {/* Footer Info */}
        <div className="text-center space-y-2">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">
            © 2026 Little Flower Educational Group
          </p>
          <div className="flex items-center justify-center gap-4 text-[9px] font-bold text-gray-300 uppercase tracking-widest">
            <a href="#" className="hover:text-indigo-400 transition-colors">
              System Privacy
            </a>
            <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
            <a href="#" className="hover:text-indigo-400 transition-colors">
              Support Terminal
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
