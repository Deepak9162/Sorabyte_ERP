/**
 * Select — Premium Custom Dropdown Component
 * ------------------------------------------------
 * Reusable dropdown component replacing default HTML <select>.
 * Features:
 *  - Custom trigger with glass blur, soft shadow, & rotating Chevron icon
 *  - React Portal rendering directly to document.body (never clipped by modals/overflow)
 *  - Synchronous positioning on click (no top-left animation glitch)
 *  - Dynamic content height calculation (opens right next to trigger)
 *  - Live search filtering when options > 8 (or via searchable prop)
 *  - Selected option checkmark & blue gradient/solid highlight
 *  - Keyboard navigation (Arrow keys, Enter, Escape)
 *  - Custom scrollbar styling
 */

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

const Select = ({
  options = [],
  value = "",
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search options...",
  label,
  required = false,
  disabled = false,
  error,
  className,
  containerClassName,
  searchable, // boolean; if omitted, defaults to true when options.length > 8
  clearable = false,
  emptyText = "No results found",
  loading = false,
  id: externalId,
  valueKey = "value",
  labelKey = "label",
  size = "md", // 'sm' (40px), 'md' (48px), 'lg' (52px)
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

  // Normalize options array to standard { value, label, badge } objects
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

  // Derived: is searchable
  const isSearchable =
    searchable !== undefined ? searchable : normalizedOptions.length > 8;

  // Derived: selected option
  const selectedOption = useMemo(
    () =>
      normalizedOptions.find(
        (o) => String(o.value) === String(value)
      ) || null,
    [normalizedOptions, value]
  );

  // Derived: filtered options based on query
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return normalizedOptions;
    const q = query.toLowerCase();
    return normalizedOptions.filter((o) =>
      o.label.toLowerCase().includes(q)
    );
  }, [normalizedOptions, query]);

  // Calculate precise viewport position for Portal popup
  const updatePopoverPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const itemCount = filteredOptions.length || 1;
    const dropdownHeight = Math.min(
      260,
      (isSearchable ? 45 : 0) + itemCount * 44 + 14
    );
    const dropdownWidth = rect.width;

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

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        !e.target.closest(".select-portal-popover")
      ) {
        setOpen(false);
        setQuery("");
        setFocusedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Focus search when popup opens
  useEffect(() => {
    if (open && isSearchable) {
      setTimeout(() => searchRef.current?.focus(), 60);
    }
    if (!open) {
      setQuery("");
      setFocusedIndex(-1);
    }
  }, [open, isSearchable]);

  // Auto-scroll focused item into view
  useEffect(() => {
    if (focusedIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[focusedIndex];
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [focusedIndex]);

  const handleSelect = useCallback(
    (opt) => {
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
    sm: "h-10 text-xs px-3 rounded-xl",
    md: "h-12 text-sm px-3.5 rounded-2xl",
    lg: "h-13 text-base px-4 rounded-2xl",
  };

  return (
    <div
      ref={containerRef}
      className={cn("w-full space-y-1.5 relative", containerClassName)}
    >
      {/* Label */}
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={toggleOpen}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "w-full flex items-center justify-between gap-2 text-sm font-bold transition-all duration-200 outline-none select-none text-left cursor-pointer",
          "bg-white border border-gray-300 shadow-xs hover:border-indigo-400 hover:shadow-sm",
          open
            ? "border-indigo-600 bg-white ring-4 ring-indigo-500/10 shadow-md"
            : "",
          disabled &&
            "opacity-50 cursor-not-allowed bg-gray-100 border-gray-200 hover:border-gray-200",
          error && !open && "border-rose-400 focus:ring-rose-500/10",
          sizeClasses[size] || sizeClasses.md,
          className
        )}
      >
        <span
          className={cn(
            "truncate",
            selectedOption ? "text-gray-900 font-bold" : "text-gray-400 font-normal"
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

      {/* Error Message */}
      {error && (
        <p className="text-xs text-rose-500 font-semibold ml-0.5 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
          {error}
        </p>
      )}

      {/* Floating Dropdown Popup via Portal */}
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
            className="select-portal-popover z-[9999] bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Search Box */}
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
                    aria-label="Search options"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-800 placeholder:text-gray-400"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            {/* Options List */}
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
                        "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer transition-all duration-150 h-[42px] sm:h-[46px]",
                        isSelected
                          ? "bg-indigo-600 text-white font-bold shadow-xs"
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

export default Select;
