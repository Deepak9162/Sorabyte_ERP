import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Inbox, RefreshCw } from "lucide-react";
import api from "../services/api";
import { cn } from "../utils/cn";

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Fetch count and notifications
  const fetchNotificationsData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const countRes = await api.get("/notifications/unread-count");
      if (countRes.data.success) {
        setUnreadCount(countRes.data.data.unreadCount);
      }

      const listRes = await api.get("/notifications?limit=5");
      if (listRes.data.success) {
        setNotifications(listRes.data.data.notifications);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificationsData();

    // Set up polling every 30 seconds
    const interval = setInterval(() => {
      fetchNotificationsData(true);
    }, 30000);

    // Event listener for click outside to close dropdown
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleNotificationClick = async (notif) => {
    setIsOpen(false);
    if (!notif.isRead) {
      try {
        await api.put(`/notifications/${notif._id}/read`);
        fetchNotificationsData(true);
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
      }
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put("/notifications/read-all");
      fetchNotificationsData(true);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "text-gray-400 hover:text-indigo-600 relative p-3 hover:bg-gray-50 rounded-2xl transition-all group",
          isOpen && "text-indigo-600 bg-indigo-50/50"
        )}
      >
        <Bell
          size={24}
          className="group-hover:rotate-12 transition-transform"
        />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 min-w-5 h-5 px-1 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-gray-100 rounded-[2rem] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-5 duration-200">
          {/* Header */}
          <div className="px-6 py-5 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {unreadCount} New
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchNotificationsData()}
                disabled={isLoading}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 transition-colors"
                >
                  <CheckCheck size={14} />
                  Mark Read
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 mb-3">
                  <Inbox size={24} />
                </div>
                <h4 className="text-xs font-black text-gray-500">Inbox is empty</h4>
                <p className="text-[10px] text-gray-400 mt-1">You have no notifications yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((notif) => (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className={cn(
                      "px-6 py-4 flex gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors text-left relative",
                      !notif.isRead && "bg-indigo-50/10"
                    )}
                  >
                    {!notif.isRead && (
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className={cn("text-xs text-gray-900", !notif.isRead ? "font-black" : "font-bold")}>
                          {notif.title}
                        </h4>
                        <span className="text-[9px] text-gray-400">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
