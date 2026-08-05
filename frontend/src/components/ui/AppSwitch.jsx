import React, { useId } from "react";
import { cn } from "../../utils/cn";
import { Loader2 } from "lucide-react";

/**
 * AppSwitch — Smooth iOS/Linear style toggle switch.
 */
export const AppSwitch = React.forwardRef(
  (
    {
      checked = false,
      onChange,
      label,
      description,
      disabled = false,
      loading = false,
      size = "md",
      className,
      id: externalId,
      ...props
    },
    ref
  ) => {
    const internalId = useId();
    const id = externalId || internalId;

    const sizes = {
      sm: { track: "w-8 h-4.5 p-0.5", thumb: "w-3.5 h-3.5", translate: "translate-x-3.5" },
      md: { track: "w-11 h-6 p-0.5", thumb: "w-5 h-5", translate: "translate-x-5" },
      lg: { track: "w-14 h-7 p-1", thumb: "w-5 h-5", translate: "translate-x-7" },
    };

    const s = sizes[size] || sizes.md;

    return (
      <div className={cn("inline-flex items-center gap-3 select-none", className)}>
        <button
          ref={ref}
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled || loading}
          onClick={() => onChange?.(!checked)}
          className={cn(
            "relative inline-flex items-center rounded-full transition-colors duration-200 cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:ring-offset-1",
            checked ? "bg-indigo-600" : "bg-gray-200",
            (disabled || loading) && "opacity-50 cursor-not-allowed",
            s.track
          )}
          {...props}
        >
          <span
            className={cn(
              "inline-block rounded-full bg-white shadow-md transform transition-transform duration-200 ease-out flex items-center justify-center",
              checked ? s.translate : "translate-x-0",
              s.thumb
            )}
          >
            {loading && <Loader2 size={10} className="animate-spin text-indigo-600" />}
          </span>
        </button>

        {(label || description) && (
          <label htmlFor={id} className="cursor-pointer">
            {label && (
              <span className={cn("block text-sm font-semibold text-gray-800", disabled && "text-gray-400")}>
                {label}
              </span>
            )}
            {description && (
              <span className="block text-xs text-gray-500 font-normal">
                {description}
              </span>
            )}
          </label>
        )}
      </div>
    );
  }
);

AppSwitch.displayName = "AppSwitch";
export default AppSwitch;
