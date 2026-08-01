/**
 * HomeworkFilterChips Component (Mobile Optimized Edition)
 * ---------------------------------------------------------
 * Filter Chips Bar for Homework Management:
 *  - 📘 Today (Default active view)
 *  - 📅 Yesterday
 *  - 🗓 Last 7 Days
 *  - 📂 All Homework
 *  - 📆 Select Date (Collapsible)
 *  - 🔍 Search Input (Collapsible)
 */

import React, { useState } from "react";
import { Search, Calendar as CalendarIcon, Sparkles, FolderOpen, Clock, X } from "lucide-react";
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
  className,
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const chips = [
    {
      id: "today",
      label: "Today",
      icon: <Sparkles className="w-3.5 h-3.5 text-emerald-500" />,
      badge: todayCount > 0 ? `${todayCount}` : null,
    },
    {
      id: "yesterday",
      label: "Yesterday",
      icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
    },
    {
      id: "last7days",
      label: "Last 7 Days",
      icon: <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />,
    },
    {
      id: "all",
      label: "All",
      icon: <FolderOpen className="w-3.5 h-3.5 text-gray-500" />,
    },
  ];

  return (
    <div className={cn("space-y-2.5", className)}>
      {/* Scrollable Filter Chips Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
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
                "flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer shadow-2xs border shrink-0",
                isActive
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50"
              )}
            >
              <span className={cn(isActive && "text-white")}>{chip.icon}</span>
              <span>{chip.label}</span>
              {chip.badge && (
                <span
                  className={cn(
                    "text-[10px] font-black px-1.5 py-0.2 rounded-full ml-0.5",
                    isActive ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                  )}
                >
                  {chip.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* DatePicker Toggle Chip */}
        <button
          type="button"
          onClick={() => setShowDatePicker((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer shadow-2xs border shrink-0",
            activeFilter === "custom" || showDatePicker
              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
              : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50"
          )}
        >
          <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span>{activeFilter === "custom" && selectedDate ? selectedDate : "Select Date"}</span>
        </button>

        {/* Search Toggle Chip */}
        <button
          type="button"
          onClick={() => setShowSearch((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer shadow-2xs border shrink-0",
            showSearch || searchQuery
              ? "bg-indigo-50 border-indigo-300 text-indigo-700"
              : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50"
          )}
        >
          <Search className="w-3.5 h-3.5 text-indigo-600" />
          <span>Search</span>
          {searchQuery && (
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          )}
        </button>
      </div>

      {/* Expandable Controls: DatePicker & Search */}
      {(showDatePicker || activeFilter === "custom" || showSearch || searchQuery) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 animate-in fade-in duration-150">
          {/* Specific Date Filter */}
          {(showDatePicker || activeFilter === "custom") && (
            <div>
              <DatePicker
                placeholder="📆 Select Date"
                value={activeFilter === "custom" ? selectedDate : ""}
                onChange={(val) => {
                  if (val) {
                    onDateChange?.(val);
                    onFilterChange?.("custom");
                  } else {
                    onFilterChange?.("today");
                  }
                }}
                size="sm"
              />
            </div>
          )}

          {/* Instant Search Bar */}
          {(showSearch || searchQuery) && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search subject, title, class..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full pl-8 pr-8 h-10 rounded-xl border border-indigo-200 text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white shadow-2xs transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange?.("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HomeworkFilterChips;
