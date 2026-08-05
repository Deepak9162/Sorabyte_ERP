import React from "react";
import { cn } from "../../utils/cn";

/**
 * AppStatusPill — Standard status pill indicator used across Attendance, Finance, Student, Homework, etc.
 * Types: 'present', 'absent', 'late', 'paid', 'pending', 'active', 'inactive', 'success', 'danger', 'warning', 'info', 'neutral'
 */
export const AppStatusPill = ({ status = "neutral", label, size = "md", dot = true, className }) => {
  const normalizedStatus = String(status).toLowerCase();

  const configs = {
    present: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200/60", dotBg: "bg-emerald-500", text: "Present" },
    active: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200/60", dotBg: "bg-emerald-500", text: "Active" },
    paid: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200/60", dotBg: "bg-emerald-500", text: "Paid" },
    success: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200/60", dotBg: "bg-emerald-500", text: "Success" },

    absent: { bg: "bg-rose-50 text-rose-700 border-rose-200/60", dotBg: "bg-rose-500", text: "Absent" },
    inactive: { bg: "bg-rose-50 text-rose-700 border-rose-200/60", dotBg: "bg-rose-500", text: "Inactive" },
    danger: { bg: "bg-rose-50 text-rose-700 border-rose-200/60", dotBg: "bg-rose-500", text: "Danger" },

    late: { bg: "bg-amber-50 text-amber-800 border-amber-200/60", dotBg: "bg-amber-500", text: "Late" },
    pending: { bg: "bg-amber-50 text-amber-800 border-amber-200/60", dotBg: "bg-amber-500", text: "Pending" },
    warning: { bg: "bg-amber-50 text-amber-800 border-amber-200/60", dotBg: "bg-amber-500", text: "Warning" },

    info: { bg: "bg-sky-50 text-sky-700 border-sky-200/60", dotBg: "bg-sky-500", text: "Info" },
    neutral: { bg: "bg-gray-100 text-gray-700 border-gray-200/80", dotBg: "bg-gray-400", text: "Neutral" },
  };

  const config = configs[normalizedStatus] || configs.neutral;
  const displayText = label || config.text;

  const sizes = {
    sm: "px-2 py-0.5 text-[10px] font-bold rounded-md gap-1",
    md: "px-2.5 py-1 text-xs font-bold rounded-lg gap-1.5",
    lg: "px-3 py-1.5 text-xs font-extrabold rounded-xl gap-2",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center border font-sans select-none tracking-tight shadow-2xs",
        config.bg,
        sizes[size] || sizes.md,
        className
      )}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 animate-pulse", config.dotBg)} />}
      <span>{displayText}</span>
    </span>
  );
};

export default AppStatusPill;
