import React, { useId } from "react";
import { cn } from "../../utils/cn";

/**
 * AppTextarea — Reusable enterprise multi-line text input with character limit & error state.
 */
export const AppTextarea = React.forwardRef(
  (
    {
      label,
      error,
      helperText,
      required = false,
      disabled = false,
      className,
      containerClassName,
      rows = 3,
      maxLength,
      value,
      id: externalId,
      ...props
    },
    ref
  ) => {
    const internalId = useId();
    const id = externalId || internalId;
    const charCount = typeof value === "string" ? value.length : 0;

    return (
      <div className={cn("w-full space-y-1.5", containerClassName)}>
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={id}
              className="block text-xs font-bold text-gray-700 uppercase tracking-wider ml-0.5"
            >
              {label} {required && <span className="text-rose-500">*</span>}
            </label>
            {maxLength && (
              <span className="text-[11px] font-semibold text-gray-400">
                {charCount}/{maxLength}
              </span>
            )}
          </div>
        )}

        <textarea
          ref={ref}
          id={id}
          rows={rows}
          value={value}
          maxLength={maxLength}
          disabled={disabled}
          className={cn(
            "w-full bg-white border border-gray-200/90 text-gray-900 text-sm rounded-xl p-3 font-medium transition-all duration-150 outline-none shadow-2xs resize-y custom-scrollbar",
            "placeholder:text-gray-400 placeholder:font-normal focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white",
            disabled && "bg-gray-100/80 text-gray-400 cursor-not-allowed border-gray-200 shadow-none",
            error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10",
            className
          )}
          {...props}
        />

        {error ? (
          <p className="text-xs text-rose-500 font-semibold ml-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0" />
            {error}
          </p>
        ) : helperText ? (
          <p className="text-xs text-gray-500 font-normal ml-0.5">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

AppTextarea.displayName = "AppTextarea";
export default AppTextarea;
