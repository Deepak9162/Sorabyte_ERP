import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Search,
  Save,
  CheckCircle,
  Filter,
  ChevronDown,
  Clock,
  History,
  UserCheck,
  ClipboardList,
  AlertCircle,
  BarChart2,
  Lock,
  Shield,
  Send,
  Unlock,
  Info,
  Download,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import Button from "../components/ui/Button";
import Skeleton, { TableSkeleton } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import { useToast } from "../context/ToastContext";
import { cn } from "../utils/cn";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

// Memoized Mobile Student Attendance Card
const StudentAttendanceCard = React.memo(({ student, status, isMarked, sessionStatus, toggleStudentStatus }) => {
  const isEditingDisabled = isMarked && sessionStatus !== 'draft';
  
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3.5 transition-all hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 flex items-center justify-center bg-indigo-50 text-indigo-600 font-black rounded-xl text-sm shadow-inner">
            {student.rollNumber}
          </span>
          <div>
            <h4 className="font-black text-gray-900 uppercase tracking-tight text-sm leading-snug">
              {student.fullName || "N/A"}
            </h4>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
              ID: {student.studentId}
            </p>
          </div>
        </div>
        
        <div>
          {status ? (
            <span
              className={cn(
                "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 border",
                status === "present" && "bg-emerald-50 text-emerald-600 border-emerald-100",
                status === "absent" && "bg-rose-50 text-rose-600 border-rose-100",
                status === "leave" && "bg-amber-50 text-amber-600 border-amber-100",
                status === "late" && "bg-indigo-50 text-indigo-600 border-indigo-100",
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  status === "present" && "bg-emerald-500",
                  status === "absent" && "bg-rose-500",
                  status === "leave" && "bg-amber-500",
                  status === "late" && "bg-indigo-500",
                )}
              />
              {status}
            </span>
          ) : (
            <span className="text-[9px] text-gray-300 font-black uppercase tracking-widest italic">
              Pending...
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-50/50">
        {[
          {
            id: "present",
            label: "P",
            tooltip: "Present",
            color: "emerald",
            icon: CheckCircle2,
          },
          {
            id: "absent",
            label: "A",
            tooltip: "Absent",
            color: "rose",
            icon: XCircle,
          },
          {
            id: "leave",
            label: "L",
            tooltip: "Leave",
            color: "amber",
            icon: Calendar,
          },
          {
            id: "late",
            label: "T",
            tooltip: "Late",
            color: "indigo",
            icon: Clock,
          },
        ].map((option) => {
          const isSelected = status === option.id;
          return (
            <button
              key={option.id}
              disabled={isEditingDisabled || sessionStatus === 'locked'}
              aria-label={`Mark as ${option.tooltip}`}
              title={option.tooltip}
              onClick={() => toggleStudentStatus(student._id, option.id)}
              className={cn(
                "h-11 rounded-xl border transition-all text-xs font-black uppercase tracking-tight flex items-center justify-center gap-1.5 active:scale-95 touch-manipulation cursor-pointer",
                isSelected
                  ? option.color === "emerald" && "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100"
                  : "bg-white text-gray-400 border-gray-100 hover:bg-gray-50",
                isSelected
                  ? option.color === "rose" && "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-100"
                  : "",
                isSelected
                  ? option.color === "amber" && "bg-amber-505 border-amber-500 text-white shadow-md shadow-amber-100"
                  : "",
                isSelected
                  ? option.color === "indigo" && "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                  : "",
                (isEditingDisabled || sessionStatus === 'locked') && "opacity-60 cursor-not-allowed"
              )}
            >
              <option.icon size={14} />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
StudentAttendanceCard.displayName = "StudentAttendanceCard";

// Memoized Mobile Staff Attendance Card
const StaffAttendanceCard = React.memo(({ teacher, status, markedAt, isStaffMarked, toggleStaffStatus }) => {
  const fullName = `${teacher.firstName} ${teacher.lastName}`;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3.5 transition-all hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center font-black text-sm shadow-inner">
            {teacher.firstName ? teacher.firstName.charAt(0) : "T"}
          </div>
          <div>
            <h4 className="font-black text-gray-900 uppercase tracking-tight text-sm leading-snug">
              {fullName}
            </h4>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
              Sub: {teacher.subject} • Phone: {teacher.phone}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-0.5">
          {status ? (
            <span
              className={cn(
                "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 border",
                status === "present" && "bg-emerald-50 text-emerald-600 border-emerald-100",
                status === "absent" && "bg-rose-50 text-rose-600 border-rose-100",
                status === "leave" && "bg-amber-50 text-amber-600 border-amber-100",
                status === "late" && "bg-indigo-50 text-indigo-600 border-indigo-100",
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  status === "present" && "bg-emerald-500",
                  status === "absent" && "bg-rose-500",
                  status === "leave" && "bg-amber-500",
                  status === "late" && "bg-indigo-500",
                )}
              />
              {status}
            </span>
          ) : (
            <span className="text-[9px] text-gray-300 font-black uppercase tracking-widest italic">
              Pending...
            </span>
          )}
          {markedAt && (
            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">
              {new Date(markedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-50/50">
        {[
          {
            id: "present",
            label: "P",
            tooltip: "Present",
            color: "emerald",
            icon: CheckCircle2,
          },
          {
            id: "absent",
            label: "A",
            tooltip: "Absent",
            color: "rose",
            icon: XCircle,
          },
          {
            id: "leave",
            label: "L",
            tooltip: "Leave",
            color: "amber",
            icon: Calendar,
          },
          {
            id: "late",
            label: "T",
            tooltip: "Late",
            color: "indigo",
            icon: Clock,
          },
        ].map((option) => {
          const isSelected = status === option.id;
          return (
            <button
              key={option.id}
              disabled={isStaffMarked}
              aria-label={`Mark as ${option.tooltip}`}
              title={option.tooltip}
              onClick={() => toggleStaffStatus(teacher._id, option.id)}
              className={cn(
                "h-11 rounded-xl border transition-all text-xs font-black uppercase tracking-tight flex items-center justify-center gap-1.5 active:scale-95 touch-manipulation cursor-pointer",
                isSelected
                  ? option.color === "emerald" && "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100"
                  : "bg-white text-gray-400 border-gray-100 hover:bg-gray-50",
                isSelected
                  ? option.color === "rose" && "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-100"
                  : "",
                isSelected
                  ? option.color === "amber" && "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-100"
                  : "",
                isSelected
                  ? option.color === "indigo" && "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                  : "",
                isStaffMarked && "opacity-60 cursor-not-allowed"
              )}
            >
              <option.icon size={14} />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
StaffAttendanceCard.displayName = "StaffAttendanceCard";

const Attendance = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Navigation states
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("attendance_active_tab") || "mark-students";
  });
  const [loading, setLoading] = useState(false);

  // Helper to get local date string in YYYY-MM-DD format
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Filter states
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(() => {
    return localStorage.getItem("attendance_selected_class") || "";
  });
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());

  useEffect(() => {
    localStorage.setItem("attendance_active_tab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem("attendance_selected_class", selectedClass);
  }, [selectedClass]);

  // Monthly History Filter states
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState("");

  // Student Daily Mark states
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [isMarked, setIsMarked] = useState(false);

  // Attendance Session status (draft/submitted/locked)
  const [sessionStatus, setSessionStatus] = useState(null);
  const [isClassTeacher, setIsClassTeacher] = useState(true); // assume true until proven otherwise

  // Staff Daily Mark states
  const [teachers, setTeachers] = useState([]);
  const [staffAttendanceData, setStaffAttendanceData] = useState({});
  const [isStaffMarked, setIsStaffMarked] = useState(false);

  // Monthly Grid Data states
  const [studentHistory, setStudentHistory] = useState([]);
  const [staffHistory, setStaffHistory] = useState([]);

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  // Allowed tabs based on roles
  const tabs = [
    {
      id: "mark-students",
      label: "Mark Students",
      shortLabel: "Students",
      icon: ClipboardList,
      roles: ["admin", "teacher"],
    },
    {
      id: "mark-staff",
      label: "Mark Staff",
      shortLabel: "Staff",
      icon: UserCheck,
      roles: ["admin"],
    },
    {
      id: "student-history",
      label: "Student History",
      shortLabel: "Stu. History",
      icon: History,
      roles: ["admin", "teacher"],
    },
    {
      id: "staff-history",
      label: "Staff History",
      shortLabel: "Stf. History",
      icon: BarChart2,
      roles: ["admin"],
    },
  ].filter((tab) => tab.roles.includes(user?.role));

  // 1. Fetch Classes on Load — scoped by role
  useEffect(() => {
    if (!user) return;

    const fetchClasses = async () => {
      try {
        let endpoint;
        if (user?.role === "teacher") {
          // Only fetch the class(es) where this teacher is the Class Teacher
          endpoint = "/attendance/my-class";
        } else {
          endpoint = "/admin/classes";
        }

        const res = await api.get(endpoint);
        if (res.data.success) {
          const classData = res.data.data;
          setClasses(classData);

          if (user?.role === "teacher" && classData.length === 0) {
            // Teacher is not assigned as Class Teacher of any class
            setIsClassTeacher(false);
            return;
          }
          setIsClassTeacher(true);

          const stateClassId = location.state?.classId;
          if (stateClassId && classData.some((c) => c._id === stateClassId)) {
            setSelectedClass(stateClassId);
          } else if (classData.length > 0) {
            setSelectedClass(classData[0]._id);
          }
        }
      } catch (error) {
        console.error("Fetch classes error:", error);
        if (user?.role === "teacher") {
          setIsClassTeacher(false);
        }
      }
    };
    fetchClasses();
  }, [location.state, user]);

  // 2. Fetch Daily Student Attendance Data
  useEffect(() => {
    if (activeTab !== "mark-students" || !selectedClass) return;

    const fetchStudentsAndStatus = async () => {
      setLoading(true);
      try {
        const studentsRes = await api.get(
          `/admin/classes/${selectedClass}/students`,
        );
        const fetchedStudents = studentsRes.data.data;
        setStudents(fetchedStudents);

        const statusRes = await api.get("/attendance", {
          params: { classId: selectedClass, date: selectedDate },
        });

        if (statusRes.data.success && statusRes.data.data) {
          const reportData = statusRes.data.data;
          // New format returns { records, session } or legacy format (array)
          const records = Array.isArray(reportData) ? reportData : (reportData.records || []);
          const session = reportData.session || null;
          setSessionStatus(session?.attendanceStatus || null);

          if (records.length > 0) {
            setIsMarked(true);
            const markedData = {};
            records.forEach((entry) => {
              if (entry?.student?._id) {
                markedData[entry.student._id] = entry.status.toLowerCase();
              }
            });
            setAttendanceData(markedData);
          } else {
            setIsMarked(false);
            setSessionStatus(null);
            const initialData = {};
            fetchedStudents.forEach((s) => {
              initialData[s._id] = "present";
            });
            setAttendanceData(initialData);
          }
        } else {
          setIsMarked(false);
          setSessionStatus(null);
          const initialData = {};
          fetchedStudents.forEach((s) => {
            initialData[s._id] = "present";
          });
          setAttendanceData(initialData);
        }
      } catch (error) {
        console.error("Fetch attendance data error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentsAndStatus();
  }, [selectedClass, selectedDate, activeTab]);

  // 3. Fetch Daily Staff Attendance Data
  useEffect(() => {
    if (activeTab !== "mark-staff") return;

    const fetchStaffAndStatus = async () => {
      setLoading(true);
      try {
        const teachersRes = await api.get("/teachers?limit=100");
        const fetchedTeachers = teachersRes.data.data.teachers || [];
        const activeTeachers = fetchedTeachers.filter((t) => t.isActive);
        setTeachers(activeTeachers);

        const statusRes = await api.get("/attendance/staff", {
          params: { date: selectedDate },
        });

        if (statusRes.data.success && statusRes.data.data.length > 0) {
          setIsStaffMarked(true);
          const markedData = {};
          statusRes.data.data.forEach((entry) => {
            if (entry?.teacher?._id) {
              markedData[entry.teacher._id] = {
                status: entry.status.toLowerCase(),
                markedAt: entry.createdAt
              };
            }
          });
          setStaffAttendanceData(markedData);
        } else {
          setIsStaffMarked(false);
          const initialData = {};
          activeTeachers.forEach((t) => {
            initialData[t._id] = { status: "present", markedAt: null };
          });
          setStaffAttendanceData(initialData);
        }
      } catch (error) {
        console.error("Fetch staff attendance error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStaffAndStatus();
  }, [selectedDate, activeTab]);

  // 4. Fetch Student Monthly History Grid Data
  useEffect(() => {
    if (activeTab !== "student-history" || !selectedClass) return;

    const fetchStudentMonthly = async () => {
      setLoading(true);
      try {
        const res = await api.get("/attendance/student/monthly", {
          params: {
            classId: selectedClass,
            month: selectedMonth,
            year: selectedYear,
          },
        });
        if (res.data.success) {
          setStudentHistory(res.data.data);
        }
      } catch (error) {
        console.error("Fetch student monthly error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentMonthly();
  }, [selectedClass, selectedMonth, selectedYear, activeTab]);

  // 5. Fetch Staff Monthly History Grid Data
  useEffect(() => {
    if (activeTab !== "staff-history") return;

    const fetchStaffMonthly = async () => {
      setLoading(true);
      try {
        const res = await api.get("/attendance/staff/monthly", {
          params: { month: selectedMonth, year: selectedYear },
        });
        if (res.data.success) {
          setStaffHistory(res.data.data);
        }
      } catch (error) {
        console.error("Fetch staff monthly error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStaffMonthly();
  }, [selectedMonth, selectedYear, activeTab]);

  const toggleStudentStatus = (id, status) => {
    if (isMarked && sessionStatus !== 'draft') return; // Allow editing draft, block submitted/locked
    if (sessionStatus === 'locked') return;
    setAttendanceData((prev) => ({
      ...prev,
      [id]: status,
    }));
  };

  const toggleStaffStatus = (id, status) => {
    if (isStaffMarked) return;
    setStaffAttendanceData((prev) => {
      const existing = prev[id];
      const prevMarkedAt = typeof existing === 'object' ? existing.markedAt : null;
      return {
        ...prev,
        [id]: { status, markedAt: prevMarkedAt },
      };
    });
  };

  // Submit Student Attendance
  const handleStudentSubmit = async () => {
    if (!selectedClass) return;

    setLoading(true);
    try {
      const attendanceDataArray = students.map((s) => ({
        studentId: s._id,
        status:
          attendanceData[s._id].charAt(0).toUpperCase() +
          attendanceData[s._id].slice(1), // 'present' -> 'Present'
      }));

      if (isMarked && sessionStatus === 'draft') {
        // Update existing attendance
        const res = await api.put("/attendance", {
          classId: selectedClass,
          date: selectedDate,
          attendanceData: attendanceDataArray,
        });
        if (res.data.success) {
          addToast("Attendance updated successfully", "success");
        }
      } else {
        // Create new attendance
        const res = await api.post("/attendance", {
          classId: selectedClass,
          date: selectedDate,
          attendanceData: attendanceDataArray,
        });
        if (res.data.success) {
          setIsMarked(true);
          setSessionStatus('draft');
          addToast(
            `Student attendance for class archived successfully`,
            "success",
          );
        }
      }
    } catch (error) {
      console.error("Submit student attendance error:", error);
      addToast(
        error.response?.data?.message || "Failed to submit student attendance",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // Submit attendance for review (draft → submitted)
  const handleSubmitForReview = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const res = await api.post("/attendance/submit", {
        classId: selectedClass,
        date: selectedDate,
      });
      if (res.data.success) {
        setSessionStatus('submitted');
        addToast("Attendance submitted for review", "success");
      }
    } catch (error) {
      addToast(
        error.response?.data?.message || "Failed to submit attendance",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // Submit Staff Attendance
  const handleStaffSubmit = async () => {
    setLoading(true);
    try {
      const attendanceDataArray = teachers.map((t) => {
        const val = staffAttendanceData[t._id];
        const statusVal = typeof val === 'object' ? val.status : val;
        return {
          teacherId: t._id,
          status: statusVal.charAt(0).toUpperCase() + statusVal.slice(1),
        };
      });

      const res = await api.post("/attendance/staff", {
        date: selectedDate,
        attendanceData: attendanceDataArray,
      });

      if (res.data.success) {
        setIsStaffMarked(true);
        addToast(`Staff attendance archived successfully`, "success");
      }
    } catch (error) {
      console.error("Submit staff attendance error:", error);
      addToast(
        error.response?.data?.message || "Failed to submit staff attendance",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // Date/Month Grid Helpers
  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);

  function getDaysInMonth(month, year) {
    return new Date(year, month, 0).getDate();
  }

  const isWeekend = (day, month, year) => {
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
  };

  const getDayName = (day, month, year) => {
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("en-US", { weekday: "narrow" });
  };

  // ─────────────────────────────────────────────────────────
  // EXPORT CONSTANTS
  // ─────────────────────────────────────────────────────────
  const SCHOOL_NAME = "Little Flower English School";
  const SCHOOL_ADDRESS = "Siwan, Bihar";
  const SCHOOL_TAGLINE = "Nurturing Minds, Building Futures";

  const [exportLoading, setExportLoading] = useState(null); // 'pdf-student' | 'pdf-staff' | 'excel-student' | 'excel-staff'

  const monthLabel = months.find((m) => m.value === selectedMonth)?.label || "";

  // ─────────────────────────────────────────────────────────
  // STATUS HELPERS FOR EXPORT
  // ─────────────────────────────────────────────────────────
  const getStatusChar = (status) => {
    if (!status) return "-";
    switch (status.toLowerCase()) {
      case "present": return "P";
      case "absent":  return "A";
      case "leave":   return "L";
      case "late":    return "T";
      default:        return "-";
    }
  };

  // ─────────────────────────────────────────────────────────
  // EXPORT TO PDF — shared renderer
  // ─────────────────────────────────────────────────────────
  const buildAttendancePDF = (rows, type) => {
    // rows: [{ name, subInfo, attendance: { 1: 'Present', ... }, p, a, l, t }]
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 10;

    const totalDays = getDaysInMonth(selectedMonth, selectedYear);

    // ── Header background ──
    doc.setFillColor(30, 64, 175); // indigo-800
    doc.rect(0, 0, pageW, 38, "F");

    // School name
    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(SCHOOL_NAME.toUpperCase(), pageW / 2, 13, { align: "center" });

    // Address
    doc.setFont("times", "italic");
    doc.setFontSize(9);
    doc.setTextColor(199, 210, 254); // indigo-200
    doc.text(SCHOOL_ADDRESS + "  •  " + SCHOOL_TAGLINE, pageW / 2, 20, { align: "center" });

    // Report title strip
    doc.setFillColor(224, 231, 255); // indigo-100
    doc.rect(0, 38, pageW, 12, "F");
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 64, 175); // indigo-800
    const reportTitle = type === "student"
      ? `STUDENT ATTENDANCE REPORT  •  ${monthLabel.toUpperCase()} ${selectedYear}`
      : `STAFF ATTENDANCE REPORT  •  ${monthLabel.toUpperCase()} ${selectedYear}`;
    doc.text(reportTitle, pageW / 2, 46, { align: "center" });

    // Class info (for student)
    const className = classes.find((c) => c._id === selectedClass)?.name;
    if (type === "student" && className) {
      doc.setFont("times", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Class: ${className}  |  Total Students: ${rows.length}  |  Days in Month: ${totalDays}`, pageW / 2, 53, { align: "center" });
    } else if (type === "staff") {
      doc.setFont("times", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Total Staff: ${rows.length}  |  Days in Month: ${totalDays}`, pageW / 2, 53, { align: "center" });
    }

    // ── Table setup ──
    const tableTop = 58;
    const nameColW = 44;       // name column
    const rollColW = 28;       // roll number column (student) / subject (staff) — wider for long names
    const statColW = 9;        // max width for each day column
    const summaryColW = 11;    // P, A, L, T summary cols
    const rowH = 9;            // row height (single-line name now)
    const headerH = 12;        // header row height

    // Available width for date columns
    const availW = pageW - margin * 2 - nameColW - rollColW - summaryColW * 4;
    const dayColW = Math.min(statColW, availW / totalDays);
    const summaryX = margin + nameColW + rollColW + totalDays * dayColW;

    // ─────────────────────────────────────────────────────────
    // HELPER — draw full table column header row at position yh
    // ─────────────────────────────────────────────────────────
    const drawTableHeader = (yh) => {
      // Background
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(margin, yh, pageW - margin * 2, headerH, "F");
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.rect(margin, yh, pageW - margin * 2, headerH);

      // Name header
      doc.setFont("times", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("NAME", margin + 3, yh + 8);
      doc.setDrawColor(203, 213, 225);
      doc.line(margin + nameColW, yh, margin + nameColW, yh + headerH);

      // Roll / Subject header
      doc.setFont("times", "bold");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(type === "student" ? "ROLL" : "SUBJECT", margin + nameColW + rollColW / 2, yh + 8, { align: "center" });
      doc.line(margin + nameColW + rollColW, yh, margin + nameColW + rollColW, yh + headerH);

      // Day headers (1..totalDays)
      for (let d = 1; d <= totalDays; d++) {
        const cx = margin + nameColW + rollColW + (d - 1) * dayColW;
        const isWknd = isWeekend(d, selectedMonth, selectedYear);
        const dayN = getDayName(d, selectedMonth, selectedYear);
        if (isWknd) {
          doc.setFillColor(254, 243, 199);
          doc.rect(cx, yh, dayColW, headerH, "F");
        }
        doc.setFont("times", "bold");
        doc.setFontSize(7);
        doc.setTextColor(isWknd ? 180 : 71, isWknd ? 120 : 85, isWknd ? 20 : 105);
        doc.text(String(d), cx + dayColW / 2, yh + 5.5, { align: "center" });
        doc.setFont("times", "normal");
        doc.setFontSize(5.5);
        doc.text(dayN, cx + dayColW / 2, yh + 10, { align: "center" });
        doc.setDrawColor(203, 213, 225);
        doc.line(cx + dayColW, yh, cx + dayColW, yh + headerH);
      }

      // Summary headers P / A / L / T
      const summaryLabels = ["P", "A", "L", "T"];
      const summaryColors = [[6, 95, 70], [159, 18, 57], [120, 80, 0], [49, 46, 129]];
      summaryLabels.forEach((lbl, i) => {
        const sx = summaryX + i * summaryColW;
        doc.setFillColor(...summaryColors[i]);
        doc.rect(sx, yh, summaryColW, headerH, "F");
        doc.setFont("times", "bold");
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text(lbl, sx + summaryColW / 2, yh + 8, { align: "center" });
      });
    };

    // Draw the first-page table header
    let y = tableTop;
    drawTableHeader(y);
    y += headerH;

    // ── Data rows ──
    rows.forEach((row, rowIdx) => {
      const isEven = rowIdx % 2 === 0;
      // Row background
      if (isEven) {
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(margin, y, pageW - margin * 2, rowH, "F");
      }

      // ─ Name cell ─
      doc.setFont("times", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      // Clip name to column width so it never overflows
      const nameStr = doc.splitTextToSize((row.name || ""), nameColW - 5)[0];
      doc.text(nameStr, margin + 3, y + rowH / 2 + 2.5);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin + nameColW, y, margin + nameColW, y + rowH);

      // ─ Roll / Subject cell ─
      const rollX = margin + nameColW;
      doc.setFont("times", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      // Clip subject/roll to column width — prevents overflow for long subjects
      const subStr = doc.splitTextToSize((row.subInfo || "-").toString(), rollColW - 4)[0];
      doc.text(subStr, rollX + rollColW / 2, y + rowH / 2 + 2.5, { align: "center" });
      doc.line(rollX + rollColW, y, rollX + rollColW, y + rowH);

      // Row bottom line
      doc.line(margin, y + rowH, margin + pageW - margin * 2, y + rowH);

      // ─ Day cells ─
      for (let d = 1; d <= totalDays; d++) {
        const cx = margin + nameColW + rollColW + (d - 1) * dayColW;
        const statusRaw = row.attendance[d];
        const char = getStatusChar(statusRaw);
        const isWknd = isWeekend(d, selectedMonth, selectedYear);

        if (isWknd && !statusRaw) {
          doc.setFillColor(254, 249, 231);
          doc.rect(cx, y, dayColW, rowH, "F");
        }

        if (statusRaw) {
          const lc = statusRaw.toLowerCase();
          if (lc === "present")      doc.setFillColor(236, 253, 245);
          else if (lc === "absent")  doc.setFillColor(255, 241, 242);
          else if (lc === "leave")   doc.setFillColor(255, 251, 235);
          else if (lc === "late")    doc.setFillColor(238, 242, 255);
          doc.rect(cx, y, dayColW, rowH, "F");

          if (lc === "present")      doc.setTextColor(5, 122, 85);
          else if (lc === "absent")  doc.setTextColor(190, 18, 60);
          else if (lc === "leave")   doc.setTextColor(146, 64, 14);
          else if (lc === "late")    doc.setTextColor(67, 56, 202);
          doc.setFont("times", "bold");
          doc.setFontSize(8);
          doc.text(char, cx + dayColW / 2, y + rowH / 2 + 2.5, { align: "center" });
        } else {
          doc.setFont("times", "normal");
          doc.setFontSize(7);
          doc.setTextColor(203, 213, 225);
          doc.text("-", cx + dayColW / 2, y + rowH / 2 + 2.5, { align: "center" });
        }
        doc.setDrawColor(226, 232, 240);
        doc.line(cx + dayColW, y, cx + dayColW, y + rowH);
      }

      // ─ Summary cells P/A/L/T ─
      const summaryVals = [row.p, row.a, row.l, row.t];
      const summaryTextColors = [[5, 122, 85], [190, 18, 60], [146, 64, 14], [67, 56, 202]];
      summaryVals.forEach((val, i) => {
        const sx = summaryX + i * summaryColW;
        doc.setFont("times", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...summaryTextColors[i]);
        doc.text(String(val ?? 0), sx + summaryColW / 2, y + rowH / 2 + 2.5, { align: "center" });
      });

      y += rowH;

      // ── Page break: full header repeated on new page ──
      if (y > pageH - 22) {
        doc.addPage();

        // Compact indigo banner on continuation pages
        doc.setFillColor(30, 64, 175);
        doc.rect(0, 0, pageW, 18, "F");
        doc.setFont("times", "bold");
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.text(SCHOOL_NAME.toUpperCase(), pageW / 2, 10, { align: "center" });
        doc.setFont("times", "italic");
        doc.setFontSize(7);
        doc.setTextColor(199, 210, 254);
        doc.text(`${reportTitle}  •  (continued)`, pageW / 2, 16, { align: "center" });

        // Report info strip
        doc.setFillColor(224, 231, 255);
        doc.rect(0, 18, pageW, 8, "F");
        doc.setFont("times", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(30, 64, 175);
        const infoText = type === "student" && className
          ? `Class: ${className}  |  ${monthLabel} ${selectedYear}  |  Total Students: ${rows.length}`
          : `${monthLabel} ${selectedYear}  |  Total Staff: ${rows.length}`;
        doc.text(infoText, pageW / 2, 24, { align: "center" });

        // Full column header
        y = 28;
        drawTableHeader(y);
        y += headerH;
      }
    });

    // ── Footer ──
    const footerY = pageH - 8;
    doc.setFont("times", "italic");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    const generatedAt = new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    doc.text(`Generated: ${generatedAt}  •  ${SCHOOL_NAME} ERP System`, margin, footerY);
    const legend = "Legend:  P = Present    A = Absent    L = Leave    T = Late / Tardy    - = No Record";
    doc.text(legend, pageW - margin, footerY, { align: "right" });

    // Page number
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("times", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${i} of ${totalPages}`, pageW / 2, pageH - 3, { align: "center" });
    }

    return doc;
  };

  // ─────────────────────────────────────────────────────────
  // EXPORT TO PDF — Student
  // ─────────────────────────────────────────────────────────
  const exportStudentPDF = async () => {
    if (!studentHistory.length) return;
    setExportLoading("pdf-student");
    try {
      const rows = studentHistory.map((item) => {
        const records = item.attendance || {};
        let p = 0, a = 0, l = 0, t = 0;
        Object.values(records).forEach((s) => {
          const v = (s || "").toLowerCase();
          if (v === "present") p++;
          else if (v === "absent") a++;
          else if (v === "leave") l++;
          else if (v === "late") t++;
        });
        return {
          name: item.student?.fullName || "N/A",
          subInfo: `Roll: ${item.student?.rollNumber || "-"}`,
          attendance: records,
          p, a, l, t,
        };
      });
      const doc = buildAttendancePDF(rows, "student");
      const className = classes.find((c) => c._id === selectedClass)?.name || "Class";
      doc.save(`Student_Attendance_${className}_${monthLabel}_${selectedYear}.pdf`);
    } finally {
      setExportLoading(null);
    }
  };

  // ─────────────────────────────────────────────────────────
  // EXPORT TO PDF — Staff
  // ─────────────────────────────────────────────────────────
  const exportStaffPDF = async () => {
    if (!staffHistory.length) return;
    setExportLoading("pdf-staff");
    try {
      const rows = staffHistory.map((item) => {
        const records = item.attendance || {};
        let p = 0, a = 0, l = 0, t = 0;
        Object.values(records).forEach((s) => {
          const v = (s || "").toLowerCase();
          if (v === "present") p++;
          else if (v === "absent") a++;
          else if (v === "leave") l++;
          else if (v === "late") t++;
        });
        return {
          name: item.teacher?.fullName || "N/A",
          subInfo: item.teacher?.subject || "",
          attendance: records,
          p, a, l, t,
        };
      });
      const doc = buildAttendancePDF(rows, "staff");
      doc.save(`Staff_Attendance_${monthLabel}_${selectedYear}.pdf`);
    } finally {
      setExportLoading(null);
    }
  };

  // ─────────────────────────────────────────────────────────
  // EXPORT TO EXCEL — shared builder
  // ─────────────────────────────────────────────────────────
  const buildAttendanceExcel = (rows, type) => {
    const totalDays = getDaysInMonth(selectedMonth, selectedYear);
    const wb = XLSX.utils.book_new();

    // Build header rows
    const titleRow = [
      SCHOOL_NAME,
      ...Array(totalDays + 4).fill(""),
    ];
    const subTitleRow = [
      type === "student"
        ? `Student Attendance Report — ${monthLabel} ${selectedYear}  |  Class: ${classes.find((c) => c._id === selectedClass)?.name || ""}`
        : `Staff Attendance Report — ${monthLabel} ${selectedYear}`,
      ...Array(totalDays + 4).fill(""),
    ];
    const addressRow = [
      SCHOOL_ADDRESS,
      ...Array(totalDays + 4).fill(""),
    ];

    // Column header row: Name | 1 | 2 | ... | 31 | P | A | L | T
    const colHeaders = [
      type === "student" ? "Student Name" : "Staff Name",
      type === "student" ? "Roll No." : "Subject",
    ];
    for (let d = 1; d <= totalDays; d++) {
      const dayN = getDayName(d, selectedMonth, selectedYear);
      colHeaders.push(`${d}\n${dayN}`);
    }
    colHeaders.push("Present", "Absent", "Leave", "Late");

    // Data rows
    const dataRows = rows.map((row) => {
      const cells = [row.name, row.subInfo];
      for (let d = 1; d <= totalDays; d++) {
        cells.push(getStatusChar(row.attendance[d]));
      }
      cells.push(row.p, row.a, row.l, row.t);
      return cells;
    });

    const sheetData = [titleRow, subTitleRow, addressRow, [], colHeaders, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Column widths
    const colWidths = [
      { wch: 30 }, // Name
      { wch: 14 }, // Roll/Subject
      ...Array(totalDays).fill({ wch: 5 }), // Day cols
      { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, // Summary
    ];
    ws["!cols"] = colWidths;

    // Merge title cells
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalDays + 5 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalDays + 5 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: totalDays + 5 } },
    ];

    XLSX.utils.book_append_sheet(wb, ws, `${monthLabel} ${selectedYear}`);
    return wb;
  };

  // ─────────────────────────────────────────────────────────
  // EXPORT TO EXCEL — Student
  // ─────────────────────────────────────────────────────────
  const exportStudentExcel = async () => {
    if (!studentHistory.length) return;
    setExportLoading("excel-student");
    try {
      const rows = studentHistory.map((item) => {
        const records = item.attendance || {};
        let p = 0, a = 0, l = 0, t = 0;
        Object.values(records).forEach((s) => {
          const v = (s || "").toLowerCase();
          if (v === "present") p++;
          else if (v === "absent") a++;
          else if (v === "leave") l++;
          else if (v === "late") t++;
        });
        return {
          name: item.student?.fullName || "N/A",
          subInfo: `Roll: ${item.student?.rollNumber || "-"}`,
          attendance: records,
          p, a, l, t,
        };
      });
      const wb = buildAttendanceExcel(rows, "student");
      const className = classes.find((c) => c._id === selectedClass)?.name || "Class";
      XLSX.writeFile(wb, `Student_Attendance_${className}_${monthLabel}_${selectedYear}.xlsx`);
    } finally {
      setExportLoading(null);
    }
  };

  // ─────────────────────────────────────────────────────────
  // EXPORT TO EXCEL — Staff
  // ─────────────────────────────────────────────────────────
  const exportStaffExcel = async () => {
    if (!staffHistory.length) return;
    setExportLoading("excel-staff");
    try {
      const rows = staffHistory.map((item) => {
        const records = item.attendance || {};
        let p = 0, a = 0, l = 0, t = 0;
        Object.values(records).forEach((s) => {
          const v = (s || "").toLowerCase();
          if (v === "present") p++;
          else if (v === "absent") a++;
          else if (v === "leave") l++;
          else if (v === "late") t++;
        });
        return {
          name: item.teacher?.fullName || "N/A",
          subInfo: item.teacher?.subject || "",
          attendance: records,
          p, a, l, t,
        };
      });
      const wb = buildAttendanceExcel(rows, "staff");
      XLSX.writeFile(wb, `Staff_Attendance_${monthLabel}_${selectedYear}.xlsx`);
    } finally {
      setExportLoading(null);
    }
  };
  // ─────────────────────────────────────────────────────────
  // END EXPORT FUNCTIONS
  // ─────────────────────────────────────────────────────────

  // Status mapping colors & symbols
  const getStatusBadge = (status) => {
    if (!status)
      return {
        label: "-",
        className: "text-gray-300 bg-gray-50 border-gray-100",
      };

    switch (status.toLowerCase()) {
      case "present":
        return {
          label: "P",
          className: "bg-emerald-50 text-emerald-600 border-emerald-200",
        };
      case "absent":
        return {
          label: "A",
          className: "bg-rose-50 text-rose-600 border-rose-200",
        };
      case "leave":
        return {
          label: "L",
          className: "bg-amber-50 text-amber-600 border-amber-200",
        };
      case "late":
        return {
          label: "T",
          className: "bg-indigo-50 text-indigo-600 border-indigo-200",
        };
      default:
        return {
          label: "-",
          className: "text-gray-300 bg-gray-50 border-gray-100",
        };
    }
  };

  // Filtering for list search
  const filteredStudents = students.filter(
    (s) =>
      (s.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.rollNumber && s.rollNumber.includes(searchQuery)),
  );

  const filteredTeachers = teachers.filter(
    (t) =>
      `${t.firstName} ${t.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (t.subject &&
        t.subject.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  // Summary counts for stats bar
  const currentMarkedData =
    activeTab === "mark-students" ? attendanceData : staffAttendanceData;
  const currentTotal =
    activeTab === "mark-students" ? students.length : teachers.length;

  const getStatusCount = (statusVal) => {
    return Object.values(currentMarkedData).filter((s) => {
      const status = typeof s === "object" ? s?.status : s;
      return status === statusVal;
    }).length;
  };

  const stats = {
    total: currentTotal,
    present: getStatusCount("present"),
    absent: getStatusCount("absent"),
    leave: getStatusCount("leave"),
    late: getStatusCount("late"),
  };

  return (
    <div className="space-y-4 md:space-y-8 animate-in fade-in duration-700">
      {/* Tab Selector — full width, all tabs always visible */}
      <div className="w-full bg-white border border-gray-100 rounded-2xl shadow-sm p-1.5">
        <div className="flex w-full bg-gray-100/80 rounded-xl p-1 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery("");
                  if (tab.id === "mark-students" || tab.id === "mark-staff") {
                    setSelectedDate(getLocalDateString());
                  }
                }}
                className={cn(
                  "flex flex-1 flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 px-1 rounded-lg sm:rounded-xl transition-all min-w-0",
                  isActive
                    ? "bg-white text-indigo-600 shadow-md"
                    : "text-gray-400 hover:text-gray-700 hover:bg-white/50",
                )}
              >
                <Icon size={16} className="shrink-0" />
                {/* Short label on xs, full label on sm+ */}
                <span className="text-[9px] sm:hidden font-black uppercase tracking-wide leading-tight text-center">
                  {tab.shortLabel}
                </span>
                <span className="hidden sm:inline text-[10px] md:text-xs font-black uppercase tracking-wider truncate">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Teacher Empty State — Not assigned as Class Teacher */}
      {user?.role === "teacher" && !isClassTeacher && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-20 h-20 mx-auto mb-6 bg-amber-50 rounded-3xl flex items-center justify-center shadow-inner shadow-amber-100/50">
            <Shield size={36} className="text-amber-500" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-3">
            No Class Teacher Assignment
          </h3>
          <p className="text-gray-500 font-medium max-w-md mx-auto leading-relaxed">
            You are currently not assigned as the Class Teacher of any class.
            Please contact your administrator to get assigned.
          </p>
          <div className="mt-8 px-6 py-4 bg-amber-50/50 rounded-2xl border border-amber-100/50 inline-block">
            <div className="flex items-center gap-2 text-amber-700">
              <Info size={16} />
              <span className="text-sm font-bold">
                Only Class Teachers can manage student attendance.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Control Bar: Filters depending on Active Tab */}
      <div className={cn(
        "flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"
      )}>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Class filter (visible in Mark Student and Student History) */}
          {(activeTab === "mark-students" ||
            activeTab === "student-history") && (
            <>
              {/* Only show class selector if admin or multiple classes */}
              {(user?.role === "admin" || classes.length > 1) ? (
                <div className="relative group w-full sm:min-w-[160px] sm:w-auto">
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 shadow-sm focus:ring-4 focus:ring-indigo-50 outline-none transition-all cursor-pointer appearance-none"
                  >
                    {classes.map((cls) => (
                      <option key={cls._id} value={cls._id}>
                        Class {cls.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-indigo-600 pointer-events-none transition-colors"
                    size={16}
                  />
                </div>
              ) : classes.length === 1 ? (
                <div className="flex items-center gap-2 px-6 py-3.5 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl">
                  <Shield size={16} className="text-indigo-600" />
                  <span className="text-sm font-black text-indigo-700 uppercase tracking-wider">
                    My Class — {classes[0].name}
                  </span>
                </div>
              ) : null}

              {/* Session status badge (for teachers) */}
              {activeTab === "mark-students" && sessionStatus && (
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border",
                  sessionStatus === 'draft' && "bg-amber-50 text-amber-700 border-amber-200",
                  sessionStatus === 'submitted' && "bg-blue-50 text-blue-700 border-blue-200",
                  sessionStatus === 'locked' && "bg-rose-50 text-rose-700 border-rose-200",
                )}>
                  {sessionStatus === 'locked' ? <Lock size={14} /> : sessionStatus === 'submitted' ? <Send size={14} /> : <AlertCircle size={14} />}
                  {sessionStatus}
                </div>
              )}
            </>
          )}

          {/* Date filter (visible in Mark tabs) - Locked to Today */}
          {(activeTab === "mark-students" || activeTab === "mark-staff") && (
            <div className="relative group w-full sm:w-auto">
              <Calendar
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="date"
                value={selectedDate}
                disabled
                title="Attendance can only be marked for the current date"
                className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-100 rounded-xl text-sm font-bold text-gray-400 shadow-inner outline-none cursor-not-allowed select-none"
              />
            </div>
          )}

          {/* Month & Year filter (visible in History tabs) */}
          {(activeTab === "student-history" ||
            activeTab === "staff-history") && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative group flex-1 sm:min-w-[140px] sm:flex-none">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full pl-4 pr-10 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 shadow-sm focus:ring-4 focus:ring-indigo-50 outline-none transition-all cursor-pointer appearance-none"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-indigo-600 pointer-events-none transition-colors"
                  size={15}
                />
              </div>

              <div className="relative group w-[90px] sm:w-[110px]">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full pl-4 pr-8 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 shadow-sm focus:ring-4 focus:ring-indigo-50 outline-none transition-all cursor-pointer appearance-none"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-indigo-600 pointer-events-none transition-colors"
                  size={14}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Export Buttons for History Tabs ── */}
        {(activeTab === "student-history" || activeTab === "staff-history") && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Excel export */}
            <button
              id={activeTab === "student-history" ? "export-student-excel" : "export-staff-excel"}
              disabled={
                exportLoading !== null ||
                (activeTab === "student-history" ? studentHistory.length === 0 : staffHistory.length === 0)
              }
              onClick={activeTab === "student-history" ? exportStudentExcel : exportStaffExcel}
              title="Export to Excel"
              className={cn(
                "flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all shadow-sm",
                "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:shadow-md active:scale-95",
                (exportLoading !== null || (activeTab === "student-history" ? studentHistory.length === 0 : staffHistory.length === 0))
                  && "opacity-50 cursor-not-allowed"
              )}
            >
              {exportLoading === (activeTab === "student-history" ? "excel-student" : "excel-staff") ? (
                <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileSpreadsheet size={14} />
              )}
              Excel
            </button>

            {/* PDF export */}
            <button
              id={activeTab === "student-history" ? "export-student-pdf" : "export-staff-pdf"}
              disabled={
                exportLoading !== null ||
                (activeTab === "student-history" ? studentHistory.length === 0 : staffHistory.length === 0)
              }
              onClick={activeTab === "student-history" ? exportStudentPDF : exportStaffPDF}
              title="Export to PDF"
              className={cn(
                "flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all shadow-sm",
                "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:shadow-md active:scale-95",
                (exportLoading !== null || (activeTab === "student-history" ? studentHistory.length === 0 : staffHistory.length === 0))
                  && "opacity-50 cursor-not-allowed"
              )}
            >
              {exportLoading === (activeTab === "student-history" ? "pdf-student" : "pdf-staff") ? (
                <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileText size={14} />
              )}
              PDF
            </button>
          </div>
        )}

        {/* Action Buttons for Mark tabs */}
        {(activeTab === "mark-students" || activeTab === "mark-staff") && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Save/Submit attendance */}
            {activeTab === "mark-students" && sessionStatus !== 'locked' && (
              <Button
                onClick={handleStudentSubmit}
                loading={loading}
                disabled={sessionStatus === 'submitted' || sessionStatus === 'locked'}
                icon={Save}
                className="rounded-2xl shadow-lg px-8 h-12"
              >
                {!isMarked
                  ? "Submit Student Attendance"
                  : sessionStatus === 'submitted'
                    ? "Submitted"
                    : sessionStatus === 'locked'
                      ? "Locked"
                      : "Update Attendance"}
              </Button>
            )}

            {/* Submit for review (teacher: draft → submitted) */}
            {activeTab === "mark-students" && isMarked && sessionStatus === 'draft' && (
              <Button
                onClick={handleSubmitForReview}
                loading={loading}
                icon={Send}
                variant="secondary"
                className="rounded-2xl shadow-md px-6 h-12 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                Submit for Review
              </Button>
            )}

            {/* Locked indicator */}
            {activeTab === "mark-students" && sessionStatus === 'locked' && (
              <div className="flex items-center gap-2 px-6 py-3 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200">
                <Lock size={16} />
                <span className="text-xs font-black uppercase tracking-wider">Attendance Locked</span>
              </div>
            )}

            {/* Staff attendance button (unchanged) */}
            {activeTab === "mark-staff" && (
              <Button
                onClick={handleStaffSubmit}
                loading={loading}
                disabled={isStaffMarked}
                icon={Save}
                className="rounded-2xl shadow-lg px-8 h-12"
              >
                {isStaffMarked ? "Roster Finalized" : "Submit Staff Attendance"}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Mobile Attendance Information Card */}
      {(activeTab === "mark-students" || activeTab === "mark-staff") && (
        <div className="md:hidden bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">Class</span>
              {activeTab === "mark-students" ? (
                (user?.role === "admin" || classes.length > 1) ? (
                  <div className="relative inline-block w-full">
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full py-1 pl-2 pr-6 border border-gray-200 rounded-lg text-xs font-black text-gray-700 focus:ring-2 focus:ring-indigo-100 outline-none appearance-none bg-white cursor-pointer"
                    >
                      {classes.map((cls) => (
                        <option key={cls._id} value={cls._id}>
                          Class {cls.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-450 pointer-events-none" size={12} />
                  </div>
                ) : (
                  <span className="text-gray-800 font-black">Class {classes.find(c => c._id === selectedClass)?.name || "N/A"}</span>
                )
              ) : (
                <span className="text-gray-800 font-black">All Faculty</span>
              )}
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">Date</span>
              <span className="text-gray-800 font-black">
                {new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">Status</span>
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                activeTab === "mark-students" 
                  ? (sessionStatus === 'locked' ? "bg-rose-50 text-rose-700 border-rose-200"
                    : sessionStatus === 'submitted' ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : !isMarked ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-blue-50 text-blue-700 border-blue-200")
                  : (isStaffMarked ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200")
              )}>
                {activeTab === "mark-students" ? (
                  sessionStatus === 'locked' ? "Locked" : sessionStatus === 'submitted' ? "Submitted" : !isMarked ? "Pending" : "Draft Saved"
                ) : (
                  isStaffMarked ? "Submitted" : "Pending"
                )}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">Teacher</span>
              <span className="text-gray-800 font-black truncate block">{user?.name || "N/A"}</span>
            </div>
          </div>
        </div>
      )}

      {/* Summary Row (Only for daily marking sheets) */}
      {(activeTab === "mark-students" || activeTab === "mark-staff") && (
        <>
          {/* Desktop Summary Grid */}
          <div className="hidden md:grid grid-cols-5 gap-6">
            {[
              {
                label: "Total Capacity",
                value: stats.total,
                color: "indigo",
                icon: Users,
              },
              {
                label: "Present",
                value: stats.present,
                color: "emerald",
                icon: CheckCircle2,
              },
              {
                label: "Absent",
                value: stats.absent,
                color: "rose",
                icon: XCircle,
              },
              {
                label: "Leave",
                value: stats.leave,
                color: "amber",
                icon: Calendar,
              },
              { label: "Late", value: stats.late, color: "violet", icon: Clock },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all"
              >
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                    {item.label}
                  </p>
                  <p className="text-2xl font-black text-gray-900 tracking-tight">
                    {item.value}
                  </p>
                </div>
                <div
                  className={cn(
                    "p-3 rounded-2xl shadow-inner",
                    item.color === "indigo" &&
                      "bg-indigo-50 text-indigo-600 shadow-indigo-100/50",
                    item.color === "emerald" &&
                      "bg-emerald-50 text-emerald-600 shadow-emerald-100/50",
                    item.color === "rose" &&
                      "bg-rose-50 text-rose-600 shadow-rose-100/50",
                    item.color === "amber" &&
                      "bg-amber-50 text-amber-600 shadow-amber-100/50",
                    item.color === "violet" &&
                      "bg-violet-50 text-violet-600 shadow-violet-100/50",
                  )}
                >
                  <item.icon size={20} />
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Summary Grid */}
          <div className="md:hidden grid grid-cols-2 gap-2">
            {[
              { label: activeTab === "mark-students" ? "Students" : "Staff", value: stats.total, color: "indigo", icon: Users },
              { label: "Present", value: stats.present, color: "emerald", icon: CheckCircle2 },
              { label: "Absent", value: stats.absent, color: "rose", icon: XCircle },
              { label: "Leave", value: stats.leave, color: "amber", icon: Calendar },
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">{item.label}</span>
                  <p className="text-lg font-black text-gray-900 leading-tight">{item.value}</p>
                </div>
                <div className={cn(
                  "p-1.5 rounded-lg shadow-inner",
                  item.color === "indigo" && "bg-indigo-50 text-indigo-600 shadow-indigo-100/30",
                  item.color === "emerald" && "bg-emerald-50 text-emerald-600 shadow-emerald-100/30",
                  item.color === "rose" && "bg-rose-50 text-rose-600 shadow-rose-100/30",
                  item.color === "amber" && "bg-amber-50 text-amber-600 shadow-amber-100/30",
                )}>
                  <item.icon size={14} />
                </div>
              </div>
            ))}
            <div className="col-span-2 bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Late</span>
                <p className="text-lg font-black text-gray-900 leading-tight">{stats.late}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600 shadow-inner shadow-violet-100/30">
                <Clock size={14} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden mb-32 md:mb-0">
        {/* Daily Mark - Student Tab */}
        {activeTab === "mark-students" && (
          <>
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 p-6 sm:p-10 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm md:shadow-none">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Users size={20} className="text-indigo-600" />
                  Cohort Roster
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                  Mark presence for{" "}
                  {classes.find((c) => c._id === selectedClass)?.name ||
                    "Class"}{" "}
                  • {selectedDate}
                </p>
              </div>
              <div className="w-full sm:w-64 relative group">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Find student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-400 font-medium"
                />
              </div>
            </div>

            <div className="overflow-hidden">
              {loading ? (
                <div className="p-10">
                  <TableSkeleton rows={8} columns={4} />
                </div>
              ) : filteredStudents.length === 0 ? (
                <EmptyState
                  title="Cohort not found"
                  description="No students enrolled in this class group yet."
                  actionLabel="Go to Dashboard"
                  onAction={() => {}}
                />
              ) : (
                <>
                  {/* Desktop View */}
                  <div className="hidden md:block overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50/30 border-b border-gray-100">
                          <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">
                            Roll
                          </th>
                          <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            Student Information
                          </th>
                          <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest w-48">
                            Verification Status
                          </th>
                          <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right w-72">
                            Status Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredStudents.map((student) => {
                          const status = attendanceData[student._id];
                          return (
                            <tr
                              key={student._id}
                              className="group hover:bg-gray-50/50 transition-all duration-300"
                            >
                              <td className="px-10 py-6">
                                <span className="w-12 h-12 flex items-center justify-center bg-gray-100 text-gray-500 font-black rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                                  {student.rollNumber}
                                </span>
                              </td>
                              <td className="px-10 py-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-sm">
                                    {student.fullName
                                      ? student.fullName.charAt(0)
                                      : "S"}
                                  </div>
                                  <div>
                                    <p className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                                      {student.fullName || "N/A"}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                      ID: {student.studentId}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-10 py-6">
                                {status ? (
                                  <span
                                    className={cn(
                                      "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 border",
                                      status === "present" &&
                                        "bg-emerald-50 text-emerald-600 border-emerald-100",
                                      status === "absent" &&
                                        "bg-rose-50 text-rose-600 border-rose-100",
                                      status === "leave" &&
                                        "bg-amber-50 text-amber-600 border-amber-100",
                                      status === "late" &&
                                        "bg-indigo-50 text-indigo-600 border-indigo-100",
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        status === "present" && "bg-emerald-500",
                                        status === "absent" && "bg-rose-500",
                                        status === "leave" && "bg-amber-500",
                                        status === "late" && "bg-indigo-500",
                                      )}
                                    />
                                    {status}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-gray-300 font-black uppercase tracking-widest italic">
                                    Pending...
                                  </span>
                                )}
                              </td>
                              <td className="px-10 py-6 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {[
                                    {
                                      id: "present",
                                      label: "P",
                                      tooltip: "Present",
                                      color: "emerald",
                                      icon: CheckCircle2,
                                    },
                                    {
                                      id: "absent",
                                      label: "A",
                                      tooltip: "Absent",
                                      color: "rose",
                                      icon: XCircle,
                                    },
                                    {
                                      id: "leave",
                                      label: "L",
                                      tooltip: "Leave",
                                      color: "amber",
                                      icon: Calendar,
                                    },
                                    {
                                      id: "late",
                                      label: "T",
                                      tooltip: "Late",
                                      color: "indigo",
                                      icon: Clock,
                                    },
                                  ].map((option) => {
                                    const isSelected = status === option.id;
                                    return (
                                      <button
                                        key={option.id}
                                        disabled={isMarked}
                                        title={option.tooltip}
                                        onClick={() =>
                                          toggleStudentStatus(
                                            student._id,
                                            option.id,
                                          )
                                        }
                                        className={cn(
                                          "p-2.5 rounded-xl border transition-all text-xs font-black uppercase tracking-tight flex items-center gap-1 active:scale-90 cursor-pointer",
                                          isSelected
                                            ? option.color === "emerald" &&
                                                "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100 scale-105"
                                            : "bg-white text-gray-400 hover:text-gray-900 border-gray-100 hover:bg-gray-50",
                                          isSelected
                                            ? option.color === "rose" &&
                                                "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-100 scale-105"
                                            : "",
                                          isSelected
                                            ? option.color === "amber" &&
                                                "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-100 scale-105"
                                            : "",
                                          isSelected
                                            ? option.color === "indigo" &&
                                                "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100 scale-105"
                                            : "",
                                        )}
                                      >
                                        <option.icon size={16} />
                                        {option.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="block md:hidden space-y-3.5 p-4 bg-gray-50/40">
                    {filteredStudents.map((student) => {
                      const status = attendanceData[student._id];
                      return (
                        <StudentAttendanceCard
                          key={student._id}
                          student={student}
                          status={status}
                          isMarked={isMarked}
                          sessionStatus={sessionStatus}
                          toggleStudentStatus={toggleStudentStatus}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Daily Mark - Staff Tab */}
        {activeTab === "mark-staff" && (
          <>
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 p-6 sm:p-10 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm md:shadow-none">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <UserCheck size={20} className="text-indigo-600" />
                  Staff Roster
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                  Mark presence for active faculty members • {selectedDate}
                </p>
              </div>
              <div className="w-full sm:w-64 relative group">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Find teacher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-400 font-medium"
                />
              </div>
            </div>

            <div className="overflow-hidden">
              {loading ? (
                <div className="p-10">
                  <TableSkeleton rows={6} columns={4} />
                </div>
              ) : filteredTeachers.length === 0 ? (
                <EmptyState
                  title="No Staff Found"
                  description="No active teachers found in the school records."
                  actionLabel="Go to Dashboard"
                  onAction={() => {}}
                />
              ) : (
                <>
                  {/* Desktop View */}
                  <div className="hidden md:block overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50/30 border-b border-gray-100">
                          <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            Faculty Information
                          </th>
                          <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest w-48">
                            Verification Status
                          </th>
                          <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right w-72">
                            Status Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredTeachers.map((teacher) => {
                          const attendanceObj = staffAttendanceData[teacher._id];
                          const status = typeof attendanceObj === 'object' ? attendanceObj?.status : attendanceObj;
                          const markedAt = typeof attendanceObj === 'object' ? attendanceObj?.markedAt : null;
                          const fullName = `${teacher.firstName} ${teacher.lastName}`;
                          return (
                            <tr
                              key={teacher._id}
                              className="group hover:bg-gray-50/50 transition-all duration-300"
                            >
                              <td className="px-10 py-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center font-black text-sm">
                                    {teacher.firstName
                                      ? teacher.firstName.charAt(0)
                                      : "T"}
                                  </div>
                                  <div>
                                    <p className="font-black text-gray-900 group-hover:text-orange-600 transition-colors uppercase tracking-tight">
                                      {fullName}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                      Subject: {teacher.subject} • Phone:{" "}
                                      {teacher.phone}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-10 py-6">
                                {status ? (
                                  <div className="flex flex-col gap-1 items-start">
                                    <span
                                      className={cn(
                                        "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 border",
                                        status === "present" &&
                                          "bg-emerald-50 text-emerald-600 border-emerald-100",
                                        status === "absent" &&
                                          "bg-rose-50 text-rose-600 border-rose-100",
                                        status === "leave" &&
                                          "bg-amber-50 text-amber-600 border-amber-100",
                                        status === "late" &&
                                          "bg-indigo-50 text-indigo-600 border-indigo-100",
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "w-1.5 h-1.5 rounded-full",
                                          status === "present" && "bg-emerald-500",
                                          status === "absent" && "bg-rose-500",
                                          status === "leave" && "bg-amber-500",
                                          status === "late" && "bg-indigo-500",
                                        )}
                                      />
                                      {status}
                                    </span>
                                    {markedAt && (
                                      <span className="text-[9px] text-gray-400 font-bold px-1 uppercase tracking-widest">
                                        {new Date(markedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-gray-300 font-black uppercase tracking-widest italic">
                                    Pending...
                                  </span>
                                )}
                              </td>
                              <td className="px-10 py-6 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {[
                                    {
                                      id: "present",
                                      label: "P",
                                      tooltip: "Present",
                                      color: "emerald",
                                      icon: CheckCircle2,
                                    },
                                    {
                                      id: "absent",
                                      label: "A",
                                      tooltip: "Absent",
                                      color: "rose",
                                      icon: XCircle,
                                    },
                                    {
                                      id: "leave",
                                      label: "L",
                                      tooltip: "Leave",
                                      color: "amber",
                                      icon: Calendar,
                                    },
                                    {
                                      id: "late",
                                      label: "T",
                                      tooltip: "Late",
                                      color: "indigo",
                                      icon: Clock,
                                    },
                                  ].map((option) => {
                                    const isSelected = status === option.id;
                                    return (
                                      <button
                                        key={option.id}
                                        disabled={isStaffMarked}
                                        title={option.tooltip}
                                        onClick={() =>
                                          toggleStaffStatus(
                                            teacher._id,
                                            option.id,
                                          )
                                        }
                                        className={cn(
                                          "p-2.5 rounded-xl border transition-all text-xs font-black uppercase tracking-tight flex items-center gap-1 active:scale-90 cursor-pointer",
                                          isSelected
                                            ? option.color === "emerald" &&
                                                "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100 scale-105"
                                            : "bg-white text-gray-400 hover:text-gray-900 border-gray-100 hover:bg-gray-50",
                                          isSelected
                                            ? option.color === "rose" &&
                                                "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-100 scale-105"
                                            : "",
                                          isSelected
                                            ? option.color === "amber" &&
                                                "bg-amber-505 border-amber-500 text-white shadow-md shadow-amber-100 scale-105"
                                            : "",
                                          isSelected
                                            ? option.color === "indigo" &&
                                                "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100 scale-105"
                                            : "",
                                        )}
                                      >
                                        <option.icon size={16} />
                                        {option.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="block md:hidden space-y-3.5 p-4 bg-gray-50/40">
                    {filteredTeachers.map((teacher) => {
                      const attendanceObj = staffAttendanceData[teacher._id];
                      const status = typeof attendanceObj === 'object' ? attendanceObj?.status : attendanceObj;
                      const markedAt = typeof attendanceObj === 'object' ? attendanceObj?.markedAt : null;
                      return (
                        <StaffAttendanceCard
                          key={teacher._id}
                          teacher={teacher}
                          status={status}
                          markedAt={markedAt}
                          isStaffMarked={isStaffMarked}
                          toggleStaffStatus={toggleStaffStatus}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Student Monthly History Grid View */}
        {activeTab === "student-history" && (
          <>
            <div className="p-6 sm:p-10 border-b border-gray-50 bg-gray-50/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <History size={20} className="text-indigo-600" />
                  Student History Grid
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                  Grid tracking student presence for{" "}
                  {months.find((m) => m.value === selectedMonth)?.label}{" "}
                  {selectedYear}
                </p>
              </div>
              <div className="w-full sm:w-64 relative group">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Filter by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-400 font-medium"
                />
              </div>
            </div>

            <div className="overflow-hidden">
              {loading ? (
                <div className="p-10">
                  <TableSkeleton rows={8} columns={10} />
                </div>
              ) : studentHistory.length === 0 ? (
                <EmptyState
                  title="No History Found"
                  description="No attendance logged for this class and date range yet."
                  actionLabel="Go to Dashboard"
                  onAction={() => {}}
                />
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left table-fixed border-collapse">
                    <thead>
                      <tr className="bg-gray-50/30 border-b border-gray-100">
                        {/* Name Info (Sticky Left) */}
                        <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest w-52 bg-white sticky left-0 z-10 border-r border-gray-100">
                          Student Name
                        </th>
                        {/* Dynamic Day Columns */}
                        {Array.from({ length: daysInMonth }).map((_, idx) => {
                          const day = idx + 1;
                          const weekend = isWeekend(
                            day,
                            selectedMonth,
                            selectedYear,
                          );
                          const dayName = getDayName(
                            day,
                            selectedMonth,
                            selectedYear,
                          );
                          return (
                            <th
                              key={day}
                              className={cn(
                                "py-3 text-center text-[10px] font-black w-10 border-r border-gray-100 min-w-[36px]",
                                weekend
                                  ? "bg-amber-50/30 text-amber-500 font-bold"
                                  : "text-gray-400",
                              )}
                            >
                              <div className="flex flex-col items-center">
                                <span>{day}</span>
                                <span className="text-[8px] font-bold opacity-60 mt-0.5">
                                  {dayName}
                                </span>
                              </div>
                            </th>
                          );
                        })}
                        {/* Stats Summary Column */}
                        <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest w-40 text-center border-l border-gray-100 bg-white">
                          Monthly Ratio (P/A/L/T)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {studentHistory
                        .filter((item) =>
                          (item.student?.fullName || "")
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()),
                        )
                        .map((item) => {
                          const records = item.attendance || {};

                          // Count stats for this student
                          let p = 0,
                            a = 0,
                            l = 0,
                            t = 0;
                          Object.values(records).forEach((status) => {
                            const val = status.toLowerCase();
                            if (val === "present") p++;
                            else if (val === "absent") a++;
                            else if (val === "leave") l++;
                            else if (val === "late") t++;
                          });

                          return (
                            <tr
                              key={item.student?._id}
                              className="group hover:bg-gray-50/30 transition-all duration-200"
                            >
                              {/* Student Details (Sticky Left) */}
                              <td className="px-6 py-4 bg-white sticky left-0 z-10 border-r border-gray-100 group-hover:bg-gray-50/50 transition-colors shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                                <div className="truncate">
                                  <p className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight text-xs">
                                    {item.student?.fullName || "N/A"}
                                  </p>
                                  <p className="text-[9px] text-gray-400 font-bold tracking-widest mt-0.5 uppercase">
                                    Roll: {item.student?.rollNumber}
                                  </p>
                                </div>
                              </td>

                              {/* Day Grid Cells */}
                              {Array.from({ length: daysInMonth }).map(
                                (_, idx) => {
                                  const day = idx + 1;
                                  const status = records[day];
                                  const badge = getStatusBadge(status);
                                  const weekend = isWeekend(
                                    day,
                                    selectedMonth,
                                    selectedYear,
                                  );

                                  return (
                                    <td
                                      key={day}
                                      className={cn(
                                        "p-1 border-r border-gray-100 text-center align-middle",
                                        weekend && !status
                                          ? "bg-gray-50/40"
                                          : "",
                                      )}
                                    >
                                      <div className="flex items-center justify-center">
                                        {status ? (
                                          <span
                                            title={status}
                                            className={cn(
                                              "w-7 h-7 rounded-full flex items-center justify-center font-black text-[10px] border shadow-sm",
                                              badge.className,
                                            )}
                                          >
                                            {badge.label}
                                          </span>
                                        ) : (
                                          <span className="text-[9px] font-black text-gray-200">
                                            -
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  );
                                },
                              )}

                              {/* Stats Summary Ratios */}
                              <td className="px-4 py-4 text-center font-bold text-xs bg-white border-l border-gray-100">
                                <div className="flex items-center justify-center gap-1.5">
                                  <span
                                    className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold"
                                    title="Present"
                                  >
                                    {p}
                                  </span>
                                  <span
                                    className="px-2 py-1 rounded bg-rose-50 text-rose-700 text-[10px] font-bold"
                                    title="Absent"
                                  >
                                    {a}
                                  </span>
                                  <span
                                    className="px-2 py-1 rounded bg-amber-50 text-amber-700 text-[10px] font-bold"
                                    title="Leave"
                                  >
                                    {l}
                                  </span>
                                  <span
                                    className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold"
                                    title="Late"
                                  >
                                    {t}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Staff Monthly History Grid View */}
        {activeTab === "staff-history" && (
          <>
            <div className="p-6 sm:p-10 border-b border-gray-50 bg-gray-50/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <History size={20} className="text-orange-500" />
                  Staff History Grid
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                  Grid tracking staff presence for{" "}
                  {months.find((m) => m.value === selectedMonth)?.label}{" "}
                  {selectedYear}
                </p>
              </div>
              <div className="w-full sm:w-64 relative group">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Filter by faculty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-400 font-medium"
                />
              </div>
            </div>

            <div className="overflow-hidden">
              {loading ? (
                <div className="p-10">
                  <TableSkeleton rows={6} columns={10} />
                </div>
              ) : staffHistory.length === 0 ? (
                <EmptyState
                  title="No History Found"
                  description="No staff attendance logged for this date range yet."
                  actionLabel="Go to Dashboard"
                  onAction={() => {}}
                />
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left table-fixed border-collapse">
                    <thead>
                      <tr className="bg-gray-50/30 border-b border-gray-100">
                        {/* Name Info (Sticky Left) */}
                        <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest w-52 bg-white sticky left-0 z-10 border-r border-gray-100">
                          Faculty Name
                        </th>
                        {/* Dynamic Day Columns */}
                        {Array.from({ length: daysInMonth }).map((_, idx) => {
                          const day = idx + 1;
                          const weekend = isWeekend(
                            day,
                            selectedMonth,
                            selectedYear,
                          );
                          const dayName = getDayName(
                            day,
                            selectedMonth,
                            selectedYear,
                          );
                          return (
                            <th
                              key={day}
                              className={cn(
                                "py-3 text-center text-[10px] font-black w-10 border-r border-gray-100 min-w-[36px]",
                                weekend
                                  ? "bg-amber-50/30 text-amber-500 font-bold"
                                  : "text-gray-400",
                              )}
                            >
                              <div className="flex flex-col items-center">
                                <span>{day}</span>
                                <span className="text-[8px] font-bold opacity-60 mt-0.5">
                                  {dayName}
                                </span>
                              </div>
                            </th>
                          );
                        })}
                        {/* Stats Summary Column */}
                        <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest w-40 text-center border-l border-gray-100 bg-white">
                          Monthly Ratio (P/A/L/T)
                        </th>
                        {/* Analytics Column */}
                        <th className="px-4 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest w-16 text-center border-l border-gray-100 bg-white">
                          Analysis
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {staffHistory
                        .filter((item) =>
                          (item.teacher?.fullName || "")
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()),
                        )
                        .map((item) => {
                          const records = item.attendance || {};

                          // Count stats for this teacher
                          let p = 0,
                            a = 0,
                            l = 0,
                            t = 0;
                          Object.values(records).forEach((status) => {
                            const val = status.toLowerCase();
                            if (val === "present") p++;
                            else if (val === "absent") a++;
                            else if (val === "leave") l++;
                            else if (val === "late") t++;
                          });

                          return (
                            <tr
                              key={item.teacher?._id}
                              className="group hover:bg-gray-50/30 transition-all duration-200"
                            >
                              {/* Faculty Details (Sticky Left) */}
                              <td className="px-6 py-4 bg-white sticky left-0 z-10 border-r border-gray-100 group-hover:bg-gray-50/50 transition-colors shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                                <div className="truncate">
                                  <p className="font-black text-gray-900 group-hover:text-orange-500 transition-colors uppercase tracking-tight text-xs">
                                    {item.teacher?.fullName || "N/A"}
                                  </p>
                                  <p className="text-[9px] text-gray-400 font-bold tracking-widest mt-0.5 uppercase">
                                    {item.teacher?.subject || "Subject"}
                                  </p>
                                </div>
                              </td>

                              {/* Day Grid Cells */}
                              {Array.from({ length: daysInMonth }).map(
                                (_, idx) => {
                                  const day = idx + 1;
                                  const status = records[day];
                                  const badge = getStatusBadge(status);
                                  const weekend = isWeekend(
                                    day,
                                    selectedMonth,
                                    selectedYear,
                                  );

                                  return (
                                    <td
                                      key={day}
                                      className={cn(
                                        "p-1 border-r border-gray-100 text-center align-middle",
                                        weekend && !status
                                          ? "bg-gray-50/40"
                                          : "",
                                      )}
                                    >
                                      <div className="flex items-center justify-center">
                                        {status ? (
                                          <span
                                            title={status}
                                            className={cn(
                                              "w-7 h-7 rounded-full flex items-center justify-center font-black text-[10px] border shadow-sm",
                                              badge.className,
                                            )}
                                          >
                                            {badge.label}
                                          </span>
                                        ) : (
                                          <span className="text-[9px] font-black text-gray-200">
                                            -
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  );
                                },
                              )}

                              {/* Stats Summary Ratios */}
                              <td className="px-4 py-4 text-center font-bold text-xs bg-white border-l border-gray-100">
                                <div className="flex items-center justify-center gap-1.5">
                                  <span
                                    className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold"
                                    title="Present"
                                  >
                                    {p}
                                  </span>
                                  <span
                                    className="px-2 py-1 rounded bg-rose-50 text-rose-700 text-[10px] font-bold"
                                    title="Absent"
                                  >
                                    {a}
                                  </span>
                                  <span
                                    className="px-2 py-1 rounded bg-amber-50 text-amber-700 text-[10px] font-bold"
                                    title="Leave"
                                  >
                                    {l}
                                  </span>
                                  <span
                                    className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold"
                                    title="Late"
                                  >
                                    {t}
                                  </span>
                                </div>
                              </td>

                              {/* Analytics Action Button */}
                              <td className="px-4 py-4 text-center bg-white border-l border-gray-100">
                                <button
                                  title="View Full Analytics"
                                  onClick={() =>
                                    navigate(
                                      `/reports/attendance/analysis/staff/${item.teacher?._id}`,
                                    )
                                  }
                                  className="p-2 rounded-xl text-gray-300 hover:text-orange-600 hover:bg-orange-50 transition-all active:scale-90"
                                >
                                  <BarChart2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Sticky Mobile Submit Button for Marking */}
      {(activeTab === "mark-students" || activeTab === "mark-staff") && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-gray-100 z-50 pb-safe-bottom flex flex-col gap-2 shadow-xl">
          {/* Submit for Review (visible on mobile only when student draft is saved) */}
          {activeTab === "mark-students" && isMarked && sessionStatus === 'draft' && (
            <Button
              className="w-full h-11 text-xs font-black uppercase tracking-wider shadow-sm rounded-xl transition-all border-blue-200 text-blue-700 bg-blue-50/70 hover:bg-blue-55 cursor-pointer"
              onClick={handleSubmitForReview}
              loading={loading}
              icon={Send}
            >
              Submit for Review
            </Button>
          )}

          <Button
            className={cn(
              "w-full h-11 text-xs font-black uppercase tracking-wider shadow-md rounded-xl transition-colors duration-200 cursor-pointer",
              (activeTab === "mark-students" ? (sessionStatus === 'submitted' || sessionStatus === 'locked') : isStaffMarked)
                ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            )}
            onClick={
              activeTab === "mark-students"
                ? handleStudentSubmit
                : handleStaffSubmit
            }
            loading={loading}
            icon={Save}
            disabled={
              activeTab === "mark-students"
                ? sessionStatus === 'submitted' || sessionStatus === 'locked'
                : isStaffMarked
            }
          >
            {activeTab === "mark-students"
              ? ((sessionStatus === 'submitted' || sessionStatus === 'locked')
                ? "Attendance Submitted"
                : "Submit Attendance")
              : (isStaffMarked ? "Attendance Submitted" : "Submit Attendance")}
          </Button>
        </div>
      )}

      {/* Synchronized Notification Banner */}
      {((activeTab === "mark-students" && isMarked) ||
        (activeTab === "mark-staff" && isStaffMarked)) && (
        <div className="bg-emerald-600 p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] flex items-center gap-4 md:gap-6 border border-emerald-500 shadow-2xl shadow-emerald-100 animate-in zoom-in-95 duration-500">
          <div className="w-10 h-10 md:w-16 md:h-16 bg-white/20 backdrop-blur-md text-white rounded-xl md:rounded-[1.5rem] flex items-center justify-center shadow-inner shrink-0">
            <CheckCircle className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div>
            <p className="font-black text-white text-sm md:text-xl tracking-tight uppercase">
              Records Synchronized
            </p>
            <p className="text-emerald-50 text-[10px] md:text-sm font-bold tracking-tight opacity-90 leading-snug mt-0.5">
              Attendance records have been securely uploaded to the system
              ledger.
            </p>
          </div>
          <div className="ml-auto hidden sm:block">
            <Button
              variant="secondary"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-2xl h-12"
              onClick={() =>
                activeTab === "mark-students"
                  ? setIsMarked(false)
                  : setIsStaffMarked(false)
              }
            >
              Modify Entry
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
