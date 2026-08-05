import React from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";
import { cn } from "../../utils/cn";
import AppButton from "./AppButton";

/**
 * AppErrorState — Full section or inline error fallback with retry trigger.
 */
export const AppErrorState = ({
  title = "Something went wrong",
  message = "Failed to load data. Please check your network connection.",
  onRetry,
  className,
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center p-8 bg-rose-50/50 border border-rose-200/80 rounded-3xl space-y-4 my-4", className)}>
      <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
        <AlertOctagon size={24} />
      </div>

      <div className="max-w-xs space-y-1">
        <h4 className="text-base font-extrabold text-rose-950">{title}</h4>
        <p className="text-xs text-rose-700 font-medium">{message}</p>
      </div>

      {onRetry && (
        <AppButton variant="danger" size="sm" icon={RefreshCw} onClick={onRetry}>
          Try Again
        </AppButton>
      )}
    </div>
  );
};

export default AppErrorState;
