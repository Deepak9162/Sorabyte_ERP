import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  User,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Clock,
  TrendingUp,
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

  if (!data || !data.teacherInfo) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
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

  // Determine the final records to display in the calendar
  const getCalendarRecords = () => {
    if (!data || !data.records) return [];
    return data.records;
  };

  const getPercentageColor = (percentage) => {
    if (percentage >= 75)
      return "text-emerald-600 bg-emerald-50 border-emerald-100";
    if (percentage >= 60) return "text-amber-600 bg-amber-50 border-amber-100";
    return "text-rose-600 bg-rose-50 border-rose-100";
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-500 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-100 transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <FileText className="text-orange-600" size={28} />
              Staff Attendance Analysis
            </h2>
            <p className="text-gray-500 font-medium text-sm mt-1">
              Comprehensive attendance history & monthly calendar view
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
              Staff member has fallen below the minimum required 75% attendance.
              Please arrange a meeting or issue a formal notice.
            </p>
          </div>
        </div>
      )}

      {/* Teacher Profile Card */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50/50 rounded-full -mr-24 -mt-24 transition-transform duration-700 group-hover:scale-110" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="w-28 h-28 bg-gradient-to-br from-orange-500 to-rose-600 rounded-3xl flex items-center justify-center shadow-xl shadow-orange-200 text-white shrink-0 transform transition-transform group-hover:-translate-y-1">
            <span className="text-4xl font-black tracking-tighter">
              {teacherInfo.name.charAt(0)}
              {teacherInfo.name.split(" ")[1]?.[0] || ""}
            </span>
          </div>

          <div className="text-center md:text-left flex-1 min-w-0">
            <h3 className="text-3xl font-black text-gray-900 tracking-tight truncate">
              {teacherInfo.name}
            </h3>
            <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                <BookOpen className="text-gray-400" size={16} />
                <span className="text-sm font-bold text-gray-700">
                  {teacherInfo.subject}
                </span>
              </div>
              {teacherInfo.phone && teacherInfo.phone !== "N/A" && (
                <div className="flex items-center gap-2 px-4 py-2 bg-orange-50/50 rounded-xl border border-orange-50">
                  <Phone className="text-orange-400" size={16} />
                  <span className="text-sm font-bold text-orange-700">
                    {teacherInfo.phone}
                  </span>
                </div>
              )}
              {teacherInfo.email && teacherInfo.email !== "N/A" && (
                <div className="flex items-center gap-2 px-4 py-2 bg-rose-50/50 rounded-xl border border-rose-50">
                  <Mail className="text-rose-400" size={16} />
                  <span className="text-sm font-bold text-rose-700">
                    {teacherInfo.email}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-50/50 rounded-xl border border-purple-50">
                <Hash className="text-purple-400" size={16} />
                <span className="text-sm font-bold text-purple-700">
                  ID: {teacherInfo.employeeId}
                </span>
              </div>
            </div>
          </div>

          {/* Overall Attendance Summary */}
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
                <div className="w-2 h-2 rounded-full bg-orange-200" />
                Total: {overallAttendance.totalDays}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                Present: {overallAttendance.presentCount}
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
              ? "bg-white text-orange-600 shadow-md font-bold"
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
              ? "bg-white text-orange-600 shadow-md font-bold"
              : "text-gray-500 hover:text-gray-900"
          )}
        >
          <CalendarDays size={14} />
          Yearly Attendance Calendar
        </button>
      </div>

      {activeView === "overview" ? (
        <>
          {/* Stats Summary Cards */}
          <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3 pt-4 px-2">
            <TrendingUp className="text-gray-400" size={24} />
            Attendance Summary
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {[
              {
                label: "Present",
                value: overallAttendance.presentCount,
                color: "emerald",
                icon: CheckCircle,
                sub: `${overallAttendance.totalDays > 0 ? ((overallAttendance.presentCount / overallAttendance.totalDays) * 100).toFixed(1) : 0}% of total`,
              },
              {
                label: "Absent",
                value: overallAttendance.absentCount,
                color: "rose",
                icon: XCircle,
                sub: `${overallAttendance.totalDays > 0 ? ((overallAttendance.absentCount / overallAttendance.totalDays) * 100).toFixed(1) : 0}% of total`,
              },
              {
                label: "Late",
                value: overallAttendance.lateCount,
                color: "indigo",
                icon: Clock,
                sub: `${overallAttendance.totalDays > 0 ? ((overallAttendance.lateCount / overallAttendance.totalDays) * 100).toFixed(1) : 0}% of total`,
              },
              {
                label: "Leave",
                value: overallAttendance.leaveCount,
                color: "amber",
                icon: CalendarDays,
                sub: `${overallAttendance.totalDays > 0 ? ((overallAttendance.leaveCount / overallAttendance.totalDays) * 100).toFixed(1) : 0}% of total`,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all duration-300"
              >
                <div
                  className={cn(
                    "absolute top-0 right-0 w-24 h-24 rounded-full -mr-8 -mt-8 opacity-10 transition-transform group-hover:scale-125",
                    stat.color === "emerald" && "bg-emerald-500",
                    stat.color === "rose" && "bg-rose-500",
                    stat.color === "indigo" && "bg-indigo-500",
                    stat.color === "amber" && "bg-amber-500",
                  )}
                />
                <div className="relative z-10">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center mb-4",
                      stat.color === "emerald" && "bg-emerald-50 text-emerald-600",
                      stat.color === "rose" && "bg-rose-50 text-rose-600",
                      stat.color === "indigo" && "bg-indigo-50 text-indigo-600",
                      stat.color === "amber" && "bg-amber-50 text-amber-600",
                    )}
                  >
                    <stat.icon size={22} />
                  </div>
                  <p className="text-4xl font-black text-gray-900 tracking-tight">
                    {stat.value}
                  </p>
                  <p className="font-black text-gray-500 text-sm mt-1 uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-xs font-bold text-gray-400 mt-1">{stat.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Overall Progress bar */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Overall Attendance Rate
                </p>
                <h4 className="text-2xl font-black text-gray-900 tracking-tight mt-1">
                  {overallAttendance.percentage}%
                </h4>
              </div>
              <div
                className={cn(
                  "px-4 py-2 rounded-2xl text-sm font-black border",
                  getPercentageColor(overallPercentage)
                )}
              >
                {overallPercentage >= 75
                  ? "Good Standing"
                  : overallPercentage >= 60
                    ? "Needs Attention"
                    : "Critical"}
              </div>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  overallPercentage >= 75
                    ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                    : overallPercentage >= 60
                      ? "bg-gradient-to-r from-amber-400 to-amber-500"
                      : "bg-gradient-to-r from-rose-400 to-rose-500"
                )}
                style={{ width: `${Math.min(overallPercentage, 100)}%` }}
              />
            </div>
            <div className="flex gap-6 mt-4 text-xs font-bold text-gray-400">
              <span>Total Working Days: {overallAttendance.totalDays}</span>
              <span className="text-emerald-600">Present: {overallAttendance.presentCount}</span>
              <span className="text-rose-600">Absent: {overallAttendance.absentCount}</span>
            </div>
          </div>

          {/* Recent Records Table */}
          {data.records && data.records.length > 0 ? (
            <>
              <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3 pt-2 px-2">
                <CalendarDays className="text-gray-400" size={24} />
                Recent Attendance Records
              </h3>
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80">
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-16 text-center">
                          Sr
                        </th>
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                          Date
                        </th>
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                          Day
                        </th>
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                          Status
                        </th>
                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
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
                            className="hover:bg-gray-50/50 transition-colors group"
                          >
                            <td className="px-8 py-5 border-b border-gray-50 font-black text-gray-300 text-center text-xs">
                              {(idx + 1).toString().padStart(2, "0")}
                            </td>
                            <td className="px-8 py-5 border-b border-gray-50 font-bold text-gray-700">
                              {dateStr}
                            </td>
                            <td className="px-8 py-5 border-b border-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider">
                              {dayStr}
                            </td>
                            <td className="px-8 py-5 border-b border-gray-50">
                              <span
                                className={cn(
                                  "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 border",
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
                            <td className="px-8 py-5 border-b border-gray-50 text-xs text-gray-400 font-medium">
                              {record.remarks || <span className="italic text-gray-200">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {data.records.length > 15 && (
                  <div className="px-8 py-4 border-t border-gray-50 bg-gray-50/30">
                    <p className="text-xs font-bold text-gray-400 text-center">
                      Showing 15 most recent records · Switch to{" "}
                      <button
                        onClick={() => setActiveView("calendar")}
                        className="text-orange-600 underline-offset-2 underline"
                      >
                        Monthly Calendar
                      </button>{" "}
                      to view all {data.records.length} records
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-12">
              <EmptyState
                title="No Attendance Records"
                description="No attendance records found for this staff member yet."
                icon={CalendarDays}
              />
            </div>
          )}
        </>
      ) : (
        <div className="max-w-4xl mx-auto">
          <AttendanceCalendar records={getCalendarRecords()} />
        </div>
      )}
    </div>
  );
};

export default StaffAttendanceAnalysis;
