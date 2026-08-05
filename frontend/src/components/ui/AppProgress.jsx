import React from "react";
import { cn } from "../../utils/cn";

/**
 * AppProgress — Linear progress bar with indicator label.
 */
export const AppProgress = ({
  value = 0,
  max = 100,
  label,
  showValue = true,
  size = "md", // 'sm' | 'md' | 'lg'
  color = "indigo", // 'indigo' | 'emerald' | 'amber' | 'rose'
  className,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const colors = {
    indigo: "bg-indigo-600",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  };

  const heights = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div className={cn("w-full space-y-1", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs font-bold text-gray-700">
          {label && <span>{label}</span>}
          {showValue && <span>{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={cn("w-full bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200/60 shadow-2xs", heights[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-300 ease-out", colors[color] || colors.indigo)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default AppProgress;
