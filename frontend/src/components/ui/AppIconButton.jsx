import React from "react";
import { cn } from "../../utils/cn";
import { Loader2 } from "lucide-react";

/**
 * AppIconButton — Compact square or rounded button for icons with optional badge/tooltip.
 */
export const AppIconButton = React.forwardRef(
  (
    {
      icon: Icon,
      className,
      variant = "secondary",
      size = "md",
      disabled = false,
      loading = false,
      rounded = false,
      title,
      type = "button",
      badge,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary: "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-2xs",
      secondary: "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100 shadow-2xs",
      outline: "bg-transparent text-indigo-600 border border-indigo-200 hover:bg-indigo-50/60 active:bg-indigo-100",
      ghost: "bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800 active:bg-gray-200",
      danger: "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 active:scale-95",
      success: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 active:scale-95",
    };

    const sizes = {
      xs: "w-7 h-7 p-1 text-xs",
      sm: "w-8 h-8 p-1.5 text-xs",
      md: "w-10 h-10 p-2 text-sm",
      lg: "w-12 h-12 p-2.5 text-base",
    };

    const iconSizes = {
      xs: 14,
      sm: 16,
      md: 18,
      lg: 22,
    };

    return (
      <button
        ref={ref}
        type={type}
        title={title}
        disabled={disabled || loading}
        className={cn(
          "relative inline-flex items-center justify-center font-medium transition-all duration-150 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:ring-offset-1",
          rounded ? "rounded-full" : "rounded-xl",
          variants[variant] || variants.secondary,
          sizes[size] || sizes.md,
          (disabled || loading) && "opacity-50 cursor-not-allowed pointer-events-none transform-none",
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 size={iconSizes[size] || 18} className="animate-spin text-current shrink-0" />
        ) : (
          Icon && <Icon size={iconSizes[size] || 18} className="shrink-0" />
        )}

        {badge !== undefined && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-2xs">
            {badge}
          </span>
        )}
      </button>
    );
  }
);

AppIconButton.displayName = "AppIconButton";
export default AppIconButton;
