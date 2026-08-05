import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Edit2,
  QrCode,
  TrendingUp,
  Flame,
  FileSpreadsheet,
  Layers,
  Contact2,
} from "lucide-react";
import {
  AppPage,
  AppCard,
  AppButton,
  AppIconButton,
  AppBadge,
  AppAvatar,
  AppStatusPill,
  AppProgress,
  AppSkeleton,
  AppEmptyState,
  AppTabs,
  AppTable,
  AppLoading,
} from "../../components/ui";
import api from "../../services/api";
import { cn } from "../../utils/cn";
import { resolveStudentPhotoUrl } from "../../utils/imageUtils";
import { formatToINR } from "../../utils/format";

const StudentProfile = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [rawStudent, setRawStudent] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [attLoading, setAttLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Dynamic API host resolution for static assets (studentPhoto, qrCode)
  const apiHost = api.defaults.baseURL
    ? api.defaults.baseURL.replace("/api", "")
    : "";

  const fetchProfile = React.useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const res = await api.get(`/students/${studentId}/profile`);
        if (res?.data?.success && res?.data?.data) {
          setStudent(res.data.data);
        } else {
          // Fallback fetch direct by ID if profile API returns 404 or fails
          const fallbackRes = await api.get(`/students/${studentId}`);
          if (fallbackRes?.data?.success && fallbackRes?.data?.data) {
            const raw = fallbackRes.data.data;
            setStudent({
              _id: raw._id,
              personalDetails: {
                _id: raw._id,
                name: raw.fullName,
                fullName: raw.fullName,
                studentId: raw.studentId,
                rollNumber: raw.rollNumber,
                admissionNumber: raw.admissionNumber,
                admissionDate: raw.admissionDate || raw.createdAt,
                discountPercentage: raw.discountPercentage || 0,
                previousSchool: raw.previousSchool || "",
                status: raw.status || "Active",
                gender: raw.gender,
                dob: raw.dob,
                studentPhoto: raw.studentPhoto,
                photoSource: raw.photoSource || "upload",
                photoUrl: raw.photoUrl || "",
                bloodGroup: raw.bloodGroup,
                transportMode: raw.transportMode,
                cast: raw.cast,
                aadhar: raw.aadhar,
              },
              academicDetails: {
                className: raw.className || raw.grade,
                section: raw.section,
                session: raw.session,
              },
              contactDetails: {
                address: raw.address,
                phone: raw.phone,
                email: raw.email,
                fatherName: raw.fatherName,
                motherName: raw.motherName,
                emergencyContact: raw.emergencyContact || raw.phone,
              },
              feeSummary: {
                academicYear: raw.session || "2026-2027",
                totalFee: 0,
                totalPaid: 0,
                pendingAmount: 0,
                monthlyFees: [],
              },
            });
          }
        }
      } catch (error) {
        console.error("Error fetching student profile:", error);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [studentId]
  );

  const fetchAdditionalDetails = React.useCallback(async (dbId) => {
    try {
      const res = await api.get(`/students/${dbId}`);
      if (res?.data?.success && res?.data?.data) {
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
        if (res?.data?.success && res?.data?.data) {
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

  const maskAadhar = (aadhar) => {
    if (!aadhar) return "N/A";
    const cleaned = String(aadhar).replace(/\s+/g, "");
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
    return `${age} Yrs`;
  };

  const attendanceStats = useMemo(() => {
    if (!attendance || !Array.isArray(attendance.records))
      return { present: 0, absent: 0, late: 0, leave: 0 };
    let present = 0,
      absent = 0,
      late = 0,
      leave = 0;
    attendance.records.forEach((r) => {
      if (r?.status === "Present") present++;
      else if (r?.status === "Absent") absent++;
      else if (r?.status === "Late") late++;
      else if (r?.status === "Leave" || r?.status === "Excused") leave++;
    });
    return { present, absent, late, leave };
  }, [attendance]);

  const recent14DaysAttendance = useMemo(() => {
    if (!attendance || !Array.isArray(attendance.records)) return [];
    return attendance.records.slice(-14);
  }, [attendance]);

  const documentMap = useMemo(() => {
    const map = new Map();

    const aliases = {
      AADHAAR: [
        "aadharCard",
        "aadhar",
        "aadhar_card",
        "aadhaar",
        "aadhaarCard",
        "AADHAAR",
        "AADHAAR_CARD",
        "AADHAAR CARD",
        "AADHAAR NUMBER",
        "AADHAR NUMBER",
        "AADHAR CARD",
        "AADHAR",
      ],
      BIRTH_CERTIFICATE: [
        "birthCertificate",
        "birth_certificate",
        "dobCertificate",
        "BIRTH_CERTIFICATE",
        "BIRTH CERTIFICATE",
        "BIRTH CERTIFICATE NO",
        "BIRTH CERTIFICATE NUMBER",
        "BIRTH CERTIFICATE #",
        "DOB CERTIFICATE",
      ],
      TRANSFER_CERTIFICATE: [
        "transferCertificate",
        "transfer_certificate",
        "tc",
        "TRANSFER_CERTIFICATE",
        "TRANSFER CERTIFICATE",
        "TRANSFER CERTIFICATE NO",
        "TRANSFER CERTIFICATE NUMBER",
        "TC NO",
        "TC NUMBER",
      ],
    };

    const isInvalidVal = (val) => {
      if (val === undefined || val === null) return true;
      const str = String(val).trim().toLowerCase();
      return (
        str === "" ||
        str === "unknown" ||
        str === "n/a" ||
        str === "null" ||
        str === "undefined" ||
        str === "not provided"
      );
    };

    const registerDoc = (typeKey, fileOrVal) => {
      if (isInvalidVal(fileOrVal)) return;

      const isObject = typeof fileOrVal === "object" && fileOrVal !== null;
      const url = isObject
        ? fileOrVal.url ||
          fileOrVal.filePath ||
          fileOrVal.path ||
          fileOrVal.fileUrl ||
          ""
        : typeof fileOrVal === "string" &&
          (fileOrVal.startsWith("/uploads/") ||
            fileOrVal.startsWith("http") ||
            fileOrVal.includes(".pdf") ||
            fileOrVal.includes(".jpg") ||
            fileOrVal.includes(".jpeg") ||
            fileOrVal.includes(".png"))
        ? fileOrVal
        : "";

      const docNo =
        typeof fileOrVal === "string" && !url
          ? fileOrVal
          : isObject
          ? fileOrVal.number ||
            fileOrVal.docNumber ||
            fileOrVal.docNo ||
            fileOrVal.value ||
            ""
          : "";

      const verificationStatus = isObject
        ? fileOrVal.verificationStatus || fileOrVal.status || "Verified"
        : "Verified";

      const existing = map.get(typeKey);

      map.set(typeKey, {
        type: typeKey,
        url: url || existing?.url || "",
        docNo: docNo || existing?.docNo || "",
        raw: fileOrVal,
        isSubmitted: true,
        verificationStatus,
      });
    };

    const customFieldsData =
      rawStudent?.customFields ||
      student?.personalDetails?.customFields ||
      student?.customFields;

    if (customFieldsData) {
      let entries = [];
      if (customFieldsData instanceof Map) {
        entries = Array.from(customFieldsData.entries());
      } else if (
        typeof customFieldsData === "object" &&
        customFieldsData !== null
      ) {
        entries = Object.entries(customFieldsData);
      }

      entries.forEach(([cfKey, cfVal]) => {
        if (isInvalidVal(cfVal)) return;
        const normKey = String(cfKey).trim().toUpperCase();

        for (const [typeKey, aliasList] of Object.entries(aliases)) {
          if (
            aliasList.some(
              (a) => a.toUpperCase() === normKey || normKey.includes(a.toUpperCase())
            )
          ) {
            registerDoc(typeKey, cfVal);
            break;
          }
        }
      });
    }

    const aadharVal =
      rawStudent?.aadhar ||
      student?.personalDetails?.aadhar ||
      student?.aadhar ||
      rawStudent?.aadharCard ||
      student?.personalDetails?.aadharCard ||
      student?.aadharCard;
    if (!isInvalidVal(aadharVal)) {
      registerDoc("AADHAAR", aadharVal);
    }

    const birthVal =
      rawStudent?.birthCertificate ||
      student?.personalDetails?.birthCertificate ||
      student?.birthCertificate;
    if (!isInvalidVal(birthVal)) {
      registerDoc("BIRTH_CERTIFICATE", birthVal);
    }

    const tcVal =
      rawStudent?.transferCertificate ||
      student?.personalDetails?.transferCertificate ||
      student?.transferCertificate ||
      rawStudent?.tc ||
      student?.tc;
    if (!isInvalidVal(tcVal)) {
      registerDoc("TRANSFER_CERTIFICATE", tcVal);
    }

    return map;
  }, [student, rawStudent]);

  const standardDocumentTypes = [
    {
      key: "AADHAAR",
      title: "Aadhaar Card",
      subtitle: "Identification Doc",
      tag: "Mandatory",
    },
    {
      key: "BIRTH_CERTIFICATE",
      title: "Birth Certificate",
      subtitle: "DOB Verification",
      tag: "Optional",
    },
    {
      key: "TRANSFER_CERTIFICATE",
      title: "Transfer Certificate",
      subtitle: "Previous School",
      tag: "Pending",
    },
  ];

  if (loading) {
    return <AppLoading fullScreen text="Loading Student Profile..." />;
  }

  if (!student) {
    return (
      <AppPage className="flex flex-col items-center justify-center py-20">
        <AppEmptyState
          title="Student Record Not Found"
          description="We couldn't locate active profile records for this student ID."
          action={
            <AppButton onClick={() => navigate("/students")} icon={ArrowLeft}>
              Back to Directory
            </AppButton>
          }
        />
      </AppPage>
    );
  }

  const personalDetails = student.personalDetails || student || {};
  const academicDetails = student.academicDetails || student || {};
  const contactDetails = student.contactDetails || student || {};
  const feeSummary = student.feeSummary || {};

  const photoUrl = resolveStudentPhotoUrl(personalDetails || student, apiHost);
  const houseName = rawStudent?.house || personalDetails?.house || "N/A";
  const bloodGroup = personalDetails?.bloodGroup || rawStudent?.bloodGroup || "N/A";
  const secondLanguage = personalDetails?.secondLanguage || rawStudent?.secondLanguage || "N/A";

  // Dynamic exam records & activities
  const academicRecords = student?.academicRecords || student?.examResults || rawStudent?.examResults || [];
  const coCurricularActivities = student?.activities || rawStudent?.activities || [];
  const performanceTrend = student?.performanceTrend || rawStudent?.performanceTrend || [];

  return (
    <AppPage className="animate-in fade-in duration-300 space-y-6">
      {/* ─────────────────────────────────────────────────────────────────
          SECTION 1 — PAGE TOP HEADER & ACTIONS
      ───────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AppIconButton
            variant="outline"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate("/students")}
            title="Back to Directory"
          />
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Student Profile
            </h1>
            <p className="text-xs text-gray-500 font-semibold">
              Academic Session {academicDetails?.session || "2026–2027"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <AppButton
            variant="outline"
            size="sm"
            icon={Contact2}
            onClick={() =>
              navigate(`/students/${personalDetails.studentId || studentId}/idcard`)
            }
          >
            Download ID Card
          </AppButton>
          <AppButton
            variant="primary"
            size="sm"
            icon={Edit2}
            onClick={() =>
              navigate(`/students/edit/${personalDetails?._id || student?._id}`)
            }
          >
            Edit Profile
          </AppButton>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION 2 — HERO IDENTITY CARD (DARK GRID PATTERN & BARCODE)
      ───────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 space-y-6">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Student Avatar Box */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-800 border-2 border-indigo-500/40 text-indigo-200 flex items-center justify-center text-3xl font-black shadow-inner shrink-0 overflow-hidden uppercase">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={personalDetails?.name || personalDetails?.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>
                  {(personalDetails?.name || personalDetails?.fullName || "SP")
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")}
                </span>
              )}
            </div>

            {/* Student Main Metadata */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest block">
                  Little Flower English School
                </span>
                <span className="text-[9px] text-gray-400 font-semibold">• CBSE Affiliated</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {personalDetails?.name || personalDetails?.fullName || "N/A"}
              </h2>

              <p className="text-xs font-semibold text-indigo-200">
                Class {academicDetails?.className || "N/A"} • Section {academicDetails?.section || "A"}
              </p>

              <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                    Roll No.
                  </span>
                  <span className="font-extrabold text-white font-mono">
                    {personalDetails?.rollNumber || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                    Admission No.
                  </span>
                  <span className="font-extrabold text-white font-mono">
                    {personalDetails?.admissionNumber || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                    Class Teacher
                  </span>
                  <span className="font-extrabold text-indigo-200 truncate block max-w-[120px]">
                    {academicDetails?.classTeacherName || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                    Blood Group
                  </span>
                  <span className="font-extrabold text-rose-400">
                    {bloodGroup}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Right Badges */}
          <div className="flex flex-wrap items-center gap-2 self-start">
            {houseName !== "N/A" && (
              <AppBadge variant="danger" className="bg-rose-500/20 text-rose-300 border-rose-500/30">
                <Flame size={12} className="mr-1 text-rose-400" /> {houseName}
              </AppBadge>
            )}
            <AppStatusPill
              status={personalDetails?.status === "Active" ? "active" : "inactive"}
              label={personalDetails?.status || "Active"}
              size="sm"
            />
          </div>
        </div>

        {/* Bottom Barcode Line */}
        <div className="relative z-10 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-gray-400 font-mono">
          <div className="flex items-center gap-1 opacity-70">
            <div className="flex items-center gap-0.5 h-6">
              {[...Array(32)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-full"
                  style={{
                    width: i % 3 === 0 ? "3px" : "1.5px",
                    height: i % 2 === 0 ? "100%" : "70%",
                  }}
                />
              ))}
            </div>
          </div>
          <span className="font-bold text-indigo-300">
            ID · {personalDetails?.studentId || "PENDING"}
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION 3 — 4 KPI STATS CARDS ROW (100% DYNAMIC)
      ───────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Grade Card */}
        <AppCard className="space-y-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
            Overall Grade
          </span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-3xl font-black text-gray-900">
              {student?.overallGrade || personalDetails?.overallGrade || "N/A"}
            </h3>
            <AppBadge variant={student?.overallGrade ? "success" : "neutral"} size="sm">
              {student?.gradePercentage ? `${student.gradePercentage}% aggregate` : "N/A"}
            </AppBadge>
          </div>
        </AppCard>

        {/* Attendance Percentage Card */}
        <AppCard className="space-y-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
            Attendance
          </span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-3xl font-black text-gray-900">
              {attLoading ? "..." : attendance?.summary?.percentage !== undefined ? `${attendance.summary.percentage}%` : "N/A"}
            </h3>
            {attendance?.summary?.percentage !== undefined && (
              <AppBadge
                variant={attendance.summary.percentage >= 75 ? "success" : "warning"}
                size="sm"
              >
                {attendance.summary.percentage >= 75 ? "Above 75% mark" : "Needs Attention"}
              </AppBadge>
            )}
          </div>
        </AppCard>

        {/* Class Rank Card */}
        <AppCard className="space-y-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
            Class Rank
          </span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-3xl font-black text-gray-900">
              {student?.classRank || rawStudent?.classRank || "N/A"}
            </h3>
            <AppBadge variant="info" size="sm">
              {student?.classRank ? "Top Performer" : "N/A"}
            </AppBadge>
          </div>
        </AppCard>

        {/* Fee Status Card */}
        <AppCard className="space-y-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
            Fee Status
          </span>
          <div className="flex items-baseline justify-between">
            <h3
              className={cn(
                "text-3xl font-black",
                (feeSummary?.pendingAmount || 0) === 0 ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {feeSummary?.pendingAmount === undefined ? "N/A" : feeSummary.pendingAmount === 0 ? "Paid" : formatToINR(feeSummary.pendingAmount)}
            </h3>
            <AppBadge
              variant={(feeSummary?.pendingAmount || 0) === 0 ? "success" : "danger"}
              size="sm"
            >
              {(feeSummary?.pendingAmount || 0) === 0 ? "Cleared" : "Dues Pending"}
            </AppBadge>
          </div>
        </AppCard>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION 4 — NAVIGATION TABS
      ───────────────────────────────────────────────────────────────── */}
      <AppTabs
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId)}
        variant="underline"
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "academic", label: "Academic Record" },
          { id: "attendance", label: "Attendance" },
          { id: "documents", label: "Documents" },
        ]}
      />

      {/* ─────────────────────────────────────────────────────────────────
          TAB 1: OVERVIEW CONTENT (2-COLUMNS GRID)
      ───────────────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Columns */}
          <div className="lg:col-span-7 space-y-6">
            {/* Performance Trend Card */}
            <AppCard className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-extrabold text-gray-900">
                  Performance trend
                </h3>
                <p className="text-xs text-gray-400 font-medium">
                  Aggregate score across the year's assessments
                </p>
              </div>

              {performanceTrend.length > 0 ? (
                <div className="h-44 flex items-end justify-around gap-6 pt-4">
                  {performanceTrend.map((item, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-xs font-extrabold text-indigo-900">{item.score}%</span>
                      <div
                        className="w-full max-w-[64px] bg-indigo-900 rounded-t-xl hover:opacity-100 transition-opacity"
                        style={{ height: `${item.score}%` }}
                      />
                      <span className="text-[10px] font-bold text-gray-500">{item.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <Award size={32} className="mx-auto text-gray-300" />
                  <p className="text-xs font-bold text-gray-600">No Assessment Data Available</p>
                  <p className="text-[10px] text-gray-400">Exam performance trends will appear here once term marks are recorded.</p>
                </div>
              )}
            </AppCard>

            {/* Parent & Guardian Details Card */}
            <AppCard className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-extrabold text-gray-900">
                  Parent & guardian details
                </h3>
                <p className="text-xs text-gray-400 font-medium">
                  Primary contacts on record
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                    FATHER'S NAME
                  </span>
                  <span className="font-extrabold text-gray-900 block mt-0.5">
                    {contactDetails?.fatherName || "N/A"}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                    MOTHER'S NAME
                  </span>
                  <span className="font-extrabold text-gray-900 block mt-0.5">
                    {contactDetails?.motherName || "N/A"}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                    PRIMARY CONTACT
                  </span>
                  <span className="font-mono font-extrabold text-gray-900 block mt-0.5">
                    {contactDetails?.emergencyContact || contactDetails?.phone || "N/A"}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                    PARENT EMAIL
                  </span>
                  <span className="font-mono font-bold text-indigo-600 truncate block mt-0.5">
                    {contactDetails?.email || "N/A"}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 text-xs">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                  RESIDENTIAL ADDRESS
                </span>
                <span className="font-semibold text-gray-700 block mt-1">
                  {contactDetails?.address || "N/A"}
                </span>
              </div>
            </AppCard>

            {/* Co-curricular Activities Card */}
            <AppCard className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-extrabold text-gray-900">
                  Co-curricular activities
                </h3>
                <p className="text-xs text-gray-400 font-medium">
                  Clubs, sports, and achievements this year
                </p>
              </div>

              {coCurricularActivities.length > 0 ? (
                <ul className="space-y-3 text-xs">
                  {coCurricularActivities.map((act, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                      <div>
                        <span className="font-bold text-gray-900 block">{act.title || act.name}</span>
                        <span className="text-[10px] text-gray-400 font-semibold">{act.date || act.description || "N/A"}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-400 italic py-2">
                  No co-curricular activities recorded for this student.
                </p>
              )}
            </AppCard>
          </div>

          {/* Right 5 Columns */}
          <div className="lg:col-span-5 space-y-6">
            {/* Attendance Snapshot Heatmap Card */}
            <AppCard className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">
                    Attendance snapshot
                  </h3>
                  <p className="text-xs text-gray-400 font-medium">
                    Last 14 school days
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-emerald-600 flex items-center justify-center font-black text-xs text-gray-900">
                  {attendance?.summary?.percentage !== undefined ? `${attendance.summary.percentage}%` : "N/A"}
                </div>
              </div>

              {/* 14 Days Heatmap Grid */}
              {recent14DaysAttendance.length > 0 ? (
                <div className="grid grid-cols-7 gap-1.5 pt-2">
                  {recent14DaysAttendance.map((rec, idx) => {
                    const isPresent = rec.status === "Present";
                    const isHalfDay = rec.status === "Late";
                    const isAbsent = rec.status === "Absent";

                    return (
                      <div
                        key={idx}
                        className={cn(
                          "h-8 rounded-lg transition-transform hover:scale-105",
                          isAbsent
                            ? "bg-rose-200"
                            : isHalfDay
                            ? "bg-emerald-200"
                            : "bg-emerald-800"
                        )}
                        title={`Date: ${rec.date ? new Date(rec.date).toLocaleDateString() : 'N/A'} - ${rec.status}`}
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic py-4 text-center">
                  No recent attendance records logged.
                </p>
              )}

              <div className="flex items-center gap-4 text-[10px] text-gray-500 font-bold pt-1">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-800" /> Present
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-200" /> Half day
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-rose-200" /> Absent
                </span>
              </div>
            </AppCard>

            {/* Personal Details Card */}
            <AppCard className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-extrabold text-gray-900">
                  Personal details
                </h3>
                <p className="text-xs text-gray-400 font-medium">
                  As per admission records
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                    DATE OF BIRTH
                  </span>
                  <span className="font-extrabold text-gray-900 block mt-0.5">
                    {personalDetails?.dob
                      ? new Date(personalDetails.dob).toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "N/A"}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                    GENDER
                  </span>
                  <span className="font-extrabold text-gray-900 block mt-0.5">
                    {personalDetails?.gender || "N/A"}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                    HOUSE
                  </span>
                  <span className="font-extrabold text-gray-900 block mt-0.5">
                    {houseName}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                    SECOND LANGUAGE
                  </span>
                  <span className="font-extrabold text-gray-900 block mt-0.5">
                    {secondLanguage}
                  </span>
                </div>
              </div>
            </AppCard>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 2: ACADEMIC RECORD CONTENT
      ───────────────────────────────────────────────────────────────── */}
      {activeTab === "academic" && (
        <AppCard className="space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-sm font-extrabold text-gray-900">
              Academic Examination Marksheet & Grades
            </h3>
            <p className="text-xs text-gray-400 font-medium">
              Subject-wise marks breakdown for current academic session
            </p>
          </div>

          {academicRecords.length > 0 ? (
            <AppTable
              columns={[
                { key: "subject", header: "Subject Name" },
                { key: "ut1", header: "Unit Test 1" },
                { key: "halfYearly", header: "Half-Yearly" },
                { key: "grade", header: "Grade", align: "center", render: (g) => <AppBadge variant="success">{g}</AppBadge> },
              ]}
              data={academicRecords}
              rowKey="subject"
            />
          ) : (
            <AppEmptyState
              title="No Academic Exam Reports Available"
              description="No exam grades, marksheet details, or GPA cards have been published for this student in the current session."
            />
          )}
        </AppCard>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 3: ATTENDANCE CONTENT
      ───────────────────────────────────────────────────────────────── */}
      {activeTab === "attendance" && (
        <AppCard className="space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-sm font-extrabold text-gray-900">
              Complete Attendance History Log
            </h3>
            <p className="text-xs text-gray-400 font-medium">
              Daily class attendance records and remarks
            </p>
          </div>

          <AppTable
            columns={[
              { key: "date", header: "Date", render: (d) => d ? new Date(d).toLocaleDateString() : "N/A" },
              { key: "status", header: "Status", render: (st) => <AppStatusPill status={st === "Present" ? "active" : "inactive"} label={st || "N/A"} /> },
              { key: "remarks", header: "Remarks", render: (rem) => rem || "-" },
            ]}
            data={attendance?.records || []}
            rowKey="_id"
            emptyTitle="No Attendance Records"
            emptyDescription="No attendance logs found for this session."
          />
        </AppCard>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 4: DOCUMENTS CONTENT
      ───────────────────────────────────────────────────────────────── */}
      {activeTab === "documents" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {standardDocumentTypes.map((docDef) => {
            const docData = documentMap.get(docDef.key);
            const isUploaded = Boolean(docData && docData.isSubmitted);

            return (
              <AppCard key={docDef.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900">{docDef.title}</h4>
                  <AppBadge variant={isUploaded ? "success" : "neutral"}>
                    {isUploaded ? "Submitted" : docDef.tag}
                  </AppBadge>
                </div>

                <p className="text-xs text-gray-400 font-medium">{docDef.subtitle}</p>

                {docData?.url ? (
                  <div className="pt-2 border-t border-gray-100">
                    <a
                      href={docData.url.startsWith("http") ? docData.url : `${apiHost}${docData.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Eye size={14} /> View Document
                    </a>
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-400 italic pt-1">Document not uploaded yet</p>
                )}
              </AppCard>
            );
          })}
        </div>
      )}
    </AppPage>
  );
};

export default StudentProfile;
