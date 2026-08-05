import React, { useRef, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * AppSearch — Global search bar with keyboard shortcut hint, clear button, and smooth focus styling.
 */
export const AppSearch = ({
  value = "",
  onChange,
  onClear,
  placeholder = "Search students, fees, records...",
  loading = false,
  shortcut = "⌘K",
  className,
  size = "md",
  autoFocus = false,
  ...props
}) => {
  const inputRef = useRef(null);

  const handleClear = () => {
    if (onChange) onChange({ target: { value: "" } });
    if (onClear) onClear();
    inputRef.current?.focus();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const sizeClasses = {
    sm: "h-9 text-xs pl-9 pr-14 rounded-xl",
    md: "h-11 text-sm pl-11 pr-16 rounded-xl",
    lg: "h-13 text-base pl-12 pr-20 rounded-2xl",
  };

  return (
    <div className={cn("relative w-full group flex items-center", className)}>
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none z-10">
        {loading ? (
          <Loader2 size={size === "sm" ? 14 : 18} className="animate-spin text-indigo-600" />
        ) : (
          <Search size={size === "sm" ? 14 : 18} />
        )}
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={cn(
          "w-full bg-white border border-gray-200/90 text-gray-900 font-medium transition-all duration-150 outline-none shadow-2xs",
          "placeholder:text-gray-400 placeholder:font-normal focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white",
          sizeClasses[size] || sizeClasses.md
        )}
        {...props}
      />

      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            title="Clear search"
          >
            <X size={14} />
          </button>
        ) : shortcut ? (
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold text-gray-400 bg-gray-100 border border-gray-200 rounded-md select-none">
            {shortcut}
          </kbd>
        ) : null}
      </div>
    </div>
  );
};

export default AppSearch;
