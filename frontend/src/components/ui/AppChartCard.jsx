import React from "react";
import { BarChart3 } from "lucide-react";
import { cn } from "../../utils/cn";
import AppSkeleton from "./AppSkeleton";
import AppEmptyState from "./AppEmptyState";

/**
 * AppChartCard — Standardized Chart Container with title, subtitle, legend, loading, & zero-state.
 */
export const AppChartCard = ({
  title,
  subtitle,
  children,
  action,
  legend,
  loading = false,
  empty = false,
  emptyTitle = "No chart data available",
  className,
}) => {
  return (
    <div
      className={cn(
        "p-6 bg-white border border-gray-200/90 rounded-3xl shadow-2xs space-y-4 overflow-hidden",
        className
      )}
    >
      {(title || action || legend) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            {title && <h3 className="text-base font-extrabold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 font-medium mt-0.5">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-3">
            {legend && <div className="text-xs font-semibold text-gray-600">{legend}</div>}
            {action && <div>{action}</div>}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3 py-6">
          <AppSkeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : empty ? (
        <AppEmptyState icon={BarChart3} title={emptyTitle} description="Wait for data or adjust your filters." />
      ) : (
        <div className="w-full h-full">{children}</div>
      )}
    </div>
  );
};

export default AppChartCard;
