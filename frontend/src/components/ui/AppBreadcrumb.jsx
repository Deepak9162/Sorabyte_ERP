import React from "react";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * AppBreadcrumb — Enterprise path navigation bar.
 */
export const AppBreadcrumb = ({ items = [], className }) => {
  return (
    <nav className={cn("flex items-center gap-1.5 text-xs font-semibold text-gray-500", className)}>
      <a href="/" className="hover:text-indigo-600 flex items-center gap-1">
        <Home size={14} />
      </a>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight size={14} className="text-gray-400 shrink-0" />
          {item.href ? (
            <a href={item.href} className="hover:text-indigo-600 transition-colors">
              {item.label}
            </a>
          ) : (
            <span className="text-gray-900 font-extrabold">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default AppBreadcrumb;
