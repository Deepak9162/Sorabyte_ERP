/**
 * AppCombobox — Reusable ERP Searchable Combobox
 * ------------------------------------------------
 * Drop-in replacement for <select> across the entire ERP.
 *
 * Props:
 *  options       { value, label, badge? }[]  — list of items
 *  value         string                       — currently selected value
 *  onChange      (value: string) => void      — called on selection
 *  placeholder   string                       — trigger button placeholder
 *  searchPlaceholder string                   — search input placeholder
 *  label         string                       — field label (optional)
 *  disabled      boolean
 *  error         string                       — error message (optional)
 *  className     string                       — extra classes on trigger
 *  containerClassName string
 *  searchable    boolean (default true)       — show search box inside dropdown
 *  clearable     boolean (default false)      — show clear button
 *  emptyText     string                       — "No results" message
 *  loading       boolean
 *  id            string
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useId,
} from "react";
import { Check, ChevronDown, Search, X, Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";

const AppCombobox = ({
  options = [],
  value = "",
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  label,
  disabled = false,
  error,
  className,
  containerClassName,
  searchable = true,
  clearable = false,
  emptyText = "No results found",
  loading = false,
  id: externalId,
}) => {
  const internalId = useId();
  const id = externalId || internalId;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);
  const containerRef = useRef(null);

  // Derived: selected option
  const selectedOption = useMemo(
    () => options.find((o) => String(o.value) === String(value)) || null,
    [options, value]
  );

  // Derived: filtered list
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
        setFocusedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Focus search on open
  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 60);
    }
    if (!open) {
      setQuery("");
      setFocusedIndex(-1);
    }
  }, [open, searchable]);

  // Scroll focused item into view
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
      setOpen(true);
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

  return (
    <div
      ref={containerRef}
      className={cn("w-full space-y-1.5 relative", containerClassName)}
    >
      {/* Label */}
      {label && (
        <label
          htmlFor={id}
          className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-widest ml-0.5"
        >
          {label}
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
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-[12px] text-[13px] font-medium transition-all duration-200 outline-none select-none text-left",
          "bg-zinc-50 border",
          open
            ? "border-orange-400 bg-white ring-2 ring-orange-50 shadow-sm"
            : "border-zinc-200 hover:border-zinc-300 hover:bg-white",
          disabled && "opacity-50 cursor-not-allowed bg-zinc-100",
          error && !open && "border-red-400",
          className
        )}
      >
        <span
          className={cn(
            "truncate",
            selectedOption ? "text-zinc-800" : "text-zinc-400"
          )}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <span className="flex items-center gap-1 shrink-0">
          {clearable && selectedOption && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              aria-label="Clear selection"
              className="p-0.5 rounded-md hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X size={12} />
            </span>
          )}
          {loading ? (
            <Loader2 size={13} className="text-zinc-400 animate-spin" />
          ) : (
            <ChevronDown
              size={13}
              className={cn(
                "text-zinc-400 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          )}
        </span>
      </button>

      {error && (
        <p className="text-[10px] text-red-500 font-semibold ml-0.5 flex items-center gap-1">
          <span className="w-1 h-1 bg-red-500 rounded-full" />
          {error}
        </p>
      )}

      {/* Dropdown Panel */}
      {open && (
        <div
          role="dialog"
          onKeyDown={handleListKeyDown}
          className="absolute z-[200] w-full mt-1.5 bg-white border border-zinc-200 rounded-[14px] shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {searchable && (
            <div className="p-2 border-b border-zinc-100">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setFocusedIndex(0); }}
                  placeholder={searchPlaceholder}
                  aria-label="Search options"
                  className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-[10px] text-[12px] font-medium outline-none focus:bg-white focus:ring-2 focus:ring-orange-100 focus:border-orange-300 transition-all text-zinc-700 placeholder:text-zinc-400"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          <div
            ref={listRef}
            id={`${id}-listbox`}
            role="listbox"
            className="max-h-52 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar"
          >
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">{emptyText}</p>
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                const isFocused = focusedIndex === idx;
                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-[10px] text-[12px] cursor-pointer transition-colors duration-100",
                      isSelected
                        ? "bg-orange-50 text-orange-600 font-semibold"
                        : isFocused
                          ? "bg-zinc-100 text-zinc-900 font-medium"
                          : "text-zinc-600 font-medium hover:bg-zinc-50 hover:text-zinc-900"
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    <span className="flex items-center gap-1.5 shrink-0 ml-2">
                      {opt.badge !== undefined && (
                        <span className={cn(
                          "text-[9px] font-semibold px-1.5 py-0.5 rounded-md",
                          isSelected ? "bg-orange-100 text-orange-500" : "bg-zinc-100 text-zinc-400"
                        )}>
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check size={12} className="text-orange-500 shrink-0" />}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AppCombobox;
