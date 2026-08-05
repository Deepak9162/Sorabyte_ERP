import React from "react";
import { cn } from "../../utils/cn";

/**
 * AppFormField — Container for form controls providing uniform spacing, label, required indicator, helper text, and error message.
 */
export const AppFormField = ({
  label,
  required = false,
  error,
  helperText,
  children,
  className,
  id,
}) => {
  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-bold text-gray-700 uppercase tracking-wider ml-0.5"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {children}

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
};

export default AppFormField;
