import React from "react";
import { cn } from "../../utils/cn";
import { Loader2 } from "lucide-react";

/**
 * AppButton — Primary enterprise button component.
 * Features smooth micro-interactions, multiple variants, sizes, and icon positioning.
 */
export const AppButton = React.forwardRef(
  (
    {
      children,
      className,
      variant = "primary",
      size = "md",
      disabled = false,
      loading = false,
      icon: Icon,
      iconRight: IconRight,
      fullWidth = false,
      type = "button",
      ...props
    },
    ref
  ) => {
    const variants = {
      primary:
        "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-sm hover:from-indigo-700 hover:to-indigo-800 hover:shadow-md active:scale-[0.98] border border-indigo-600/20",
      secondary:
        "bg-white text-gray-700 border border-gray-200/90 shadow-2xs hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 active:bg-gray-100",
      outline:
        "bg-transparent text-indigo-600 border border-indigo-600/30 hover:bg-indigo-50/60 active:bg-indigo-100/60",
      ghost:
        "bg-transparent text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 active:bg-gray-200/60",
      danger:
        "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-sm hover:from-rose-700 hover:to-red-700 hover:shadow-md active:scale-[0.98] border border-red-600/20",
      success:
        "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm hover:from-emerald-700 hover:to-teal-700 hover:shadow-md active:scale-[0.98]",
      warning:
        "bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-sm hover:from-amber-600 hover:to-yellow-700 hover:shadow-md active:scale-[0.98]",
    };

    const sizes = {
      xs: "px-3 py-1.5 text-xs h-8 rounded-lg gap-1.5",
      sm: "px-3.5 py-2 text-xs font-semibold h-9 rounded-xl gap-2",
      md: "px-5 py-2.5 text-sm font-semibold h-11 rounded-xl gap-2.5",
      lg: "px-6 py-3 text-base font-semibold h-13 rounded-2xl gap-3",
      xl: "px-8 py-4 text-base font-bold h-14 rounded-2xl gap-3",
    };

    const iconSizes = {
      xs: 14,
      sm: 16,
      md: 18,
      lg: 20,
      xl: 22,
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-150 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:ring-offset-1",
          variants[variant] || variants.primary,
          sizes[size] || sizes.md,
          fullWidth && "w-full",
          (disabled || loading) &&
            "opacity-55 cursor-not-allowed pointer-events-none shadow-none transform-none",
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2
            size={iconSizes[size] || 18}
            className="animate-spin text-current shrink-0"
          />
        ) : (
          Icon && <Icon size={iconSizes[size] || 18} className="shrink-0" />
        )}

        {children && (
          <span className="inline-flex items-center justify-center gap-2">
            {children}
          </span>
        )}

        {!loading && IconRight && (
          <IconRight size={iconSizes[size] || 18} className="shrink-0 ml-0.5" />
        )}
      </button>
    );
  }
);

AppButton.displayName = "AppButton";
export default AppButton;
