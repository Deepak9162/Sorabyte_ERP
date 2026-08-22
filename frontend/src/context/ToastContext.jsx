import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "../utils/cn";

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const icons = {
    success: <CheckCircle size={18} className="text-emerald-500" />,
    error: <AlertCircle size={18} className="text-rose-500" />,
    info: <Info size={18} className="text-indigo-500" />,
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-6 right-6 z-[99999] space-y-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "p-4 rounded-2xl shadow-2xl border flex items-center gap-3 min-w-[300px] pointer-events-auto animate-in slide-in-from-right-full slide-out-to-right-full transition-all bg-white",
              t.type === "success" && "border-emerald-100",
              t.type === "error" && "border-rose-100",
              t.type === "info" && "border-indigo-100",
            )}
          >
            {icons[t.type]}
            <span className="flex-1 text-sm font-bold text-gray-800">
              {t.message}
            </span>
            <button
              onClick={() => removeToast(t.id)}
              className="text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
