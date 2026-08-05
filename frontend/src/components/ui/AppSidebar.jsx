import React, { useState } from "react";
import { ChevronDown, ChevronRight, LogOut, GraduationCap } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * SidebarItem — Individual navigation item.
 */
export const SidebarItem = ({ icon: Icon, label, href, active = false, badge, onClick }) => {
  return (
    <a
      href={href || "#"}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 select-none cursor-pointer",
        active
          ? "bg-indigo-600 text-white shadow-2xs font-extrabold"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      )}
    >
      <div className="flex items-center gap-3 truncate">
        {Icon && <Icon size={18} className={cn("shrink-0", active ? "text-white" : "text-gray-400")} />}
        <span className="truncate">{label}</span>
      </div>

      {badge !== undefined && (
        <span
          className={cn(
            "px-2 py-0.5 text-[10px] font-extrabold rounded-md shrink-0 ml-2",
            active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
          )}
        >
          {badge}
        </span>
      )}
    </a>
  );
};

/**
 * SidebarCollapse — Collapsible group header with sub-items.
 */
export const SidebarCollapse = ({ icon: Icon, label, children, active = false, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen || active);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 select-none cursor-pointer text-left",
          active ? "text-indigo-600 bg-indigo-50/60 font-extrabold" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        )}
      >
        <div className="flex items-center gap-3 truncate">
          {Icon && <Icon size={18} className={cn("shrink-0", active ? "text-indigo-600" : "text-gray-400")} />}
          <span className="truncate">{label}</span>
        </div>

        <ChevronDown
          size={16}
          className={cn("text-gray-400 transition-transform duration-200 shrink-0", open && "rotate-180 text-indigo-600")}
        />
      </button>

      {open && <div className="pl-6 space-y-1 pt-0.5">{children}</div>}
    </div>
  );
};

/**
 * SidebarGroup — Group container with section title.
 */
export const SidebarGroup = ({ title, children }) => {
  return (
    <div className="space-y-1.5 py-2">
      {title && (
        <h4 className="px-3.5 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
          {title}
        </h4>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
};

/**
 * SidebarFooter — Bottom area footer wrapper.
 */
export const SidebarFooter = ({ children }) => {
  return (
    <div className="pt-3 border-t border-gray-100 space-y-2 shrink-0">
      {children}
    </div>
  );
};

/**
 * AppSidebar — Reusable enterprise navigation sidebar component.
 */
export const AppSidebar = ({
  logo,
  brandTitle = "Little Flower School",
  brandSubtitle = "ERP Management System",
  children,
  footer,
  className,
}) => {
  return (
    <aside
      className={cn(
        "w-64 bg-white border-r border-gray-200/90 h-screen flex flex-col justify-between p-4 sticky top-0 shrink-0 select-none overflow-y-auto custom-scrollbar z-20",
        className
      )}
    >
      <div className="space-y-6">
        {/* Brand Logo Header */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white flex items-center justify-center font-extrabold shadow-sm shrink-0">
            {logo || <GraduationCap size={22} />}
          </div>
          <div className="truncate">
            <h2 className="text-sm font-extrabold text-gray-900 truncate">{brandTitle}</h2>
            <p className="text-[11px] text-gray-400 font-bold truncate">{brandSubtitle}</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">{children}</nav>
      </div>

      {/* Sidebar Footer */}
      {footer && <SidebarFooter>{footer}</SidebarFooter>}
    </aside>
  );
};

export default AppSidebar;
