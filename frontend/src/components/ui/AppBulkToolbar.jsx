import React from "react";
import { Trash2, Send, Download, Printer, X, CheckSquare } from "lucide-react";
import { cn } from "../../utils/cn";
import AppButton from "./AppButton";

/**
 * AppBulkToolbar — Global Bulk Action Toolbar for selected rows (Students, Homework, Fees, Attendance, Staff).
 */
export const AppBulkToolbar = ({
  selectedCount = 0,
  onClearSelection,
  onDelete,
  onExport,
  onPrint,
  onTransfer,
  customActions,
  className,
}) => {
  if (selectedCount <= 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 p-3 bg-indigo-900 text-white rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 z-30 select-none",
        className
      )}
    >
      <div className="flex items-center gap-2 px-1">
        <CheckSquare size={18} className="text-indigo-300" />
        <span className="text-sm font-extrabold">
          {selectedCount} item{selectedCount > 1 ? "s" : ""} selected
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onTransfer && (
          <AppButton size="sm" variant="secondary" icon={Send} onClick={onTransfer}>
            Transfer / Promote
          </AppButton>
        )}

        {onExport && (
          <AppButton size="sm" variant="secondary" icon={Download} onClick={onExport}>
            Export Selected
          </AppButton>
        )}

        {onPrint && (
          <AppButton size="sm" variant="secondary" icon={Printer} onClick={onPrint}>
            Print Selected
          </AppButton>
        )}

        {onDelete && (
          <AppButton size="sm" variant="danger" icon={Trash2} onClick={onDelete}>
            Delete
          </AppButton>
        )}

        {customActions}

        <button
          type="button"
          onClick={onClearSelection}
          className="p-1.5 hover:bg-white/10 rounded-xl text-indigo-200 hover:text-white transition-colors cursor-pointer ml-1"
          title="Clear selection"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default AppBulkToolbar;
