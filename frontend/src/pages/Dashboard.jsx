import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserSquare2,
  BookOpen,
  CreditCard,
  Plus,
  ArrowUpRight,
  Search,
  Megaphone,
  Shield,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  GraduationCap,
  Calendar,
  Sparkles,
  ChevronRight,
  Coins,
  Send,
  FileSpreadsheet,
  BarChart3,
} from "lucide-react";
import {
  AppPage,
  AppCard,
  AppStatCard,
  AppChartCard,
  AppButton,
  AppBadge,
  AppStatusPill,
  AppProgress,
  AppTable,
  AppModal,
  AppSkeleton,
  AppEmptyState,
  AppErrorState,
  AppSection,
  AppLoading,
} from "../components/ui";
import { cn } from "../utils/cn";
import { formatToINR } from "../utils/format";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

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
  const [isAbsentStudentsModalOpen, setIsAbsentStudentsModalOpen] =
    useState(false);
  const [isAbsentTeachersModalOpen, setIsAbsentTeachersModalOpen] =
    useState(false);

  const [pendingStudents, setPendingStudents] = useState([]);
  const [isPendingStudentsModalOpen, setIsPendingStudentsModalOpen] =
    useState(false);

  const [financialData, setFinancialData] = useState([]);
  const [financialLoading, setFinancialLoading] = useState(true);
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState(null);

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

  // Time & Greeting
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good Morning"
      : currentHour < 17
        ? "Good Afternoon"
        : "Good Evening";

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const fetchAttendanceAnalytics = async () => {
    setAttendanceLoading(true);
    setAttendanceErrorState(null);
    try {
      const res = await api.get("/admin/attendance-analytics");
      if (res?.data?.success && res?.data?.data) {
        setAttendanceAnalytics(res.data.data);
      } else {
        setAttendanceErrorState("Failed to fetch analytics data");
      }
    } catch (error) {
      console.error("Error fetching attendance analytics:", error);
      setAttendanceErrorState(
        error?.response?.data?.message || "Failed to load real-time analytics",
      );
    } finally {
      setAttendanceLoading(false);
    }
  };

  const fetchAnnouncement = async () => {
    setAnnouncementLoading(true);
    try {
      const res = await api.get("/holidays/upcoming");
      if (res?.data?.success && res?.data?.data) {
        setAnnouncement(res.data.data);
      } else {
        setAnnouncement({
          title: "No Upcoming Holidays",
          content: "There are currently no upcoming holidays scheduled.",
          createdBy: { name: "System" },
        });
      }
    } catch (error) {
      console.error("Fetch upcoming holiday error:", error);
      setAnnouncement({
        title: "No Upcoming Holidays",
        content: "There are currently no upcoming holidays scheduled.",
        createdBy: { name: "System" },
      });
    } finally {
      setAnnouncementLoading(false);
    }
  };

  const fetchPendingStudents = async () => {
    try {
      const res = await api.get("/fees/pending-students");
      if (res?.data?.success && Array.isArray(res?.data?.data)) {
        setPendingStudents(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching pending students:", error);
    }
  };

  const [extendedAbsenceData, setExtendedAbsenceData] = useState(null);
  const [isExtendedAbsenceModalOpen, setIsExtendedAbsenceModalOpen] =
    useState(false);

  const fetchFinancialSummary = async () => {
    setFinancialLoading(true);
    try {
      const res = await api.get("/fees/monthly-summary");
      if (res?.data?.success && res?.data?.data?.monthlyData) {
        setFinancialData(res.data.data.monthlyData);
      }
    } catch (error) {
      console.error("Error fetching monthly summary:", error);
    } finally {
      setFinancialLoading(false);
    }
  };

  const fetchStats = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await api.get(`/admin/stats?t=${Date.now()}`);
      const data = res?.data?.data || {};

      if (data.extendedAbsenceAlerts) {
        setExtendedAbsenceData(data.extendedAbsenceAlerts);
      }

      const totalStudents = data.totalStudents ?? 0;
      const totalTeachers = data.totalTeachers ?? 0;
      const totalClasses = data.totalClasses ?? 0;
      const todayColl = data.todayCollection ?? 0;
      const txCount = data.todayTransactionCount ?? 0;

      setStats([
        {
          label: "Total Students",
          value: totalStudents.toString(),
          icon: Users,
          color: "indigo",
          change: "Live",
          route: "/students",
          hint: "View Student Directory",
        },
        {
          label: "Total Teachers",
          value: totalTeachers.toString(),
          icon: UserSquare2,
          color: "emerald",
          change: "Live",
          route: "/teachers",
          hint: "View Staff List",
        },
        {
          label: "Total Classes",
          value: totalClasses.toString(),
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

  useEffect(() => {
    fetchStats();
    fetchAttendanceAnalytics();
    fetchAnnouncement();
    fetchPendingStudents();
    fetchFinancialSummary();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchStats(true);
        fetchAttendanceAnalytics();
      }
    }, 30000);

    const handleLiveUpdate = () => {
      fetchStats(true);
      fetchAttendanceAnalytics();
    };

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
        fetchAttendanceAnalytics();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("fee-payment-completed", handleLiveUpdate);
      window.removeEventListener("focus", handleLiveUpdate);
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
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
      if (res?.data?.success && res?.data?.data) {
        setAnnouncement(res.data.data);
        setIsAnnouncementModalOpen(false);
        if (addToast) addToast("Announcement posted successfully!", "success");
      }
    } catch (error) {
      console.error("Error posting announcement:", error);
      const msg =
        error?.response?.data?.message || "Failed to post announcement";
      if (addToast) addToast(msg, "error");
    } finally {
      setIsSubmittingAnnouncement(false);
    }
  };

  const quickActionTiles = [
    { label: "Collect Fee", icon: CreditCard, route: "/fees" },
    { label: "Add Student", icon: Plus, route: "/students/new" },
    { label: "Attendance", icon: Calendar, route: "/attendance" },
    { label: "Homework", icon: BookOpen, route: "/admin/homework" },
    { label: "Reports", icon: BarChart3, route: "/reports/fees" },
    { label: "Students List", icon: Users, route: "/students" },
  ];

  return (
    <AppPage className="animate-in fade-in duration-300 space-y-6">
      {/* ─────────────────────────────────────────────────────────────────
          SECTION 1 — SMART WELCOME COMMAND CENTER HEADER
      ───────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-800">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <AppBadge
                variant="primary"
                className="bg-indigo-500/20 text-indigo-200 border-indigo-500/30"
              >
                <Sparkles size={12} className="mr-1 text-amber-400" /> 2026 ERP
                Command Center
              </AppBadge>
              <span className="text-xs text-gray-400 font-semibold">
                • {formattedDate}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              {greeting},{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400">
                {user?.name || "Administrator"}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 font-medium max-w-2xl">
              Welcome back to Little Flower School ERP. Here is your real-time
              performance summary and campus command metrics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <AppButton
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              loading={loading || attendanceLoading}
              onClick={() => {
                fetchStats();
                fetchAttendanceAnalytics();
              }}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              Sync
            </AppButton>
            <AppButton
              variant="primary"
              size="sm"
              icon={CreditCard}
              onClick={() => navigate("/fees")}
            >
              Collect Fee
            </AppButton>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION 2 — KPI STATS CARDS GRID (4 CARDS)
      ───────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, idx) => (
          <AppStatCard
            key={idx}
            title={stat.label}
            value={stat.value}
            icon={stat.icon}
            iconColor={stat.color}
            badgeText={stat.change}
            trendLabel={stat.subtitle || stat.hint}
            loading={loading}
            onClick={() => navigate(stat.route)}
            className="cursor-pointer hover-lift"
          />
        ))}
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          PROMINENT EXTENDED ABSENCE EARLY WARNING BANNER
      ───────────────────────────────────────────────────────────────── */}
      <div 
        onClick={() => setIsExtendedAbsenceModalOpen(true)}
        className={cn(
          "cursor-pointer rounded-2xl p-3.5 sm:p-5 border transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4",
          (extendedAbsenceData?.totalAlertCount || 0) > 0
            ? "bg-amber-50 border-amber-300 hover:bg-amber-100/80"
            : "bg-emerald-50 border-emerald-200 hover:bg-emerald-100/60"
        )}
      >
        <div className="flex items-start sm:items-center gap-3">
          <div className={cn(
            "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-black shrink-0 text-base sm:text-lg shadow-2xs mt-0.5 sm:mt-0",
            (extendedAbsenceData?.totalAlertCount || 0) > 0
              ? "bg-amber-500 text-white"
              : "bg-emerald-600 text-white"
          )}>
            {(extendedAbsenceData?.totalAlertCount || 0) > 0 ? "⚠" : "✓"}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-tight text-gray-900 leading-tight">
                Extended Absence Warning System (&gt;7 Working Days)
              </span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0",
                (extendedAbsenceData?.totalAlertCount || 0) > 0
                  ? "bg-amber-200 text-amber-900 border border-amber-300"
                  : "bg-emerald-200 text-emerald-900 border border-emerald-300"
              )}>
                {(extendedAbsenceData?.totalAlertCount || 0) > 0
                  ? `${extendedAbsenceData.totalAlertCount} Student Alert`
                  : "All Clear"}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs font-semibold text-gray-700 leading-normal">
              {(extendedAbsenceData?.totalAlertCount || 0) > 0
                ? `${extendedAbsenceData.totalAlertCount} student(s) absent for 8+ working days. (Critical: ${extendedAbsenceData.criticalCount}, Warning: ${extendedAbsenceData.warningCount})`
                : "No active student extended absence warnings detected. All students are within normal attendance."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-200/50">
          <AppButton
            size="xs"
            className={cn(
              "w-full sm:w-auto text-xs py-2 sm:py-1.5 font-bold",
              (extendedAbsenceData?.totalAlertCount || 0) > 0
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-emerald-700 hover:bg-emerald-800 text-white"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setIsExtendedAbsenceModalOpen(true);
            }}
          >
            View Absence Report →
          </AppButton>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION 3 — LIVE ATTENDANCE COMMAND CENTER
      ───────────────────────────────────────────────────────────────── */}
      <AppSection
        title="Today's Live Attendance Analytics"
        subtitle="Real-time campus calculations across students, teachers, and pending class submissions."
        action={
          <AppButton
            variant="ghost"
            size="xs"
            icon={RefreshCw}
            loading={attendanceLoading}
            onClick={fetchAttendanceAnalytics}
          >
            Sync Live Data
          </AppButton>
        }
      >
        {attendanceLoading && !attendanceAnalytics ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AppSkeleton count={3} className="h-40 rounded-2xl" />
          </div>
        ) : attendanceErrorState ? (
          <AppErrorState
            title="Attendance Analytics Unavailable"
            message={attendanceErrorState}
            onRetry={fetchAttendanceAnalytics}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Student Attendance Card */}
            <AppCard
              hoverable
              onClick={() => navigate("/reports/attendance")}
              className="cursor-pointer space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block">
                    Student Attendance
                  </span>
                  <h3 className="text-2xl font-black text-gray-900 mt-1">
                    {attendanceAnalytics?.studentPresent || 0} Present
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAbsentStudentsModalOpen(true);
                      }}
                      className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px] rounded-lg hover:bg-rose-100 transition-colors"
                    >
                      Absent: {attendanceAnalytics?.studentAbsent || 0}
                    </button>
                    <span className="text-xs text-gray-400 font-semibold">
                      Total: {attendanceAnalytics?.totalStudents || 0}
                    </span>
                  </div>
                </div>

                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center font-extrabold text-emerald-700 text-sm shadow-2xs">
                  {Math.round(
                    attendanceAnalytics?.studentAttendancePercentage || 0,
                  )}
                  %
                </div>
              </div>

              <AppProgress
                value={attendanceAnalytics?.studentAttendancePercentage || 0}
                color={
                  (attendanceAnalytics?.studentAttendancePercentage || 0) >= 90
                    ? "emerald"
                    : "amber"
                }
                showValue={false}
              />

              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                <AppStatusPill
                  status={
                    (attendanceAnalytics?.studentAttendancePercentage || 0) >=
                    95
                      ? "success"
                      : "warning"
                  }
                  label={
                    (attendanceAnalytics?.studentAttendancePercentage || 0) >=
                    95
                      ? "Excellent"
                      : "Needs Follow-up"
                  }
                  size="sm"
                />
                <span 
                  className="text-indigo-600 font-bold hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAbsentStudentsModalOpen(true);
                  }}
                >
                  View Report →
                </span>
              </div>
            </AppCard>

            {/* Teacher Attendance Card */}
            <AppCard
              hoverable
              onClick={() => navigate("/admin/staff/attendance-history")}
              className="cursor-pointer space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block">
                    Teacher Attendance
                  </span>
                  <h3 className="text-2xl font-black text-gray-900 mt-1">
                    {attendanceAnalytics?.teacherPresent || 0} Present
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAbsentTeachersModalOpen(true);
                      }}
                      className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px] rounded-lg hover:bg-rose-100 transition-colors"
                    >
                      Absent: {attendanceAnalytics?.teacherAbsent || 0}
                    </button>
                    <span className="text-xs text-gray-400 font-semibold">
                      Total: {attendanceAnalytics?.totalTeachers || 0}
                    </span>
                  </div>
                </div>

                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-extrabold text-indigo-700 text-sm shadow-2xs">
                  {Math.round(
                    attendanceAnalytics?.teacherAttendancePercentage || 0,
                  )}
                  %
                </div>
              </div>

              <AppProgress
                value={attendanceAnalytics?.teacherAttendancePercentage || 0}
                color="indigo"
                showValue={false}
              />

              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                <AppStatusPill
                  status="active"
                  label="Staff On Duty"
                  size="sm"
                />
                <span 
                  className="text-indigo-600 font-bold hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAbsentTeachersModalOpen(true);
                  }}
                >
                  Staff Absent →
                </span>
              </div>
            </AppCard>

            {/* Attendance Completion Status */}
            <AppCard
              hoverable
              onClick={() => setIsPendingModalOpen(true)}
              className="cursor-pointer space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block">
                    Class Submissions
                  </span>
                  <h3 className="text-2xl font-black text-gray-900 mt-1">
                    {attendanceAnalytics?.attendanceCompleted || 0} /{" "}
                    {attendanceAnalytics?.totalClasses || 0}
                  </h3>
                  <p className="text-xs text-gray-500 font-semibold mt-1">
                    Pending:{" "}
                    <span className="text-amber-600 font-bold">
                      {attendanceAnalytics?.attendancePending || 0} classes
                    </span>
                  </p>
                </div>

                <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center font-extrabold text-amber-700 text-sm shadow-2xs">
                  {Math.round(attendanceAnalytics?.completionPercentage || 0)}%
                </div>
              </div>

              <AppProgress
                value={attendanceAnalytics?.completionPercentage || 0}
                color="amber"
                showValue={false}
              />

              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                <AppStatusPill
                  status={
                    attendanceAnalytics?.attendancePending === 0
                      ? "success"
                      : "pending"
                  }
                  label={
                    attendanceAnalytics?.attendancePending === 0
                      ? "100% Submitted"
                      : "Pending Actions"
                  }
                  size="sm"
                />
                <span 
                  className="text-indigo-600 font-bold hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPendingModalOpen(true);
                  }}
                >
                  View Pending →
                </span>
              </div>
            </AppCard>

            {/* Extended Absence Alert Card */}
            {extendedAbsenceData && (
              <AppCard
                hoverable
                onClick={() => setIsExtendedAbsenceModalOpen(true)}
                className="cursor-pointer space-y-4 border-amber-200 bg-amber-50/40"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest block flex items-center gap-1">
                      ⚠ Extended Absence Alert
                    </span>
                    <h3 className="text-2xl font-black text-gray-900 mt-1">
                      {extendedAbsenceData?.totalAlertCount || 0} Students
                    </h3>
                    <p className="text-xs text-gray-600 font-semibold mt-1">
                      {extendedAbsenceData?.criticalCount || 0} Critical (10+ Days) • {extendedAbsenceData?.warningCount || 0} Warning (8-9 Days)
                    </p>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center font-black text-amber-800 text-sm shadow-2xs">
                    {extendedAbsenceData?.totalAlertCount || 0}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-amber-100">
                  {(extendedAbsenceData?.students || []).slice(0, 2).map((st, i) => (
                    <div key={i} className="flex items-center justify-between text-xs font-medium">
                      <span className="text-gray-900 font-bold truncate max-w-[150px]">{st.studentName} ({st.className})</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-extrabold",
                        st.severity === "critical" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                      )}>
                        {st.absenceStreak} Days Absent
                      </span>
                    </div>
                  ))}
                  {(!extendedAbsenceData?.students || extendedAbsenceData.students.length === 0) && (
                    <div className="text-xs text-gray-500 font-medium py-1">
                      ✓ No extended absence warnings
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-amber-100 text-xs">
                  <AppStatusPill
                    status="warning"
                    label="Requires Attention"
                    size="sm"
                  />
                  <span className="text-amber-800 font-bold hover:underline">
                    View All →
                  </span>
                </div>
              </AppCard>
            )}
          </div>
        )}
      </AppSection>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION 4 & 5 — QUICK ACTIONS GRID & CHARTS ROW
      ───────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Quick Action Matrix & Financial Analytics Chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions Matrix */}
          <AppSection
            title="Quick Action Matrix"
            subtitle="Direct shortcuts for daily campus operations."
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {quickActionTiles.map((tile, i) => {
                const Icon = tile.icon;
                return (
                  <div
                    key={i}
                    onClick={() => navigate(tile.route)}
                    className="p-4 bg-white border border-gray-200/90 rounded-2xl shadow-2xs hover:shadow-md hover:border-indigo-300 hover-lift transition-all cursor-pointer flex items-center gap-3 select-none"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                      <Icon size={20} />
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                        {tile.label}
                      </h4>
                      <p className="text-[10px] text-gray-400 font-semibold truncate">
                        Open console →
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </AppSection>

          {/* Monthly Collection Trend Chart */}
          <AppChartCard
            title="Monthly Fee Collection Analytics"
            subtitle="Overview of total fee revenue generated across current session months."
            loading={financialLoading}
            empty={financialData.length === 0}
            action={
              <AppButton
                size="xs"
                variant="secondary"
                onClick={() => navigate("/reports/fees")}
              >
                Full Report
              </AppButton>
            }
          >
            <div className="space-y-4">
              <div className="h-56 flex items-end justify-between gap-2 pt-6 px-2 border-b border-gray-100">
                {financialData.map((item, idx) => {
                  const maxAmt = Math.max(
                    ...financialData.map((d) => d.totalCollected || 1),
                    1,
                  );
                  const heightPct = Math.max(
                    10,
                    Math.min(100, (item.totalCollected / maxAmt) * 100),
                  );
                  const isHovered = hoveredMonthIdx === idx;

                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredMonthIdx(idx)}
                      onMouseLeave={() => setHoveredMonthIdx(null)}
                      className="flex-1 flex flex-col items-center gap-2 group cursor-pointer relative"
                    >
                      {/* Tooltip Hover */}
                      {isHovered && (
                        <div className="absolute -top-10 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg whitespace-nowrap z-20 animate-in fade-in duration-150">
                          {item.month}: {formatToINR(item.totalCollected)}
                        </div>
                      )}

                      <div className="w-full max-w-[36px] bg-gray-100 rounded-t-xl overflow-hidden h-40 flex items-end">
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={cn(
                            "w-full rounded-t-xl transition-all duration-300",
                            isHovered
                              ? "bg-indigo-600 shadow-md"
                              : "bg-gradient-to-t from-indigo-500 to-indigo-600 opacity-85 group-hover:opacity-100",
                          )}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 truncate max-w-full">
                        {item.month
                          ? item.month.substring(0, 3)
                          : `M${idx + 1}`}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 font-semibold px-1">
                <span>Monthly Overview</span>
                <span className="text-indigo-600 font-bold">
                  Total Months Tracked: {financialData.length}
                </span>
              </div>
            </div>
          </AppChartCard>
        </div>

        {/* Right 1 Col: Hero Announcement Card & Pending Fees Shortcut */}
        <div className="space-y-6">
          {/* Hero Announcement Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-3xl p-6 shadow-xl space-y-4 relative overflow-hidden flex flex-col justify-between min-h-[260px]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-white/15 px-3 py-1 rounded-full text-indigo-100">
                  <Megaphone size={14} /> School Announcement
                </span>
                <span className="text-[10px] font-semibold text-indigo-200">
                  {announcement.createdAt
                    ? new Date(announcement.createdAt).toLocaleDateString()
                    : "Active"}
                </span>
              </div>

              {announcementLoading ? (
                <AppSkeleton count={3} className="bg-white/20 h-4 rounded-lg" />
              ) : (
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-white leading-tight">
                    {announcement.title}
                  </h3>
                  <p className="text-xs text-indigo-100 font-medium leading-relaxed line-clamp-4 whitespace-pre-line">
                    {announcement.content}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/15 flex items-center justify-between">
              <span className="text-[11px] text-indigo-200 font-medium">
                By: {announcement.createdBy?.name || "Admin"}
              </span>

              <AppButton
                size="xs"
                variant="secondary"
                onClick={() => {
                  setAnnouncementForm({
                    title:
                      announcement.title === "School Announcement"
                        ? ""
                        : announcement.title,
                    content:
                      announcement.content.startsWith("Welcome") ||
                      announcement.content.startsWith("Loading")
                        ? ""
                        : announcement.content,
                  });
                  setAnnouncementError("");
                  setIsAnnouncementModalOpen(true);
                }}
                className="bg-white text-indigo-900 font-extrabold border-none hover:bg-gray-100"
              >
                Post Update
              </AppButton>
            </div>
          </div>

          {/* Pending Fees Quick Card */}
          <AppCard className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Coins size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-gray-900">
                    Pending Dues
                  </h4>
                  <p className="text-[11px] text-gray-400 font-semibold">
                    {pendingStudents.length} students with balance
                  </p>
                </div>
              </div>

              <AppButton
                size="xs"
                variant="outline"
                onClick={() => setIsPendingStudentsModalOpen(true)}
              >
                View All
              </AppButton>
            </div>

            <div className="space-y-2">
              {pendingStudents.slice(0, 3).map((std) => (
                <div
                  key={std.studentId}
                  onClick={() =>
                    navigate("/fees", {
                      state: { searchStudentId: std.studentId },
                    })
                  }
                  className="p-2.5 bg-gray-50 hover:bg-indigo-50/60 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-colors"
                >
                  <div className="truncate">
                    <p className="font-bold text-gray-900 truncate">
                      {std.fullName}
                    </p>
                    <p className="text-[10px] text-gray-400 font-semibold">
                      Class: {std.className}
                    </p>
                  </div>
                  <span className="font-extrabold text-rose-600 shrink-0">
                    {formatToINR(std.pendingAmount)}
                  </span>
                </div>
              ))}
            </div>
          </AppCard>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          MODALS SECTION (Intact logic, design system styling)
      ───────────────────────────────────────────────────────────────── */}

      {/* Post Announcement Modal */}
      <AppModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        title="Post School Announcement"
        subtitle="Broadcast an official notification to all campus dashboards."
        footer={
          <>
            <AppButton
              variant="secondary"
              onClick={() => setIsAnnouncementModalOpen(false)}
            >
              Cancel
            </AppButton>
            <AppButton
              onClick={handleAnnouncementSubmit}
              loading={isSubmittingAnnouncement}
            >
              Publish Announcement
            </AppButton>
          </>
        }
      >
        <form onSubmit={handleAnnouncementSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider ml-0.5">
              Announcement Title
            </label>
            <input
              type="text"
              placeholder="e.g. Mid-term Exam Schedule Released"
              value={announcementForm.title}
              onChange={(e) =>
                setAnnouncementForm({
                  ...announcementForm,
                  title: e.target.value,
                })
              }
              className="w-full bg-white border border-gray-200/90 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-indigo-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider ml-0.5">
              Content *
            </label>
            <textarea
              rows={4}
              placeholder="Type announcement details..."
              value={announcementForm.content}
              onChange={(e) =>
                setAnnouncementForm({
                  ...announcementForm,
                  content: e.target.value,
                })
              }
              className="w-full bg-white border border-gray-200/90 rounded-xl p-3 text-sm font-medium outline-none focus:border-indigo-600"
            />
            {announcementError && (
              <p className="text-xs text-rose-500 font-semibold">
                {announcementError}
              </p>
            )}
          </div>
        </form>
      </AppModal>

      {/* Pending Students Modal */}
      <AppModal
        isOpen={isPendingStudentsModalOpen}
        onClose={() => setIsPendingStudentsModalOpen(false)}
        title="Pending Fee Students List"
        subtitle="Initiate fee collection directly for students with unpaid balances."
        size="lg"
      >
        <AppTable
          columns={[
            { key: "fullName", header: "Student Name", sortable: true },
            { key: "className", header: "Class", sortable: true },
            {
              key: "pendingAmount",
              header: "Pending Amount",
              align: "right",
              render: (val) => (
                <span className="font-extrabold text-rose-600">
                  {formatToINR(val)}
                </span>
              ),
            },
            {
              key: "actions",
              header: "Action",
              align: "center",
              render: (_, row) => (
                <AppButton
                  size="xs"
                  onClick={() => {
                    setIsPendingStudentsModalOpen(false);
                    navigate("/fees", {
                      state: { searchStudentId: row.studentId },
                    });
                  }}
                >
                  Collect
                </AppButton>
              ),
            },
          ]}
          data={pendingStudents}
          rowKey="studentId"
        />
      </AppModal>

      {/* Pending Attendance Modal */}
      <AppModal
        isOpen={isPendingModalOpen}
        onClose={() => setIsPendingModalOpen(false)}
        title="Pending Class Attendance Submissions"
        subtitle="Classes that have not marked daily attendance yet."
        size="lg"
      >
        <AppTable
          columns={[
            { key: "className", header: "Class Name", sortable: true },
            { key: "teacherName", header: "Class Teacher", sortable: true },
            {
              key: "status",
              header: "Status",
              render: (val) => (
                <AppStatusPill status="pending" label={val} size="sm" />
              ),
            },
          ]}
          data={attendanceAnalytics?.pendingClassesList || []}
          rowKey="classId"
          emptyTitle="All Classes Submitted"
          emptyDescription="100% of classes have marked attendance today!"
        />
      </AppModal>

      {/* Absent Students Modal */}
      <AppModal
        isOpen={isAbsentStudentsModalOpen}
        onClose={() => setIsAbsentStudentsModalOpen(false)}
        title="Students Marked Absent Today"
        subtitle="Contact guardians or review attendance remarks."
        size="lg"
      >
        <AppTable
          columns={[
            { key: "fullName", header: "Student Name", sortable: true },
            {
              key: "className",
              header: "Class & Sec",
              render: (_, row) => `${row.className} - ${row.section}`,
            },
            { key: "phone", header: "Contact Number" },
            {
              key: "remarks",
              header: "Remarks",
              render: (val) => (
                <AppBadge
                  variant={val !== "No remarks" ? "warning" : "neutral"}
                >
                  {val}
                </AppBadge>
              ),
            },
          ]}
          data={attendanceAnalytics?.absentStudentsList || []}
          rowKey="studentId"
          emptyTitle="No Absent Students"
          emptyDescription="100% Student Attendance recorded today!"
        />
      </AppModal>

      {/* Absent Teachers Modal */}
      <AppModal
        isOpen={isAbsentTeachersModalOpen}
        onClose={() => setIsAbsentTeachersModalOpen(false)}
        title="Staff/Teachers Marked Absent Today"
        size="lg"
      >
        <AppTable
          columns={[
            { key: "fullName", header: "Teacher Name", sortable: true },
            { key: "subject", header: "Subject/Dept" },
            { key: "phone", header: "Contact Number" },
            { key: "remarks", header: "Remarks" },
          ]}
          data={attendanceAnalytics?.absentTeachersList || []}
          rowKey="teacherId"
          emptyTitle="No Absent Staff"
          emptyDescription="100% Teacher Attendance recorded today!"
        />
      </AppModal>

      {/* Extended Absence Detailed Modal */}
      <AppModal
        isOpen={isExtendedAbsenceModalOpen}
        onClose={() => setIsExtendedAbsenceModalOpen(false)}
        title="⚠ Extended Student Absence Warning (>7 Consecutive Working Days)"
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold flex items-center justify-between">
            <span>Students marked absent for 8+ consecutive working days (excluding Sundays and holidays).</span>
            <span className="font-extrabold">{extendedAbsenceData?.totalAlertCount || 0} Affected Students</span>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {(extendedAbsenceData?.students || []).map((st, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-white border border-gray-100 rounded-xl flex items-center justify-between shadow-2xs hover:bg-gray-50 transition-colors"
              >
                <div>
                  <div className="font-bold text-gray-900 text-sm">{st.studentName}</div>
                  <div className="text-xs text-gray-500 font-medium">
                    Class: <span className="font-semibold text-gray-700">{st.className}</span> • Roll No: <span className="font-semibold text-gray-700">{st.rollNo}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    Last Present Date: <span className="font-semibold text-gray-600">{st.lastPresentDate}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider block",
                    st.severity === "critical"
                      ? "bg-rose-100 text-rose-700 border border-rose-200"
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                  )}>
                    {st.absenceStreak} Days Absent
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase mt-1 block">
                    {st.severity} severity
                  </span>
                </div>
              </div>
            ))}

            {(!extendedAbsenceData?.students || extendedAbsenceData.students.length === 0) && (
              <div className="p-8 text-center text-gray-500 font-medium">
                No students currently have extended consecutive absences.
              </div>
            )}
          </div>
        </div>
      </AppModal>
    </AppPage>
  );
};

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState([
    { label: "My Classes", value: "0", icon: BookOpen, color: "indigo" },
    { label: "My Students", value: "0", icon: Users, color: "emerald" },
    {
      label: "Classes Assigned",
      value: "0",
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
  const [teacherExtendedAbsenceData, setTeacherExtendedAbsenceData] = useState(null);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);

  const [announcement, setAnnouncement] = useState({
    title: "School Announcement",
    content: "Loading announcement...",
  });
  const [announcementLoading, setAnnouncementLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      setAnnouncementLoading(true);
      try {
        const res = await api.get("/holidays/upcoming");
        if (res?.data?.success && res?.data?.data) {
          setAnnouncement(res.data.data);
        } else {
          setAnnouncement({
            title: "No Upcoming Holidays",
            content: "There are currently no upcoming holidays scheduled.",
            createdBy: { name: "System" },
          });
        }
      } catch (error) {
        console.error("Fetch upcoming holiday error:", error);
        setAnnouncement({
          title: "No Upcoming Holidays",
          content: "There are currently no upcoming holidays scheduled.",
          createdBy: { name: "System" },
        });
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
        const data = res?.data?.data || {};

        if (data.extendedAbsenceAlerts) {
          setTeacherExtendedAbsenceData(data.extendedAbsenceAlerts);
        }

        const totalClasses = data.totalClasses ?? 0;
        const totalStudents = data.totalStudents ?? 0;
        const assigned = data.assignedClasses || [];
        const att = data.attendanceSummary || {
          present: 0,
          absent: 0,
          totalMarked: 0,
        };

        setStats([
          {
            label: "My Classes",
            value: totalClasses.toString(),
            icon: BookOpen,
            color: "indigo",
          },
          {
            label: "My Students",
            value: totalStudents.toString(),
            icon: Users,
            color: "emerald",
          },
          {
            label: "Classes Assigned",
            value: assigned.length.toString(),
            icon: ArrowUpRight,
            color: "amber",
          },
        ]);

        setAttendance({
          present: att.present || 0,
          absent: att.absent || 0,
          total: att.totalMarked || 0,
        });

        setAssignedClasses(assigned);
        setClassTeacherOf(data.classTeacherOf || []);
      } catch (error) {
        console.error("Teacher Dashboard error:", error);
      }
    };

    fetchTeacherStats();
  }, []);

  return (
    <AppPage className="animate-in fade-in duration-300 space-y-6">
      {/* Teacher Welcome Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-700 space-y-2">
        <AppBadge
          variant="primary"
          className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30"
        >
          Teacher Console
        </AppBadge>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Welcome, {user?.name || "Teacher"}
        </h1>
        <p className="text-xs sm:text-sm text-indigo-200 font-medium">
          Manage your assigned classes, take student attendance, and check your
          schedule.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((st, i) => (
          <AppStatCard
            key={i}
            title={st.label}
            value={st.value}
            icon={st.icon}
            iconColor={st.color}
          />
        ))}
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          TEACHER PROMINENT EXTENDED ABSENCE EARLY WARNING BANNER
      ───────────────────────────────────────────────────────────────── */}
      <div 
        onClick={() => setIsTeacherModalOpen(true)}
        className={cn(
          "cursor-pointer rounded-2xl p-3.5 sm:p-5 border transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4",
          (teacherExtendedAbsenceData?.totalAlertCount || 0) > 0
            ? "bg-amber-50 border-amber-300 hover:bg-amber-100/80"
            : "bg-emerald-50 border-emerald-200 hover:bg-emerald-100/60"
        )}
      >
        <div className="flex items-start sm:items-center gap-3">
          <div className={cn(
            "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-black shrink-0 text-base sm:text-lg shadow-2xs mt-0.5 sm:mt-0",
            (teacherExtendedAbsenceData?.totalAlertCount || 0) > 0
              ? "bg-amber-500 text-white"
              : "bg-emerald-600 text-white"
          )}>
            {(teacherExtendedAbsenceData?.totalAlertCount || 0) > 0 ? "⚠" : "✓"}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-tight text-gray-900 leading-tight">
                Class Extended Absence Warning (&gt;7 Working Days)
              </span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0",
                (teacherExtendedAbsenceData?.totalAlertCount || 0) > 0
                  ? "bg-amber-200 text-amber-900 border border-amber-300"
                  : "bg-emerald-200 text-emerald-900 border border-emerald-300"
              )}>
                {(teacherExtendedAbsenceData?.totalAlertCount || 0) > 0
                  ? `${teacherExtendedAbsenceData.totalAlertCount} Student Alert`
                  : "All Clear"}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs font-semibold text-gray-700 leading-normal">
              {(teacherExtendedAbsenceData?.totalAlertCount || 0) > 0
                ? `${teacherExtendedAbsenceData.totalAlertCount} student(s) in your assigned classes absent for 8+ working days.`
                : "No active extended absence warnings in your assigned classes."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-200/50">
          <AppButton
            size="xs"
            className={cn(
              "w-full sm:w-auto text-xs py-2 sm:py-1.5 font-bold",
              (teacherExtendedAbsenceData?.totalAlertCount || 0) > 0
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-emerald-700 hover:bg-emerald-800 text-white"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setIsTeacherModalOpen(true);
            }}
          >
            View Absence Report →
          </AppButton>
        </div>
      </div>

      {/* Class Teacher Prominent Card */}
      {classTeacherOf.length > 0 && (
        <AppSection title="My Class (Class Teacher)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classTeacherOf.map((cls) => (
              <AppCard
                key={cls.id}
                className="space-y-4 border-2 border-indigo-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <AppBadge variant="primary">Class Teacher</AppBadge>
                    <h3 className="text-2xl font-black text-gray-900 uppercase mt-1">
                      Class {cls.name}
                    </h3>
                    <p className="text-xs text-gray-500 font-semibold mt-0.5">
                      Enrolled: {cls.studentCount} Students
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <AppStatusPill
                      status={attendance.total > 0 ? "success" : "warning"}
                      label={attendance.total > 0 ? "Marked Today" : "Pending"}
                      size="sm"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                  <AppButton
                    fullWidth
                    size="sm"
                    onClick={() =>
                      navigate("/attendance", { state: { classId: cls.id } })
                    }
                  >
                    Mark Attendance
                  </AppButton>
                  <AppButton
                    fullWidth
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      navigate("/teacher/timetable", {
                        state: { classId: cls.id },
                      })
                    }
                  >
                    Schedule
                  </AppButton>
                </div>
              </AppCard>
            ))}
          </div>
        </AppSection>
      )}

      {/* Assigned Classes */}
      <AppSection title="All Assigned Classes">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignedClasses.map((cls) => {
            const isCT = classTeacherOf.some(
              (ct) => ct.id.toString() === cls.id.toString(),
            );
            return (
              <AppCard key={cls.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <AppBadge variant={isCT ? "primary" : "neutral"}>
                    {isCT ? "Class Teacher" : "Subject Teacher"}
                  </AppBadge>
                  <span className="text-xs text-gray-400 font-bold">
                    {cls.studentCount} Students
                  </span>
                </div>

                <h4 className="text-xl font-black text-gray-900 uppercase">
                  Class {cls.name}
                </h4>

                <div className="pt-2 border-t border-gray-100">
                  <AppButton
                    size="xs"
                    variant="secondary"
                    fullWidth
                    onClick={() =>
                      navigate("/teacher/timetable", {
                        state: { classId: cls.id },
                      })
                    }
                  >
                    View Class Schedule
                  </AppButton>
                </div>
              </AppCard>
            );
          })}
        </div>
      </AppSection>

      {/* Teacher Extended Absence Detailed Modal */}
      <AppModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        title="⚠ Extended Absence Warning (>7 Working Days)"
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold flex items-center justify-between">
            <span>Students in your assigned classes marked absent for 8+ consecutive working days.</span>
            <span className="font-extrabold">{teacherExtendedAbsenceData?.totalAlertCount || 0} Affected Students</span>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {(teacherExtendedAbsenceData?.students || []).map((st, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-white border border-gray-100 rounded-xl flex items-center justify-between shadow-2xs hover:bg-gray-50 transition-colors"
              >
                <div>
                  <div className="font-bold text-gray-900 text-sm">{st.studentName}</div>
                  <div className="text-xs text-gray-500 font-medium">
                    Class: <span className="font-semibold text-gray-700">{st.className}</span> • Roll No: <span className="font-semibold text-gray-700">{st.rollNo}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    Last Present Date: <span className="font-semibold text-gray-600">{st.lastPresentDate}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider block",
                    st.severity === "critical"
                      ? "bg-rose-100 text-rose-700 border border-rose-200"
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                  )}>
                    {st.absenceStreak} Days Absent
                  </span>
                </div>
              </div>
            ))}

            {(!teacherExtendedAbsenceData?.students || teacherExtendedAbsenceData.students.length === 0) && (
              <div className="p-8 text-center text-gray-500 font-medium">
                No students currently have extended consecutive absences in your assigned classes.
              </div>
            )}
          </div>
        </div>
      </AppModal>
    </AppPage>
  );
};

const Dashboard = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <AppLoading fullScreen text="Loading Dashboard..." />;
  }

  if (!user) {
    return <AppLoading fullScreen text="Authenticating..." />;
  }

  const role = String(user?.role || user?.user?.role || "admin").toLowerCase();

  return role === "admin" ? <AdminDashboard /> : <TeacherDashboard />;
};

export default Dashboard;
