import React from "react";
import { cn } from "../../utils/cn";
import { X } from "lucide-react";

/**
 * AppBadge — Reusable generic badge element for counts, tags, & highlights.
 */
export const AppBadge = ({
  children,
  variant = "neutral", // 'primary', 'secondary', 'success', 'warning', 'danger', 'info', 'neutral', 'outline'
  size = "md",
  className,
}) => {
  const variants = {
    primary: "bg-indigo-50 text-indigo-700 border-indigo-200/60",
    secondary: "bg-gray-100 text-gray-800 border-gray-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    warning: "bg-amber-50 text-amber-800 border-amber-200/60",
    danger: "bg-rose-50 text-rose-700 border-rose-200/60",
    info: "bg-sky-50 text-sky-700 border-sky-200/60",
    neutral: "bg-gray-50 text-gray-600 border-gray-200",
    outline: "bg-transparent text-gray-700 border-gray-300",
  };

  const sizes = {
    xs: "px-1.5 py-0.5 text-[10px] font-bold rounded-md",
    sm: "px-2 py-0.5 text-xs font-semibold rounded-lg",
    md: "px-2.5 py-1 text-xs font-bold rounded-lg",
    lg: "px-3 py-1 text-sm font-bold rounded-xl",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center border font-sans select-none tracking-tight",
        variants[variant] || variants.neutral,
        sizes[size] || sizes.md,
        className
      )}
    >
      {children}
    </span>
  );
};

/**
 * AppChip — Interactive removable filter chip component.
 */
export const AppChip = ({ label, onRemove, icon: Icon, className }) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 text-gray-700 font-semibold text-xs rounded-xl shadow-2xs hover:border-gray-300 transition-all select-none",
        className
      )}
    >
      {Icon && <Icon size={14} className="text-gray-400 shrink-0" />}
      <span>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="p-0.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
};

export default AppBadge;
