import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  FileText,
} from "lucide-react";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import api from "../../services/api";
import { useToast } from "../../context/ToastContext";
import Button from "../../components/ui/Button";
import { cn } from "../../utils/cn";
import schoolLogoImg from "../../assets/schoollogo.png";

// ─── Constants ─────────────────────────────────────────────────────────
const SCHOOL_NAME = "LITTLE FLOWER";
const SCHOOL_SUBTITLE = "ENGLISH SCHOOL";
const SCHOOL_LOCATION = "DINDAYALPUR (SIWAN)";
const SCHOOL_PHONE = "9123456789";
const SCHOOL_ADDRESS = "Vill. Dindayalpur, P.O. Dindayalpur,\nSiwan, Bihar - 841226";
const SCHOOL_WEBSITE = "www.lfes.in/erp";

// ─── Fonts Injection ───────────────────────────────────────────────────
export const injectFonts = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Poppins:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');
    
    .id-card-container {
      font-family: 'Poppins', sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    
    .photo-blob {
      border-radius: 41% 59% 46% 54% / 41% 47% 53% 59%;
    }
    .bg-blob-1 {
      border-radius: 54% 46% 38% 62% / 46% 54% 60% 40%;
    }
    .bg-blob-2 {
      border-radius: 35% 65% 57% 43% / 51% 37% 63% 49%;
    }
  `}</style>
);

// ─── Dot Grid SVG Component ────────────────────────────────────────────
export const DotsGrid = ({ color = "#888", opacity = 0.5, rows = 3, cols = 4, className, style }) => (
  <svg style={style} className={className} width={cols * 10} height={rows * 10} viewBox={`0 0 ${cols * 10} ${rows * 10}`}>
    {Array.from({ length: rows }).map((_, r) =>
      Array.from({ length: cols }).map((_, c) => (
        <circle key={`${r}-${c}`} cx={5 + c * 10} cy={5 + r * 10} r="1.5" fill={color} opacity={opacity} />
      ))
    )}
  </svg>
);

// ─── Front Card ────────────────────────────────────────────────────────
export const IDCardFront = ({ student, photoUrl, logoUrl, id = "idcard-front" }) => {
  const { personalDetails, academicDetails, contactDetails } = student;

  return (
    <div
      id={id}
      className="id-card-container bg-white relative overflow-hidden flex flex-col shadow-2xl"
      style={{
        width: "350px",
        height: "540px",
        borderRadius: "20px",
        boxSizing: "border-box"
      }}
    >
      {/* ── Background Decors ── */}
      {/* Top Left Blobs */}
      <svg style={{ position: "absolute", top: -20, left: -20, zIndex: 1 }} width="160" height="180" viewBox="0 0 160 180" fill="none">
        <path d="M0,0 L160,0 C140,80 80,120 0,180 Z" fill="#EEF2F8" opacity="0.8" />
        <path d="M0,0 L120,0 C110,60 50,80 0,140 Z" fill="#0D2D63" />
        <path d="M0,60 C40,50 80,10 90,0" stroke="#D9A441" strokeWidth="2" fill="none" opacity="0.8" />
      </svg>

      {/* Top Right Gold Wave & Light Blob */}
      <svg style={{ position: "absolute", top: -10, right: -10, zIndex: 1 }} width="120" height="120" viewBox="0 0 120 120" fill="none">
        <path d="M120,0 L120,100 C70,110 30,70 0,0 Z" fill="#EEF2F8" opacity="0.6" />
        <path d="M120,30 C80,40 50,0 40,-10" stroke="#D9A441" strokeWidth="1.5" fill="none" opacity="0.6" />
      </svg>
      <DotsGrid style={{ position: "absolute", top: 80, right: 20, zIndex: 1 }} rows={3} cols={4} color="#0D2D63" opacity="0.4" />

      {/* Bottom Left Decors */}
      <svg style={{ position: "absolute", bottom: -20, left: -20, zIndex: 1 }} width="130" height="130" viewBox="0 0 130 130" fill="none">
        <path d="M0,130 L130,130 C110,70 60,30 0,0 Z" fill="#EEF2F8" opacity="0.8" />
      </svg>
      <DotsGrid style={{ position: "absolute", bottom: 20, left: 20, zIndex: 1 }} rows={4} cols={3} color="#0D2D63" opacity="0.4" />

      {/* Bottom Right Navy/Gold Wave */}
      <svg style={{ position: "absolute", bottom: -10, right: -10, zIndex: 1 }} width="150" height="130" viewBox="0 0 150 130" fill="none">
        <path d="M150,130 L0,130 C20,90 80,60 150,0 Z" fill="#0D2D63" />
        <path d="M150,40 C100,70 50,110 -10,130" stroke="#D9A441" strokeWidth="2" fill="none" opacity="0.8" />
      </svg>

      {/* ── Header Area ── */}
      <div style={{ position: "relative", zIndex: 2, padding: "28px 24px 0 24px", display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Logo Circle */}
        <div style={{
          width: "58px", height: "58px", borderRadius: "50%",
          background: "#fff", border: "2px solid #0D2D63",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", flexShrink: 0,
          boxShadow: "0 0 0 1.5px #D9A441, 0 4px 10px rgba(0,0,0,0.1)"
        }}>
          {logoUrl || schoolLogoImg ? (
            <img src={logoUrl || schoolLogoImg} alt="Logo" style={{ width: "85%", height: "85%", objectFit: "contain" }} crossOrigin="anonymous" />
          ) : (
            <div style={{ fontSize: "10px", fontWeight: 800, color: "#0D2D63", textAlign: "center", lineHeight: 1.1 }}>LF<br/>ES</div>
          )}
        </div>
        {/* Header Text */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#0D2D63", letterSpacing: "0.5px", lineHeight: 1.1 }}>
            {SCHOOL_NAME}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
            <span style={{ flex: 1, height: "1.5px", background: "#D9A441" }} />
            <span style={{ fontSize: "9px", fontWeight: 700, color: "#0D2D63", letterSpacing: "2.5px" }}>{SCHOOL_SUBTITLE}</span>
            <span style={{ flex: 1, height: "1.5px", background: "#D9A441" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "5px", alignSelf: "center" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#D9A441"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            <span style={{ fontSize: "9px", color: "#0D2D63", fontWeight: 700, letterSpacing: "0.5px" }}>{SCHOOL_LOCATION}</span>
          </div>
        </div>
      </div>

      {/* ── Photo Section ── */}
      <div style={{ position: "relative", zIndex: 2, height: "200px", marginTop: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        
        {/* Abstract shapes behind photo */}
        <div className="bg-blob-1" style={{ position: "absolute", width: "260px", height: "230px", background: "#EEF2F8", zIndex: 0, opacity: 0.7, top: -10, left: 40 }} />
        <div className="bg-blob-2" style={{ position: "absolute", width: "100px", height: "120px", background: "#D9A441", zIndex: 0, bottom: -10, right: 30, opacity: 0.8 }} />
        
        {/* Striped circle */}
        <svg style={{ position: "absolute", bottom: 10, left: 30, zIndex: 0 }} width="70" height="70" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="url(#stripes-front)" />
          <defs>
            <pattern id="stripes-front" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#0D2D63" strokeWidth="2.5" opacity="0.3"/>
            </pattern>
          </defs>
        </svg>

        {/* The Photo Blob */}
        <div className="photo-blob" style={{ 
          position: "relative", zIndex: 2, width: "175px", height: "185px", 
          background: "#E2F0F9", overflow: "hidden",
          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          {photoUrl ? (
            <img src={photoUrl} alt="Student" style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
          ) : (
            <div style={{ fontSize: "52px", fontWeight: 900, color: "#143B73", letterSpacing: "2px" }}>
              {(personalDetails?.name || "?").split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* ── Student Name ── */}
      <div style={{ zIndex: 2, textAlign: "center", marginTop: "12px", padding: "0 20px" }}>
        <div style={{ fontSize: "24px", fontWeight: 800, color: "#0D2D63", letterSpacing: "1px", textTransform: "uppercase", lineHeight: 1.1 }}>
          {personalDetails?.name}
        </div>
        <div style={{ width: "40px", height: "3px", background: "#D9A441", margin: "6px auto 0", borderRadius: "2px" }} />
      </div>

      {/* ── Info Grid ── */}
      <div style={{ zIndex: 2, padding: "16px 36px 0 36px", flex: 1 }}>
        {[
          { label: "Class", value: `${academicDetails?.className || ""}${academicDetails?.section ? ` (${academicDetails.section})` : ""}` },
          { label: "Father's Name", value: contactDetails?.parentName || "N/A" },
          { label: "Phone No.", value: contactDetails?.parentMobile || contactDetails?.phone || "N/A" },
          { label: "Address", value: contactDetails?.address || SCHOOL_ADDRESS },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: "flex", gap: "10px", marginBottom: "8px", alignItems: "flex-start" }}>
            <div style={{ width: "3px", height: "14px", background: "#D9A441", flexShrink: 0, marginTop: "3px" }} />
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#0D2D63", width: "85px", flexShrink: 0 }}>{label}</div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#0D2D63", lineHeight: 1.3, flex: 1 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Principal Signature ── */}
      <div style={{ zIndex: 2, padding: "0 36px 16px 36px", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <div style={{ fontFamily: "'Dancing Script', 'Georgia', cursive", fontSize: "28px", color: "#0D2D63", marginBottom: "-6px", paddingLeft: "10px" }}>
          Pannul
        </div>
        <div style={{ borderTop: "1px solid #0D2D63", paddingTop: "4px", width: "120px", display: "flex", justifyContent: "center" }}>
          <span style={{ fontSize: "9px", color: "#0D2D63", fontWeight: 700 }}>Principal Signature</span>
        </div>
      </div>
    </div>
  );
};

// ─── Back Card ─────────────────────────────────────────────────────────
export const IDCardBack = ({ student, qrUrl, id = "idcard-back" }) => {
  const { personalDetails, contactDetails } = student;

  return (
    <div
      id={id}
      className="id-card-container bg-white relative overflow-hidden flex flex-col shadow-2xl items-center"
      style={{
        width: "350px",
        height: "540px",
        borderRadius: "20px",
        boxSizing: "border-box"
      }}
    >
      {/* ── Background Decors ── */}
      <svg style={{ position: "absolute", top: -20, left: -20, zIndex: 1 }} width="160" height="160" viewBox="0 0 160 160" fill="none">
        <path d="M0,0 L160,0 C120,60 80,80 0,160 Z" fill="#0D2D63" />
        <path d="M0,60 C40,40 80,10 90,-10" stroke="#D9A441" strokeWidth="2" fill="none" opacity="0.8" />
      </svg>

      <svg style={{ position: "absolute", top: -10, right: -10, zIndex: 1 }} width="130" height="130" viewBox="0 0 130 130" fill="none">
        <path d="M130,0 L130,120 C80,100 40,70 0,0 Z" fill="#F7F2EA" />
      </svg>
      <DotsGrid style={{ position: "absolute", top: 20, right: 20, zIndex: 1 }} rows={3} cols={3} color="#0D2D63" opacity="0.5" />

      <svg style={{ position: "absolute", bottom: -20, right: -20, zIndex: 1 }} width="180" height="160" viewBox="0 0 180 160" fill="none">
        <path d="M180,160 L0,160 C40,90 90,60 180,0 Z" fill="#0D2D63" />
        <path d="M180,30 C120,60 60,110 -10,130" stroke="#D9A441" strokeWidth="1.5" fill="none" opacity="0.8" />
      </svg>

      <svg style={{ position: "absolute", bottom: -10, left: -10, zIndex: 1 }} width="120" height="120" viewBox="0 0 120 120" fill="none">
        <path d="M0,120 L120,120 C100,70 60,30 0,0 Z" fill="#F7F2EA" />
      </svg>
      <DotsGrid style={{ position: "absolute", bottom: 20, left: 20, zIndex: 1 }} rows={3} cols={3} color="#0D2D63" opacity="0.5" />

      {/* ── IF FOUND Header ── */}
      <div style={{ position: "relative", zIndex: 2, textAlign: "center", marginTop: "24px", width: "100%", padding: "0 24px" }}>
        <div style={{
          width: "48px", height: "48px", borderRadius: "50%",
          border: "2px solid #D9A441", display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px", background: "#fff"
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#D9A441">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
        </div>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "#0D2D63", letterSpacing: "1px" }}>
          IF FOUND, PLEASE CONTACT
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", margin: "6px 0 10px" }}>
          <div style={{ width: "35px", height: "1.5px", background: "#D9A441", opacity: 0.5 }} />
          <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#D9A441" }} />
          <div style={{ width: "35px", height: "1.5px", background: "#D9A441", opacity: 0.5 }} />
        </div>
      </div>

      {/* ── Contact Details ── */}
      <div style={{ position: "relative", zIndex: 2, width: "100%", padding: "0 40px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {[
          { icon: "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z", text: SCHOOL_PHONE, sub: "(School Office)" },
          { icon: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z", text: SCHOOL_ADDRESS, sub: null },
          { icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z", text: SCHOOL_WEBSITE, sub: "(School ERP)" },
        ].map(({ icon, text, sub }, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "50%",
              border: "1.5px solid #0D2D63", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#0D2D63"><path d={icon}/></svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#0D2D63", lineHeight: 1.4 }}>{text}</div>
              {sub && <div style={{ fontSize: "10px", color: "#666", fontWeight: 500 }}>{sub}</div>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 2, width: "65%", borderTop: "2px dotted #D9A441", margin: "14px 0", opacity: 0.6 }} />

      {/* ── QR Section ── */}
      <div style={{ position: "relative", zIndex: 2, textAlign: "center", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{
          border: "2px solid #D9A441", borderRadius: "12px", padding: "6px",
          background: "#fff", display: "inline-block",
          boxShadow: "0 4px 14px rgba(217, 164, 65, 0.15)"
        }}>
          <img src={qrUrl} alt="QR Code" style={{ width: "85px", height: "85px", display: "block" }} crossOrigin="anonymous"/>
        </div>
        <div style={{ fontSize: "10px", color: "#0D2D63", fontWeight: 600, letterSpacing: "0.5px", marginTop: "6px" }}>SCAN TO VIEW</div>
        <div style={{ fontSize: "14px", fontWeight: 800, color: "#0D2D63", letterSpacing: "0.5px" }}>STUDENT PROFILE</div>
        <div style={{ fontSize: "10px", color: "#666", fontWeight: 500 }}>(School ERP)</div>
      </div>

      <div style={{ position: "relative", zIndex: 2, width: "65%", borderTop: "2px dotted #D9A441", margin: "10px 0", opacity: 0.6 }} />

      {/* ── Emergency Contact ── */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: "10px", padding: "0 24px" }}>
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="#0D2D63"/>
          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="#D9A441"/>
        </svg>
        <div>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#D9A441", letterSpacing: "0.5px" }}>EMERGENCY CONTACT</div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#0D2D63" }}>+91 {contactDetails?.parentMobile || contactDetails?.phone || SCHOOL_PHONE}</div>
        </div>
      </div>

      {/* ── Principal ── */}
      <div style={{ position: "relative", zIndex: 2, textAlign: "center", marginTop: "auto", marginBottom: "16px" }}>
        <div style={{ fontFamily: "'Dancing Script', 'Georgia', cursive", fontSize: "28px", color: "#0D2D63", marginBottom: "-4px" }}>Binnul</div>
        <div style={{ borderTop: "1px solid #0D2D63", paddingTop: "2px", width: "120px", display: "flex", justifyContent: "center", margin: "0 auto" }}>
          <span style={{ fontSize: "10px", color: "#0D2D63", fontWeight: 700 }}>Principal</span>
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
  const apiHost = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : "";

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await api.get(`/students/${studentId}/profile`);
        if (res.data.success) {
          const st = res.data.data;
          setStudent(st);

          // Resolve photo URL
          const pUrl = st.personalDetails?.studentPhoto;
          if (pUrl) {
            setPhotoUrl(pUrl.startsWith("http") || pUrl.startsWith("data:") ? pUrl : `${apiHost}${pUrl}`);
          }
          
          // Generate dynamic QR code with plain text details (No URL link)
          const qrPayload = `Name: ${st.personalDetails?.name || 'N/A'}\nID: ${st.personalDetails?.studentId || 'N/A'}\nClass: ${st.academicDetails?.className || ""}${st.academicDetails?.section ? ` (${st.academicDetails.section})` : ""}\nPhone: ${st.contactDetails?.parentMobile || st.contactDetails?.phone || "N/A"}\nSchool: Little Flower English School`;
          setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrPayload)}`);
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
      
      const options = { scale: 3, useCORS: true, backgroundColor: null, logging: false };
      
      const frontCanvas = await html2canvas(frontEl, options);
      
      // Switch to back to capture
      setActiveTab("back");
      // Small timeout to allow render
      await new Promise(r => setTimeout(r, 100));
      const backCanvas = await html2canvas(document.getElementById("idcard-back"), options);
      
      // Restore tab
      setActiveTab(prevTab);

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      
      const cardW = 54 * 1.3;
      const cardH = 86 * 1.3;

      pdf.addImage(frontCanvas.toDataURL("image/png"), "PNG", 30, 40, cardW, cardH);
      pdf.addImage(backCanvas.toDataURL("image/png"), "PNG", 110, 40, cardW, cardH);
      
      // Add cutting lines
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineDash([2, 2], 0);
      pdf.rect(30, 40, cardW, cardH, "D");
      pdf.rect(110, 40, cardW, cardH, "D");

      pdf.save(`ID-Card-${student.personalDetails?.studentId}.pdf`);
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
            <p className="text-sm text-gray-500">{student.personalDetails?.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("front")}
              className={cn("px-4 py-1.5 rounded-lg text-sm font-bold transition-all", activeTab === "front" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700")}
            >
              Front Side
            </button>
            <button
              onClick={() => setActiveTab("back")}
              className={cn("px-4 py-1.5 rounded-lg text-sm font-bold transition-all", activeTab === "back" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700")}
            >
              Back Side
            </button>
          </div>
          
          <Button variant="outline" onClick={handleExportPDF} className="gap-2">
            <FileText size={16} /> Export PDF
          </Button>
          <Button onClick={handlePrint} className="gap-2 bg-[#0D2D63] hover:bg-[#143B73] text-white">
            <Printer size={16} /> Print Card
          </Button>
        </div>
      </div>

      {/* ── Card Display (Web) ── */}
      <div className="flex justify-center items-center py-10 print:hidden bg-gray-50 rounded-3xl border border-gray-100 shadow-inner">
        {activeTab === "front" ? (
          <IDCardFront student={student} photoUrl={photoUrl} />
        ) : (
          <IDCardBack student={student} qrUrl={qrCodeUrl} />
        )}
      </div>

      {/* ── Print Layout (Hidden on Web) ── */}
      <div className="hidden print:flex flex-row justify-center items-start gap-10 mt-10">
        <IDCardFront student={student} photoUrl={photoUrl} />
        <IDCardBack student={student} qrUrl={qrCodeUrl} />
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
