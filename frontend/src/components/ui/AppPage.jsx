import React from "react";
import { cn } from "../../utils/cn";

/**
 * AppPage — Standard page container enforcing max-width, responsive padding, & layout structure.
 */
export const AppPage = ({ children, className }) => {
  return (
    <div className={cn("min-h-full space-y-5 max-w-7xl mx-auto", className)}>
      {children}
    </div>
  );
};

/**
 * AppSection — Content section container with optional title & border.
 */
export const AppSection = ({ title, subtitle, action, children, className }) => {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            {title && <h2 className="text-base font-extrabold text-gray-900">{title}</h2>}
            {subtitle && <p className="text-xs text-gray-500 font-medium">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
};

/**
 * AppContainer — Constrained container wrapper.
 */
export const AppContainer = ({ children, className, size = "default" }) => {
  const sizes = {
    sm: "max-w-3xl",
    default: "max-w-5xl",
    lg: "max-w-7xl",
    full: "max-w-full",
  };
  return (
    <div className={cn("w-full mx-auto px-4 sm:px-6", sizes[size] || sizes.default, className)}>
      {children}
    </div>
  );
};

/**
 * AppGrid — Responsive grid layout using standardized column scales.
 */
export const AppGrid = ({ children, cols = 3, gap = 4, className }) => {
  const colClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
  };

  return (
    <div className={cn("grid", colClasses[cols] || colClasses[3], `gap-${gap}`, className)}>
      {children}
    </div>
  );
};

/**
 * AppStack — Vertical or horizontal flex stack layout.
 */
export const AppStack = ({ children, direction = "col", gap = 3, align = "stretch", justify = "start", className }) => {
  return (
    <div
      className={cn(
        "flex",
        direction === "row" ? "flex-row" : "flex-col",
        `gap-${gap}`,
        `items-${align}`,
        `justify-${justify}`,
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * AppDivider — Spacing divider element.
 */
export const AppDivider = ({ label, className }) => {
  if (label) {
    return (
      <div className={cn("relative flex py-2 items-center", className)}>
        <div className="flex-grow border-t border-gray-200" />
        <span className="flex-shrink mx-3 text-xs font-bold uppercase tracking-wider text-gray-400">
          {label}
        </span>
        <div className="flex-grow border-t border-gray-200" />
      </div>
    );
  }
  return <hr className={cn("border-t border-gray-200/80 my-4", className)} />;
};

export default AppPage;
