import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  X,
  MessageSquare,
  Clock,
  User,
  Users,
  MapPin,
  AlertCircle,
  Truck,
  Home,
  FileText,
  FileSpreadsheet,
  Printer,
  Calendar,
  Phone,
  Send,
  Eye,
  GraduationCap,
} from "lucide-react";
import Button from "../../components/ui/Button";
import Skeleton, { CardSkeleton } from "../../components/ui/Skeleton";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { cn } from "../../utils/cn";

const AdmissionRequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  // Review modals
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Comments state
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Document preview modal
  const [previewDoc, setPreviewDoc] = useState(null);

  // Derive API host for building absolute media URLs
  const apiHost = api.defaults.baseURL
    ? api.defaults.baseURL.replace("/api", "")
    : "";

  const fetchRequestDetails = async () => {
    try {
      const res = await api.get(`/admission-requests/${id}`);
      if (res.data.success) {
        setRequest(res.data.data);
      }
    } catch (err) {
      addToast(
        err.response?.data?.message || "Failed to fetch request details",
        "error",
      );
      navigate("/admissions/requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestDetails();
  }, [id]);

  const handleReviewAction = async (status, notes = "") => {
    try {
      setLoading(true);
      const res = await api.post(`/admission-requests/${id}/review`, {
        status,
        reviewNotes: notes,
      });
      if (res.data.success) {
        addToast(
          `Admission request status set to ${status} successfully!`,
          "success",
        );
        fetchRequestDetails();
      }
    } catch (err) {
      addToast(
        err.response?.data?.message ||
          `Failed to ${status.toLowerCase()} request`,
        "error",
      );
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await api.post(`/admission-requests/${id}/comments`, {
        comment: commentText,
      });
      if (res.data.success) {
        addToast("Comment posted successfully", "success");
        setCommentText("");
        fetchRequestDetails();
      }
    } catch (err) {
      addToast("Failed to post comment", "error");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handlePrint = () => {
    const session = (() => {
      const m = request.additionalNotes?.remarks?.match(/Academic Session:\s*([^\s|]+)/);
      return m ? m[1] : "2026-2027";
    })();
    const discount = (() => {
      const m = request.additionalNotes?.remarks?.match(/Discount:\s*(\d+)%/);
      return m ? `${m[1]}%` : "0%";
    })();
    const admissionDate = (() => {
      const m = request.additionalNotes?.remarks?.match(/Admission Date:\s*([^\s|]+)/);
      return m ? m[1] : new Date(request.createdAt).toISOString().split("T")[0];
    })();
    const photoUrl = request.studentInfo?.studentPhoto
      ? `${apiHost}${request.studentInfo.studentPhoto}`
      : null;
    const dob = request.studentInfo?.dob
      ? new Date(request.studentInfo.dob).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
      : "N/A";
    const submittedOn = request.submittedAt
      ? new Date(request.submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
      : new Date(request.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Admission Form – ${request.studentInfo?.fullName || "Student"}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      color: #1a1a1a;
      background: #fff;
      padding: 20mm 18mm 18mm 18mm;
    }

    /* ── HEADER ── */
    .school-header {
      text-align: center;
      border-bottom: 3px double #1a1a1a;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .school-header .school-name {
      font-size: 22pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .school-header .school-tagline {
      font-size: 9pt;
      color: #555;
      margin-top: 2px;
      font-style: italic;
    }
    .school-header .school-contact {
      font-size: 8.5pt;
      color: #444;
      margin-top: 3px;
    }
    .form-title-box {
      display: inline-block;
      margin-top: 10px;
      border: 2px solid #1a1a1a;
      padding: 5px 24px;
      font-size: 12pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      border-radius: 4px;
    }

    /* ── APPLICATION META ── */
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 8.5pt;
      color: #444;
      border-bottom: 1px solid #ddd;
      padding-bottom: 8px;
      margin-bottom: 14px;
    }
    .meta-row span { font-weight: bold; color: #1a1a1a; }

    /* ── PHOTO + BASIC INFO ── */
    .top-section {
      display: flex;
      gap: 20px;
      margin-bottom: 16px;
      align-items: flex-start;
    }
    .photo-box {
      width: 110px;
      height: 130px;
      border: 2px solid #1a1a1a;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8pt;
      color: #888;
      text-align: center;
      overflow: hidden;
    }
    .photo-box img { width: 100%; height: 100%; object-fit: cover; }

    .basic-table {
      flex: 1;
      border-collapse: collapse;
      width: 100%;
      font-size: 10pt;
    }
    .basic-table td {
      padding: 5px 8px;
      border: 1px solid #ccc;
      vertical-align: top;
    }
    .basic-table .label {
      font-weight: bold;
      background: #f5f5f5;
      white-space: nowrap;
      width: 36%;
      font-size: 9pt;
      text-transform: uppercase;
      color: #444;
    }

    /* ── SECTION HEADINGS ── */
    .section-heading {
      font-size: 10pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      background: #f0f0f0;
      padding: 5px 10px;
      border-left: 4px solid #1a1a1a;
      margin: 14px 0 8px;
    }

    /* ── DATA TABLE ── */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
    }
    .data-table td {
      padding: 5px 8px;
      border: 1px solid #ccc;
      vertical-align: top;
    }
    .data-table .label {
      font-weight: bold;
      background: #f9f9f9;
      white-space: nowrap;
      font-size: 9pt;
      text-transform: uppercase;
      color: #555;
      width: 30%;
    }

    /* ── ADDRESS BOX ── */
    .address-box {
      border: 1px solid #ccc;
      padding: 8px 10px;
      font-size: 10pt;
      min-height: 44px;
      border-radius: 2px;
    }

    /* ── DECLARATION ── */
    .declaration {
      margin-top: 20px;
      font-size: 9pt;
      color: #444;
      font-style: italic;
      line-height: 1.6;
    }

    /* ── SIGNATURE BLOCK ── */
    .sig-block {
      display: flex;
      justify-content: space-between;
      margin-top: 36px;
      gap: 20px;
    }
    .sig-item {
      flex: 1;
      text-align: center;
    }
    .sig-line {
      border-top: 1.5px solid #1a1a1a;
      padding-top: 6px;
      font-size: 9pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ── FOOTER ── */
    .footer {
      margin-top: 18px;
      text-align: center;
      font-size: 8pt;
      color: #888;
      border-top: 1px dashed #ccc;
      padding-top: 8px;
    }

    @page { margin: 0; }
    @media print {
      body { padding: 12mm 14mm 12mm 14mm; }
    }
  </style>
</head>
<body>

  <!-- SCHOOL HEADER -->
  <div class="school-header">
    <div class="school-name">Little Flower English School</div>
    <div class="school-tagline">Dindayalpur Siwan Bihar 841506</div>
    <div class="school-contact"> Phone: +91 82946 80282 &nbsp;|&nbsp; Email: tiwarichandramohan50@gmail.com</div>
    <div class="form-title-box">Admission Application Form</div>
  </div>

  <!-- APPLICATION META -->
  <div class="meta-row">
    <div>Application ID: <span>${request._id}</span></div>
    <div>Date of Submission: <span>${submittedOn}</span></div>
    <div>Status: <span>${request.status.toUpperCase()}</span></div>
    <div>Academic Year: <span>${session}</span></div>
  </div>

  <!-- PHOTO + BASIC INFO -->
  <div class="top-section">
    <div class="photo-box">
      ${photoUrl
        ? `<img src="${photoUrl}" alt="Student Photo" />`
        : `Affix Recent<br/>Passport Size<br/>Photograph`}
    </div>
    <table class="basic-table">
      <tr>
        <td class="label">Full Name of Student</td>
        <td><strong>${request.studentInfo?.fullName || "—"}</strong></td>
        <td class="label">Gender</td>
        <td>${request.studentInfo?.gender || "—"}</td>
      </tr>
      <tr>
        <td class="label">Date of Birth</td>
        <td>${dob}</td>
        <td class="label">Blood Group</td>
        <td>${request.studentInfo?.bloodGroup || "—"}</td>
      </tr>
      <tr>
        <td class="label">Seeking Admission In</td>
        <td><strong>Class ${request.studentInfo?.admissionClass || "—"} – Section ${request.studentInfo?.section || "—"}</strong></td>
        <td class="label">Category / Caste</td>
        <td>${request.studentInfo?.category || "—"}</td>
      </tr>
      <tr>
        <td class="label">Aadhaar Card No.</td>
        <td>${request.studentInfo?.aadhar || "Not Provided"}</td>
        <td class="label">Admission Date</td>
        <td>${admissionDate}</td>
      </tr>
      <tr>
        <td class="label">Student Email</td>
        <td>${request.parentInfo?.email || "—"}</td>
        <td class="label">Student Phone</td>
        <td>${request.parentInfo?.phone || "—"}</td>
      </tr>
    </table>
  </div>

  <!-- SECTION 1: PARENT DETAILS -->
  <div class="section-heading">1. Parent / Guardian Information</div>
  <table class="data-table">
    <tr>
      <td class="label">Father's Full Name</td>
      <td>${request.parentInfo?.fatherName || "—"}</td>
      <td class="label">Mother's Full Name</td>
      <td>${request.parentInfo?.motherName || "—"}</td>
    </tr>
    <tr>
      <td class="label">Emergency Contact No.</td>
      <td><strong>${request.emergencyContact?.phone || "—"}</strong></td>
      <td class="label">Relationship</td>
      <td>${request.emergencyContact?.relationship || "Parent / Guardian"}</td>
    </tr>
  </table>

  <!-- SECTION 2: RESIDENTIAL ADDRESS -->
  <div class="section-heading">2. Residential Address</div>
  <div class="address-box">${request.address?.currentAddress || "Not Provided"}</div>

  <!-- SECTION 3: ACADEMIC & LOGISTICS -->
  <div class="section-heading">3. Academic Alignment & Facilities</div>
  <table class="data-table">
    <tr>
      <td class="label">Academic Session</td>
      <td>${session}</td>
      <td class="label">Transport Requirement</td>
      <td>${request.transport?.busRequired ? "School Bus Facility Required" : "Private / Self Transport"}</td>
    </tr>
    <tr>
      <td class="label">Hostel Requirement</td>
      <td>${request.hostel?.hostelRequired ? "Hostel Accommodation Required" : "Day Scholar (No Hostel)"}</td>
      <td class="label">Fee Discount Applied</td>
      <td>${discount}</td>
    </tr>
    <tr>
      <td class="label">Previous School Name</td>
      <td colspan="3">${request.studentInfo?.previousSchool || "Fresh Admission / None"}</td>
    </tr>
  </table>

  <!-- DECLARATION -->
  <div class="declaration">
    <strong>Declaration:</strong> I hereby solemnly declare that all the information provided above is true and correct to the best of my knowledge and belief.
    I understand that any misrepresentation of facts may result in cancellation of admission at any stage.
  </div>

  <!-- SIGNATURE BLOCK -->
  <div class="sig-block">
    <div class="sig-item">
      <div style="height:40px;"></div>
      <div class="sig-line">Parent / Guardian Signature</div>
    </div>
    <div class="sig-item">
      <div style="height:40px;"></div>
      <div class="sig-line">Teacher / Verifier Signature</div>
    </div>
    <div class="sig-item">
      <div style="height:40px;"></div>
      <div class="sig-line">Principal Signature & Stamp</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    This form is computer-generated via Little Flower English School ERP System &nbsp;|&nbsp; Application ID: ${request._id} &nbsp;|&nbsp; Printed on: ${new Date().toLocaleDateString("en-IN")}
  </div>

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>`;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    } else {
      addToast("Please allow popups for this site to print the admission form.", "error");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Draft":
        return "bg-gray-100 text-gray-700 border-gray-200";
      case "Submitted":
        return "bg-blue-50 text-blue-700 border-blue-150";
      case "Under Review":
        return "bg-amber-50 text-amber-700 border-amber-150";
      case "Approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-150";
      case "Rejected":
        return "bg-rose-50 text-rose-700 border-rose-150";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading || !request) {
    return <CardSkeleton />;
  }


  return (
    <div className="space-y-8 print:p-0 print:space-y-4">
      {/* Header section (Non-printable actions) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-200 shadow-sm print:hidden">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => navigate("/admissions/requests")}
            className="text-xs font-black text-gray-400 hover:text-gray-600 flex items-center gap-1.5 uppercase tracking-widest transition-colors mb-2"
          >
            <ArrowLeft size={16} /> Back to Registry
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Application Dossier
            </h2>
            <span
              className={cn(
                "px-3 py-1 rounded-full text-xs font-black tracking-wide border",
                getStatusBadge(request.status),
              )}
            >
              {request.status}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">
            Application ID: {request._id}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button
            variant="secondary"
            onClick={handlePrint}
            className="rounded-xl px-4 py-2.5 flex items-center justify-center gap-1.5 border border-gray-200 text-xs uppercase font-black tracking-widest"
          >
            <Printer size={16} /> Print Application
          </Button>

          {/* Admin Review Actions */}
          {user.role === "admin" && request.status !== "Approved" && (
            <>
              {request.status !== "Under Review" && (
                <Button
                  variant="secondary"
                  onClick={() =>
                    handleReviewAction(
                      "Under Review",
                      "Administrator started reviewing",
                    )
                  }
                  className="rounded-xl px-4 py-2.5 text-xs uppercase font-black tracking-widest border border-amber-200 hover:bg-amber-50 text-amber-700"
                >
                  Mark Under Review
                </Button>
              )}
              <Button
                onClick={() => setIsApproveOpen(true)}
                className="rounded-xl px-4 py-2.5 text-xs uppercase font-black tracking-widest bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1"
              >
                <Check size={16} /> Approve
              </Button>
              <Button
                onClick={() => setIsRejectOpen(true)}
                className="rounded-xl px-4 py-2.5 text-xs uppercase font-black tracking-widest bg-rose-600 hover:bg-rose-700 flex items-center gap-1"
              >
                <X size={16} /> Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Printable Sheet Wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Application Data */}
        <div className="lg:col-span-2 space-y-8 print:w-full">
          {/* Section 1: Student Details */}
          <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] border border-gray-200 shadow-sm space-y-6 relative overflow-hidden">
            {/* Stamp decoration */}
            <div className="absolute right-6 top-6 w-24 h-24 border-4 border-dashed border-indigo-100 rounded-full flex items-center justify-center -rotate-12 select-none pointer-events-none">
              <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">
                LFES ERP
              </span>
            </div>

            <h3 className="text-base font-black text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <User size={18} className="text-indigo-600" />
              1. Student Dossier
            </h3>

            <div className="flex flex-col sm:flex-row gap-8 items-start">
              {/* Photo Preview */}
              <div className="w-32 h-32 bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0">
                {request.studentInfo?.studentPhoto ? (
                  <img
                    src={`${apiHost}${request.studentInfo.studentPhoto}`}
                    alt="Student Photo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="text-gray-300 w-16 h-16" />
                )}
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 flex-1">
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    Full Name
                  </span>
                  <p className="text-sm font-black text-gray-900">
                    {request.studentInfo?.fullName}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    Gender
                  </span>
                  <p className="text-sm font-bold text-gray-700">
                    {request.studentInfo?.gender}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    Date of Birth
                  </span>
                  <p className="text-sm font-semibold text-gray-700">
                    {request.studentInfo?.dob
                      ? new Date(request.studentInfo.dob).toLocaleDateString(
                          [],
                          { month: "long", day: "numeric", year: "numeric" },
                        )
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    Admission Target
                  </span>
                  <p className="text-sm font-black text-indigo-600">
                    Class {request.studentInfo?.admissionClass} -{" "}
                    {request.studentInfo?.section}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-4 border-t border-gray-50">
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  Blood Group
                </span>
                <p className="text-xs font-semibold text-gray-700">
                  {request.studentInfo?.bloodGroup || "Unknown"}
                </p>
              </div>
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  Category / Cast
                </span>
                <p className="text-xs font-semibold text-gray-700">
                  {request.studentInfo?.category || "General"}
                </p>
              </div>
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  Personal Email
                </span>
                <p className="text-xs font-semibold text-gray-700 truncate">
                  {request.parentInfo?.email || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  Personal Phone
                </span>
                <p className="text-xs font-semibold text-gray-700">
                  {request.parentInfo?.phone || "N/A"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 pt-4 border-t border-gray-50">
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  Aadhaar Card Number
                </span>
                <p className="text-xs font-semibold text-gray-700">
                  {request.studentInfo?.aadhar || "Not Provided"}
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Parent details & Address */}
          <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] border border-gray-200 shadow-sm space-y-6">
            <h3 className="text-base font-black text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <Users size={18} className="text-indigo-600" />
              2. Parent & Residential Address Dossier
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  Father's Name
                </span>
                <p className="text-sm font-black text-gray-900">
                  {request.parentInfo?.fatherName}
                </p>
              </div>
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  Mother's Name
                </span>
                <p className="text-sm font-black text-gray-900">
                  {request.parentInfo?.motherName}
                </p>
              </div>
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  Emergency Contact Phone
                </span>
                <p className="text-sm font-black text-rose-600">
                  {request.emergencyContact?.phone}
                </p>
              </div>
            </div>

            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest pt-4 border-t border-gray-50 flex items-center gap-1.5">
              <MapPin size={14} className="text-indigo-600" /> Address Details
            </h4>
            <div className="grid grid-cols-1 gap-6">
              <div className="p-4 bg-gray-55/35 border border-gray-150 rounded-2xl">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  Residential Address
                </span>
                <p className="text-xs font-semibold text-gray-700 mt-1 leading-relaxed">
                  {request.address?.currentAddress || "Not Provided"}
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Academic Alignment & Facilities */}
          <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] border border-gray-200 shadow-sm space-y-6">
            <h3 className="text-base font-black text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <GraduationCap size={18} className="text-indigo-600" />
              3. Academic, Hostel & Logistics Dossier
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  Academic Session
                </span>
                <p className="text-sm font-black text-gray-900">
                  {(() => {
                    const match = request.additionalNotes?.remarks?.match(
                      /Academic Session:\s*([^\s|]+)/,
                    );
                    return match ? match[1] : "2026-2027";
                  })()}
                </p>
              </div>
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  Transport Mode
                </span>
                <p className="text-sm font-semibold text-gray-700">
                  {request.transport?.busRequired ? "School Bus" : "Private"}
                </p>
              </div>
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  Hostel Accommodations
                </span>
                <p className="text-sm font-semibold text-gray-700">
                  {request.hostel?.hostelRequired ? "Required" : "Not Required"}
                </p>
              </div>
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  Previous School Details
                </span>
                <p className="text-sm font-semibold text-gray-700">
                  {request.studentInfo?.previousSchool || "None"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-4 border-t border-gray-50">
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  Admission Date
                </span>
                <p className="text-xs font-semibold text-gray-700">
                  {(() => {
                    const match = request.additionalNotes?.remarks?.match(
                      /Admission Date:\s*([^\s|]+)/,
                    );
                    return match
                      ? match[1]
                      : new Date(request.createdAt).toISOString().split("T")[0];
                  })()}
                </p>
              </div>
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  Fee Discount
                </span>
                <p className="text-xs font-semibold text-gray-700">
                  {(() => {
                    const match =
                      request.additionalNotes?.remarks?.match(
                        /Discount:\s*(\d+)%/,
                      );
                    return match ? `${match[1]}%` : "0%";
                  })()}
                </p>
              </div>
            </div>
          </div>

          {/* Section 5: Document Uploads & Previews */}
          <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] border border-gray-200 shadow-sm space-y-6 print:hidden">
            <h3 className="text-base font-black text-gray-900 border-b border-gray-100 pb-3">
              4. Uploaded Documentation
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.keys(request.documents || {}).map((key) => {
                const pathStr = request.documents[key];
                if (!pathStr) return null;
                const fileName = pathStr.split("/").pop();
                return (
                  <div
                    key={key}
                    className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between gap-4"
                  >
                    <div className="truncate">
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wide">
                        {key.replace(/([A-Z])/g, " $1")}
                      </p>
                      <p
                        className="text-xs text-gray-600 font-semibold truncate mt-0.5"
                        title={fileName}
                      >
                        {fileName}
                      </p>
                    </div>
                    <button
                      onClick={() => setPreviewDoc(`${apiHost}${pathStr}`)}
                      className="bg-white hover:bg-indigo-50 border border-gray-150 hover:border-indigo-100 p-2.5 rounded-xl text-gray-400 hover:text-indigo-600 transition-all flex-shrink-0"
                      title="Preview Document"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                );
              })}
              {Object.values(request.documents || {}).filter(Boolean).length ===
                0 && (
                <p className="text-xs font-semibold text-gray-400 col-span-2 py-4">
                  No documents were uploaded with this request.
                </p>
              )}
            </div>
          </div>

          {/* Section 6: In-App Comments (Discussion Board) */}
          <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] border border-gray-200 shadow-sm space-y-6 print:hidden">
            <h3 className="text-base font-black text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <MessageSquare size={18} className="text-indigo-600" />
              5. Discussion & Review Comments
            </h3>

            {/* Previous Comments list */}
            <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar pr-2">
              {request.timeline
                .filter((t) => t.action === "CommentAdded")
                .map((t, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-3xl border border-gray-100 space-y-1 relative bg-gray-55/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-gray-900">
                        {t.performedByName}
                      </span>
                      <span className="text-[9px] text-gray-400 font-bold">
                        {new Date(t.timestamp).toLocaleDateString()}{" "}
                        {new Date(t.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 font-semibold leading-relaxed">
                      {t.notes}
                    </p>
                  </div>
                ))}
              {request.timeline.filter((t) => t.action === "CommentAdded")
                .length === 0 && (
                <p className="text-xs font-bold text-gray-400 py-6 text-center">
                  No comments posted yet. Start the discussion below.
                </p>
              )}
            </div>

            {/* Add Comment form */}
            <form onSubmit={handleAddComment} className="flex gap-4">
              <input
                type="text"
                placeholder="Type internal comment or request information..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-2xl px-4 py-3 outline-none focus:bg-white focus:border-indigo-600 transition-all font-semibold"
              />
              <Button
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                className="rounded-2xl px-4 py-3 shadow-md shadow-indigo-100 flex items-center gap-1.5 shrink-0"
              >
                <Send size={16} /> Send
              </Button>
            </form>
          </div>
        </div>

        {/* Right 1 Column: Summary, timeline, notes */}
        <div className="space-y-8 print:hidden">
          {/* Details Sidebar card */}
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-200 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Metadata
            </h4>
            <div className="space-y-3 font-semibold text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Created By:</span>
                <span className="font-bold text-gray-900">
                  {request.createdBy?.name || "System"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Role:</span>
                <span className="font-bold text-gray-900 capitalize">
                  {request.createdBy?.role}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Created Date:</span>
                <span className="font-bold text-gray-900">
                  {new Date(request.createdAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              {request.submittedAt && (
                <div className="flex justify-between">
                  <span>Submitted At:</span>
                  <span className="font-bold text-gray-900">
                    {new Date(request.submittedAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
              {request.status === "Approved" && (
                <div className="flex justify-between text-emerald-700">
                  <span>Approved By:</span>
                  <span className="font-black">
                    {request.approvedBy?.name || "Admin"}
                  </span>
                </div>
              )}
              {request.status === "Rejected" && (
                <div className="flex justify-between text-rose-700">
                  <span>Rejected By:</span>
                  <span className="font-black">
                    {request.rejectedBy?.name || "Admin"}
                  </span>
                </div>
              )}
            </div>
            {request.reviewNotes && (
              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl mt-4">
                <span className="text-[9px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-1">
                  <AlertCircle size={10} /> Admin Remarks
                </span>
                <p className="text-xs text-amber-900 font-semibold mt-1 leading-relaxed">
                  {request.reviewNotes}
                </p>
              </div>
            )}
          </div>

          {/* Timeline / Audit Logs */}
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-200 shadow-sm space-y-6">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Workflow Timeline
            </h4>

            <div className="relative border-l border-gray-150 pl-5 space-y-6">
              {request.timeline
                .filter((t) => t.action !== "CommentAdded")
                .map((t, idx) => (
                  <div key={idx} className="relative">
                    {/* Circle icon */}
                    <span className="absolute -left-[27px] top-0.5 bg-white border-2 border-indigo-600 rounded-full w-3.5 h-3.5 flex items-center justify-center" />
                    <div>
                      <h5 className="text-xs font-black text-gray-900 uppercase tracking-wide">
                        {t.action}
                      </h5>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                        {t.performedByName}
                      </p>
                      <p className="text-[10px] text-gray-500 font-semibold mt-1 leading-relaxed">
                        {t.notes}
                      </p>
                      <span className="text-[9px] text-gray-400 mt-1 block">
                        {new Date(t.timestamp).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        at{" "}
                        {new Date(t.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                <FileText size={18} className="text-indigo-600" /> Document
                Preview
              </h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 hover:bg-gray-50 text-gray-400 hover:text-gray-700 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 bg-gray-50 p-4 overflow-hidden">
              {previewDoc.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={previewDoc}
                  title="Document Preview"
                  className="w-full h-full rounded-2xl border border-gray-200"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center overflow-auto">
                  <img
                    src={previewDoc}
                    alt="Document Preview"
                    className="max-w-full max-h-full rounded-xl object-contain shadow"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Approve Modal */}
      <ConfirmModal
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        onConfirm={() => {
          setIsApproveOpen(false);
          handleReviewAction(
            "Approved",
            "Admission request approved, student profile created successfully.",
          );
        }}
        title="Approve Admission Request"
        message={`Are you sure you want to approve this admission request? This will automatically create a new active student profile for ${request.studentInfo?.fullName} and generate their roll number and admission number.`}
        confirmLabel="Approve & Enroll"
        variant="success"
      />

      {/* Reject Modal */}
      {isRejectOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200 space-y-6">
            <div>
              <h3 className="text-lg font-black text-gray-900">
                Reject Admission Request
              </h3>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">
                Specify rejection reason below
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 ml-1">
                Rejection Reason *
              </label>
              <textarea
                placeholder="Specify reason (e.g. Invalid documents, missing details...)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-2xl p-3 outline-none focus:border-indigo-600 h-24 font-semibold"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setIsRejectOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest border border-gray-205"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!rejectReason.trim()) {
                    addToast("Please provide a rejection reason", "error");
                    return;
                  }
                  setIsRejectOpen(false);
                  handleReviewAction("Rejected", rejectReason);
                }}
                className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700"
              >
                Reject Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmissionRequestDetails;
