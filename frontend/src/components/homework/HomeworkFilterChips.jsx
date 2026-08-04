/**
 * HomeworkFilterChips Component (Mobile-First 2026 SaaS Redesign)
 * -------------------------------------------------------------
 * Responsive filter section featuring:
 *  - Inline rounded Search bar ("Search homework...")
 *  - Filter drawer button trigger (opens mobile bottom sheet)
 *  - Scrollable horizontal quick date chips (Today, Yesterday, Last 7 Days, All, Custom Date)
 *  - Active state: Soft Orange gradient background & white text
 *  - Inactive state: White background, soft border, touch-friendly min targets
 */

import React, { useState } from "react";
import { Search, Calendar as CalendarIcon, Sparkles, FolderOpen, Clock, Filter, X } from "lucide-react";
import DatePicker from "../ui/DatePicker";
import { cn } from "../../utils/cn";

const HomeworkFilterChips = ({
  activeFilter = "today",
  onFilterChange,
  selectedDate = "",
  onDateChange,
  searchQuery = "",
  onSearchChange,
  todayCount = 0,
  onOpenBottomSheetFilter,
  activeFilterCount = 0,
  className,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const chips = [
    {
      id: "today",
      label: "Today",
      icon: <Sparkles className="w-3.5 h-3.5" />,
      badge: todayCount > 0 ? `${todayCount}` : null,
    },
    {
      id: "yesterday",
      label: "Yesterday",
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    {
      id: "last7days",
      label: "Last 7 Days",
      icon: <CalendarIcon className="w-3.5 h-3.5" />,
    },
    {
      id: "all",
      label: "All",
      icon: <FolderOpen className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search Bar & Filter Bottom Sheet Trigger */}
      <div className="flex items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search homework..."
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200/90 rounded-[14px] text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-2xs transition-all h-11"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange?.("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Drawer Trigger Button */}
        {onOpenBottomSheetFilter && (
          <button
            type="button"
            onClick={onOpenBottomSheetFilter}
            className={cn(
              "h-11 px-3.5 rounded-[14px] font-extrabold text-xs flex items-center gap-2 border transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0",
              activeFilterCount > 0
                ? "bg-orange-50 text-orange-600 border-orange-200"
                : "bg-white text-slate-700 border-slate-200 hover:border-orange-300"
            )}
          >
            <Filter className="w-4 h-4 text-orange-500" />
            <span className="hidden sm:inline">Filter</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Scrollable Quick Date Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar no-scrollbar select-none">
        {chips.map((chip) => {
          const isActive = activeFilter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => {
                setShowDatePicker(false);
                onFilterChange?.(chip.id);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-[14px] text-xs font-extrabold whitespace-nowrap transition-all duration-150 cursor-pointer border shrink-0 min-h-[40px] active:scale-95 shadow-2xs",
                isActive
                  ? "bg-orange-600 text-white border-orange-600 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:border-orange-200 hover:bg-orange-50/30"
              )}
            >
              <span className={cn(isActive ? "text-white" : "text-slate-400")}>{chip.icon}</span>
              <span>{chip.label}</span>
              {chip.badge && (
                <span
                  className={cn(
                    "text-[10px] font-black px-1.5 py-0.2 rounded-full ml-0.5",
                    isActive ? "bg-white/25 text-white" : "bg-emerald-100 text-emerald-800"
                  )}
                >
                  {chip.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Custom Date Chip */}
        <button
          type="button"
          onClick={() => setShowDatePicker((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2 rounded-[14px] text-xs font-extrabold whitespace-nowrap transition-all duration-150 cursor-pointer border shrink-0 min-h-[40px] active:scale-95 shadow-2xs",
            activeFilter === "custom" || showDatePicker
              ? "bg-orange-600 text-white border-orange-600 shadow-xs"
              : "bg-white text-slate-700 border-slate-200 hover:border-orange-200 hover:bg-orange-50/30"
          )}
        >
          <CalendarIcon className={cn("w-3.5 h-3.5", activeFilter === "custom" || showDatePicker ? "text-white" : "text-slate-400")} />
          <span>{selectedDate ? selectedDate : "Custom Date"}</span>
        </button>
      </div>

      {/* Expandable DatePicker for Custom Date */}
      {showDatePicker && (
        <div className="p-3 bg-white border border-slate-200 rounded-[18px] shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <DatePicker
                placeholder="Pick homework date"
                value={selectedDate}
                onChange={(val) => {
                  if (val) {
                    onDateChange?.(val);
                    onFilterChange?.("custom");
                    setShowDatePicker(false);
                  }
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                onDateChange?.("");
                onFilterChange?.("today");
                setShowDatePicker(false);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeworkFilterChips;
