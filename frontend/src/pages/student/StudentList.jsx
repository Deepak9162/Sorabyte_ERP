import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Filter,
  LayoutGrid,
  List,
  ChevronDown,
  Contact2,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { jsPDF } from "jspdf";
import Button from "../../components/ui/Button";
import Skeleton, { TableSkeleton } from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import ConfirmModal from "../../components/ui/ConfirmModal";
import AppCombobox from "../../components/ui/AppCombobox";
import { useToast } from "../../context/ToastContext";
import { cn } from "../../utils/cn";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const StudentList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState(() => {
    return localStorage.getItem("student_list_search_query") || "";
  });
  const [filterClass, setFilterClass] = useState(() => {
    return localStorage.getItem("student_list_filter_class") || "all";
  });
  const [filterSection, setFilterSection] = useState(() => {
    return localStorage.getItem("student_list_filter_section") || "all";
  });
  const [filterStatus, setFilterStatus] = useState(() => {
    return localStorage.getItem("student_list_filter_status") || "all";
  });
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("student_list_view_mode") || "list";
  }); // 'list' or 'grid'

  useEffect(() => {
    localStorage.setItem("student_list_search_query", searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    localStorage.setItem("student_list_filter_class", filterClass);
  }, [filterClass]);

  useEffect(() => {
    localStorage.setItem("student_list_filter_section", filterSection);
  }, [filterSection]);

  useEffect(() => {
    localStorage.setItem("student_list_filter_status", filterStatus);
  }, [filterStatus]);

  useEffect(() => {
    localStorage.setItem("student_list_view_mode", viewMode);
  }, [viewMode]);
  
  // Selection State for Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(() => {
    return parseInt(localStorage.getItem("student_list_current_page")) || 1;
  });
  const [pageSize, setPageSize] = useState(() => {
    return parseInt(localStorage.getItem("student_list_page_size")) || 10;
  });

  useEffect(() => {
    localStorage.setItem("student_list_current_page", currentPage.toString());
  }, [currentPage]);

  useEffect(() => {
    localStorage.setItem("student_list_page_size", pageSize.toString());
  }, [pageSize]);

  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Export handlers
  const exportToExcel = async () => {
    try {
      setIsProcessing(true);
      const params = {
        limit: 1000,
        page: 1
      };
      
      if (filterClass !== "all") {
        if (filterClass.includes("-")) {
          const [clsName, secName] = filterClass.split("-");
          params.className = clsName;
          params.section = secName;
        } else {
          params.className = filterClass;
        }
      }
      if (filterSection !== "all") {
        params.section = filterSection;
      }
      if (filterStatus !== "all") {
        params.isActive = filterStatus === "active" ? "true" : "false";
      }

      const res = await api.get("/students", { params });
      if (!res.data.success || !res.data.data.students || res.data.data.students.length === 0) {
        addToast("No student records found to export", "warning");
        return;
      }

      const allStudents = res.data.data.students;

      // CSV Escaping
      const csvEscape = (val) => {
        if (val === null || val === undefined) return '""';
        let str = String(val);
        str = str.replace(/"/g, '""');
        return `"${str}"`;
      };

      const csvRows = [];
      
      let displayClass = filterClass;
      let displaySection = "";
      if (filterClass.includes("-")) {
        const parts = filterClass.split("-");
        displayClass = parts[0];
        displaySection = `Section ${parts[1]}`;
      }

      // Top Headers (Template style)
      csvRows.push([csvEscape("LITTLE FLOWER ENGLISH SCHOOL"), "", "", "", "", "", "", "", "", ""]);
      csvRows.push([csvEscape(`CLASS ROSTER: Class ${displayClass} ${displaySection ? `(${displaySection})` : ''}`.trim()), "", "", "", "", "", "", "", "", ""]);
      const sessionVal = allStudents[0]?.session || "2026-2027";
      csvRows.push([
        csvEscape(`Academic Session: ${sessionVal}`),
        csvEscape(`Total Students: ${allStudents.length}`),
        csvEscape(`Generated: ${new Date().toLocaleDateString('en-IN')}`),
        "", "", "", "", "", "", ""
      ]);
      csvRows.push(["", "", "", "", "", "", "", "", "", ""]); // separator
      
      const headers = [
        "Roll No",
        "Student ID",
        "Admission No",
        "Full Name",
        "Father's Name",
        "Mother's Name",
        "Mobile Number",
        "Address",
        "Admission Date",
        "Discount (%)",
        "Status"
      ];
      csvRows.push(headers.map(h => csvEscape(h)));

      allStudents.forEach((student) => {
        const admDate = student.admissionDate 
          ? new Date(student.admissionDate).toLocaleDateString('en-IN') 
          : "N/A";
        const parentsMobile = student.emergencyContact || student.phone || "N/A";
        
        const row = [
          student.rollNumber || "N/A",
          student.studentId || "PENDING",
          student.admissionNumber || "N/A",
          student.fullName || "N/A",
          student.fatherName || "N/A",
          student.motherName || "N/A",
          parentsMobile,
          student.address || "N/A",
          admDate,
          student.discountPercentage !== undefined ? `${student.discountPercentage}%` : "0%",
          student.status || "Active"
        ];
        csvRows.push(row.map(cell => csvEscape(cell)));
      });

      const csvContent = csvRows.map(e => e.join(",")).join("\n");
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `LFES_${filterClass.replace(/\s+/g, '_')}_Roster_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast("Excel/CSV export completed successfully!", "success");
    } catch (err) {
      console.error("CSV Export failed:", err);
      addToast("Failed to export class roster to CSV", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const exportToPDF = async () => {
    try {
      setIsProcessing(true);
      const params = {
        limit: 1000,
        page: 1
      };
      
      if (filterClass !== "all") {
        if (filterClass.includes("-")) {
          const [clsName, secName] = filterClass.split("-");
          params.className = clsName;
          params.section = secName;
        } else {
          params.className = filterClass;
        }
      }
      if (filterSection !== "all") {
        params.section = filterSection;
      }
      if (filterStatus !== "all") {
        params.isActive = filterStatus === "active" ? "true" : "false";
      }

      const res = await api.get("/students", { params });
      if (!res.data.success || !res.data.data.students || res.data.data.students.length === 0) {
        addToast("No student records found to export", "warning");
        return;
      }

      const allStudents = res.data.data.students;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const totalPagesExp = "{total_pages_count}";

      // Helper function to truncate text that exceeds maximum column width
      const truncateText = (text, maxWidth, fontStyle = "normal", fontSize = 8) => {
        if (!text) return "";
        doc.setFont("helvetica", fontStyle);
        doc.setFontSize(fontSize);
        if (doc.getTextWidth(text) <= maxWidth) return text;
        
        let truncated = text;
        while (truncated.length > 0 && doc.getTextWidth(truncated + "...") > maxWidth) {
          truncated = truncated.slice(0, -1);
        }
        return truncated + "...";
      };

      const drawPageDecorations = (pageNumber) => {
        // Top orange/coral accent bar
        doc.setFillColor(232, 93, 42); // #e85d2a
        doc.rect(0, 0, 210, 6, "F");

        // School Letterhead
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(43, 27, 23); // #2b1b17
        doc.text("LITTLE FLOWER ENGLISH SCHOOL", 105, 18, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(136, 124, 103); // #887c67
        doc.text("Educating for Excellence  |  Official Student Directory", 105, 23, { align: "center" });

        // Thin Separator Line
        doc.setDrawColor(233, 226, 211); // #e9e2d3
        doc.setLineWidth(0.3);
        doc.line(12, 26, 198, 26);
      };

      const drawTableHeader = (startY) => {
        // Table Header fill
        doc.setFillColor(238, 222, 191); // #eedebf
        doc.rect(12, startY, 186, 8, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(43, 27, 23); // #2b1b17

        doc.text("Roll", 14, startY + 5.5);
        doc.text("Student ID / Adm", 23, startY + 5.5);
        doc.text("Full Name / Disc.", 59, startY + 5.5);
        doc.text("Parents (F/M)", 90, startY + 5.5);
        doc.text("Mobile No", 122, startY + 5.5);
        doc.text("Address", 143, startY + 5.5);
        doc.text("Status", 181, startY + 5.5);
      };

      const drawFooter = (pageNum) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(168, 157, 135); // #a89d87
        doc.text(`Page ${pageNum} of ${totalPagesExp}`, 105, 287, { align: "center" });
        doc.text("Meerut Road, Little Flower Campus, Siwan, Bihar - 841506", 12, 287);
        doc.text("Confidential School Record", 198, 287, { align: "right" });
      };

      let pageNum = 1;
      drawPageDecorations(pageNum);

      let displayClass = filterClass;
      let displaySection = "All Sections";
      if (filterClass.includes("-")) {
        const parts = filterClass.split("-");
        displayClass = parts[0];
        displaySection = `Section ${parts[1]}`;
      }

      // Metadata card
      doc.setFillColor(253, 253, 251); // #fdfdfb
      doc.setDrawColor(233, 226, 211);
      doc.rect(12, 30, 186, 15, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(43, 27, 23);
      doc.text(`Class: ${displayClass}`, 16, 35.5);
      doc.text(`Section: ${displaySection}`, 16, 40.5);

      const sessionVal = allStudents[0]?.session || "2026-2027";
      doc.text(`Session: ${sessionVal}`, 85, 35.5);
      doc.text(`Total Students: ${allStudents.length}`, 85, 40.5);

      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 145, 35.5);
      doc.text(`Status Filter: ${filterStatus === 'all' ? 'All Records' : filterStatus === 'active' ? 'Active Only' : 'Inactive Only'}`, 145, 40.5);

      let y = 51;
      drawTableHeader(y);
      y += 8;

      const rowHeight = 11;

      allStudents.forEach((student, index) => {
        if (y + rowHeight > 272) {
          drawFooter(pageNum);
          doc.addPage();
          pageNum++;
          drawPageDecorations(pageNum);
          y = 32;
          drawTableHeader(y);
          y += 8;
        }

        if (index % 2 === 1) {
          doc.setFillColor(253, 253, 251);
          doc.rect(12, y, 186, rowHeight, "F");
        }

        doc.setDrawColor(245, 242, 233);
        doc.setLineWidth(0.2);
        doc.line(12, y + rowHeight, 198, y + rowHeight);

        const admDate = student.admissionDate 
          ? new Date(student.admissionDate).toLocaleDateString('en-IN') 
          : "N/A";

        // Draw Line 1
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(43, 27, 23);
        doc.text(truncateText(student.rollNumber || "N/A", 7, "bold", 8.5), 14, y + 4.5);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(truncateText(student.studentId || "PENDING", 32, "normal", 8), 23, y + 4.5);

        doc.setFont("helvetica", "bold");
        doc.text(truncateText(student.fullName || "N/A", 28, "bold", 8), 59, y + 4.5);

        doc.setFont("helvetica", "normal");
        doc.text(truncateText(`F: ${student.fatherName || "N/A"}`, 29, "normal", 8), 90, y + 4.5);
        
        doc.text(truncateText(student.emergencyContact || "N/A", 19, "normal", 8), 122, y + 4.5);

        const fullAddr = student.address || "N/A";
        // Calculate wrapping address dynamically using splitTextToSize
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const addrLines = doc.splitTextToSize(fullAddr, 35);
        const addrPart1 = addrLines[0] || "N/A";
        let addrPart2 = addrLines[1] || "";
        if (addrLines.length > 2) {
          addrPart2 = truncateText(addrLines.slice(1).join(" "), 35, "normal", 7.5);
        }

        doc.text(addrPart1, 143, y + 4.5);

        const isStudentActive = (student.status || "Active").toLowerCase() === "active";
        if (isStudentActive) {
          doc.setTextColor(29, 138, 67); // Emerald 600
        } else {
          doc.setTextColor(207, 79, 32); // Orange/Red 700
        }
        doc.setFont("helvetica", "bold");
        doc.text(truncateText(student.status || "Active", 15, "bold", 8.5), 181, y + 4.5);

        // Draw Line 2
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(136, 124, 103);
        
        doc.text(`Adm: ${admDate}`, 23, y + 9);
        doc.text(`Disc: ${student.discountPercentage || 0}%`, 59, y + 9);
        doc.text(truncateText(`M: ${student.motherName || "N/A"}`, 29, "normal", 7.5), 90, y + 9);
        
        if (student.phone && student.phone !== student.emergencyContact) {
          doc.text(truncateText(`Alt: ${student.phone}`, 19, "normal", 7.5), 122, y + 9);
        }

        if (addrPart2) {
          doc.text(addrPart2, 143, y + 9);
        }

        y += rowHeight;
      });

      drawFooter(pageNum);

      if (typeof doc.putTotalPages === "function") {
        doc.putTotalPages(totalPagesExp);
      }

      doc.save(`LFES_${filterClass.replace(/\s+/g, '_')}_Roster_${Date.now()}.pdf`);
      addToast("PDF export completed successfully!", "success");
    } catch (err) {
      console.error("PDF Export failed:", err);
      addToast("Failed to export class roster to PDF", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Dynamic API host resolution for static assets (studentPhoto)
  const apiHost = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : "";

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: pageSize,
      };

      if (filterClass !== "all") {
        if (filterClass.includes("-")) {
          const [clsName, secName] = filterClass.split("-");
          params.className = clsName;
          params.section = secName;
        } else {
          params.className = filterClass;
        }
      }

      if (filterSection !== "all") {
        params.section = filterSection;
      }

      if (filterStatus !== "all") {
        params.isActive = filterStatus === "active" ? "true" : "false";
      }

      const res = await api.get("/students", { params });
      if (res.data.success) {
        setStudents(res.data.data.students || []);
        if (res.data.data.pagination) {
          setTotalPages(res.data.data.pagination.totalPages || 1);
          setTotalStudents(res.data.data.pagination.total || 0);
        }
      }
    } catch (error) {
      console.error("Fetch students error:", error);
      addToast("Failed to fetch students from server", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    if (!user) return;
    try {
      const endpoint =
        user?.role === "teacher"
          ? "/timetable/teacher/assigned-classes"
          : "/admin/classes";
      const res = await api.get(endpoint);
      if (res.data.success) {
        setClasses(res.data.data || []);
      }
    } catch (error) {
      console.error("Fetch classes error:", error);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [user]);

  useEffect(() => {
    fetchStudents();
    setSelectedIds([]); // Clear selection when filters change
  }, [currentPage, pageSize, filterClass, filterSection, filterStatus]);

  const handleDelete = async () => {
    if (!selectedStudent) return;
    setIsProcessing(true);
    try {
      const res = await api.delete(`/students/${selectedStudent._id}`);
      if (res.data.success) {
        addToast("Student record deactivated successfully");
        fetchStudents();
      }
    } catch (error) {
      console.error("Delete student error:", error);
      addToast("Failed to deactivate student record", "error");
    } finally {
      setIsDeleteConfirmOpen(false);
      setIsProcessing(false);
      setSelectedStudent(null);
    }
  };

  // Client side quick search
  const searchedStudents = students.filter((s) => {
    const fullName = (s.fullName || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      fullName.includes(query) ||
      (s.rollNumber && s.rollNumber.toLowerCase().includes(query)) ||
      (s.studentId && s.studentId.toLowerCase().includes(query)) ||
      (s.admissionNumber && s.admissionNumber.toLowerCase().includes(query));
    
    return matchesSearch;
  });

  // Bulk selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(searchedStudents.map((s) => s._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">
            Students Directory
          </h2>
          <p className="text-gray-500 font-medium italic mt-1">
            Manage academic profiles, student enrollments, and printable ID credentials.
          </p>
        </div>
        <Button
          onClick={() => navigate("/students/new")}
          icon={Plus}
          className="h-13 rounded-2xl shadow-lg shadow-indigo-100 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
        >
          Enroll Student
        </Button>
      </div>

      {/* 2. Controls and Filters */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          
          {/* Search bar */}
          <div className="lg:col-span-4 relative group">
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by name, roll, ID, admission..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-13 pr-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-semibold focus:ring-4 focus:ring-indigo-50/50 focus:bg-white outline-none transition-all"
            />
          </div>

          {/* Filter: Class */}
          <div className="lg:col-span-3">
            <AppCombobox
              placeholder="All Classes"
              searchPlaceholder="Search class..."
              emptyText="No classes found"
              clearable
              value={filterClass === "all" ? "" : filterClass}
              onChange={(val) => {
                setFilterClass(val || "all");
                setCurrentPage(1);
              }}
              options={classes.map((c) => ({
                value: c.name,
                label: c.name,
              }))}
            />
          </div>

          {/* Filter: Status */}
          <div className="lg:col-span-2">
            <AppCombobox
              placeholder="All Statuses"
              searchable={false}
              value={filterStatus === "all" ? "" : filterStatus}
              onChange={(val) => {
                setFilterStatus(val || "all");
                setCurrentPage(1);
              }}
              options={[
                { value: "active", label: "Active Only" },
                { value: "inactive", label: "Inactive Only" },
              ]}
            />
          </div>

          {/* View Mode Toggle */}
          <div className="lg:col-span-1.5 flex items-center justify-end gap-1 border-l border-gray-100 pl-4 h-9">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 rounded-xl transition-all",
                viewMode === "list" ? "bg-indigo-50 text-indigo-600" : "text-gray-400 hover:bg-gray-50"
              )}
              title="List View"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 rounded-xl transition-all",
                viewMode === "grid" ? "bg-indigo-50 text-indigo-600" : "text-gray-400 hover:bg-gray-50"
              )}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>
        
        {/* Export buttons row - only visible when filterClass !== "all" */}
        {filterClass !== "all" && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100/70 animate-in fade-in duration-300">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Class Export Options:
              </span>
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100/30 uppercase">
                {filterClass}
              </span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                disabled={isProcessing}
                onClick={exportToExcel}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/50 text-emerald-700 hover:text-emerald-800 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                <FileSpreadsheet size={15} />
                <span>Export to Excel</span>
              </button>
              <button
                disabled={isProcessing}
                onClick={exportToPDF}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 border border-transparent text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                <FileText size={15} />
                <span>Export to PDF</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Directory */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col justify-between">
        <div className="flex-1">
          {loading ? (
            <div className="p-8">
              {viewMode === "list" ? (
                <TableSkeleton rows={6} columns={6} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-56 bg-gray-50 rounded-3xl animate-pulse" />
                  ))}
                </div>
              )}
            </div>
          ) : searchedStudents.length === 0 ? (
            <EmptyState
              title="No students found"
              description={
                searchQuery
                  ? `No records matched your search query "${searchQuery}"`
                  : "Start enrolling your students to see them in the directory."
              }
              actionLabel={searchQuery ? "Clear Search" : "Enroll New Student"}
              onAction={() => (searchQuery ? setSearchQuery("") : navigate("/students/new"))}
            />
          ) : viewMode === "list" ? (
            /* Table View */
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-8 py-5 text-left w-12">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        checked={searchedStudents.length > 0 && selectedIds.length === searchedStudents.length}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      Student Details
                    </th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      Admission No
                    </th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      Student ID
                    </th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      Class & Section
                    </th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      Emergency contact
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {searchedStudents.map((student) => {
                    // Resolve photo URL
                    const photoUrl = student.studentPhoto
                      ? (student.studentPhoto.startsWith("http") || student.studentPhoto.startsWith("data:")
                        ? student.studentPhoto
                        : `${apiHost}${student.studentPhoto}`)
                      : null;

                    return (
                      <tr
                        key={student._id}
                        className={cn(
                          "group hover:bg-gray-50/50 transition-all duration-300",
                          selectedIds.includes(student._id) && "bg-indigo-50/15"
                        )}
                      >
                        <td className="px-8 py-4.5 text-left w-12">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            checked={selectedIds.includes(student._id)}
                            onChange={() => handleSelectOne(student._id)}
                          />
                        </td>
                        <td className="px-8 py-4.5">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center font-black shadow-inner overflow-hidden uppercase shrink-0">
                              {photoUrl ? (
                                <img
                                  src={photoUrl}
                                  alt={student.fullName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{student.fullName ? student.fullName.charAt(0) : "S"}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors capitalize">
                                {student.fullName}
                              </p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                Roll No: {student.rollNumber || "N/A"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4.5 text-xs font-semibold text-gray-700">
                          {student.admissionNumber || "N/A"}
                        </td>
                        <td className="px-6 py-4.5">
                          <span className="font-mono text-xs font-semibold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100/50">
                            {student.studentId || "PENDING"}
                          </span>
                        </td>
                        <td className="px-6 py-4.5">
                          <span className="px-3 py-1 bg-indigo-50/50 text-indigo-700 rounded-lg text-[10px] font-bold uppercase border border-indigo-100/30">
                            {student.className} - {student.section}
                          </span>
                        </td>
                        <td className="px-6 py-4.5">
                          <span
                            className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1.5 border",
                              student.status === "Active"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : "bg-rose-50 text-rose-700 border-rose-100"
                            )}
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                student.status === "Active" ? "bg-emerald-500" : "bg-rose-500"
                              )}
                            />
                            {student.status || "Active"}
                          </span>
                        </td>
                        <td className="px-6 py-4.5">
                          <p className="text-xs font-bold text-gray-800">
                            {student.fatherName || student.motherName || "N/A"}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                            {student.emergencyContact || "N/A"}
                          </p>
                        </td>
                        <td className="px-8 py-4.5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300">
                            <button
                              onClick={() => navigate(`/students/${student.studentId || student._id}`)}
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                              title="View Profile"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => navigate(`/students/${student.studentId || student._id}/idcard`)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              title="Print / Download Student ID Card"
                            >
                              <Contact2 size={16} />
                            </button>
                            <button
                              onClick={() => navigate(`/students/edit/${student._id}`)}
                              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                              title="Edit Student"
                            >
                              <Edit2 size={16} />
                            </button>
                            {user?.role === "admin" && (
                              <button
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setIsDeleteConfirmOpen(true);
                                }}
                                className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title="Delete Record"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid View */
            <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchedStudents.map((student) => {
                const photoUrl = student.studentPhoto
                  ? (student.studentPhoto.startsWith("http") || student.studentPhoto.startsWith("data:")
                    ? student.studentPhoto
                    : `${apiHost}${student.studentPhoto}`)
                  : null;

                return (
                  <div
                    key={student._id}
                    className={cn(
                      "group relative border border-gray-100 bg-white rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-300 flex flex-col justify-between animate-in fade-in",
                      selectedIds.includes(student._id) && "border-indigo-500 shadow-lg shadow-indigo-50/20"
                    )}
                  >
                    {/* Floating check box */}
                    <input
                      type="checkbox"
                      className="absolute top-4 right-4 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer print:hidden z-10"
                      checked={selectedIds.includes(student._id)}
                      onChange={() => handleSelectOne(student._id)}
                    />

                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center font-black shadow-inner overflow-hidden uppercase text-lg shrink-0">
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt={student.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{student.fullName ? student.fullName.charAt(0) : "S"}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                            {student.fullName}
                          </h4>
                          <span className="font-mono text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                            ID: {student.studentId || "PENDING"}
                          </span>
                        </div>
                      </div>

                      {/* Stats List */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="p-3 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block leading-none">
                            Class/Section
                          </span>
                          <span className="text-xs font-bold text-gray-700 block mt-1.5 truncate">
                            {student.className} - {student.section}
                          </span>
                        </div>
                        <div className="p-3 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block leading-none">
                            Roll Number
                          </span>
                          <span className="text-xs font-bold text-gray-700 block mt-1.5">
                            {student.rollNumber || "N/A"}
                          </span>
                        </div>
                      </div>

                      {/* Contact detail */}
                      <div className="space-y-1 py-1.5 border-t border-b border-gray-50">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Emergency Info</p>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-gray-600 truncate max-w-[120px]">
                            {student.fatherName || student.motherName || "N/A"}
                          </span>
                          <span className="text-gray-400 font-semibold font-mono">{student.emergencyContact || "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions footer */}
                    <div className="flex items-center justify-between gap-3 pt-5 mt-4">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border inline-flex items-center gap-1",
                          student.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-100"
                        )}
                      >
                        <span className={cn("w-1 h-1 rounded-full", student.status === "Active" ? "bg-emerald-500" : "bg-rose-500")} />
                        {student.status || "Active"}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => navigate(`/students/${student.studentId || student._id}`)}
                          className="p-2 text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded-xl transition-all"
                          title="View Profile"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => navigate(`/students/${student.studentId || student._id}/idcard`)}
                          className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-xl transition-all"
                          title="Print ID Card"
                        >
                          <Contact2 size={15} />
                        </button>
                        <button
                          onClick={() => navigate(`/students/edit/${student._id}`)}
                          className="p-2 text-gray-400 hover:text-emerald-600 bg-gray-50 hover:bg-emerald-50 rounded-xl transition-all"
                          title="Edit Details"
                        >
                          <Edit2 size={15} />
                        </button>
                        {user?.role === "admin" && (
                          <button
                            onClick={() => {
                              setSelectedStudent(student);
                              setIsDeleteConfirmOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-rose-600 bg-gray-50 hover:bg-rose-50 rounded-xl transition-all"
                            title="Unenroll"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Directory Pagination */}
        {totalPages > 1 && (
          <div className="px-8 py-5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm font-semibold text-gray-500">
            <div className="flex items-center gap-3">
              <span>Show</span>
              <select
                className="bg-gray-50 border border-gray-100 text-gray-700 font-bold px-2 py-1 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none cursor-pointer"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>records</span>
            </div>

            <div className="flex items-center gap-6">
              <span>
                Showing <strong className="text-gray-800">{searchedStudents.length}</strong> of{" "}
                <strong className="text-gray-800">{totalStudents}</strong> students
              </span>

              <div className="flex items-center gap-2 border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className={cn(
                    "px-4 py-2 hover:bg-gray-50 border-r border-gray-100 font-bold",
                    currentPage === 1 ? "text-gray-300 bg-gray-50 cursor-not-allowed" : "text-gray-700"
                  )}
                >
                  Previous
                </button>
                <div className="px-4 py-2 font-bold text-gray-800 bg-indigo-50 text-indigo-700">
                  {currentPage} of {totalPages}
                </div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className={cn(
                    "px-4 py-2 hover:bg-gray-50 font-bold",
                    currentPage === totalPages ? "text-gray-300 bg-gray-50 cursor-not-allowed" : "text-gray-700"
                  )}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md border border-slate-800 text-white px-8 py-4.5 rounded-[2rem] shadow-2xl z-[80] flex items-center gap-8 animate-in slide-in-from-bottom-10 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse" />
            <span className="text-sm font-black tracking-tight">
              {selectedIds.length} {selectedIds.length === 1 ? "student" : "students"} selected
            </span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/students/bulk-idcards?ids=${selectedIds.join(",")}`)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-xs font-bold text-white rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer border border-transparent"
            >
              <Contact2 size={14} />
              <span>
                {selectedIds.length === 1
                  ? "Generate ID Card"
                  : `Generate Bulk ID Cards (${selectedIds.length})`}
              </span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-bold text-slate-300 rounded-xl transition-all"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Unenroll Confirm Modal */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        loading={isProcessing}
        title="Unenroll Student"
        message={`Are you sure you want to deactivate ${selectedStudent?.fullName}'s active enrollment records? They will be marked as inactive.`}
      />
    </div>
  );
};

export default StudentList;
