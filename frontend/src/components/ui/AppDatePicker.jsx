import React, { useState, useRef, useEffect, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Clock } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * AppDatePicker — Single global date picker used across the entire ERP.
 */
export const AppDatePicker = ({
  value,
  onChange,
  label,
  placeholder = "Select date...",
  required = false,
  disabled = false,
  error,
  helperText,
  className,
  containerClassName,
  clearable = true,
  minDate,
  maxDate,
  id: externalId,
}) => {
  const internalId = useId();
  const id = externalId || internalId;

  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  const triggerRef = useRef(null);
  const containerRef = useRef(null);

  // Format date to YYYY-MM-DD
  const formatDateString = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const selectedDateStr = value ? formatDateString(value) : "";

  // Synchronize calendar view month with selected date on open
  useEffect(() => {
    if (open && value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) setCurrentMonth(d);
    }
  }, [open, value]);

  const updatePopoverPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom;

    let top = rect.bottom + 6;
    if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
      top = rect.top - dropdownHeight - 6;
    }

    setPopoverPos({
      top,
      left: rect.left,
    });
  }, []);

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
    const handleOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        !e.target.closest(".app-datepicker-portal")
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleOutside);
      window.addEventListener("resize", updatePopoverPosition);
      return () => {
        document.removeEventListener("mousedown", handleOutside);
        window.removeEventListener("resize", updatePopoverPosition);
      };
    }
  }, [open, updatePopoverPosition]);

  const handleDateClick = (dayNum) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateObj = new Date(year, month, dayNum);
    const dateStr = formatDateString(dateObj);

    onChange?.(dateStr);
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.("");
  };

  // Calendar matrix calculations
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div ref={containerRef} className={cn("w-full space-y-1.5 relative", containerClassName)}>
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
        disabled={disabled}
        onClick={toggleOpen}
        className={cn(
          "w-full flex items-center justify-between h-11 px-3.5 bg-white border border-gray-200/90 rounded-xl text-sm font-medium transition-all shadow-2xs cursor-pointer select-none",
          open && "border-indigo-600 ring-4 ring-indigo-500/10 shadow-sm",
          disabled && "opacity-50 cursor-not-allowed bg-gray-100/80 border-gray-200",
          error && "border-rose-400 focus:ring-rose-500/10",
          className
        )}
      >
        <div className="flex items-center gap-2.5 text-gray-800">
          <CalendarIcon size={18} className="text-gray-400 shrink-0" />
          <span className={selectedDateStr ? "font-semibold text-gray-900" : "text-gray-400 font-normal"}>
            {selectedDateStr || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {clearable && selectedDateStr && !disabled && (
            <span
              role="button"
              onClick={handleClear}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={14} />
            </span>
          )}
        </div>
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
            }}
            className="app-datepicker-portal z-[9999] w-72 bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-2xl shadow-xl p-3 space-y-3 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header Navigation */}
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold text-gray-900">
                {monthNames[month]} {year}
              </span>
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 text-center text-[11px] font-bold text-gray-400 uppercase">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateObj = new Date(year, month, dayNum);
                const dateStr = formatDateString(dateObj);
                const isSelected = dateStr === selectedDateStr;
                const isToday = formatDateString(new Date()) === dateStr;

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => handleDateClick(dayNum)}
                    className={cn(
                      "h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-xs font-semibold transition-all cursor-pointer",
                      isSelected
                        ? "bg-indigo-600 text-white font-bold shadow-2xs"
                        : isToday
                        ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-200"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  onChange?.(formatDateString(new Date()));
                  setOpen(false);
                }}
                className="font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                Today
              </button>
              {selectedDateStr && (
                <button
                  type="button"
                  onClick={() => {
                    onChange?.("");
                    setOpen(false);
                  }}
                  className="font-semibold text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default AppDatePicker;
