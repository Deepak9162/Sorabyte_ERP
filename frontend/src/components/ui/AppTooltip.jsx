import React, { useState } from "react";
import { cn } from "../../utils/cn";

/**
 * AppTooltip — Clean CSS hover tooltip wrapper.
 */
export const AppTooltip = ({ children, content, position = "top", className }) => {
  const [visible, setVisible] = useState(false);

  if (!content) return <>{children}</>;

  const positions = {
    top: "-top-9 left-1/2 -translate-x-1/2",
    bottom: "-bottom-9 left-1/2 -translate-x-1/2",
    left: "top-1/2 -left-2 -translate-x-full -translate-y-1/2",
    right: "top-1/2 -right-2 translate-x-full -translate-y-1/2",
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}

      {visible && (
        <div
          className={cn(
            "absolute z-[9999] px-2.5 py-1 bg-gray-900 text-white text-xs font-semibold rounded-lg shadow-lg whitespace-nowrap pointer-events-none animate-in fade-in duration-150",
            positions[position] || positions.top,
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};

/**
 * AppPopover — Click container popover.
 */
export const AppPopover = ({ trigger, children, className }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <div onClick={() => setOpen((prev) => !prev)} className="cursor-pointer">
        {trigger}
      </div>

      {open && (
        <div
          className={cn(
            "absolute right-0 mt-2 z-50 min-w-[240px] bg-white border border-gray-200/90 rounded-2xl shadow-xl p-3 animate-in fade-in zoom-in-95 duration-150",
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default AppTooltip;
