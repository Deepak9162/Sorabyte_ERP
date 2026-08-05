import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * AppCalendar — Full month inline matrix calendar view.
 */
export const AppCalendar = ({ selectedDate, onSelectDate, className }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className={cn("w-full bg-white border border-gray-200/90 rounded-2xl p-4 shadow-sm space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900">
          {monthNames[month]} {year}
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-bold text-gray-400 uppercase">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const isSelected = selectedDate === dateStr;

          return (
            <button
              key={dayNum}
              type="button"
              onClick={() => onSelectDate?.(dateStr)}
              className={cn(
                "h-9 w-9 mx-auto flex items-center justify-center rounded-xl text-xs font-semibold transition-all cursor-pointer",
                isSelected
                  ? "bg-indigo-600 text-white font-bold shadow-2xs"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              {dayNum}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AppCalendar;
