import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  User,
  GraduationCap,
  UserCheck,
  ClipboardList,
  History,
  Phone
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../utils/cn";
import Skeleton, { TableSkeleton } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import AppCombobox from "../components/ui/AppCombobox";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const ClassAttendanceReport = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Tab State
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("attendance_analytics_active_tab") || "students";
  });

  useEffect(() => {
    localStorage.setItem("attendance_analytics_active_tab", activeTab);
  }, [activeTab]);

  // Student Analytics States
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Staff Analytics States
  const [staffReport, setStaffReport] = useState(null);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState("");

  useEffect(() => {
    if (classes.length === 0) {
      fetchClasses();
    }
    if (user?.role === "admin" && activeTab === "staff" && !staffReport) {
      fetchStaffReport();
    }
  }, [activeTab, user]);

  const fetchClasses = async () => {
    try {
      const response = await api.get("/admin/classes");
      if (response.data.success) {
        setClasses(response.data.data);
        if (response.data.data.length > 0 && !selectedClassId) {
          setSelectedClassId(response.data.data[0]._id);
          fetchReport(response.data.data[0]._id);
        }
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const fetchReport = async (classId) => {
    if (!classId) return;
    setLoading(true);
    try {
      const response = await api.get(`/admin/attendance/class/${classId}`);
      if (response.data.success) {
        setReport(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching attendance report:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffReport = async () => {
    setStaffLoading(true);
    try {
      const response = await api.get("/attendance/staff/summary");
      if (response.data.success) {
        setStaffReport(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching staff summary report:", error);
    } finally {
      setStaffLoading(false);
    }
  };

  const handleClassChange = (e) => {
    const classId = e.target.value;
    setSelectedClassId(classId);
    fetchReport(classId);
  };

  // Student filtering (memoized)
  const filteredStudents = useMemo(() => {
    if (!report?.students) return [];
    const query = searchQuery.toLowerCase().trim();
    if (!query) return report.students;
    return report.students.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(query) ||
        (s.rollNo || "").includes(query)
    );
  }, [report?.students, searchQuery]);

  // Staff filtering (memoized)
  const filteredStaff = useMemo(() => {
    if (!staffReport?.staff) return [];
    const query = staffSearchQuery.toLowerCase().trim();
    if (!query) return staffReport.staff;
    return staffReport.staff.filter(
      (t) =>
        (t.name || "").toLowerCase().includes(query) ||
        (t.subject || "").toLowerCase().includes(query)
    );
  }, [staffReport?.staff, staffSearchQuery]);

  const getPercentageColor = (percentage) => {
    const pct = parseFloat(percentage);
    if (pct >= 75) return "text-emerald-600 bg-emerald-50 border-emerald-100";
    if (pct >= 60) return "text-amber-600 bg-amber-50 border-amber-100";
    return "text-rose-600 bg-rose-50 border-rose-100";
  };

  // Aggregated Staff Percentage
  const getAverageStaffAttendance = () => {
    if (!staffReport || staffReport.staff.length === 0) return "100.0";
    const total = staffReport.staff.reduce(
      (acc, t) => acc + parseFloat(t.attendancePercentage),
      0
    );
    return (total / staffReport.staff.length).toFixed(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 max-w-[1600px] mx-auto px-1 py-1">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="text-indigo-600" size={24} />
            Attendance Analytics
          </h2>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mt-0.5">
            Student & Faculty Performance Reports
          </p>
        </div>

        {/* Tab Selector (Admin Only) */}
        {user?.role === "admin" && (
          <div className="flex bg-gray-100 p-0.5 rounded-xl border border-gray-200/50 shadow-inner w-fit select-none">
            <button
              onClick={() => setActiveTab("students")}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                activeTab === "students"
                  ? "bg-white text-indigo-650 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              <ClipboardList size={13} />
              Students
            </button>
            <button
              onClick={() => setActiveTab("staff")}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                activeTab === "staff"
                  ? "bg-white text-indigo-650 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              <UserCheck size={13} />
              Staff
            </button>
          </div>
        )}
      </div>

      {/* STUDENT TAB CONTENT */}
      {activeTab === "students" && (
        <>
          {/* Class Selection Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:px-5 rounded-2xl border border-zinc-200/80 shadow-sm">
            <div className="flex items-center gap-2">
              <Filter className="text-indigo-600" size={16} />
              <span className="text-xs font-black text-zinc-800 uppercase tracking-wider">
                Select Class View
              </span>
            </div>
            <AppCombobox
              placeholder="Select Class"
              searchPlaceholder="Search class..."
              emptyText="No classes found"
              value={selectedClassId}
              onChange={(val) => handleClassChange({ target: { value: val } })}
              options={classes.map((c) => ({
                value: c._id,
                label: `Class ${c.name}`,
              }))}
              containerClassName="w-full sm:w-64"
            />
          </div>
          {/* Summary Cards */}
          {report && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                    <GraduationCap size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                      TOTAL SESSIONS
                    </p>
                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                      {report.totalClasses} <span className="text-xs text-zinc-400 font-bold">Classes</span>
                    </h3>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                      AVERAGE ATTENDANCE
                    </p>
                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                      {report.students.length > 0
                        ? (
                            report.students.reduce(
                              (acc, s) => acc + parseFloat(s.attendancePercentage),
                              0
                            ) / report.students.length
                          ).toFixed(1)
                        : 0}
                      %
                    </h3>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50/50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                    <TrendingDown size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">
                      CRITICAL WATCH
                    </p>
                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                      {
                        report.students.filter(
                          (s) => parseFloat(s.attendancePercentage) < 60
                        ).length
                      } <span className="text-xs text-zinc-400 font-bold">Students</span>
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Student List Matrix */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden min-h-[350px]">
            <div className="px-5 py-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-xs font-black text-zinc-750 uppercase tracking-wider">
                Student Performance Matrix
              </h3>
              <div className="relative group max-w-xs w-full">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="Search student or roll no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-zinc-50/50 border border-zinc-200 hover:border-zinc-250 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-50"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-6">
                  <TableSkeleton rows={5} />
                </div>
              ) : filteredStudents.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/50">
                      <th className="px-5 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 w-24">
                        Roll No
                      </th>
                      <th className="px-5 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">
                        Student Name
                      </th>
                      <th className="px-5 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 text-center w-36">
                        Classes Present
                      </th>
                      <th className="px-5 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 text-center w-36">
                        Classes Absent
                      </th>
                      <th className="px-5 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 text-center w-40">
                        Attendance %
                      </th>
                      <th className="px-5 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 text-right w-24">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {filteredStudents.map((s) => (
                      <tr
                        key={s.studentId}
                        className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                        onClick={() =>
                          navigate(
                            `/reports/attendance/analysis/student/${s.studentId}`
                          )
                        }
                      >
                        <td className="px-5 py-3.5 border-b border-zinc-50 font-black text-zinc-400 text-xs">
                          #{s.rollNo}
                        </td>
                        <td className="px-5 py-3.5 border-b border-zinc-50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-50 text-indigo-650 rounded-lg flex items-center justify-center font-bold text-xs shadow-inner uppercase">
                              {s.name ? s.name.charAt(0) : "S"}
                            </div>
                            <span className="font-bold text-zinc-700 group-hover:text-indigo-600 transition-colors uppercase tracking-tight text-xs">
                              {s.name || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 border-b border-zinc-50 text-center">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-xs font-bold border border-emerald-100">
                            {s.presentCount}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 border-b border-zinc-50 text-center">
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md text-xs font-bold border border-rose-100">
                            {s.absentCount}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 border-b border-zinc-50">
                          <div className="flex flex-col items-center gap-1.5">
                            {(() => {
                              const raw = parseFloat(s.attendancePercentage) || 0;
                              const clampedPct = Math.min(100, Math.max(0, raw)).toFixed(2);
                              return (
                                <>
                                  <div
                                    className={cn(
                                      "px-2.5 py-0.5 rounded-lg text-xs font-black border transition-all",
                                      getPercentageColor(clampedPct)
                                    )}
                                  >
                                    {clampedPct}%
                                  </div>
                                  <div className="w-20 h-1 bg-zinc-100 rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all duration-1000",
                                        parseFloat(clampedPct) >= 75
                                          ? "bg-emerald-500"
                                          : parseFloat(clampedPct) >= 60
                                            ? "bg-amber-500"
                                            : "bg-rose-500"
                                      )}
                                      style={{ width: `${clampedPct}%` }}
                                    />
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 border-b border-zinc-50 text-right">
                          <button className="p-1.5 text-zinc-300 group-hover:text-indigo-600 group-hover:bg-indigo-50 rounded-lg transition-all active:scale-90">
                            <ArrowRight size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center p-12">
                  <EmptyState
                    title="No Student Records Found"
                    description="Choose a different class or check if students are assigned to this group."
                    icon={User}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* STAFF TAB CONTENT (Admin Only) */}
      {activeTab === "staff" && user?.role === "admin" && (
        <>
          {/* Summary Cards */}
          {staffReport && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50/50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">
                      TOTAL SESSIONS MARKED
                    </p>
                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                      {staffReport.totalDays} <span className="text-xs text-zinc-400 font-bold">Days</span>
                    </h3>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                      AVG FACULTY RATIO
                    </p>
                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                      {getAverageStaffAttendance()}%
                    </h3>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50/50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                    <History size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">
                      TOTAL LEAVES GRANTED
                    </p>
                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                      {staffReport.staff.reduce((acc, t) => acc + t.leaveCount, 0)} <span className="text-xs text-zinc-400 font-bold">Leaves</span>
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Staff List Matrix */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden min-h-[350px]">
            <div className="px-5 py-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-xs font-black text-zinc-750 uppercase tracking-wider">
                Faculty Performance Matrix
              </h3>
              <div className="relative group max-w-xs w-full">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="Search faculty or subject..."
                  value={staffSearchQuery}
                  onChange={(e) => setStaffSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-zinc-50/50 border border-zinc-200 hover:border-zinc-250 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-50"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {staffLoading ? (
                <div className="p-6">
                  <TableSkeleton rows={5} />
                </div>
              ) : filteredStaff.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/50">
                      <th className="px-5 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">
                        Faculty Name & details
                      </th>
                      <th className="px-5 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 text-center w-36">
                        Present Days
                      </th>
                      <th className="px-5 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 text-center w-36">
                        Absent Days
                      </th>
                      <th className="px-5 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 text-center w-36">
                        Leaves
                      </th>
                      <th className="px-5 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 text-center w-40">
                        Attendance Ratio
                      </th>
                      <th className="px-5 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 text-right w-24">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {filteredStaff.map((t) => (
                      <tr
                        key={t.teacherId}
                        className="hover:bg-orange-50/30 transition-colors group cursor-pointer"
                        onClick={() =>
                          navigate(
                            `/reports/attendance/analysis/staff/${t.teacherId}`
                          )
                        }
                      >
                        <td className="px-5 py-3.5 border-b border-zinc-50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-orange-50 text-orange-655 rounded-lg flex items-center justify-center font-bold text-xs shadow-inner uppercase">
                              {t.name ? t.name.charAt(0) : "T"}
                            </div>
                            <div>
                              <span className="font-bold text-zinc-700 group-hover:text-orange-600 transition-colors uppercase tracking-tight text-xs block">
                                {t.name || "N/A"}
                              </span>
                              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block mt-0.5">
                                Subject: {t.subject} • Phone: {t.phone}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 border-b border-zinc-50 text-center">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-xs font-bold border border-emerald-100">
                            {t.presentCount}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 border-b border-zinc-50 text-center">
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md text-xs font-bold border border-rose-100">
                            {t.absentCount}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 border-b border-zinc-50 text-center">
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md text-xs font-bold border border-amber-100">
                            {t.leaveCount}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 border-b border-zinc-50">
                          <div className="flex flex-col items-center gap-1.5">
                            <div
                              className={cn(
                                "px-2.5 py-0.5 rounded-lg text-xs font-black border transition-all",
                                getPercentageColor(
                                  parseFloat(t.attendancePercentage)
                                )
                              )}
                            >
                              {t.attendancePercentage}%
                            </div>
                            <div className="w-20 h-1 bg-zinc-100 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-1000",
                                  parseFloat(t.attendancePercentage) >= 75
                                    ? "bg-emerald-500"
                                    : parseFloat(t.attendancePercentage) >= 60
                                      ? "bg-amber-500"
                                      : "bg-rose-500"
                                )}
                                style={{ width: `${t.attendancePercentage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 border-b border-zinc-50 text-right">
                          <button className="p-1.5 text-zinc-300 group-hover:text-orange-500 group-hover:bg-orange-50 rounded-lg transition-all active:scale-90">
                            <ArrowRight size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center p-12">
                  <EmptyState
                    title="No Staff Summary Records Found"
                    description="Check if staff attendance records have been created in the registry."
                    icon={UserCheck}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ClassAttendanceReport;
