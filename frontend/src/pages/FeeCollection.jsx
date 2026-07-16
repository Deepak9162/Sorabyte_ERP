import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../services/api";
import {
  Search,
  User,
  CheckCircle,
  ChevronRight,
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
  Coins
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
              
              setStudent({
                id: sData.id,
                name: sData.fullName,
                roll: sData.rollNumber,
                totalFee: feeSummary.totalFee,
                paidFee: feeSummary.paidFee,
                dueFee: feeSummary.dueFee,
                class: sData.class,
                ledger: ledger,
                transportMode: sData.transportMode || 'Private',
                transportFee: sData.transportFee || 0
              });
              setTransactions(txs || []);
              setIncludeTransport(false);
              
              const firstUnpaid = ledger?.monthlyBreakdown.find(
                (m) => m.status !== "PAID"
              );
              if (firstUnpaid) {
                setSelectedMonths([firstUnpaid.month]);
              } else {
                setSelectedMonths([]);
              }
              
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
  const [classSummary, setClassSummary] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [schoolStats, setSchoolStats] = useState(null);

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

  // Fetch school stats on mount for general dashboard
  useEffect(() => {
    const fetchSchoolStats = async () => {
      try {
        const res = await api.get("/admin/stats");
        if (res.data.success) {
          setSchoolStats(res.data.data);
        }
      } catch (error) {
        console.error("Error fetching school stats:", error);
      }
    };
    fetchSchoolStats();
  }, []);

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
    // Reset student and current step when class changes
    setStudent(null);
    setCurrentStep("selector");
  }, [selectedClass]);

  const handleSearch = async () => {
    if (!selectedClass) {
      addToast("Please select a class first", "error");
      return;
    }
    if (!searchQuery) return;
    setLoading(true);

    try {
      const res = await api.get(`/fees/${selectedClass}/${searchQuery}?academicYear=${academicYear}`);
      if (res.data.success) {
        const {
          student: s,
          feeSummary,
          ledger,
          transactions: txs,
        } = res.data.data;
        setStudent({
          id: s.id,
          name: s.fullName,
          roll: s.rollNumber,
          totalFee: feeSummary.totalFee,
          paidFee: feeSummary.paidFee,
          dueFee: feeSummary.dueFee,
          class: s.class,
          ledger: ledger,
          transportMode: s.transportMode || 'Private',
          transportFee: s.transportFee || 0
        });
        setTransactions(txs || []);
        setIncludeTransport(false);

        // Auto-select first unpaid month
        const firstUnpaid = ledger?.monthlyBreakdown.find(
          (m) => m.status !== "PAID",
        );
        if (firstUnpaid) {
          setSelectedMonths([firstUnpaid.month]);
        } else {
          setSelectedMonths([]);
        }

        addToast("Student record accessed", "success");
        setCurrentStep("active");
      }
    } catch (error) {
      console.error("Fetch Student Error:", error);
      addToast(`Student "${searchQuery}" not found in this class`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleMonthClick = (clickedMonth) => {
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
        transactionId:
          "TXN-" + Math.random().toString(36).substring(2, 9).toUpperCase(),
        remarks: `Fee paid for ${selectedMonths.join(', ')} via Finance Portal` + (includeTransport ? ' (Includes Transport)' : ''),
      });

      if (res.data.success) {
        const { transaction: tx } = res.data.data;
        setTransaction(tx);
        setIsSuccessModalOpen(true);
        addToast("Transaction processed successfully", "success");
        // Reload student data to refresh ledger
        handleSearch();
      }
    } catch (error) {
      console.error("Payment Error:", error);
      addToast("Failed to process payment", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async (txId) => {
    if (!txId) return;
    try {
      const response = await api.get(`/fees/receipt/${txId}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `receipt-${txId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Download Error:", error);
      addToast("Failed to download receipt", "error");
    }
  };

  const getStudentInitials = (name) => {
    if (!name) return "ST";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 p-1 sm:p-4 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">
            ERP Finance Hub
          </span>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight mt-1">
            Finances & Fee Center
          </h2>
          <p className="text-xs text-gray-400 font-bold mt-1.5 uppercase tracking-wide">
            Track class-wise Expected vs Collected revenues and record fee collections.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-4 py-2 bg-indigo-50 border border-indigo-100/50 rounded-2xl text-[10px] font-black text-indigo-600 shadow-sm uppercase tracking-wider">
            Academic Session: {academicYear}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* 1. LEFT PANEL: Search and Class Selection Controls */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <Search size={18} />
              </div>
              <div>
                <h4 className="text-sm font-black text-gray-800 uppercase tracking-tight">Lookup Controller</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Select target academic segment</p>
              </div>
            </div>

            {/* Select Class Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Academic Class *</label>
              <div className="relative">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-700 focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all appearance-none cursor-pointer outline-none"
                >
                  <option value="">Select Class Group</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      {cls.name} ({cls.students?.length || 0} Students)
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-bold text-xs">
                  ▼
                </div>
              </div>
            </div>

            {/* Search query input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Search Student *</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Roll No or Student Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-700 focus:ring-4 focus:ring-indigo-100 focus:bg-white outline-none transition-all"
                />
              </div>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight ml-1.5">Press Enter to search instantly</p>
            </div>

            {/* Action buttons */}
            <div className="pt-2">
              <Button
                onClick={handleSearch}
                loading={loading}
                disabled={!selectedClass || !searchQuery}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-100 active:scale-98 transition-transform"
              >
                <span>Process Billing</span>
                <ChevronRight size={14} className="animate-pulse" />
              </Button>
              
              {currentStep === "active" && (
                <button
                  onClick={() => {
                    setStudent(null);
                    setCurrentStep("selector");
                    setSearchQuery("");
                  }}
                  className="w-full text-center text-[10px] font-black text-gray-400 hover:text-indigo-600 uppercase tracking-widest mt-4 transition-colors"
                >
                  Return to Dashboard
                </button>
              )}
            </div>
          </div>

          {/* Quick Info Tip Card */}
          <div className="bg-gray-900 rounded-[2rem] p-6 text-white relative overflow-hidden shadow-sm">
            <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-600/20 rounded-full blur-2xl"></div>
            <div className="relative z-10 space-y-4">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-indigo-400">
                <ShieldCheck size={16} />
              </div>
              <h5 className="text-xs font-black uppercase tracking-wider">Secured Finance Portal</h5>
              <p className="text-[10px] text-gray-300 leading-relaxed">
                All transactions are logged under the current administrator session. Fee receipt PDFs are generated dynamically and stored permanently.
              </p>
            </div>
          </div>
        </div>

        {/* 2. RIGHT/CENTER DYNAMIC REGION */}
        <div className="lg:col-span-9">
          
          {/* STEP 1: CLASS SELECTION & OVERVIEW DASHBOARD */}
          {currentStep === "selector" ? (
            <div className="space-y-8">
              
              {/* If no Class is selected, display overall School statistics */}
              {!selectedClass ? (
                <div className="space-y-8">
                  {/* Glassmorphic Greeting Header Banner */}
                  <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 sm:p-10 relative overflow-hidden">
                    <div className="absolute right-10 top-0 w-64 h-64 bg-indigo-100/30 rounded-full blur-3xl"></div>
                    <div className="relative z-10 max-w-xl space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100/30 rounded-full text-[9px] font-black uppercase tracking-wider text-indigo-600">
                        <Coins size={10} /> Billing & Ledgers
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
                        School financial status at a glance
                      </h3>
                      <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                        Select a class group from the controller on the left to review expectancies, collection ratios, and manage student fee schedules.
                      </p>
                    </div>
                  </div>

                  {/* School stats widgets */}
                  {schoolStats ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="bg-white rounded-[2rem] border border-gray-100 p-6 flex items-center gap-5 shadow-sm hover:translate-y-[-2px] transition-all">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Enrolled Students</p>
                          <h4 className="text-xl font-black text-gray-900 mt-0.5">{schoolStats.totalStudents}</h4>
                        </div>
                      </div>

                      <div className="bg-white rounded-[2rem] border border-gray-100 p-6 flex items-center gap-5 shadow-sm hover:translate-y-[-2px] transition-all">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                          <Layers size={20} />
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Active Classes</p>
                          <h4 className="text-xl font-black text-gray-900 mt-0.5">{schoolStats.totalClasses}</h4>
                        </div>
                      </div>

                      <div className="bg-white rounded-[2rem] border border-gray-100 p-6 flex items-center gap-5 shadow-sm hover:translate-y-[-2px] transition-all">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
                          <Wallet size={20} />
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Overall Collected</p>
                          <h4 className="text-xl font-black text-emerald-600 mt-0.5">{formatToINR(schoolStats.totalFeesCollected)}</h4>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-28 bg-white border border-gray-100 rounded-[2rem] flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    </div>
                  )}
                </div>
              ) : isSummaryLoading ? (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center text-center h-[400px]">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Compiling Class Ledgers...</p>
                </div>
              ) : classSummary ? (
                <div className="space-y-8">
                  
                  {/* Expected vs Collected Analytics row */}
                  <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 sm:p-10">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-50 pb-6 mb-8">
                      <div>
                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Selected Segment Overview</span>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight mt-0.5">
                          Class {classSummary.className} Status
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl text-[9px] font-black text-emerald-600 uppercase tracking-wider">
                          Active Term
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                      
                      <div className="p-5 bg-gray-50/50 border border-gray-100 rounded-2xl">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Expected Students</p>
                        <h4 className="text-2xl font-black text-gray-900 mt-1">{classSummary.studentCount}</h4>
                      </div>

                      <div className="p-5 bg-gray-50/50 border border-gray-100 rounded-2xl">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Expected Revenue</p>
                        <h4 className="text-2xl font-black text-gray-800 mt-1">{formatToINR(classSummary.totalExpected)}</h4>
                      </div>

                      <div className="p-5 bg-emerald-50/30 border border-emerald-100/50 rounded-2xl">
                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Total Collected</p>
                        <h4 className="text-2xl font-black text-emerald-600 mt-1">{formatToINR(classSummary.totalCollected)}</h4>
                      </div>

                      <div className="p-5 bg-amber-50/30 border border-amber-100/50 rounded-2xl">
                        <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Outstanding Balances</p>
                        <h4 className="text-2xl font-black text-amber-600 mt-1">{formatToINR(classSummary.totalPending)}</h4>
                      </div>

                    </div>

                    {/* Progress representation */}
                    <div className="mt-8 pt-6 border-t border-gray-50 space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-gray-400">
                        <span>Collection progress ratio</span>
                        <span className="text-indigo-600 font-extrabold text-xs">
                          {((classSummary.totalCollected / classSummary.totalExpected) * 100 || 0).toFixed(1)}% Completed
                        </span>
                      </div>
                      <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-100">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-1000"
                          style={{
                            width: `${(classSummary.totalCollected / classSummary.totalExpected) * 100 || 0}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Active Instruction Block */}
                  <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-8">
                    <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 shrink-0 shadow-inner">
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <h4 className="text-md font-black text-gray-800 uppercase tracking-tight">Record Student Fee Ledger Entry</h4>
                      <p className="text-xs text-gray-400 leading-relaxed font-semibold mt-1">
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
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* A. Student Profile & Summary (Left Column of Dynamic Area) */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* Mini Student Avatar Card */}
                  <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-gray-50/80 rounded-bl-[2rem] flex items-center justify-center font-bold text-xs text-gray-400">
                      R. #{student.roll}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-lg font-black tracking-tight shadow-md shadow-indigo-100 shrink-0">
                        {getStudentInitials(student.name)}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-md font-black text-gray-900 tracking-tight leading-tight">{student.name}</h4>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black uppercase text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                            Class: {student.class}
                          </span>
                          {student.dueFee <= 0 ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black uppercase tracking-wider">
                              No Due
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] font-black uppercase tracking-wider">
                              Due Outstanding
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Student Ledger Financials Summary */}
                  <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 space-y-4">
                    <h5 className="text-xs font-black text-gray-800 uppercase tracking-wider border-b border-gray-50 pb-3">Student Billing Summary</h5>
                    
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-bold uppercase tracking-tight">Academic Tuition Base</span>
                        <span className="text-gray-900 font-black">
                          {formatToINR(student.ledger?.monthlyBreakdown?.[0]?.amount || 0)} <span className="text-[10px] text-gray-400 font-bold">/ Mo</span>
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-bold uppercase tracking-tight">Settled Months</span>
                        <span className="text-emerald-600 font-black">
                          {student.ledger?.monthlyBreakdown?.filter((m) => m.status === "PAID").length || 0}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-bold uppercase tracking-tight">Outstanding Months</span>
                        <span className="text-amber-500 font-black">
                          {student.ledger?.monthlyBreakdown?.filter((m) => m.status !== "PAID").length || 0}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs border-t border-gray-50 pt-3">
                        <span className="text-gray-400 font-bold uppercase tracking-tight">Transport Mode</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                          student.transportMode === 'School Bus'
                            ? "bg-indigo-50 text-indigo-600"
                            : "bg-gray-50 text-gray-500"
                        )}>
                          {student.transportMode || 'Private'}
                        </span>
                      </div>

                      {student.transportMode === 'School Bus' && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400 font-bold uppercase tracking-tight">Transport Fee Base</span>
                          {isEditingTransportFee ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-400 font-black">₹</span>
                              <input
                                type="number"
                                value={tempTransportFee}
                                onChange={(e) => setTempTransportFee(e.target.value)}
                                className="w-16 px-1.5 py-0.5 border border-gray-200 rounded text-center text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-100"
                                placeholder="500"
                                disabled={isUpdatingFee}
                              />
                              <button
                                type="button"
                                onClick={handleUpdateTransportFee}
                                disabled={isUpdatingFee}
                                className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded text-[9px] font-black uppercase transition-colors"
                              >
                                {isUpdatingFee ? "..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsEditingTransportFee(false)}
                                disabled={isUpdatingFee}
                                className="px-2 py-0.5 bg-gray-50 hover:bg-gray-100 text-gray-400 rounded text-[9px] font-black uppercase transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-900 font-black">
                                {formatToINR(student.transportFee || 500)} <span className="text-[10px] text-gray-400 font-bold">/ Mo</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setTempTransportFee((student.transportFee || 500).toString());
                                  setIsEditingTransportFee(true);
                                }}
                                className="text-[10px] text-indigo-600 hover:text-indigo-700 font-black uppercase underline transition-colors"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-50 pt-4 flex justify-between items-center">
                      <span className="text-xs text-gray-400 font-black uppercase tracking-wider">Net Outstanding</span>
                      <span className="text-xl font-black text-gray-900">
                        {formatToINR(Math.max(0, student.dueFee))}
                      </span>
                    </div>
                  </div>

                  {/* Monthly Ledger Details Checklist */}
                  <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 space-y-4">
                    <h5 className="text-xs font-black text-gray-800 uppercase tracking-wider border-b border-gray-50 pb-3">Statement Breakdown</h5>
                    
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {(student.ledger?.monthlyBreakdown || []).map((monthInfo) => (
                        <div key={monthInfo.month} className="flex items-center justify-between text-xs py-1 border-b border-gray-50/50">
                          <span className="font-bold text-gray-600 uppercase tracking-wider">{monthInfo.month}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400">{formatToINR(monthInfo.amount)}</span>
                            {monthInfo.status === "PAID" ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black uppercase">Paid</span>
                            ) : monthInfo.status === "PARTIAL" ? (
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase">Partial</span>
                            ) : monthInfo.status === "EXEMPTED" ? (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded text-[9px] font-black uppercase">Exempted</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-red-50/70 text-red-500 rounded text-[9px] font-black uppercase">Pending</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* B. Collect Payment Form (Right Column of Dynamic Area) */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Settlement Collection Panel */}
                  <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-8">
                    <div className="border-b border-gray-50 pb-4">
                      <h4 className="text-md font-black text-gray-800 uppercase tracking-tight">Record Fee Settlement</h4>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-tight">Submit incoming payments and generate vouchers</p>
                    </div>

                    {/* Month Picker Selection Grid */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Target Month *</label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                        {(student.ledger?.monthlyBreakdown || []).map((m) => (
                          <button
                            key={m.month}
                            type="button"
                            onClick={() => handleMonthClick(m.month)}
                            disabled={m.status === "PAID" || m.status === "EXEMPTED"}
                            className={cn(
                              "relative py-3.5 px-2 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border text-center flex items-center justify-center cursor-pointer",
                              selectedMonths.includes(m.month)
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 scale-95"
                                : m.status === "PAID"
                                  ? "bg-emerald-50/50 border-emerald-100/50 text-emerald-600/70 cursor-not-allowed opacity-60"
                                  : m.status === "EXEMPTED"
                                    ? "bg-gray-100/50 border-gray-200/50 text-gray-300 cursor-not-allowed opacity-50"
                                    : "bg-gray-50/50 border-gray-100 text-gray-500 hover:border-indigo-300 hover:bg-indigo-50/30",
                            )}
                          >
                            <span>{m.month.substring(0, 3)}</span>
                            {m.status === "PAID" && (
                              <span className="absolute -top-1 -right-1 bg-emerald-600 text-white w-4 h-4 rounded-full flex items-center justify-center border border-white">
                                ✓
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {student.transportMode === 'School Bus' && (
                      <div className="flex items-center gap-3 bg-indigo-50/20 border border-indigo-50/50 rounded-2xl p-4 transition-all">
                        <input
                          type="checkbox"
                          id="include-transport-checkbox"
                          checked={includeTransport}
                          onChange={(e) => setIncludeTransport(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                        />
                        <label htmlFor="include-transport-checkbox" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
                          Include Transport Fee <span className="text-indigo-600 font-extrabold">(₹{student.transportFee || 500} / Month)</span>
                        </label>
                      </div>
                    )}

                    {/* Amount & Mode Selector Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      
                      {/* Amount Entry Input */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Collection Value *</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400 text-xs">₹</span>
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full pl-8 pr-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-900 focus:ring-4 focus:ring-indigo-100 focus:bg-white outline-none"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {/* Payment Mode Selector Dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Method *</label>
                        <div className="grid grid-cols-3 gap-2">
                          {["CASH", "CARD", "ONLINE"].map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setPaymentMode(mode)}
                              className={cn(
                                "py-3.5 rounded-2xl border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-center",
                                paymentMode === mode
                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                                  : "bg-gray-50/50 border-gray-100 text-gray-500 hover:border-gray-200"
                              )}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>

                    {/* Big Action Submit Button */}
                    <div className="pt-4">
                      <Button
                        onClick={() => handlePayment()}
                        loading={loading}
                        disabled={!amount || amount <= 0 || selectedMonths.length === 0}
                        className="w-full py-4.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 active:scale-98 transition-transform"
                      >
                        Confirm payment entry & Print receipt
                      </Button>
                    </div>

                  </div>

                  {/* Recent Settlement History */}
                  <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                      <h5 className="text-xs font-black text-gray-800 uppercase tracking-wider">Settlement Records</h5>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Showing last 5 entries</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[10px] font-black text-gray-400 border-b border-gray-50 uppercase tracking-wider">
                            <th className="py-3">Receipt</th>
                            <th className="py-3">Month</th>
                            <th className="py-3">Amount</th>
                            <th className="py-3">Date</th>
                            <th className="py-3 text-right">Receipt File</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50/50">
                          {transactions.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="py-6 text-center text-xs font-bold text-gray-400 uppercase tracking-wide">
                                No recent receipts found for this student.
                              </td>
                            </tr>
                          ) : (
                            transactions.slice(0, 5).map((tx) => (
                              <tr key={tx._id} className="text-xs font-bold text-gray-600">
                                <td className="py-3 text-indigo-600 uppercase tracking-tight">
                                  {tx.receiptNumber || tx._id.toString().slice(-6).toUpperCase()}
                                </td>
                                <td className="py-3 uppercase">{tx.month}</td>
                                <td className="py-3 text-gray-900 font-extrabold">{formatToINR(tx.amount)}</td>
                                <td className="py-3 text-gray-400 font-semibold">{new Date(tx.createdAt).toLocaleDateString()}</td>
                                <td className="py-3 text-right">
                                  <button
                                    onClick={() => handleDownloadReceipt(tx._id)}
                                    className="p-2 text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-xl transition-all inline-flex items-center justify-center"
                                    title="Download Receipt PDF"
                                  >
                                    <Download size={14} />
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

      {/* Success Modal */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        maxWidth="lg"
        className="rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden"
        footer={
          <div className="flex gap-4 w-full p-2">
            <Button
              variant="secondary"
              className="flex-1 py-3.5 rounded-2xl text-xs font-bold text-gray-600 border border-gray-100 hover:bg-gray-50 uppercase tracking-wider cursor-pointer"
              onClick={() => setIsSuccessModalOpen(false)}
            >
              Close
            </Button>
          </div>
        }
      >
        <div className="p-4 md:p-6 bg-gray-50 max-h-[80vh] overflow-y-auto custom-scrollbar rounded-2xl">
          {transaction && (
            <ReceiptPreview
              transaction={transaction}
              student={student}
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default FeeCollection;
