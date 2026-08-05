import React from "react";
import { Bell, Search, User, LogOut, Settings, HelpCircle, ChevronDown, Building2 } from "lucide-react";
import { cn } from "../../utils/cn";
import AppSearch from "./AppSearch";
import AppAvatar from "./AppAvatar";
import AppDropdown from "./AppDropdown";
import AppSelect from "./AppSelect";
import AppIconButton from "./AppIconButton";

/**
 * AppTopNavbar — Global Header Navigation Bar.
 * Integrates Institute branding, Session selector, Global search, Notifications, Profile dropdown, & Quick action controls.
 */
export const AppTopNavbar = ({
  instituteName = "Little Flower School",
  sessionList = [
    { value: "2025-2026", label: "2025-2026" },
    { value: "2024-2025", label: "2024-2025" },
  ],
  currentSession = "2025-2026",
  onSessionChange,
  user = { name: "Administrator", role: "admin", email: "admin@school.com" },
  notificationsCount = 3,
  onNotificationClick,
  onLogout,
  onSettingsClick,
  className,
}) => {
  const profileMenuItems = [
    { label: user.name || "Profile", icon: User, disabled: true },
    { label: "Settings", icon: Settings, onClick: onSettingsClick },
    { label: "Help & Support", icon: HelpCircle },
    { divider: true },
    { label: "Logout", icon: LogOut, danger: true, onClick: onLogout },
  ];

  return (
    <header
      className={cn(
        "h-16 bg-white/90 backdrop-blur-md border-b border-gray-200/90 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 select-none shadow-2xs",
        className
      )}
    >
      {/* Left: Global Search & Institute Info */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <AppSearch size="sm" placeholder="Global search (Ctrl+K)..." />
      </div>

      {/* Right: Academic Session, Notifications, Profile */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Session Selector */}
        {sessionList.length > 0 && (
          <div className="hidden sm:block w-36">
            <AppSelect
              size="sm"
              options={sessionList}
              value={currentSession}
              onChange={onSessionChange}
              placeholder="Session"
            />
          </div>
        )}

        {/* Notifications */}
        <AppIconButton
          icon={Bell}
          size="sm"
          badge={notificationsCount > 0 ? notificationsCount : undefined}
          onClick={onNotificationClick}
          title="Notifications"
        />

        {/* User Profile Dropdown */}
        <AppDropdown
          trigger={
            <div className="flex items-center gap-2.5 p-1 rounded-2xl hover:bg-gray-100/80 transition-colors cursor-pointer">
              <AppAvatar name={user.name} role={user.role} size="sm" />
              <div className="hidden lg:block text-left text-xs truncate max-w-[120px]">
                <p className="font-extrabold text-gray-900 truncate">{user.name}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase">{user.role}</p>
              </div>
              <ChevronDown size={14} className="text-gray-400 shrink-0" />
            </div>
          }
          items={profileMenuItems}
        />
      </div>
    </header>
  );
};

export default AppTopNavbar;
