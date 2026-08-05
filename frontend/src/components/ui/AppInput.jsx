import React, { useId } from "react";
import { cn } from "../../utils/cn";
import { X } from "lucide-react";

/**
 * AppInput — Standard enterprise text input component.
 */
export const AppInput = React.forwardRef(
  (
    {
      label,
      error,
      helperText,
      required = false,
      disabled = false,
      className,
      containerClassName,
      icon: Icon,
      suffix,
      clearable = false,
      onClear,
      size = "md", // 'sm', 'md', 'lg'
      id: externalId,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const internalId = useId();
    const id = externalId || internalId;

    const sizeClasses = {
      sm: "h-9 text-xs px-3 rounded-xl",
      md: "h-11 text-sm px-4 rounded-xl",
      lg: "h-13 text-base px-4.5 rounded-2xl",
    };

    const iconPadding = {
      sm: "pl-9",
      md: "pl-11",
      lg: "pl-12",
    };

    return (
      <div className={cn("w-full space-y-1.5", containerClassName)}>
        {label && (
          <label
            htmlFor={id}
            className="block text-xs font-bold text-gray-700 uppercase tracking-wider ml-0.5"
          >
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}

        <div className="relative group flex items-center">
          {Icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none z-10">
              <Icon size={size === "sm" ? 16 : size === "lg" ? 20 : 18} />
            </div>
          )}

          <input
            ref={ref}
            id={id}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={cn(
              "w-full bg-white border border-gray-200/90 text-gray-900 font-medium transition-all duration-150 outline-none shadow-2xs",
              "placeholder:text-gray-400 placeholder:font-normal focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white",
              disabled && "bg-gray-100/80 text-gray-400 cursor-not-allowed border-gray-200 shadow-none",
              error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10",
              Icon && iconPadding[size],
              (suffix || (clearable && value)) && "pr-10",
              sizeClasses[size] || sizeClasses.md,
              className
            )}
            {...props}
          />

          {clearable && value && !disabled && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              <X size={16} />
            </button>
          )}

          {suffix && !clearable && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center z-10 text-gray-400 text-sm">
              {suffix}
            </div>
          )}
        </div>

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

AppInput.displayName = "AppInput";
export default AppInput;
