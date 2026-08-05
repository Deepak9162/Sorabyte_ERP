import React from "react";
import { cn } from "../../utils/cn";
import AppSidebar from "./AppSidebar";
import AppTopNavbar from "./AppTopNavbar";

/**
 * AppLayout — Master Enterprise Layout framing Sidebar, Top Navbar, & main Page container.
 */
export const AppLayout = ({
  children,
  sidebar,
  topbar,
  className,
}) => {
  return (
    <div className={cn("min-h-screen flex bg-gray-50/50 font-sans text-gray-900", className)}>
      {/* Sidebar Slot */}
      {sidebar}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar Slot */}
        {topbar}

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
