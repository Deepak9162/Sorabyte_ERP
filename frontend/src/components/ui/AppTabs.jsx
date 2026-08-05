import React from "react";
import { cn } from "../../utils/cn";

/**
 * AppTabs — Reusable tab bar component with 'underline' and 'pills' variants.
 */
export const AppTabs = ({
  tabs = [], // Array of { id, label, icon: Icon, badge }
  activeTab,
  onChange,
  variant = "pills", // 'pills' | 'underline'
  size = "md",
  className,
}) => {
  return (
    <div
      className={cn(
        "flex items-center gap-1 overflow-x-auto no-scrollbar",
        variant === "pills" && "p-1 bg-gray-100/80 rounded-2xl border border-gray-200/60 inline-flex",
        variant === "underline" && "border-b border-gray-200 w-full",
        className
      )}
    >
      {tabs.map((tab) => {
        const id = tab.id || tab.label;
        const isActive = String(activeTab) === String(id);
        const Icon = tab.icon;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange?.(id)}
            className={cn(
              "inline-flex items-center gap-2 font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap select-none",
              variant === "pills" && [
                "px-3.5 py-2 rounded-xl",
                isActive
                  ? "bg-white text-indigo-900 shadow-2xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50",
              ],
              variant === "underline" && [
                "px-4 py-3 border-b-2 font-extrabold -mb-[1px]",
                isActive
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300",
              ]
            )}
          >
            {Icon && <Icon size={16} className={cn(isActive ? "text-indigo-600" : "text-gray-400")} />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "px-2 py-0.5 text-[10px] font-extrabold rounded-md ml-0.5",
                  isActive ? "bg-indigo-100 text-indigo-800" : "bg-gray-200 text-gray-600"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default AppTabs;
