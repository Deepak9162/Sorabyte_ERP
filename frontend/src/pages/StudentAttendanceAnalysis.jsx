import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { formatDateString, extractYearMonth } from "../utils/dateUtils";
import { isDayHoliday as checkIsDayHoliday, getEffectiveAttendanceStatus } from "../utils/holidayUtils";
import {
  ArrowLeft,
  GraduationCap,
  CalendarDays,
  Target,
  FileText,
  AlertTriangle,
  BookOpen,
  CheckCircle,
  XCircle,
  Hash,
  User,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { cn } from "../utils/cn";
import api from "../services/api";
import { getHolidays } from "../services/holidayApi";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import Skeleton, {
  CardSkeleton,
  TableSkeleton,
} from "../components/ui/Skeleton";

const StudentAttendanceAnalysis = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeView, setActiveView] = useState("overview"); // overview, calendar
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    fetchAnalysis();
  }, [studentId]);

  useEffect(() => {
    const fetchYearlyHolidays = async () => {
      try {
        const data = await getHolidays({ year: selectedYear });
        setHolidays(data || []);
      } catch (err) {
        console.error("Failed to fetch holidays", err);
      }
    };
    fetchYearlyHolidays();
  }, [selectedYear]);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const response = await api.get(
        `/admin/attendance/analysis/student/${studentId}`,
      );
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching student attendance analysis:", error);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  // Build key mapping of date to attendance record for fast lookup
  const attendanceMap = useMemo(() => {
    const map = {};
    if (data && data.records) {
      data.records.forEach((record) => {
        const key = formatDateString(record.date);
        if (key) map[key] = record;
      });
    }
    return map;
  }, [data]);

  // Group records by status for the selected year using centralized holidayUtils
  const yearStats = useMemo(() => {
    let p = 0, a = 0, l = 0, t = 0, h = 0;
    
    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(selectedYear, m + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const key = `${selectedYear}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const record = attendanceMap[key];
        const isHol = checkIsDayHoliday(d, m + 1, selectedYear, "Students", holidays);
        const eff = getEffectiveAttendanceStatus(record?.status, isHol);

        if (eff === 'present') p++;
        else if (eff === 'absent') a++;
        else if (eff === 'leave') l++;
        else if (eff === 'late') t++;
        else if (eff === 'holiday') h++;
      }
    }
    return { presentCount: p, absentCount: a, leaveCount: l, lateCount: t, holidayCount: h };
  }, [attendanceMap, selectedYear, holidays]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="w-64 h-8 rounded-lg" />
        </div>
        <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-8">
          <Skeleton className="w-24 h-24 rounded-full" />
          <div className="space-y-4 flex-1">
            <Skeleton className="w-1/3 h-6" />
            <Skeleton className="w-1/4 h-4" />
            <Skeleton className="w-1/2 h-4" />
          </div>
        </div>
        <CardSkeleton count={3} />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  if (!data || !data.studentInfo) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <EmptyState
          title="Analysis Not Found"
          description="We couldn't generate the attendance analysis for this student. They might not exist or have no records."
          icon={User}
          action={
            <Button onClick={() => navigate(-1)} variant="outline">
              Go Back
            </Button>
          }
        />
      </div>
    );
  }

  const { studentInfo, subjects, overallAttendance } = data;
  const studentName = studentInfo?.fullName || studentInfo?.name || "Student";
  const rollNumber = studentInfo?.rollNumber || studentInfo?.rollNo || "-";
  const className = studentInfo?.class?.name || studentInfo?.className || "N/A";
  const overallPercentage = parseFloat(overallAttendance?.percentage || 0);
  const isCritical = overallPercentage < 75;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getMonthDaysList = (year, monthIndex) => {
    const firstDayIndex = new Date(year, monthIndex, 1).getDay(); // 0 is Sun, 6 is Sat
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  };

  const isWeekendDay = (year, monthIndex, day) => {
    const dayOfWeek = new Date(year, monthIndex, day).getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
  };

  const getTooltipText = (day, monthIndex, year, record) => {
    const dateStr = new Date(year, monthIndex, day).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    if (!record) {
      const isWeekend = new Date(year, monthIndex, day).getDay() % 6 === 0;
      const isHol = checkIsDayHoliday(day, monthIndex + 1, year, "Students", holidays);
      return `${dateStr}: ${isHol ? "Holiday" : (isWeekend ? "Weekend" : "No record")}`;
    }
    return `${dateStr} - ${record.status}${record.remarks ? ` (${record.remarks})` : ""}`;
  };

  const isDayHoliday = (day, monthIndex, year) => {
    return checkIsDayHoliday(day, monthIndex + 1, year, "Students", holidays);
  };

  const { presentCount, absentCount, leaveCount, lateCount, holidayCount } = yearStats;

  const getPercentageColor = (percentage) => {
    if (percentage >= 75)
      return "text-emerald-600 bg-emerald-50 border-emerald-100";
    if (percentage >= 60) return "text-amber-600 bg-amber-50 border-amber-100";
    return "text-rose-600 bg-rose-50 border-rose-100";
  };

  const getPercentageProgressColor = (percentage) => {
    if (percentage >= 75)
      return "bg-gradient-to-r from-emerald-400 to-emerald-500";
    if (percentage >= 60) return "bg-gradient-to-r from-amber-400 to-amber-500";
    return "bg-gradient-to-r from-rose-400 to-rose-500";
  };

  return (
    <div className="space-y-8 pb-12 max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl transition-all shadow-sm group active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-indigo-600 transition-colors" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-black text-[10px] uppercase tracking-wider rounded-lg border border-indigo-100">
                Student Profile
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-xs font-bold text-gray-500">
                Roll #{rollNumber}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mt-1">
              {studentName}
            </h1>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200/50 w-full sm:w-auto">
          <button
            onClick={() => setActiveView("overview")}
            className={cn(
              "flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer",
              activeView === "overview"
                ? "bg-white text-indigo-600 shadow-md font-black"
                : "text-gray-500 hover:text-gray-900",
            )}
          >
            <Target className="w-4 h-4" />
            Overview Analytics
          </button>
          <button
            onClick={() => setActiveView("calendar")}
            className={cn(
              "flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer",
              activeView === "calendar"
                ? "bg-white text-indigo-600 shadow-md font-black"
                : "text-gray-500 hover:text-gray-900",
            )}
          >
            <CalendarDays className="w-4 h-4" />
            Yearly Calendar
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeView === "overview" ? (
        <>
          {/* Top Banner & Quick Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Student Details Card */}
            <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-2xl group-hover:scale-150 transition-all duration-700" />
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
                    {studentName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900">
                      {studentName}
                    </h2>
                    <p className="text-xs font-bold text-gray-400 mt-0.5">
                      Class: {className}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
                  <div className="p-3 rounded-2xl bg-gray-50/70 border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Admission No
                    </span>
                    <span className="text-xs font-black text-gray-800 mt-0.5 block">
                      {studentInfo.admissionNumber || "N/A"}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-gray-50/70 border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Parent Phone
                    </span>
                    <span className="text-xs font-black text-gray-800 mt-0.5 block">
                      {studentInfo.parentPhone || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Overall Attendance Score Tile */}
            <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col justify-between lg:col-span-2 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Cumulative Attendance Score
                  </span>
                  <h3 className="text-3xl font-black text-gray-900 mt-1">
                    {overallPercentage.toFixed(1)}%
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {isCritical ? (
                    <span className="px-4 py-2 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-black rounded-xl flex items-center gap-1.5 animate-pulse">
                      <AlertTriangle className="w-4 h-4" />
                      Critical Attention Needed (&lt; 75%)
                    </span>
                  ) : (
                    <span className="px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-black rounded-xl flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      Good Attendance Standing
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="my-6">
                <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200/50">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      getPercentageProgressColor(overallPercentage),
                    )}
                    style={{ width: `${Math.min(overallPercentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-2">
                  <span>0%</span>
                  <span>75% (Minimum Standard)</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Stat Summary Metrics Grid */}
              <div className="grid grid-cols-5 gap-3 pt-4 border-t border-gray-50">
                <div className="text-center p-2 rounded-2xl bg-emerald-50/50 border border-emerald-100/60">
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 block">
                    Present
                  </span>
                  <span className="text-lg font-black text-emerald-800">
                    {presentCount}
                  </span>
                </div>
                <div className="text-center p-2 rounded-2xl bg-rose-50/50 border border-rose-100/60">
                  <span className="text-[9px] font-black uppercase tracking-wider text-rose-700 block">
                    Absent
                  </span>
                  <span className="text-lg font-black text-rose-800">
                    {absentCount}
                  </span>
                </div>
                <div className="text-center p-2 rounded-2xl bg-amber-50/50 border border-amber-100/60">
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 block">
                    Leave
                  </span>
                  <span className="text-lg font-black text-amber-800">
                    {leaveCount}
                  </span>
                </div>
                <div className="text-center p-2 rounded-2xl bg-indigo-50/50 border border-indigo-100/60">
                  <span className="text-[9px] font-black uppercase tracking-wider text-indigo-700 block">
                    Late
                  </span>
                  <span className="text-lg font-black text-indigo-800">
                    {lateCount}
                  </span>
                </div>
                <div className="text-center p-2 rounded-2xl bg-blue-50/50 border border-blue-100/60">
                  <span className="text-[9px] font-black uppercase tracking-wider text-blue-700 block">
                    Holiday
                  </span>
                  <span className="text-lg font-black text-blue-800">
                    {holidayCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Yearly Calendar Grid View */
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-100">
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Yearly Attendance Matrix ({selectedYear})
              </h3>
              <p className="text-xs text-gray-400 font-bold mt-1">
                Day-by-day presence tracker across 12 months
              </p>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
              {[selectedYear - 1, selectedYear, selectedYear + 1].map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer",
                    selectedYear === yr
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-900",
                  )}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          {/* 12 Months Heatmap Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {monthNames.map((mName, mIdx) => {
              const monthDays = getMonthDaysList(selectedYear, mIdx);
              return (
                <div
                  key={mIdx}
                  className="bg-gray-50/40 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-black text-xs text-gray-800 uppercase tracking-wider">
                      {mName}
                    </span>
                  </div>

                  {/* Day Names Header */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                      <span
                        key={i}
                        className={cn(
                          "text-[9px] font-black uppercase",
                          i === 0 ? "text-rose-400" : "text-gray-400",
                        )}
                      >
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* Days Box */}
                  <div className="grid grid-cols-7 gap-1">
                    {monthDays.map((day, dIdx) => {
                      if (!day) {
                        return <div key={`empty-${dIdx}`} className="w-full aspect-square" />;
                      }

                      const key = `${selectedYear}-${String(mIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const record = attendanceMap[key];
                      const isHol = isDayHoliday(day, mIdx, selectedYear);
                      const eff = getEffectiveAttendanceStatus(record?.status, isHol);

                      let bgClass = "bg-gray-100/60 border-gray-200/50 text-gray-400";
                      if (eff === "present") bgClass = "bg-emerald-500 text-white font-black shadow-sm";
                      else if (eff === "absent") bgClass = "bg-rose-500 text-white font-black shadow-sm";
                      else if (eff === "leave") bgClass = "bg-amber-400 text-white font-black shadow-sm";
                      else if (eff === "late") bgClass = "bg-indigo-500 text-white font-black shadow-sm";
                      else if (eff === "holiday") bgClass = "bg-blue-100 text-blue-700 font-bold border-blue-200";

                      return (
                        <div
                          key={dIdx}
                          title={getTooltipText(day, mIdx, selectedYear, record)}
                          className={cn(
                            "w-full aspect-square rounded-lg flex items-center justify-center text-[10px] transition-all hover:scale-110 cursor-pointer border",
                            bgClass,
                          )}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAttendanceAnalysis;
