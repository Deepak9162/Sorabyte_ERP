import React from "react";
import { Filter, RefreshCw, Download, Search } from "lucide-react";
import { cn } from "../../utils/cn";
import AppSearch from "./AppSearch";
import AppSelect from "./AppSelect";
import AppDatePicker from "./AppDatePicker";
import AppButton from "./AppButton";

/**
 * AppFilterBar — Universal Enterprise Filter Bar Component.
 * Standardized across Student, Attendance, Finance, Homework, Reports, Staff, Timetable modules.
 */
export const AppFilterBar = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search records...",
  
  // Quick Filter Slots
  classValue,
  onClassChange,
  classList = [],

  sectionValue,
  onSectionChange,
  sectionList = [],

  statusValue,
  onStatusChange,
  statusList = [],

  sessionValue,
  onSessionChange,
  sessionList = [],

  dateValue,
  onDateChange,

  onReset,
  onExport,
  extraFilters,
  className,
}) => {
  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(classValue) ||
    Boolean(sectionValue) ||
    Boolean(statusValue) ||
    Boolean(dateValue);

  return (
    <div
      className={cn(
        "p-3.5 bg-white border border-gray-200/90 rounded-2xl shadow-2xs space-y-3",
        className
      )}
    >
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        {onSearchChange !== undefined && (
          <div className="w-full lg:w-72 shrink-0">
            <AppSearch
              size="sm"
              value={searchQuery}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
            />
          </div>
        )}

        {/* Filter Dropdowns Grid */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto flex-1">
          {onClassChange && (
            <div className="w-36">
              <AppSelect
                size="sm"
                placeholder="All Classes"
                options={classList}
                value={classValue}
                onChange={onClassChange}
                clearable
              />
            </div>
          )}

          {onSectionChange && (
            <div className="w-32">
              <AppSelect
                size="sm"
                placeholder="All Sections"
                options={sectionList}
                value={sectionValue}
                onChange={onSectionChange}
                clearable
              />
            </div>
          )}

          {onStatusChange && (
            <div className="w-32">
              <AppSelect
                size="sm"
                placeholder="All Status"
                options={statusList}
                value={statusValue}
                onChange={onStatusChange}
                clearable
              />
            </div>
          )}

          {onSessionChange && (
            <div className="w-32">
              <AppSelect
                size="sm"
                placeholder="Session"
                options={sessionList}
                value={sessionValue}
                onChange={onSessionChange}
              />
            </div>
          )}

          {onDateChange && (
            <div className="w-36">
              <AppDatePicker
                value={dateValue}
                onChange={onDateChange}
                placeholder="Select date"
              />
            </div>
          )}

          {extraFilters}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          {hasActiveFilters && onReset && (
            <AppButton size="sm" variant="ghost" icon={RefreshCw} onClick={onReset}>
              Reset
            </AppButton>
          )}

          {onExport && (
            <AppButton size="sm" variant="secondary" icon={Download} onClick={onExport}>
              Export
            </AppButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppFilterBar;
