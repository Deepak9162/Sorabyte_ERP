import React from "react";
import { cn } from "../../utils/cn";

/**
 * AppCard — Reusable card component inspired by Stripe & Vercel design systems.
 */
export const AppCard = ({
  children,
  className,
  header,
  title,
  subtitle,
  action,
  footer,
  hoverable = false,
  glass = false,
  noPadding = false,
}) => {
  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-200 overflow-hidden",
        glass
          ? "bg-white/80 backdrop-blur-md border-gray-200/80 shadow-sm"
          : "bg-white border-gray-200/90 shadow-2xs",
        hoverable && "hover:border-indigo-200 hover:shadow-md hover:-translate-y-0.5",
        className
      )}
    >
      {(header || title || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100/90 bg-gray-50/40">
          <div>
            {title && <h3 className="text-base font-extrabold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 font-medium mt-0.5">{subtitle}</p>}
            {header}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}

      <div className={cn(!noPadding && "p-6")}>{children}</div>

      {footer && (
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/30 text-xs text-gray-500 font-medium">
          {footer}
        </div>
      )}
    </div>
  );
};

export default AppCard;
