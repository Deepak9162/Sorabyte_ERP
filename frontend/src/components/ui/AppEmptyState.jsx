import React from "react";
import { FolderOpen, Users, CalendarCheck, BookOpen, Receipt, BarChart3 } from "lucide-react";
import { cn } from "../../utils/cn";
import AppButton from "./AppButton";

/**
 * AppEmptyState — Enterprise zero-state component with icon illustrations, title, description, & action button.
 * Preset Types: 'students', 'attendance', 'homework', 'fees', 'reports', 'general'
 */
export const AppEmptyState = ({
  type = "general",
  icon,
  title,
  description,
  actionText,
  onAction,
  className,
}) => {
  const presets = {
    students: {
      icon: Users,
      title: "No Students Found",
      description: "There are no students enrolled matching the selected criteria.",
    },
    attendance: {
      icon: CalendarCheck,
      title: "No Attendance Records",
      description: "Attendance has not been marked for the selected date or class.",
    },
    homework: {
      icon: BookOpen,
      title: "No Homework Assigned",
      description: "No homework assignments exist for this section.",
    },
    fees: {
      icon: Receipt,
      title: "No Fee Collections",
      description: "No fee receipts or pending dues found for this search.",
    },
    reports: {
      icon: BarChart3,
      title: "No Reports Generated",
      description: "Select filters to generate report analytics.",
    },
    general: {
      icon: FolderOpen,
      title: "No Records Found",
      description: "There are no entries available to display.",
    },
  };

  const preset = presets[type] || presets.general;
  const IconComponent = icon || preset.icon;
  const displayTitle = title || preset.title;
  const displayDescription = description || preset.description;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white/60 border border-dashed border-gray-200 rounded-3xl space-y-4 my-4 select-none",
        className
      )}
    >
      <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-2xs">
        <IconComponent size={32} />
      </div>

      <div className="max-w-xs space-y-1">
        <h4 className="text-base font-extrabold text-gray-900">{displayTitle}</h4>
        {displayDescription && (
          <p className="text-xs text-gray-500 font-medium">{displayDescription}</p>
        )}
      </div>

      {actionText && onAction && (
        <AppButton size="sm" onClick={onAction}>
          {actionText}
        </AppButton>
      )}
    </div>
  );
};

export default AppEmptyState;
