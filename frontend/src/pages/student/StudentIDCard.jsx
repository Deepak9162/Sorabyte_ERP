import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer, FileText } from "lucide-react";
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
  qrUrl,
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

  let dobFormatted = "15/03/2015";
  if (personalDetails?.dob) {
    try {
      const d = new Date(personalDetails.dob);
      if (!isNaN(d.getTime())) {
        dobFormatted = d.toLocaleDateString("en-IN");
      }
    } catch (e) {}
  }

  const defaultQrPayload = `Name: ${studentName}\nID: ${admissionNo}\nClass: ${className} (${section})\nSchool: Little Flower English School`;
  const effectiveQrUrl =
    qrUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(defaultQrPayload)}`;

  return (
    <div
      id={id}
      className="id-card-container bg-white relative overflow-hidden flex flex-col shadow-2xl"
      style={{
        width: "350px",
        height: "540px",
        borderRadius: "20px",
        boxSizing: "border-box",
        border: "1px solid #E5E7EB",
      }}
    >
      {/* ── Background Watermark ── */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -40%)",
          width: "220px",
          height: "220px",
          opacity: 0.04,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <img
          src={logoUrl || schoolLogoImg}
          alt="Watermark"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
          crossOrigin="anonymous"
        />
      </div>

      {/* ── Top Navy Header Section ── */}
      <div
        style={{
          position: "relative",
          background: "#061F42",
          padding: "16px 16px 18px 16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          zIndex: 2,
        }}
      >
        {/* School Logo */}
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "#FFFFFF",
            border: "2.5px solid #C5A059",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          {logoUrl || schoolLogoImg ? (
            <img
              src={logoUrl || schoolLogoImg}
              alt="School Logo"
              style={{ width: "90%", height: "90%", objectFit: "contain" }}
              crossOrigin="anonymous"
            />
          ) : (
            <div
              style={{
                fontSize: "10px",
                fontWeight: 800,
                color: "#061F42",
                textAlign: "center",
                lineHeight: 1.1,
              }}
            >
              LF
              <br />
              ES
            </div>
          )}
        </div>

        {/* Header Titles */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div
            className="font-cinzel"
            style={{
              fontSize: "16px",
              fontWeight: 900,
              color: "#FFFFFF",
              letterSpacing: "0.5px",
              lineHeight: 1.1,
              textTransform: "uppercase",
            }}
          >
            {SCHOOL_NAME}
          </div>
          <div
            className="font-cinzel"
            style={{
              fontSize: "13px",
              fontWeight: 800,
              color: "#FFFFFF",
              letterSpacing: "1.5px",
              lineHeight: 1.1,
              textTransform: "uppercase",
            }}
          >
            {SCHOOL_SUBTITLE}
          </div>
          <div
            style={{
              width: "100%",
              height: "1.5px",
              background: "#C5A059",
              margin: "3px 0",
            }}
          />
          <div
            style={{
              fontSize: "8.5px",
              color: "#E0E6ED",
              fontWeight: 700,
              letterSpacing: "0.8px",
              textTransform: "uppercase",
            }}
          >
            {SCHOOL_LOCATION}
          </div>
        </div>
      </div>

      {/* ── Header Bottom Gold Curved Separator ── */}
      <div style={{ position: "relative", marginTop: "-1px", zIndex: 2 }}>
        <svg
          width="350"
          height="24"
          viewBox="0 0 350 24"
          fill="none"
          style={{ display: "block" }}
        >
          <path d="M0,0 L350,0 L350,6 C230,24 120,24 0,6 Z" fill="#061F42" />
          <path
            d="M0,6 C120,24 230,24 350,6"
            stroke="#C5A059"
            strokeWidth="2.5"
            fill="none"
          />
        </svg>
      </div>

      {/* ── Student Information Area (2 Columns) ── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "14px 18px 10px 18px",
          display: "flex",
          gap: "14px",
          alignItems: "flex-start",
        }}
      >
        {/* LEFT COLUMN: Student Photo */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "124px",
              height: "145px",
              borderRadius: "14px",
              border: "2.5px solid #C5A059",
              boxShadow: "0 6px 16px rgba(6,31,66,0.12)",
              overflow: "hidden",
              background: "#F3F4F6",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Student"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  if (photoUrl && photoUrl.includes('googleusercontent.com')) {
                    const fileId = photoUrl.split('/').pop();
                    if (fileId) {
                      e.target.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
                    }
                  }
                }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9CA3AF",
                }}
              >
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#6B7280",
                    marginTop: "4px",
                  }}
                >
                  PHOTO
                </span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Student Metadata */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Student Name */}
          <div
            style={{
              fontSize: "17px",
              fontWeight: 900,
              color: "#061F42",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              lineHeight: 1.2,
              marginBottom: "10px",
              wordBreak: "break-word",
            }}
          >
            {studentName}
          </div>

          {/* Metadata Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {/* Class */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "11px",
              }}
            >
              <span
                style={{
                  width: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#C5A059",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span
                style={{
                  fontWeight: 600,
                  color: "#4B5563",
                  width: "62px",
                  flexShrink: 0,
                }}
              >
                Class
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: "#061F42",
                  marginRight: "4px",
                }}
              >
                :
              </span>
              <span style={{ fontWeight: 800, color: "#061F42" }}>
                {className}
              </span>
            </div>

            {/* Section */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "11px",
              }}
            >
              <span
                style={{
                  width: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#C5A059",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </span>
              <span
                style={{
                  fontWeight: 600,
                  color: "#4B5563",
                  width: "62px",
                  flexShrink: 0,
                }}
              >
                Section
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: "#061F42",
                  marginRight: "4px",
                }}
              >
                :
              </span>
              <span style={{ fontWeight: 800, color: "#061F42" }}>
                {section}
              </span>
            </div>

            {/* Roll No. */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "11px",
              }}
            >
              <span
                style={{
                  width: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#C5A059",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M7 8h10" />
                  <path d="M7 12h10" />
                  <path d="M7 16h6" />
                </svg>
              </span>
              <span
                style={{
                  fontWeight: 600,
                  color: "#4B5563",
                  width: "62px",
                  flexShrink: 0,
                }}
              >
                Roll No.
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: "#061F42",
                  marginRight: "4px",
                }}
              >
                :
              </span>
              <span style={{ fontWeight: 800, color: "#061F42" }}>
                {rollNumber}
              </span>
            </div>

            {/* Adm. No. */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "11px",
              }}
            >
              <span
                style={{
                  width: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#C5A059",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M6 10h4" />
                  <path d="M6 14h8" />
                </svg>
              </span>
              <span
                style={{
                  fontWeight: 600,
                  color: "#4B5563",
                  width: "62px",
                  flexShrink: 0,
                }}
              >
                Adm. No.
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: "#061F42",
                  marginRight: "4px",
                }}
              >
                :
              </span>
              <span
                style={{
                  fontWeight: 800,
                  color: "#061F42",
                  fontSize: "10.5px",
                }}
              >
                {admissionNo}
              </span>
            </div>

            {/* DOB */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "11px",
              }}
            >
              <span
                style={{
                  width: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#C5A059",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <span
                style={{
                  fontWeight: 600,
                  color: "#4B5563",
                  width: "62px",
                  flexShrink: 0,
                }}
              >
                DOB
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: "#061F42",
                  marginRight: "4px",
                }}
              >
                :
              </span>
              <span style={{ fontWeight: 800, color: "#061F42" }}>
                {dobFormatted}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lower Section: QR Code & Principal Signature ── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "10px 24px 12px 24px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flex: 1,
        }}
      >
        {/* QR Code Block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              border: "1.5px solid #C5A059",
              borderRadius: "10px",
              padding: "4px",
              background: "#FFFFFF",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <img
              src={effectiveQrUrl}
              alt="QR Code"
              style={{ width: "68px", height: "68px", display: "block" }}
              crossOrigin="anonymous"
            />
          </div>
        </div>

        {/* Principal Stamp & Signature (Overlapped) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          {/* Overlap Container */}
          <div
            style={{
              position: "relative",
              width: "140px",
              height: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Official Stamp Image (Behind & slightly tilted) */}
            <img
              src={OFFICIAL_STAMP_IMG}
              alt="School Stamp"
              style={{
                position: "absolute",
                top: "-6px",
                left: "50%",
                transform: "translateX(-50%) rotate(-8deg)",
                height: "46px",
                maxWidth: "135px",
                objectFit: "contain",
                opacity: 0.9,
                pointerEvents: "none",
                zIndex: 1,
              }}
              crossOrigin="anonymous"
            />
            {/* Principal Signature Image (Overlaid directly across stamp) */}
            <img
              src={PRINCIPAL_SIGNATURE_IMG}
              alt="Principal Signature"
              style={{
                position: "absolute",
                bottom: "0px",
                left: "50%",
                transform: "translateX(-50%)",
                height: "34px",
                maxWidth: "130px",
                objectFit: "contain",
                zIndex: 2,
              }}
              crossOrigin="anonymous"
            />
          </div>
          <div
            style={{
              width: "130px",
              borderTop: "1.5px solid #061F42",
              paddingTop: "3px",
            }}
          >
            <span
              style={{ fontSize: "9.5px", color: "#061F42", fontWeight: 800 }}
            >
              Principal Signature
            </span>
          </div>
        </div>
      </div>

      {/* ── Front Navy Footer Bar ── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          background: "#061F42",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#061F42">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: "7.5px",
                color: "#C5A059",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              School Contact
            </span>
            <span
              style={{ fontSize: "10px", color: "#FFFFFF", fontWeight: 800 }}
            >
              {SCHOOL_PHONE}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#061F42">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </div>
          <span
            style={{ fontSize: "9.5px", color: "#FFFFFF", fontWeight: 700 }}
          >
            {SCHOOL_WEBSITE}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Back Card ─────────────────────────────────────────────────────────
export const IDCardBack = ({ student, logoUrl, id = "idcard-back" }) => {
  const { personalDetails = {}, contactDetails = {} } = student || {};

  const parentName =
    contactDetails?.parentName || contactDetails?.fatherName || "Rajesh Kumar";
  const emergencyPhone =
    contactDetails?.parentMobile ||
    contactDetails?.emergencyContact ||
    contactDetails?.phone ||
    SCHOOL_PHONE;
  const bloodGroup = personalDetails?.bloodGroup || "B+";
  const transportMode = personalDetails?.transportMode || "Private";
  const address =
    contactDetails?.address || "Dindayalpur, Siwan, Bihar - 841226";

  return (
    <div
      id={id}
      className="id-card-container bg-white relative overflow-hidden flex flex-col shadow-2xl"
      style={{
        width: "350px",
        height: "540px",
        borderRadius: "20px",
        boxSizing: "border-box",
        border: "1px solid #E5E7EB",
      }}
    >
      {/* ── Background Watermark ── */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -40%)",
          width: "220px",
          height: "220px",
          opacity: 0.04,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <img
          src={logoUrl || schoolLogoImg}
          alt="Watermark"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
          crossOrigin="anonymous"
        />
      </div>

      {/* ── Top Navy Header Section ── */}
      <div
        style={{
          position: "relative",
          background: "#061F42",
          padding: "16px 16px 14px 16px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          zIndex: 2,
        }}
      >
        {/* Gold Ornament */}
        <div
          style={{
            color: "#C5A059",
            fontSize: "11px",
            letterSpacing: "3px",
            marginBottom: "2px",
          }}
        >
          — ✤ —
        </div>
        <div
          className="font-cinzel"
          style={{
            fontSize: "17px",
            fontWeight: 900,
            color: "#FFFFFF",
            letterSpacing: "1px",
            lineHeight: 1.1,
            textTransform: "uppercase",
          }}
        >
          {SCHOOL_NAME}
        </div>
        <div
          className="font-cinzel"
          style={{
            fontSize: "13px",
            fontWeight: 800,
            color: "#C5A059",
            letterSpacing: "1.5px",
            lineHeight: 1.2,
            textTransform: "uppercase",
            marginTop: "2px",
          }}
        >
          — {SCHOOL_SUBTITLE} —
        </div>
      </div>

      {/* ── Header Bottom Gold Curved Separator ── */}
      <div style={{ position: "relative", marginTop: "-1px", zIndex: 2 }}>
        <svg
          width="350"
          height="22"
          viewBox="0 0 350 22"
          fill="none"
          style={{ display: "block" }}
        >
          <path d="M0,0 L350,0 L350,6 C230,22 120,22 0,6 Z" fill="#061F42" />
          <path
            d="M0,6 C120,22 230,22 350,6"
            stroke="#C5A059"
            strokeWidth="2.5"
            fill="none"
          />
        </svg>
      </div>

      {/* ── Main Content Area ── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "12px 20px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {/* SECTION 1: EMERGENCY CONTACT */}
        <div>
          <div
            style={{
              background: "#061F42",
              color: "#FFFFFF",
              borderRadius: "5px",
              padding: "3px 10px",
              fontSize: "9.5px",
              fontWeight: 800,
              letterSpacing: "1px",
              display: "inline-block",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            EMERGENCY CONTACT
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
              paddingLeft: "4px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "11px",
              }}
            >
              <span
                style={{
                  width: "18px",
                  color: "#C5A059",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span
                style={{ fontWeight: 600, color: "#374151", width: "105px" }}
              >
                Parent / Guardian
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: "#061F42",
                  marginRight: "4px",
                }}
              >
                :
              </span>
              <span style={{ fontWeight: 700, color: "#061F42" }}>
                {parentName}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "11px",
              }}
            >
              <span
                style={{
                  width: "18px",
                  color: "#C5A059",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </span>
              <span
                style={{ fontWeight: 600, color: "#374151", width: "105px" }}
              >
                Contact No.
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: "#061F42",
                  marginRight: "4px",
                }}
              >
                :
              </span>
              <span style={{ fontWeight: 800, color: "#061F42" }}>
                {emergencyPhone}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2: OTHER INFORMATION */}
        <div>
          <div
            style={{
              background: "#061F42",
              color: "#FFFFFF",
              borderRadius: "5px",
              padding: "3px 10px",
              fontSize: "9.5px",
              fontWeight: 800,
              letterSpacing: "1px",
              display: "inline-block",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            OTHER INFORMATION
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
              paddingLeft: "4px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "11px",
              }}
            >
              <span
                style={{
                  width: "18px",
                  color: "#C5A059",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
                </svg>
              </span>
              <span
                style={{ fontWeight: 600, color: "#374151", width: "105px" }}
              >
                Blood Group
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: "#061F42",
                  marginRight: "4px",
                }}
              >
                :
              </span>
              <span style={{ fontWeight: 800, color: "#061F42" }}>
                {bloodGroup}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "11px",
              }}
            >
              <span
                style={{
                  width: "18px",
                  color: "#C5A059",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </span>
              <span
                style={{ fontWeight: 600, color: "#374151", width: "105px" }}
              >
                Transport
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: "#061F42",
                  marginRight: "4px",
                }}
              >
                :
              </span>
              <span style={{ fontWeight: 800, color: "#061F42" }}>
                {transportMode}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                fontSize: "11px",
              }}
            >
              <span
                style={{
                  width: "18px",
                  color: "#C5A059",
                  display: "flex",
                  alignItems: "center",
                  marginTop: "2px",
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <span
                style={{
                  fontWeight: 600,
                  color: "#374151",
                  width: "105px",
                  flexShrink: 0,
                }}
              >
                Address
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: "#061F42",
                  marginRight: "4px",
                }}
              >
                :
              </span>
              <span
                style={{ fontWeight: 700, color: "#061F42", lineHeight: 1.3 }}
              >
                {address}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 3: IMPORTANT RULES */}
        <div>
          <div
            style={{
              background: "#061F42",
              color: "#FFFFFF",
              borderRadius: "5px",
              padding: "3px 10px",
              fontSize: "9.5px",
              fontWeight: 800,
              letterSpacing: "1px",
              display: "inline-block",
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            IMPORTANT RULES
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "3px",
              paddingLeft: "4px",
              fontSize: "9.5px",
              color: "#4B5563",
              fontWeight: 500,
              lineHeight: 1.35,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}
            >
              <span style={{ color: "#C5A059", fontWeight: 900 }}>•</span>
              <span>
                This ID card is the property of Little Flower English School.
              </span>
            </div>
            <div
              style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}
            >
              <span style={{ color: "#C5A059", fontWeight: 900 }}>•</span>
              <span>This card is non-transferable.</span>
            </div>
            <div
              style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}
            >
              <span style={{ color: "#C5A059", fontWeight: 900 }}>•</span>
              <span>This card must be worn during school hours.</span>
            </div>
            <div
              style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}
            >
              <span style={{ color: "#C5A059", fontWeight: 900 }}>•</span>
              <span>
                In case of loss, inform the school office immediately.
              </span>
            </div>
            <div
              style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}
            >
              <span style={{ color: "#C5A059", fontWeight: 900 }}>•</span>
              <span>Misuse of this card is a punishable offence.</span>
            </div>
          </div>
        </div>

        {/* DUAL SIGNATURE LINES */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            padding: "0 10px",
          }}
        >
          <div
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <img
              src={PRINCIPAL_SIGNATURE_IMG}
              alt="Authorised Signatory"
              style={{
                height: "28px",
                maxWidth: "110px",
                objectFit: "contain",
                marginBottom: "2px",
                opacity: 0.9,
              }}
              crossOrigin="anonymous"
            />
            <div
              style={{
                borderTop: "1px solid #374151",
                width: "110px",
                paddingTop: "2px",
              }}
            >
              <span
                style={{ fontSize: "8.5px", fontWeight: 700, color: "#374151" }}
              >
                Authorised Signatory
              </span>
            </div>
          </div>

          <div
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <img
              src={PRINCIPAL_SIGNATURE_IMG}
              alt="Principal"
              style={{
                height: "28px",
                maxWidth: "100px",
                objectFit: "contain",
                marginBottom: "2px",
              }}
              crossOrigin="anonymous"
            />
            <div
              style={{
                borderTop: "1px solid #374151",
                width: "100px",
                paddingTop: "2px",
              }}
            >
              <span
                style={{ fontSize: "8.5px", fontWeight: 700, color: "#374151" }}
              >
                Principal
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Back Navy Footer Bar ── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          background: "#061F42",
          height: "38px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 16px",
          gap: "6px",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="#C5A059">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
        <span
          style={{
            fontSize: "9.5px",
            color: "#FFFFFF",
            fontWeight: 700,
            letterSpacing: "0.3px",
          }}
        >
          {SCHOOL_ADDRESS}
        </span>
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
