import React from "react";
import { cn } from "../../utils/cn";

/**
 * AppSkeleton — Reusable pulse skeleton component for card, table, text, and avatar placeholders.
 */
export const AppSkeleton = ({ className, count = 1, height, width, circle = false }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{ height, width }}
          className={cn(
            "bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse",
            circle ? "rounded-full" : "rounded-xl",
            !height && "h-4",
            !width && "w-full",
            className
          )}
        />
      ))}
    </>
  );
};

export const AppTableSkeleton = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="space-y-3 p-4 bg-white border border-gray-200/90 rounded-2xl">
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, c) => (
          <AppSkeleton key={`h-${c}`} className="h-6 flex-1 rounded-lg" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`r-${r}`} className="flex gap-4 pt-2 border-t border-gray-100">
          {Array.from({ length: cols }).map((_, c) => (
            <AppSkeleton key={`cell-${r}-${c}`} className="h-8 flex-1 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
};

export const AppCardSkeleton = ({ className }) => (
  <div className={cn("p-6 bg-white border border-gray-200/90 rounded-2xl space-y-4", className)}>
    <AppSkeleton className="h-6 w-1/3 rounded-lg" />
    <AppSkeleton className="h-10 w-1/2 rounded-xl" />
    <AppSkeleton className="h-4 w-2/3 rounded-md" />
  </div>
);

export const CardSkeleton = AppCardSkeleton;
export const TableSkeleton = AppTableSkeleton;
export default AppSkeleton;
