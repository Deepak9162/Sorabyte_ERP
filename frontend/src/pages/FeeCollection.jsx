import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
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
  Check
} from "lucide-react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import { useToast } from "../context/ToastContext";
import { cn } from "../utils/cn";
import { formatToINR } from "../utils/format";
import ReceiptPreview from "../components/ui/ReceiptPreview";

const FeeCollection = () => {
  const { addToast } = useToast();
  const location = useLocation();

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
              
              const firstUnpaid = (ledger?.monthlyBreakdown || []).find(
                (m) => m.status !== "PAID" && m.status !== "EXEMPTED"
              );
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

  // Fetch school stats and configured due date day
  useEffect(() => {
    const fetchSchoolStatsAndDueDate = async () => {
      try {
        const [statsRes, dueDateRes] = await Promise.all([
          api.get("/admin/stats"),
          api.get("/settings/fee-due-date")
        ]);
        if (statsRes.data.success) {
          setSchoolStats(statsRes.data.data);
        }
        if (dueDateRes.data.success) {
          setMonthlyFeeDueDate(dueDateRes.data.data);
          setSelectedDueDate(dueDateRes.data.data);
        }
      } catch (error) {
        console.error("Error fetching initial statistics or settings:", error);
      }
    };
    fetchSchoolStatsAndDueDate();
  }, []);

  const handleSaveDueDate = async () => {
    try {
      const res = await api.put("/settings/fee-due-date", { dueDate: selectedDueDate });
      if (res.data.success) {
        setMonthlyFeeDueDate(res.data.data);
        addToast("Monthly due date day updated successfully", "success");
        setIsSettingsModalOpen(false);
        // Refresh school stats and active student ledger (if loaded)
        const statsRes = await api.get("/admin/stats");
        if (statsRes.data.success) {
          setSchoolStats(statsRes.data.data);
        }
        if (selectedClass) {
          const summaryRes = await api.get(`/admin/classes/${selectedClass}/summary`);
          if (summaryRes.data.success) {
            setClassSummary(summaryRes.data.data);
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

  // Fetch class summary when selectedClass changes
  useEffect(() => {
    const fetchClassSummary = async () => {
      if (!selectedClass) {
        setClassSummary(null);
        return;
      }
      setIsSummaryLoading(true);
      try {
        const res = await api.get(`/admin/classes/${selectedClass}/summary`);
        if (res.data.success) {
          setClassSummary(res.data.data);
        }
      } catch (error) {
        console.error("Error fetching class summary:", error);
      } finally {
        setIsSummaryLoading(false);
      }
    };
    fetchClassSummary();
    setStudent(null);
    setCurrentStep("selector");
  }, [selectedClass]);

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
          return sum + (mInfo ? (mInfo.transportPending !== undefined ? mInfo.transportPending : (student.transportFee || 500)) : (student.transportFee || 500));
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
      const res = await api.get(`/fees/${selectedClass}/${searchQuery}?academicYear=2026-2027`);
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
        
        const firstUnpaid = (ledger?.monthlyBreakdown || []).find(
          (m) => m.status !== "PAID" && m.status !== "EXEMPTED"
        );
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
        
        const firstUnpaid = (ledger?.monthlyBreakdown || []).find(
          (m) => m.status !== "PAID" && m.status !== "EXEMPTED"
        );
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
    const breakdown = student?.ledger?.monthlyBreakdown || [];
    if (timelineFilter === "ALL") return breakdown;
    if (timelineFilter === "DUE") return breakdown.filter(m => m.status === "DUE" || m.status === "PARTIAL");
    if (timelineFilter === "UPCOMING") return breakdown.filter(m => m.status === "UPCOMING");
    if (timelineFilter === "PAID") return breakdown.filter(m => m.status === "PAID");
    if (timelineFilter === "WAIVED") return breakdown.filter(m => m.status === "EXEMPTED");
    return breakdown;
  }, [student, timelineFilter]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans antialiased text-zinc-900 pb-16 pt-0">
      
      <div className="max-w-[1600px] mx-auto px-6 py-0 space-y-5">
        
        {/* Compact Settings & Status row */}
        <div className="flex justify-between items-center border-b border-zinc-200/60 pb-3">
          <span className="text-[10px] font-black text-zinc-450 uppercase tracking-wider">Analytics Overview</span>
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 border border-zinc-250 bg-white hover:bg-zinc-50 hover:border-zinc-300 rounded-xl text-[11px] font-bold text-zinc-600 transition-all shadow-sm cursor-pointer"
          >
            <Clock size={12} className="text-orange-500 animate-pulse" />
            <span>Due Date: {monthlyFeeDueDate || 10}th of Month</span>
          </button>
        </div>

        {/* 2. TOP SUMMARY SECTION: 4 ANALYTICS CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Total Paid */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 flex items-center justify-between shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all duration-300 group">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Paid</span>
              <h3 className="text-2xl font-bold text-emerald-600">
                {classSummary 
                  ? formatToINR(classSummary.totalCollected) 
                  : formatToINR(schoolStats?.totalFeesCollected || 0)}
              </h3>
              <p className="text-[10px] text-zinc-400 font-medium">Total fees collected</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <Coins size={22} />
            </div>
          </div>

          {/* Card 2: Collected This Month */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 flex items-center justify-between shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all duration-300 group">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Collected This Month</span>
              <h3 className="text-2xl font-bold text-blue-600">
                {classSummary 
                  ? formatToINR(classSummary.collectedThisMonth || 0) 
                  : formatToINR(schoolStats?.collectedThisMonth || 0)}
              </h3>
              <p className="text-[10px] text-zinc-400 font-medium">Current calendar month</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <CheckCircle size={22} />
            </div>
          </div>

          {/* Card 3: Outstanding Till Today */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 flex items-center justify-between shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all duration-300 group">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Outstanding Till Today</span>
              <h3 className="text-2xl font-bold text-red-500">
                {classSummary 
                  ? formatToINR(classSummary.totalPending) 
                  : formatToINR(schoolStats?.currentDueAmount || 0)}
              </h3>
              <p className="text-[10px] text-zinc-400 font-medium">Overdue amount only</p>
            </div>
            <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
              <AlertCircle size={22} />
            </div>
          </div>

          {/* Card 4: Upcoming Fee Amount */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 flex items-center justify-between shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all duration-300 group">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Upcoming Fee Amount</span>
              <h3 className="text-2xl font-bold text-indigo-600">
                {classSummary 
                  ? formatToINR(classSummary.upcomingFeeAmount || 0) 
                  : formatToINR(schoolStats?.upcomingFeeAmount || 0)}
              </h3>
              <p className="text-[10px] text-zinc-400 font-medium">Future pending installments</p>
            </div>
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
              <Clock size={22} />
            </div>
          </div>
        </section>

        {/* 3. MAIN WORKSPACE CONTAINER */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT PANEL: Class & Student Selection (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                  <Filter size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-800 uppercase tracking-tight">Lookup Controller</h4>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">Select target academic segment</p>
                </div>
              </div>



              {/* Searchable Dropdown for Class */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Academic Class *</label>
                <div className="relative">
                  <div 
                    className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50/50 border border-zinc-200 rounded-2xl cursor-pointer hover:bg-white hover:border-orange-400 transition-all text-xs font-semibold text-zinc-700 outline-none"
                    onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                  >
                    <span>
                      {selectedClass 
                        ? classes.find(c => c._id === selectedClass)?.name || "Select Class Group" 
                        : "Select Class Group"}
                    </span>
                    <ChevronDown size={14} className="text-zinc-400" />
                  </div>
                  
                  {isClassDropdownOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-zinc-200 rounded-2xl shadow-xl p-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="relative flex items-center">
                        <Search size={14} className="absolute left-3 text-zinc-400" />
                        <input
                          type="text"
                          placeholder="Search class..."
                          value={classSearchQuery}
                          onChange={(e) => setClassSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 border border-zinc-150 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-orange-100 text-zinc-700"
                          onClick={(e) => e.stopPropagation()} // Prevent closing dropdown on input click
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-0.5">
                        {filteredClassesList.length === 0 ? (
                          <p className="text-[10px] text-zinc-400 text-center py-4 font-bold uppercase">No classes found</p>
                        ) : (
                          filteredClassesList.map(cls => (
                            <div
                              key={cls._id}
                              onClick={() => {
                                setSelectedClass(cls._id);
                                setClassSearchQuery("");
                                setIsClassDropdownOpen(false);
                              }}
                              className={cn(
                                "px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex justify-between items-center",
                                selectedClass === cls._id
                                  ? "bg-orange-50 text-orange-600"
                                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                              )}
                            >
                              <span>{cls.name}</span>
                              <span className="text-[9px] opacity-70 font-semibold bg-zinc-100 px-1.5 py-0.5 rounded">
                                {cls.students?.length || 0} Stu
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Search query input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Search Student *</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input
                    type="text"
                    placeholder="Roll No or Student Name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    className="w-full pl-11 pr-4 py-3.5 bg-zinc-50/50 border border-zinc-200 rounded-2xl text-xs font-semibold text-zinc-700 focus:ring-4 focus:ring-orange-100 focus:bg-white outline-none transition-all"
                  />
                </div>
                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight ml-1.5">Press Enter to search instantly</p>
              </div>

              {/* Action search button */}
              <div className="pt-2">
                <Button
                  onClick={handleSearch}
                  loading={loading}
                  disabled={!selectedClass || !searchQuery}
                  className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-orange-100 active:scale-98 transition-transform"
                >
                  <span>Process Billing</span>
                  <ChevronRight size={14} />
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
                    
                    {/* Expected vs Collected Analytics details */}
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5 mb-6">
                        <div>
                          <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Selected Segment Overview</span>
                          <h3 className="text-xl font-bold text-zinc-900 tracking-tight mt-0.5">
                            Class {classSummary.className} Status
                          </h3>
                        </div>
                        <div>
                          <span className="px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-[9px] font-bold text-emerald-600 uppercase tracking-wider">
                            Active Session
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="p-5 bg-zinc-50/50 border border-zinc-200 rounded-xl">
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Expected Revenue</p>
                          <h4 className="text-xl font-bold text-zinc-900 mt-1">{formatToINR(classSummary.totalExpected)}</h4>
                        </div>

                        <div className="p-5 bg-emerald-50/20 border border-emerald-100 rounded-xl">
                          <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Total Collected</p>
                          <h4 className="text-xl font-bold text-emerald-600 mt-1">{formatToINR(classSummary.totalCollected)}</h4>
                        </div>

                        <div className="p-5 bg-amber-50/20 border border-amber-100 rounded-xl">
                          <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Outstanding Balance</p>
                          <h4 className="text-xl font-bold text-amber-600 mt-1">{formatToINR(classSummary.totalPending)}</h4>
                        </div>
                      </div>

                      {/* Progress representation */}
                      <div className="mt-8 pt-6 border-t border-zinc-100 space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          <span>Collection progress ratio</span>
                          <span className="text-orange-500 font-extrabold text-xs">
                            {((classSummary.totalCollected / classSummary.totalExpected) * 100 || 0).toFixed(1)}% Completed
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden p-0.5 border border-zinc-100">
                          <div
                            className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-1000"
                            style={{
                              width: `${(classSummary.totalCollected / classSummary.totalExpected) * 100 || 0}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Active Instruction Block */}
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 flex flex-col sm:flex-row items-center gap-6">
                      <div className="w-14 h-14 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-center text-orange-500 shrink-0">
                        <BookOpen size={22} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-800 uppercase tracking-tight">Record Student Fee Ledger Entry</h4>
                        <p className="text-xs text-zinc-500 font-medium leading-relaxed mt-1">
                          Use the Lookup Controller sidebar to type the Roll Number or student name in class <strong>{classSummary.className}</strong>. Confirm the billing entry and print receipts.
                        </p>
                      </div>
                    </div>

                  </div>
                ) : null}

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
                                  {formatToINR(student.transportFee || 500)} <span className="text-[10px] text-zinc-400 font-medium">/ Mo</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTempTransportFee((student.transportFee || 500).toString());
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
                          {(student.ledger?.monthlyBreakdown || []).map((m) => (
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
                            Include Transport Fee <span className="text-orange-600 font-black">(₹{student.transportFee || 500} / Month)</span>
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
                          <button
                            onClick={handlePrintTable}
                            disabled={transactions.length === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-[9px] font-bold text-zinc-500 hover:text-zinc-800 hover:border-zinc-300 transition-colors uppercase tracking-wider cursor-pointer disabled:opacity-50"
                          >
                            <Printer size={12} /> Print
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
