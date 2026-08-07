import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer, FileText, User, Phone, Droplet, Bus, MapPin } from "lucide-react";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import api from "../../services/api";
import { useToast } from "../../context/ToastContext";
import Button from "../../components/ui/Button";
import { cn } from "../../utils/cn";
import { resolveStudentPhotoUrl } from "../../utils/imageUtils";
import schoolLogoImg from "../../assets/schoollogo.png";

// ─── Constants ─────────────────────────────────────────────────────────
const SCHOOL_NAME = "LITTLE FLOWER";
const SCHOOL_SUBTITLE = "ENGLISH SCHOOL";
const SCHOOL_LOCATION = "DINDAYALPUR (SIWAN)";
const SCHOOL_PHONE = "82946 80282";
const SCHOOL_ADDRESS = "Dindayalpur, Siwan, Bihar - 841506";
const SCHOOL_WEBSITE = "www.lfessiwan.in";
const OFFICIAL_STAMP_IMG = "/assets/official/school-stamp.png";
const PRINCIPAL_SIGNATURE_IMG = "/assets/official/principal-signature.png";

// ─── Fonts Injection ───────────────────────────────────────────────────
export const InjectFonts = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Dancing+Script:wght@700&family=Poppins:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');
    
    .id-card-container {
      font-family: 'Poppins', sans-serif;
      -webkit-font-smoothing: antialiased;
      box-sizing: border-box;
    }
    
    .font-cinzel {
      font-family: 'Cinzel', serif;
    }
  `}</style>
);

export const injectFonts = InjectFonts;

// ─── Dot Grid SVG Component ────────────────────────────────────────────
export const DotsGrid = ({
  color = "#888",
  opacity = 0.5,
  rows = 3,
  cols = 4,
  className,
  style,
}) => (
  <svg
    style={style}
    className={className}
    width={cols * 10}
    height={rows * 10}
    viewBox={`0 0 ${cols * 10} ${rows * 10}`}
  >
    {Array.from({ length: rows }).map((_, r) =>
      Array.from({ length: cols }).map((_, c) => (
        <circle
          key={`${r}-${c}`}
          cx={5 + c * 10}
          cy={5 + r * 10}
          r="1.5"
          fill={color}
          opacity={opacity}
        />
      )),
    )}
  </svg>
);

// ─── Front Card ────────────────────────────────────────────────────────
export const IDCardFront = ({
  student,
  photoUrl,
  logoUrl,
  qrUrl, // Keeping for API compatibility, though moved to back or omitted in new design
  id = "idcard-front",
}) => {
  const {
    personalDetails = {},
    academicDetails = {},
    contactDetails = {},
  } = student || {};

  const studentName =
    personalDetails?.name || personalDetails?.fullName || "ARJUN KUMAR";
  const className = academicDetails?.className || "V";
  const section = academicDetails?.section || "A";
  const rollNumber = personalDetails?.rollNumber || "23";
  const admissionNo =
    personalDetails?.admissionNumber ||
    personalDetails?.studentId ||
    "LFS2025/1023";
  const bloodGroup = contactDetails?.bloodGroup || "O+";
  const phone = contactDetails?.primaryPhone || SCHOOL_PHONE || "N/A";

  let dobFormatted = "15-03-2015";
  if (personalDetails?.dob) {
    try {
      const d = new Date(personalDetails.dob);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        dobFormatted = `${dd}-${mm}-${yyyy}`;
      }
    } catch (e) {}
  }

  return (
    <div
      id={id}
      className="id-card-container relative overflow-hidden flex flex-col shadow-2xl"
      style={{
        width: "350px",
        height: "540px",
        borderRadius: "20px",
        boxSizing: "border-box",
        background: "#F9A41E", // Vibrant orange/yellow
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      {/* ── SVG Waves Background ── */}
      <svg
        width="350"
        height="540"
        viewBox="0 0 350 540"
        preserveAspectRatio="none"
        style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
      >
        {/* Layer 1: Highest curve (backmost visually) */}
        <path
          d="M0,190 C100,100 200,340 350,140 L350,540 L0,540 Z"
          fill="#07515D"
        />
        {/* Layer 2: Middle curve */}
        <path
          d="M0,210 C110,130 220,350 350,160 L350,540 L0,540 Z"
          fill="#06424D"
        />
        {/* Layer 3: Main Dark Navy background curve */}
        <path
          d="M0,230 C130,160 240,360 350,180 L350,540 L0,540 Z"
          fill="#00343E"
        />
        
        {/* Bottom Decorative Curve Layers */}
        <path
          d="M0,510 C120,475 200,565 350,520 L350,540 L0,540 Z"
          fill="#FFC05C"
          opacity="0.4"
        />
        <path
          d="M0,525 C100,495 230,575 350,535 L350,540 L0,540 Z"
          fill="#F9A41E"
        />
      </svg>

      {/* ── Content Wrapper ── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          height: "100%",
          width: "100%",
        }}
      >
        {/* Header / Logo */}
        <div
          style={{
            marginTop: "12px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "70px",
              height: "70px",
              borderRadius: "50%",
              background: "#0D3A4B",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            {logoUrl || schoolLogoImg ? (
              <img
                src={logoUrl || schoolLogoImg}
                alt="Logo"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                crossOrigin="anonymous"
              />
            ) : (
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderTop: "8px solid transparent",
                  borderBottom: "8px solid transparent",
                  borderLeft: "12px solid #F9A41E",
                  marginLeft: "4px",
                }}
              ></div>
            )}
          </div>
          <div
            style={{
              marginTop: "10px",
              fontSize: "24px",
              fontFamily: '"Cinzel", "Playfair Display", "Times New Roman", serif',
              fontWeight: 800,
              color: "#0D3A4B",
              letterSpacing: "0.5px",
              textAlign: "center",
              lineHeight: "1.1",
            }}
          >
            {SCHOOL_NAME || "LITTLE FLOWER"}
          </div>
          <div
            style={{
              fontSize: "12px",
              fontFamily: '"Cinzel", "Playfair Display", "Times New Roman", serif',
              fontWeight: 700,
              color: "#0D3A4B",
              letterSpacing: "1.5px",
              marginTop: "3px",
            }}
          >
            {SCHOOL_SUBTITLE || "ENGLISH SCHOOL"}
          </div>
        </div>

        {/* Profile Photo */}
        <div
          style={{
            marginTop: "8px",
            width: "135px",
            height: "135px",
            borderRadius: "50%",
            border: "4px solid #F9A41E",
            overflow: "hidden",
            background: "#fff",
            boxShadow: "0 6px 15px rgba(0,0,0,0.2)",
            flexShrink: 0,
          }}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Student"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              onError={(e) => {
                if (photoUrl && photoUrl.includes("googleusercontent.com")) {
                  const fileId = photoUrl.split("/").pop();
                  if (fileId) {
                    e.target.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
                  }
                }
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ccc",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              PHOTO
            </div>
          )}
        </div>

        {/* Student Name */}
        <div
          style={{
            marginTop: "10px",
            fontSize: "clamp(18px, 6vw, 25px)",
            fontFamily: '"Poppins", "Inter", sans-serif',
            color: "#F9A41E",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            textAlign: "center",
            padding: "0 15px",
            width: "100%",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {studentName}
        </div>
        
        {/* Class / Section */}
        <div
          style={{
            fontSize: "14px",
            fontFamily: '"Poppins", "Inter", sans-serif',
            color: "#FFFFFF",
            marginTop: "2px",
            fontWeight: 500,
            letterSpacing: "0.6px",
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          CLASS {className} {section ? `- ${section}` : ""}
        </div>

        {/* Yellow Separator Line */}
        <div
          style={{
            width: "60%",
            height: "2px",
            background: "#F9A41E",
            marginTop: "12px",
            marginBottom: "12px",
          }}
        ></div>

        {/* Student Details Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "75px 15px max-content",
            justifyContent: "center",
            width: "100%",
            fontSize: "13.5px",
            fontFamily: '"Poppins", "Inter", sans-serif',
            color: "#F3F4F6",
            rowGap: "7px",
            alignItems: "center",
          }}
        >
          {/* Row 1 */}
          <div style={{ fontWeight: 600 }}>ID NO</div>
          <div style={{ fontWeight: 600, textAlign: "center" }}>:</div>
          <div style={{ fontWeight: 500 }}>{admissionNo}</div>

          {/* Row 2 */}
          <div style={{ fontWeight: 600 }}>Blood</div>
          <div style={{ fontWeight: 600, textAlign: "center" }}>:</div>
          <div style={{ fontWeight: 500 }}>{bloodGroup}</div>

          {/* Row 3 */}
          <div style={{ fontWeight: 600 }}>D.O.B</div>
          <div style={{ fontWeight: 600, textAlign: "center" }}>:</div>
          <div style={{ fontWeight: 500 }}>{dobFormatted}</div>

          {/* Row 4 */}
          <div style={{ fontWeight: 600 }}>Roll No</div>
          <div style={{ fontWeight: 600, textAlign: "center" }}>:</div>
          <div style={{ fontWeight: 500 }}>{rollNumber}</div>

          {/* Row 5 */}
          <div style={{ fontWeight: 600 }}>Phone</div>
          <div style={{ fontWeight: 600, textAlign: "center" }}>:</div>
          <div style={{ fontWeight: 500 }}>{phone}</div>
        </div>
      </div>
    </div>
  );
};

// ─── Back Card ─────────────────────────────────────────────────────────
export const IDCardBack = ({ student, logoUrl, id = "idcard-back" }) => {
  const { personalDetails = {}, contactDetails = {} } = student || {};

  const parentName =
    contactDetails?.parentName || contactDetails?.fatherName || "Pramod Kumar";
  const emergencyPhone =
    contactDetails?.parentMobile ||
    contactDetails?.emergencyContact ||
    contactDetails?.phone ||
    "9594283823";
  const bloodGroup = personalDetails?.bloodGroup || "Unknown";
  const transportMode = personalDetails?.transportMode || "Private";
  const address =
    contactDetails?.address || "Salahpur";

  return (
    <div
      id={id}
      className="id-card-container relative overflow-hidden flex flex-col shadow-2xl"
      style={{
        width: "350px",
        height: "540px",
        borderRadius: "20px",
        boxSizing: "border-box",
        background: "#F9A41E", // Vibrant orange top base
        fontFamily: "'Poppins', 'Inter', sans-serif",
      }}
    >

      {/* ── SVG Waves Background ── */}
      <svg
        width="350"
        height="540"
        viewBox="0 0 350 540"
        preserveAspectRatio="none"
        style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
      >
        {/* Main 3-Layer Waves in Middle */}
        {/* Layer 1: Topmost teal curve */}
        <path
          d="M0,230 C80,180 220,310 350,140 L350,540 L0,540 Z"
          fill="#07515D"
        />
        {/* Layer 2: Middle dark teal curve */}
        <path
          d="M0,248 C90,198 230,328 350,158 L350,540 L0,540 Z"
          fill="#043F48"
        />
        {/* Layer 3: Main Deep Navy background curve */}
        <path
          d="M0,265 C100,215 240,345 350,175 L350,540 L0,540 Z"
          fill="#00343E"
        />

        {/* Bottom Decorative Footer Curve Layers */}
        <path
          d="M0,490 C100,460 250,530 350,480 L350,540 L0,540 Z"
          fill="#3B6353"
          opacity="0.6"
        />
        <path
          d="M0,505 C120,475 230,545 350,495 L350,540 L0,540 Z"
          fill="#F9A41E"
        />
      </svg>

      {/* ── Main Content Area ── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "24px 22px 10px 22px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── SECTION 1: EMERGENCY CONTACT (Orange Area) ── */}
        <div>
          {/* Header */}
          <div style={{ marginBottom: "16px" }}>
            <h2
              style={{
                color: "#00343E",
                fontSize: "16px",
                fontWeight: 800,
                letterSpacing: "0.8px",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              EMERGENCY CONTACT
            </h2>
            {/* Header Line with 3 Dots */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginTop: "4px",
                width: "200px",
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: "1.5px",
                  background: "#00343E",
                  opacity: 0.8,
                }}
              ></div>
              <div style={{ display: "flex", gap: "3px" }}>
                <div
                  style={{
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    background: "#00343E",
                  }}
                ></div>
                <div
                  style={{
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    background: "#00343E",
                  }}
                ></div>
                <div
                  style={{
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    background: "#00343E",
                  }}
                ></div>
              </div>
              <div
                style={{
                  flex: 1,
                  height: "1.5px",
                  background: "#00343E",
                  opacity: 0.8,
                }}
              ></div>
            </div>
          </div>

          {/* Contact Details Rows */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "22px 105px 12px 1fr",
              rowGap: "10px",
              fontSize: "13px",
              color: "#00343E",
              alignItems: "center",
            }}
          >
            {/* Row 1: Guardian */}
            <User size={17} color="#00343E" strokeWidth={2.2} />
            <div style={{ fontWeight: 600 }}>Guardian</div>
            <div style={{ fontWeight: 700 }}>:</div>
            <div style={{ fontWeight: 800 }}>{parentName}</div>

            {/* Row 2: Contact No. */}
            <Phone size={17} color="#00343E" strokeWidth={2.2} />
            <div style={{ fontWeight: 600 }}>Contact No.</div>
            <div style={{ fontWeight: 700 }}>:</div>
            <div style={{ fontWeight: 800 }}>{emergencyPhone}</div>

            {/* Row 3: Blood Group */}
            <Droplet size={17} color="#00343E" strokeWidth={2.2} />
            <div style={{ fontWeight: 600 }}>Blood Group</div>
            <div style={{ fontWeight: 700 }}>:</div>
            <div style={{ fontWeight: 800 }}>{bloodGroup}</div>

            {/* Row 4: Transport */}
            <Bus size={17} color="#00343E" strokeWidth={2.2} />
            <div style={{ fontWeight: 600 }}>Transport</div>
            <div style={{ fontWeight: 700 }}>:</div>
            <div style={{ fontWeight: 800 }}>{transportMode}</div>

            {/* Row 5: Address */}
            <MapPin size={17} color="#00343E" strokeWidth={2.2} />
            <div style={{ fontWeight: 600 }}>Address</div>
            <div style={{ fontWeight: 700 }}>:</div>
            <div style={{ fontWeight: 800, lineHeight: 1.2 }}>{address}</div>
          </div>
        </div>

        {/* ── SECTION 2: IMPORTANT RULES (Dark Teal Area) ── */}
        <div style={{ marginTop: "60px" }}>
          {/* Section Header */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "1.5px",
                  background: "#F9A41E",
                }}
              ></div>
              <span
                style={{
                  color: "#F9A41E",
                  fontSize: "14px",
                  fontWeight: 800,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                }}
              >
                IMPORTANT RULES
              </span>
              <div
                style={{
                  width: "40px",
                  height: "1.5px",
                  background: "#F9A41E",
                }}
              ></div>
            </div>

            {/* 4 Yellow Dots under Important Rules */}
            <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
              <div
                style={{
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  background: "#F9A41E",
                }}
              ></div>
              <div
                style={{
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  background: "#F9A41E",
                }}
              ></div>
              <div
                style={{
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  background: "#F9A41E",
                }}
              ></div>
              <div
                style={{
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  background: "#F9A41E",
                }}
              ></div>
            </div>
          </div>

          {/* Rules List */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              fontSize: "11px",
              color: "#FFFFFF",
              fontWeight: 500,
              lineHeight: 1.45,
              padding: "0 4px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
              <span style={{ color: "#F9A41E", fontSize: "14px", lineHeight: 1 }}>
                •
              </span>
              <span>
                This ID card is the property of {SCHOOL_NAME || "LITTLE FLOWER"}.
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
              <span style={{ color: "#F9A41E", fontSize: "14px", lineHeight: 1 }}>
                •
              </span>
              <span>
                This card is non-transferable and must be worn during school
                hours.
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
              <span style={{ color: "#F9A41E", fontSize: "14px", lineHeight: 1 }}>
                •
              </span>
              <span>
                If found, please return to the school office immediately.
              </span>
            </div>
          </div>
        </div>

        {/* ── SECTION 3: PRINCIPAL SIGNATURE ── */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          <img
            src={PRINCIPAL_SIGNATURE_IMG}
            alt="Principal Signature"
            style={{
              height: "36px",
              maxWidth: "120px",
              objectFit: "contain",
              marginBottom: "3px",
              filter: "brightness(0) invert(1)", // White signature graphic
            }}
            crossOrigin="anonymous"
          />
          <div
            style={{
              borderTop: "1.5px solid #F9A41E",
              width: "140px",
              paddingTop: "4px",
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#F9A41E",
                letterSpacing: "0.5px",
              }}
            >
              Principal
            </span>
          </div>
        </div>

        {/* ── SECTION 4: BOTTOM ADDRESS FOOTER ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            fontSize: "11px",
            color: "#00343E",
            fontWeight: 700,
            letterSpacing: "0.3px",
            marginTop: "auto",
            paddingBottom: "2px",
          }}
        >
          <MapPin size={14} color="#00343E" fill="#00343E" />
          <span>{SCHOOL_ADDRESS}</span>
        </div>
      </div>
    </div>
  );
};
// ─── Main Component ────────────────────────────────────────────────────
const StudentIDCard = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("front");

  const [photoUrl, setPhotoUrl] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);

  // Dynamic host URL resolution for photo serving
  const apiHost = api.defaults.baseURL
    ? api.defaults.baseURL.replace("/api", "")
    : "";

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await api.get(`/students/${studentId}/profile`);
        if (res.data.success) {
          const st = res.data.data;
          setStudent(st);

          // Resolve photo URL
          const pUrl = resolveStudentPhotoUrl(st, apiHost);
          if (pUrl) {
            setPhotoUrl(pUrl);
          }

          // Generate dynamic QR code payload
          const qrPayload = `Name: ${st.personalDetails?.name || st.personalDetails?.fullName || "N/A"}\nID: ${st.personalDetails?.studentId || "N/A"}\nClass: ${st.academicDetails?.className || ""}${st.academicDetails?.section ? ` (${st.academicDetails.section})` : ""}\nPhone: ${st.contactDetails?.parentMobile || st.contactDetails?.phone || "N/A"}\nSchool: Little Flower English School`;
          setQrCodeUrl(
            `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrPayload)}`,
          );
        }
      } catch (error) {
        console.error(error);
        addToast("Failed to load student record", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [studentId, apiHost]);

  const handleExportPDF = async () => {
    if (!student) return;
    try {
      const frontEl = document.getElementById("idcard-front");
      const backEl = document.getElementById("idcard-back");

      // Temporarily render both if hidden
      const prevTab = activeTab;
      if (activeTab === "back") setActiveTab("front");

      const options = {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      };

      const frontCanvas = await html2canvas(frontEl, options);

      // Switch to back to capture
      setActiveTab("back");
      // Small timeout to allow render
      await new Promise((r) => setTimeout(r, 100));
      const backCanvas = await html2canvas(
        document.getElementById("idcard-back"),
        options,
      );

      // Restore tab
      setActiveTab(prevTab);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const cardW = 54 * 1.3;
      const cardH = 86 * 1.3;

      pdf.addImage(
        frontCanvas.toDataURL("image/png"),
        "PNG",
        30,
        40,
        cardW,
        cardH,
      );
      pdf.addImage(
        backCanvas.toDataURL("image/png"),
        "PNG",
        110,
        40,
        cardW,
        cardH,
      );

      // Add cutting lines
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineDash([2, 2], 0);
      pdf.rect(30, 40, cardW, cardH, "D");
      pdf.rect(110, 40, cardW, cardH, "D");

      pdf.save(
        `ID-Card-${student.personalDetails?.studentId || "Student"}.pdf`,
      );
      addToast("ID Card Exported successfully!", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to export PDF", "error");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !student) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 print:bg-white print:m-0 print:p-0 print:block">
      {injectFonts()}

      {/* ── Toolbar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/students")}
            className="p-2 text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Student ID Card</h2>
            <p className="text-sm text-gray-500">
              {student.personalDetails?.name ||
                student.personalDetails?.fullName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("front")}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                activeTab === "front"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              Front Side
            </button>
            <button
              onClick={() => setActiveTab("back")}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                activeTab === "back"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              Back Side
            </button>
          </div>

          <Button variant="outline" onClick={handleExportPDF} className="gap-2">
            <FileText size={16} /> Export PDF
          </Button>
          <Button
            onClick={handlePrint}
            className="gap-2 bg-[#061F42] hover:bg-[#0A2E63] text-white"
          >
            <Printer size={16} /> Print Card
          </Button>
        </div>
      </div>

      {/* ── Card Display (Web Preview) ── */}
      <div className="flex justify-center items-center py-10 print:hidden bg-gray-50 rounded-3xl border border-gray-100 shadow-inner">
        {activeTab === "front" ? (
          <IDCardFront
            student={student}
            photoUrl={photoUrl}
            qrUrl={qrCodeUrl}
          />
        ) : (
          <IDCardBack student={student} />
        )}
      </div>

      {/* ── Print Layout (Hidden on Web) ── */}
      <div className="hidden print:flex flex-row justify-center items-start gap-10 mt-10">
        <IDCardFront student={student} photoUrl={photoUrl} qrUrl={qrCodeUrl} />
        <IDCardBack student={student} />
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          .print\\:flex { display: flex !important; visibility: visible !important; }
          .print\\:flex * { visibility: visible; }
          .print\\:flex { position: absolute; left: 0; top: 0; width: 100%; justify-content: center; padding-top: 2cm; }
          #idcard-front, #idcard-back {
            border: 1px dashed #ccc !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
};

export default StudentIDCard;
