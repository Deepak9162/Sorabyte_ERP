import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  FileText,
  Loader2,
} from "lucide-react";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import api from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { cn } from "../../utils/cn";
import { resolveStudentPhotoUrl } from "../../utils/imageUtils";
import { IDCardFront, IDCardBack, injectFonts } from "./StudentIDCard";

// ─── School Constants ───────────────────────────────────────────────
const SCHOOL_PHONE = "9123456789";
const SCHOOL_ADDRESS = "Vill. Dindayalpur, P.O. Dindayalpur,\nSiwan, Bihar \u2013 841226";
const SCHOOL_WEBSITE = "www.lfes.in/erp";
const SCHOOL_LOCATION = "DINDAYALPUR (SIWAN)";

const BulkIDCards = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);

  const apiHost = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : "";

  useEffect(() => {
    const fetchStudentsBatch = async () => {
      try {
        setLoading(true);
        const idsString = searchParams.get("ids");
        if (!idsString) {
          addToast("No student records selected for generation", "error");
          navigate("/students");
          return;
        }

        const idsArray = idsString.split(",");
        
        // Sequential retrieval to gather clean population data for all selected IDs
        const gatheredStudents = [];
        for (let i = 0; i < idsArray.length; i++) {
          const res = await api.get(`/students/${idsArray[i]}/profile`);
          if (res.data.success) {
            gatheredStudents.push(res.data.data);
          }
        }

        setStudents(gatheredStudents);
      } catch (error) {
        console.error("Bulk ID card loading failed:", error);
        addToast("Failed to load selected student records", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchStudentsBatch();
  }, [searchParams]);

  const handlePrintAll = () => window.print();

  const handleExportPDF = async () => {
    if (students.length === 0) return;
    try {
      setDownloading(true);
      setProgressPercent(0);
      setProgressText(`Starting generation of ${students.length} ID cards...`);

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const options = { scale: 2.5, useCORS: true, backgroundColor: null, logging: false };

      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        setProgressText(`Converting card ${i + 1} of ${students.length} (${student.personalDetails?.name})...`);
        setProgressPercent(Math.round((i / students.length) * 100));

        const frontEl = document.getElementById(`front-${student.personalDetails?.studentId}`);
        const backEl = document.getElementById(`back-${student.personalDetails?.studentId}`);
        if (!frontEl || !backEl) continue;

        const [frontCanvas, backCanvas] = await Promise.all([
          html2canvas(frontEl, options),
          html2canvas(backEl, options),
        ]);

        if (i > 0) pdf.addPage();

        pdf.setFont("Helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(26, 44, 91);
        pdf.text("LITTLE FLOWER ENGLISH SCHOOL — Student ID Cards", 105, 18, { align: "center" });
        pdf.setFont("Helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${i + 1} of ${students.length}  |  ${new Date().toLocaleDateString()}`, 105, 24, { align: "center" });
        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.3);
        pdf.line(15, 27, 195, 27);

        const cardW = 62, cardH = 96;
        pdf.addImage(frontCanvas.toDataURL("image/png"), "PNG", 18, 38, cardW, cardH);
        pdf.addImage(backCanvas.toDataURL("image/png"), "PNG", 120, 38, cardW, cardH);
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineDash([1.5, 1.5], 0);
        pdf.rect(18, 38, cardW, cardH, "D");
        pdf.rect(120, 38, cardW, cardH, "D");
      }

      setProgressPercent(100);
      pdf.save(`LF-IDCards-Batch-${Date.now()}.pdf`);
      addToast(`${students.length} ID cards exported!`, "success");
    } catch (err) {
      console.error(err);
      addToast("PDF export failed.", "error");
    } finally {
      setDownloading(false);
      setProgressText("");
    }
  };

  // Dynamic mathematically correct Code 39 barcode generator
  const renderBarcode = (barcodeText) => {
    const CODE39_MAP = {
      '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
      '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
      '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
      'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
      'G': '101001011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
      'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
      'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
      'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '100110101011',
      'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
      '-': '100101011011', '.': '110010101101', ' ': '100110101101', '*': '100101101101'
    };

    const cleanText = `*${(barcodeText || "STU-XXXX").toUpperCase()}*`;
    let fullPattern = "";
    
    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      const pattern = CODE39_MAP[char] || CODE39_MAP['-'];
      fullPattern += pattern + "0"; // narrow space between characters
    }
    
    const rects = [];
    let x = 0;
    const barWidth = 1.0;
    const height = 40;
    
    for (let i = 0; i < fullPattern.length; i++) {
      const bit = fullPattern[i];
      if (bit === '1') {
        rects.push(
          <rect key={i} x={x} y={0} width={barWidth} height={height} fill="black" />
        );
      }
      x += barWidth;
    }
    
    return (
      <svg className="w-full h-8 shrink-0" viewBox={`0 0 ${x} ${height}`} preserveAspectRatio="none">
        {rects}
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <h3 className="text-lg font-black text-gray-800">Compiling selected records...</h3>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 print:bg-white print:p-0">
      
      {injectFonts()}
      
      {/* 1. Stepper Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/students")}
            className="p-3 text-gray-400 hover:text-gray-900 bg-white border border-gray-100 hover:border-gray-200 rounded-2xl transition-all shadow-sm active:scale-95"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">
              Bulk Credential Console
            </span>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight mt-1">
              Generate ID Cards ({students.length})
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            disabled={downloading}
            onClick={handleExportPDF}
            className={cn(
              "flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 rounded-2xl text-sm font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50",
              downloading && "cursor-wait"
            )}
          >
            <FileText size={18} className={cn(downloading && "animate-pulse")} />
            <span>{downloading ? "Exporting PDF..." : "Export All to PDF"}</span>
          </button>

          <button
            disabled={downloading}
            onClick={handlePrintAll}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-indigo-100 active:scale-95"
          >
            <Printer size={18} />
            <span>Print All Cards</span>
          </button>
        </div>
      </div>


      {/* Progress status overlay */}
      {downloading && (
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-6 text-center space-y-4 print:hidden animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between text-sm font-bold text-indigo-700">
            <span>{progressText}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-3 bg-indigo-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Card Grid */}
      <div className="space-y-12 p-8 bg-gray-50 border border-dashed border-gray-200 rounded-[2.5rem] print:bg-white print:p-0 print:border-none">
        {students.map((student, index) => {
          const { personalDetails, academicDetails, contactDetails } = student;

          const photoUrl = resolveStudentPhotoUrl(student, apiHost);

          const qrPayload = `Name: ${personalDetails?.name || 'N/A'}\nID: ${personalDetails?.studentId || 'N/A'}\nClass: ${academicDetails?.className || ""}${academicDetails?.section ? ` (${academicDetails.section})` : ""}\nPhone: ${contactDetails?.parentMobile || contactDetails?.phone || "N/A"}\nSchool: Little Flower English School`;
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrPayload)}`;

          return (
            <div
              key={student._id || index}
              className="flex flex-col md:flex-row items-center justify-center gap-8 border-b border-gray-200 pb-12 last:border-none print:pb-0 print:border-none print:page-break-after-always"
            >

              <IDCardFront student={student} photoUrl={photoUrl} id={`front-${personalDetails?.studentId}`} />
              <IDCardBack student={student} qrUrl={qrUrl} id={`back-${personalDetails?.studentId}`} />
            </div>
          );
        })}
      </div>

      {/* Print Specific CSS stylesheet */}
      <style>{`
        @media print {
          header, 
          aside,
          .print\\:hidden,
          nav,
          div.print\\:hidden {
            display: none !important;
          }
          
          body, html, main, #root, div.flex-1 {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: 100% !important;
            overflow: visible !important;
          }

          div.space-y-12.p-8 {
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: none !important;
            display: block !important;
          }

          div.last\\:border-none {
            display: flex !important;
            flex-direction: row !important;
            justify-content: center !important;
            align-items: center !important;
            gap: 40px !important;
            margin-top: 3cm !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
          }

          #idcard-front, #idcard-back {
            border: 1px solid #d1d5db !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BulkIDCards;
