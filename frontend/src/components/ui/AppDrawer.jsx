import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle, Info, CheckCircle, HelpCircle } from "lucide-react";
import { cn } from "../../utils/cn";
import AppButton from "./AppButton";

/**
 * AppDrawer — Sliding side panel (Left or Right position).
 */
export const AppDrawer = ({
  isOpen = false,
  onClose,
  title,
  subtitle,
  children,
  footer,
  position = "right", // 'left' | 'right'
  className,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const positions = {
    right: "right-0 slide-in-from-right",
    left: "left-0 slide-in-from-left",
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex overflow-hidden">
      <div
        className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div
        className={cn(
          "relative w-full max-w-md bg-white border-l border-gray-200 shadow-2xl flex flex-col z-10 animate-in duration-200 h-full",
          positions[position] || positions.right,
          className
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            {title && <h3 className="text-base font-extrabold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 font-medium mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-200/60 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {children}
        </div>

        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

/**
 * AppDialog — Confirmation / Alert dialog overlay.
 */
export const AppDialog = ({
  isOpen = false,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger", // 'danger' | 'warning' | 'info' | 'success'
  loading = false,
}) => {
  if (!isOpen) return null;

  const icons = {
    danger: <AlertTriangle size={24} className="text-rose-600" />,
    warning: <AlertTriangle size={24} className="text-amber-600" />,
    info: <Info size={24} className="text-sky-600" />,
    success: <CheckCircle size={24} className="text-emerald-600" />,
  };

  const bgIcons = {
    danger: "bg-rose-50 border-rose-100",
    warning: "bg-amber-50 border-amber-100",
    info: "bg-sky-50 border-sky-100",
    success: "bg-emerald-50 border-emerald-100",
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white border border-gray-200/90 rounded-3xl shadow-2xl p-6 z-10 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className={cn("w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto", bgIcons[variant])}>
          {icons[variant]}
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          {description && <p className="text-xs text-gray-500 font-medium">{description}</p>}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <AppButton variant="secondary" fullWidth onClick={onClose} disabled={loading}>
            {cancelText}
          </AppButton>
          <AppButton variant={variant} fullWidth onClick={onConfirm} loading={loading}>
            {confirmText}
          </AppButton>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AppDrawer;
