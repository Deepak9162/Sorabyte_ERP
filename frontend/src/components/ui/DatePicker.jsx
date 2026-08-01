/**
 * DatePicker — Premium Custom Calendar Component
 * ------------------------------------------------
 * Reusable date picker component replacing default HTML <input type="date">.
 * Features:
 *  - Custom trigger button with glass blur, soft shadow, & Calendar icon
 *  - React Portal rendering directly to document.body (never clipped by modals/overflow)
 *  - Synchronous positioning on click (no top-left animation glitch)
 *  - Auto viewport boundary & flip detection
 *  - Month & Year navigation (prev/next controls, month/year selector)
 *  - High-contrast day grid with Today highlight & selected active state
 *  - "Today" and "Clear" quick action buttons
 *  - Fully compatible with YYYY-MM-DD string values
 */

import React, { useState, useRef, useEffect, useCallback, useMemo, useId } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";
import { cn } from "../../utils/cn";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const DatePicker = ({
  value = "",
  onChange,
  label,
  placeholder = "Select Date",
  required = false,
  disabled = false,
  error,
  className,
  containerClassName,
  minDate,
  maxDate,
  id: externalId,
  size = "md", // 'sm' (40px), 'md' (48px), 'lg' (52px)
}) => {
  const internalId = useId();
  const id = externalId || internalId;

  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, width: 320 });

  // Parse initial selected date or default to current date
  const parsedValueDate = useMemo(() => {
    if (!value) return null;
    const parts = value.split("-");
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : { year, month, day, dateObj: d };
  }, [value]);

  // View state for calendar (current displayed year & month)
  const [viewYear, setViewYear] = useState(() => {
    return parsedValueDate ? parsedValueDate.year : new Date().getFullYear();
  });

  const [viewMonth, setViewMonth] = useState(() => {
    return parsedValueDate ? parsedValueDate.month : new Date().getMonth();
  });

  const triggerRef = useRef(null);
  const containerRef = useRef(null);

  // Sync view state if value changes externally
  useEffect(() => {
    if (parsedValueDate) {
      setViewYear(parsedValueDate.year);
      setViewMonth(parsedValueDate.month);
    }
  }, [parsedValueDate]);

  // Calculate precise viewport position for Portal popup
  const updatePopoverPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const calendarHeight = 330;
    const calendarWidth = Math.min(320, window.innerWidth - 32);

    const spaceBelow = window.innerHeight - rect.bottom;
    let top = rect.bottom + 6;

    if (spaceBelow < calendarHeight && rect.top > calendarHeight) {
      top = rect.top - calendarHeight - 6;
    } else if (spaceBelow < calendarHeight) {
      top = Math.max(10, window.innerHeight - calendarHeight - 10);
    }

    let left = rect.left;
    if (left + calendarWidth > window.innerWidth - 16) {
      left = window.innerWidth - calendarWidth - 16;
    }
    if (left < 16) {
      left = 16;
    }

    setPopoverPos({ top, left, width: calendarWidth });
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
        !e.target.closest(".datepicker-portal-popover")
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Format date for display in input (e.g., "01 Aug 2026")
  const formattedDisplayValue = useMemo(() => {
    if (!parsedValueDate) return "";
    const { year, month, day } = parsedValueDate;
    const dayStr = String(day).padStart(2, "0");
    const monthStr = SHORT_MONTH_NAMES[month];
    return `${dayStr} ${monthStr} ${year}`;
  }, [parsedValueDate]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Date selection handler
  const handleSelectDate = (year, month, day) => {
    const yStr = String(year);
    const mStr = String(month + 1).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    const dateStr = `${yStr}-${mStr}-${dStr}`;
    onChange?.(dateStr);
    setOpen(false);
  };

  // Quick Action: Today
  const handleSelectToday = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    setViewYear(y);
    setViewMonth(m);
    handleSelectDate(y, m, d);
  };

  // Quick Action: Clear
  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.("");
  };

  // Generate 42-day calendar grid matrix for viewMonth & viewYear
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const startDayOfWeek = firstDayOfMonth.getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const grid = [];

    // 1. Previous Month Overflow Days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pDay = daysInPrevMonth - i;
      const pMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const pYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      grid.push({ day: pDay, month: pMonth, year: pYear, isCurrentMonth: false });
    }

    // 2. Current Month Days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      grid.push({ day: d, month: viewMonth, year: viewYear, isCurrentMonth: true });
    }

    // 3. Next Month Overflow Days (up to 42 total cells)
    const remainingCells = 42 - grid.length;
    for (let n = 1; n <= remainingCells; n++) {
      const nMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      grid.push({ day: n, month: nMonth, year: nYear, isCurrentMonth: false });
    }

    return grid;
  }, [viewYear, viewMonth]);

  // Today indicator check
  const todayObj = useMemo(() => {
    const t = new Date();
    return { year: t.getFullYear(), month: t.getMonth(), day: t.getDate() };
  }, []);

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
        disabled={disabled}
        onClick={toggleOpen}
        className={cn(
          "w-full flex items-center justify-between gap-2 font-bold transition-all duration-200 outline-none select-none text-left cursor-pointer",
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
            formattedDisplayValue ? "text-gray-900 font-bold" : "text-gray-400 font-normal"
          )}
        >
          {formattedDisplayValue || placeholder}
        </span>

        <span className="flex items-center gap-1.5 shrink-0">
          {!required && formattedDisplayValue && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              aria-label="Clear date"
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={14} />
            </span>
          )}
          <Calendar
            size={18}
            className={cn(
              "text-gray-400 transition-colors duration-200",
              open && "text-indigo-600"
            )}
          />
        </span>
      </button>

      {/* Error Message */}
      {error && (
        <p className="text-xs text-rose-500 font-semibold ml-0.5 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
          {error}
        </p>
      )}

      {/* Floating Calendar Popover via Portal */}
      {open &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`,
              width: `${popoverPos.width}px`,
            }}
            className="datepicker-portal-popover z-[9999] p-4 bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 select-none"
          >
            {/* Header Controls: Month & Year + Prev/Next */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100">
              <div className="flex items-center gap-1">
                <span className="text-sm font-black text-gray-900">
                  {MONTH_NAMES[viewMonth]}
                </span>
                <span className="text-sm font-bold text-indigo-600">
                  {viewYear}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {WEEKDAYS.map((wd) => (
                <span
                  key={wd}
                  className="text-[11px] font-extrabold text-gray-400 uppercase py-1"
                >
                  {wd}
                </span>
              ))}
            </div>

            {/* 42-Cell Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarGrid.map((cell, idx) => {
                const isSelected =
                  parsedValueDate &&
                  parsedValueDate.year === cell.year &&
                  parsedValueDate.month === cell.month &&
                  parsedValueDate.day === cell.day;

                const isToday =
                  todayObj.year === cell.year &&
                  todayObj.month === cell.month &&
                  todayObj.day === cell.day;

                return (
                  <button
                    key={`${cell.year}-${cell.month}-${cell.day}-${idx}`}
                    type="button"
                    onClick={() =>
                      handleSelectDate(cell.year, cell.month, cell.day)
                    }
                    className={cn(
                      "h-9 w-9 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer mx-auto",
                      !cell.isCurrentMonth && "text-gray-300 hover:text-gray-500",
                      cell.isCurrentMonth &&
                        !isSelected &&
                        "text-gray-800 hover:bg-indigo-50 hover:text-indigo-600 hover:scale-105 active:scale-95",
                      isToday &&
                        !isSelected &&
                        "border border-indigo-400 text-indigo-700 font-black",
                      isSelected &&
                        "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200 scale-105"
                    )}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {/* Footer Quick Actions */}
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-100 text-xs">
              <button
                type="button"
                onClick={handleSelectToday}
                className="font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <Sparkles size={13} />
                Today
              </button>

              {!required && value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="font-semibold text-gray-400 hover:text-rose-600 px-2 py-1 transition-colors cursor-pointer"
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

export default DatePicker;
