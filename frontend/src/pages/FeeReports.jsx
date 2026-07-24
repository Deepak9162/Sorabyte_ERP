import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  FileText,
  Download,
  Printer,
  Filter,
  Search,
  Users,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building2,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  FileSpreadsheet,
  Sparkles,
  RefreshCw,
  Clock,
  UserCheck,
  ShieldAlert,
  Coins
} from "lucide-react";
import Button from "../components/ui/Button";
import { TableSkeleton } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import AppCombobox from "../components/ui/AppCombobox";
import { useToast } from "../context/ToastContext";
import { cn } from "../utils/cn";
import { formatToINR } from "../utils/format";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

const SCHOOL_NAME = "LITTLE FLOWER ENGLISH SCHOOL";
const SCHOOL_ADDRESS = "Siwan, Bihar";
const SCHOOL_TAGLINE = "Nurturing Minds, Building Futures";

const formatPDFCurrency = (amount) => `Rs. ${Number(amount || 0).toLocaleString("en-IN")}`;

const monthsList = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March"
];

const FeeReports = () => {
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Filters State
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [selectedClass, setSelectedClass] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState("ALL");
  const [reportType, setReportType] = useState("class-summary");
  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Master Data
  const [classes, setClasses] = useState([]);
  const [studentsList, setStudentsList] = useState([]);

  // Report Execution State
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(null); // 'pdf' | 'excel'

  // Pagination for large preview tables
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // 1. Fetch Classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/admin/classes");
        if (res.data.success) {
          setClasses(res.data.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch classes for reports:", err);
      }
    };
    fetchClasses();
  }, []);

  // 2. Fetch Student List for student combobox when student-statement is chosen or class changes
  useEffect(() => {
    if (reportType !== "student-statement") return;
    const fetchStudentsForSearch = async () => {
      try {
        let url = "/students?limit=2000";
        if (selectedClass && selectedClass !== "ALL") {
          url += `&classId=${selectedClass}`;
        }
        const res = await api.get(url);
        if (res.data.success) {
          const list = res.data.data.students || res.data.data || [];
          setStudentsList(list);
        }
      } catch (err) {
        console.error("Failed to fetch students for combobox:", err);
      }
    };
    fetchStudentsForSearch();
  }, [reportType, selectedClass]);

  // Options for Student Combobox
  const studentComboboxOptions = useMemo(() => {
    return studentsList.map((s) => ({
      value: s._id,
      label: `${s.fullName || "Student"} (Roll: ${s.rollNumber || "-"}, ID: ${s.studentId || "-"})`,
    }));
  }, [studentsList]);

  // Handle Generate Report
  const handleGenerateReport = async () => {
    if (reportType === "student-statement" && !selectedStudent) {
      addToast("Please select a student to generate the Student-wise Statement", "error");
      return;
    }

    setLoading(true);
    setCurrentPage(1);
    try {
      const res = await api.get("/fees/reports", {
        params: {
          academicYear,
          classId: selectedClass,
          month: selectedMonth,
          reportType,
          paymentStatus,
          studentId: selectedStudent?.value || selectedStudent || null,
        },
      });

      if (res.data.success) {
        setReportData(res.data.data);
        addToast("Fee report generated successfully", "success");
      }
    } catch (err) {
      console.error("Error generating fee report:", err);
      addToast(err.response?.data?.message || "Failed to generate fee report", "error");
    } finally {
      setLoading(false);
    }
  };

  // Status Badge styling helper
  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case "PAID":
        return { label: "PAID", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "PARTIAL":
        return { label: "PARTIAL", className: "bg-amber-50 text-amber-700 border-amber-200" };
      case "DUE":
      case "UNPAID":
        return { label: "DUE", className: "bg-rose-50 text-rose-700 border-rose-200" };
      case "EXEMPTED":
        return { label: "EXEMPTED", className: "bg-slate-50 text-slate-600 border-slate-200" };
      default:
        return { label: status || "-", className: "bg-gray-50 text-gray-600 border-gray-200" };
    }
  };

  // Client-side pagination slice for preview table
  const paginatedDetails = useMemo(() => {
    if (!reportData?.details) return [];
    const start = (currentPage - 1) * pageSize;
    return reportData.details.slice(start, start + pageSize);
  }, [reportData, currentPage]);

  const totalDetailPages = useMemo(() => {
    if (!reportData?.details) return 1;
    return Math.ceil(reportData.details.length / pageSize) || 1;
  }, [reportData]);

  // ─────────────────────────────────────────────────────────
  // PDF EXPORT HANDLER (Native jsPDF rendering)
  // ─────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (!reportData) return;
    setExportLoading("pdf");

    try {
      const isLandscape = reportType === "class-month-detail" || reportType === "student-statement";
      const doc = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 10;
      const generatedAtStr = new Date(reportData.metadata.generatedAt || Date.now()).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const selectedClassName = selectedClass === "ALL" ? "All Classes" : (classes.find((c) => c._id === selectedClass)?.name || selectedClass);
      const selectedMonthName = selectedMonth === "ALL" ? "All Months" : selectedMonth;
      const reportTitleStr = reportType === "class-summary"
        ? "CLASS-WISE FEE SUMMARY REPORT"
        : reportType === "month-summary"
        ? "MONTH-WISE FEE SUMMARY REPORT"
        : reportType === "student-statement"
        ? "STUDENT FEE STATEMENT"
        : "CLASS & MONTH DETAILED FEE REPORT";

      const drawHeaderAndFooter = (pageNum, totalPages) => {
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageW, 22, "F");

        doc.setFillColor(234, 88, 12);
        doc.rect(0, 22, pageW, 1.2, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(255, 255, 255);
        doc.text(SCHOOL_NAME, margin, 10);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`${SCHOOL_ADDRESS}  •  ${SCHOOL_TAGLINE}`, margin, 16);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(251, 146, 60);
        doc.text("OFFICIAL FINANCIAL LEDGER REPORT", pageW - margin, 12, { align: "right" });

        // Footer
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, pageH - 10, pageW - margin, pageH - 10);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(`${SCHOOL_NAME} ERP System`, margin, pageH - 5);

        doc.setFont("helvetica", "normal");
        doc.text(`Generated: ${generatedAtStr}`, pageW / 2, pageH - 5, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.text(`Page ${pageNum} of ${totalPages}`, pageW - margin, pageH - 5, { align: "right" });
      };

      // Draw Top Info Card
      let y = 27;
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageW - margin * 2, 10, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, pageW - margin * 2, 10);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(reportTitleStr, margin + 4, y + 6.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 64, 175);
      doc.text(`Session: ${academicYear} | Class: ${selectedClassName} | Month: ${selectedMonthName}`, pageW - margin - 4, y + 6.5, { align: "right" });

      y += 14;

      // Summary Metric Cards Box
      const summaryBoxW = (pageW - margin * 2) / 4;
      const summaryBoxH = 10;
      const summaryItems = [
        { label: "TOTAL STUDENTS", val: String(reportData.summary.totalStudents || 0) },
        { label: "TOTAL EXPECTED", val: formatPDFCurrency(reportData.summary.totalExpectedFee || 0) },
        { label: "TOTAL COLLECTED", val: formatPDFCurrency(reportData.summary.totalCollected || 0) },
        { label: "TOTAL DUE", val: formatPDFCurrency(reportData.summary.totalDue || 0) },
      ];

      summaryItems.forEach((box, idx) => {
        const bx = margin + idx * summaryBoxW;
        doc.setFillColor(255, 255, 255);
        doc.rect(bx, y, summaryBoxW - 2, summaryBoxH, "F");
        doc.setDrawColor(226, 232, 240);
        doc.rect(bx, y, summaryBoxW - 2, summaryBoxH);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text(box.label, bx + (summaryBoxW - 2) / 2, y + 3.5, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(box.val, bx + (summaryBoxW - 2) / 2, y + 8, { align: "center" });
      });

      y += summaryBoxH + 6;

      // Render Native PDF Table
      let headers = [];
      let rowsData = [];
      let colWidths = [];

      if (reportType === "class-summary") {
        headers = ["S.No.", "Class", "Total Students", "Paid", "Partial", "Due", "Expected Fee", "Collected Fee", "Due Amount"];
        rowsData = (reportData.classSummary || []).map((row, idx) => [
          String(idx + 1),
          `Class ${row.className}`,
          String(row.totalStudents),
          String(row.paidStudents),
          String(row.partiallyPaidStudents),
          String(row.dueStudents),
          formatPDFCurrency(row.totalExpectedFee),
          formatPDFCurrency(row.totalCollected),
          formatPDFCurrency(row.totalDue),
        ]);
        const availW = pageW - margin * 2;
        colWidths = [12, 28, 22, 18, 18, 18, 25, 25, availW - 166];
      } else if (reportType === "month-summary") {
        headers = ["S.No.", "Month", "Total Students", "Paid Students", "Due Students", "Expected Fee", "Collected Fee", "Due Amount"];
        rowsData = (reportData.monthSummary || []).map((row, idx) => [
          String(idx + 1),
          row.month,
          String(row.totalStudents),
          String(row.paidStudents),
          String(row.dueStudents),
          formatPDFCurrency(row.totalExpectedFee),
          formatPDFCurrency(row.totalCollected),
          formatPDFCurrency(row.totalDue),
        ]);
        const availW = pageW - margin * 2;
        colWidths = [12, 30, 25, 22, 22, 28, 28, availW - 167];
      } else if (reportType === "student-statement" && reportData.details?.length > 0) {
        const studentObj = reportData.details[0];
        headers = ["Month", "Expected Fee", "Paid Amount", "Due Amount", "Payment Status"];
        rowsData = (studentObj.monthBreakdown || []).map((mb) => [
          mb.month,
          formatPDFCurrency(mb.expected),
          formatPDFCurrency(mb.paid),
          formatPDFCurrency(mb.due),
          mb.status,
        ]);
        const availW = pageW - margin * 2;
        colWidths = [40, 50, 50, 50, availW - 190];
      } else {
        headers = ["S.No.", "Roll", "Student Name", "Class", "Father Name", "Contact", "Expected", "Paid", "Due", "Status"];
        rowsData = (reportData.details || []).map((row, idx) => [
          String(idx + 1),
          String(row.rollNumber),
          row.fullName,
          `Cls ${row.className}`,
          row.fatherName,
          row.parentPhone,
          formatPDFCurrency(row.totalFee),
          formatPDFCurrency(row.paidAmount),
          formatPDFCurrency(row.dueAmount),
          row.paymentStatus,
        ]);
        const availW = pageW - margin * 2;
        colWidths = [10, 15, 45, 18, 40, 26, 26, 26, 26, availW - 232];
      }

      const rowH = 7.5;
      const headerH = 8.5;
      let currY = y;

      const drawTableHeaderRow = (targetY) => {
        doc.setFillColor(15, 23, 42);
        doc.rect(margin, targetY, pageW - margin * 2, headerH, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);

        let cx = margin;
        headers.forEach((hText, hIdx) => {
          doc.text(hText, cx + 2, targetY + 5.5);
          cx += colWidths[hIdx] || 20;
        });
      };

      drawTableHeaderRow(currY);
      currY += headerH;

      rowsData.forEach((rowCells, rIdx) => {
        if (currY + rowH > pageH - 25) {
          doc.addPage();
          currY = 27;
          drawTableHeaderRow(currY);
          currY += headerH;
        }

        doc.setFillColor(rIdx % 2 === 0 ? 255 : 248, rIdx % 2 === 0 ? 255 : 250, rIdx % 2 === 0 ? 255 : 252);
        doc.rect(margin, currY, pageW - margin * 2, rowH, "F");
        doc.setDrawColor(241, 245, 249);
        doc.rect(margin, currY, pageW - margin * 2, rowH);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(30, 41, 59);

        let cx = margin;
        rowCells.forEach((cText, cIdx) => {
          const textStr = String(cText || "");
          const truncated = textStr.length > 28 ? textStr.substring(0, 25) + "..." : textStr;
          doc.text(truncated, cx + 2, currY + 5);
          cx += colWidths[cIdx] || 20;
        });

        currY += rowH;
      });

      // Signature Block
      let finalY = currY + 12;
      if (finalY > pageH - 35) {
        doc.addPage();
        finalY = 30;
      }

      const sigW = (pageW - margin * 2) / 3;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);

      doc.line(margin + 5, finalY + 10, margin + sigW - 10, finalY + 10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Prepared By", margin + sigW / 2 - 5, finalY + 14, { align: "center" });

      doc.line(margin + sigW + 5, finalY + 10, margin + sigW * 2 - 10, finalY + 10);
      doc.text("Accountant Signature", margin + sigW + sigW / 2 - 5, finalY + 14, { align: "center" });

      doc.line(margin + sigW * 2 + 5, finalY + 10, pageW - margin - 5, finalY + 10);
      doc.text("School Seal & Stamp", pageW - margin - sigW / 2 + 5, finalY + 14, { align: "center" });

      // Apply Header & Footer to all pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawHeaderAndFooter(i, totalPages);
      }

      doc.save(`Fee_Report_${selectedClassName}_${selectedMonthName}_${Date.now()}.pdf`);
    } catch (err) {
      console.error("PDF Export error:", err);
      addToast("Failed to generate PDF export", "error");
    } finally {
      setExportLoading(null);
    }
  };

  // ─────────────────────────────────────────────────────────
  // EXCEL EXPORT HANDLER
  // ─────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (!reportData) return;
    setExportLoading("excel");

    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary Overview
      const summaryRows = [
        [SCHOOL_NAME],
        [`FEE COLLECTION REPORT — ${academicYear}`],
        [`Class: ${selectedClass === "ALL" ? "All Classes" : selectedClass}  |  Month: ${selectedMonth}  |  Status: ${paymentStatus}`],
        [`Generated On: ${new Date().toLocaleString("en-IN")}`],
        [],
        ["METRIC", "VALUE"],
        ["Total Students", reportData.summary.totalStudents],
        ["Paid Students", reportData.summary.paidStudents],
        ["Partially Paid Students", reportData.summary.partiallyPaidStudents],
        ["Due Students", reportData.summary.dueStudents],
        ["Total Expected Fee (₹)", reportData.summary.totalExpectedFee],
        ["Total Collected (₹)", reportData.summary.totalCollected],
        ["Total Due Amount (₹)", reportData.summary.totalDue],
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      wsSummary["!cols"] = [{ wch: 30 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      // Sheet 2: Student Details
      let detailRows = [];
      let colWidths = [];

      if (reportType === "class-summary") {
        detailRows = [
          ["S.No.", "Class", "Total Students", "Paid Students", "Partial Students", "Due Students", "Expected Fee", "Collected Fee", "Due Amount"],
          ...(reportData.classSummary || []).map((row, idx) => [
            idx + 1,
            `Class ${row.className}`,
            row.totalStudents,
            row.paidStudents,
            row.partiallyPaidStudents,
            row.dueStudents,
            row.totalExpectedFee,
            row.totalCollected,
            row.totalDue,
          ]),
        ];
        colWidths = [{ wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
      } else if (reportType === "month-summary") {
        detailRows = [
          ["S.No.", "Month", "Total Students", "Paid Students", "Due Students", "Expected Fee", "Collected Fee", "Due Amount"],
          ...(reportData.monthSummary || []).map((row, idx) => [
            idx + 1,
            row.month,
            row.totalStudents,
            row.paidStudents,
            row.dueStudents,
            row.totalExpectedFee,
            row.totalCollected,
            row.totalDue,
          ]),
        ];
        colWidths = [{ wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
      } else {
        detailRows = [
          ["S.No.", "Student ID", "Roll No.", "Student Name", "Class", "Section", "Father Name", "Parent Contact", "Expected Fee", "Paid Amount", "Due Amount", "Status", "Last Payment Date"],
          ...(reportData.details || []).map((row, idx) => [
            idx + 1,
            row.studentId,
            row.rollNumber,
            row.fullName,
            row.className,
            row.section,
            row.fatherName,
            row.parentPhone,
            row.totalFee,
            row.paidAmount,
            row.dueAmount,
            row.paymentStatus,
            row.lastPaymentDate ? new Date(row.lastPaymentDate).toLocaleDateString("en-IN") : "-",
          ]),
        ];
        colWidths = [
          { wch: 8 }, { wch: 16 }, { wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 10 },
          { wch: 22 }, { wch: 16 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 18 }
        ];
      }

      const wsDetails = XLSX.utils.aoa_to_sheet(detailRows);
      wsDetails["!cols"] = colWidths;
      XLSX.utils.book_append_sheet(wb, wsDetails, "Report Details");

      XLSX.writeFile(wb, `Fee_Report_${academicYear}_${Date.now()}.xlsx`);
    } catch (err) {
      console.error("Excel Export error:", err);
      addToast("Failed to generate Excel export", "error");
    } finally {
      setExportLoading(null);
    }
  };

  // ─────────────────────────────────────────────────────────
  // PRINT HANDLER
  // ─────────────────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      {/* ── HEADER BAR ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <Coins size={16} />
            Finance & Fee Management
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            Fee Reports & Statements
          </h1>
          <p className="text-gray-500 text-xs md:text-sm font-medium mt-1">
            Generate class-wise, month-wise, and student-wise fee collection reports for official school records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate("/fees")}
            icon={ArrowLeft}
            className="rounded-xl"
          >
            Back to Fee Collection
          </Button>
        </div>
      </div>

      {/* ── REPORT FILTER PANEL ── */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm print:hidden space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Filter size={18} className="text-indigo-600" />
            Report Filter Configuration
          </h3>
          <span className="text-xs font-bold text-gray-400">
            Customize Parameters
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. Academic Session */}
          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-wider block mb-2">
              1. Academic Session
            </label>
            <div className="relative">
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-black text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
              >
                <option value="2026-2027">2026-2027 (Current)</option>
                <option value="2025-2026">2025-2026</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>

          {/* 2. Class Filter */}
          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-wider block mb-2">
              2. Class / Group
            </label>
            <div className="relative">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-black text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
              >
                <option value="ALL">All Classes</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    Class {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>

          {/* 3. Month Filter */}
          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-wider block mb-2">
              3. Month
            </label>
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-black text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
              >
                <option value="ALL">All Months (Full Session)</option>
                {monthsList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>

          {/* 4. Report Type */}
          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-wider block mb-2">
              4. Report Type
            </label>
            <div className="relative">
              <select
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value);
                  setReportData(null);
                }}
                className="w-full pl-4 pr-10 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-black text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
              >
                <option value="class-summary">Class-wise Fee Summary</option>
                <option value="month-summary">Month-wise Fee Summary</option>
                <option value="class-month-detail">Class + Month Detailed Report</option>
                <option value="student-statement">Student-wise Fee Statement</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>

          {/* 5. Payment Status */}
          <div>
            <label className="text-xs font-black text-gray-500 uppercase tracking-wider block mb-2">
              5. Payment Status
            </label>
            <div className="relative">
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-black text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
              >
                <option value="ALL">All Students</option>
                <option value="PAID">Paid Only</option>
                <option value="PARTIAL">Partially Paid Only</option>
                <option value="DUE">Due / Pending Only</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>

          {/* 6. Student Combobox (Mandatory when Student Statement selected) */}
          {reportType === "student-statement" && (
            <div className="col-span-1 sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-black text-indigo-600 uppercase tracking-wider block mb-2">
                6. Select Student (Mandatory)
              </label>
              <AppCombobox
                options={studentComboboxOptions}
                value={selectedStudent?.value || selectedStudent}
                onChange={(selected) => setSelectedStudent(selected)}
                placeholder="Type name or roll number..."
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Action Controls Bar */}
        <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <Button
            onClick={handleGenerateReport}
            loading={loading}
            icon={Sparkles}
            className="w-full sm:w-auto px-8 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-100"
          >
            Generate Report
          </Button>

          {reportData && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button
                variant="secondary"
                onClick={handleExportPDF}
                loading={exportLoading === "pdf"}
                disabled={exportLoading !== null}
                icon={FileText}
                className="flex-1 sm:flex-none border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-black uppercase tracking-wider rounded-xl h-11"
              >
                Download PDF
              </Button>

              <Button
                variant="secondary"
                onClick={handleExportExcel}
                loading={exportLoading === "excel"}
                disabled={exportLoading !== null}
                icon={FileSpreadsheet}
                className="flex-1 sm:flex-none border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs font-black uppercase tracking-wider rounded-xl h-11"
              >
                Download Excel
              </Button>

              <Button
                variant="secondary"
                onClick={handlePrint}
                icon={Printer}
                className="flex-1 sm:flex-none border-gray-200 text-gray-700 bg-gray-50 hover:bg-gray-100 text-xs font-black uppercase tracking-wider rounded-xl h-11"
              >
                Print Report
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── PRINT-ONLY HEADER ── */}
      <div className="hidden print:block text-center border-b-2 border-gray-900 pb-4 mb-6">
        <h1 className="text-2xl font-black uppercase tracking-tight">{SCHOOL_NAME}</h1>
        <p className="text-xs font-bold text-gray-600">{SCHOOL_ADDRESS}  •  OFFICIAL FINANCIAL REPORT</p>
        <div className="mt-3 text-xs font-semibold flex justify-between px-4">
          <span>Academic Session: {academicYear}</span>
          <span>Class: {selectedClass === "ALL" ? "All Classes" : selectedClass}</span>
          <span>Month: {selectedMonth}</span>
          <span>Date: {new Date().toLocaleDateString("en-IN")}</span>
        </div>
      </div>

      {/* ── SUMMARY STATS CARDS ── */}
      {reportData && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Total Students</span>
            <p className="text-2xl font-black text-gray-900 mt-1">{reportData.summary.totalStudents}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">Paid Students</span>
            <p className="text-2xl font-black text-emerald-700 mt-1">{reportData.summary.paidStudents}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block">Partially Paid</span>
            <p className="text-2xl font-black text-amber-700 mt-1">{reportData.summary.partiallyPaidStudents}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block">Due / Pending</span>
            <p className="text-2xl font-black text-rose-700 mt-1">{reportData.summary.dueStudents}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">Total Expected</span>
            <p className="text-xl font-black text-indigo-700 mt-1">{formatToINR(reportData.summary.totalExpectedFee)}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block">Total Due Amount</span>
            <p className="text-xl font-black text-rose-700 mt-1">{formatToINR(reportData.summary.totalDue)}</p>
          </div>
        </div>
      )}

      {/* ── MAIN REPORT PREVIEW TABLES ── */}
      {loading ? (
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <TableSkeleton rows={8} columns={6} />
        </div>
      ) : !reportData ? (
        <div className="bg-white p-12 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <FileText size={32} />
          </div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">No Report Generated Yet</h3>
          <p className="text-gray-500 text-xs max-w-sm mx-auto">
            Select your desired report parameters above and click <span className="font-bold text-indigo-600">"Generate Report"</span> to load summary metrics and statements.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          {/* Class-wise Summary Table */}
          {reportType === "class-summary" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4 w-16">S.No.</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4 text-center">Total Students</th>
                    <th className="px-6 py-4 text-center">Paid</th>
                    <th className="px-6 py-4 text-center">Partial</th>
                    <th className="px-6 py-4 text-center">Due</th>
                    <th className="px-6 py-4 text-right">Expected Fee</th>
                    <th className="px-6 py-4 text-right">Collected Amount</th>
                    <th className="px-6 py-4 text-right">Due Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {reportData.classSummary.map((row, idx) => (
                    <tr key={row.className} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-400">{idx + 1}</td>
                      <td className="px-6 py-4 font-black text-gray-900">Class {row.className}</td>
                      <td className="px-6 py-4 text-center font-bold text-gray-700">{row.totalStudents}</td>
                      <td className="px-6 py-4 text-center font-black text-emerald-600">{row.paidStudents}</td>
                      <td className="px-6 py-4 text-center font-black text-amber-600">{row.partiallyPaidStudents}</td>
                      <td className="px-6 py-4 text-center font-black text-rose-600">{row.dueStudents}</td>
                      <td className="px-6 py-4 text-right font-black text-gray-900">{formatToINR(row.totalExpectedFee)}</td>
                      <td className="px-6 py-4 text-right font-black text-emerald-600">{formatToINR(row.totalCollected)}</td>
                      <td className="px-6 py-4 text-right font-black text-rose-600">{formatToINR(row.totalDue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Month-wise Summary Table */}
          {reportType === "month-summary" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4 w-16">S.No.</th>
                    <th className="px-6 py-4">Month</th>
                    <th className="px-6 py-4 text-center">Total Students</th>
                    <th className="px-6 py-4 text-center">Paid Students</th>
                    <th className="px-6 py-4 text-center">Due Students</th>
                    <th className="px-6 py-4 text-right">Expected Fee</th>
                    <th className="px-6 py-4 text-right">Collected Amount</th>
                    <th className="px-6 py-4 text-right">Due Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {reportData.monthSummary.map((row, idx) => (
                    <tr key={row.month} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-400">{idx + 1}</td>
                      <td className="px-6 py-4 font-black text-indigo-700">{row.month}</td>
                      <td className="px-6 py-4 text-center font-bold text-gray-700">{row.totalStudents}</td>
                      <td className="px-6 py-4 text-center font-black text-emerald-600">{row.paidStudents}</td>
                      <td className="px-6 py-4 text-center font-black text-rose-600">{row.dueStudents}</td>
                      <td className="px-6 py-4 text-right font-black text-gray-900">{formatToINR(row.totalExpectedFee)}</td>
                      <td className="px-6 py-4 text-right font-black text-emerald-600">{formatToINR(row.totalCollected)}</td>
                      <td className="px-6 py-4 text-right font-black text-rose-600">{formatToINR(row.totalDue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Student Statement or Class+Month Detailed Roster */}
          {(reportType === "class-month-detail" || reportType === "student-statement") && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/70 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="px-6 py-4 w-16">S.No.</th>
                      <th className="px-6 py-4">Student Details</th>
                      <th className="px-6 py-4">Class & Sec</th>
                      <th className="px-6 py-4">Father / Parent</th>
                      <th className="px-6 py-4 text-right">Expected Fee</th>
                      <th className="px-6 py-4 text-right">Paid Amount</th>
                      <th className="px-6 py-4 text-right">Due Amount</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs">
                    {paginatedDetails.map((studentRow, idx) => {
                      const badge = getStatusBadge(studentRow.paymentStatus);
                      return (
                        <tr key={studentRow.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-400">
                            {(currentPage - 1) * pageSize + idx + 1}
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-900">
                            <div>
                              <span className="block text-gray-900 font-black">{studentRow.fullName}</span>
                              <span className="text-[10px] text-gray-400 font-bold">
                                Roll: {studentRow.rollNumber} • ID: {studentRow.studentId}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-700">
                            Class {studentRow.className} ({studentRow.section})
                          </td>
                          <td className="px-6 py-4 text-gray-600 font-medium">
                            <div>
                              <span className="block">{studentRow.fatherName}</span>
                              <span className="text-[10px] text-gray-400">{studentRow.parentPhone}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-gray-900">
                            {formatToINR(studentRow.totalFee)}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-emerald-600">
                            {formatToINR(studentRow.paidAmount)}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-rose-600">
                            {formatToINR(studentRow.dueAmount)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border inline-block", badge.className)}>
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Preview Pagination Controls */}
              {totalDetailPages > 1 && (
                <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between print:hidden">
                  <span className="text-xs font-bold text-gray-500">
                    Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, reportData.details.length)} of {reportData.details.length} records
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      className="px-3 py-1.5 rounded-lg border bg-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="text-xs font-black text-gray-700 px-2">
                      Page {currentPage} of {totalDetailPages}
                    </span>
                    <button
                      disabled={currentPage === totalDetailPages}
                      onClick={() => setCurrentPage((prev) => Math.min(totalDetailPages, prev + 1))}
                      className="px-3 py-1.5 rounded-lg border bg-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FeeReports;
