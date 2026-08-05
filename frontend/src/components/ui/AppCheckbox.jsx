import React, { useId } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * AppCheckbox — Reusable custom enterprise checkbox control.
 */
export const AppCheckbox = React.forwardRef(
  (
    {
      checked = false,
      indeterminate = false,
      onChange,
      label,
      description,
      disabled = false,
      error,
      className,
      id: externalId,
      ...props
    },
    ref
  ) => {
    const internalId = useId();
    const id = externalId || internalId;

    return (
      <div className={cn("inline-flex items-start gap-2.5 select-none", className)}>
        <div className="relative flex items-center pt-0.5">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.checked, e)}
            className="sr-only"
            {...props}
          />
          <label
            htmlFor={id}
            className={cn(
              "w-5 h-5 rounded-lg border transition-all duration-150 flex items-center justify-center cursor-pointer shadow-2xs",
              checked || indeterminate
                ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                : "bg-white border-gray-300 hover:border-indigo-400",
              disabled && "opacity-50 cursor-not-allowed bg-gray-100 border-gray-200 shadow-none",
              error && "border-rose-400 focus:ring-rose-500/10"
            )}
          >
            {indeterminate ? (
              <Minus size={14} className="stroke-[3]" />
            ) : checked ? (
              <Check size={14} className="stroke-[3]" />
            ) : null}
          </label>
        </div>

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

AppCheckbox.displayName = "AppCheckbox";
export default AppCheckbox;
