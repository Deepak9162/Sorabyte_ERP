import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useId,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X, Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * AppSelect — Global Unified Enterprise Dropdown Component.
 * Unified styling across all modules (Student, Finance, Attendance, Reports, etc.)
 */
export const AppSelect = ({
  options = [],
  value = "",
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search options...",
  label,
  required = false,
  disabled = false,
  error,
  helperText,
  className,
  containerClassName,
  searchable,
  clearable = false,
  emptyText = "No results found",
  loading = false,
  id: externalId,
  valueKey = "value",
  labelKey = "label",
  size = "md", // 'sm' (36px), 'md' (44px), 'lg' (52px)
}) => {
  const internalId = useId();
  const id = externalId || internalId;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, width: 280 });

  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);
  const containerRef = useRef(null);

  // Normalize options array to standard { value, label, badge, disabled } objects
  const normalizedOptions = useMemo(() => {
    if (!Array.isArray(options)) return [];
    return options.map((opt) => {
      if (typeof opt === "string" || typeof opt === "number") {
        return { value: String(opt), label: String(opt) };
      }
      if (opt && typeof opt === "object") {
        const val =
          opt[valueKey] !== undefined
            ? opt[valueKey]
            : opt._id !== undefined
            ? opt._id
            : opt.value;
        const lbl =
          opt[labelKey] !== undefined
            ? opt[labelKey]
            : opt.name !== undefined
            ? opt.name
            : opt.title !== undefined
            ? opt.title
            : opt.label;
        return {
          ...opt,
          value: String(val ?? ""),
          label: String(lbl ?? val ?? ""),
        };
      }
      return { value: "", label: "" };
    });
  }, [options, valueKey, labelKey]);

  const isSearchable =
    searchable !== undefined ? searchable : normalizedOptions.length > 8;

  const selectedOption = useMemo(
    () =>
      normalizedOptions.find(
        (o) => String(o.value) === String(value)
      ) || null,
    [normalizedOptions, value]
  );

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return normalizedOptions;
    const q = query.toLowerCase();
    return normalizedOptions.filter((o) =>
      o.label.toLowerCase().includes(q)
    );
  }, [normalizedOptions, query]);

  const updatePopoverPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const itemCount = filteredOptions.length || 1;
    const dropdownHeight = Math.min(
      280,
      (isSearchable ? 48 : 0) + itemCount * 42 + 16
    );
    const dropdownWidth = Math.max(rect.width, 220);

    const spaceBelow = window.innerHeight - rect.bottom;
    let top = rect.bottom + 6;

    if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
      top = rect.top - dropdownHeight - 6;
    } else if (spaceBelow < dropdownHeight) {
      top = Math.max(12, window.innerHeight - dropdownHeight - 12);
    }

    setPopoverPos({
      top,
      left: rect.left,
      width: dropdownWidth,
    });
  }, [filteredOptions.length, isSearchable]);

  const toggleOpen = () => {
    if (disabled) return;
    if (!open) {
      updatePopoverPosition();
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (open) {
      updatePopoverPosition();
      window.addEventListener("resize", updatePopoverPosition);
      window.addEventListener("scroll", updatePopoverPosition, true);
      return () => {
        window.removeEventListener("resize", updatePopoverPosition);
        window.removeEventListener("scroll", updatePopoverPosition, true);
      };
    }
  }, [open, updatePopoverPosition]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        !e.target.closest(".app-select-portal")
      ) {
        setOpen(false);
        setQuery("");
        setFocusedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    if (open && isSearchable) {
      setTimeout(() => searchRef.current?.focus(), 60);
    }
    if (!open) {
      setQuery("");
      setFocusedIndex(-1);
    }
  }, [open, isSearchable]);

  useEffect(() => {
    if (focusedIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[focusedIndex];
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [focusedIndex]);

  const handleSelect = useCallback(
    (opt) => {
      if (opt.disabled) return;
      onChange?.(opt.value);
      setOpen(false);
      setQuery("");
      setFocusedIndex(-1);
      triggerRef.current?.focus();
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e) => {
      e.stopPropagation();
      onChange?.("");
      triggerRef.current?.focus();
    },
    [onChange]
  );

  const handleTriggerKeyDown = (e) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) toggleOpen();
    }
    if (e.key === "Escape") setOpen(false);
  };

  const handleListKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && focusedIndex >= 0) {
      e.preventDefault();
      const opt = filteredOptions[focusedIndex];
      if (opt) handleSelect(opt);
    }
  };

  const sizeClasses = {
    sm: "h-9 text-xs px-3 rounded-xl",
    md: "h-11 text-sm px-3.5 rounded-xl",
    lg: "h-13 text-base px-4 rounded-2xl",
  };

  return (
    <div
      ref={containerRef}
      className={cn("w-full space-y-1.5 relative", containerClassName)}
    >
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-bold text-gray-700 uppercase tracking-wider ml-0.5"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        disabled={disabled}
        onClick={toggleOpen}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "w-full flex items-center justify-between gap-2 text-sm font-medium transition-all duration-150 outline-none select-none text-left cursor-pointer shadow-2xs",
          "bg-white border border-gray-200/90 hover:border-indigo-400 hover:shadow-xs",
          open && "border-indigo-600 ring-4 ring-indigo-500/10 shadow-sm",
          disabled && "opacity-50 cursor-not-allowed bg-gray-100/80 border-gray-200 shadow-none",
          error && !open && "border-rose-400 focus:ring-rose-500/10",
          sizeClasses[size] || sizeClasses.md,
          className
        )}
      >
        <span
          className={cn(
            "truncate",
            selectedOption ? "text-gray-900 font-semibold" : "text-gray-400 font-normal"
          )}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <span className="flex items-center gap-1.5 shrink-0">
          {clearable && selectedOption && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              aria-label="Clear selection"
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={14} />
            </span>
          )}
          {loading ? (
            <Loader2 size={16} className="text-indigo-600 animate-spin" />
          ) : (
            <ChevronDown
              size={16}
              className={cn(
                "text-gray-400 transition-transform duration-200",
                open && "rotate-180 text-indigo-600"
              )}
            />
          )}
        </span>
      </button>

      {error ? (
        <p className="text-xs text-rose-500 font-semibold ml-0.5 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0" />
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-gray-500 font-normal ml-0.5">{helperText}</p>
      ) : null}

      {open &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`,
              width: `${popoverPos.width}px`,
            }}
            role="dialog"
            onKeyDown={handleListKeyDown}
            className="app-select-portal z-[9999] bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {isSearchable && (
              <div className="p-2 border-b border-gray-100 bg-gray-50/60">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setFocusedIndex(0);
                    }}
                    placeholder={searchPlaceholder}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-800 placeholder:text-gray-400"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            <div
              ref={listRef}
              id={`${id}-listbox`}
              role="listbox"
              className="max-h-60 overflow-y-auto p-1.5 space-y-1 custom-scrollbar"
            >
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                    {emptyText}
                  </p>
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = String(opt.value) === String(value);
                  const isFocused = focusedIndex === idx;
                  return (
                    <div
                      key={`${opt.value}-${idx}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(opt)}
                      onMouseEnter={() => setFocusedIndex(idx)}
                      className={cn(
                        "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer transition-all duration-150 min-h-[40px]",
                        opt.disabled && "opacity-40 cursor-not-allowed",
                        isSelected
                          ? "bg-indigo-600 text-white font-bold shadow-2xs"
                          : isFocused
                          ? "bg-indigo-50/80 text-indigo-900 font-semibold"
                          : "text-gray-700 font-medium hover:bg-gray-100/80 hover:text-gray-900"
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      <span className="flex items-center gap-2 shrink-0 ml-2">
                        {opt.badge !== undefined && (
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-md",
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-gray-100 text-gray-500"
                            )}
                          >
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && (
                          <Check size={16} className="text-white shrink-0" />
                        )}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default AppSelect;
