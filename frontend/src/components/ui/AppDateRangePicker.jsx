import React from "react";
import AppDatePicker from "./AppDatePicker";
import { ArrowRight } from "lucide-react";

/**
 * AppDateRangePicker — Dual start/end date picker component.
 */
export const AppDateRangePicker = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  label,
  className,
}) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider ml-0.5">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <AppDatePicker
          value={startDate}
          onChange={onStartDateChange}
          placeholder="Start date"
        />
        <ArrowRight size={16} className="text-gray-400 shrink-0" />
        <AppDatePicker
          value={endDate}
          onChange={onEndDateChange}
          placeholder="End date"
        />
      </div>
    </div>
  );
};

export default AppDateRangePicker;
