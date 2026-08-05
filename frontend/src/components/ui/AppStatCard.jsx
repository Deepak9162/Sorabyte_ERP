import React from "react";
import { cn } from "../../utils/cn";
import { TrendingUp, TrendingDown } from "lucide-react";

/**
 * AppStatCard — Enterprise Metric / KPI display card with title, primary value, trend badge, icon badge, & sub-label.
 */
export const AppStatCard = ({
  title,
  value,
  trend, // e.g. "+12.5%" or "-3.2%"
  trendType = "up", // 'up' | 'down' | 'neutral'
  trendLabel,
  icon: Icon,
  iconColor = "indigo", // 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky'
  badgeText,
  loading = false,
  className,
}) => {
  const iconColors = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    sky: "bg-sky-50 text-sky-600 border-sky-100",
  };

  return (
    <div
      className={cn(
        "relative p-5 bg-white border border-gray-200/90 rounded-2xl shadow-2xs hover:shadow-md hover:border-gray-300 transition-all duration-200 overflow-hidden flex flex-col justify-between",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {title}
          </span>

          {loading ? (
            <div className="h-8 w-24 bg-gray-200 animate-pulse rounded-lg mt-1" />
          ) : (
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {value}
            </div>
          )}
        </div>

        {Icon && (
          <div
            className={cn(
              "w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-2xs",
              iconColors[iconColor] || iconColors.indigo
            )}
          >
            <Icon size={22} />
          </div>
        )}
      </div>

      {(trend || trendLabel || badgeText) && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md",
                trendType === "up"
                  ? "bg-emerald-50 text-emerald-700"
                  : trendType === "down"
                  ? "bg-rose-50 text-rose-700"
                  : "bg-gray-100 text-gray-700"
              )}
            >
              {trendType === "up" ? (
                <TrendingUp size={14} />
              ) : trendType === "down" ? (
                <TrendingDown size={14} />
              ) : null}
              {trend}
            </span>
          )}

          {trendLabel && (
            <span className="text-gray-500 font-medium">{trendLabel}</span>
          )}

          {badgeText && (
            <span className="font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
              {badgeText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default AppStatCard;
