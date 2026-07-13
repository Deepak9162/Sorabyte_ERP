import React, { useState } from "react";
import {
  LayoutDashboard,
  Users,
  UserSquare2,
  CalendarCheck,
  CreditCard,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Bell,
  User as UserIcon,
  BarChart3,
  BookOpen,
  Network,
  Calendar,
  KeyRound,
  UserPlus,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { cn } from "../utils/cn";
import SchoolLogo from "../components/ui/SchoolLogo";
import NotificationDropdown from "../components/NotificationDropdown";

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    {
      id: "dashboard",
      path: "/dashboard",
      label: user.role === "admin" ? "Admin Dashboard" : "Teacher Dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "teacher"],
    },
    {
      id: "students",
      path: "/students",
      label: "Students",
      icon: Users,
      roles: ["admin"],
    },
    {
      id: "admissions",
      path: "/admissions/requests",
      label: "Admission Requests",
      icon: UserPlus,
      roles: ["admin", "teacher"],
    },
    {
      id: "attendance",
      path: "/attendance",
      label: "Mark Attendance",
      icon: CalendarCheck,
      roles: ["admin", "teacher"],
    },
    {
      id: "teacher-timetable",
      path: "/teacher/timetable",
      label: "My Schedule",
      icon: Calendar,
      roles: ["teacher"],
    },
    {
      id: "my-attendance",
      path: "/teacher/my-attendance",
      label: "My Attendance",
      icon: CalendarCheck,
      roles: ["teacher"],
    },
    {
      id: "teachers",

      path: "/teachers",
      label: "Staff List",
      icon: UserSquare2,
      roles: ["admin"],
    },
    {
      id: "staff-attendance-history",
      path: "/admin/staff/attendance-history",
      label: "Staff Attendance History",
      icon: CalendarCheck,
      roles: ["admin"],
    },
    {
      id: "classes",
      path: "/classes",
      label: "Class Groups",
      icon: CalendarCheck,
      roles: ["admin"],
    },
    {
      id: "timetable",
      path: "/academic/timetable",
      label: "Timetable Management",
      icon: Calendar,
      roles: ["admin"],
    },

    {
      id: "subjects",
      path: "/academic/subjects",
      label: "Subject Master",
      icon: BookOpen,
      roles: ["admin"],
    },
    {
      id: "mappings",
      path: "/academic/mappings",
      label: "Class Mappings",
      icon: Network,
      roles: ["admin"],
    },
    {
      id: "fees",
      path: "/fees",
      label: "Finances",
      icon: CreditCard,
      roles: ["admin"],
    },
    {
      id: "analytics",
      path: "/reports/attendance",
      label: "Attendance Analytics",
      icon: BarChart3,
      roles: ["admin"],
    },
    {
      id: "credentials",
      path: "/admin/credentials",
      label: "Credentials Manager",
      icon: KeyRound,
      roles: ["admin"],
    },
  ];

  const filteredMenu = menuItems.filter((item) =>
    item.roles.includes(user.role),
  );

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const activeItem = filteredMenu.find((item) =>
    location.pathname.startsWith(item.path),
  );
  const activeTabLabel = activeItem ? activeItem.label : "Dashboard";

  const getPageTitle = () => {
    const path = location.pathname;
    
    // Specific custom titles
    if (path.startsWith("/students/edit/")) return "Edit Student Profile";
    if (path.includes("/idcard")) return "ID Card Console";
    if (path === "/students/new") return "Enroll Student";
    if (path === "/students/bulk-idcards") return "Bulk ID Cards";
    if (path === "/reports/attendance") return "Attendance Analytics";
    if (path === "/admin/credentials") return "Credentials Manager";
    if (path === "/academic/timetable") return "Timetable Management";
    if (path === "/academic/subjects") return "Subject Master";
    if (path === "/academic/mappings") return "Class Mappings";
    
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) return "Dashboard";
    
    const lastSegment = segments[segments.length - 1];
    
    // Check if the last segment is a 24-character MongoDB ObjectId
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(lastSegment);
    if (isMongoId) {
      if (segments.length > 1) {
        const prevSegment = segments[segments.length - 2];
        if (prevSegment === "edit") return "Edit Student Profile";
        if (prevSegment === "students") return "Student Profile";
        return prevSegment.replace("-", " ");
      }
      return "Detail View";
    }
    
    // Check if the last segment is a formatted Student ID (STU-XXXX-XXXX)
    if (lastSegment.startsWith("STU-")) {
      return "Student Profile";
    }
    
    return lastSegment.replace("-", " ");
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px] z-[60] md:hidden transition-opacity"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={cn(
          "fixed md:relative inset-y-0 left-0 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col z-[70] md:translate-x-0 shadow-2xl md:shadow-none",
          isSidebarOpen ? "w-64" : "w-20",
          isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full",
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
          <div
            className={cn(
              "flex items-center gap-3 overflow-hidden",
              !isSidebarOpen && "md:justify-center w-full",
            )}
          >
            <SchoolLogo className="w-8 h-8 flex-shrink-0" showText={isSidebarOpen || isMobileMenuOpen} />
          </div>
          {isMobileMenuOpen && (
            <button
              onClick={toggleMobileMenu}
              className="md:hidden text-gray-400 hover:text-gray-900"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
          {filteredMenu.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative",
                location.pathname === item.path
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <item.icon
                size={22}
                className={cn(
                  "flex-shrink-0 transition-colors",
                  location.pathname === item.path
                    ? "text-indigo-600 font-black"
                    : "text-gray-400 group-hover:text-gray-600",
                )}
              />
              {(isSidebarOpen || isMobileMenuOpen) && (
                <span className="text-sm font-semibold">{item.label}</span>
              )}
              {!isSidebarOpen && !isMobileMenuOpen && (
                <div className="absolute left-16 bg-gray-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl">
                  {item.label}
                </div>
              )}
            </Link>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-100 hidden md:block">
          <button
            onClick={toggleSidebar}
            className="w-full h-10 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
          >
            {isSidebarOpen ? (
              <ChevronLeft size={20} />
            ) : (
              <ChevronRight size={20} />
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Navbar */}
        <header className="h-20 sm:h-24 bg-white/90 border-b border-gray-200 flex items-center justify-between px-4 sm:px-10 z-20 sticky top-0 backdrop-blur-xl">
          <div className="flex items-center gap-2 sm:gap-6">
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-3 text-gray-500 hover:bg-gray-50 rounded-2xl transition-all active:scale-90"
            >
              <Menu size={28} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-lg sm:text-2xl font-black text-gray-900 capitalize tracking-tight flex items-center gap-2">
                <span className="hidden lg:inline text-gray-300">/</span>
                {getPageTitle()}
              </h1>
              <p className="hidden sm:block text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none mt-1">
                Little Flower Educational Enterprise
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-8">
            <NotificationDropdown />

            <div className="h-10 w-px bg-gray-100 hidden lg:block"></div>

            <div className="flex items-center gap-2 sm:gap-4 group cursor-pointer bg-gray-50/50 p-1.5 pr-4 rounded-[1.5rem] border border-transparent hover:border-indigo-100 hover:bg-white transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black border-2 border-indigo-50 shadow-xl shadow-indigo-100 group-hover:scale-105 transition-transform text-lg uppercase">
                {user.name.charAt(0)}
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-gray-900 leading-none mb-1 group-hover:text-indigo-600 transition-colors">
                  {user.name}
                </p>
                <div className="flex items-center justify-end gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest whitespace-nowrap">
                    {user.role} Secured
                  </p>
                </div>
              </div>
              <button
                onClick={logout}
                className="ml-2 p-2.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-90"
                title="Secure Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-10 scroll-smooth custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-10 pb-32">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
