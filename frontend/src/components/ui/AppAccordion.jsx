import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * AppAccordion — Reusable collapsible accordion container.
 */
export const AppAccordion = ({
  items = [], // Array of { id, title, subtitle, content, defaultOpen }
  allowMultiple = false,
  className,
}) => {
  const [openIds, setOpenIds] = useState(() => {
    const initial = items.filter((i) => i.defaultOpen).map((i) => i.id || i.title);
    return new Set(initial);
  });

  const toggle = (id) => {
    setOpenIds((prev) => {
      const next = new Set(allowMultiple ? prev : []);
      if (prev.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={cn("space-y-2.5", className)}>
      {items.map((item, idx) => {
        const id = item.id || item.title || idx;
        const isOpen = openIds.has(id);

        return (
          <div
            key={id}
            className="bg-white border border-gray-200/90 rounded-2xl overflow-hidden shadow-2xs transition-all"
          >
            <button
              type="button"
              onClick={() => toggle(id)}
              className="w-full flex items-center justify-between p-4 text-left font-bold text-gray-900 hover:bg-gray-50/60 transition-colors cursor-pointer select-none"
            >
              <div>
                <span className="text-sm sm:text-base font-extrabold">{item.title}</span>
                {item.subtitle && (
                  <p className="text-xs text-gray-500 font-normal mt-0.5">{item.subtitle}</p>
                )}
              </div>

              <ChevronDown
                size={18}
                className={cn(
                  "text-gray-400 transition-transform duration-200 shrink-0 ml-2",
                  isOpen && "rotate-180 text-indigo-600"
                )}
              />
            </button>

            {isOpen && (
              <div className="p-4 pt-0 border-t border-gray-100 text-sm text-gray-700 animate-in fade-in duration-150">
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AppAccordion;
