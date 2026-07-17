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

const routeHeaderConfig = {
  "/dashboard": {
    category: "ERP Admin Hub",
    title: "Admin Dashboard",
    description: "Welcome back! Here's a summary of the school's performance."
  },
  "/": {
    category: "ERP Admin Hub",
    title: "Admin Dashboard",
    description: "Welcome back! Here's a summary of the school's performance."
  },
  "/fees": {
    category: "ERP Finance Hub",
    title: "Finances & Fee Center",
    description: "Monitor class performance, expected collection ratio, and record student receipts."
  },
  "/classes": {
    category: "Academic Setup",
    title: "Class Management",
    description: "Define class groups, sections, and monthly fee structures."
  },
  "/students": {
    category: "Student Directory",
    title: "Student Registry",
    description: "View, search, and manage student enrollments, sections, and records."
  },
  "/students/new": {
    category: "Student Directory",
    title: "Enroll Student",
    description: "Register and admit a new student into the school system."
  },
  "/students/bulk-idcards": {
    category: "Student Directory",
    title: "Bulk ID Cards Console",
    description: "Generate and download student ID cards in bulk."
  },
  "/teachers": {
    category: "Staff Management",
    title: "Teacher Registry",
    description: "Manage school teachers, roles, and profiles."
  },
  "/attendance": {
    category: "Daily Attendance",
    title: "Daily Attendance Tracker",
    description: "Track, mark, and monitor daily student and staff attendance."
  },
  "/reports/attendance": {
    category: "Reports & Analytics",
    title: "Attendance Analytics",
    description: "Monitor attendance metrics, absent summaries, and monthly reports."
  },
  "/academic/subjects": {
    category: "Academic Setup",
    title: "Subject Master",
    description: "Configure subjects, subject codes, and academic curriculum."
  },
  "/academic/mappings": {
    category: "Academic Setup",
    title: "Class Mappings",
    description: "Map subjects to classes and assign class teachers."
  },
  "/academic/timetable": {
    category: "Academic Setup",
    title: "Timetable Management",
    description: "Create, manage, and view class and teacher schedules."
  },
  "/admin/credentials": {
    category: "System Administration",
    title: "Credentials Manager",
    description: "Manage staff accounts, credentials, and access roles."
  },
  "/admissions/requests": {
    category: "Enrollment Center",
    title: "Admission Requests",
    description: "Review and process student admission applications."
  }
};

const getRouteHeader = (path, getPageTitle) => {
  if (path.startsWith("/students/edit/")) {
    return {
      category: "Student Directory",
      title: "Edit Student Profile",
      description: "Modify the profile details of an enrolled student."
    };
  }
  if (path.startsWith("/students/")) {
    if (path.endsWith("/idcard")) {
      return {
        category: "Student Directory",
        title: "ID Card Console",
        description: "Generate and customize a student ID card."
      };
    }
    return {
      category: "Student Directory",
      title: "Student Profile Details",
      description: "View student academic records, ledger, and profile details."
    };
  }
  if (path.startsWith("/admissions/requests/new") || path.startsWith("/admissions/requests/edit/")) {
    return {
      category: "Enrollment Center",
      title: "Admission Form",
      description: "Fill out admission request details."
    };
  }
  if (path.startsWith("/admissions/requests/details/")) {
    return {
      category: "Enrollment Center",
      title: "Admission Request Details",
      description: "Review detailed admission request information."
    };
  }
  if (path.startsWith("/reports/attendance/student/")) {
    return {
      category: "Reports & Analytics",
      title: "Student Attendance Record",
      description: "Detailed daily attendance breakdown for this student."
    };
  }
  if (path.startsWith("/reports/attendance/analysis/student/")) {
    return {
      category: "Reports & Analytics",
      title: "Student Attendance Analysis",
      description: "Long-term attendance stats and analytics for this student."
    };
  }
  if (path.startsWith("/reports/attendance/analysis/staff/")) {
    return {
      category: "Reports & Analytics",
      title: "Staff Attendance Analysis",
      description: "Long-term attendance stats and analytics for this staff member."
    };
  }
  
  return routeHeaderConfig[path] || {
    category: "Little Flower Educational Enterprise",
    title: getPageTitle(),
    description: "School ERP Management Hub"
  };
};

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

  const headerInfo = getRouteHeader(location.pathname, getPageTitle);

  return (
    <div className="flex h-screen bg-[#FAFAFA] overflow-hidden font-sans scroll-smooth">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-zinc-900/30 backdrop-blur-[1.5px] z-[60] md:hidden transition-opacity duration-300"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={cn(
          "fixed md:sticky top-0 h-screen bg-white border-r border-zinc-200/80 transition-all duration-300 ease-in-out flex flex-col z-[70] md:translate-x-0 shadow-xl md:shadow-none",
          isSidebarOpen ? "w-[245px]" : "w-[68px]",
          isMobileMenuOpen ? "translate-x-0 w-[240px]" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Sidebar Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-100">
          <div
            className={cn(
              "flex items-center gap-2 overflow-hidden",
              !isSidebarOpen && "md:justify-center w-full",
            )}
          >
            <SchoolLogo className="w-7 h-7 flex-shrink-0" showText={isSidebarOpen || isMobileMenuOpen} />
          </div>
          {isMobileMenuOpen && (
            <button
              onClick={toggleMobileMenu}
              className="md:hidden text-zinc-400 hover:text-zinc-900 cursor-pointer p-1 rounded-lg hover:bg-zinc-50"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-1 custom-scrollbar">
          {filteredMenu.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all group relative font-semibold text-xs min-h-[38px] cursor-pointer",
                  isActive
                    ? "bg-orange-50 text-orange-600 shadow-sm border-l-2 border-orange-500 rounded-lg"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg",
                )}
              >
                <item.icon
                  size={16}
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    isActive
                      ? "text-orange-500 font-bold"
                      : "text-zinc-400 group-hover:text-zinc-600",
                  )}
                />
                {(isSidebarOpen || isMobileMenuOpen) && (
                  <span className="truncate">{item.label}</span>
                )}
                {!isSidebarOpen && !isMobileMenuOpen && (
                  <div className="absolute left-14 bg-zinc-950 text-white text-[9px] font-bold px-2 py-1 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-zinc-100 hidden md:block">
          <button
            onClick={toggleSidebar}
            className="w-full h-8 flex items-center justify-center text-zinc-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all cursor-pointer"
          >
            {isSidebarOpen ? (
              <ChevronLeft size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Navbar */}
        <header className="h-14 bg-white/90 border-b border-zinc-200/60 flex items-center justify-between px-4 md:px-8 z-20 sticky top-0 backdrop-blur-md">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-1.5 text-zinc-500 hover:bg-zinc-50 rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex flex-col animate-in fade-in duration-300">
              <span className={cn(
                "text-[9px] font-black uppercase tracking-wider leading-none",
                location.pathname === "/fees" ? "text-orange-500" : "text-indigo-500"
              )}>
                {headerInfo.category}
              </span>
              <h1 className="text-sm md:text-lg font-bold text-zinc-800 tracking-tight mt-0.5 leading-none">
                {headerInfo.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-6">
            {location.pathname === "/fees" && (
              <div className="hidden sm:flex px-2.5 py-1 bg-orange-50/50 border border-orange-100 rounded-full text-[9px] font-bold text-orange-600 uppercase tracking-wider items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
                Session: 2026-2027
              </div>
            )}
            
            <div className="relative flex items-center">
              <NotificationDropdown />
            </div>

            <div className="h-6 w-px bg-zinc-200 hidden sm:block"></div>

            <div className="flex items-center gap-2 group cursor-pointer bg-zinc-50 hover:bg-zinc-100/50 p-1 md:pr-3 rounded-full border border-zinc-100 hover:border-zinc-200 transition-all">
              <div className="w-7 h-7 md:w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold border border-orange-100 shadow-sm group-hover:scale-102 transition-transform text-xs uppercase">
                {user.name.charAt(0)}
              </div>
              <div className="text-right hidden sm:block space-y-0.5">
                <p className="text-xs font-bold text-zinc-800 leading-none group-hover:text-orange-500 transition-colors">
                  {user.name}
                </p>
                <div className="flex items-center justify-end gap-1">
                  <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[8px] text-zinc-400 font-extrabold uppercase tracking-widest leading-none">
                    {user.role} SECURED
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                className="ml-1 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50/50 rounded-lg transition-all cursor-pointer"
                title="Secure Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6 pb-20">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
