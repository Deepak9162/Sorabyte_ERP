import React from "react";
import { cn } from "../../utils/cn";

const Input = ({
  label,
  error,
  className,
  icon: Icon,
  suffix,
  containerClassName,
  ...props
}) => {
  return (
    <div className={cn("w-full space-y-2", containerClassName)}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 ml-1">
          {label}
        </label>
      )}
      <div className="relative group flex items-center">
        {Icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors z-10">
            <Icon size={18} />
          </div>
        )}
        <input
          className={cn(
            "w-full bg-white border border-gray-200 text-gray-900 text-sm sm:text-base rounded-2xl block p-4 sm:p-3 transition-all duration-200 outline-none",
            "placeholder:text-gray-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100",
            Icon && "pl-14 sm:pl-12",
            suffix && "pr-14 sm:pr-12",
            error &&
              "border-red-500 focus:border-red-500 focus:ring-red-500/10",
            className,
          )}
          {...props}
        />
        {suffix && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center z-10">
            {suffix}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-500 font-medium ml-1 flex items-center gap-1 animate-in fade-in slide-in-from-left-1">
          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
