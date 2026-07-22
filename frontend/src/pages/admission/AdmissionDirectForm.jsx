import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTodayDateString } from "../../utils/dateUtils";
import {
  User,
  GraduationCap,
  Users,
  MapPin,
  UploadCloud,
  ArrowLeft,
  CheckCircle,
  Printer,
  Download,
  X,
  Truck
} from "lucide-react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useToast } from "../../context/ToastContext";
import { cn } from "../../utils/cn";
import api from "../../services/api";

// ─────────────────────────────────────────────────────────────
// Reusable styled select wrapper to match form Input component
// ─────────────────────────────────────────────────────────────
const SelectField = ({ label, value, onChange, children }) => (
  <div className="space-y-2">
    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
      {label}
    </label>
    <select
      value={value}
      onChange={onChange}
      className="w-full bg-white border border-gray-200 text-gray-900 text-sm font-semibold rounded-2xl p-4 outline-none focus:border-indigo-600 transition-all focus:ring-4 focus:ring-indigo-50 appearance-none cursor-pointer"
    >
      {children}
    </select>
  </div>
);

// ─────────────────────────────────────────────────────────────
// Section header component
// ─────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
const SectionHeader = ({ icon: IconComponent, title, subtitle }) => (
  <div className="border-b border-gray-100 pb-3 flex items-center gap-3">
    <div className="p-2 bg-indigo-50 text-indigo-500 rounded-xl flex-shrink-0">
      <IconComponent size={20} />
    </div>
    <div>
      <h3 className="text-lg font-black text-gray-800 tracking-tight uppercase">{title}</h3>
      <p className="text-xs text-gray-400 font-medium">{subtitle}</p>
    </div>
  </div>
);

const AdmissionDirectForm = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [isDragActive, setIsDragActive] = useState(false);

  // Successful admission state for success screen
  const [successData, setSuccessData] = useState(null);

  // ── Form States ──────────────────────────────────────────
  const [studentInfo, setStudentInfo] = useState({
    fullName: "",
    gender: "Male",
    dob: "",
    bloodGroup: "Unknown",
    category: "General",
    religion: "Hindu",
    nationality: "Indian",
    aadhar: "",
    birthCertificateNumber: "",
    admissionClass: "",
    section: "A",
  });

  const [academicDetails, setAcademicDetails] = useState({
    session: "2026-2027",
    admissionDate: getTodayDateString(),
  });

  const [parentInfo, setParentInfo] = useState({
    fatherName: "",
    fatherMobile: "",
    fatherOccupation: "",
    fatherAadhar: "",
    motherName: "",
    motherOccupation: "",
    phone: "",
  });

  const [address, setAddress] = useState({
    currentAddress: "",
    city: "",
    district: "",
    state: "",
    pinCode: "",
  });

  const [emergencyContact, setEmergencyContact] = useState({
    contactPerson: "",
    relationship: "",
    phone: "",
  });

  const [transport, setTransport] = useState({
    busRequired: false,
    route: "",
    pickupPoint: "",
    transportFee: 0,
  });

  const [discountPercentage, setDiscountPercentage] = useState(0);



  const [files, setFiles] = useState({
    studentPhoto: null,
    birthCertificate: null,
    transferCertificate: null,
    previousMarksheet: null,
    aadharCard: null,
    studentPhotograph: null,
    parentPhotograph: null,
    otherDocuments: null,
  });

  const [previews, setPreviews] = useState({ studentPhoto: "" });

  // ── Fetch classes on mount ───────────────────────────────
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/admin/classes?all=true");
        if (res.data.success) {
          const classData = res.data.data || [];
          setClasses(classData);
          if (classData.length > 0 && !studentInfo.admissionClass) {
            const firstClass = classData[0];
            const className =
              firstClass && firstClass.name ? firstClass.name.split("-")[0] : "";
            if (className) {
              setStudentInfo((prev) => ({ ...prev, admissionClass: className }));
            }
          }
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    };
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Photo drag-and-drop handlers ─────────────────────────
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragActive(true);
    else if (e.type === "dragleave") setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processPhotoFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileElementChange = (e) => {
    if (e.target.files && e.target.files[0]) processPhotoFile(e.target.files[0]);
  };

  const handleDocFileChange = (e, docKey) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        addToast("Document file size must not exceed 5MB", "error");
        return;
      }
      setFiles((prev) => ({ ...prev, [docKey]: file }));
      addToast(`${file.name} uploaded successfully`, "success");
    }
  };

  const removeDoc = (docKey) => setFiles((prev) => ({ ...prev, [docKey]: null }));

  const processPhotoFile = (file) => {
    if (file.size > 2 * 1024 * 1024) {
      addToast("Portrait file size must not exceed 2MB", "error");
      return;
    }
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
      addToast("Only JPG, JPEG, PNG, and WEBP formats are allowed", "error");
      return;
    }
    setFiles((prev) => ({ ...prev, studentPhoto: file }));
    const reader = new FileReader();
    reader.onloadend = () =>
      setPreviews((prev) => ({ ...prev, studentPhoto: reader.result }));
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setFiles((prev) => ({ ...prev, studentPhoto: null }));
    setPreviews((prev) => ({ ...prev, studentPhoto: "" }));
  };

  // ── Validation ───────────────────────────────────────────
  const validateForm = () => {
    const name = studentInfo.fullName.trim();
    if (!name) return "Student Full Name is required";
    if (/[<>{}[\]\\]/.test(name)) return "Student name contains invalid characters";

    if (!studentInfo.dob) return "Date of Birth is required";
    if (new Date(studentInfo.dob) > new Date())
      return "Date of birth cannot be in the future";

    if (!studentInfo.admissionClass) return "Admission Class is required";
    if (!academicDetails.session.trim()) return "Academic Session is required";
    if (!academicDetails.admissionDate) return "Admission Date is required";

    if (!parentInfo.fatherName.trim()) return "Father's Name is required";
    if (!parentInfo.motherName.trim()) return "Mother's Name is required";

    const mobileRe = /^\d{10,15}$/;
    if (parentInfo.fatherMobile && !mobileRe.test(parentInfo.fatherMobile.trim()))
      return "Father's mobile number must be a valid 10–15 digit number";

    if (!emergencyContact.phone.trim()) return "Emergency Contact Number is required";
    if (!mobileRe.test(emergencyContact.phone.trim()))
      return "Emergency contact number must be a valid 10–15 digit number";

    if (!address.currentAddress.trim()) return "Current Residential Address is required";

    const aadharRe = /^\d{12}$/;
    if (studentInfo.aadhar && !aadharRe.test(studentInfo.aadhar.trim()))
      return "Student Aadhaar number must be exactly 12 digits";
    if (parentInfo.fatherAadhar && !aadharRe.test(parentInfo.fatherAadhar.trim()))
      return "Father's Aadhaar number must be exactly 12 digits";

    if (address.pinCode && !/^\d{6}$/.test(address.pinCode.trim()))
      return "PIN code must be exactly 6 digits";

    return null;
  };

  // ── Compile request payload ──────────────────────────────
  // academicSession, discountPercentage, and admissionDate are sent as top-level
  // fields so the backend controller can cleanly save them to the AdmissionRequest
  // document and enrollStudent() can read them without any regex parsing.
  const compileRequestBody = () => {
    const primaryPhone = parentInfo.fatherMobile || emergencyContact.phone;

    return {
      // Top-level fields consumed by directAdmission controller
      academicSession: academicDetails.session.trim(),
      discountPercentage: Number(discountPercentage) || 0,
      admissionDate: academicDetails.admissionDate,

      studentInfo: {
        fullName: studentInfo.fullName.trim(),
        gender: studentInfo.gender,
        dob: studentInfo.dob,
        admissionClass: studentInfo.admissionClass,
        section: studentInfo.section || "A",
        bloodGroup: studentInfo.bloodGroup,
        category: studentInfo.category,
        religion: studentInfo.religion,
        nationality: studentInfo.nationality,
        aadhar: studentInfo.aadhar.trim(),
        birthCertificateNumber: studentInfo.birthCertificateNumber.trim(),
        studentPhoto: "",
      },
      parentInfo: {
        fatherName: parentInfo.fatherName.trim(),
        fatherMobile: parentInfo.fatherMobile.trim(),
        fatherOccupation: parentInfo.fatherOccupation.trim(),
        fatherAadhar: parentInfo.fatherAadhar.trim(),
        motherName: parentInfo.motherName.trim(),
        motherOccupation: parentInfo.motherOccupation.trim(),
        phone: primaryPhone,
      },
      address: {
        currentAddress: address.currentAddress.trim(),
        permanentAddress: address.currentAddress.trim(),
        city: address.city.trim(),
        district: address.district.trim(),
        state: address.state.trim(),
        pinCode: address.pinCode.trim(),
      },
      emergencyContact: {
        contactPerson: emergencyContact.contactPerson.trim() || parentInfo.fatherName.trim() || "Parent",
        relationship: emergencyContact.relationship.trim() || "Parent",
        phone: emergencyContact.phone.trim(),
      },
      transport: {
        busRequired: transport.busRequired,
        route: transport.route.trim(),
        pickupPoint: transport.pickupPoint.trim(),
        transportFee: Number(transport.transportFee) || 0,
      },
      medicalInfo: { medicalConditions: "", allergies: "", doctorName: "" },
      hostel: { hostelRequired: false },
      additionalNotes: {
        remarks: `Session: ${academicDetails.session.trim()} | Admitted: ${academicDetails.admissionDate}`,
        teacherComments: "Direct Admission performed by Admin.",
      },
    };
  };

  // ── Submit ───────────────────────────────────────────────
  const handleSubmitAdmission = async () => {
    const errorMsg = validateForm();
    if (errorMsg) {
      addToast(errorMsg, "warning");
      return;
    }

    setLoading(true);
    try {
      const payload = compileRequestBody();
      const formData = new FormData();

      // Top-level scalar fields
      formData.append("academicSession", payload.academicSession);
      formData.append("discountPercentage", payload.discountPercentage);
      formData.append("admissionDate", payload.admissionDate);

      // JSON-encoded nested objects
      const jsonKeys = [
        "studentInfo",
        "parentInfo",
        "address",
        "emergencyContact",
        "transport",
        "hostel",
        "medicalInfo",
        "additionalNotes",
      ];
      jsonKeys.forEach((key) => formData.append(key, JSON.stringify(payload[key])));

      // File uploads
      Object.keys(files).forEach((key) => {
        if (files[key]) formData.append(key, files[key]);
      });

      const res = await api.post(
        "/admission-requests/direct-admission",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (res.data.success) {
        addToast("Direct Student Admission completed successfully!", "success");
        setSuccessData(res.data.data);
      }
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.message || "Direct student admission failed. Please try again.";
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────
  // SUCCESS SCREEN
  // ────────────────────────────────────────────────────────
  if (successData) {
    const { student, request } = successData;
    const apiHost = api.defaults.baseURL.replace("/api", "");

    const handlePrint = () => {
      const photoUrl = student.studentPhoto ? `${apiHost}${student.studentPhoto}` : null;
      const dob = student.dob
        ? new Date(student.dob).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
        : "N/A";
      const admissionDateStr = student.admissionDate
        ? new Date(student.admissionDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
        : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Admission Form - ${student.fullName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #1a1a1a; background: #fff; padding: 20mm 18mm 18mm 18mm; }
    .school-header { text-align: center; border-bottom: 3px double #1a1a1a; padding-bottom: 12px; margin-bottom: 14px; }
    .school-header .school-name { font-size: 22pt; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
    .school-header .school-tagline { font-size: 9pt; color: #555; margin-top: 2px; font-style: italic; }
    .school-header .school-contact { font-size: 8.5pt; color: #444; margin-top: 3px; }
    .form-title-box { display: inline-block; margin-top: 10px; border: 2px solid #1a1a1a; padding: 5px 24px; font-size: 12pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 4px; }
    .meta-row { display: flex; justify-content: space-between; font-size: 8.5pt; color: #444; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 14px; }
    .meta-row span { font-weight: bold; color: #1a1a1a; }
    .top-section { display: flex; gap: 20px; margin-bottom: 16px; align-items: flex-start; }
    .photo-box { width: 110px; height: 130px; border: 2px solid #1a1a1a; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 8pt; color: #888; text-align: center; overflow: hidden; }
    .photo-box img { width: 100%; height: 100%; object-fit: cover; }
    .basic-table { flex: 1; border-collapse: collapse; width: 100%; font-size: 10pt; }
    .basic-table td { padding: 5px 8px; border: 1px solid #ccc; vertical-align: top; }
    .basic-table .label { font-weight: bold; background: #f5f5f5; white-space: nowrap; width: 36%; font-size: 9pt; text-transform: uppercase; color: #444; }
    .section-heading { font-size: 10pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px; background: #f0f0f0; padding: 5px 10px; border-left: 4px solid #1a1a1a; margin: 14px 0 8px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    .data-table td { padding: 5px 8px; border: 1px solid #ccc; vertical-align: top; }
    .data-table .label { font-weight: bold; background: #f9f9f9; white-space: nowrap; font-size: 9pt; text-transform: uppercase; color: #555; width: 30%; }
    .address-box { border: 1px solid #ccc; padding: 8px 10px; font-size: 10pt; min-height: 44px; border-radius: 2px; }
    .declaration { margin-top: 20px; font-size: 9pt; color: #444; font-style: italic; line-height: 1.6; }
    .sig-block { display: flex; justify-content: space-between; margin-top: 36px; gap: 20px; }
    .sig-item { flex: 1; text-align: center; }
    .sig-line { border-top: 1.5px solid #1a1a1a; padding-top: 6px; font-size: 9pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
    .footer { margin-top: 18px; text-align: center; font-size: 8pt; color: #888; border-top: 1px dashed #ccc; padding-top: 8px; }
    @page { margin: 0; }
    @media print { body { padding: 12mm 14mm 12mm 14mm; } }
  </style>
</head>
<body>
  <div class="school-header">
    <div class="school-name">Little Flower English School</div>
    <div class="school-tagline">Dindayalpur Siwan Bihar 841506</div>
    <div class="school-contact">Phone: +91 82946 80282 &nbsp;|&nbsp; Email: tiwarichandramohan50@gmail.com</div>
    <div class="form-title-box">Admission Application Form</div>
  </div>
  <div class="meta-row">
    <div>Student ID: <span>${student.studentId}</span></div>
    <div>Admission No: <span>${student.admissionNumber}</span></div>
    <div>Roll No: <span>${student.rollNumber}</span></div>
    <div>Status: <span>APPROVED</span></div>
    <div>Academic Year: <span>${student.session}</span></div>
  </div>
  <div class="top-section">
    <div class="photo-box">${photoUrl ? `<img src="${photoUrl}" alt="Student Photo" />` : `Affix Recent<br/>Passport Size<br/>Photograph`}</div>
    <table class="basic-table">
      <tr>
        <td class="label">Full Name of Student</td><td><strong>${student.fullName}</strong></td>
        <td class="label">Gender</td><td>${student.gender || "—"}</td>
      </tr>
      <tr>
        <td class="label">Date of Birth</td><td>${dob}</td>
        <td class="label">Blood Group</td><td>${student.bloodGroup || "—"}</td>
      </tr>
      <tr>
        <td class="label">Seeking Admission In</td><td><strong>Class ${student.className} - Section ${student.section}</strong></td>
        <td class="label">Category / Caste</td><td>${student.cast || "General"}</td>
      </tr>
      <tr>
        <td class="label">Aadhaar Card No.</td><td>${student.aadhar || "Not Provided"}</td>
        <td class="label">Admission Date</td><td>${admissionDateStr}</td>
      </tr>
      <tr>
        <td class="label">Father's Name</td><td>${student.fatherName || "—"}</td>
        <td class="label">Mother's Name</td><td>${student.motherName || "—"}</td>
      </tr>
    </table>
  </div>
  <div class="section-heading">1. Parent / Guardian Information</div>
  <table class="data-table">
    <tr>
      <td class="label">Father's Mobile</td><td>${request.parentInfo?.fatherMobile || "—"}</td>
      <td class="label">Father's Occupation</td><td>${request.parentInfo?.fatherOccupation || "—"}</td>
    </tr>
    <tr>
      <td class="label">Mother's Occupation</td><td>${request.parentInfo?.motherOccupation || "—"}</td>
      <td class="label">Emergency Contact No.</td><td><strong>${request.emergencyContact?.phone || "—"}</strong></td>
    </tr>
  </table>
  <div class="section-heading">2. Residential Address</div>
  <div class="address-box">${[request.address?.currentAddress, request.address?.city, request.address?.district, request.address?.state, request.address?.pinCode].filter(Boolean).join(", ") || "Not Provided"}</div>
  <div class="section-heading">3. Academic Alignment &amp; Facilities</div>
  <table class="data-table">
    <tr>
      <td class="label">Academic Session</td><td>${student.session}</td>
      <td class="label">Transport Requirement</td><td>${request.transport?.busRequired ? "School Bus Facility Required" : "Private / Self Transport"}</td>
    </tr>
    <tr>
      <td class="label">Hostel Requirement</td><td>${request.hostel?.hostelRequired ? "Hostel Accommodation Required" : "Day Scholar (No Hostel)"}</td>
      <td class="label">Birth Certificate No.</td><td>${request.studentInfo?.birthCertificateNumber || "Not Provided"}</td>
    </tr>
    <tr>
      <td class="label">Religion</td><td>${request.studentInfo?.religion || "—"}</td>
      <td class="label">Nationality</td><td>${request.studentInfo?.nationality || "Indian"}</td>
    </tr>
  </table>
  <div class="declaration">
    <strong>Declaration:</strong> I hereby solemnly declare that all the information provided above is true and correct to the best of my knowledge and belief. I understand that any misrepresentation of facts may result in cancellation of admission at any stage.
  </div>
  <div class="sig-block">
    <div class="sig-item"><div style="height:40px;"></div><div class="sig-line">Parent / Guardian Signature</div></div>
    <div class="sig-item"><div style="height:40px;"></div><div class="sig-line">Teacher / Verifier Signature</div></div>
    <div class="sig-item"><div style="height:40px;"></div><div class="sig-line">Principal Signature &amp; Stamp</div></div>
  </div>
  <div class="footer">
    This form is computer-generated via Little Flower English School ERP System &nbsp;|&nbsp; Student ID: ${student.studentId} &nbsp;|&nbsp; Printed on: ${new Date().toLocaleDateString("en-IN")}
  </div>
  <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>
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

    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* On-screen success panel — hidden during print */}
        <div className="bg-white p-8 sm:p-12 rounded-[2.5rem] border border-gray-150 shadow-lg text-center print:hidden space-y-8">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle size={48} />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none">
            Admission Successful!
          </h2>
          <p className="text-sm font-semibold text-gray-400 max-w-md mx-auto">
            Student profile created. Class mapping, attendance index, and fee ledger are
            all synchronized automatically.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto bg-gray-50/60 p-6 rounded-3xl border border-gray-100 text-left">
            {[
              ["Student Name", student.fullName],
              ["Student ID", student.studentId],
              ["Admission No", student.admissionNumber],
              ["Roll Number", student.rollNumber],
              ["Class", `${student.className} — ${student.section}`],
              ["Session", student.session],
              [
                "Admission Date",
                student.admissionDate
                  ? new Date(student.admissionDate).toLocaleDateString("en-IN")
                  : "—",
              ],
              ["Discount", `${student.discountPercentage || 0}%`],
            ].map(([label, val]) => (
              <div key={label}>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                  {label}
                </span>
                <strong className="text-gray-800 text-sm">{val}</strong>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button
              variant="secondary"
              className="h-12 rounded-xl text-xs font-black uppercase tracking-widest border border-gray-200 flex items-center gap-2"
              onClick={handlePrint}
            >
              <Printer size={16} /> Print Admission Form
            </Button>
            <Button
              variant="secondary"
              className="h-12 rounded-xl text-xs font-black uppercase tracking-widest border border-gray-200 flex items-center gap-2"
              onClick={handlePrint}
            >
              <Download size={16} /> Download PDF
            </Button>
            <Button
              className="h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
              onClick={() => navigate(`/students/${student._id}`)}
            >
              Go to Student Profile
            </Button>
            <Button
              variant="secondary"
              className="h-12 rounded-xl text-xs font-black uppercase tracking-widest border border-gray-200"
              onClick={() => navigate("/admissions/requests")}
            >
              Done
            </Button>
          </div>
        </div>

        {/* ── Printable Admission Form — only visible when printing ── */}
        <div className="hidden print:block p-8 bg-white text-gray-800 text-xs leading-relaxed space-y-6 font-sans">
          {/* School Header */}
          <div className="flex justify-between items-start border-b-4 border-gray-900 pb-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">
                Little Flower English School
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">
                Student Admission Form &amp; Registration Record
              </p>
              <p className="text-[9px] text-gray-400 mt-1">
                Printed on: {new Date().toLocaleString("en-IN")}
              </p>
            </div>
            {/* Student Photo */}
            <div className="w-24 h-28 border-2 border-gray-400 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
              {student.studentPhoto ? (
                <img
                  src={`${api.defaults.baseURL.replace("/api", "")}${student.studentPhoto}`}
                  alt="Student Portrait"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[9px] font-bold text-gray-400 text-center uppercase p-1">
                  No Photo
                </span>
              )}
            </div>
          </div>

          {/* IDs Row */}
          <div className="grid grid-cols-3 gap-y-3 gap-x-6 border-b border-gray-200 pb-4">
            {[
              ["Admission Number", student.admissionNumber],
              ["Student ID", student.studentId],
              ["Roll Number", student.rollNumber],
              ["Class & Section", `${student.className} — ${student.section}`],
              ["Academic Session", student.session],
              [
                "Admission Date",
                student.admissionDate
                  ? new Date(student.admissionDate).toLocaleDateString("en-IN")
                  : "—",
              ],
            ].map(([label, val]) => (
              <div key={label}>
                <span className="text-[9px] font-bold text-gray-400 uppercase block">{label}</span>
                <strong className="text-sm text-gray-900">{val}</strong>
              </div>
            ))}
          </div>

          {/* Section 1: Student Details */}
          <div className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-800 bg-gray-100 px-2 py-1 rounded">
              1. Student Details
            </h2>
            <div className="grid grid-cols-3 gap-y-3 gap-x-4">
              {[
                ["Full Name", student.fullName],
                ["Gender", student.gender],
                ["Date of Birth", student.dob ? new Date(student.dob).toLocaleDateString("en-IN") : "—"],
                ["Blood Group", student.bloodGroup],
                ["Aadhaar Number", student.aadhar || "Not Provided"],
                ["Category", student.cast || "General"],
                ["Religion", request.studentInfo?.religion || "—"],
                ["Nationality", request.studentInfo?.nationality || "Indian"],
                ["Birth Certificate No.", request.studentInfo?.birthCertificateNumber || "N/A"],
                ["PEN Number", request.studentInfo?.penNumber || "N/A"],
                ["House", request.studentInfo?.house || "N/A"],
              ].map(([label, val]) => (
                <div key={label}>
                  <span className="text-[9px] text-gray-400 uppercase block">{label}</span>
                  <strong>{val}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Parent & Address */}
          <div className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-800 bg-gray-100 px-2 py-1 rounded">
              2. Parent &amp; Address Details
            </h2>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
              <div>
                <span className="text-[9px] text-gray-400 uppercase block">Father's Details</span>
                <strong>
                  {student.fatherName}
                  <br />
                  Mob: {request.parentInfo?.fatherMobile || "N/A"} | Occ:{" "}
                  {request.parentInfo?.fatherOccupation || "N/A"}
                </strong>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 uppercase block">Mother's Details</span>
                <strong>
                  {student.motherName}
                  <br />
                  Mob: {request.parentInfo?.motherMobile || "N/A"} | Occ:{" "}
                  {request.parentInfo?.motherOccupation || "N/A"}
                </strong>
              </div>
              {request.parentInfo?.guardianName && (
                <div className="col-span-2">
                  <span className="text-[9px] text-gray-400 uppercase block">Guardian</span>
                  <strong>
                    {request.parentInfo.guardianName} ({request.parentInfo.guardianRelation}) | Mob:{" "}
                    {request.parentInfo.guardianMobile}
                  </strong>
                </div>
              )}
              <div className="col-span-2">
                <span className="text-[9px] text-gray-400 uppercase block">Current Address</span>
                <strong>{request.address?.currentAddress}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-[9px] text-gray-400 uppercase block">Permanent Address</span>
                <strong>{request.address?.permanentAddress}</strong>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 uppercase block">City / Village</span>
                <strong>{request.address?.city || "—"}</strong>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 uppercase block">District</span>
                <strong>{request.address?.district || "—"}</strong>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 uppercase block">State</span>
                <strong>{request.address?.state || "—"}</strong>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 uppercase block">PIN Code</span>
                <strong>{request.address?.pinCode || "—"}</strong>
              </div>
            </div>
          </div>

          {/* Section 3: Academic History & Transport */}
          <div className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-800 bg-gray-100 px-2 py-1 rounded">
              3. Academic History &amp; Logistics
            </h2>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
              <div>
                <span className="text-[9px] text-gray-400 uppercase block">Previous School</span>
                <strong>
                  {student.previousSchool || "None"}
                  <br />
                  Last Class: {request.studentInfo?.previousLastClass || "N/A"} | TC:{" "}
                  {request.studentInfo?.transferCertificateNumber || "N/A"}
                </strong>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 uppercase block">Transport</span>
                <strong>
                  Mode: {student.transportMode}
                  {request.transport?.busRequired
                    ? ` | Route: ${request.transport.route || "N/A"} | Fee: ₹${request.transport.transportFee}/m`
                    : ""}
                </strong>
              </div>
              {request.medicalInfo && (
                <div className="col-span-2">
                  <span className="text-[9px] text-gray-400 uppercase block">Medical</span>
                  <strong>
                    Conditions: {request.medicalInfo.medicalConditions || "None"} | Allergies:{" "}
                    {request.medicalInfo.allergies || "None"} | Doctor:{" "}
                    {request.medicalInfo.doctorName || "N/A"} | Emergency:{" "}
                    {student.emergencyContact}
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* Signature Row */}
          <div className="pt-14 grid grid-cols-3 gap-6 text-center text-[10px]">
            {["Parent / Guardian Signature", "School Seal / Stamp", "Principal Authorization"].map(
              (label) => (
                <div key={label} className="border-t border-gray-400 pt-2">
                  <p className="font-bold text-gray-700">{label}</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  // MAIN FORM
  // ────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 print:hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <button
            onClick={() => navigate("/admissions/requests")}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500 hover:text-indigo-600 transition-colors mb-3"
          >
            <ArrowLeft size={14} /> Back to Registry
          </button>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none">
            Direct Student Admission
          </h2>
          <p className="text-xs font-semibold text-gray-400 mt-2">
            Admin direct registration — bypasses teacher workflow, uses the same
            enrollment pipeline.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white p-8 sm:p-12 rounded-[2.5rem] border border-gray-150 shadow-md space-y-12">

        {/* ── SECTION 1: STUDENT INFORMATION ── */}
        <div className="space-y-6">
          <SectionHeader
            icon={User}
            title="1. Student Information"
            subtitle="Enter student's personal details."
          />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left: fields */}
            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="Full Name *"
                placeholder="Enter student's full name"
                value={studentInfo.fullName}
                onChange={(e) =>
                  setStudentInfo({ ...studentInfo, fullName: e.target.value })
                }
              />

              <SelectField
                label="Gender *"
                value={studentInfo.gender}
                onChange={(e) =>
                  setStudentInfo({ ...studentInfo, gender: e.target.value })
                }
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </SelectField>

              <Input
                label="Date of Birth *"
                type="date"
                value={studentInfo.dob}
                onChange={(e) =>
                  setStudentInfo({ ...studentInfo, dob: e.target.value })
                }
              />

              <SelectField
                label="Blood Group"
                value={studentInfo.bloodGroup}
                onChange={(e) =>
                  setStudentInfo({ ...studentInfo, bloodGroup: e.target.value })
                }
              >
                {["Unknown", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                  (bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  )
                )}
              </SelectField>

              <Input
                label="Aadhaar Card Number"
                placeholder="12-digit Aadhaar"
                value={studentInfo.aadhar}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 12);
                  setStudentInfo({ ...studentInfo, aadhar: val });
                }}
              />

              <Input
                label="Birth Certificate Number"
                placeholder="Certificate Number"
                value={studentInfo.birthCertificateNumber}
                onChange={(e) =>
                  setStudentInfo({
                    ...studentInfo,
                    birthCertificateNumber: e.target.value,
                  })
                }
              />

              <Input
                label="Religion"
                placeholder="e.g. Hindu, Muslim, Christian"
                value={studentInfo.religion}
                onChange={(e) =>
                  setStudentInfo({ ...studentInfo, religion: e.target.value })
                }
              />

              <SelectField
                label="Category / Caste"
                value={studentInfo.category}
                onChange={(e) =>
                  setStudentInfo({ ...studentInfo, category: e.target.value })
                }
              >
                <option value="General">General</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="EWS">EWS</option>
              </SelectField>

            </div>

            {/* Right: Photo upload */}
            <div className="md:col-span-4 flex flex-col justify-start">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">
                Student Portrait
              </label>
              {previews.studentPhoto ? (
                <div className="relative border border-indigo-100 rounded-[2rem] p-2 bg-indigo-50/20 overflow-hidden flex flex-col items-center justify-center group h-56">
                  <img
                    src={previews.studentPhoto}
                    alt="Student preview"
                    className="h-full rounded-2xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm text-rose-600 rounded-full hover:bg-rose-50 border border-gray-100 shadow-md transition-all active:scale-90"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() =>
                    document.getElementById("direct-portrait-picker").click()
                  }
                  className={cn(
                    "border-2 border-dashed rounded-[2rem] p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 h-56 group",
                    isDragActive
                      ? "border-indigo-600 bg-indigo-50/30 scale-98"
                      : "border-gray-200 hover:border-indigo-500 hover:bg-gray-50/40"
                  )}
                >
                  <input
                    id="direct-portrait-picker"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileElementChange}
                  />
                  <UploadCloud
                    className={cn(
                      "w-10 h-10 transition-transform duration-300 group-hover:-translate-y-1",
                      isDragActive ? "text-indigo-600" : "text-gray-400"
                    )}
                  />
                  <span className="text-xs font-bold text-gray-700 mt-3 block">
                    Drag &amp; drop portrait, or{" "}
                    <span className="text-indigo-600 underline">browse</span>
                  </span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight mt-1.5 leading-none block">
                    JPEG · PNG · WEBP · Max 2 MB
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── SECTION 2: ACADEMIC DETAILS ── */}
        <div className="space-y-6">
          <SectionHeader
            icon={GraduationCap}
            title="2. Academic Details"
            subtitle="Select class, section, session, and admission date."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <SelectField
              label="Class Group *"
              value={studentInfo.admissionClass}
              onChange={(e) =>
                setStudentInfo({ ...studentInfo, admissionClass: e.target.value })
              }
            >
              <option value="">Select Class</option>
              {classes.map((c) => {
                const className = c && c.name ? c.name.split("-")[0] : "";
                return (
                  <option key={c._id} value={className}>
                    {c.name}
                  </option>
                );
              })}
            </SelectField>

            <Input
              label="Section"
              placeholder="A, B, C etc."
              value={studentInfo.section}
              onChange={(e) =>
                setStudentInfo({ ...studentInfo, section: e.target.value })
              }
            />

            <Input
              label="Academic Session *"
              placeholder="2026-2027"
              value={academicDetails.session}
              onChange={(e) =>
                setAcademicDetails({ ...academicDetails, session: e.target.value })
              }
            />

            <Input
              label="Admission Date *"
              type="date"
              value={academicDetails.admissionDate}
              onChange={(e) =>
                setAcademicDetails({
                  ...academicDetails,
                  admissionDate: e.target.value,
                })
              }
            />
          </div>
        </div>

        {/* ── SECTION 3: PARENT & GUARDIAN DETAILS ── */}
        <div className="space-y-6">
          <SectionHeader
            icon={Users}
            title="3. Parent & Guardian Profile"
            subtitle="Enter parental details and emergency contact references."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Father */}
            <div className="bg-gray-50/40 p-6 rounded-3xl border border-gray-100 space-y-4">
              <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest">
                Father's Details
              </h4>
              <Input
                label="Father Name *"
                placeholder="Father's full name"
                value={parentInfo.fatherName}
                onChange={(e) =>
                  setParentInfo({ ...parentInfo, fatherName: e.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Father Mobile"
                  placeholder="10-digit number"
                  value={parentInfo.fatherMobile}
                  onChange={(e) =>
                    setParentInfo({
                      ...parentInfo,
                      fatherMobile: e.target.value.replace(/\D/g, "").slice(0, 15),
                    })
                  }
                />
                <Input
                  label="Father Aadhaar"
                  placeholder="12-digit"
                  value={parentInfo.fatherAadhar}
                  onChange={(e) =>
                    setParentInfo({
                      ...parentInfo,
                      fatherAadhar: e.target.value.replace(/\D/g, "").slice(0, 12),
                    })
                  }
                />
              </div>
              <Input
                label="Occupation"
                placeholder="e.g. Business, Engineer"
                value={parentInfo.fatherOccupation}
                onChange={(e) =>
                  setParentInfo({ ...parentInfo, fatherOccupation: e.target.value })
                }
              />
            </div>

            {/* Mother */}
            <div className="bg-gray-50/40 p-6 rounded-3xl border border-gray-100 space-y-4">
              <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest">
                Mother's Details
              </h4>
              <Input
                label="Mother Name *"
                placeholder="Mother's full name"
                value={parentInfo.motherName}
                onChange={(e) =>
                  setParentInfo({ ...parentInfo, motherName: e.target.value })
                }
              />
              <Input
                label="Occupation"
                placeholder="e.g. Homemaker, Teacher"
                value={parentInfo.motherOccupation}
                onChange={(e) =>
                  setParentInfo({ ...parentInfo, motherOccupation: e.target.value })
                }
              />
            </div>

            {/* Emergency Contact */}
            <div className="bg-gray-50/40 p-6 rounded-3xl border border-gray-100 space-y-4 md:col-span-2">
              <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest">
                Emergency Contact Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Input
                  label="Contact Person Name"
                  placeholder="e.g. Father, Mother or Uncle"
                  value={emergencyContact.contactPerson}
                  onChange={(e) =>
                    setEmergencyContact({
                      ...emergencyContact,
                      contactPerson: e.target.value,
                    })
                  }
                />
                <Input
                  label="Relationship"
                  placeholder="e.g. Father, Mother"
                  value={emergencyContact.relationship}
                  onChange={(e) =>
                    setEmergencyContact({
                      ...emergencyContact,
                      relationship: e.target.value,
                    })
                  }
                />
                <Input
                  label="Emergency Phone *"
                  placeholder="10-digit mobile"
                  value={emergencyContact.phone}
                  onChange={(e) =>
                    setEmergencyContact({
                      ...emergencyContact,
                      phone: e.target.value.replace(/\D/g, "").slice(0, 15),
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 4: ADDRESS DETAILS ── */}
        <div className="space-y-6">
          <SectionHeader
            icon={MapPin}
            title="4. Residential Address"
            subtitle="Enter the primary residence details."
          />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-12">
              <Input
                label="Current Address *"
                placeholder="House no, street, locality..."
                value={address.currentAddress}
                onChange={(e) =>
                  setAddress({ ...address, currentAddress: e.target.value })
                }
              />
            </div>
            <div className="md:col-span-3">
              <Input
                label="City / Village"
                placeholder="City/Village"
                value={address.city}
                onChange={(e) =>
                  setAddress({ ...address, city: e.target.value })
                }
              />
            </div>
            <div className="md:col-span-3">
              <Input
                label="District"
                placeholder="District"
                value={address.district}
                onChange={(e) =>
                  setAddress({ ...address, district: e.target.value })
                }
              />
            </div>
            <div className="md:col-span-3">
              <Input
                label="State"
                placeholder="State"
                value={address.state}
                onChange={(e) =>
                  setAddress({ ...address, state: e.target.value })
                }
              />
            </div>
            <div className="md:col-span-3">
              <Input
                label="PIN Code"
                placeholder="6-digit PIN"
                value={address.pinCode}
                onChange={(e) =>
                  setAddress({
                    ...address,
                    pinCode: e.target.value.replace(/\D/g, "").slice(0, 6),
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* ── SECTION 5: TRANSPORT & LOGISTICS ── */}
        <div className="space-y-6">
          <SectionHeader
            icon={Truck}
            title="5. Transport Details"
            subtitle="Configure school bus requirements."
          />
          <div className="bg-gray-50/40 p-6 rounded-3xl border border-gray-150 space-y-6">
            <div className="flex items-center gap-3">
              <input
                id="bus-required"
                type="checkbox"
                checked={transport.busRequired}
                onChange={(e) =>
                  setTransport({ ...transport, busRequired: e.target.checked })
                }
                className="w-5 h-5 accent-indigo-650 rounded cursor-pointer"
              />
              <label
                htmlFor="bus-required"
                className="text-sm font-semibold text-gray-700 cursor-pointer select-none"
              >
                School Bus Facility Required
              </label>
            </div>

            {transport.busRequired && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-fadeIn">
                <Input
                  label="Bus Route"
                  placeholder="e.g. Route A, Main Highway"
                  value={transport.route}
                  onChange={(e) =>
                    setTransport({ ...transport, route: e.target.value })
                  }
                />
                <Input
                  label="Pickup Point"
                  placeholder="e.g. Crossing, Gate 1"
                  value={transport.pickupPoint}
                  onChange={(e) =>
                    setTransport({ ...transport, pickupPoint: e.target.value })
                  }
                />
                <Input
                  label="Monthly Transport Fee (₹)"
                  type="number"
                  placeholder="0"
                  value={transport.transportFee || ""}
                  onChange={(e) =>
                    setTransport({
                      ...transport,
                      transportFee: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* ── SECTION 6: DOCUMENTS ATTACHMENT ── */}
        <div className="space-y-6">
          <SectionHeader
            icon={UploadCloud}
            title="6. Document Uploads"
            subtitle="Attach copy of official documents (PDF, JPG, PNG - Max 5MB each)."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { label: "Birth Certificate", key: "birthCertificate" },
              { label: "Transfer Certificate (TC)", key: "transferCertificate" },
              { label: "Previous Marksheet", key: "previousMarksheet" },
              { label: "Aadhaar Card", key: "aadharCard" },
              { label: "Other Documents", key: "otherDocuments" },
            ].map(({ label, key }) => (
              <div
                key={key}
                className="bg-gray-50/40 p-6 rounded-3xl border border-gray-100 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <span className="block text-xs font-black text-gray-400 uppercase tracking-widest">
                    {label}
                  </span>
                  {files[key] ? (
                    <div className="mt-2 flex items-center justify-between bg-white border border-emerald-100 rounded-xl p-3">
                      <span className="text-xs font-semibold text-emerald-600 truncate max-w-[150px]">
                        {files[key].name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeDoc(key)}
                        className="text-rose-600 hover:text-rose-800 transition-colors p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 font-semibold mt-1">
                      No file attached
                    </p>
                  )}
                </div>
                <div className="pt-2">
                  <label className="inline-flex items-center justify-center w-full h-10 px-4 text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/50 rounded-xl cursor-pointer transition-colors border border-indigo-100/50">
                    Choose File
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => handleDocFileChange(e, key)}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION 7: FEES & DISCOUNTS ── */}
        <div className="space-y-6">
          <SectionHeader
            icon={GraduationCap}
            title="7. Fee & Discount Settings"
            subtitle="Configure fee ledger adjustments."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50/40 p-6 rounded-3xl border border-gray-100">
            <Input
              label="Fee Discount (%)"
              type="number"
              min="0"
              max="100"
              placeholder="0"
              value={discountPercentage || ""}
              onChange={(e) => {
                const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                setDiscountPercentage(val);
              }}
            />
          </div>
        </div>

        {/* Form Action Buttons */}
        <div className="flex justify-between items-center border-t border-gray-50 pt-8 mt-8">
          <Button
            variant="secondary"
            className="h-12 rounded-xl text-xs font-black uppercase tracking-widest border border-gray-200"
            onClick={() => navigate("/admissions/requests")}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            className="h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
            onClick={handleSubmitAdmission}
            loading={loading}
          >
            <CheckCircle size={16} /> Save &amp; Admit Student
          </Button>
        </div>

      </div>
    </div>
  );
};

export default AdmissionDirectForm;
