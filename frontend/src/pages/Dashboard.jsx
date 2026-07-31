import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserSquare2,
  BookOpen,
  CreditCard,
  Plus,
  ArrowUpRight,
  Search,
  MoreVertical,
  Megaphone,
  Shield,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import Button from "../components/ui/Button";
import { cn } from "../utils/cn";
import { formatToINR } from "../utils/format";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [announcement, setAnnouncement] = useState({
    title: "School Announcement",
    content: "Loading announcement...",
  });
  const [announcementLoading, setAnnouncementLoading] = useState(true);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: "",
  });
  const [isSubmittingAnnouncement, setIsSubmittingAnnouncement] =
    useState(false);
  const [announcementError, setAnnouncementError] = useState("");

  const [attendanceAnalytics, setAttendanceAnalytics] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceErrorState, setAttendanceErrorState] = useState(null);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [isAbsentStudentsModalOpen, setIsAbsentStudentsModalOpen] = useState(false);
  const [isAbsentTeachersModalOpen, setIsAbsentTeachersModalOpen] = useState(false);

  const fetchAttendanceAnalytics = async () => {
    setAttendanceLoading(true);
    setAttendanceErrorState(null);
    try {
      const res = await api.get("/admin/attendance-analytics");
      if (res.data.success) {
        setAttendanceAnalytics(res.data.data);
      } else {
        setAttendanceErrorState("Failed to fetch analytics data");
      }
    } catch (error) {
      console.error("Error fetching attendance analytics:", error);
      setAttendanceErrorState(error.response?.data?.message || "Failed to load real-time analytics");
    } finally {
      setAttendanceLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== "admin") return;

    fetchAttendanceAnalytics();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchAttendanceAnalytics();
      }
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchAttendanceAnalytics();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user?.role]);

  const [pendingStudents, setPendingStudents] = useState([]);
  const [isPendingStudentsModalOpen, setIsPendingStudentsModalOpen] =
    useState(false);

  const [financialData, setFinancialData] = useState([]);
  const [financialLoading, setFinancialLoading] = useState(true);
  const [chartView, setChartView] = useState("monthly");
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState(null);

  const fetchAnnouncement = async () => {
    setAnnouncementLoading(true);
    try {
      const res = await api.get("/announcements/latest");
      if (res.data.success) {
        setAnnouncement(res.data.data);
      }
    } catch (error) {
      console.error("Fetch announcement error:", error);
    } finally {
      setAnnouncementLoading(false);
    }
  };

  const fetchPendingStudents = async () => {
    try {
      const res = await api.get("/fees/pending-students");
      if (res.data.success) {
        setPendingStudents(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching pending students:", error);
    }
  };

  const fetchFinancialSummary = async () => {
    setFinancialLoading(true);
    try {
      const res = await api.get("/fees/monthly-summary");
      if (res.data.success) {
        setFinancialData(res.data.data.monthlyData);
      }
    } catch (error) {
      console.error("Error fetching monthly summary:", error);
    } finally {
      setFinancialLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncement();
    fetchPendingStudents();
    fetchFinancialSummary();
  }, []);

  const handleAnnouncementSubmit = async (e) => {
    e.preventDefault();
    if (!announcementForm.content.trim()) {
      setAnnouncementError("Announcement content is required");
      return;
    }
    setAnnouncementError("");
    setIsSubmittingAnnouncement(true);
    try {
      const res = await api.post("/announcements", {
        title: announcementForm.title.trim() || "School Announcement",
        content: announcementForm.content.trim(),
      });
      if (res.data.success) {
        setAnnouncement(res.data.data);
        setIsAnnouncementModalOpen(false);
        addToast("Announcement posted successfully!", "success");
      }
    } catch (error) {
      console.error("Error posting announcement:", error);
      const msg =
        error.response?.data?.message || "Failed to post announcement";
      addToast(msg, "error");
    } finally {
      setIsSubmittingAnnouncement(false);
    }
  };

  const [stats, setStats] = useState([
    {
      label: "Total Students",
      value: "0",
      icon: Users,
      color: "indigo",
      change: "Live",
      route: "/students",
      hint: "View Student Directory",
    },
    {
      label: "Total Teachers",
      value: "0",
      icon: UserSquare2,
      color: "emerald",
      change: "Live",
      route: "/teachers",
      hint: "View Staff List",
    },
    {
      label: "Total Classes",
      value: "0",
      icon: BookOpen,
      color: "amber",
      change: "Live",
      route: "/classes",
      hint: "View Class Groups",
    },
    {
      label: "Today's Collection",
      value: "₹0.00",
      icon: CreditCard,
      color: "rose",
      change: "Live",
      subtitle: "0 Payments Today",
      route: "/fees",
      hint: "View Fee Console",
    },
  ]);
  const [loading, setLoading] = useState(true);

  // API Integration with Live Events & Auto Refresh
  useEffect(() => {
    let intervalId;

    const fetchStats = async (isBackground = false) => {
      if (user?.role !== "admin") return;
      if (!isBackground) setLoading(true);
      try {
        const res = await api.get(`/admin/stats?t=${Date.now()}`);
        const data = res.data.data;

        const todayColl = data.todayCollection !== undefined ? data.todayCollection : 0;
        const txCount = data.todayTransactionCount !== undefined ? data.todayTransactionCount : 0;

        setStats([
          {
            label: "Total Students",
            value: data.totalStudents.toString(),
            icon: Users,
            color: "indigo",
            change: "Live",
            route: "/students",
            hint: "View Student Directory",
          },
          {
            label: "Total Teachers",
            value: data.totalTeachers.toString(),
            icon: UserSquare2,
            color: "emerald",
            change: "Live",
            route: "/teachers",
            hint: "View Staff List",
          },
          {
            label: "Total Classes",
            value: data.totalClasses.toString(),
            icon: BookOpen,
            color: "amber",
            change: "Live",
            route: "/classes",
            hint: "View Class Groups",
          },
          {
            label: "Today's Collection",
            value: formatToINR(todayColl),
            icon: CreditCard,
            color: "rose",
            change: "Live",
            subtitle: `${txCount} ${txCount === 1 ? "Payment Today" : "Payments Today"}`,
            route: "/fees",
            hint: "View Fee Console",
          },
        ]);
      } catch (error) {
        console.error("Dashboard error:", error);
      } finally {
        if (!isBackground) setLoading(false);
      }
    };

    fetchStats();

    // Event listeners for live updates across components, tabs, and focus state
    const handleLiveUpdate = () => fetchStats(true);

    window.addEventListener("fee-payment-completed", handleLiveUpdate);
    window.addEventListener("focus", handleLiveUpdate);

    const handleStorageChange = (e) => {
      if (e.key === "last_fee_payment_timestamp") {
        fetchStats(true);
      }
    };
    window.addEventListener("storage", handleStorageChange);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchStats(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Dynamic auto-refresh every 15 seconds
    intervalId = setInterval(() => {
      fetchStats(true);
    }, 15000);

    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener("fee-payment-completed", handleLiveUpdate);
      window.removeEventListener("focus", handleLiveUpdate);
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user?.role]);



  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Admin Dashboard
          </h2>
          <p className="text-gray-500 mt-2 font-medium">
            Welcome back! Here's a summary of the school's performance.
          </p>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 sm:gap-8">
        {stats.map((stat, index) => {
          let cardBgClass =
            "from-gray-50 via-white to-gray-50/30 border-gray-200/60 hover:border-gray-300";
          let iconBgClass = "bg-gray-100 text-gray-700";
          let hoverShadowClass = "hover:shadow-gray-100/50";

          if (stat.color === "indigo") {
            cardBgClass =
              "from-indigo-50/70 via-white to-indigo-50/20 border-indigo-100/50 hover:border-indigo-500/30";
            iconBgClass = "bg-indigo-100/70 text-indigo-700";
            hoverShadowClass = "hover:shadow-indigo-100/20";
          } else if (stat.color === "emerald") {
            cardBgClass =
              "from-emerald-50/60 via-white to-emerald-50/20 border-emerald-100/60 hover:border-emerald-600/30";
            iconBgClass = "bg-emerald-100/70 text-emerald-700";
            hoverShadowClass = "hover:shadow-emerald-100/20";
          } else if (stat.color === "amber") {
            cardBgClass =
              "from-amber-50/70 via-white to-amber-50/20 border-amber-100/60 hover:border-amber-500/30";
            iconBgClass = "bg-amber-100/70 text-amber-700";
            hoverShadowClass = "hover:shadow-amber-100/20";
          } else if (stat.color === "rose") {
            cardBgClass =
              "from-indigo-100/40 via-white to-indigo-50/20 border-indigo-100/80 hover:border-indigo-600/30";
            iconBgClass = "bg-indigo-100/90 text-indigo-700 font-black";
            hoverShadowClass = "hover:shadow-indigo-100/20";
          }

          return (
            <div
              key={index}
              onClick={() => navigate(stat.route)}
              title={stat.hint}
              className={cn(
                "group bg-gradient-to-br p-6 rounded-[2rem] border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden relative active:scale-[0.97]",
                cardBgClass,
                hoverShadowClass,
              )}
            >
              {/* Background Accent */}
              <div
                className={cn(
                  "absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-5 group-hover:scale-110 transition-transform duration-500",
                  stat.color === "indigo" && "bg-indigo-600",
                  stat.color === "emerald" && "bg-emerald-600",
                  stat.color === "amber" && "bg-amber-600",
                  stat.color === "rose" && "bg-rose-600",
                )}
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg shadow-gray-150/40",
                      iconBgClass,
                    )}
                  >
                    <stat.icon size={28} />
                  </div>
                  <div className="flex flex-col items-end">
                    <span
                      className={cn(
                        "text-xs font-bold px-2.5 py-1 rounded-full",
                        stat.change === "Live"
                          ? "text-emerald-700 bg-emerald-50"
                          : stat.change.startsWith("+")
                            ? "text-emerald-700 bg-emerald-50"
                            : "text-gray-500 bg-gray-50",
                      )}
                    >
                      {stat.change}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">
                      {stat.subtitle || "vs last month"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-gray-500 text-sm font-semibold">
                    {stat.label}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3
                      className={cn(
                        "text-3xl font-black text-gray-900",
                        loading && "blur-sm animate-pulse",
                      )}
                    >
                      {stat.value}
                    </h3>
                    <ArrowUpRight
                      size={16}
                      className={cn(
                        "transition-colors",
                        stat.color === "indigo" &&
                          "text-gray-300 group-hover:text-indigo-500",
                        stat.color === "emerald" &&
                          "text-gray-300 group-hover:text-emerald-500",
                        stat.color === "amber" &&
                          "text-gray-300 group-hover:text-amber-500",
                        stat.color === "rose" &&
                          "text-gray-300 group-hover:text-indigo-500",
                      )}
                    />
                  </div>
                  {/* Clickable hint text */}
                  <p className="text-[10px] font-bold text-gray-300 group-hover:text-indigo-400 transition-colors uppercase tracking-widest mt-1">
                    {stat.hint} →
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Attendance Analytics Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-150 pb-4">
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              Today's Live Attendance Analytics
            </h3>
            <p className="text-gray-400 text-xs font-semibold mt-1">
              Real-time calculations of attendance metrics across students and teachers.
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={fetchAttendanceAnalytics}
            className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-indigo-650 hover:bg-indigo-50 border border-indigo-100 hover:border-indigo-200 rounded-xl px-4 py-2 cursor-pointer self-start sm:self-auto"
            loading={attendanceLoading}
          >
            <RefreshCw size={14} className={cn(attendanceLoading && "animate-spin")} />
            Sync Now
          </Button>
        </div>

        {attendanceLoading && !attendanceAnalytics ? (
          <AnalyticsSkeleton />
        ) : attendanceErrorState ? (
          <AnalyticsError message={attendanceErrorState} onRetry={fetchAttendanceAnalytics} />
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Student Attendance Card */}
              <div
                onClick={() => navigate("/reports/attendance")}
                className="group bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/10 border border-emerald-100/50 hover:border-emerald-500/30 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[160px] active:scale-[0.98]"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                      Students Today
                    </span>
                    <h4 className="text-2xl font-black text-gray-900 tracking-tight">
                      {attendanceAnalytics?.studentPresent} Present
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsAbsentStudentsModalOpen(true);
                        }}
                        className="text-[9px] font-black text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-105 px-2 py-0.5 rounded-full transition-all uppercase tracking-wider shrink-0"
                        title="View Absent Students"
                      >
                        Absent: {attendanceAnalytics?.studentAbsent}
                      </span>
                      <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                        • Total: {attendanceAnalytics?.totalStudents}
                      </span>
                    </div>
                  </div>
                  <CircularProgress
                    percentage={attendanceAnalytics?.studentAttendancePercentage || 0}
                    colorClass={getCircularColor(attendanceAnalytics?.studentAttendancePercentage || 0)}
                  />
                </div>
                <div className="flex items-center justify-between border-t border-emerald-100/40 pt-4 mt-4">
                  <span className={cn(
                    "text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                    getAttendanceBgClass(attendanceAnalytics?.studentAttendancePercentage || 0)
                  )}>
                    {attendanceAnalytics?.studentAttendancePercentage >= 95 ? "Excellent" : attendanceAnalytics?.studentAttendancePercentage >= 90 ? "Warning" : "Critical"}
                  </span>
                  <span className="text-[9px] font-black text-gray-300 group-hover:text-emerald-500 transition-colors uppercase tracking-widest">
                    View Report →
                  </span>
                </div>
              </div>

              {/* Teacher Attendance Card */}
              <div
                onClick={() => navigate("/admin/staff/attendance-history")}
                className="group bg-gradient-to-br from-indigo-50/30 via-white to-indigo-50/10 border border-indigo-100/50 hover:border-indigo-500/30 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[160px] active:scale-[0.98]"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                      Teachers Today
                    </span>
                    <h4 className="text-2xl font-black text-gray-900 tracking-tight">
                      {attendanceAnalytics?.teacherPresent} Present
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsAbsentTeachersModalOpen(true);
                        }}
                        className="text-[9px] font-black text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-105 px-2 py-0.5 rounded-full transition-all uppercase tracking-wider shrink-0"
                        title="View Absent Teachers"
                      >
                        Absent: {attendanceAnalytics?.teacherAbsent}
                      </span>
                      <span className="text-gray-455 text-[10px] font-bold uppercase tracking-wider">
                        • Total: {attendanceAnalytics?.totalTeachers}
                      </span>
                    </div>
                  </div>
                  <CircularProgress
                    percentage={attendanceAnalytics?.teacherAttendancePercentage || 0}
                    colorClass={getCircularColor(attendanceAnalytics?.teacherAttendancePercentage || 0)}
                  />
                </div>
                <div className="flex items-center justify-between border-t border-indigo-100/40 pt-4 mt-4">
                  <span className={cn(
                    "text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                    getAttendanceBgClass(attendanceAnalytics?.teacherAttendancePercentage || 0)
                  )}>
                    {attendanceAnalytics?.teacherAttendancePercentage >= 95 ? "Excellent" : attendanceAnalytics?.teacherAttendancePercentage >= 90 ? "Warning" : "Critical"}
                  </span>
                  <span className="text-[9px] font-black text-gray-305 group-hover:text-indigo-500 transition-colors uppercase tracking-widest">
                    View Report →
                  </span>
                </div>
              </div>

              {/* Completion Card */}
              <div
                onClick={() => setIsPendingModalOpen(true)}
                className="group bg-gradient-to-br from-amber-50/30 via-white to-amber-50/10 border border-amber-100/50 hover:border-amber-500/30 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[160px] active:scale-[0.98]"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                      Classes Completed
                    </span>
                    <h4 className="text-2xl font-black text-gray-900 tracking-tight">
                      {attendanceAnalytics?.attendanceCompleted} / {attendanceAnalytics?.totalClasses}
                    </h4>
                    <p className="text-gray-450 text-[10px] font-bold uppercase tracking-wider">
                      Pending: {attendanceAnalytics?.attendancePending} classes
                    </p>
                  </div>
                  <CircularProgress
                    percentage={attendanceAnalytics?.completionPercentage || 0}
                    colorClass="text-amber-500"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-amber-100/40 pt-4 mt-4">
                  <span className={cn(
                    "text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                    attendanceAnalytics?.attendancePending === 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700 border border-amber-100"
                  )}>
                    {attendanceAnalytics?.attendancePending === 0 ? "All Submitted" : "Pending Actions"}
                  </span>
                  <span className="text-[9px] font-black text-gray-305 group-hover:text-amber-500 transition-colors uppercase tracking-widest">
                    View Pending List →
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Insights panel */}
            <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-[2.5rem] border border-gray-200/60 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-650 rounded-full animate-ping" />
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                    Today's Quick Insights
                  </h4>
                </div>
                {attendanceAnalytics?.lastUpdated && (
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock size={12} />
                    Last Updated: {attendanceAnalytics.lastUpdated}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attendanceAnalytics?.insights && attendanceAnalytics.insights.length > 0 ? (
                  attendanceAnalytics.insights.map((insight, idx) => {
                    let dotColor = "bg-indigo-500";
                    if (insight.toLowerCase().includes("pending") || insight.toLowerCase().includes("below")) {
                      dotColor = "bg-amber-500";
                    }
                    if (insight.toLowerCase().includes("no active") || insight.toLowerCase().includes("critical") || insight.toLowerCase().includes("weekend") || insight.toLowerCase().includes("no student")) {
                      dotColor = "bg-rose-500";
                    }
                    if (insight.toLowerCase().includes("excellent") || insight.toLowerCase().includes("completed")) {
                      dotColor = "bg-emerald-500";
                    }
                    return (
                      <div key={idx} className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-gray-150/70 shadow-sm">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
                        <p className="text-xs text-gray-700 font-bold tracking-tight">
                          {insight}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-2 text-center py-6 text-xs text-gray-405 font-bold uppercase tracking-widest">
                    No insights compiled for today.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Financial Overview Chart Area */}
        <div className="lg:col-span-2 bg-gradient-to-br from-white via-gray-50/20 to-gray-100/40 rounded-[2.5rem] border border-gray-200/60 shadow-sm p-8 group overflow-hidden relative min-h-[420px] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none block mb-1">
                Accounts & Collections
              </span>
              <h4 className="text-xl font-bold text-gray-900 tracking-tight">
                Financial Overview
              </h4>
            </div>
            <div className="flex gap-1.5 bg-gray-100/80 p-1 rounded-full border border-gray-150">
              <button
                onClick={() => setChartView("monthly")}
                className={cn(
                  "px-4 py-1.5 text-xs font-black rounded-full transition-all uppercase tracking-wider cursor-pointer",
                  chartView === "monthly"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-900",
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setChartView("yearly")}
                className={cn(
                  "px-4 py-1.5 text-xs font-black rounded-full transition-all uppercase tracking-wider cursor-pointer",
                  chartView === "yearly"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-900",
                )}
              >
                Yearly
              </button>
            </div>
          </div>

          {financialLoading ? (
            <div className="flex-1 flex flex-col justify-center items-center py-12">
              <div className="animate-pulse space-y-4 w-full">
                <div className="flex justify-between items-end h-48 w-full gap-4 px-4">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-gray-100 rounded-t-lg w-full"
                      style={{
                        height: `${Math.max(10, Math.sin(i) * 80 + 90)}px`,
                      }}
                    />
                  ))}
                </div>
                <div className="h-4 bg-gray-100 rounded-full w-full" />
              </div>
            </div>
          ) : chartView === "monthly" ? (
            /* Monthly SVG Chart View */
            <div className="relative flex-1 flex flex-col justify-between mt-4">
              {/* Tooltip Overlay */}
              {hoveredMonthIdx !== null && financialData[hoveredMonthIdx] && (
                <div
                  className="absolute z-20 bg-gray-900/95 text-white p-4 rounded-2xl shadow-xl border border-gray-800 text-xs space-y-2 pointer-events-none transition-all duration-150 backdrop-blur-md"
                  style={{
                    left: `${Math.min(
                      Math.max(10, 50 + hoveredMonthIdx * 43 - 75),
                      350,
                    )}px`,
                    top: `-10px`,
                  }}
                >
                  <p className="font-black border-b border-gray-800 pb-1.5 uppercase text-[10px] tracking-wider text-indigo-400">
                    {financialData[hoveredMonthIdx].month} 2026
                  </p>
                  <div className="space-y-1 font-bold">
                    <p className="flex justify-between gap-6">
                      <span className="text-gray-400">Collected:</span>
                      <span className="text-emerald-400">
                        {formatToINR(financialData[hoveredMonthIdx].collected)}
                      </span>
                    </p>
                    <p className="flex justify-between gap-6">
                      <span className="text-gray-400">Expected:</span>
                      <span>
                        {formatToINR(financialData[hoveredMonthIdx].expected)}
                      </span>
                    </p>
                    <p className="flex justify-between gap-6 border-t border-gray-800 pt-1.5">
                      <span className="text-gray-400">Collection Rate:</span>
                      <span className="text-indigo-400">
                        {(
                          (financialData[hoveredMonthIdx].collected /
                            financialData[hoveredMonthIdx].expected) *
                            100 || 0
                        ).toFixed(1)}
                        %
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Chart Grid Lines and Columns */}
              <div className="relative w-full overflow-x-auto custom-scrollbar">
                <svg
                  viewBox="0 0 600 240"
                  className="w-full min-w-[550px] h-[240px] select-none"
                >
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = 20 + (1 - ratio) * 170;
                    const maxVal = Math.max(
                      ...financialData.map((d) =>
                        Math.max(d.expected, d.collected),
                      ),
                      100000,
                    );
                    return (
                      <g key={idx} className="opacity-40">
                        <line
                          x1="50"
                          y1={y}
                          x2="580"
                          y2={y}
                          stroke="#e5e7eb"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <text
                          x="40"
                          y={y + 4}
                          textAnchor="end"
                          className="text-[9px] font-black fill-gray-400"
                        >
                          {ratio === 0
                            ? "₹0"
                            : `₹${Math.round((maxVal * ratio) / 1000)}k`}
                        </text>
                      </g>
                    );
                  })}

                  {/* Collected Bar Charts */}
                  {financialData.map((d, i) => {
                    const maxVal = Math.max(
                      ...financialData.map((x) =>
                        Math.max(x.expected, x.collected),
                      ),
                      100000,
                    );
                    const x = 60 + i * 43;
                    const height = (d.collected / maxVal) * 170;
                    const y = 190 - height;
                    return (
                      <rect
                        key={i}
                        x={x - 10}
                        y={y}
                        width="20"
                        height={Math.max(3, height)}
                        rx="5"
                        fill="url(#collectedGradient)"
                        className={cn(
                          "transition-all duration-300 cursor-pointer origin-bottom hover:brightness-110",
                          hoveredMonthIdx === i ? "opacity-100" : "opacity-85",
                        )}
                        onMouseEnter={() => setHoveredMonthIdx(i)}
                        onMouseLeave={() => setHoveredMonthIdx(null)}
                      />
                    );
                  })}

                  {/* Expected Area Path (Line Chart) */}
                  <path
                    d={(() => {
                      const maxVal = Math.max(
                        ...financialData.map((x) =>
                          Math.max(x.expected, x.collected),
                        ),
                        100000,
                      );
                      return financialData
                        .map((d, i) => {
                          const x = 60 + i * 43;
                          const y = 190 - (d.expected / maxVal) * 170;
                          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                        })
                        .join(" ");
                    })()}
                    fill="none"
                    stroke="#a5b4fc"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-75"
                  />

                  {/* Expected Area Dots */}
                  {financialData.map((d, i) => {
                    const maxVal = Math.max(
                      ...financialData.map((x) =>
                        Math.max(x.expected, x.collected),
                      ),
                      100000,
                    );
                    const x = 60 + i * 43;
                    const y = 190 - (d.expected / maxVal) * 170;
                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r={hoveredMonthIdx === i ? "6" : "4.5"}
                        fill="#ffffff"
                        stroke="#6366f1"
                        strokeWidth="3.5"
                        className="transition-all duration-200 cursor-pointer"
                        onMouseEnter={() => setHoveredMonthIdx(i)}
                        onMouseLeave={() => setHoveredMonthIdx(null)}
                      />
                    );
                  })}

                  {/* X Axis Labels */}
                  {financialData.map((d, i) => {
                    const x = 60 + i * 43;
                    return (
                      <text
                        key={i}
                        x={x}
                        y="215"
                        textAnchor="middle"
                        className={cn(
                          "text-[9px] font-black uppercase tracking-tight transition-colors duration-200 cursor-pointer",
                          hoveredMonthIdx === i
                            ? "fill-indigo-600 font-extrabold"
                            : "fill-gray-400",
                        )}
                        onMouseEnter={() => setHoveredMonthIdx(i)}
                        onMouseLeave={() => setHoveredMonthIdx(null)}
                      >
                        {d.month.substring(0, 3)}
                      </text>
                    );
                  })}

                  {/* SVG Gradient definitions */}
                  <defs>
                    <linearGradient
                      id="collectedGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#4f46e5" />
                      <stop
                        offset="100%"
                        stopColor="#818cf8"
                        stopOpacity="0.4"
                      />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Legends & Details Row */}
              <div className="flex gap-6 items-center border-t border-gray-100 pt-4 mt-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-indigo-600 shadow-sm shrink-0" />
                  <span className="text-gray-500 font-bold uppercase tracking-wide">
                    Collected Revenue
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 rounded bg-indigo-400 shrink-0" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white border-2 border-indigo-650 shrink-0" />
                  <span className="text-gray-500 font-bold uppercase tracking-wide">
                    Target Expectancy
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Yearly Summary Dashboard View */
            <div className="flex-1 flex flex-col justify-between py-2 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-auto">
                <div className="p-6 bg-indigo-50/40 border border-indigo-100/50 rounded-3xl text-left">
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                    Annual Expectation
                  </span>
                  <h4 className="text-2xl font-black text-gray-900 mt-2">
                    {formatToINR(
                      financialData.reduce((acc, c) => acc + c.expected, 0),
                    )}
                  </h4>
                  <p className="text-[10px] text-gray-400 font-semibold mt-1">
                    Based on active student base
                  </p>
                </div>

                <div className="p-6 bg-emerald-50/30 border border-emerald-100/50 rounded-3xl text-left">
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                    Annual Collected
                  </span>
                  <h4 className="text-2xl font-black text-emerald-600 mt-2">
                    {formatToINR(
                      financialData.reduce((acc, c) => acc + c.collected, 0),
                    )}
                  </h4>
                  <p className="text-[10px] text-gray-400 font-semibold mt-1">
                    Settled payments in 2026-27
                  </p>
                </div>

                <div className="p-6 bg-amber-50/30 border border-amber-100/50 rounded-3xl text-left">
                  <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">
                    Total Outstanding
                  </span>
                  <h4 className="text-2xl font-black text-amber-600 mt-2">
                    {formatToINR(
                      Math.max(
                        0,
                        financialData.reduce(
                          (acc, c) => acc + c.expected - c.collected,
                          0,
                        ),
                      ),
                    )}
                  </h4>
                  <p className="text-[10px] text-gray-400 font-semibold mt-1">
                    To be collected
                  </p>
                </div>
              </div>

              {/* Progress Summary Dial */}
              <div className="border-t border-gray-100 pt-6 mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <h5 className="text-sm font-black text-gray-800 uppercase tracking-tight">
                    Net Collection Progress
                  </h5>
                  <p className="text-xs text-gray-400 font-medium">
                    The percentage of total expected academic revenue
                    successfully processed.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-black text-indigo-600">
                    {(
                      (financialData.reduce((acc, c) => acc + c.collected, 0) /
                        financialData.reduce((acc, c) => acc + c.expected, 0)) *
                        100 || 0
                    ).toFixed(1)}
                    %
                  </span>
                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-150">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{
                        width: `${
                          (financialData.reduce(
                            (acc, c) => acc + c.collected,
                            0,
                          ) /
                            financialData.reduce(
                              (acc, c) => acc + c.expected,
                              0,
                            )) *
                            100 || 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Sidebar */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100 flex flex-col justify-between min-h-[220px]">
            <div>
              <h4 className="text-lg font-black mb-2 flex items-center gap-2">
                <Megaphone size={20} className="text-indigo-200" />
                {announcement.title}
              </h4>
              {announcementLoading ? (
                <div className="animate-pulse space-y-3 mb-6">
                  <div className="h-4 bg-white/20 rounded-full w-2/3" />
                  <div className="h-4 bg-white/20 rounded-full w-full" />
                  <div className="h-4 bg-white/20 rounded-full w-5/6" />
                </div>
              ) : (
                <p className="text-indigo-100 text-sm leading-relaxed mb-6 whitespace-pre-line font-medium">
                  {announcement.content}
                </p>
              )}
            </div>
            <div className="space-y-4">
              {announcement.createdAt && (
                <div className="text-[10px] text-indigo-205 font-bold flex justify-between items-center opacity-90 border-t border-white/10 pt-4">
                  <span>By: {announcement.createdBy?.name || "Admin"}</span>
                  <span>
                    {new Date(announcement.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  setAnnouncementForm({
                    title:
                      announcement.title === "School Announcement"
                        ? ""
                        : announcement.title,
                    content:
                      announcement.content.startsWith("Welcome to") ||
                      announcement.content.startsWith("Loading")
                        ? ""
                        : announcement.content,
                  });
                  setAnnouncementError("");
                  setIsAnnouncementModalOpen(true);
                }}
                className="bg-white/10 text-white border-none hover:bg-white/20 w-full rounded-2xl py-3 text-xs font-black tracking-wider uppercase transition-all duration-300"
              >
                Post Update
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Announcement Update Modal */}
      <Modal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        title="Post School Announcement"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsAnnouncementModalOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAnnouncementSubmit}
              loading={isSubmittingAnnouncement}
              className="rounded-xl px-6"
            >
              Publish Update
            </Button>
          </>
        }
      >
        <form onSubmit={handleAnnouncementSubmit} className="space-y-6">
          <Input
            label="Announcement Title"
            placeholder="e.g. Annual Day Celebrations (optional)"
            value={announcementForm.title}
            onChange={(e) =>
              setAnnouncementForm({
                ...announcementForm,
                title: e.target.value,
              })
            }
          />
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 ml-1">
              Announcement Content
            </label>
            <textarea
              rows={4}
              placeholder="Type your announcement content here..."
              value={announcementForm.content}
              onChange={(e) =>
                setAnnouncementForm({
                  ...announcementForm,
                  content: e.target.value,
                })
              }
              className={cn(
                "w-full bg-white border border-gray-250 text-gray-900 text-sm sm:text-base rounded-2xl block p-4 sm:p-3 transition-all duration-200 outline-none placeholder:text-gray-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 resize-none",
                announcementError &&
                  "border-red-500 focus:border-red-500 focus:ring-red-500/10",
              )}
            />
            {announcementError && (
              <p className="text-xs text-red-500 font-medium ml-1 flex items-center gap-1 animate-in fade-in slide-in-from-left-1">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                {announcementError}
              </p>
            )}
          </div>
        </form>
      </Modal>

      {/* Pending Students Modal */}
      <Modal
        isOpen={isPendingStudentsModalOpen}
        onClose={() => setIsPendingStudentsModalOpen(false)}
        title="Pending Fee Details"
        maxWidth="md"
        noFooter
      >
        <div className="space-y-6">
          <p className="text-sm text-gray-500 font-medium leading-relaxed">
            The following students have pending fee balances. You can initiate
            fee collection directly from this list.
          </p>

          <div className="overflow-hidden rounded-2xl border border-gray-150 shadow-sm max-h-[50vh] overflow-y-auto scrollbar-thin">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Student Details
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Class
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                    Pending Amt
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pendingStudents.map((student) => (
                  <tr
                    key={student.studentId}
                    className="hover:bg-gray-50/40 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-black text-gray-900 uppercase text-xs tracking-tight">
                          {student.fullName}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                          ID: {student.studentId} • Roll: {student.rollNumber}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-gray-100 text-gray-650 rounded-xl text-[10px] font-black uppercase tracking-wider">
                        {student.className}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div>
                        <p className="text-xs font-black text-rose-600">
                          {formatToINR(student.pendingAmount)}
                        </p>
                        <p className="text-[9px] text-gray-450 font-bold uppercase tracking-tighter mt-0.5">
                          Paid: {formatToINR(student.totalPaid)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => {
                          setIsPendingStudentsModalOpen(false);
                          // Pass state to pre-fill search in fee collection
                          navigate("/fees", {
                            state: { searchStudentId: student.studentId },
                          });
                        }}
                        className="px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm cursor-pointer"
                      >
                        Collect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 mt-6">
            <Button
              variant="secondary"
              onClick={() => setIsPendingStudentsModalOpen(false)}
              className="rounded-xl"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setIsPendingStudentsModalOpen(false);
                navigate("/fees");
              }}
              className="rounded-xl"
            >
              Go to Fee Console
            </Button>
          </div>
        </div>
      </Modal>

      {/* Pending Attendance Modal */}
      <Modal
        isOpen={isPendingModalOpen}
        onClose={() => setIsPendingModalOpen(false)}
        title="Pending Class Attendance"
        maxWidth="md"
        noFooter
      >
        <div className="space-y-6">
          <p className="text-sm text-gray-500 font-medium leading-relaxed">
            The following classes have not submitted attendance for today yet. You can follow up with the respective Class Teachers.
          </p>

          <div className="overflow-hidden rounded-2xl border border-gray-150 shadow-sm max-h-[50vh] overflow-y-auto scrollbar-thin">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Class
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Class Teacher
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {attendanceAnalytics?.pendingClassesList && attendanceAnalytics.pendingClassesList.length > 0 ? (
                  attendanceAnalytics.pendingClassesList.map((item) => (
                    <tr
                      key={item.classId}
                      className="hover:bg-gray-50/40 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-gray-100 text-gray-650 rounded-xl text-[10px] font-black uppercase tracking-wider">
                          {item.className}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-black text-gray-900 uppercase text-xs tracking-tight">
                          {item.teacherName}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                          item.status === "Draft (Not Submitted)"
                            ? "bg-amber-50 text-amber-700 border border-amber-100"
                            : "bg-rose-50 text-rose-700 border border-rose-100"
                        )}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-xs text-gray-450 font-bold uppercase tracking-widest">
                      No pending classes. All classes submitted!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 mt-6">
            <Button
              variant="secondary"
              onClick={() => setIsPendingModalOpen(false)}
              className="rounded-xl"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Absent Students Modal */}
      <Modal
        isOpen={isAbsentStudentsModalOpen}
        onClose={() => setIsAbsentStudentsModalOpen(false)}
        title="Students Absent Today"
        maxWidth="md"
        noFooter
      >
        <div className="space-y-6">
          <p className="text-sm text-gray-500 font-medium leading-relaxed">
            The following students are marked absent for today. You can contact their guardians or review their attendance remarks.
          </p>

          <div className="overflow-hidden rounded-2xl border border-gray-150 shadow-sm max-h-[50vh] overflow-y-auto scrollbar-thin">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Student Details
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Class
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Mobile/Contact
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {attendanceAnalytics?.absentStudentsList && attendanceAnalytics.absentStudentsList.length > 0 ? (
                  attendanceAnalytics.absentStudentsList.map((student) => (
                    <tr
                      key={student.studentId}
                      className="hover:bg-gray-50/40 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-black text-gray-900 uppercase text-xs tracking-tight">
                            {student.fullName}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                            Roll No: {student.rollNumber}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-gray-100 text-gray-650 rounded-xl text-[10px] font-black uppercase tracking-wider">
                          {student.className} - {student.section}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-700">
                        {student.phone}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                          student.remarks !== 'No remarks'
                            ? "bg-amber-50 text-amber-700 border border-amber-100"
                            : "bg-gray-50 text-gray-500 border border-gray-200"
                        )}>
                          {student.remarks}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-xs text-gray-450 font-bold uppercase tracking-widest">
                      No absent students today. 100% Student attendance!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end border-t border-gray-100 pt-4 mt-6">
            <Button
              variant="secondary"
              onClick={() => setIsAbsentStudentsModalOpen(false)}
              className="rounded-xl"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Absent Teachers Modal */}
      <Modal
        isOpen={isAbsentTeachersModalOpen}
        onClose={() => setIsAbsentTeachersModalOpen(false)}
        title="Teachers Absent Today"
        maxWidth="md"
        noFooter
      >
        <div className="space-y-6">
          <p className="text-sm text-gray-500 font-medium leading-relaxed">
            The following staff/teachers are marked absent for today.
          </p>

          <div className="overflow-hidden rounded-2xl border border-gray-150 shadow-sm max-h-[50vh] overflow-y-auto scrollbar-thin">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Teacher Name
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Subject/Dept
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Phone Number
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Remarks/Reason
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {attendanceAnalytics?.absentTeachersList && attendanceAnalytics.absentTeachersList.length > 0 ? (
                  attendanceAnalytics.absentTeachersList.map((teacher) => (
                    <tr
                      key={teacher.teacherId}
                      className="hover:bg-gray-50/40 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-black text-gray-900 uppercase text-xs tracking-tight">
                          {teacher.fullName}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-wider">
                          {teacher.subject}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-700">
                        {teacher.phone}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                          teacher.remarks !== 'No remarks'
                            ? "bg-amber-50 text-amber-700 border border-amber-100"
                            : "bg-gray-50 text-gray-500 border border-gray-200"
                        )}>
                          {teacher.remarks}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-xs text-gray-450 font-bold uppercase tracking-widest">
                      No absent teachers today. 100% Teacher attendance!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end border-t border-gray-100 pt-4 mt-6">
            <Button
              variant="secondary"
              onClick={() => setIsAbsentTeachersModalOpen(false)}
              className="rounded-xl"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState([
    { label: "My Classes", value: "0", icon: BookOpen, color: "indigo" },
    { label: "Students", value: "0", icon: Users, color: "emerald" },
    {
      label: "Attendance Target",
      value: "95%",
      icon: ArrowUpRight,
      color: "amber",
    },
  ]);
  const [attendance, setAttendance] = useState({
    present: 0,
    absent: 0,
    total: 0,
  });
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [classTeacherOf, setClassTeacherOf] = useState([]);
  const [announcement, setAnnouncement] = useState({
    title: "School Announcement",
    content: "Loading announcement...",
  });
  const [announcementLoading, setAnnouncementLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      setAnnouncementLoading(true);
      try {
        const res = await api.get("/announcements/latest");
        if (res.data.success) {
          setAnnouncement(res.data.data);
        }
      } catch (error) {
        console.error("Fetch announcement error:", error);
      } finally {
        setAnnouncementLoading(false);
      }
    };
    fetchAnnouncement();
  }, []);

  useEffect(() => {
    const fetchTeacherStats = async () => {
      try {
        const res = await api.get("/teachers/dashboard/stats");
        const data = res.data.data;

        setStats([
          {
            label: "My Classes",
            value: data.totalClasses.toString(),
            icon: BookOpen,
            color: "indigo",
          },
          {
            label: "My Students",
            value: data.totalStudents.toString(),
            icon: Users,
            color: "emerald",
          },
          {
            label: "Classes Assigned",
            value: data.assignedClasses.length.toString(),
            icon: ArrowUpRight,
            color: "amber",
          },
        ]);

        setAttendance({
          present: data.attendanceSummary.present,
          absent: data.attendanceSummary.absent,
          total: data.attendanceSummary.totalMarked,
        });

        setAssignedClasses(data.assignedClasses || []);
        setClassTeacherOf(data.classTeacherOf || []);
      } catch (error) {
        console.error("Teacher Dashboard error:", error);
      }
    };

    fetchTeacherStats();
  }, []);

  return (
    <div className="space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
          Teacher Dashboard
        </h2>
        <p className="hidden md:block text-gray-500 mt-1 font-medium">
          Manage your classes, students, and attendance records.
        </p>
      </div>

      {/* Mobile Top Summary Grid */}
      <div className="md:hidden grid grid-cols-2 gap-3">
        {[
          { label: "Classes", value: assignedClasses.length, color: "indigo", icon: BookOpen },
          { label: "Students", value: stats.find(s => s.label === "My Students" || s.label === "Students")?.value || "0", color: "emerald", icon: Users },
          { label: "Pending", value: classTeacherOf.length > 0 ? (attendance.total > 0 ? 0 : classTeacherOf.length) : 0, color: "amber", icon: Clock },
          { label: "Completed", value: classTeacherOf.length > 0 ? (attendance.total > 0 ? classTeacherOf.length : 0) : 0, color: "emerald", icon: CheckCircle2 }
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider block mb-0.5">{item.label}</span>
              <p className="text-xl font-black text-gray-900 leading-tight">{item.value}</p>
            </div>
            <div className={cn(
              "p-2 rounded-xl shrink-0 shadow-inner",
              item.color === "indigo" && "bg-indigo-50 text-indigo-600 shadow-indigo-100/30",
              item.color === "emerald" && "bg-emerald-50 text-emerald-600 shadow-emerald-100/30",
              item.color === "amber" && "bg-amber-50 text-amber-600 shadow-amber-100/30",
            )}>
              <item.icon size={16} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Stats Grid */}
      <div className="hidden md:grid grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          let cardBgClass =
            "from-gray-50 via-white to-gray-50/30 border-gray-200/60 hover:border-gray-300";
          let iconBgClass = "bg-gray-100 text-gray-700";

          if (stat.color === "indigo") {
            cardBgClass =
              "from-indigo-50/70 via-white to-indigo-50/20 border-indigo-100/50 hover:border-indigo-500/30 hover:shadow-indigo-100/20";
            iconBgClass = "bg-indigo-100/70 text-indigo-700";
          } else if (stat.color === "emerald") {
            cardBgClass =
              "from-emerald-50/60 via-white to-emerald-50/20 border-emerald-100/60 hover:border-emerald-600/30 hover:shadow-emerald-100/20";
            iconBgClass = "bg-emerald-100/70 text-emerald-700";
          } else if (stat.color === "amber") {
            cardBgClass =
              "from-amber-50/70 via-white to-amber-50/20 border-amber-100/60 hover:border-amber-500/30 hover:shadow-amber-100/20";
            iconBgClass = "bg-amber-100/70 text-amber-750";
          }

          return (
            <div
              key={index}
              className={cn(
                "group bg-gradient-to-br p-6 rounded-[2rem] border shadow-sm hover:shadow-lg transition-all duration-300",
                cardBgClass,
              )}
            >
              <div className="flex items-center gap-4 mb-4">
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-md shadow-gray-100/50",
                    iconBgClass,
                  )}
                >
                  <stat.icon size={24} />
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <h3 className="text-2xl font-black text-gray-900">
                    {stat.value}
                  </h3>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* My Class (Class Teacher) — Prominent Section */}
      {classTeacherOf.length > 0 && (
        <>
          {/* Desktop Class Teacher Section */}
          <div className="hidden md:block space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-md shadow-indigo-200">
                <Shield size={20} className="text-white" />
              </div>
              <div>
                <h4 className="text-xl font-black text-gray-900 tracking-tight">
                  My Class (Class Teacher)
                </h4>
                <p className="text-xs font-bold text-gray-400">
                  You are the Class Teacher — manage attendance here
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classTeacherOf.map((cls) => (
                <div
                  key={cls.id}
                  className="bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/20 p-6 rounded-[2.5rem] border-2 border-indigo-200/60 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 relative group flex flex-col justify-between min-h-[220px]"
                >
                  <div className="absolute top-4 right-4">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white bg-indigo-600 px-3 py-1 rounded-full shadow-sm">
                      Class Teacher
                    </span>
                  </div>

                  <div>
                    <h4 className="text-3xl font-black text-gray-900 tracking-tight mt-2 uppercase">
                      Class {cls.name}
                    </h4>
                    <p className="text-gray-400 text-xs font-bold mt-2">
                      Enrolled Students:{" "}
                      <span className="text-gray-800 font-extrabold">
                        {cls.studentCount}
                      </span>
                    </p>

                    {/* Today's Quick Stats */}
                    <div className="flex items-center gap-4 mt-4">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span className="text-sm font-black text-emerald-700">
                          {attendance.present}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold">
                          Present
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <XCircle size={14} className="text-rose-600" />
                        <span className="text-sm font-black text-rose-700">
                          {attendance.absent}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold">
                          Absent
                        </span>
                      </div>
                      {attendance.total > 0 && (
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          {((attendance.present / attendance.total) * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2.5 mt-6 border-t border-indigo-100 pt-4">
                    <Button
                      onClick={() =>
                        navigate("/attendance", { state: { classId: cls.id } })
                      }
                      className="flex-1 rounded-xl py-2.5 text-[11px] font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      Mark Today's Attendance
                    </Button>
                    <Button
                      onClick={() =>
                        navigate("/teacher/timetable", {
                          state: { classId: cls.id },
                        })
                      }
                      className="flex-1 rounded-xl py-2.5 text-[11px] font-black bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      View Schedule
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Class Teacher Section */}
          <div className="md:hidden space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <Shield size={16} className="text-white" />
              </div>
              <h4 className="text-base font-black text-gray-900 tracking-tight">
                My Class (Class Teacher)
              </h4>
            </div>
            {classTeacherOf.map((cls) => (
              <div key={cls.id} className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-lg font-black text-gray-900 uppercase">Class {cls.name}</h4>
                    <p className="text-gray-400 text-xs font-bold mt-0.5">{cls.studentCount} Students</p>
                  </div>
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg border",
                    attendance.total > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"
                  )}>
                    {attendance.total > 0 ? "Attendance Completed" : "Attendance Pending"}
                  </span>
                </div>
                <div className="flex gap-2 pt-2 border-t border-gray-50">
                  <Button
                    onClick={() => navigate("/attendance", { state: { classId: cls.id } })}
                    className="flex-1 h-11 text-[11px] font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm cursor-pointer"
                  >
                    Mark Attendance
                  </Button>
                  <Button
                    onClick={() => navigate("/teacher/timetable", { state: { classId: cls.id } })}
                    className="flex-1 h-11 text-[11px] font-black bg-white hover:bg-gray-50 text-gray-705 border border-gray-200 rounded-xl shadow-sm cursor-pointer"
                  >
                    Schedule
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* No Class Teacher Assignment */}
      {classTeacherOf.length === 0 && (
        <div className="bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20 rounded-[2.5rem] border border-amber-200/50 p-8 flex items-center gap-6">
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center shadow-inner shadow-amber-200/50 shrink-0">
            <Shield size={28} className="text-amber-600" />
          </div>
          <div>
            <h4 className="text-lg font-black text-gray-900">
              No Class Teacher Assignment
            </h4>
            <p className="text-sm text-gray-500 font-medium mt-1">
              You are currently not assigned as the Class Teacher of any class.
              Contact your administrator to manage student attendance.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Desktop Attendance Summary Card */}
        <div className="hidden lg:flex bg-gradient-to-br from-white to-gray-50/50 rounded-[2.5rem] border border-gray-200/70 shadow-sm p-8 flex flex-col justify-between">
          <h4 className="text-xl font-bold text-gray-900 mb-6">
            Today's Attendance Summary
          </h4>
          <div className="flex items-center justify-around h-48 border-2 border-dashed border-gray-100 rounded-3xl relative bg-white/40">
            <div className="text-center">
              <p className="text-4xl font-black text-emerald-600">
                {attendance.present}
              </p>
              <p className="text-xs font-bold text-gray-400 uppercase mt-1">
                Present
              </p>
            </div>
            <div className="w-px h-12 bg-gray-100" />
            <div className="text-center">
              <p className="text-4xl font-black text-rose-600">
                {attendance.absent}
              </p>
              <p className="text-xs font-bold text-gray-400 uppercase mt-1">
                Absent
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Attendance Summary Card */}
        <div className="lg:hidden bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
          <h4 className="text-sm font-black text-gray-900 tracking-tight">Today's Attendance</h4>
          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pb-1 text-xs whitespace-nowrap">
            <div className="flex-1 bg-emerald-50/60 border border-emerald-100 px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-emerald-800">
              <span className="font-bold">Present</span>
              <span className="font-black text-sm">{attendance.present}</span>
            </div>
            <div className="flex-1 bg-rose-50/60 border border-rose-100 px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-rose-800">
              <span className="font-bold">Absent</span>
              <span className="font-black text-sm">{attendance.absent}</span>
            </div>
            <div className="flex-1 bg-amber-50/60 border border-amber-100 px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-amber-800">
              <span className="font-bold">Leave</span>
              <span className="font-black text-sm">0</span>
            </div>
            <div className="flex-1 bg-violet-50/60 border border-violet-100 px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-violet-800">
              <span className="font-bold">Late</span>
              <span className="font-black text-sm">0</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl lg:rounded-[2.5rem] p-4 lg:p-8 text-white shadow-xl shadow-indigo-100 flex flex-col justify-between min-h-[180px] lg:min-h-[280px] animate-in fade-in duration-300">
          <div>
            <h4 className="text-base lg:text-xl font-black mb-2 lg:mb-4 flex items-center gap-2">
              <Megaphone size={18} className="text-indigo-205" />
              {announcement.title}
            </h4>
            {announcementLoading ? (
              <div className="animate-pulse space-y-3 mb-6">
                <div className="h-4 bg-white/20 rounded-full w-2/3" />
                <div className="h-4 bg-white/20 rounded-full w-full" />
                <div className="h-4 bg-white/20 rounded-full w-5/6" />
              </div>
            ) : (
              <p className="text-indigo-100 text-xs lg:text-sm leading-relaxed mb-4 lg:mb-6 whitespace-pre-line font-medium">
                {announcement.content}
              </p>
            )}
          </div>
          {announcement.createdAt && (
            <div className="text-[9px] lg:text-[10px] text-indigo-200 font-bold flex justify-between items-center opacity-90 border-t border-white/10 pt-2 lg:pt-4">
              <span>By: {announcement.createdBy?.name || "Admin"}</span>
              <span>
                {new Date(announcement.createdAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl lg:rounded-[2.5rem] p-4 lg:p-8 text-white shadow-xl flex flex-col justify-between min-h-[160px] lg:min-h-[280px] animate-in fade-in duration-300">
          <div>
            <h4 className="text-base lg:text-xl font-bold mb-2 lg:mb-4">Class Overview</h4>
            <p className="text-gray-305 text-xs lg:text-sm leading-relaxed mb-4 lg:mb-6">
              You are currently handling students across multiple sessions.
              Ensure attendance is marked daily.
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate("/teacher/timetable")}
            className="bg-white/10 text-white border-none hover:bg-white/20 w-full rounded-xl lg:rounded-2xl py-2.5 lg:py-3 text-[10px] lg:text-xs font-black tracking-wider uppercase transition-all duration-300 mt-auto"
          >
            View My Schedule
          </Button>
        </div>
      </div>

      {/* Assigned Classes Cards Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="text-xl font-black text-gray-900 tracking-tight">
            My Assigned Classes
          </h4>
          <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3.5 py-1.5 rounded-full border border-gray-100/50">
            {assignedClasses.length} Active Assignments
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {assignedClasses.map((cls) => {
            const isClassTeacherOfThis = classTeacherOf.some(ct => ct.id.toString() === cls.id.toString());
            return (
              <div
                key={cls.id}
                className="bg-gradient-to-br from-white via-indigo-50/5 to-indigo-50/15 p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-gray-200/60 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 relative group flex flex-col justify-between min-h-[150px] md:min-h-[200px]"
              >
                <div>
                  <span className={cn(
                    "text-[9px] md:text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full",
                    isClassTeacherOfThis
                      ? "text-indigo-700 bg-indigo-100/70"
                      : "text-gray-500 bg-gray-100/70"
                  )}>
                    {isClassTeacherOfThis ? "Class Teacher" : "Subject Teacher"}
                  </span>
                  <h4 className="text-xl md:text-3xl font-black text-gray-900 tracking-tight mt-2 md:mt-4 uppercase">
                    Class {cls.name}
                  </h4>
                  <p className="text-gray-400 text-xs font-bold mt-1 md:mt-2">
                    Enrolled Students:{" "}
                    <span className="text-gray-800 font-extrabold">
                      {cls.studentCount}
                    </span>
                  </p>
                </div>

                <div className="flex gap-2 mt-4 md:mt-6 border-t border-gray-100 pt-3 md:pt-4">
                  {isClassTeacherOfThis && (
                    <Button
                      onClick={() =>
                        navigate("/attendance", { state: { classId: cls.id } })
                      }
                      className="flex-1 rounded-xl py-2 h-10 text-[10px] md:text-[11px] font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      Mark Attendance
                    </Button>
                  )}
                  <Button
                    onClick={() =>
                      navigate("/teacher/timetable", {
                        state: { classId: cls.id },
                      })
                    }
                    className={cn(
                      "rounded-xl py-2 h-10 text-[10px] md:text-[11px] font-black bg-white hover:bg-gray-50 text-gray-705 border border-gray-205 shadow-sm active:scale-95 transition-all cursor-pointer",
                      isClassTeacherOfThis ? "flex-1" : "w-full"
                    )}
                  >
                    View Schedule
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();

  if (!user) return null;

  return user.role === "admin" ? <AdminDashboard /> : <TeacherDashboard />;
};

// ──────────────────────────────────────────────────────────────────────
// Helper Components for Live Attendance Analytics
// ──────────────────────────────────────────────────────────────────────

const CircularProgress = ({ percentage, colorClass, size = 52, strokeWidth = 5 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          className="text-gray-100"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={cn("transition-all duration-1000 ease-out", colorClass)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <span className="absolute text-[10px] font-black text-gray-900">
        {Math.round(percentage)}%
      </span>
    </div>
  );
};

const getCircularColor = (pct) => {
  if (pct >= 95) return "text-emerald-500";
  if (pct >= 90) return "text-amber-500";
  return "text-rose-500";
};

const getAttendanceBgClass = (pct) => {
  if (pct >= 95) return "bg-emerald-50 text-emerald-700 border border-emerald-100";
  if (pct >= 90) return "bg-amber-50 text-amber-700 border border-amber-100";
  return "bg-rose-50 text-rose-700 border border-rose-100";
};

const AnalyticsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="bg-white border border-gray-150 p-6 rounded-[2rem] h-[160px] flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="space-y-2 w-2/3">
            <div className="h-4 bg-gray-250 rounded-full w-1/2" />
            <div className="h-6 bg-gray-255 rounded-full w-3/4" />
          </div>
          <div className="w-12 h-12 rounded-full bg-gray-200" />
        </div>
        <div className="h-4 bg-gray-100 rounded-full w-5/6 mt-4" />
      </div>
    ))}
  </div>
);

const AnalyticsError = ({ message, onRetry }) => (
  <div className="bg-rose-50 border border-rose-100 p-6 rounded-[2rem] text-center space-y-3">
    <p className="text-sm font-semibold text-rose-800">
      Error loading live attendance analytics: {message}
    </p>
    <button
      onClick={onRetry}
      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
    >
      Retry Connection
    </button>
  </div>
);

export default Dashboard;
