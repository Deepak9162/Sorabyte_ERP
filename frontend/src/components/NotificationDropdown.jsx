import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Inbox, RefreshCw, Trash2 } from "lucide-react";
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

      const listRes = await api.get("/notifications?limit=10");
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

    // Set up polling every 15 seconds
    const interval = setInterval(() => {
      fetchNotificationsData(true);
    }, 15000);

    const handleFocusOrVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchNotificationsData(true);
      }
    };

    const handleCustomNotificationUpdate = () => {
      fetchNotificationsData(true);
    };

    window.addEventListener("focus", handleFocusOrVisibility);
    document.addEventListener("visibilitychange", handleFocusOrVisibility);
    window.addEventListener("notification-updated", handleCustomNotificationUpdate);

    // Event listener for click outside to close dropdown
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocusOrVisibility);
      document.removeEventListener("visibilitychange", handleFocusOrVisibility);
      window.removeEventListener("notification-updated", handleCustomNotificationUpdate);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleNotificationClick = async (notif) => {
    setIsOpen(false);
    // Optimistically remove from list immediately upon reading
    setNotifications(prev => prev.filter(n => n._id !== notif._id));
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await api.put(`/notifications/${notif._id}/read`);
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }

    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleDeleteSingle = async (e, notifId) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n._id !== notifId));
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await api.delete(`/notifications/${notifId}`);
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications([]);
    setUnreadCount(0);
    try {
      await api.put("/notifications/read-all");
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-10 h-10 sm:w-11 sm:h-11 rounded-full sm:rounded-[14px] bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-orange-600 hover:scale-105 active:scale-95 transition-all shadow-2xs relative group cursor-pointer",
          isOpen && "text-orange-600 bg-orange-50/70 border-orange-200"
        )}
        title="Notifications"
      >
        <Bell
          size={20}
          className="group-hover:rotate-12 transition-transform duration-200"
        />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black text-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full -right-16 sm:right-0 mt-3 w-[calc(100vw-2rem)] max-w-xs sm:max-w-none sm:w-96 bg-white border border-gray-100 rounded-[2rem] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-5 duration-200">
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
              {notifications.length > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={13} />
                  Clear All
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
                <p className="text-[10px] text-gray-400 mt-1">You have no notifications right now.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((notif) => (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className="px-5 py-3.5 flex items-start gap-3 cursor-pointer hover:bg-gray-50/80 transition-colors text-left relative group"
                  >
                    <span className="w-2 h-2 mt-1.5 bg-indigo-600 rounded-full shrink-0" />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs text-gray-900 font-black truncate">
                          {notif.title}
                        </h4>
                        <span className="text-[9px] text-gray-400 shrink-0">
                          {(() => {
                            if (!notif.createdAt) return "";
                            const d = new Date(notif.createdAt);
                            return isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          })()}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed font-medium line-clamp-2">
                        {notif.message}
                      </p>
                    </div>

                    {/* Single Delete Action Button */}
                    <button
                      onClick={(e) => handleDeleteSingle(e, notif._id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-all shrink-0 self-center"
                      title="Delete Notification"
                    >
                      <Trash2 size={13} />
                    </button>
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
