import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  Search,
  User,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  BookOpen,
  CreditCard,
  Wallet,
  TrendingUp,
  Download,
  ArrowUpRight,
  History,
  Printer,
  ShieldCheck,
  HelpCircle,
  Layers,
  Coins,
  FileSpreadsheet,
  Clock,
  Sparkles,
  Users,
  Filter,
  Check,
  FileText
} from "lucide-react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import AppCombobox from "../components/ui/AppCombobox";
import { useToast } from "../context/ToastContext";
import { cn } from "../utils/cn";
import { formatToINR } from "../utils/format";
import ReceiptPreview from "../components/ui/ReceiptPreview";

const academicMonthOrder = [
  'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December', 'January', 'February', 'March'
];

const getFirstUnpaidMonth = (monthlyBreakdown) => {
  if (!monthlyBreakdown || !Array.isArray(monthlyBreakdown)) return null;
  const sorted = [...monthlyBreakdown].sort((a, b) => {
    return academicMonthOrder.indexOf(a.month) - academicMonthOrder.indexOf(b.month);
  });
  return sorted.find((m) => m.status !== "PAID" && m.status !== "EXEMPTED");
};

const FeeCollection = () => {
  const { addToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Core State variables
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [transaction, setTransaction] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [currentStep, setCurrentStep] = useState("selector"); // selector, active
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [includeTransport, setIncludeTransport] = useState(false);
  const [isEditingTransportFee, setIsEditingTransportFee] = useState(false);
  const [tempTransportFee, setTempTransportFee] = useState("");
  const [isUpdatingFee, setIsUpdatingFee] = useState(false);
  const [academicYear] = useState("2026-2027");
  const [classSummary, setClassSummary] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [schoolStats, setSchoolStats] = useState(null);

  // Redesign UX State variables
  const [classSearchQuery, setClassSearchQuery] = useState("");
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [recentStudents, setRecentStudents] = useState([]);
  const [classFilter, setClassFilter] = useState("ALL"); // ALL, PRIMARY, MIDDLE

  // Due Date & Timeline Filter State variables
  const [monthlyFeeDueDate, setMonthlyFeeDueDate] = useState(10);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedDueDate, setSelectedDueDate] = useState(10);
  const [timelineFilter, setTimelineFilter] = useState("ALL");

  // Roster, stats & mobile filter states
  const [pendingStudents, setPendingStudents] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [isClassStudentsLoading, setIsClassStudentsLoading] = useState(false);
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Load recent students from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("recent_students");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentStudents(parsed);
        } else {
          setRecentStudents([]);
        }
      } catch (e) {
        console.error("Error loading recent students", e);
        setRecentStudents([]);
      }
    }
  }, []);

  // Save student to recent list helper
  const saveRecentStudent = (stud, classId, className) => {
    const studentData = {
      id: stud.id,
      name: stud.name,
      roll: stud.roll,
      classId: classId,
      className: className || stud.class
    };
    
    setRecentStudents(prev => {
      const currentList = Array.isArray(prev) ? prev : [];
      const filtered = currentList.filter(s => s.id !== studentData.id);
      const updated = [studentData, ...filtered].slice(0, 4);
      localStorage.setItem("recent_students", JSON.stringify(updated));
      return updated;
    });
  };

  // Pre-filled student flow (from URL state redirection)
  useEffect(() => {
    if (location.state && location.state.searchStudentId) {
      const studentIdToSearch = location.state.searchStudentId;
      const loadPreFilledStudent = async () => {
        setLoading(true);
        try {
          const studentRes = await api.get(`/students/${studentIdToSearch}`);
          if (studentRes.data.success) {
            const s = studentRes.data.data;
            const classId = s.class?._id || s.class;
            
            setSelectedClass(classId);
            setSearchQuery(s.rollNumber);
            
            const feeRes = await api.get(`/fees/${classId}/${s.rollNumber}?academicYear=2026-2027`);
            if (feeRes.data.success) {
              const {
                student: sData,
                feeSummary,
                ledger,
                transactions: txs,
              } = feeRes.data.data;
              
              const activeStudent = {
                id: sData.id,
                name: sData.fullName,
                roll: sData.rollNumber,
                rollNumber: sData.rollNumber,
                admissionNumber: sData.admissionNumber,
                studentId: sData.studentId,
                fatherName: sData.fatherName,
                phone: sData.phone,
                section: sData.section,
                aadhar: sData.aadhar || '',
                address: sData.address || '',
                totalFee: feeSummary.totalFee,
                paidFee: feeSummary.paidFee,
                dueFee: feeSummary.dueFee,
                upcomingFee: feeSummary.upcomingFee || 0,
                class: sData.class?.name || sData.class,
                ledger: ledger,
                transportMode: sData.transportMode || 'Private',
                transportFee: sData.transportFee || 0
              };

              setStudent(activeStudent);
              setTransactions(txs || []);
              setIncludeTransport(false);
              
              const firstUnpaid = getFirstUnpaidMonth(ledger?.monthlyBreakdown);
              if (firstUnpaid) {
                setSelectedMonths([firstUnpaid.month]);
              } else {
                setSelectedMonths([]);
              }
              
              // Save to recent
              saveRecentStudent(activeStudent, classId, sData.class?.name || sData.class);
              setCurrentStep("active");
            }
          }
        } catch (error) {
          console.error("Error loading pre-filled student:", error);
          addToast("Failed to load student details", "error");
        } finally {
          setLoading(false);
        }
      };
      
      loadPreFilledStudent();
    }
  }, [location.state, addToast]);

  // Fetch classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/admin/classes");
        if (res.data.success) {
          setClasses(res.data.data);
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    };
    fetchClasses();
  }, []);

  // Fetch school stats, configured due date day, pending students and monthly collection summary
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [statsRes, dueDateRes, pendingRes, summaryRes] = await Promise.all([
          api.get("/admin/stats"),
          api.get("/settings/fee-due-date"),
          api.get("/fees/pending-students"),
          api.get("/fees/monthly-summary")
        ]);
        if (statsRes.data.success) {
          setSchoolStats(statsRes.data.data);
        }
        if (dueDateRes.data.success) {
          setMonthlyFeeDueDate(dueDateRes.data.data);
          setSelectedDueDate(dueDateRes.data.data);
        }
        if (pendingRes.data.success) {
          setPendingStudents(pendingRes.data.data || []);
        }
        if (summaryRes.data.success) {
          setMonthlySummary(summaryRes.data.data.monthlyData || []);
        }
      } catch (error) {
        console.error("Error fetching initial dashboard statistics or settings:", error);
      }
    };
    fetchInitialData();
  }, []);

  const handleSaveDueDate = async () => {
    try {
      const res = await api.put("/settings/fee-due-date", { dueDate: selectedDueDate });
      if (res.data.success) {
        setMonthlyFeeDueDate(res.data.data);
        addToast("Monthly due date day updated successfully", "success");
        setIsSettingsModalOpen(false);
        // Refresh school stats, pending list, monthly summary and active student ledger (if loaded)
        const [statsRes, pendingRes, summaryRes] = await Promise.all([
          api.get("/admin/stats"),
          api.get("/fees/pending-students"),
          api.get("/fees/monthly-summary")
        ]);
        if (statsRes.data.success) {
          setSchoolStats(statsRes.data.data);
        }
        if (pendingRes.data.success) {
          setPendingStudents(pendingRes.data.data || []);
        }
        if (summaryRes.data.success) {
          setMonthlySummary(summaryRes.data.data.monthlyData || []);
        }
        if (selectedClass) {
          const summaryClassRes = await api.get(`/admin/classes/${selectedClass}/summary`);
          if (summaryClassRes.data.success) {
            setClassSummary(summaryClassRes.data.data);
          }
        }
        if (student) {
          handleSearch();
        }
      }
    } catch (error) {
      console.error("Error updating due date:", error);
      addToast(error.response?.data?.message || "Failed to update due date", "error");
    }
  };

  // Fetch class summary and class students list when selectedClass changes
  useEffect(() => {
    const fetchClassData = async () => {
      if (!selectedClass) {
        setClassSummary(null);
        setClassStudents([]);
        return;
      }
      setIsSummaryLoading(true);
      setIsClassStudentsLoading(true);
      try {
        const selectedClassName = classes.find(c => c._id === selectedClass)?.name || "";
        const [summaryRes, studentsRes] = await Promise.all([
          api.get(`/admin/classes/${selectedClass}/summary`),
          api.get(`/students?class=${encodeURIComponent(selectedClassName)}&limit=1000`)
        ]);
        if (summaryRes.data.success) {
          setClassSummary(summaryRes.data.data);
        }
        if (studentsRes.data.success) {
          setClassStudents(studentsRes.data.data.students || []);
        }
      } catch (error) {
        console.error("Error fetching class data:", error);
      } finally {
        setIsSummaryLoading(false);
        setIsClassStudentsLoading(false);
      }
    };
    fetchClassData();
    setStudent(null);
    setCurrentStep("selector");
  }, [selectedClass, classes]);

  // Reactively calculate total payment amount based on selected months and transport toggle
  useEffect(() => {
    if (!student) return;
    const breakdown = student.ledger?.monthlyBreakdown || [];
    
    // Sum outstanding tuition fees for selected months
    const tuitionPending = selectedMonths.reduce((sum, mName) => {
      const mInfo = breakdown.find(mb => mb.month === mName);
      return sum + (mInfo ? mInfo.pending : 0);
    }, 0);
    
    // Sum outstanding transport fees for selected months (if checked and student uses school bus)
    const transportPending = includeTransport && student.transportMode === 'School Bus'
      ? selectedMonths.reduce((sum, mName) => {
          const mInfo = breakdown.find(mb => mb.month === mName);
          const baseFee = student.transportFee !== undefined && student.transportFee !== null ? student.transportFee : 500;
          return sum + (mInfo ? (mInfo.transportPending !== undefined ? mInfo.transportPending : baseFee) : baseFee);
        }, 0)
      : 0;

    setAmount((tuitionPending + transportPending).toString());
  }, [selectedMonths, includeTransport, student]);

  // Dynamic Overall Collection calculation (when selectedClass is empty)
  const overallCollectionStats = useMemo(() => {
    if (!classes || classes.length === 0) return { expected: 0, collected: 0, pending: 0 };
    const expected = classes.reduce((sum, c) => sum + (c.tuitionFee || 1500) * (c.students?.length || 0) * 12, 0);
    const collected = schoolStats?.totalFeesCollected || 0;
    const pending = Math.max(0, expected - collected);
    return { expected, collected, pending };
  }, [classes, schoolStats]);

  // Filter classes by search query
  const filteredClassesList = useMemo(() => {
    return classes.filter(cls => {
      const className = cls.name || "";
      return className.toLowerCase().includes(classSearchQuery.toLowerCase());
    });
  }, [classes, classSearchQuery]);

  // Actions
  const handleSearch = async () => {
    if (!selectedClass) {
      addToast("Please select a class first", "error");
      return;
    }
    if (!searchQuery) return;
    setLoading(true);
    try {
      // Resolve roll number: if searchQuery is not a pure number, try matching by student name
      let resolvedRoll = searchQuery.trim();
      if (!/^\d+$/.test(resolvedRoll) && classStudents.length > 0) {
        const q = resolvedRoll.toLowerCase();
        const match = classStudents.find(s =>
          s.fullName && s.fullName.toLowerCase().includes(q)
        );
        if (match) {
          resolvedRoll = match.rollNumber;
        }
      }
      const res = await api.get(`/fees/${selectedClass}/${resolvedRoll}?academicYear=2026-2027`);
      if (res.data.success) {
        const {
          student: sData,
          feeSummary,
          ledger,
          transactions: txs,
        } = res.data.data;
        
        const activeStudent = {
          id: sData.id,
          name: sData.fullName,
          roll: sData.rollNumber,
          rollNumber: sData.rollNumber,
          admissionNumber: sData.admissionNumber,
          studentId: sData.studentId,
          fatherName: sData.fatherName,
          phone: sData.phone,
          section: sData.section,
          aadhar: sData.aadhar || '',
          address: sData.address || '',
          totalFee: feeSummary.totalFee,
          paidFee: feeSummary.paidFee,
          dueFee: feeSummary.dueFee,
          upcomingFee: feeSummary.upcomingFee || 0,
          class: sData.class?.name || sData.class,
          ledger: ledger,
          transportMode: sData.transportMode || 'Private',
          transportFee: sData.transportFee || 0
        };

        setStudent(activeStudent);
        setTransactions(txs || []);
        setIncludeTransport(false);
        
        const firstUnpaid = getFirstUnpaidMonth(ledger?.monthlyBreakdown);
        if (firstUnpaid) {
          setSelectedMonths([firstUnpaid.month]);
        } else {
          setSelectedMonths([]);
        }
        
        // Save to recent
        const classObj = classes.find(c => c._id === selectedClass);
        saveRecentStudent(activeStudent, selectedClass, classObj?.name);
        
        addToast("Student record loaded successfully", "success");
        setCurrentStep("active");
      }
    } catch (error) {
      console.error("Fetch Student Error:", error);
      addToast(`Student "${searchQuery}" not found in this class`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRecentStudentClick = async (recentStud) => {
    setLoading(true);
    try {
      setSelectedClass(recentStud.classId);
      setSearchQuery(recentStud.roll);
      
      const res = await api.get(`/fees/${recentStud.classId}/${recentStud.roll}?academicYear=2026-2027`);
      if (res.data.success) {
        const {
          student: sData,
          feeSummary,
          ledger,
          transactions: txs,
        } = res.data.data;
        
        const activeStudent = {
          id: sData.id,
          name: sData.fullName,
          roll: sData.rollNumber,
          rollNumber: sData.rollNumber,
          admissionNumber: sData.admissionNumber,
          studentId: sData.studentId,
          fatherName: sData.fatherName,
          phone: sData.phone,
          section: sData.section,
          aadhar: sData.aadhar || '',
          address: sData.address || '',
          totalFee: feeSummary.totalFee,
          paidFee: feeSummary.paidFee,
          dueFee: feeSummary.dueFee,
          upcomingFee: feeSummary.upcomingFee || 0,
          class: sData.class?.name || sData.class,
          ledger: ledger,
          transportMode: sData.transportMode || 'Private',
          transportFee: sData.transportFee || 0
        };

        setStudent(activeStudent);
        setTransactions(txs || []);
        setIncludeTransport(false);
        
        const firstUnpaid = getFirstUnpaidMonth(ledger?.monthlyBreakdown);
        if (firstUnpaid) {
          setSelectedMonths([firstUnpaid.month]);
        } else {
          setSelectedMonths([]);
        }
        
        addToast("Loaded student details", "success");
        setCurrentStep("active");
      }
    } catch (err) {
      console.error(err);
      addToast("Failed to load student", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleMonthClick = (clickedMonth) => {
    const monthData = (student?.ledger?.monthlyBreakdown || []).find(m => m.month === clickedMonth);
    if (monthData && (monthData.status === "PAID" || monthData.status === "EXEMPTED")) {
      return;
    }
    if (selectedMonths.includes(clickedMonth)) {
      setSelectedMonths(selectedMonths.filter(m => m !== clickedMonth));
    } else {
      setSelectedMonths([...selectedMonths, clickedMonth]);
    }
  };

  const handleUpdateTransportFee = async () => {
    const feeVal = parseFloat(tempTransportFee);
    if (isNaN(feeVal) || feeVal < 0) {
      addToast("Please enter a valid transport fee", "error");
      return;
    }

    setIsUpdatingFee(true);
    try {
      const res = await api.put(`/fees/student/${student.id}/transport-fee`, {
        transportFee: feeVal,
        academicYear: academicYear
      });

      if (res.data.success) {
        addToast("Transport fee updated successfully", "success");
        setIsEditingTransportFee(false);
        handleSearch();
      }
    } catch (error) {
      console.error("Error updating transport fee:", error);
      addToast("Failed to update transport fee", "error");
    } finally {
      setIsUpdatingFee(false);
    }
  };

  const handlePayment = async (e) => {
    if (e) e.preventDefault();
    if (!amount || amount <= 0) return;

    if (selectedMonths.length === 0) {
      addToast("Please select at least one month to pay", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/fees/pay", {
        studentId: student.id,
        amount: parseFloat(amount),
        type: "Tuition",
        paymentMode: paymentMode,
        month: selectedMonths,
        includeTransport: includeTransport,
        academicYear: academicYear,
        transactionId: "TXN-" + Math.random().toString(36).substring(2, 9).toUpperCase(),
        remarks: `Fee paid for ${selectedMonths.join(', ')} via Finance Portal` + (includeTransport ? ' (Includes Transport)' : ''),
      });

      if (res.data.success) {
        const { transaction: tx } = res.data.data;
        setTransaction(tx);
        setIsSuccessModalOpen(true);
        addToast("Transaction processed successfully", "success");
        handleSearch();
      }
    } catch (error) {
      console.error("Payment Error:", error);
      addToast("Failed to process payment", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = (tx) => {
    if (!tx) return;
    setTransaction(tx);
    setIsSuccessModalOpen(true);
  };

  const handleExportCSV = () => {
    if (!transactions || transactions.length === 0) {
      addToast("No transactions found to export", "error");
      return;
    }
    let csv = "Receipt,Months,Amount Paid,Date,Method,Status\n";
    transactions.forEach(t => {
      const receiptNo = t.receiptNumber || t._id;
      const monthsStr = Array.isArray(t.month) ? t.month.join(";") : t.month;
      const amountStr = t.amount;
      const dateStr = new Date(t.createdAt).toLocaleDateString();
      const methodStr = t.paymentMode || "CASH";
      const statusStr = t.status || "Paid";
      csv += `"${receiptNo}","${monthsStr}",${amountStr},"${dateStr}","${methodStr}","${statusStr}"\n`;
    });
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `receipts_${student?.name?.replace(/\s+/g, "_") || "student"}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    addToast("Exported transaction list to CSV", "success");
  };

  const handlePrintTable = () => {
    window.print();
  };

  const getStudentInitials = (name) => {
    if (!name) return "ST";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // Payment progress bar ratio calculation
  const paymentProgressRatio = useMemo(() => {
    if (!student || !student.totalFee) return 0;
    return Math.min(100, Math.round((student.paidFee / student.totalFee) * 100));
  }, [student]);

  const filteredTimelineMonths = useMemo(() => {
    const breakdown = [...(student?.ledger?.monthlyBreakdown || [])].sort((a, b) => {
      return academicMonthOrder.indexOf(a.month) - academicMonthOrder.indexOf(b.month);
    });
    if (timelineFilter === "ALL") return breakdown;
    if (timelineFilter === "DUE") return breakdown.filter(m => m.status === "DUE" || m.status === "PARTIAL");
    if (timelineFilter === "UPCOMING") return breakdown.filter(m => m.status === "UPCOMING");
    if (timelineFilter === "PAID") return breakdown.filter(m => m.status === "PAID");
    if (timelineFilter === "WAIVED") return breakdown.filter(m => m.status === "EXEMPTED");
    return breakdown;
  }, [student, timelineFilter]);

  const selectedClassName = useMemo(() => {
    return classes.find(c => c._id === selectedClass)?.name || "";
  }, [selectedClass, classes]);

  const classPendingStudents = useMemo(() => {
    if (!selectedClass || !selectedClassName) return [];
    return pendingStudents.filter(s => s.className === selectedClassName);
  }, [pendingStudents, selectedClass, selectedClassName]);

  const kpiStats = useMemo(() => {
    const totalStudents = selectedClass 
      ? (classSummary?.studentCount || 0) 
      : (schoolStats?.totalStudents || 0);

    const dueStudentsCount = selectedClass
      ? classPendingStudents.length
      : pendingStudents.length;

    const paidStudentsCount = Math.max(0, totalStudents - dueStudentsCount);

    const monthlyCollection = selectedClass
      ? (classSummary?.totalCollectedThisMonth !== undefined ? classSummary.totalCollectedThisMonth : (classSummary?.totalCollected || 0))
      : (schoolStats?.collectedThisMonth || 0);

    return {
      totalStudents,
      dueStudents: dueStudentsCount,
      paidStudents: paidStudentsCount,
      collection: monthlyCollection
    };
  }, [selectedClass, classSummary, schoolStats, pendingStudents, classPendingStudents]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans antialiased text-zinc-900 pb-16 pt-0 scroll-smooth" style={{ scrollBehavior: "smooth" }}>
      
      <div className="max-w-[1600px] mx-auto px-6 py-0 space-y-5">
        
        {/* Compact Settings & Status row */}
        <div className="flex justify-between items-center border-b border-zinc-200/60 pb-3">
          <span className="text-[10px] font-black text-zinc-450 uppercase tracking-wider">Analytics Overview</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/reports/fees")}
              className="flex items-center gap-1.5 px-3 py-1 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-[11px] font-black text-indigo-700 transition-all shadow-sm cursor-pointer"
            >
              <FileText size={13} className="text-indigo-600" />
              <span>Fee Reports & Statements</span>
            </button>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 border border-zinc-250 bg-white hover:bg-zinc-50 hover:border-zinc-300 rounded-xl text-[11px] font-bold text-zinc-600 transition-all shadow-sm cursor-pointer"
            >
              <Clock size={12} className="text-orange-500 animate-pulse" />
              <span>Due Date: {monthlyFeeDueDate || 10}th of Month</span>
            </button>
          </div>
        </div>

        {/* 2. TOP SUMMARY SECTION: 4 ANALYTICS CARDS */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Total Students */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 flex items-center justify-between shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all duration-300 group">
            <div className="space-y-1 sm:space-y-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">👨‍🎓 Total Students</span>
              <h3 className="text-xl sm:text-2xl font-black text-orange-500">
                {kpiStats.totalStudents} <span className="text-xs text-zinc-450 font-bold">Students</span>
              </h3>
              <p className="text-[9px] text-zinc-400 font-semibold uppercase">
                {selectedClass ? "In this class" : "Overall enrolled"}
              </p>
            </div>
            <div className="hidden sm:flex w-12 h-12 bg-orange-50 border border-orange-100 rounded-xl items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
              <BookOpen size={20} />
            </div>
          </div>

          {/* Card 2: Current Month Due */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 flex items-center justify-between shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all duration-300 group">
            <div className="space-y-1 sm:space-y-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">💰 Current Month Due</span>
              <h3 className="text-xl sm:text-2xl font-black text-red-505">
                {kpiStats.dueStudents} <span className="text-xs text-zinc-450 font-bold">Students</span>
              </h3>
              <p className="text-[9px] text-zinc-400 font-semibold uppercase">Pending payment</p>
            </div>
            <div className="hidden sm:flex w-12 h-12 bg-red-50 border border-red-100 rounded-xl items-center justify-center text-red-550 group-hover:scale-110 transition-transform">
              <AlertCircle size={20} />
            </div>
          </div>

          {/* Card 3: Current Month Paid */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 flex items-center justify-between shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all duration-300 group">
            <div className="space-y-1 sm:space-y-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">✅ Current Month Paid</span>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-650">
                {kpiStats.paidStudents} <span className="text-xs text-zinc-450 font-bold">Students</span>
              </h3>
              <p className="text-[9px] text-zinc-400 font-semibold uppercase">Fees settled</p>
            </div>
            <div className="hidden sm:flex w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl items-center justify-center text-emerald-650 group-hover:scale-110 transition-transform">
              <CheckCircle size={20} />
            </div>
          </div>

          {/* Card 4: Current Month Collection */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 flex items-center justify-between shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all duration-300 group">
            <div className="space-y-1 sm:space-y-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">₹ Monthly Collection</span>
              <h3 className="text-xl sm:text-2xl font-black text-blue-600">
                {formatToINR(kpiStats.collection)}
              </h3>
              <p className="text-[9px] text-zinc-400 font-semibold uppercase">Total collected</p>
            </div>
            <div className="hidden sm:flex w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <Coins size={20} />
            </div>
          </div>
        </section>

        {/* 3. MAIN WORKSPACE CONTAINER */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Mobile Filter Toggle button */}
          <div className="lg:hidden w-full">
            <button
              onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
              className="w-full flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-2xl shadow-sm text-xs font-bold text-zinc-705 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Filter size={16} className="text-orange-505" />
                <span>Roster Lookup & Filters</span>
              </span>
              <span className="px-2.5 py-1 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-black uppercase tracking-wider">
                {isMobileFilterOpen ? "Close Filters" : "Open Filters"}
              </span>
            </button>
          </div>

          {/* LEFT PANEL: Class & Student Selection (3 cols) */}
          <div className={cn(
            "lg:col-span-3 space-y-6 transition-all duration-300",
            isMobileFilterOpen ? "block" : "hidden lg:block"
          )}>
            {/* ── LOOKUP CONTROLLER CARD ─────────────────────────────── */}
            <div className="bg-white rounded-[20px] border border-zinc-200/70 shadow-sm p-5 space-y-5">

              {/* ── Header ─────────────────────────────────────────────── */}
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-100/80">
                <div className="w-9 h-9 bg-orange-50 rounded-[10px] flex items-center justify-center text-orange-500 shadow-inner shrink-0">
                  <Filter size={16} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[15px] font-semibold text-zinc-800 leading-tight tracking-tight">
                    Lookup Controller
                  </h4>
                  <p className="text-[11px] text-zinc-400 font-medium mt-0.5 tracking-tight">
                    Select Academic Segment
                  </p>
                </div>
              </div>

              {/* ── Academic Class Dropdown — AppCombobox ─────────────── */}
              <AppCombobox
                label="Academic Class"
                placeholder="Select Class Group"
                searchPlaceholder="Search class..."
                emptyText="No classes found"
                value={selectedClass}
                onChange={(val) => setSelectedClass(val)}
                options={classes.map((cls) => ({
                  value: cls._id,
                  label: cls.name,
                  badge: `${cls.students?.length || 0} Stu`,
                }))}
              />

              {/* ── Search Student Input ─────────────────────────────────── */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest ml-0.5">
                  Search Student
                </label>
                <div className="relative group">
                  <Search
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-orange-500 transition-colors duration-200"
                    size={15}
                  />
                  <input
                    type="text"
                    placeholder="Roll No / Name"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-[12px] text-[13px] font-medium text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:border-orange-400 focus:ring-3 focus:ring-orange-50 hover:border-zinc-300 hover:bg-white transition-all duration-200"
                  />
                </div>
                <p className="text-[10px] text-zinc-400 font-medium ml-0.5 tracking-tight">
                  Press Enter to search instantly
                </p>
              </div>

              {/* ── Process Billing Button ───────────────────────────────── */}
              <div className="pt-1">
                <Button
                  onClick={handleSearch}
                  loading={loading}
                  disabled={!selectedClass || !searchQuery}
                  className="w-full h-[48px] bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-zinc-200 disabled:to-zinc-200 disabled:text-zinc-400 disabled:shadow-none text-white rounded-[14px] text-[13px] font-semibold flex items-center justify-center gap-2 shadow-md shadow-orange-100 hover:shadow-lg hover:shadow-orange-100 hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all duration-200"
                >
                  <span>Process Billing</span>
                  <ChevronRight size={15} />
                </Button>
              </div>
            </div>



            {/* RECENT STUDENTS LIST CARD */}
            {recentStudents.length > 0 && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-4 shadow-sm animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-zinc-400">
                  <History size={14} />
                  <h5 className="text-[10px] font-bold uppercase tracking-wider">Recent Lookups</h5>
                </div>
                <div className="space-y-2">
                  {recentStudents.map((rs) => (
                    <div
                      key={rs.id}
                      onClick={() => handleRecentStudentClick(rs)}
                      className="flex items-center justify-between p-2.5 bg-zinc-50 border border-zinc-100 hover:border-orange-200 hover:bg-orange-50/20 rounded-xl cursor-pointer transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center text-[10px] font-bold">
                          {getStudentInitials(rs.name)}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-zinc-700 truncate max-w-[120px] group-hover:text-orange-600 transition-colors">
                            {rs.name}
                          </p>
                          <p className="text-[9px] text-zinc-400 font-semibold uppercase">
                            Class {rs.className}
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-zinc-400 group-hover:text-orange-500 transition-colors bg-white px-2 py-0.5 border border-zinc-150 rounded-md">
                        R.{rs.roll}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* DYNAMIC REGION: CENTER & RIGHT PANELS */}
          <div className="lg:col-span-9">
            
            {currentStep === "selector" ? (
              <div className="space-y-8">
                
                {/* No Class Selected State */}
                {!selectedClass ? (
                  <div className="bg-white rounded-[2rem] border border-zinc-200/80 shadow-sm p-8 sm:p-12 relative overflow-hidden flex flex-col items-center justify-center text-center space-y-6">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-orange-50/40 rounded-full blur-3xl"></div>
                    
                    <div className="w-16 h-16 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center text-orange-500 shadow-sm">
                      <Sparkles size={28} className="animate-pulse" />
                    </div>
                    
                    <div className="max-w-md space-y-2">
                      <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight leading-tight">
                        School financial status at a glance
                      </h3>
                      <p className="text-xs text-zinc-400 font-semibold leading-relaxed">
                        Select a class group from the controller on the left to review expectancies, collection ratios, and manage student fee schedules.
                      </p>
                    </div>

                    <div className="w-full max-w-xl h-px bg-zinc-100"></div>

                    <div className="flex flex-wrap justify-center gap-6 text-xs text-zinc-500 font-bold">
                      <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-500" /> SECURE AUDITS</span>
                      <span className="flex items-center gap-1.5"><Clock size={14} className="text-orange-500" /> REAL-TIME DYNAMICS</span>
                      <span className="flex items-center gap-1.5"><Check size={14} className="text-zinc-500" /> COMPLIANCE APPROVED</span>
                    </div>
                  </div>
                ) : isSummaryLoading ? (
                  <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm p-16 flex flex-col items-center justify-center text-center h-[400px]">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500 mb-4"></div>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Compiling Class Ledgers...</p>
                  </div>
                ) : classSummary ? (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    
                    {/* Redesigned Class Overview Card */}
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 sm:p-8 space-y-6">
                      <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
                        <div>
                          <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Class Summary</span>
                          <h3 className="text-lg font-extrabold text-zinc-900 tracking-tight mt-0.5">
                            Class {classSummary.className} Overview
                          </h3>
                        </div>
                        <span className="px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-[9px] font-bold text-emerald-600 uppercase tracking-wider">
                          Active Session
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                        <div className="p-4 bg-zinc-50 border border-zinc-150 rounded-xl space-y-1">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Students</p>
                          <p className="text-xl font-extrabold text-zinc-800">{classSummary.studentCount}</p>
                        </div>
                        <div className="p-4 bg-emerald-50/20 border border-emerald-100 rounded-xl space-y-1">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Paid</p>
                          <p className="text-xl font-extrabold text-emerald-600">
                            {Math.max(0, classSummary.studentCount - classPendingStudents.length)}
                          </p>
                        </div>
                        <div className="p-4 bg-red-50/20 border border-red-100 rounded-xl space-y-1">
                          <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Due</p>
                          <p className="text-xl font-extrabold text-red-500">{classPendingStudents.length}</p>
                        </div>
                        <div className="p-4 bg-blue-50/20 border border-blue-100 rounded-xl space-y-1">
                          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Collection</p>
                          <p className="text-xl font-extrabold text-blue-600">{formatToINR(classSummary.totalCollected)}</p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-zinc-100 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          <span>Collection Progress</span>
                          <span className="text-orange-500 font-extrabold">
                            {((classSummary.totalCollected / classSummary.totalExpected) * 100 || 0).toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden p-0.5 border border-zinc-100">
                          <div
                            className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-1000"
                            style={{
                              width: `${(classSummary.totalCollected / classSummary.totalExpected) * 100 || 0}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Student List Table */}
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4">
                      <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                        <div>
                          <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Student Roster</h4>
                          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Select a student to manage billing</p>
                        </div>
                        <span className="text-[9px] font-black text-zinc-450 uppercase tracking-wider bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-lg">
                          {classStudents.length} Enrolled
                        </span>
                      </div>

                      {isClassStudentsLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center text-zinc-400">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500 mb-3"></div>
                          <span className="text-[10px] font-bold uppercase tracking-widest">Loading Class Roster...</span>
                        </div>
                      ) : classStudents.length === 0 ? (
                        <div className="py-12 text-center text-zinc-400 font-bold uppercase text-[10px]">
                          No enrolled students found.
                        </div>
                      ) : (
                        <div className="overflow-x-auto custom-scrollbar">
                          {/* Desktop Table View */}
                          <table className="w-full text-left border-collapse hidden sm:table">
                            <thead>
                              <tr className="text-[10px] font-bold text-zinc-400 border-b border-zinc-100 uppercase tracking-wider">
                                <th className="py-3 px-3">Roll</th>
                                <th className="py-3 px-3">Student Name</th>
                                <th className="py-3 px-3">Status</th>
                                <th className="py-3 px-3">Amount Pending</th>
                                <th className="py-3 px-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50 text-xs text-zinc-700">
                              {classStudents.map((stud) => {
                                const isPending = classPendingStudents.find(p => p.rollNumber === stud.rollNumber);
                                return (
                                  <tr key={stud._id} className="hover:bg-zinc-50/50 transition-all font-semibold">
                                    <td className="py-3.5 px-3 text-zinc-400">{stud.rollNumber}</td>
                                    <td className="py-3.5 px-3 font-bold text-zinc-800">{stud.fullName}</td>
                                    <td className="py-3.5 px-3">
                                      {isPending ? (
                                        <span className="px-2 py-0.5 bg-red-50 text-red-500 rounded text-[9px] font-bold uppercase border border-red-100">
                                          Due
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold uppercase border border-emerald-100">
                                          Paid
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3.5 px-3 text-zinc-900 font-bold">
                                      {isPending ? formatToINR(isPending.pendingAmount) : "₹0"}
                                    </td>
                                    <td className="py-3.5 px-3 text-right">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          setSearchQuery(stud.rollNumber);
                                          setLoading(true);
                                          try {
                                            const res = await api.get(`/fees/${selectedClass}/${stud.rollNumber}?academicYear=2026-2027`);
                                            if (res.data.success) {
                                              const { student: sData, feeSummary, ledger, transactions: txs } = res.data.data;
                                              const activeStudent = {
                                                id: sData.id,
                                                name: sData.fullName,
                                                roll: sData.rollNumber,
                                                rollNumber: sData.rollNumber,
                                                admissionNumber: sData.admissionNumber,
                                                studentId: sData.studentId,
                                                fatherName: sData.fatherName,
                                                phone: sData.phone,
                                                section: sData.section,
                                                aadhar: sData.aadhar || '',
                                                address: sData.address || '',
                                                totalFee: feeSummary.totalFee,
                                                paidFee: feeSummary.paidFee,
                                                dueFee: feeSummary.dueFee,
                                                upcomingFee: feeSummary.upcomingFee || 0,
                                                class: sData.class?.name || sData.class,
                                                ledger: ledger,
                                                transportMode: sData.transportMode || 'Private',
                                                transportFee: sData.transportFee || 0
                                              };
                                              setStudent(activeStudent);
                                              setTransactions(txs || []);
                                              setIncludeTransport(false);
                                              const firstUnpaid = getFirstUnpaidMonth(ledger?.monthlyBreakdown);
                                              if (firstUnpaid) {
                                                setSelectedMonths([firstUnpaid.month]);
                                              } else {
                                                setSelectedMonths([]);
                                              }
                                              setCurrentStep("active");
                                            }
                                          } catch (error) {
                                            console.error(error);
                                            addToast("Failed to load student details", "error");
                                          } finally {
                                            setLoading(false);
                                          }
                                        }}
                                        className="px-3 py-1 bg-orange-50 hover:bg-orange-100 border border-orange-100 hover:border-orange-200 text-orange-600 rounded-lg transition-colors font-bold uppercase text-[9px] cursor-pointer"
                                      >
                                        Select & Pay
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>

                          {/* Mobile Cards View */}
                          <div className="block sm:hidden space-y-3">
                            {classStudents.map((stud) => {
                              const isPending = classPendingStudents.find(p => p.rollNumber === stud.rollNumber);
                              return (
                                <div key={stud._id} className="p-4 bg-zinc-50 border border-zinc-150 rounded-xl space-y-3">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-black text-zinc-400">R.{stud.rollNumber}</span>
                                      <span className="font-extrabold text-zinc-800 text-xs">{stud.fullName}</span>
                                    </div>
                                    {isPending ? (
                                      <span className="px-2 py-0.5 bg-red-50 text-red-500 rounded text-[8px] font-bold uppercase border border-red-100">
                                        Due
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[8px] font-bold uppercase border border-emerald-100">
                                        Paid
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex justify-between items-center pt-2 border-t border-zinc-100 text-[10px] font-bold">
                                    <span className="text-zinc-400 uppercase tracking-wider">Pending Amount:</span>
                                    <span className="text-zinc-900 font-extrabold">{isPending ? formatToINR(isPending.pendingAmount) : "₹0"}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      setSearchQuery(stud.rollNumber);
                                      setLoading(true);
                                      try {
                                        const res = await api.get(`/fees/${selectedClass}/${stud.rollNumber}?academicYear=2026-2027`);
                                        if (res.data.success) {
                                          const { student: sData, feeSummary, ledger, transactions: txs } = res.data.data;
                                          const activeStudent = {
                                            id: sData.id,
                                            name: sData.fullName,
                                            roll: sData.rollNumber,
                                            rollNumber: sData.rollNumber,
                                            admissionNumber: sData.admissionNumber,
                                            studentId: sData.studentId,
                                            fatherName: sData.fatherName,
                                            phone: sData.phone,
                                            section: sData.section,
                                            aadhar: sData.aadhar || '',
                                            address: sData.address || '',
                                            totalFee: feeSummary.totalFee,
                                            paidFee: feeSummary.paidFee,
                                            dueFee: feeSummary.dueFee,
                                            upcomingFee: feeSummary.upcomingFee || 0,
                                            class: sData.class?.name || sData.class,
                                            ledger: ledger,
                                            transportMode: sData.transportMode || 'Private',
                                            transportFee: sData.transportFee || 0
                                          };
                                          setStudent(activeStudent);
                                          setTransactions(txs || []);
                                          setIncludeTransport(false);
                                          const firstUnpaid = getFirstUnpaidMonth(ledger?.monthlyBreakdown);
                                          if (firstUnpaid) {
                                            setSelectedMonths([firstUnpaid.month]);
                                          } else {
                                            setSelectedMonths([]);
                                          }
                                          setCurrentStep("active");
                                        }
                                      } catch (error) {
                                        console.error(error);
                                        addToast("Failed to load student details", "error");
                                      } finally {
                                        setLoading(false);
                                      }
                                    }}
                                    className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-center text-xs font-bold uppercase transition-colors cursor-pointer"
                                  >
                                    Select & Pay
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                ) : null}

                {/* Secondary Analytics & Trend Charts (Below the fold) */}
                <div className="border-t border-zinc-200/60 pt-8 space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Secondary Analytics & Trend Charts</h4>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Yearly projections, pending offsets, and historical collection patterns</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-2">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Expected Yearly Revenue</span>
                      <h4 className="text-xl font-extrabold text-zinc-800">{formatToINR(overallCollectionStats.expected)}</h4>
                      <p className="text-[9px] text-zinc-450 font-medium">Computed yearly base</p>
                    </div>

                    <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-2">
                      <span className="text-[9px] font-bold text-amber-605 uppercase tracking-widest">Outstanding Balance</span>
                      <h4 className="text-xl font-extrabold text-amber-605">{formatToINR(overallCollectionStats.pending)}</h4>
                      <p className="text-[9px] text-zinc-450 font-medium">Overdue fees till today</p>
                    </div>

                    <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-2">
                      <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">Upcoming Collection</span>
                      <h4 className="text-xl font-extrabold text-indigo-650">{formatToINR(schoolStats?.upcomingFeeAmount || 0)}</h4>
                      <p className="text-[9px] text-zinc-450 font-medium">Future installment ledger</p>
                    </div>
                  </div>

                  {/* Monthly Collection Trend representation */}
                  {monthlySummary && monthlySummary.length > 0 && (
                    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 space-y-6">
                      <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                        <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Historical Monthly Collection Trends</span>
                        <span className="text-[9px] font-black text-zinc-450 uppercase tracking-wider">Academic Year 2026-2027</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                        {monthlySummary.map((m) => {
                          const percent = Math.min(100, Math.round((m.collected / (m.expected || 1)) * 100)) || 0;
                          return (
                            <div key={m.month} className="p-3 bg-zinc-50 border border-zinc-150 rounded-xl space-y-2.5 hover:border-orange-200 transition-colors">
                              <span className="text-[10px] font-black text-zinc-650 uppercase tracking-wider block">{m.month}</span>
                              <div className="space-y-1">
                                <div className="flex justify-between text-[9px] font-semibold text-zinc-400">
                                  <span>Collected:</span>
                                  <span className="text-zinc-800 font-bold">{formatToINR(m.collected)}</span>
                                </div>
                                <div className="flex justify-between text-[9px] font-semibold text-zinc-400">
                                  <span>Expected:</span>
                                  <span className="text-zinc-800 font-bold">{formatToINR(m.expected)}</span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-[8px] font-bold text-zinc-405">
                                  <span>Ratio:</span>
                                  <span className="text-orange-500 font-extrabold">{percent}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden p-0">
                                  <div
                                    className="h-full bg-orange-500 rounded-full transition-all"
                                    style={{ width: `${percent}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              
              /* STEP 2: ACTIVE STUDENT BILLING DETAILS PORTAL */
              student && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
                  
                  {/* CENTER PANEL (Student Profile & Billing Summary - 5 cols) */}
                  <div className="lg:col-span-5 space-y-6">
                    
                    {/* Student Profile Info Card */}
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 relative overflow-hidden">
                      <div className="absolute right-0 top-0 w-24 h-24 bg-zinc-50 rounded-bl-[2rem] flex items-center justify-center font-bold text-xs text-zinc-400">
                        Roll: {student.roll}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-orange-500 text-white rounded-xl flex items-center justify-center text-lg font-black tracking-tight shrink-0 shadow-md shadow-orange-100">
                          {getStudentInitials(student.name)}
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-md font-bold text-zinc-900 tracking-tight leading-tight">{student.name}</h4>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[9px] font-bold uppercase text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                              Class {student.class}
                            </span>
                            {student.dueFee <= 0 ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold uppercase tracking-wider">
                                Paid Off
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-[9px] font-bold uppercase tracking-wider">
                                Due
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Student Profile Details */}
                      <div className="mt-5 pt-5 border-t border-zinc-100 grid grid-cols-2 gap-x-4 gap-y-3 text-[10px] text-zinc-600">
                        <div>
                          <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Father's Name</span>
                          <span className="font-extrabold text-zinc-800 uppercase block truncate">{student.fatherName || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Mobile Number</span>
                          <span className="font-extrabold text-zinc-800 block truncate">{student.phone || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Aadhaar Number</span>
                          <span className="font-extrabold text-zinc-800 uppercase block truncate">{student.aadhar || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Address</span>
                          <span className="font-extrabold text-zinc-800 uppercase block truncate" title={student.address}>{student.address || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Student Ledger Financials Summary */}
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-6">
                      <h5 className="text-xs font-bold text-zinc-800 uppercase tracking-wider border-b border-zinc-100 pb-3">Student Billing Summary</h5>
                      
                      <div className="space-y-3.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-400 font-bold uppercase tracking-tight">Academic Tuition Base</span>
                          <span className="text-zinc-900 font-bold">
                            {formatToINR(student.ledger?.monthlyBreakdown?.[0]?.amount || 0)} <span className="text-[10px] text-zinc-400 font-medium">/ Mo</span>
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-400 font-bold uppercase tracking-tight">Settled Months</span>
                          <span className="text-emerald-600 font-bold">
                            {(student.ledger?.monthlyBreakdown || []).filter((m) => m.status === "PAID").length} Months
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-400 font-bold uppercase tracking-tight">Outstanding Months</span>
                          <span className="text-orange-500 font-bold">
                            {(student.ledger?.monthlyBreakdown || []).filter((m) => m.status !== "PAID" && m.status !== "EXEMPTED").length} Months
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-xs border-t border-zinc-100 pt-3">
                          <span className="text-zinc-400 font-bold uppercase tracking-tight">Transport Mode</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            student.transportMode === 'School Bus'
                              ? "bg-orange-50 text-orange-600 border border-orange-100"
                              : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                          )}>
                            {student.transportMode || 'Private'}
                          </span>
                        </div>

                        {student.transportMode === 'School Bus' && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-400 font-bold uppercase tracking-tight">Transport Fee Base</span>
                            {isEditingTransportFee ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-zinc-400 font-black">₹</span>
                                <input
                                  type="number"
                                  value={tempTransportFee}
                                  onChange={(e) => setTempTransportFee(e.target.value)}
                                  className="w-16 px-1.5 py-0.5 border border-zinc-200 rounded text-center text-xs font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-orange-100"
                                  placeholder="500"
                                  disabled={isUpdatingFee}
                                />
                                <button
                                  type="button"
                                  onClick={handleUpdateTransportFee}
                                  disabled={isUpdatingFee}
                                  className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded text-[9px] font-bold uppercase transition-colors"
                                >
                                  {isUpdatingFee ? "..." : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsEditingTransportFee(false)}
                                  disabled={isUpdatingFee}
                                  className="px-2 py-0.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-400 rounded text-[9px] font-bold uppercase transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-zinc-900 font-bold">
                                  {formatToINR(student.transportFee !== undefined && student.transportFee !== null ? student.transportFee : 500)} <span className="text-[10px] text-zinc-400 font-medium">/ Mo</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTempTransportFee((student.transportFee !== undefined && student.transportFee !== null ? student.transportFee : 500).toString());
                                    setIsEditingTransportFee(true);
                                  }}
                                  className="text-[10px] text-orange-600 hover:text-orange-700 font-bold uppercase underline transition-colors"
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Payment Completion progress */}
                      <div className="space-y-2 border-t border-zinc-100 pt-4">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          <span>Payment Progress</span>
                          <span className="text-orange-500 font-black">{paymentProgressRatio}%</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden p-0.5 border border-zinc-100">
                          <div
                            className="h-full bg-orange-500 rounded-full transition-all duration-1000"
                            style={{ width: `${paymentProgressRatio}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="border-t border-zinc-100 pt-4 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-400 font-bold uppercase tracking-wider">Outstanding Till Today</span>
                          <span className="font-bold text-red-500">
                            {formatToINR(Math.max(0, student.dueFee))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-400 font-bold uppercase tracking-wider">Upcoming Fees</span>
                          <span className="font-bold text-blue-500">
                            {formatToINR(Math.max(0, student.upcomingFee))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-t border-zinc-50 pt-2 font-black text-xs">
                          <span className="text-zinc-650 uppercase tracking-wider">Total Outstanding</span>
                          <span className="text-base text-zinc-900">
                            {formatToINR(Math.max(0, student.dueFee + student.upcomingFee))}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Statement Breakdown */}
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4">
                      <div className="flex flex-col gap-2 border-b border-zinc-100 pb-3">
                        <h5 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Statement Breakdown</h5>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {["ALL", "DUE", "UPCOMING", "PAID", "WAIVED"].map((filter) => (
                            <button
                              key={filter}
                              type="button"
                              onClick={() => setTimelineFilter(filter)}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all border cursor-pointer",
                                timelineFilter === filter
                                  ? "bg-orange-500 border-orange-500 text-white"
                                  : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:border-zinc-300"
                              )}
                            >
                              {filter}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar pr-1 relative pl-4 border-l border-zinc-100">
                        {filteredTimelineMonths.length === 0 ? (
                          <div className="text-center py-6 text-zinc-400 text-xs font-medium">
                            No months match the selected filter.
                          </div>
                        ) : (
                          filteredTimelineMonths.map((monthInfo, idx) => (
                            <div key={monthInfo.month} className="relative space-y-1">
                              {/* Dot indicator */}
                              <div className={cn(
                                "absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border border-white",
                                monthInfo.status === "PAID"
                                  ? "bg-emerald-500"
                                  : monthInfo.status === "EXEMPTED"
                                    ? "bg-purple-500"
                                    : monthInfo.status === "DUE"
                                      ? "bg-red-500"
                                      : "bg-blue-400"
                              )}></div>

                              <div className={cn(
                                "flex items-center justify-between text-xs p-3 rounded-xl border transition-all",
                                monthInfo.status === "PAID"
                                  ? "bg-emerald-50/25 border-emerald-100"
                                  : monthInfo.status === "EXEMPTED"
                                    ? "bg-purple-50/25 border-purple-100"
                                    : monthInfo.status === "DUE"
                                      ? "bg-red-50/25 border-red-100"
                                      : "bg-blue-50/25 border-blue-100"
                              )}>
                                <span className="font-bold text-zinc-700 uppercase tracking-wider">{monthInfo.month}</span>
                                <div className="flex items-center gap-2.5">
                                  <span className="text-[10px] font-bold text-zinc-400">{formatToINR(monthInfo.amount)}</span>
                                  {monthInfo.status === "PAID" ? (
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold uppercase">Paid</span>
                                  ) : monthInfo.status === "PARTIAL" ? (
                                    <span className="px-2 py-0.5 bg-orange-50 text-orange-605 rounded text-[9px] font-bold uppercase">Partial</span>
                                  ) : monthInfo.status === "EXEMPTED" ? (
                                    <span className="px-2 py-0.5 bg-purple-50 text-purple-650 rounded text-[9px] font-bold uppercase">Waived</span>
                                  ) : monthInfo.status === "DUE" ? (
                                    <span className="px-2 py-0.5 bg-red-50 text-red-500 rounded text-[9px] font-bold uppercase">Due</span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold uppercase">Upcoming</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>

                  {/* RIGHT PANEL (Payment Form & History Table - 7 cols) */}
                  <div className="lg:col-span-7 space-y-6">
                    
                    {/* Record Fee Payment Form */}
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 space-y-6">
                      <div className="border-b border-zinc-100 pb-4">
                        <h4 className="text-md font-bold text-zinc-800 uppercase tracking-tight">Record Fee Settlement</h4>
                        <p className="text-xs text-zinc-400 font-medium">Submit incoming payments and generate vouchers</p>
                      </div>

                      {/* Month Picker Selection Grid */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Payment Target Month *</label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {[...(student.ledger?.monthlyBreakdown || [])].sort((a, b) => {
                            return academicMonthOrder.indexOf(a.month) - academicMonthOrder.indexOf(b.month);
                          }).map((m) => (
                            <button
                              key={m.month}
                              type="button"
                              onClick={() => handleMonthClick(m.month)}
                              disabled={m.status === "PAID" || m.status === "EXEMPTED"}
                              className={cn(
                                "relative py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border text-center flex items-center justify-center cursor-pointer min-h-[44px]",
                                selectedMonths.includes(m.month)
                                  ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-100 scale-95"
                                  : m.status === "PAID"
                                    ? "bg-emerald-50/50 border-emerald-100/50 text-emerald-600/70 cursor-not-allowed opacity-60"
                                    : m.status === "EXEMPTED"
                                      ? "bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed opacity-50"
                                      : "bg-zinc-50/50 border-zinc-200 text-zinc-600 hover:border-orange-300 hover:bg-orange-50/30",
                              )}
                            >
                              <span>{m.month.substring(0, 3)}</span>
                              {m.status === "PAID" && (
                                <span className="absolute -top-1 -right-1 bg-emerald-600 text-white w-4 h-4 rounded-full flex items-center justify-center border border-white text-[8px]">
                                  ✓
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {student.transportMode === 'School Bus' && (
                        <div className="flex items-center gap-3 bg-orange-50/20 border border-orange-100 rounded-xl p-4 transition-all">
                          <input
                            type="checkbox"
                            id="include-transport-checkbox"
                            checked={includeTransport}
                            onChange={(e) => setIncludeTransport(e.target.checked)}
                            className="w-4 h-4 text-orange-500 border-zinc-300 rounded focus:ring-orange-500 cursor-pointer accent-orange-500"
                          />
                          <label htmlFor="include-transport-checkbox" className="text-xs font-bold text-zinc-700 cursor-pointer select-none">
                            Include Transport Fee <span className="text-orange-600 font-black">(₹{student.transportFee !== undefined && student.transportFee !== null ? student.transportFee : 500} / Month)</span>
                          </label>
                        </div>
                      )}

                      {/* Amount & Mode Selector Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        
                        {/* Amount Entry Input */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Collection Value *</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400 text-xs">₹</span>
                            <input
                              type="number"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              className="w-full pl-8 pr-4 py-3.5 bg-zinc-50/50 border border-zinc-200 rounded-2xl text-xs font-bold text-zinc-900 focus:ring-4 focus:ring-orange-100 focus:bg-white outline-none transition-all"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        {/* Payment Mode Selector Pills */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Payment Method *</label>
                          <div className="grid grid-cols-3 gap-2">
                            {["CASH", "UPI", "CARD", "BANK", "ONLINE"].map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => setPaymentMode(mode)}
                                className={cn(
                                  "py-3 px-1 rounded-xl border text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center min-h-[44px]",
                                  paymentMode === mode
                                    ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-100"
                                    : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-350"
                                )}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>

                      {/* Submit CTA */}
                      <div className="pt-4">
                        <Button
                          onClick={() => handlePayment()}
                          loading={loading}
                          disabled={!amount || amount <= 0 || selectedMonths.length === 0}
                          className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-orange-100 active:scale-98 transition-transform"
                        >
                          Confirm payment entry & Print receipt
                        </Button>
                      </div>

                    </div>

                    {/* Settlement Records History Table */}
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-150 pb-4">
                        <div>
                          <h5 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Settlement Records</h5>
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Showing last 5 entries</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleExportCSV}
                            disabled={transactions.length === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-[9px] font-bold text-zinc-500 hover:text-zinc-800 hover:border-zinc-300 transition-colors uppercase tracking-wider cursor-pointer disabled:opacity-50"
                          >
                            <FileSpreadsheet size={12} /> Export CSV
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="text-[10px] font-bold text-zinc-400 border-b border-zinc-100 uppercase tracking-wider">
                              <th className="py-3 px-3">Receipt</th>
                              <th className="py-3 px-3">Month</th>
                              <th className="py-3 px-3">Amount</th>
                              <th className="py-3 px-3">Date</th>
                              <th className="py-3 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-50 text-xs">
                            {transactions.length === 0 ? (
                              <tr>
                                <td colSpan="5" className="py-8 text-center text-zinc-400 font-bold uppercase tracking-wide">
                                  No recent receipts found for this student.
                                </td>
                              </tr>
                            ) : (
                              transactions.slice(0, 5).map((tx, index) => (
                                <tr key={tx._id || index} className="hover:bg-zinc-50/50 transition-colors text-zinc-700 font-semibold rounded-lg">
                                  <td className="py-3 px-3 text-orange-600 font-bold uppercase">
                                    {tx.receiptNumber || (tx._id ? tx._id.toString().slice(-6).toUpperCase() : "N/A")}
                                  </td>
                                  <td className="py-3 px-3 uppercase">{Array.isArray(tx.month) ? tx.month.join(", ") : tx.month}</td>
                                  <td className="py-3 px-3 text-zinc-900 font-bold">{formatToINR(tx.amount)}</td>
                                  <td className="py-3 px-3 text-zinc-400 font-medium">{new Date(tx.createdAt).toLocaleDateString()}</td>
                                  <td className="py-3 px-3 text-right">
                                    <button
                                      onClick={() => handleDownloadReceipt(tx)}
                                      className="p-2 text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-transparent rounded-lg transition-all inline-flex items-center justify-center cursor-pointer"
                                      title="Open Receipt Preview"
                                    >
                                      <Download size={13} />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>

                </div>
              )
            )}

          </div>

        </div>

      </div>

      {/* Success Modal */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        maxWidth="lg"
        className="rounded-3xl border border-zinc-100 shadow-xl overflow-hidden"
        footer={
          <div className="flex gap-4 w-full p-2">
            <Button
              variant="secondary"
              className="flex-1 py-3.5 rounded-2xl text-xs font-bold text-zinc-500 border border-zinc-200 hover:bg-zinc-50 uppercase tracking-wider cursor-pointer"
              onClick={() => setIsSuccessModalOpen(false)}
            >
              Close
            </Button>
          </div>
        }
      >
        <div className="p-4 md:p-6 bg-zinc-50 max-h-[80vh] overflow-y-auto custom-scrollbar rounded-2xl">
          {transaction && (
            <ReceiptPreview
              transaction={transaction}
              student={student}
            />
          )}
        </div>
      </Modal>

      {/* Configure Due Date Day Modal */}
      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        maxWidth="md"
        className="rounded-3xl border border-zinc-150 shadow-xl overflow-hidden"
        title="Configure Monthly Due Date"
      >
        <div className="p-6 space-y-6">
          <div className="bg-orange-50/20 border border-orange-100 p-4 rounded-xl space-y-2">
            <span className="text-[10px] font-black uppercase text-orange-605 tracking-wider">Accounting Standard Note</span>
            <p className="text-xs text-zinc-655 leading-relaxed">
              Fees of any month are flagged as <strong>Upcoming</strong> before the configured due date day day-of-month. Once that day is reached (or has passed), the month changes to <strong>Due</strong>.
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">Monthly Due Day (1st - 28th)</label>
            <div className="flex gap-2 items-center">
              <select
                value={selectedDueDate}
                onChange={(e) => setSelectedDueDate(parseInt(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-800 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer font-sans"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day}th of every month
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              className="flex-1 py-3 rounded-xl text-xs font-bold text-zinc-500 border border-zinc-200 hover:bg-zinc-50 uppercase tracking-wider cursor-pointer"
              onClick={() => setIsSettingsModalOpen(false)}
                >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
              onClick={handleSaveDueDate}
            >
              Save Configuration
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FeeCollection;
