import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { extractYearMonth } from "../utils/dateUtils";
import {
  ArrowLeft,
  CalendarDays,
  Target,
  FileText,
  AlertTriangle,
  BookOpen,
  CheckCircle,
  XCircle,
  Hash,
  Phone,
  Mail,
  Clock,
  TrendingUp,
  TrendingDown,
  User,
  Briefcase,
  Layers,
  Award,
  Calendar,
} from "lucide-react";
import { cn } from "../utils/cn";
import api from "../services/api";
import AttendanceCalendar from "../components/AttendanceCalendar";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import Skeleton, {
  CardSkeleton,
  TableSkeleton,
} from "../components/ui/Skeleton";

const StaffAttendanceAnalysis = () => {
  const { teacherId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeView, setActiveView] = useState("overview"); // overview, calendar

  useEffect(() => {
    fetchAnalysis();
  }, [teacherId]);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const response = await api.get(
        `/attendance/staff/analysis/${teacherId}`,
      );
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching teacher attendance analysis:", error);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  // Group records by month dynamically
  const monthlySummaries = useMemo(() => {
    if (!data || !data.records) return [];
    const groups = {};
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    data.records.forEach(r => {
      const ym = extractYearMonth(r.date);
      if (!ym) return;
      const { year, month } = ym;
      const mName = monthNames[month - 1];
      const mKey = `${year}-${String(month - 1).padStart(2, "0")}`;
      if (!groups[mKey]) {
        groups[mKey] = {
          monthName: mName,
          year: year,
          workingDays: 0,
          present: 0,
          absent: 0,
          leave: 0,
          late: 0,
          key: mKey
        };
      }
      groups[mKey].workingDays++;
      const status = r.status.toLowerCase();
      if (status === 'present') groups[mKey].present++;
      else if (status === 'absent') groups[mKey].absent++;
      else if (status === 'leave') groups[mKey].leave++;
      else if (status === 'late') groups[mKey].late++;
    });

    return Object.values(groups).map(g => {
      const attended = g.present + g.late;
      const percentage = g.workingDays > 0 ? ((attended / g.workingDays) * 100).toFixed(1) : "0.0";
      return { ...g, percentage };
    }).sort((a, b) => a.key.localeCompare(b.key));
  }, [data]);

  // Compute month-over-month trend comparison if comparison data is available
  const trendComparison = useMemo(() => {
    if (monthlySummaries.length < 2) return null;
    const curMonth = monthlySummaries[monthlySummaries.length - 1];
    const prevMonth = monthlySummaries[monthlySummaries.length - 2];
    const diff = parseFloat(curMonth.percentage) - parseFloat(prevMonth.percentage);
    return {
      direction: diff >= 0 ? "up" : "down",
      value: Math.abs(diff).toFixed(1),
      curMonthName: curMonth.monthName,
      prevMonthName: prevMonth.monthName
    };
  }, [monthlySummaries]);

  if (loading) {
    return (
      <div className="space-y-5 p-4 max-w-[1600px] mx-auto animate-pulse">
        <div className="flex items-center gap-4">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <Skeleton className="w-56 h-6 rounded-lg" />
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="flex items-center gap-4 lg:col-span-2">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="w-1/4 h-5" />
              <Skeleton className="w-1/5 h-4" />
            </div>
          </div>
          <Skeleton className="w-full h-16 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="w-full h-24 rounded-2xl" />
          <Skeleton className="w-full h-24 rounded-2xl" />
          <Skeleton className="w-full h-24 rounded-2xl" />
          <Skeleton className="w-full h-24 rounded-2xl" />
        </div>
        <TableSkeleton rows={4} />
      </div>
    );
  }

  if (!data || !data.teacherInfo) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <EmptyState
          title="Analysis Not Found"
          description="We couldn't generate the attendance analysis for this staff member. They might not exist or have no records."
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

  const { teacherInfo, overallAttendance } = data;
  const overallPercentage = parseFloat(overallAttendance.percentage);
  const isCritical = overallPercentage < 75;

  // Determine status rating and badge style
  const getRatingInfo = (percentage) => {
    if (percentage >= 90) return { label: "Excellent", colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    if (percentage >= 75) return { label: "Good", colorClass: "bg-teal-50 text-teal-700 border-teal-200" };
    if (percentage >= 60) return { label: "Average", colorClass: "bg-amber-50 text-amber-700 border-amber-200" };
    if (percentage >= 40) return { label: "Needs Attention", colorClass: "bg-orange-50 text-orange-700 border-orange-200" };
    return { label: "Critical", colorClass: "bg-rose-50 text-rose-700 border-rose-200" };
  };

  const rating = getRatingInfo(overallPercentage);

  // SVG Circular progress configurations
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(overallPercentage, 100) / 100) * circumference;

  const getPercentageColor = (percentage) => {
    if (percentage >= 75) return "text-emerald-600 bg-emerald-50 border-emerald-100";
    if (percentage >= 60) return "text-amber-600 bg-amber-50 border-amber-100";
    return "text-rose-600 bg-rose-50 border-rose-100";
  };

  return (
    <div className="max-w-[1600px] mx-auto px-1 py-1 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      
      {/* Top Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back to Attendance Analytics"
            className="p-2.5 bg-white border border-gray-250 hover:border-gray-300 rounded-xl text-gray-500 hover:text-orange-500 hover:bg-orange-50/50 transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <FileText className="text-orange-500" size={22} />
              Staff Attendance Analysis
            </h2>
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest mt-0.5">
              Teacher Registry & Analytics Engine
            </p>
          </div>
        </div>
      </div>

      {/* Critical Warnings */}
      {isCritical && (
        <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 flex gap-3 items-start shadow-sm">
          <div className="bg-white p-1.5 border border-rose-100 rounded-lg shadow-sm text-rose-505 shrink-0">
            <AlertTriangle size={16} />
          </div>
          <div>
            <h4 className="font-bold text-rose-800 tracking-tight text-xs">
              Critical Attendance Warning
            </h4>
            <p className="text-[10px] font-semibold text-rose-600/90 mt-0.5 leading-relaxed">
              This staff member has fallen below the minimum required 75% attendance.
            </p>
          </div>
        </div>
      )}

      {/* 1. PROFILE & DETAILS COMPREHENSIVE VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Profile Card & Info Panel (Left 8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-zinc-200/80 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-orange-50/40 rounded-full -mr-16 -mt-16 transition-transform duration-700 group-hover:scale-110" />
            
            <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6">
              {/* Initials Avatar */}
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-md shadow-orange-100 text-white font-black text-xl tracking-tighter shrink-0">
                {teacherInfo.name ? teacherInfo.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "ST"}
              </div>

              {/* Basic Meta Details */}
              <div className="text-center sm:text-left flex-1 space-y-2 min-w-0">
                <div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight uppercase">
                      {teacherInfo.name}
                    </h3>
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border",
                      teacherInfo.isActive !== false ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-zinc-100 text-zinc-500 border-zinc-200"
                    )}>
                      {teacherInfo.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                    Employee Code: {teacherInfo.employeeId}
                  </p>
                </div>

                {/* Subject & Department Badges */}
                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-650">
                    <BookOpen size={12} className="text-orange-500" />
                    Subject: {teacherInfo.subject}
                  </span>
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-650">
                    <Briefcase size={12} className="text-indigo-500" />
                    Department: Academics
                  </span>
                </div>
              </div>
            </div>

            {/* Comprehensive Info Grid (Structured Employee Panel) */}
            <div className="mt-5 pt-4 border-t border-zinc-100 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex items-center gap-2.5 p-2.5 bg-zinc-50/50 rounded-xl border border-zinc-150/50">
                <Mail size={14} className="text-zinc-405 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">Email Address</p>
                  <p className="text-xs font-bold text-zinc-700 truncate">{teacherInfo.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 bg-zinc-50/50 rounded-xl border border-zinc-150/50">
                <Phone size={14} className="text-zinc-450 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">Phone Number</p>
                  <p className="text-xs font-bold text-zinc-700 truncate">{teacherInfo.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 bg-zinc-50/50 rounded-xl border border-zinc-150/50">
                <Award size={14} className="text-zinc-450 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">Highest Qualification</p>
                  <p className="text-xs font-bold text-zinc-700 truncate">{teacherInfo.qualification || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 bg-zinc-50/50 rounded-xl border border-zinc-150/50">
                <Calendar size={14} className="text-zinc-450 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">Date of Joining</p>
                  <p className="text-xs font-bold text-zinc-700 truncate">
                    {teacherInfo.joiningDate ? new Date(teacherInfo.joiningDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "N/A"}
                  </p>
                </div>
              </div>
              <div className="sm:col-span-2 flex items-center gap-2.5 p-2.5 bg-zinc-50/50 rounded-xl border border-zinc-150/50">
                <Layers size={14} className="text-zinc-450 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">Assigned Class Groups</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {teacherInfo.assignedClasses && teacherInfo.assignedClasses.length > 0 ? (
                      teacherInfo.assignedClasses.map((cls, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-white border border-zinc-200 text-zinc-650 rounded text-[9px] font-bold uppercase">
                          Class {cls}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs font-bold text-zinc-500 italic">No assigned classes</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Circular Progress Overview Card (Right 4 cols) */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
            <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
              Overall Standings
            </h4>

            {/* Circular Progress SVG */}
            <div className="relative flex items-center justify-center">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke="#F4F4F5"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke={overallPercentage >= 75 ? "#10B981" : overallPercentage >= 60 ? "#F59E0B" : "#EF4444"}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-lg font-black text-zinc-800 tracking-tight">
                  {overallAttendance.percentage}%
                </span>
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                  Attendance
                </span>
              </div>
            </div>

            {/* Info Metrics */}
            <div className="w-full grid grid-cols-2 gap-4 border-t border-zinc-100 pt-4">
              <div className="text-center">
                <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">Duties Logged</p>
                <p className="text-sm font-black text-zinc-800 mt-0.5">{overallAttendance.totalDays} Days</p>
              </div>
              <div className="text-center">
                <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">Standing Rating</p>
                <div className="mt-0.5">
                  <span className={cn(
                    "px-2 py-0.5 border rounded-lg text-[9px] font-black uppercase tracking-wider",
                    rating.colorClass
                  )}>
                    {rating.label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Switch Tab Selector */}
      <div className="flex bg-zinc-100 p-0.5 rounded-xl border border-zinc-200/50 shadow-inner w-fit select-none">
        <button
          onClick={() => setActiveView("overview")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
            activeView === "overview"
              ? "bg-white text-orange-655 shadow-sm"
              : "text-zinc-500 hover:text-zinc-900"
          )}
        >
          <Target size={13} />
          Overview
        </button>
        <button
          onClick={() => setActiveView("calendar")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
            activeView === "calendar"
              ? "bg-white text-orange-655 shadow-sm"
              : "text-zinc-500 hover:text-zinc-900"
          )}
        >
          <CalendarDays size={13} />
          Yearly Calendar
        </button>
      </div>

      {/* 2. OVERVIEW VIEW */}
      {activeView === "overview" ? (
        <div className="space-y-6">
          
          {/* Stats Summary Cards */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-gray-900 tracking-tight uppercase flex items-center gap-1.5">
              <TrendingUp className="text-zinc-450" size={18} />
              Attendance Summary
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Present",
                  value: overallAttendance.presentCount,
                  color: "emerald",
                  icon: CheckCircle,
                  subtitle: "Active duty days",
                  pct: `${overallAttendance.totalDays > 0 ? ((overallAttendance.presentCount / overallAttendance.totalDays) * 100).toFixed(1) : 0}%`,
                  colorClass: "bg-emerald-50 border-emerald-100 text-emerald-600"
                },
                {
                  label: "Absent",
                  value: overallAttendance.absentCount,
                  color: "rose",
                  icon: XCircle,
                  subtitle: "Unexcused Absence",
                  pct: `${overallAttendance.totalDays > 0 ? ((overallAttendance.absentCount / overallAttendance.totalDays) * 100).toFixed(1) : 0}%`,
                  colorClass: "bg-rose-50 border-rose-100 text-rose-600"
                },
                {
                  label: "Late",
                  value: overallAttendance.lateCount,
                  color: "indigo",
                  icon: Clock,
                  subtitle: "Tardy Clock-ins",
                  pct: `${overallAttendance.totalDays > 0 ? ((overallAttendance.lateCount / overallAttendance.totalDays) * 100).toFixed(1) : 0}%`,
                  colorClass: "bg-indigo-50 border-indigo-100 text-indigo-600"
                },
                {
                  label: "Leave",
                  value: overallAttendance.leaveCount,
                  color: "amber",
                  icon: CalendarDays,
                  subtitle: "Approved Time-off",
                  pct: `${overallAttendance.totalDays > 0 ? ((overallAttendance.leaveCount / overallAttendance.totalDays) * 100).toFixed(1) : 0}%`,
                  colorClass: "bg-amber-50 border-amber-100 text-amber-600"
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300"
                >
                  <div className="relative z-10 flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-inner", stat.colorClass)}>
                        <stat.icon size={16} />
                      </div>
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        {stat.pct}
                      </span>
                    </div>
                    
                    <div className="mt-3.5 space-y-0.5">
                      <p className="text-xl font-black text-gray-900 tracking-tight">
                        {stat.value} Days
                      </p>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">
                        {stat.label}
                      </p>
                      <p className="text-[8px] font-bold text-gray-400 italic">
                        {stat.subtitle}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>



          {/* Recent Records Table */}
          {data.records && data.records.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-black text-gray-900 tracking-tight uppercase flex items-center gap-1.5">
                <CalendarDays className="text-zinc-450" size={18} />
                Recent Attendance Log
              </h3>
              <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50/80">
                        <th className="px-5 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-150 w-16 text-center">
                          Sr
                        </th>
                        <th className="px-5 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-150">
                          Date
                        </th>
                        <th className="px-5 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-150">
                          Day
                        </th>
                        <th className="px-5 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-150">
                          Status
                        </th>
                        <th className="px-5 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-150">
                          Remarks
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...data.records].reverse().slice(0, 15).map((record, idx) => {
                        const d = new Date(record.date);
                        const dateStr = d.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                        const dayStr = d.toLocaleDateString("en-US", { weekday: "long" });
                        const status = record.status;
                        return (
                          <tr
                            key={idx}
                            className="hover:bg-zinc-50/50 transition-colors group"
                          >
                            <td className="px-5 py-2.5 border-b border-zinc-100 font-black text-zinc-300 text-center text-xs">
                              {(idx + 1).toString().padStart(2, "0")}
                            </td>
                            <td className="px-5 py-2.5 border-b border-zinc-100 font-bold text-zinc-700 text-xs">
                              {dateStr}
                            </td>
                            <td className="px-5 py-2.5 border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              {dayStr}
                            </td>
                            <td className="px-5 py-2.5 border-b border-zinc-100">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1 border",
                                  status === "Present" && "bg-emerald-50 text-emerald-600 border-emerald-100",
                                  status === "Absent" && "bg-rose-50 text-rose-600 border-rose-100",
                                  status === "Leave" && "bg-amber-50 text-amber-600 border-amber-100",
                                  status === "Late" && "bg-indigo-50 text-indigo-600 border-indigo-100",
                                )}
                              >
                                <span
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    status === "Present" && "bg-emerald-500",
                                    status === "Absent" && "bg-rose-500",
                                    status === "Leave" && "bg-amber-500",
                                    status === "Late" && "bg-indigo-500",
                                  )}
                                />
                                {status}
                              </span>
                            </td>
                            <td className="px-5 py-2.5 border-b border-zinc-100 text-xs text-zinc-450 font-semibold">
                              {record.remarks || <span className="italic text-zinc-200">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {data.records.length > 15 && (
                  <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50/30">
                    <p className="text-xs font-bold text-gray-405 text-center">
                      Showing 15 most recent records · Switch to{" "}
                      <button
                        onClick={() => setActiveView("calendar")}
                        className="text-orange-650 underline-offset-2 underline cursor-pointer font-bold"
                      >
                        Yearly Calendar
                      </button>{" "}
                      to view all {data.records.length} records
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm p-10 text-center">
              <EmptyState
                title="No Attendance Records"
                description="No attendance records found for this staff member yet."
                icon={CalendarDays}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            <AttendanceCalendar records={data.records || []} userType="Teachers" />
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffAttendanceAnalysis;
