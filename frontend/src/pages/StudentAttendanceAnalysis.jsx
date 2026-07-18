import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
      setTimeout(() => setLoading(false), 800);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
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
      <div className="min-h-[60vh] flex items-center justify-center">
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
  const overallPercentage = parseFloat(overallAttendance.percentage);
  const isCritical = overallPercentage < 75;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getMonthDaysList = (year, monthIndex) => {
    const firstDayIndex = new Date(year, monthIndex, 1).getDay(); // 0 is Sun, 6 is Sat
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    
    const days = [];
    // Fill empty leading slots
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Fill actual days
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  };

  const isWeekendDay = (year, monthIndex, day) => {
    const dayOfWeek = new Date(year, monthIndex, day).getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
  };

  // Build key mapping of date to attendance record for fast lookup
  const attendanceMap = {};
  if (data && data.records) {
    data.records.forEach((record) => {
      const d = new Date(record.date);
      const yearStr = d.getFullYear();
      const monthStr = String(d.getMonth() + 1).padStart(2, "0");
      const dateStr = String(d.getDate()).padStart(2, "0");
      const key = `${yearStr}-${monthStr}-${dateStr}`;
      attendanceMap[key] = record;
    });
  }

  const getTooltipText = (day, monthIndex, year, record) => {
    const dateStr = new Date(year, monthIndex, day).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    if (!record) {
      const isWeekend = new Date(year, monthIndex, day).getDay() % 6 === 0;
      const isHol = isDayHoliday(day, monthIndex, year);
      return `${dateStr}: ${isHol ? "Holiday" : (isWeekend ? "Weekend" : "No record")}`;
    }
    return `${dateStr} - ${record.status}${record.remarks ? ` (${record.remarks})` : ""}`;
  };

  const isDayHoliday = (day, month, year) => {
    const date = new Date(year, month, day);
    if (date.getDay() === 0) return true; // Sunday

    return holidays.some(h => {
      if (h.applicableTo !== 'Both' && h.applicableTo !== 'Students') return false;
      const start = new Date(h.startDate);
      const end = new Date(h.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    });
  };

  // Group records by status for the selected year
  // Instead of static counts, we compute stats by iterating all days in year
  const yearStats = React.useMemo(() => {
    let p = 0, a = 0, l = 0, t = 0, h = 0;
    
    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(selectedYear, m + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const key = `${selectedYear}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const record = attendanceMap[key];
        const isHol = isDayHoliday(d, m, selectedYear);
        
        let status = record?.status;
        if (!status && isHol) {
           status = "Holiday";
        }
        
        if (status === 'Present') p++;
        if (status === 'Absent') a++;
        if (status === 'Leave') l++;
        if (status === 'Late') t++;
        if (status === 'Holiday') h++;
      }
    }
    return { presentCount: p, absentCount: a, leaveCount: l, lateCount: t, holidayCount: h };
  }, [attendanceMap, selectedYear, holidays]);

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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <FileText className="text-indigo-600" size={28} />
              Attendance Analysis
            </h2>
            <p className="text-gray-500 font-medium text-sm mt-1">
              Comprehensive subject-wise performance report
            </p>
          </div>
        </div>
      </div>

      {isCritical && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex gap-4 items-start shadow-sm animate-pulse-slow">
          <div className="bg-white p-2 border border-rose-100 rounded-xl shadow-sm text-rose-500 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h4 className="font-bold text-rose-800 tracking-tight">
              Critical Attendance Warning
            </h4>
            <p className="text-sm font-medium text-rose-600/90 mt-0.5 leading-relaxed">
              Student has fallen below the minimum required 75% overall
              attendance. Please arrange a consultation or issue a formal
              notice.
            </p>
          </div>
        </div>
      )}

      {/* Student Profile Card (Section A) */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -mr-24 -mt-24 transition-transform duration-700 group-hover:scale-110" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="w-28 h-28 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-200 text-white shrink-0 transform transition-transform group-hover:-translate-y-1">
            <span className="text-4xl font-black tracking-tighter">
              {studentInfo.name.charAt(0)}
              {studentInfo.name.split(" ")[1]?.[0] || ""}
            </span>
          </div>

          <div className="text-center md:text-left flex-1 min-w-0">
            <h3 className="text-3xl font-black text-gray-900 tracking-tight truncate">
              {studentInfo.name}
            </h3>
            <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                <Hash className="text-gray-400" size={16} />
                <span className="text-sm font-bold text-gray-700">
                  Roll No: {studentInfo.rollNo}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50/50 rounded-xl border border-indigo-50">
                <GraduationCap className="text-indigo-400" size={16} />
                <span className="text-sm font-bold text-indigo-700">
                  Class: {studentInfo.className}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-50/50 rounded-xl border border-purple-50">
                <BookOpen className="text-purple-400" size={16} />
                <span className="text-sm font-bold text-purple-700">
                  Program: {studentInfo.program}
                </span>
              </div>
            </div>
          </div>

          {/* Overall Attendance Summary (Section C) */}
          <div className="w-full md:w-auto mt-6 md:mt-0 flex flex-col items-center md:items-end justify-center bg-gray-50/50 md:bg-transparent rounded-2xl p-6 md:p-0">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              Overall Standing
            </p>
            <div className="flex items-baseline gap-2">
              <h1
                className={cn(
                  "text-5xl font-black tracking-tighter",
                  overallPercentage >= 75
                    ? "text-emerald-500"
                    : overallPercentage >= 60
                      ? "text-amber-500"
                      : "text-rose-500",
                )}
              >
                {overallAttendance.percentage}%
              </h1>
            </div>
            <div className="mt-3 flex gap-4 text-xs font-bold text-gray-500">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-200" />
                Held: {overallAttendance.totalHeld}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                Attended: {overallAttendance.totalAttended}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200/50 shadow-inner w-fit select-none mx-2">
        <button
          onClick={() => setActiveView("overview")}
          className={cn(
            "flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
            activeView === "overview"
              ? "bg-white text-indigo-600 shadow-md font-bold"
              : "text-gray-500 hover:text-gray-900"
          )}
        >
          <Target size={14} />
          Overview
        </button>
        <button
          onClick={() => setActiveView("calendar")}
          className={cn(
            "flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
            activeView === "calendar"
              ? "bg-white text-indigo-600 shadow-md font-bold"
              : "text-gray-500 hover:text-gray-900"
          )}
        >
          <CalendarDays size={14} />
          Yearly Attendance Calendar
        </button>
      </div>

      {activeView === "overview" ? (
        <>
          {/* Subject-wise Attendance Table (Section B) */}
          <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3 pt-4 px-2">
            <Target className="text-gray-400" size={24} />
            Subject-wise Performance
          </h3>

          {subjects.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80">
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-16 text-center">
                        Sr
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                        Subject Name
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                        Code
                      </th>
                      <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">
                        Classes Held
                      </th>
                      <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">
                        Attended
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 min-w-[200px]">
                        Attendance %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((sub, idx) => (
                      <tr
                        key={sub.subjectCode}
                        className="hover:bg-gray-50/50 transition-colors group"
                      >
                        <td className="px-8 py-5 border-b border-gray-50 font-black text-gray-300 text-center text-xs">
                          {(idx + 1).toString().padStart(2, "0")}
                        </td>
                        <td className="px-8 py-5 border-b border-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center font-black text-sm shrink-0">
                              {sub.subjectName.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">
                              {sub.subjectName}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 border-b border-gray-50 font-bold text-gray-400 text-xs tracking-wider">
                          {sub.subjectCode}
                        </td>
                        <td className="px-6 py-5 border-b border-gray-50 text-center">
                          <span className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold border border-gray-100">
                            {sub.totalHeld}
                          </span>
                        </td>
                        <td className="px-6 py-5 border-b border-gray-50 text-center">
                          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold border border-emerald-50">
                            {sub.totalAttended}
                          </span>
                        </td>
                        <td className="px-8 py-5 border-b border-gray-50">
                          <div className="flex items-center gap-4">
                            <div
                              className={cn(
                                "w-16 text-center py-1.5 rounded-lg text-xs font-black border",
                                getPercentageColor(parseFloat(sub.percentage)),
                              )}
                            >
                              {sub.percentage}%
                            </div>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-1000",
                                  getPercentageProgressColor(
                                    parseFloat(sub.percentage),
                                  ),
                                )}
                                style={{ width: `${sub.percentage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {subjects.map((sub, idx) => (
                  <div
                    key={sub.subjectCode}
                    className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                            {sub.subjectCode}
                          </p>
                          <h4 className="font-black text-gray-800 text-lg leading-tight">
                            {sub.subjectName}
                          </h4>
                        </div>
                        <div
                          className={cn(
                            "px-3 py-1 rounded-lg border font-black text-xs",
                            getPercentageColor(parseFloat(sub.percentage)),
                          )}
                        >
                          {sub.percentage}%
                        </div>
                      </div>

                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            getPercentageProgressColor(parseFloat(sub.percentage)),
                          )}
                          style={{ width: `${sub.percentage}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-xs font-bold bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="flex flex-col gap-1 items-center flex-1 border-r border-gray-200">
                          <span className="text-gray-400 uppercase tracking-wider text-[9px]">
                            Classes Held
                          </span>
                          <span className="text-gray-700">{sub.totalHeld}</span>
                        </div>
                        <div className="flex flex-col gap-1 items-center flex-1">
                          <span className="text-gray-400 uppercase tracking-wider text-[9px]">
                            Attended
                          </span>
                          <span className="text-emerald-600">
                            {sub.totalAttended}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-12">
              <EmptyState
                title="No Subjects Found"
                description="We couldn't find any subject attendance records for this student's class."
                icon={BookOpen}
              />
            </div>
          )}
        </>
      ) : (
        <>
          {/* Yearly Calendar View */}
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedYear((prev) => prev - 1)}
                className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 transition-all active:scale-95 shadow-sm"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-3xl font-black text-gray-900 tracking-tight">
                {selectedYear}
              </span>
              <button
                onClick={() => setSelectedYear((prev) => prev + 1)}
                className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 transition-all active:scale-95 shadow-sm"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Attendance Status Summary (For the Selected Year) */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100/50">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Present: <span className="font-black">{presentCount}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-700 rounded-2xl border border-rose-100/50">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Absent: <span className="font-black">{absentCount}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100/50">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                Late: <span className="font-black">{lateCount}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100/50">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Leave: <span className="font-black">{leaveCount}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100/50">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Holiday: <span className="font-black">{holidayCount}</span>
              </div>
            </div>
          </div>

          {/* 12 Months Calendar Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {monthNames.map((monthName, monthIndex) => {
              const days = getMonthDaysList(selectedYear, monthIndex);
              
              // Calculate monthly stats
              const yearRecords = (data.records || []).filter(
                (r) => new Date(r.date).getFullYear() === selectedYear
              );
              const monthlyRecords = yearRecords.filter(
                (r) => new Date(r.date).getMonth() === monthIndex
              );
              const monthlyPresent = monthlyRecords.filter(
                (r) => r.status === "Present"
              ).length;
              const monthlyHeld = monthlyRecords.length;

              return (
                <div
                  key={monthName}
                  className="bg-white rounded-[2.2rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 relative group/month overflow-hidden"
                >
                  {/* Monthly Header */}
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
                    <h4 className="font-black text-gray-800 tracking-tight text-base uppercase">
                      {monthName}
                    </h4>
                    {monthlyHeld > 0 && (
                      <span className="text-[9px] font-black text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-lg">
                        {monthlyPresent}/{monthlyHeld} Present
                      </span>
                    )}
                  </div>

                  {/* Day labels (S M T W T F S) */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {["S", "M", "T", "W", "T", "F", "S"].map((dayLabel, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          "text-[9px] font-black uppercase tracking-wider",
                          (idx === 0 || idx === 6)
                            ? "text-rose-400"
                            : "text-gray-400"
                        )}
                      >
                        {dayLabel}
                      </span>
                    ))}
                  </div>

                  {/* Days grid */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {days.map((day, idx) => {
                      if (day === null) {
                        return <div key={`empty-${idx}`} />;
                      }

                      const key = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const record = attendanceMap[key];
                      const isWeekend = isWeekendDay(selectedYear, monthIndex, day);
                      const isHol = isDayHoliday(day, monthIndex, selectedYear);
                      
                      let status = record?.status;
                      if (!status && isHol) {
                        status = "Holiday";
                      }
                      
                      const tooltipText = getTooltipText(day, monthIndex, selectedYear, status === "Holiday" ? null : record);

                      let cellStyle =
                        "w-full aspect-square rounded-xl flex items-center justify-center text-[11px] font-bold transition-all relative ";
                      if (status) {
                        if (status === "Present")
                          cellStyle += "bg-emerald-500 text-white shadow-sm shadow-emerald-100 hover:scale-110";
                        else if (status === "Absent")
                          cellStyle += "bg-rose-500 text-white shadow-sm shadow-rose-100 hover:scale-110";
                        else if (status === "Late")
                          cellStyle += "bg-indigo-500 text-white shadow-sm shadow-indigo-100 hover:scale-110";
                        else if (status === "Leave")
                          cellStyle += "bg-amber-500 text-white shadow-sm shadow-amber-100 hover:scale-110";
                        else if (status === "Holiday")
                          cellStyle += "bg-blue-500 text-white shadow-sm shadow-blue-100 hover:scale-110";
                      } else {
                        if (isWeekend) {
                          cellStyle += "bg-gray-100/50 text-gray-400/80 font-normal hover:bg-gray-100";
                        } else {
                          cellStyle += "bg-gray-50 text-gray-300 font-normal hover:bg-gray-100/40";
                        }
                      }

                      return (
                        <div
                          key={day}
                          className="relative group/cell cursor-help"
                        >
                          <div className={cellStyle}>{day}</div>

                          {/* CSS Hover Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/cell:flex flex-col items-center pointer-events-none z-30">
                            <div className="bg-gray-950 text-white text-[9px] py-1.5 px-2.5 rounded-xl shadow-2xl whitespace-nowrap leading-tight font-black border border-gray-800/80">
                              {tooltipText}
                            </div>
                            <div className="w-2.5 h-2.5 bg-gray-950 rotate-45 -mt-1 border-r border-b border-gray-800/80" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default StudentAttendanceAnalysis;
