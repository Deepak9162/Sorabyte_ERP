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
  Search,
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
    description: "Welcome back! Here's a summary of the school's performance.",
  },
  "/": {
    category: "ERP Admin Hub",
    title: "Admin Dashboard",
    description: "Welcome back! Here's a summary of the school's performance.",
  },
  "/fees": {
    category: "ERP Finance Hub",
    title: "Finances & Fee Center",
    description:
      "Monitor class performance, expected collection ratio, and record student receipts.",
  },
  "/classes": {
    category: "Academic Setup",
    title: "Class Management",
    description: "Define class groups, sections, and monthly fee structures.",
  },
  "/students": {
    category: "Student Directory",
    title: "Student Registry",
    description:
      "View, search, and manage student enrollments, sections, and records.",
  },
  "/students/new": {
    category: "Student Directory",
    title: "Enroll Student",
    description: "Register and admit a new student into the school system.",
  },
  "/students/bulk-idcards": {
    category: "Student Directory",
    title: "Bulk ID Cards Console",
    description: "Generate and download student ID cards in bulk.",
  },
  "/teachers": {
    category: "Staff Management",
    title: "Teacher Registry",
    description: "Manage school teachers, roles, and profiles.",
  },
  "/attendance": {
    category: "Daily Attendance",
    title: "Daily Attendance Tracker",
    description: "Track, mark, and monitor daily student and staff attendance.",
  },
  "/reports/attendance": {
    category: "Reports & Analytics",
    title: "Attendance Analytics",
    description:
      "Monitor attendance metrics, absent summaries, and monthly reports.",
  },
  "/academic/subjects": {
    category: "Academic Setup",
    title: "Subject Master",
    description: "Configure subjects, subject codes, and academic curriculum.",
  },
  "/academic/mappings": {
    category: "Academic Setup",
    title: "Class Mappings",
    description: "Map subjects to classes and assign class teachers.",
  },
  "/academic/timetable": {
    category: "Academic Setup",
    title: "Timetable Management",
    description: "Create, manage, and view class and teacher schedules.",
  },
  "/admin/credentials": {
    category: "System Administration",
    title: "Credentials Manager",
    description: "Manage staff accounts, credentials, and access roles.",
  },
  "/admissions/requests": {
    category: "Enrollment Center",
    title: "Admission Requests",
    description: "Review and process student admission applications.",
  },
  "/admin/holidays": {
    category: "System Administration",
    title: "Holiday Calendar",
    description: "Manage academic holidays, vacations, and emergency closures.",
  },
  "/reports/fees": {
    category: "Finance & Fee Management",
    title: "Fee Reports & Statements",
    description: "Generate class-wise and month-wise fee collection reports.",
  },
  "/teacher/homework": {
    category: "Academic Workspace",
    title: "Homework Management",
    description:
      "Submit daily subject homework and review assigned class submissions.",
  },
  "/admin/homework": {
    category: "ERP Executive Console",
    title: "Homework Management Center",
    description:
      "Review, approve, and export class consolidated homework summaries.",
  },
};

const getRouteHeader = (path, getPageTitle) => {
  if (path.startsWith("/students/edit/")) {
    return {
      category: "Student Directory",
      title: "Edit Student Profile",
      description: "Modify the profile details of an enrolled student.",
    };
  }
  if (path.startsWith("/students/")) {
    if (path.endsWith("/idcard")) {
      return {
        category: "Student Directory",
        title: "ID Card Console",
        description: "Generate and customize a student ID card.",
      };
    }
    return {
      category: "Student Directory",
      title: "Student Profile Details",
      description:
        "View student academic records, ledger, and profile details.",
    };
  }
  if (
    path.startsWith("/admissions/requests/new") ||
    path.startsWith("/admissions/requests/edit/")
  ) {
    return {
      category: "Enrollment Center",
      title: "Admission Form",
      description: "Fill out admission request details.",
    };
  }
  if (path.startsWith("/admissions/requests/details/")) {
    return {
      category: "Enrollment Center",
      title: "Admission Request Details",
      description: "Review detailed admission request information.",
    };
  }
  if (path.startsWith("/reports/attendance/student/")) {
    return {
      category: "Reports & Analytics",
      title: "Student Attendance Record",
      description: "Detailed daily attendance breakdown for this student.",
    };
  }
  if (path.startsWith("/reports/attendance/analysis/student/")) {
    return {
      category: "Reports & Analytics",
      title: "Student Attendance Analysis",
      description: "Long-term attendance stats and analytics for this student.",
    };
  }
  if (path.startsWith("/reports/attendance/analysis/staff/")) {
    return {
      category: "Reports & Analytics",
      title: "Staff Attendance Analysis",
      description:
        "Long-term attendance stats and analytics for this staff member.",
    };
  }

  return (
    routeHeaderConfig[path] || {
      category: "Little Flower Educational Enterprise",
      title: getPageTitle(),
      description: "School ERP Management Hub",
    }
  );
};

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  React.useEffect(() => {
    const mainEl = document.getElementById("main-scroll-container");
    const handleScroll = () => {
      if (mainEl) {
        setIsScrolled(mainEl.scrollTop > 10);
      }
    };
    if (mainEl) {
      mainEl.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (mainEl) mainEl.removeEventListener("scroll", handleScroll);
    };
  }, []);

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
      id: "teacher-homework",
      path: "/teacher/homework",
      label: "Homework",
      icon: BookOpen,
      roles: ["teacher"],
    },
    {
      id: "admin-homework",
      path: "/admin/homework",
      label: "Homework Center",
      icon: BookOpen,
      roles: ["admin"],
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
    {
      id: "holidays",
      path: "/admin/holidays",
      label: "Holiday Calendar",
      icon: CalendarCheck,
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
          "fixed inset-y-0 left-0 z-[70] md:sticky md:top-0 h-screen bg-slate-50/95 border-r border-slate-200/80 transition-all duration-200 ease-in-out flex flex-col shadow-xl md:shadow-none overflow-hidden shrink-0",
          isSidebarOpen ? "md:w-[245px]" : "md:w-[68px]",
          isMobileMenuOpen
            ? "translate-x-0 w-[240px]"
            : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Top Subtle 2px Pure Orange Accent Line inside Sidebar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500 to-orange-600 z-10" />

        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/80 bg-white">
          <div
            className={cn(
              "flex items-center gap-2 overflow-hidden",
              !isSidebarOpen && "md:justify-center w-full",
            )}
          >
            <SchoolLogo
              className="w-7 h-7 flex-shrink-0"
              showText={isSidebarOpen || isMobileMenuOpen}
            />
          </div>
          {isMobileMenuOpen && (
            <button
              onClick={toggleMobileMenu}
              className="md:hidden text-slate-400 hover:text-slate-900 cursor-pointer p-1.5 rounded-xl hover:bg-slate-100 transition-all"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 custom-scrollbar">
          {filteredMenu.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl transition-all duration-150 group relative font-bold text-xs min-h-[42px] cursor-pointer",
                  isActive
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                    : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs border border-transparent",
                )}
              >
                {isActive && (
                  <span className="w-1 h-5 bg-gradient-to-b from-orange-500 to-amber-500 rounded-full shrink-0 shadow-xs" />
                )}
                <item.icon
                  size={18}
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    isActive
                      ? "text-orange-500 font-bold"
                      : "text-slate-400 group-hover:text-slate-700",
                  )}
                />
                {(isSidebarOpen || isMobileMenuOpen) && (
                  <span className="truncate tracking-tight">{item.label}</span>
                )}
                {!isSidebarOpen && !isMobileMenuOpen && (
                  <div className="absolute left-16 bg-slate-900 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl border border-slate-700">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200/60 hidden md:block bg-white">
          <button
            onClick={toggleSidebar}
            className="w-full h-9 flex items-center justify-center text-slate-400 hover:text-orange-500 hover:bg-slate-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-200/60 shadow-xs"
          >
            {isSidebarOpen ? (
              <ChevronLeft size={18} />
            ) : (
              <ChevronRight size={18} />
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header
          className={cn(
            "h-16 bg-white/90 border-b border-slate-200/80 flex items-center justify-between px-3 sm:px-6 md:px-8 z-30 sticky top-0 transition-all duration-300 ease-out backdrop-blur-xl relative",
            isScrolled && "bg-white/95 shadow-md shadow-slate-900/5 border-slate-200/90"
          )}
        >
          {/* Top Subtle 2px Pure Orange Accent Line inside Header */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500 to-orange-600" />

          {/* LEFT SECTION */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Circular/Rounded Hamburger Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-[14px] bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 flex items-center justify-center text-slate-700 hover:text-orange-600 transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs group shrink-0"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>
            <div className="flex flex-col justify-center min-w-0 max-w-[180px] xs:max-w-[240px] sm:max-w-none">
              <span
                className={cn(
                  "text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider leading-none truncate",
                  location.pathname === "/fees"
                    ? "text-orange-500"
                    : "text-orange-600"
                )}
              >
                {headerInfo.category || "ERP ADMIN HUB"}
              </span>
              <h1 className="text-xs sm:text-base md:text-lg font-black text-slate-900 tracking-tight leading-tight mt-0.5 truncate">
                {headerInfo.title}
              </h1>
            </div>
          </div>

          {/* CENTER SECTION (Desktop Date & Context Chips) */}
          <div className="hidden lg:flex items-center gap-2.5">
            <div className="px-3 py-1 bg-slate-50 border border-slate-200/80 rounded-full text-[11px] font-extrabold text-slate-600 flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>
            {location.pathname === "/fees" && (
              <div className="px-3 py-1 bg-orange-50 border border-orange-200/70 rounded-full text-[11px] font-extrabold text-orange-600 flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                Session 2026-2027
              </div>
            )}
          </div>

          {/* RIGHT SECTION */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Notification Dropdown */}

            {/* Notification Dropdown */}
            <div className="relative flex items-center">
              <NotificationDropdown />
            </div>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            {/* Profile Avatar & User Menu */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50/90 hover:bg-slate-100/90 p-1 sm:p-1.5 sm:pr-3.5 rounded-full border border-slate-200/80 transition-all shadow-2xs group">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-orange-600 text-white flex items-center justify-center font-extrabold shadow-md shadow-orange-600/20 text-xs uppercase border border-orange-500 shrink-0 group-hover:scale-105 transition-transform duration-200">
                {user.name.charAt(0)}
              </div>
              <div className="text-right hidden sm:block space-y-0.5">
                <p className="text-xs font-bold text-slate-900 leading-none group-hover:text-orange-600 transition-colors">
                  {user.name}
                </p>
                <div className="flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider leading-none">
                    {user.role} SECURED
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-1.5 sm:ml-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all cursor-pointer active:scale-95"
                title="Secure Logout"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <main
          id="main-scroll-container"
          className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8 custom-scrollbar"
        >
          <div className="max-w-7xl mx-auto pb-16">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
