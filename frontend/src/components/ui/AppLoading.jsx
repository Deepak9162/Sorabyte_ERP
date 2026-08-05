import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * AppLoading — Spinner, pulse, or full-screen loading container.
 */
export const AppLoading = ({ fullScreen = false, text = "Loading...", className }) => {
  const content = (
    <div className={cn("flex flex-col items-center justify-center p-8 space-y-3 select-none", className)}>
      <Loader2 size={36} className="text-indigo-600 animate-spin" />
      {text && <p className="text-xs font-extrabold uppercase tracking-wider text-gray-500">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-xs flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

export default AppLoading;
