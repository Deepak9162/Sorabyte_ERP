import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * AppToast / AppNotification — Notification alert banner component.
 */
export const AppToast = ({
  title,
  message,
  type = "info", // 'success' | 'warning' | 'danger' | 'info'
  onClose,
  className,
}) => {
  const configs = {
    success: { bg: "bg-emerald-50 border-emerald-200 text-emerald-900", icon: <CheckCircle2 size={18} className="text-emerald-600 shrink-0" /> },
    warning: { bg: "bg-amber-50 border-amber-200 text-amber-900", icon: <AlertTriangle size={18} className="text-amber-600 shrink-0" /> },
    danger: { bg: "bg-rose-50 border-rose-200 text-rose-900", icon: <XCircle size={18} className="text-rose-600 shrink-0" /> },
    info: { bg: "bg-sky-50 border-sky-200 text-sky-900", icon: <Info size={18} className="text-sky-600 shrink-0" /> },
  };

  const config = configs[type] || configs.info;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 border rounded-2xl shadow-lg transition-all animate-in fade-in slide-in-from-top-2 duration-200 max-w-sm w-full select-none",
        config.bg,
        className
      )}
    >
      {config.icon}
      <div className="flex-1 space-y-0.5">
        {title && <h5 className="text-sm font-extrabold">{title}</h5>}
        {message && <p className="text-xs font-medium opacity-90">{message}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

export const AppNotification = AppToast;
export default AppToast;
