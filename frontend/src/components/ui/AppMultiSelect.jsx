import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * AppMultiSelect — Multi-selection dropdown component with tag chips and search.
 */
export const AppMultiSelect = ({
  options = [],
  value = [], // Array of values
  onChange,
  placeholder = "Select items...",
  label,
  required = false,
  disabled = false,
  error,
  className,
  valueKey = "value",
  labelKey = "label",
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, width: 280 });

  const triggerRef = useRef(null);
  const containerRef = useRef(null);

  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === "string" || typeof opt === "number") {
        return { value: String(opt), label: String(opt) };
      }
      return {
        ...opt,
        value: String(opt[valueKey] ?? opt.value ?? ""),
        label: String(opt[labelKey] ?? opt.label ?? opt.value ?? ""),
      };
    });
  }, [options, valueKey, labelKey]);

  const selectedOptions = useMemo(() => {
    const set = new Set((value || []).map(String));
    return normalizedOptions.filter((o) => set.has(o.value));
  }, [normalizedOptions, value]);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return normalizedOptions;
    return normalizedOptions.filter((o) =>
      o.label.toLowerCase().includes(query.toLowerCase())
    );
  }, [normalizedOptions, query]);

  const updatePopoverPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPopoverPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 220),
    });
  }, []);

  const toggleOption = (val) => {
    const current = new Set((value || []).map(String));
    if (current.has(val)) {
      current.delete(val);
    } else {
      current.add(val);
    }
    onChange?.(Array.from(current));
  };

  const removeOption = (e, val) => {
    e.stopPropagation();
    toggleOption(val);
  };

  useEffect(() => {
    const handleOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        !e.target.closest(".app-multiselect-portal")
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div ref={containerRef} className="w-full space-y-1.5 relative">
      {label && (
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider ml-0.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div
        ref={triggerRef}
        onClick={() => {
          if (!disabled) {
            updatePopoverPosition();
            setOpen((prev) => !prev);
          }
        }}
        className={cn(
          "w-full min-h-[44px] flex flex-wrap items-center justify-between gap-1.5 p-2 bg-white border border-gray-200/90 rounded-xl cursor-pointer shadow-2xs transition-all",
          open && "border-indigo-600 ring-4 ring-indigo-500/10",
          disabled && "opacity-50 cursor-not-allowed bg-gray-100/80",
          error && "border-rose-400",
          className
        )}
      >
        <div className="flex flex-wrap items-center gap-1 flex-1">
          {selectedOptions.length === 0 ? (
            <span className="text-sm text-gray-400 font-normal px-1">
              {placeholder}
            </span>
          ) : (
            selectedOptions.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 font-medium text-xs rounded-lg border border-indigo-100"
              >
                {opt.label}
                <button
                  type="button"
                  onClick={(e) => removeOption(e, opt.value)}
                  className="hover:text-indigo-900 rounded p-0.5"
                >
                  <X size={12} />
                </button>
              </span>
            ))
          )}
        </div>

        <ChevronDown
          size={16}
          className={cn(
            "text-gray-400 transition-transform duration-200 shrink-0 mr-1",
            open && "rotate-180 text-indigo-600"
          )}
        />
      </div>

      {error && (
        <p className="text-xs text-rose-500 font-semibold ml-0.5">{error}</p>
      )}

      {open &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`,
              width: `${popoverPos.width}px`,
            }}
            className="app-multiselect-portal z-[9999] bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="p-2 border-b border-gray-100 bg-gray-50/60">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter items..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
              {filteredOptions.length === 0 ? (
                <div className="py-4 text-center text-xs text-gray-400 font-semibold">
                  No options found
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isChecked = (value || []).map(String).includes(opt.value);
                  return (
                    <div
                      key={opt.value}
                      onClick={() => toggleOption(opt.value)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm cursor-pointer transition-all",
                        isChecked
                          ? "bg-indigo-50 text-indigo-900 font-bold"
                          : "text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      <span>{opt.label}</span>
                      <div
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                          isChecked
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "border-gray-300"
                        )}
                      >
                        {isChecked && <Check size={12} />}
                      </div>
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

export default AppMultiSelect;
