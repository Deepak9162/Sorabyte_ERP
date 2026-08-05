import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../utils/cn";

/**
 * AppDropdown — Reusable action dropdown menu attached to any trigger element.
 */
export const AppDropdown = ({
  trigger,
  items = [], // Array of { label, icon: Icon, onClick, danger, disabled, divider }
  align = "right", // 'left' | 'right'
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  const updatePopoverPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const top = rect.bottom + 6;
    let left = rect.left;
    if (align === "right") {
      left = rect.right - 200; // estimated width
    }
    setPopoverPos({ top, left: Math.max(12, left) });
  }, [align]);

  useEffect(() => {
    if (open) {
      updatePopoverPosition();
      const handleOutside = (e) => {
        if (
          triggerRef.current &&
          !triggerRef.current.contains(e.target) &&
          !e.target.closest(".app-dropdown-portal")
        ) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", handleOutside);
      return () => document.removeEventListener("mousedown", handleOutside);
    }
  }, [open, updatePopoverPosition]);

  return (
    <div className="relative inline-block text-left">
      <div
        ref={triggerRef}
        onClick={() => {
          updatePopoverPosition();
          setOpen((prev) => !prev);
        }}
        className="cursor-pointer inline-flex"
      >
        {trigger}
      </div>

      {open &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`,
            }}
            className={cn(
              "app-dropdown-portal z-[9999] min-w-[200px] bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-2xl shadow-xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150",
              className
            )}
          >
            {items.map((item, idx) => {
              if (item.divider) {
                return (
                  <div
                    key={`div-${idx}`}
                    className="my-1 border-t border-gray-100"
                  />
                );
              }

              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!item.disabled) {
                      setOpen(false);
                      item.onClick?.();
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl text-left transition-all cursor-pointer select-none",
                    item.danger
                      ? "text-rose-600 hover:bg-rose-50"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                    item.disabled && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {Icon && <Icon size={16} className="shrink-0" />}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};

export default AppDropdown;
