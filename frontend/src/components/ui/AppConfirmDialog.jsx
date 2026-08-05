import React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Trash2, ArrowRightLeft, LogOut, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "../../utils/cn";
import AppButton from "./AppButton";

/**
 * AppConfirmDialog — Enterprise confirmation dialog for Delete, Transfer, Promote, Reset, Logout actions.
 */
export const AppConfirmDialog = ({
  isOpen = false,
  onClose,
  onConfirm,
  title = "Confirm Action",
  description = "Are you sure you want to proceed? This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger", // 'danger' | 'warning' | 'transfer' | 'logout' | 'reset'
  loading = false,
}) => {
  if (!isOpen) return null;

  const configs = {
    danger: {
      icon: <Trash2 size={24} className="text-rose-600" />,
      bg: "bg-rose-50 border-rose-100",
      btnVariant: "danger",
    },
    warning: {
      icon: <AlertTriangle size={24} className="text-amber-600" />,
      bg: "bg-amber-50 border-amber-100",
      btnVariant: "warning",
    },
    transfer: {
      icon: <ArrowRightLeft size={24} className="text-indigo-600" />,
      bg: "bg-indigo-50 border-indigo-100",
      btnVariant: "primary",
    },
    logout: {
      icon: <LogOut size={24} className="text-rose-600" />,
      bg: "bg-rose-50 border-rose-100",
      btnVariant: "danger",
    },
    reset: {
      icon: <RefreshCw size={24} className="text-amber-600" />,
      bg: "bg-amber-50 border-amber-100",
      btnVariant: "warning",
    },
  };

  const config = configs[type] || configs.danger;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-3xl shadow-2xl p-6 z-10 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className={cn("w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto shadow-2xs", config.bg)}>
          {config.icon}
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-extrabold text-gray-900">{title}</h3>
          {description && <p className="text-xs text-gray-500 font-medium">{description}</p>}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <AppButton variant="secondary" fullWidth onClick={onClose} disabled={loading}>
            {cancelText}
          </AppButton>
          <AppButton variant={config.btnVariant} fullWidth onClick={onConfirm} loading={loading}>
            {confirmText}
          </AppButton>
        </div>
      </div>
    </div>,
    document.body
  );
};

/**
 * AppSuccessDialog — Celebratory modal for Admission Completed, Fee Paid, Transfer Success, etc.
 */
export const AppSuccessDialog = ({
  isOpen = false,
  onClose,
  title = "Operation Successful",
  description = "The requested task has been completed successfully.",
  actionText = "Continue",
  onAction,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-3xl shadow-2xl p-6 z-10 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 size={32} />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-extrabold text-gray-900">{title}</h3>
          {description && <p className="text-xs text-gray-500 font-medium">{description}</p>}
        </div>

        <div className="pt-2">
          <AppButton variant="success" fullWidth onClick={onAction || onClose}>
            {actionText}
          </AppButton>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AppConfirmDialog;
