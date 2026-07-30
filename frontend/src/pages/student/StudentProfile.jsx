import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { formatDateString } from "../../utils/dateUtils";
import {
  User,
  GraduationCap,
  MapPin,
  Phone,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Printer,
  FileText,
  BadgeInfo,
  CreditCard,
  UserSquare2,
  UserCheck,
  Percent,
  CalendarCheck2,
  Sparkles,
  Activity,
  Award,
  Download,
  Eye,
  FileDown,
  Building2,
  BookOpen,
  Milestone,
  Check,
  ShieldCheck,
  XCircle,
  Info,
  Landmark,
} from "lucide-react";
import api from "../../services/api";
import Button from "../../components/ui/Button";
import { cn } from "../../utils/cn";
import { resolveStudentPhotoUrl } from "../../utils/imageUtils";

const StudentProfile = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [rawStudent, setRawStudent] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [attLoading, setAttLoading] = useState(true);

  // Dynamic API host resolution for static assets (studentPhoto, qrCode)
  const apiHost = api.defaults.baseURL
    ? api.defaults.baseURL.replace("/api", "")
    : "";

  const fetchProfile = React.useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const res = await api.get(`/students/${studentId}/profile`);
        if (res.data.success) {
          setStudent(res.data.data);
        }
      } catch (error) {
        console.error("Error fetching student profile:", error);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [studentId],
  );

  const fetchAdditionalDetails = React.useCallback(async (dbId) => {
    try {
      const res = await api.get(`/students/${dbId}`);
      if (res.data.success) {
        setRawStudent(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching raw student details:", error);
    }
  }, []);

  const fetchAttendance = React.useCallback(async (dbId) => {
    try {
      setAttLoading(true);
      if (dbId) {
        const res = await api.get(`/admin/attendance/student/${dbId}`);
        if (res.data.success) {
          setAttendance(res.data.data);
        }
      }
    } catch (error) {
      console.error("Error fetching student attendance report:", error);
    } finally {
      setAttLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (student) {
      const dbId = student.personalDetails?._id || student._id;
      if (dbId) {
        fetchAttendance(dbId);
        fetchAdditionalDetails(dbId);
      }
    }
  }, [student, fetchAttendance, fetchAdditionalDetails]);

  const handlePrint = () => {
    window.print();
  };

  const maskAadhar = (aadhar) => {
    if (!aadhar) return "N/A";
    const cleaned = aadhar.replace(/\s+/g, "");
    if (cleaned.length < 4) return aadhar;
    return `XXXX-XXXX-${cleaned.slice(-4)}`;
  };

  const calculateAge = (dobString) => {
    if (!dobString) return "N/A";
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} Years`;
  };

  const attendanceStats = useMemo(() => {
    if (!attendance || !attendance.records)
      return { present: 0, absent: 0, late: 0, leave: 0 };
    let present = 0,
      absent = 0,
      late = 0,
      leave = 0;
    attendance.records.forEach((r) => {
      if (r.status === "Present") present++;
      else if (r.status === "Absent") absent++;
      else if (r.status === "Late") late++;
      else if (r.status === "Leave" || r.status === "Excused") leave++;
    });
    return { present, absent, late, leave };
  }, [attendance]);

  // ── Student Document Hub Mapping Engine (O(1) Map evaluation) ─────────────
  const documentMap = useMemo(() => {
    const map = new Map();

    const aliases = {
      AADHAAR: ['aadharCard', 'aadhar', 'aadhar_card', 'aadhaar', 'aadhaarCard', 'AADHAAR', 'AADHAAR_CARD', 'AADHAAR CARD', 'AADHAAR NUMBER', 'AADHAR NUMBER', 'AADHAR CARD', 'AADHAR'],
      BIRTH_CERTIFICATE: ['birthCertificate', 'birth_certificate', 'dobCertificate', 'BIRTH_CERTIFICATE', 'BIRTH CERTIFICATE', 'BIRTH CERTIFICATE NO', 'BIRTH CERTIFICATE NUMBER', 'BIRTH CERTIFICATE #', 'DOB CERTIFICATE'],
      TRANSFER_CERTIFICATE: ['transferCertificate', 'transfer_certificate', 'tc', 'TRANSFER_CERTIFICATE', 'TRANSFER CERTIFICATE', 'TRANSFER CERTIFICATE NO', 'TRANSFER CERTIFICATE NUMBER', 'TC NO', 'TC NUMBER']
    };

    const isInvalidVal = (val) => {
      if (val === undefined || val === null) return true;
      const str = String(val).trim().toLowerCase();
      return str === '' || str === 'unknown' || str === 'n/a' || str === 'null' || str === 'undefined' || str === 'not provided';
    };

    const registerDoc = (typeKey, fileOrVal) => {
      if (isInvalidVal(fileOrVal)) return;

      const isObject = typeof fileOrVal === 'object' && fileOrVal !== null;
      const url = isObject
        ? (fileOrVal.url || fileOrVal.filePath || fileOrVal.path || fileOrVal.fileUrl || '')
        : (typeof fileOrVal === 'string' && (fileOrVal.startsWith('/uploads/') || fileOrVal.startsWith('http') || fileOrVal.includes('.pdf') || fileOrVal.includes('.jpg') || fileOrVal.includes('.jpeg') || fileOrVal.includes('.png')) ? fileOrVal : '');

      const docNo = typeof fileOrVal === 'string' && !url
        ? fileOrVal
        : (isObject ? (fileOrVal.number || fileOrVal.docNumber || fileOrVal.docNo || fileOrVal.value || '') : '');

      const verificationStatus = isObject
        ? (fileOrVal.verificationStatus || fileOrVal.status || 'Verified')
        : 'Verified';

      const existing = map.get(typeKey);

      map.set(typeKey, {
        type: typeKey,
        url: url || existing?.url || '',
        docNo: docNo || existing?.docNo || '',
        raw: fileOrVal,
        isSubmitted: true
      });
    };

    // 1. Scan customFields from student.personalDetails, rawStudent, or student
    const customFieldsData = rawStudent?.customFields || student?.personalDetails?.customFields || student?.customFields;
    if (customFieldsData) {
      let entries = [];
      if (customFieldsData instanceof Map) {
        entries = Array.from(customFieldsData.entries());
      } else if (typeof customFieldsData === 'object' && customFieldsData !== null) {
        entries = Object.entries(customFieldsData);
      }

      entries.forEach(([cfKey, cfVal]) => {
        if (isInvalidVal(cfVal)) return;
        const normKey = String(cfKey).trim().toUpperCase();

        for (const [typeKey, aliasList] of Object.entries(aliases)) {
          if (aliasList.some(a => a.toUpperCase() === normKey || normKey.includes(a.toUpperCase()))) {
            registerDoc(typeKey, cfVal);
            break;
          }
        }
      });
    }

    // 2. Check top level student fields
    const aadharVal = rawStudent?.aadhar || student?.personalDetails?.aadhar || student?.aadhar || rawStudent?.aadharCard || student?.personalDetails?.aadharCard || student?.aadharCard;
    if (!isInvalidVal(aadharVal)) {
      registerDoc('AADHAAR', aadharVal);
    }

    const birthVal = rawStudent?.birthCertificate || student?.personalDetails?.birthCertificate || student?.birthCertificate;
    if (!isInvalidVal(birthVal)) {
      registerDoc('BIRTH_CERTIFICATE', birthVal);
    }

    const tcVal = rawStudent?.transferCertificate || student?.personalDetails?.transferCertificate || student?.transferCertificate || rawStudent?.tc || student?.tc;
    if (!isInvalidVal(tcVal)) {
      registerDoc('TRANSFER_CERTIFICATE', tcVal);
    }

    // 3. Check array of documents if present
    const docList = Array.isArray(rawStudent?.documents)
      ? rawStudent.documents
      : Array.isArray(student?.documents)
      ? student.documents
      : Array.isArray(student?.personalDetails?.documents)
      ? student.personalDetails.documents
      : [];

    docList.forEach((docItem) => {
      if (!docItem) return;
      const docType = (docItem.type || docItem.documentType || docItem.category || docItem.name || docItem.key || '').toUpperCase();

      for (const [key, aliasList] of Object.entries(aliases)) {
        if (aliasList.some(alias => alias.toUpperCase() === docType || docType.includes(alias.toUpperCase()))) {
          registerDoc(key, docItem);
          break;
        }
      }
    });

    // 4. Scan objects (documents schemas)
    const sources = [
      rawStudent?.documents,
      student?.documents,
      student?.personalDetails?.documents,
    ];

    sources.forEach((src) => {
      if (src && typeof src === 'object' && !Array.isArray(src)) {
        for (const [propKey, propVal] of Object.entries(src)) {
          if (isInvalidVal(propVal)) continue;
          for (const [key, aliasList] of Object.entries(aliases)) {
            if (aliasList.some(a => a.toLowerCase() === propKey.toLowerCase())) {
              registerDoc(key, propVal);
              break;
            }
          }
        }
      }
    });

    return map;
  }, [student, rawStudent]);

  const standardDocumentTypes = [
    {
      key: 'AADHAAR',
      title: 'Aadhaar Card',
      subtitle: 'Identification Doc',
      iconBg: 'bg-indigo-50 text-indigo-600',
      tag: 'Mandatory',
    },
    {
      key: 'BIRTH_CERTIFICATE',
      title: 'Birth Certificate',
      subtitle: 'DOB Verification',
      iconBg: 'bg-purple-50 text-purple-600',
      tag: 'Optional',
    },
    {
      key: 'TRANSFER_CERTIFICATE',
      title: 'Transfer Certificate',
      subtitle: 'Previous Institution',
      iconBg: 'bg-amber-50 text-amber-600',
      tag: 'Pending',
    },
  ];

  const timelineEvents = useMemo(() => {
    const events = [];
    if (!student) return events;
    const { personalDetails, academicDetails, feeSummary } = student;

    // 1. Admission Created
    if (personalDetails?.admissionDate) {
      events.push({
        title: "Admission Record Created",
        description: `Enrolled in Class ${academicDetails?.className || "N/A"} - Section ${academicDetails?.section || "A"}`,
        date: new Date(personalDetails.admissionDate),
        type: "admission",
        color: "bg-indigo-500",
      });
    }

    // 2. Fee Payments
    if (feeSummary?.monthlyFees) {
      feeSummary.monthlyFees.forEach((fee) => {
        if (fee.status === "PAID" && fee.paidOn) {
          events.push({
            title: `Fee Clearance - ${fee.month}`,
            description: `Tuition fee of ₹${fee.paidAmount.toLocaleString()} settled successfully.`,
            date: new Date(fee.paidOn),
            type: "fee",
            color: "bg-emerald-500",
          });
        } else if (fee.status === "PARTIAL" && fee.paidOn) {
          events.push({
            title: `Partial Fee Clearance - ${fee.month}`,
            description: `Paid ₹${fee.paidAmount.toLocaleString()} towards outstanding month balance.`,
            date: new Date(fee.paidOn),
            type: "fee",
            color: "bg-amber-500",
          });
        }
      });
    }

    // 3. Attendance Marked
    if (attendance?.records && attendance.records.length > 0) {
      attendance.records.slice(0, 3).forEach((record) => {
        events.push({
          title: `Attendance: ${record.status}`,
          description: record.remarks
            ? `Remarks: ${record.remarks}`
            : `Student was marked ${record.status} in class registry.`,
          date: new Date(record.date),
          type: "attendance",
          color:
            record.status === "Present" || record.status === "Late"
              ? "bg-teal-500"
              : "bg-rose-500",
        });
      });
    }

    return events.sort((a, b) => b.date - a.date);
  }, [student, attendance]);

  const lastPayment = useMemo(() => {
    if (!student || !student.feeSummary || !student.feeSummary.monthlyFees)
      return null;
    const paidMonths = student.feeSummary.monthlyFees.filter((m) => m.paidOn);
    if (paidMonths.length === 0) return null;
    const sorted = paidMonths.sort(
      (a, b) => new Date(b.paidOn) - new Date(a.paidOn),
    );
    return sorted[0];
  }, [student]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse p-6 bg-zinc-50/50 min-h-screen">
        <div className="flex justify-between items-center">
          <div className="h-10 w-48 bg-zinc-200 rounded-2xl" />
          <div className="h-10 w-64 bg-zinc-200 rounded-2xl" />
        </div>
        <div className="h-44 bg-zinc-200 rounded-[2.5rem]" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-24 bg-zinc-200 rounded-3xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-zinc-200 rounded-[2.5rem] lg:col-span-1" />
          <div className="h-96 bg-zinc-200 rounded-[2.5rem] lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <AlertCircle size={48} className="text-gray-300 animate-bounce" />
        <h2 className="text-2xl font-black text-gray-900 font-sans">
          Student Record Not Found
        </h2>
        <Button
          onClick={() => navigate("/students")}
          icon={ArrowLeft}
          className="rounded-2xl"
        >
          Back to Directory
        </Button>
      </div>
    );
  }

  const { personalDetails, academicDetails, contactDetails, feeSummary } =
    student;

  // Resolve photo URL & source
  const photoUrl = resolveStudentPhotoUrl(personalDetails || student, apiHost);
  const photoSource = personalDetails?.photoSource || student?.photoSource || (photoUrl && photoUrl.includes('google.com') ? 'link' : 'upload');

  return (
    <div className="min-h-screen bg-zinc-50/50 animate-in fade-in duration-500 pb-20 print:bg-white print:p-0">
      <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6">
        {/* ─── HEADER & ACTIONS ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden pt-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/students")}
              className="p-3 text-zinc-500 hover:text-zinc-950 bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
                Student Profile Dashboard
              </h1>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                360° Academic, Attendance & Financial Analytics overview
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() =>
                navigate(
                  `/students/${personalDetails.studentId || studentId}/idcard`,
                )
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-150 cursor-pointer"
            >
              <UserSquare2 size={15} />
              <span>Generate ID Card</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-all shadow-sm cursor-pointer"
            >
              <Printer size={15} />
              <span>Print Profile</span>
            </button>
          </div>
        </div>

        {/* ─── 1. HERO STUDENT HEADER ───────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-50/20 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center md:items-start lg:items-center gap-6 text-center md:text-left relative z-15">
            {/* Profile Avatar & Actions */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-24 h-24 md:w-28 md:h-28 bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 rounded-[2.2rem] flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-indigo-100 border-4 border-white shrink-0 overflow-hidden uppercase relative group">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={personalDetails?.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <span>
                    {(personalDetails?.name || "??")
                      .split(" ")
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")}
                  </span>
                )}
              </div>

              {/* Photo Source Badge */}
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-zinc-100 text-zinc-600 border border-zinc-200">
                Source: {photoSource === 'link' ? 'Google Drive / Link' : 'Uploaded Image'}
              </span>

              {/* Photo Action Buttons */}
              <div className="flex items-center gap-1.5 mt-0.5 print:hidden">
                {photoUrl && (
                  <a
                    href={photoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                    title="View Image"
                  >
                    <Eye size={12} /> View
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => navigate(`/students/edit/${personalDetails?._id || student?._id}`)}
                  className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  title="Change Photo"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Student metadata info */}
            <div className="space-y-4 w-full">
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight leading-tight">
                  {personalDetails?.name}
                </h2>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                  Roll Number:{" "}
                  <span className="text-zinc-800 font-extrabold">
                    {personalDetails?.rollNumber || "N/A"}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span
                  className={cn(
                    "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border",
                    personalDetails?.status === "Active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-rose-50 text-rose-700 border-rose-100",
                  )}
                >
                  {personalDetails?.status || "Inactive"}
                </span>
                <span className="px-3 py-1 bg-indigo-50/50 text-indigo-700 border border-indigo-100/30 rounded-xl text-[9px] font-black uppercase tracking-wider">
                  Class {academicDetails?.className} • Section{" "}
                  {academicDetails?.section || "A"}
                </span>
                <span className="px-3 py-1 bg-zinc-100 text-zinc-600 border border-zinc-200 rounded-xl text-[9px] font-black uppercase tracking-wider font-mono">
                  ID: {personalDetails?.studentId}
                </span>
                <span className="px-3 py-1 bg-zinc-150 text-zinc-700 border border-zinc-250 rounded-xl text-[9px] font-black uppercase tracking-wider">
                  Adm No: {personalDetails?.admissionNumber || "N/A"}
                </span>
                <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-xl text-[9px] font-black uppercase tracking-wider">
                  Session: {academicDetails?.session || "N/A"}
                </span>
                {rawStudent?.transportMode && (
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl text-[9px] font-black uppercase tracking-wider">
                    Bus: {rawStudent.transportMode}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── 2. BETTER STATISTICS CARDS ───────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Assessed fees */}
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 flex items-center gap-4 hover:shadow-md transition-all group duration-300">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 group-hover:scale-105 transition-transform">
              ₹
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block leading-none">
                Total Assessed Fee
              </span>
              <span className="text-xl font-extrabold text-zinc-800 block mt-2 truncate">
                ₹{feeSummary?.totalFee.toLocaleString() || "0"}
              </span>
            </div>
          </div>

          {/* Paid amount */}
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 flex items-center gap-4 hover:shadow-md transition-all group duration-300">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CheckCircle2 size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest block leading-none">
                Payments Cleared
              </span>
              <span className="text-xl font-extrabold text-emerald-700 block mt-2 truncate">
                ₹{feeSummary?.totalPaid.toLocaleString() || "0"}
              </span>
            </div>
          </div>

          {/* Outstanding amount */}
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 flex items-center gap-4 hover:shadow-md transition-all group duration-300">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <AlertCircle size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest block leading-none">
                Outstanding Dues
              </span>
              <span className="text-xl font-extrabold text-rose-700 block mt-2 truncate">
                ₹{feeSummary?.pendingAmount.toLocaleString() || "0"}
              </span>
            </div>
          </div>

          {/* Attendance ratio */}
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 flex items-center gap-4 hover:shadow-md transition-all group duration-300">
            <div
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform",
                attendance?.summary?.percentage >= 75
                  ? "bg-teal-50 text-teal-650"
                  : "bg-orange-50 text-orange-600",
              )}
            >
              <Percent size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block leading-none">
                Attendance Ratio
              </span>
              <span
                className={cn(
                  "text-xl font-extrabold block mt-2",
                  attendance?.summary?.percentage >= 75
                    ? "text-teal-700"
                    : "text-orange-700",
                )}
              >
                {attLoading
                  ? "..."
                  : attendance?.summary
                    ? `${attendance.summary.percentage}%`
                    : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* ─── 3. INFORMATION GRID (PERSONAL, ACADEMIC & GUARDIAN) ─────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card A: Personal Information */}
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 mb-2">
              <User className="text-indigo-600" size={16} />
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                Personal Information
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-400 border border-zinc-100">
                  <BadgeInfo size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] text-zinc-400 font-bold uppercase leading-none">
                    Full Name
                  </p>
                  <p className="text-xs font-bold text-zinc-800 mt-1 truncate">
                    {personalDetails?.fullName || personalDetails?.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-400 border border-zinc-100">
                  <UserCheck size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] text-zinc-400 font-bold uppercase leading-none">
                    Gender
                  </p>
                  <p className="text-xs font-bold text-zinc-800 mt-1 truncate">
                    {personalDetails?.gender || "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-400 border border-zinc-100">
                  <Calendar size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] text-zinc-400 font-bold uppercase leading-none">
                    Date of Birth (Age)
                  </p>
                  <p className="text-xs font-bold text-zinc-800 mt-1 truncate">
                    {personalDetails?.dob
                      ? `${new Date(personalDetails.dob).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })} (${calculateAge(personalDetails.dob)})`
                      : "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-400 border border-zinc-100">
                  <BadgeInfo size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] text-zinc-400 font-bold uppercase leading-none">
                    Blood Group
                  </p>
                  <p className="text-xs font-bold text-zinc-800 mt-1 truncate">
                    {personalDetails?.bloodGroup || "Unknown"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-400 border border-zinc-100">
                  <Phone size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] text-zinc-400 font-bold uppercase leading-none">
                    Mobile Number
                  </p>
                  <p className="text-xs font-bold text-zinc-800 mt-1 truncate font-mono">
                    {contactDetails?.phone || "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-400 border border-zinc-100">
                  <BadgeInfo size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] text-zinc-400 font-bold uppercase leading-none">
                    Aadhaar Card (Masked)
                  </p>
                  <p className="text-xs font-bold text-zinc-800 mt-1 truncate font-mono">
                    {maskAadhar(personalDetails?.aadhar || rawStudent?.aadhar)}
                  </p>
                </div>
              </div>

              {personalDetails?.cast && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-400 border border-zinc-100">
                    <BadgeInfo size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] text-zinc-400 font-bold uppercase leading-none">
                      Category / Caste
                    </p>
                    <p className="text-xs font-bold text-zinc-800 mt-1 truncate">
                      {personalDetails.cast}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card B: Parent & Guardian Information */}
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 mb-2">
              <UserCheck className="text-indigo-600" size={16} />
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                Guardian Details
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-400 border border-zinc-100">
                  <User size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] text-zinc-400 font-bold uppercase leading-none">
                    Father's Name
                  </p>
                  <p className="text-xs font-bold text-zinc-800 mt-1 truncate">
                    {contactDetails?.fatherName || "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-400 border border-zinc-100">
                  <User size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] text-zinc-400 font-bold uppercase leading-none">
                    Mother's Name
                  </p>
                  <p className="text-xs font-bold text-zinc-800 mt-1 truncate">
                    {contactDetails?.motherName || "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-400 border border-zinc-100">
                  <Phone size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] text-zinc-400 font-bold uppercase leading-none">
                    Emergency Mobile No
                  </p>
                  <p className="text-xs font-bold text-zinc-800 mt-1 truncate font-mono">
                    {contactDetails?.emergencyContact || "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-400 border border-zinc-100">
                  <MapPin size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] text-zinc-400 font-bold uppercase leading-none">
                    Permanent Address
                  </p>
                  <p className="text-xs font-bold text-zinc-650 mt-1 leading-normal truncate-2-lines">
                    {contactDetails?.address || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card C: Academic Metadata Information */}
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 mb-2">
              <GraduationCap className="text-indigo-600" size={16} />
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                Academic Information
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-400 uppercase tracking-wide">
                  Admission ID
                </span>
                <span className="font-extrabold text-zinc-800">
                  {personalDetails?.admissionNumber || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-400 uppercase tracking-wide">
                  Enrollment Date
                </span>
                <span className="font-extrabold text-zinc-800">
                  {personalDetails?.admissionDate
                    ? new Date(
                        personalDetails.admissionDate,
                      ).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-400 uppercase tracking-wide">
                  Tuition Discount
                </span>
                <span className="font-extrabold text-emerald-600">
                  {personalDetails?.discountPercentage
                    ? `${personalDetails.discountPercentage}%`
                    : "0% (Regular)"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-400 uppercase tracking-wide">
                  Previous School
                </span>
                <span
                  className="font-extrabold text-zinc-800 truncate max-w-[150px] inline-block text-right"
                  title={personalDetails?.previousSchool}
                >
                  {personalDetails?.previousSchool || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-400 uppercase tracking-wide">
                  Board / Medium
                </span>
                <span className="font-extrabold text-zinc-800">
                  CBSE / English
                </span>
              </div>
              {rawStudent?.transportMode && (
                <div className="flex justify-between items-center text-xs border-t border-zinc-150 pt-3 mt-2">
                  <span className="font-bold text-zinc-400 uppercase tracking-wide">
                    Transport Mode
                  </span>
                  <span className="font-extrabold text-indigo-650">
                    {rawStudent.transportMode}
                  </span>
                </div>
              )}
              {rawStudent?.transportFee !== undefined && (
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-zinc-400 uppercase tracking-wide">
                    Transport Monthly Fee
                  </span>
                  <span className="font-extrabold text-zinc-800">
                    ₹{rawStudent.transportFee}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── 4. ATTENDANCE & FINANCE ANALYTICS DASHBOARDS ─────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Attendance Dashboard - 5 columns */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarCheck2 className="text-indigo-600" size={16} />
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                  Attendance Details
                </h3>
              </div>
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border",
                  attendance?.summary?.percentage >= 75
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-rose-50 text-rose-700 border-rose-100",
                )}
              >
                {attendance?.summary?.percentage >= 75
                  ? "Excellent Status"
                  : "Warning: Below 75%"}
              </span>
            </div>

            {attLoading ? (
              <div className="h-44 bg-zinc-50 rounded-2xl animate-pulse" />
            ) : attendance ? (
              <div className="space-y-6">
                {/* SVG Progress Circle & KPI breakdown */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="56"
                        cy="56"
                        r="46"
                        className="stroke-zinc-100 fill-none"
                        strokeWidth="8"
                      />
                      <circle
                        cx="56"
                        cy="56"
                        r="46"
                        className={cn(
                          "fill-none transition-all duration-500",
                          attendance.summary.percentage >= 75
                            ? "stroke-teal-500"
                            : "stroke-rose-500",
                        )}
                        strokeWidth="8"
                        strokeDasharray={2 * Math.PI * 46}
                        strokeDashoffset={
                          2 *
                          Math.PI *
                          46 *
                          (1 - attendance.summary.percentage / 100)
                        }
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-lg font-black text-zinc-800">
                        {attendance.summary.percentage}%
                      </span>
                      <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                        Ratio
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs w-full sm:w-auto">
                    <div>
                      <span className="text-[8px] font-bold text-zinc-400 uppercase block mb-0.5">
                        Working Days
                      </span>
                      <span className="text-sm font-extrabold text-zinc-800">
                        {attendance.summary.totalClasses} Days
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-emerald-500 uppercase block mb-0.5">
                        Present
                      </span>
                      <span className="text-sm font-extrabold text-emerald-700">
                        {attendanceStats.present + attendanceStats.late} Days
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-rose-500 uppercase block mb-0.5">
                        Absent
                      </span>
                      <span className="text-sm font-extrabold text-rose-700">
                        {attendanceStats.absent} Days
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-orange-500 uppercase block mb-0.5">
                        Late / Leave
                      </span>
                      <span className="text-sm font-extrabold text-orange-700">
                        {attendanceStats.late + attendanceStats.leave} Days
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 border-t border-zinc-100 pt-4">
                  <div className="flex justify-between items-center text-xs font-bold text-zinc-650">
                    <span>Attendance Target Progression</span>
                    <span className="text-[10px] text-zinc-450">
                      (Required: 75%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden p-0">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        attendance.summary.percentage >= 75
                          ? "bg-teal-500"
                          : "bg-rose-500",
                      )}
                      style={{ width: `${attendance.summary.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-xs font-semibold text-zinc-400 italic">
                No monthly attendance logs found.
              </div>
            )}
          </div>

          {/* Finance Summary Card - 7 columns */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Landmark className="text-indigo-600" size={16} />
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                  Finance & Settlement Summary
                </h3>
              </div>
              <span className="text-[9px] font-bold text-zinc-450 bg-zinc-50 border border-zinc-200 px-2.5 py-0.5 rounded-lg font-mono">
                ACADEMIC YEAR: {feeSummary?.academicYear || "2026-2027"}
              </span>
            </div>

            <div className="space-y-5">
              {/* Payment Ratio Stats & Progress bar */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-zinc-50/50 rounded-2xl border border-zinc-100/50">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase block mb-0.5">
                    Assessed Fees
                  </span>
                  <span className="text-md font-extrabold text-zinc-800">
                    ₹{feeSummary?.totalFee.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="p-4 bg-zinc-50/50 rounded-2xl border border-zinc-100/50">
                  <span className="text-[8px] font-bold text-emerald-500 uppercase block mb-0.5">
                    Paid Fees
                  </span>
                  <span className="text-md font-extrabold text-emerald-700">
                    ₹{feeSummary?.totalPaid.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="p-4 bg-zinc-50/50 rounded-2xl border border-zinc-100/50">
                  <span className="text-[8px] font-bold text-rose-500 uppercase block mb-0.5">
                    Pending Dues
                  </span>
                  <span className="text-md font-extrabold text-rose-700">
                    ₹{feeSummary?.pendingAmount.toLocaleString() || "0"}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              {feeSummary && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-zinc-650">
                    <span>Outstanding settlement ratio</span>
                    <span>
                      {Math.round(
                        (feeSummary.totalPaid / feeSummary.totalFee) * 100,
                      )}
                      % Settled
                    </span>
                  </div>
                  <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden p-0">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-emerald-500"
                      style={{
                        width: `${(feeSummary.totalPaid / feeSummary.totalFee) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Last payment meta info */}
              <div className="border-t border-zinc-100 pt-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[8px] font-bold text-zinc-400 uppercase block mb-0.5">
                    Last Payment Made
                  </span>
                  <span className="font-extrabold text-zinc-800">
                    {lastPayment
                      ? `₹${lastPayment.paidAmount.toLocaleString()} for ${lastPayment.month}`
                      : "No Payments Logged"}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-zinc-400 uppercase block mb-0.5">
                    Last Payment Date
                  </span>
                  <span className="font-extrabold text-zinc-800 font-mono">
                    {lastPayment?.paidOn
                      ? new Date(lastPayment.paidOn).toLocaleDateString(
                          undefined,
                          { day: "2-digit", month: "short", year: "numeric" },
                        )
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 5. ACADEMIC PERFORMANCE ──────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 mb-2">
            <Sparkles className="text-indigo-600" size={16} />
            <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
              Academic Performance
            </h3>
          </div>

          <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200">
            <Award size={36} className="text-zinc-300" />
            <div>
              <p className="text-xs font-extrabold text-zinc-700">
                No Academic Exam Reports Available
              </p>
              <p className="text-[10px] text-zinc-400 mt-1 max-w-sm">
                No exam grades, marksheet details, or GPA cards have been
                published for this student in the current session.
              </p>
            </div>
          </div>
        </div>

        {/* ─── 6. MONTHLY FEE LEDGER BREAKDOWN ───────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="text-indigo-600" size={16} />
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                Monthly Fee Ledger Breakdown
              </h3>
            </div>
            <span className="text-[10px] font-bold text-zinc-450 bg-zinc-50 border border-zinc-200 px-3 py-1 rounded-lg">
              CYCLE: {feeSummary?.academicYear || "2026-2027"}
            </span>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 border-b border-zinc-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Target Month
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Assessed Amount
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Settled Amount
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Ledger Status
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">
                    Settlement Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {feeSummary?.monthlyFees &&
                feeSummary.monthlyFees.length > 0 ? (
                  feeSummary.monthlyFees.map((fee) => (
                    <tr
                      key={fee.month}
                      className="hover:bg-zinc-50/30 transition-colors"
                    >
                      <td className="px-6 py-4 text-xs font-bold text-zinc-700 uppercase">
                        {fee.month}
                      </td>
                      <td className="px-6 py-4 text-xs font-extrabold text-zinc-400">
                        ₹{fee.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-xs font-extrabold text-zinc-900">
                        ₹{fee.paidAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-tight inline-flex items-center gap-1 border",
                            fee.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : fee.status === "PARTIAL"
                                ? "bg-amber-50 text-amber-700 border-amber-100"
                                : "bg-rose-50 text-rose-700 border-rose-100",
                          )}
                        >
                          <span
                            className={cn(
                              "w-1 h-1 rounded-full",
                              fee.status === "PAID"
                                ? "bg-emerald-500"
                                : fee.status === "PARTIAL"
                                  ? "bg-amber-500"
                                  : "bg-rose-500",
                            )}
                          />
                          {fee.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-[10px] font-bold text-zinc-450 uppercase">
                        {fee.paidOn
                          ? new Date(fee.paidOn).toLocaleDateString(undefined, {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-10 text-xs font-semibold text-zinc-400 italic"
                    >
                      No monthly ledger fee records available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 px-6 bg-zinc-50/50 border-t border-zinc-150 flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            <span>Ledger status sync active</span>
            <span>100% Secure MERN Server Vouchers</span>
          </div>
        </div>

        {/* ─── 7. STUDENT DOCUMENTS HUB ─────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 mb-2">
            <FileText className="text-indigo-600" size={16} />
            <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
              Student Document Hub
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {standardDocumentTypes.map((docDef) => {
              const docData = documentMap.get(docDef.key);
              const isUploaded = Boolean(docData && docData.isSubmitted);
              const verificationStatus = docData?.verificationStatus || (isUploaded ? 'Verified' : docDef.tag);

              return (
                <div
                  key={docDef.key}
                  className={cn(
                    "border rounded-2xl p-5 space-y-4 hover:shadow-md transition-all",
                    isUploaded ? "border-emerald-200 bg-emerald-50/10" : "border-zinc-200 bg-white"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${docDef.iconBg} rounded-xl flex items-center justify-center font-bold`}>
                        <FileText size={18} />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-zinc-800">{docDef.title}</h5>
                        <span className="text-[9px] text-zinc-400 uppercase font-black tracking-wider block">
                          {docDef.subtitle}
                        </span>
                        {docData?.docNo && !docData.docNo.startsWith('/uploads/') && !docData.docNo.startsWith('http') && (
                          <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 text-[10px] font-extrabold border border-zinc-200">
                            <span className="text-zinc-500 font-semibold">No:</span>
                            <span>{docData.docNo}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {docData?.url && (
                      <a
                        href={docData.url.startsWith('http') ? docData.url : `${apiHost}${docData.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                        title="View Document"
                      >
                        <Eye size={15} />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-100 pt-3 text-[10px]">
                    {isUploaded ? (
                      <span className="text-emerald-600 font-extrabold bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded">
                        Submitted
                      </span>
                    ) : (
                      <span className="text-zinc-500 font-extrabold bg-zinc-100 px-2 py-0.5 rounded">
                        Not Uploaded
                      </span>
                    )}

                    {isUploaded ? (
                      <span className={cn(
                        "font-bold px-2 py-0.5 rounded text-[10px]",
                        verificationStatus === 'Rejected' ? "text-rose-600 bg-rose-50 border border-rose-200" :
                        verificationStatus === 'Pending' || verificationStatus === 'Pending Verification' ? "text-amber-600 bg-amber-50 border border-amber-200" :
                        "text-emerald-600 font-bold"
                      )}>
                        {verificationStatus}
                      </span>
                    ) : (
                      <span className="text-zinc-400 font-bold">{docDef.tag}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── 8. RECENT ACTIVITIES TIMELINE ─────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 mb-2">
            <Activity className="text-indigo-600" size={16} />
            <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
              Student Activity History
            </h3>
          </div>

          <div className="relative pl-6 border-l border-zinc-200 space-y-8 ml-4">
            {timelineEvents.length > 0 ? (
              timelineEvents.map((evt, idx) => (
                <div key={idx} className="relative">
                  {/* Timeline indicator node */}
                  <div
                    className={cn(
                      "absolute -left-[29px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ring-4 ring-white z-10",
                      evt.color,
                    )}
                  />

                  <div className="space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h5 className="text-xs font-bold text-zinc-800">
                        {evt.title}
                      </h5>
                      <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider">
                        {evt.date.toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-normal">
                      {evt.description}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-zinc-400 italic">
                No recent activity logs recorded for this student.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print styles override */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .custom-scrollbar::-webkit-scrollbar {
            display: none;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
};

export default StudentProfile;
