import React from "react";
import { cn } from "../../utils/cn";
import AppBreadcrumb from "./AppBreadcrumb";

/**
 * AppPageActions — Header action buttons container.
 */
export const AppPageActions = ({ children, className }) => {
  return (
    <div className={cn("flex flex-wrap items-center gap-2.5 shrink-0", className)}>
      {children}
    </div>
  );
};

/**
 * AppPageHeader — Standardized Enterprise Page Header.
 * Features title, subtitle, breadcrumbs, primary/secondary action buttons, search, and filters.
 */
export const AppPageHeader = ({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  search,
  filters,
  className,
}) => {
  return (
    <div className={cn("space-y-4 pb-4 border-b border-gray-200/80 mb-6", className)}>
      {breadcrumbs.length > 0 && <AppBreadcrumb items={breadcrumbs} className="mb-2" />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          {title && (
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-xs sm:text-sm text-gray-500 font-medium">{subtitle}</p>
          )}
        </div>

        {actions && <AppPageActions>{actions}</AppPageActions>}
      </div>

      {(search || filters) && (
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          {search && <div className="w-full sm:w-80">{search}</div>}
          {filters && <div className="flex-1 w-full">{filters}</div>}
        </div>
      )}
    </div>
  );
};

export default AppPageHeader;
