import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  FileText,
  User,
  Phone,
  Droplet,
  Bus,
  MapPin,
  IdCard,
  Calendar,
  Hash,
} from "lucide-react";
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
const SCHOOL_PHONE = "82946 80282";
const SCHOOL_ADDRESS = "DINDAYALPUR, SIWAN, BIHAR – 841506";
const PRINCIPAL_SIGNATURE_IMG = "/assets/official/principal-signature.png";

// ─── Fonts Injection ───────────────────────────────────────────────────
export const InjectFonts = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=Inter:wght@400;500;600;700;800;900&display=swap');
    
    .id-card-container {
      font-family: 'Poppins', 'Inter', sans-serif;
      -webkit-font-smoothing: antialiased;
      box-sizing: border-box;
    }
  `}</style>
);

export const injectFonts = InjectFonts;

// ─── Front Card (Exact Match to User Reference Screenshot) ──────────────
export const IDCardFront = ({
  student,
  photoUrl,
  logoUrl,
  id = "idcard-front",
}) => {
  const {
    personalDetails = {},
    academicDetails = {},
    contactDetails = {},
  } = student || {};

  const studentName =
    personalDetails?.name || personalDetails?.fullName || "ANJALI KUMAR";
  const className = academicDetails?.className || "1";
  const section = academicDetails?.section || "A";
  const rollNumber = personalDetails?.rollNumber || "6";
  const admissionNo =
    personalDetails?.admissionNumber || personalDetails?.studentId || "6";
  const bloodGroup =
    contactDetails?.bloodGroup || personalDetails?.bloodGroup || "Unknown";
  const phone =
    contactDetails?.primaryPhone ||
    contactDetails?.parentMobile ||
    "9594283823";

  let dobFormatted = "24-02-2020";
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
      className="id-card-container relative overflow-hidden flex flex-col bg-white"
      style={{
        width: "350px",
        height: "540px",
        borderRadius: "24px",
        boxSizing: "border-box",
        fontFamily: "'Poppins', 'Inter', sans-serif",
        boxShadow: "0 15px 35px rgba(6, 26, 48, 0.18)",
      }}
    >
      {/* ── Top Section with SVG Graphics ── */}
      <div
        style={{
          position: "relative",
          width: "350px",
          height: "205px",
          flexShrink: 0,
        }}
      >
        <svg
          width="350"
          height="205"
          viewBox="0 0 350 205"
          style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
        >
          <defs>
            {/* Top Left Diagonal Lines Texture */}
            <pattern
              id="diag-lines"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="8"
                stroke="#FFFFFF"
                strokeWidth="0.8"
                opacity="0.12"
              />
            </pattern>
            {/* Right Side Dots Matrix */}
            <pattern
              id="dots-matrix"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="5" cy="5" r="1" fill="#FFFFFF" opacity="0.15" />
            </pattern>
          </defs>

          {/* Deep Navy Main Header #061A30 */}
          <rect width="350" height="205" fill="#061A30" />

          {/* Patterns */}
          <rect width="140" height="120" fill="url(#diag-lines)" />
          <rect
            x="250"
            y="20"
            width="100"
            height="120"
            fill="url(#dots-matrix)"
          />

          {/* Top Right Solid Gold Wedge Accent #F5B51B */}
          <polygon points="270,0 350,0 350,110" fill="#F5B51B" />

          {/* Transition Gold Wave Ribbon */}
          <path
            d="M 0,185 C 90,225 240,150 350,126 L 350,134 C 240,158 90,233 0,193 Z"
            fill="#F5B51B"
          />

          {/* White Bottom Body Transition Cutout */}
          <path
            d="M 0,189 C 90,229 240,154 350,130 L 350,205 L 0,205 Z"
            fill="#FFFFFF"
          />
        </svg>

        {/* ── Top Content ── */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: "8px",
          }}
        >
          {/* Top Lanyard Slot Punch Cutout */}
          <div
            style={{
              width: "60px",
              height: "12px",
              borderRadius: "6px",
              background: "#FFFFFF",
              border: "1px solid #CBD5E1",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.18)",
              marginBottom: "8px",
            }}
          ></div>

          {/* Centered Circular School Logo */}
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "#FFFFFF",
              border: "2.5px solid #F5B51B",
              boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            <img
              src={logoUrl || schoolLogoImg}
              alt="School Logo"
              style={{ width: "90%", height: "90%", objectFit: "contain" }}
              crossOrigin="anonymous"
            />
          </div>

          {/* School Name */}
          <h1
            style={{
              margin: "6px 0 0 0",
              fontSize: "21px",
              fontWeight: 900,
              color: "#FFFFFF",
              letterSpacing: "1.5px",
              textAlign: "center",
              lineHeight: 1.1,
              textTransform: "uppercase",
            }}
          >
            {SCHOOL_NAME}
          </h1>

          {/* Subtitle with Gold Lines & End Dots */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "5px",
              marginTop: "3px",
            }}
          >
            <div
              style={{ width: "22px", height: "1.5px", background: "#F5B51B" }}
            ></div>
            <div
              style={{
                width: "3.5px",
                height: "3.5px",
                borderRadius: "50%",
                background: "#F5B51B",
              }}
            ></div>
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                color: "#F5B51B",
                letterSpacing: "2.5px",
                textTransform: "uppercase",
              }}
            >
              {SCHOOL_SUBTITLE}
            </span>
            <div
              style={{
                width: "3.5px",
                height: "3.5px",
                borderRadius: "50%",
                background: "#F5B51B",
              }}
            ></div>
            <div
              style={{ width: "22px", height: "1.5px", background: "#F5B51B" }}
            ></div>
          </div>
        </div>
      </div>

      {/* ── Student Photo (Centered Double-Ring Circular Frame) ── */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          marginTop: "-62px",
          display: "flex",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            width: "128px",
            height: "128px",
            borderRadius: "50%",
            padding: "4px",
            background: "#F5B51B", // Outer Gold Ring
            boxShadow: "0 8px 25px rgba(6, 26, 48, 0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              border: "3px solid #FFFFFF", // Inner White Ring
              overflow: "hidden",
              background: "#F8FAFC",
            }}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={studentName}
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
                  color: "#94A3B8",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                PHOTO
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Student Name & Class Pill Badge ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: "6px",
          padding: "0 16px",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "22px",
            fontWeight: 900,
            color: "#061A30",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            textAlign: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
          }}
        >
          {studentName}
        </h2>

        {/* Decorative Gold Separator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            margin: "2px 0 3px 0",
          }}
        >
          <div
            style={{ width: "12px", height: "1px", background: "#F5B51B" }}
          ></div>
          <div
            style={{
              width: "3px",
              height: "3px",
              borderRadius: "50%",
              background: "#F5B51B",
            }}
          ></div>
          <div
            style={{ width: "12px", height: "1px", background: "#F5B51B" }}
          ></div>
        </div>

        {/* Navy Pill Badge with Gold Outline & End Dots */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            background: "#061A30",
            border: "1.5px solid #F5B51B",
            color: "#FFFFFF",
            padding: "3.5px 16px",
            borderRadius: "9999px",
            fontSize: "11.5px",
            fontWeight: 800,
            letterSpacing: "1px",
            textTransform: "uppercase",
            boxShadow: "0 2px 6px rgba(6, 26, 48, 0.15)",
          }}
        >
          <div
            style={{
              width: "3.5px",
              height: "3.5px",
              borderRadius: "50%",
              background: "#F5B51B",
            }}
          ></div>
          <span>
            CLASS {className} - {section}
          </span>
          <div
            style={{
              width: "3.5px",
              height: "3.5px",
              borderRadius: "50%",
              background: "#F5B51B",
            }}
          ></div>
        </div>
      </div>

      {/* ── Student Information Rows (Clean Minimal 2-Column Key-Value) ── */}
      <div
        style={{
          margin: "10px 24px 0 24px",
          display: "flex",
          flexDirection: "column",
          gap: "5.5px",
        }}
      >
        {/* Row 1: ID NO */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "26px 115px 14px 1fr",
            alignItems: "center",
            paddingBottom: "4px",
            borderBottom: "1px solid #F1F5F9",
          }}
        >
          <div
            style={{
              width: "22px",
              height: "22px",
              borderRadius: "50%",
              background: "#061A30",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IdCard size={11.5} strokeWidth={2.5} />
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "#061A30",
              letterSpacing: "0.5px",
            }}
          >
            ID NO
          </span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 800,
              color: "#061A30",
              textAlign: "center",
            }}
          >
            :
          </span>
          <span
            style={{ fontSize: "12.5px", fontWeight: 800, color: "#061A30" }}
          >
            {admissionNo}
          </span>
        </div>

        {/* Row 2: BLOOD GROUP */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "26px 115px 14px 1fr",
            alignItems: "center",
            paddingBottom: "4px",
            borderBottom: "1px solid #F1F5F9",
          }}
        >
          <div
            style={{
              width: "22px",
              height: "22px",
              borderRadius: "50%",
              background: "#061A30",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Droplet size={11.5} strokeWidth={2.5} />
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "#061A30",
              letterSpacing: "0.5px",
            }}
          >
            BLOOD GROUP
          </span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 800,
              color: "#061A30",
              textAlign: "center",
            }}
          >
            :
          </span>
          <span
            style={{ fontSize: "12.5px", fontWeight: 800, color: "#061A30" }}
          >
            {bloodGroup}
          </span>
        </div>

        {/* Row 3: D.O.B */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "26px 115px 14px 1fr",
            alignItems: "center",
            paddingBottom: "4px",
            borderBottom: "1px solid #F1F5F9",
          }}
        >
          <div
            style={{
              width: "22px",
              height: "22px",
              borderRadius: "50%",
              background: "#061A30",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Calendar size={11.5} strokeWidth={2.5} />
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "#061A30",
              letterSpacing: "0.5px",
            }}
          >
            D.O.B
          </span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 800,
              color: "#061A30",
              textAlign: "center",
            }}
          >
            :
          </span>
          <span
            style={{ fontSize: "12.5px", fontWeight: 800, color: "#061A30" }}
          >
            {dobFormatted}
          </span>
        </div>

        {/* Row 4: ROLL NO */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "26px 115px 14px 1fr",
            alignItems: "center",
            paddingBottom: "4px",
            borderBottom: "1px solid #F1F5F9",
          }}
        >
          <div
            style={{
              width: "22px",
              height: "22px",
              borderRadius: "50%",
              background: "#061A30",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Hash size={11.5} strokeWidth={2.5} />
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "#061A30",
              letterSpacing: "0.5px",
            }}
          >
            ROLL NO
          </span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 800,
              color: "#061A30",
              textAlign: "center",
            }}
          >
            :
          </span>
          <span
            style={{ fontSize: "12.5px", fontWeight: 800, color: "#061A30" }}
          >
            {rollNumber}
          </span>
        </div>

        {/* Row 5: PHONE */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "26px 115px 14px 1fr",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "22px",
              height: "22px",
              borderRadius: "50%",
              background: "#061A30",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Phone size={11.5} strokeWidth={2.5} />
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "#061A30",
              letterSpacing: "0.5px",
            }}
          >
            PHONE
          </span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 800,
              color: "#061A30",
              textAlign: "center",
            }}
          >
            :
          </span>
          <span
            style={{ fontSize: "12.5px", fontWeight: 800, color: "#061A30" }}
          >
            {phone}
          </span>
        </div>
      </div>

      {/* ── Bottom Section (Navy Footer with Gold Icons & Address) ── */}
      <div
        style={{
          marginTop: "auto",
          position: "relative",
          width: "350px",
          height: "58px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="350"
          height="48"
          viewBox="0 0 350 48"
          style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
        >
          {/* Gold Curved Wave Line Accent #F5B51B */}
          <path d="M0,12 C120,-6 230,20 350,6 L350,48 L0,48 Z" fill="#F5B51B" />
          {/* Deep Navy Footer Base #061A30 */}
          <path
            d="M0,16 C130,-2 240,24 350,10 L350,48 L0,48 Z"
            fill="#061A30"
          />
        </svg>

        {/* Footer Text & Icons */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            color: "#FFFFFF",
            fontSize: "9px",
            fontWeight: 800,
            letterSpacing: "0.4px",
            paddingTop: "6px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <MapPin size={11} color="#F5B51B" fill="#F5B51B" />
            <span>{SCHOOL_ADDRESS}</span>
          </div>
          <span style={{ color: "#F5B51B", fontWeight: 900 }}>|</span>
          <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <Phone size={11} color="#F5B51B" fill="#F5B51B" />
            <span>PH: {SCHOOL_PHONE}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Back Card (Matching Reference Theme) ──────────────────────────────
export const IDCardBack = ({ student, logoUrl, id = "idcard-back" }) => {
  const { personalDetails = {}, contactDetails = {} } = student || {};

  const parentName =
    contactDetails?.parentName || contactDetails?.fatherName || "Pramod Kumar";
  const emergencyPhone =
    contactDetails?.parentMobile ||
    contactDetails?.emergencyContact ||
    contactDetails?.phone ||
    SCHOOL_PHONE;
  const bloodGroup =
    contactDetails?.bloodGroup || personalDetails?.bloodGroup || "Unknown";
  const transportMode = personalDetails?.transportMode || "School Bus";
  const address = contactDetails?.address || "Dindayalpur, Siwan";

  return (
    <div
      id={id}
      className="id-card-container relative overflow-hidden flex flex-col bg-white"
      style={{
        width: "350px",
        height: "540px",
        borderRadius: "24px",
        boxSizing: "border-box",
        fontFamily: "'Poppins', 'Inter', sans-serif",
        boxShadow: "0 15px 35px rgba(6, 26, 48, 0.18)",
      }}
    >
      {/* ── Top Navy Header ── */}
      <div
        style={{
          position: "relative",
          width: "350px",
          height: "105px",
          flexShrink: 0,
        }}
      >
        <svg
          width="350"
          height="105"
          viewBox="0 0 350 105"
          style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
        >
          <path d="M0,0 L350,0 L350,80 C240,110 110,65 0,95 Z" fill="#061A30" />
          <polygon points="270,0 350,0 350,80" fill="#F5B51B" />
          <path
            d="M0,93 C110,63 240,108 350,78 L350,84 C240,114 110,69 0,99 Z"
            fill="#F5B51B"
          />
        </svg>

        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "16px 20px 0 20px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "#FFFFFF",
              border: "2px solid #F5B51B",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <img
              src={logoUrl || schoolLogoImg}
              alt="Logo"
              style={{ width: "88%", height: "88%", objectFit: "contain" }}
              crossOrigin="anonymous"
            />
          </div>

          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "15px",
                fontWeight: 900,
                color: "#FFFFFF",
                letterSpacing: "0.8px",
                textTransform: "uppercase",
              }}
            >
              {SCHOOL_NAME}
            </h1>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#F5B51B",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
              }}
            >
              STUDENT INFORMATION
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div
        style={{
          padding: "12px 18px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          flex: 1,
        }}
      >
        {/* Section 1: Emergency Contact Box */}
        <div>
          <h3
            style={{
              margin: "0 0 6px 0",
              fontSize: "12px",
              fontWeight: 800,
              color: "#061A30",
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                width: "4px",
                height: "14px",
                background: "#F5B51B",
                borderRadius: "2px",
              }}
            ></span>
            EMERGENCY CONTACT DETAILS
          </h3>

          <div
            style={{
              background: "#F8FAFC",
              borderRadius: "14px",
              border: "1px solid #E2E8F0",
              padding: "8px 12px",
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
          >
            {/* Guardian */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "24px 105px 14px 1fr",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#061A30",
                  color: "#FFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <User size={11} />
              </div>
              <span
                style={{ fontSize: "11px", fontWeight: 700, color: "#061A30" }}
              >
                Guardian
              </span>
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 800,
                  color: "#061A30",
                  textAlign: "center",
                }}
              >
                :
              </span>
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 800,
                  color: "#061A30",
                }}
              >
                {parentName}
              </span>
            </div>

            {/* Contact No */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "24px 105px 14px 1fr",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#061A30",
                  color: "#FFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Phone size={11} />
              </div>
              <span
                style={{ fontSize: "11px", fontWeight: 700, color: "#061A30" }}
              >
                Contact No.
              </span>
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 800,
                  color: "#061A30",
                  textAlign: "center",
                }}
              >
                :
              </span>
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 800,
                  color: "#061A30",
                }}
              >
                {emergencyPhone}
              </span>
            </div>

            {/* Blood Group */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "24px 105px 14px 1fr",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#061A30",
                  color: "#FFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Droplet size={11} />
              </div>
              <span
                style={{ fontSize: "11px", fontWeight: 700, color: "#061A30" }}
              >
                Blood Group
              </span>
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 800,
                  color: "#061A30",
                  textAlign: "center",
                }}
              >
                :
              </span>
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 800,
                  color: "#061A30",
                }}
              >
                {bloodGroup}
              </span>
            </div>

            {/* Transport */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "24px 105px 14px 1fr",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#061A30",
                  color: "#FFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bus size={11} />
              </div>
              <span
                style={{ fontSize: "11px", fontWeight: 700, color: "#061A30" }}
              >
                Transport
              </span>
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 800,
                  color: "#061A30",
                  textAlign: "center",
                }}
              >
                :
              </span>
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 800,
                  color: "#061A30",
                }}
              >
                {transportMode}
              </span>
            </div>

            {/* Address */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "24px 105px 14px 1fr",
                alignItems: "flex-start",
                paddingTop: "2px",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#061A30",
                  color: "#FFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <MapPin size={11} />
              </div>
              <span
                style={{ fontSize: "11px", fontWeight: 700, color: "#061A30" }}
              >
                Address
              </span>
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 800,
                  color: "#061A30",
                  textAlign: "center",
                }}
              >
                :
              </span>
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 800,
                  color: "#061A30",
                  textAlign: "left",
                }}
              >
                {address}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Important Rules */}
        <div>
          <h3
            style={{
              margin: "0 0 6px 0",
              fontSize: "12px",
              fontWeight: 800,
              color: "#061A30",
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                width: "4px",
                height: "14px",
                background: "#F5B51B",
                borderRadius: "2px",
              }}
            ></span>
            IMPORTANT INSTRUCTIONS
          </h3>

          <div
            style={{
              background: "#F8FAFC",
              borderRadius: "14px",
              border: "1px solid #E2E8F0",
              padding: "8px 12px",
              fontSize: "10.5px",
              color: "#334155",
              fontWeight: 600,
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              lineHeight: 1.35,
            }}
          >
            <div style={{ display: "flex", gap: "6px" }}>
              <span style={{ color: "#F5B51B", fontWeight: 800 }}>•</span>
              <span>
                This card is the property of {SCHOOL_NAME} {SCHOOL_SUBTITLE}.
              </span>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <span style={{ color: "#F5B51B", fontWeight: 800 }}>•</span>
              <span>
                Must be displayed prominently during school hours & exams.
              </span>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <span style={{ color: "#F5B51B", fontWeight: 800 }}>•</span>
              <span>
                If found, please return to the school office immediately.
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Principal Signature */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            paddingRight: "10px",
          }}
        >
          <img
            src={PRINCIPAL_SIGNATURE_IMG}
            alt="Principal Signature"
            style={{
              height: "30px",
              maxWidth: "110px",
              objectFit: "contain",
              marginBottom: "2px",
            }}
            crossOrigin="anonymous"
          />
          <div
            style={{
              borderTop: "2px solid #F5B51B",
              width: "120px",
              paddingTop: "3px",
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: "#061A30",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              Principal
            </span>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          background: "#061A30",
          borderTop: "3px solid #F5B51B",
          padding: "6px 12px",
          color: "#FFFFFF",
          fontSize: "10px",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: "0.4px",
        }}
      >
        {SCHOOL_ADDRESS} • Ph: {SCHOOL_PHONE}
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

          const pUrl = resolveStudentPhotoUrl(st, apiHost);
          if (pUrl) {
            setPhotoUrl(pUrl);
          }
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

      const prevTab = activeTab;
      if (activeTab === "back") setActiveTab("front");

      const options = {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      };

      const frontCanvas = await html2canvas(frontEl, options);

      setActiveTab("back");
      await new Promise((r) => setTimeout(r, 100));
      const backCanvas = await html2canvas(
        document.getElementById("idcard-back"),
        options,
      );

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

      pdf.setDrawColor(200, 200, 200);
      pdf.setLineDash([2, 2], 0);
      pdf.rect(30, 40, cardW, cardH, "D");
      pdf.rect(110, 40, cardW, cardH, "D");

      pdf.save(
        `ID-Card-${student.personalDetails?.admissionNumber || student.personalDetails?.studentId || "Student"}.pdf`,
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

      {/* Toolbar */}
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
            className="gap-2 bg-[#061A30] hover:bg-[#0E335B] text-white"
          >
            <Printer size={16} /> Print Card
          </Button>
        </div>
      </div>

      {/* Card Display (Web Preview) */}
      <div className="flex justify-center items-center py-10 print:hidden bg-gray-100 rounded-3xl border border-gray-200 shadow-inner">
        {activeTab === "front" ? (
          <IDCardFront student={student} photoUrl={photoUrl} />
        ) : (
          <IDCardBack student={student} />
        )}
      </div>

      {/* Print Layout (Hidden on Web) */}
      <div className="hidden print:flex flex-row justify-center items-start gap-10 mt-10">
        <IDCardFront student={student} photoUrl={photoUrl} />
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
