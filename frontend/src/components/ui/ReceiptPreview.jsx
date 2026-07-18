import React, { useMemo } from "react";
import {
  Printer,
  Download,
  CheckCircle2,
  Receipt as ReceiptIcon,
  ShieldCheck,
  MapPin,
  Phone,
  Globe,
  Mail,
  User,
  Calendar,
  Hash,
  CreditCard,
  BookOpen,
} from "lucide-react";
import Button from "./Button";
import { cn } from "../../utils/cn";
import { formatToINR } from "../../utils/format";
import { useToast } from "../../context/ToastContext";
import api from "../../services/api";
import SchoolLogo from "./SchoolLogo";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

const ReceiptPreview = ({ transaction, student, className }) => {
  const { addToast } = useToast();

  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const element = document.getElementById("receipt-content");
    if (!element) {
      addToast("Receipt element not found", "error");
      return;
    }

    // Save original styles to restore later
    const originalWidth = element.style.width;
    const originalMaxWidth = element.style.maxWidth;
    const originalBoxShadow = element.style.boxShadow;
    const originalBorder = element.style.border;
    const originalBorderRadius = element.style.borderRadius;

    try {
      addToast("Generating your high-resolution receipt PDF...", "info");

      // Force standard A4 print dimensions and clear card decorations for a clean PDF copy
      element.style.width = "794px"; 
      element.style.maxWidth = "none";
      element.style.boxShadow = "none";
      element.style.border = "none";
      element.style.borderRadius = "0px";

      // Configure html2canvas options for 3x scale, CORS compatibility, and desktop viewport simulation
      const options = {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        allowTaint: true,
        windowWidth: 1024, // Simulate a desktop viewport to trigger desktop media queries
      };

      const canvas = await html2canvas(element, options);
      const imgData = canvas.toDataURL("image/png");

      // A4 Size: 210mm x 297mm
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

      // Save the generated document
      pdf.save(`receipt_${studentName.replace(/\s+/g, "_")}.pdf`);
      addToast("Receipt PDF downloaded successfully!", "success");
    } catch (error) {
      console.error("Client-side PDF generation failed, falling back to server...", error);
      
      // Fallback to server download if client-side fails
      try {
        const downloadId = transaction._id || transaction.mongoId || transaction.id;
        const res = await api.get(`/fees/receipt/${downloadId}`, {
          responseType: "blob",
        });
        const blob = new Blob([res.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `receipt_${studentName.replace(/\s+/g, "_")}.pdf`,
        );
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        addToast("Receipt downloaded successfully (server copy)", "success");
      } catch (srvError) {
        console.error("Server-side fallback also failed:", srvError);
        addToast("Failed to download receipt", "error");
      }
    } finally {
      // Always restore original styles
      element.style.width = originalWidth;
      element.style.maxWidth = originalMaxWidth;
      element.style.boxShadow = originalBoxShadow;
      element.style.border = originalBorder;
      element.style.borderRadius = originalBorderRadius;
    }
  };

  // Robust field mappings to support different backend/frontend schemas
  const receiptNo = transaction.receiptNumber || transaction.id || transaction._id || "N/A";
  const session = transaction.academicYear || "2026 - 2027";
  const rawDate = transaction.paymentDate || transaction.createdAt || transaction.date || new Date();
  const formattedDate = new Date(rawDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  
  const paymentStatus = (transaction.status || "SUCCESS").toUpperCase();
  const paymentMode = (transaction.paymentMode || transaction.mode || "CASH").toUpperCase();

  const studentName = student?.name || transaction.studentName || (transaction.student && (transaction.student.fullName || transaction.student.name)) || "N/A";
  const rollNumber = student?.rollNumber || transaction.roll || (transaction.student && transaction.student.rollNumber) || "N/A";
  const admissionNo = student?.studentId || student?.admissionNumber || (transaction.student && (transaction.student.studentId || transaction.student.admissionNumber)) || `LFES-${rollNumber}`;
  const fatherName = student?.fatherName || (transaction.student && transaction.student.fatherName) || "N/A";
  const classNameVal = student?.class || (transaction.student && (transaction.student.class?.name || transaction.student.class)) || "N/A";
  const section = student?.section || (transaction.student && transaction.student.section) || "A";
  const mobile = student?.phone || student?.mobile || (transaction.student && (transaction.student.phone || transaction.student.mobile)) || "N/A";
  const aadharNo = student?.aadhar || (transaction.student && transaction.student.aadhar) || "N/A";

  const totalAmount = transaction.amount || 0;
  const transportPaid = transaction.transportAmount || 0;
  const tuitionPaid = totalAmount - transportPaid;
  const monthsPaid = Array.isArray(transaction.month) 
    ? transaction.month.join(", ") 
    : transaction.month || "Current Month";

  // Number to Words Converter (INR)
  const numberToWords = (num) => {
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    
    if (num === 0) return "Zero";
    
    const convert = (n) => {
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
      if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + convert(n % 100) : "");
      if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "");
      if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + convert(n % 100000) : "");
      return "";
    };
    
    return convert(num) + " Rupees Only";
  };

  const qrPayload = JSON.stringify({
    receiptNo,
    studentName,
    amount: totalAmount,
    date: formattedDate,
    session,
  });
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayload)}`;

  return (
    <div className={cn("space-y-6 max-w-4xl mx-auto", className)}>
      {/* Success Decoration */}
      <div className="flex flex-col items-center text-center space-y-2 mb-4 md:hidden">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
          <CheckCircle2 size={24} />
        </div>
        <h4 className="text-base font-black text-gray-900">Payment Processed</h4>
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
          Receipt #{receiptNo}
        </p>
      </div>

      {/* The Printable A4 Receipt Container */}
      <div
        id="receipt-content"
        className="bg-white border border-gray-200 rounded-3xl p-6 md:p-10 space-y-6 relative overflow-hidden shadow-md print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none"
        style={{ minHeight: "297mm", boxSizing: "border-box" }}
      >
        {/* Anti-fraud background watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none rotate-12">
          <ShieldCheck size={500} />
        </div>

        {/* 1. Header Section */}
        <div className="flex flex-row justify-between items-center border-b-2 border-gray-150 pb-5 gap-4 relative">
          <div className="flex items-center gap-4">
            <SchoolLogo className="w-16 h-16 md:w-20 md:h-20 shrink-0" />
            <div>
              <h1 className="text-lg md:text-2xl font-black text-indigo-900 tracking-tight leading-none">
                LITTLE FLOWER ENGLISH SCHOOL
              </h1>
              <p className="text-[10px] md:text-xs font-bold text-gray-500 mt-1 leading-snug">
                Dindayalpur, Siwan, Bihar
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] md:text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1.5">
                <span className="flex items-center gap-1">
                  <Globe size={11} /> www.lfessiwan.in
                </span>
            
                <span className="flex items-center gap-1">
                  <Phone size={11} /> +91 82946 80282 
                </span>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest mb-2 border border-indigo-100/50">
              Fee Collection Receipt
            </div>
            <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-wider">
              Academic Session: <span className="text-gray-900">{session}</span>
            </p>
          </div>
        </div>

        {/* 2. Receipt Information (Two-Column Layout) */}
        <div className="grid grid-cols-2 gap-6 bg-gray-50/50 border border-gray-100 rounded-2xl p-4 text-xs font-bold">
          <div className="space-y-2">
            <div className="flex justify-between border-b border-gray-100/50 pb-1.5">
              <span className="text-gray-400 uppercase tracking-wider text-[9px]">Receipt Number</span>
              <span className="text-gray-900 font-extrabold">{receiptNo}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100/50 pb-1.5">
              <span className="text-gray-400 uppercase tracking-wider text-[9px]">Academic Session</span>
              <span className="text-gray-800">{session}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 uppercase tracking-wider text-[9px]">Receipt Issued Date</span>
              <span className="text-gray-800">{formattedDate}</span>
            </div>
          </div>
          <div className="space-y-2 border-l border-gray-100 pl-6">
            <div className="flex justify-between border-b border-gray-100/50 pb-1.5">
              <span className="text-gray-400 uppercase tracking-wider text-[9px]">Payment Date</span>
              <span className="text-gray-800">{formattedDate}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100/50 pb-1.5 items-center">
              <span className="text-gray-400 uppercase tracking-wider text-[9px]">Payment Status</span>
              <span className="bg-emerald-50 text-emerald-705 px-2 py-0.5 rounded-md text-[9px] border border-emerald-100 font-black uppercase">
                {paymentStatus}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 uppercase tracking-wider text-[9px]">Payment Mode</span>
              <span className="bg-indigo-50 text-indigo-750 px-2 py-0.5 rounded-md text-[9px] border border-indigo-100/50 font-black uppercase">
                {paymentMode}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Student Information Card */}
        <div className="border border-gray-150 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <User size={14} className="text-indigo-600" />
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Student Profile Information
            </h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[9px] text-gray-400 uppercase font-bold block mb-0.5">Student Name</span>
              <span className="font-extrabold text-gray-900 uppercase">{studentName}</span>
            </div>
            <div>
              <span className="text-[9px] text-gray-400 uppercase font-bold block mb-0.5">Aadhaar Number</span>
              <span className="font-bold text-gray-800 uppercase">{aadharNo}</span>
            </div>
            <div>
              <span className="text-[9px] text-gray-400 uppercase font-bold block mb-0.5">Class & Section</span>
              <span className="font-bold text-gray-800">Class {classNameVal} • Section {section}</span>
            </div>
            <div>
              <span className="text-[9px] text-gray-400 uppercase font-bold block mb-0.5">Roll Number</span>
              <span className="font-bold text-gray-800">{rollNumber}</span>
            </div>
            <div>
              <span className="text-[9px] text-gray-400 uppercase font-bold block mb-0.5">Father Name</span>
              <span className="font-bold text-gray-800 uppercase">{fatherName}</span>
            </div>
            <div>
              <span className="text-[9px] text-gray-400 uppercase font-bold block mb-0.5">Contact Number</span>
              <span className="font-bold text-gray-800">{mobile}</span>
            </div>
            <div>
              <span className="text-[9px] text-gray-400 uppercase font-bold block mb-0.5">Academic Session</span>
              <span className="font-bold text-gray-800">{session}</span>
            </div>
            <div>
              <span className="text-[9px] text-gray-400 uppercase font-bold block mb-0.5">Status</span>
              <span className="text-emerald-600 font-extrabold">ACTIVE ENROLMENT</span>
            </div>
          </div>
        </div>

        {/* 4. Payment Details Table */}
        <div className="border border-gray-150 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-indigo-900 text-white font-black uppercase tracking-wider text-[9px]">
                <th className="px-5 py-3">Particular</th>
                <th className="px-5 py-3">Month</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-right">Discount</th>
                <th className="px-5 py-3 text-right">Paid Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {transportPaid > 0 ? (
                <>
                  <tr className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-extrabold text-gray-900">Tuition Fee</td>
                    <td className="px-5 py-3 font-semibold text-gray-550">{monthsPaid}</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-600">{formatToINR(tuitionPaid)}</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-400">₹0.00</td>
                    <td className="px-5 py-3 text-right font-extrabold text-gray-900">{formatToINR(tuitionPaid)}</td>
                  </tr>
                  <tr className="bg-gray-50/20 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-extrabold text-gray-900">Transport Fee</td>
                    <td className="px-5 py-3 font-semibold text-gray-550">{monthsPaid}</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-600">{formatToINR(transportPaid)}</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-400">₹0.00</td>
                    <td className="px-5 py-3 text-right font-extrabold text-gray-900">{formatToINR(transportPaid)}</td>
                  </tr>
                </>
              ) : (
                <tr className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 font-extrabold text-gray-900">{transaction.type || "Tuition"} Fee</td>
                  <td className="px-5 py-3 font-semibold text-gray-550">{monthsPaid}</td>
                  <td className="px-5 py-3 text-right font-medium text-gray-600">{formatToINR(totalAmount)}</td>
                  <td className="px-5 py-3 text-right font-medium text-gray-400">₹0.00</td>
                  <td className="px-5 py-3 text-right font-extrabold text-gray-900">{formatToINR(totalAmount)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Total Summary & Amount in Words */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="border border-gray-150 rounded-2xl p-4 bg-gray-50/30">
            <span className="text-[9px] text-gray-400 uppercase font-black tracking-wider block mb-1">
              Amount in Words
            </span>
            <p className="text-xs font-black text-gray-800 italic leading-relaxed">
              {numberToWords(totalAmount)}
            </p>
          </div>

          <div className="bg-indigo-900 text-white rounded-2xl p-5 space-y-2.5 shadow-md">
            <div className="flex justify-between items-center text-xs font-bold opacity-80">
              <span>Subtotal</span>
              <span>{formatToINR(totalAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold opacity-80">
              <span>Discount Total</span>
              <span>₹0.00</span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold opacity-80">
              <span>Late Fee / Fine</span>
              <span>₹0.00</span>
            </div>
            <div className="h-px bg-white/10 my-2" />
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider">Grand Total</span>
              <span className="text-lg font-black text-orange-400">{formatToINR(totalAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold">
              <span>Paid Amount</span>
              <span className="text-emerald-400 font-extrabold">{formatToINR(totalAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold opacity-80 border-t border-white/5 pt-1.5">
              <span>Balance Due</span>
              <span>₹0.00</span>
            </div>
          </div>
        </div>

        {/* 6. Footer, Verification & Stamp / Signature Area */}
        <div className="flex flex-row justify-between items-end gap-6 pt-6 border-t border-gray-100 relative min-h-[120px]">
          {/* QR Verification */}
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 border border-gray-200 rounded-xl p-1.5 bg-white shrink-0 shadow-sm flex items-center justify-center">
              <img src={qrCodeUrl} alt="Verification QR Code" className="w-full h-full object-contain" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-900 tracking-tight uppercase flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-600" /> Verified Record
              </p>
              <p className="text-[8px] text-gray-400 font-bold uppercase leading-tight">
                Scan to Verify
              </p>
              <p className="text-[8px] text-gray-450 font-mono tracking-tighter max-w-[150px] truncate">
                ID: {receiptNo}
              </p>
            </div>
          </div>

          {/* Overlapping Stamp & Signature */}
          <div className="relative text-center w-40 h-28 flex flex-col justify-end items-center">
            {/* The Signature Image */}
            <img
              src="/assets/official/principal-signature.png"
              alt="Principal Signature"
              className="absolute bottom-10 w-24 h-auto z-20 pointer-events-none select-none"
            />

            {/* Overlapping Stamp Image (20-30% overlap, 75-80% opacity) */}
            <img
              src="/assets/official/school-stamp.png"
              alt="Official School Stamp"
              className="absolute bottom-6 w-20 h-auto z-10 opacity-75 pointer-events-none select-none left-4"
            />

            <div className="w-full border-t border-gray-200 pt-1.5 relative z-30 bg-white/70 backdrop-blur-sm">
              <p className="text-[10px] font-black text-gray-900 leading-none">Principal</p>
              <p className="text-[8px] font-bold text-gray-405 mt-0.5 leading-none">Little Flower English School</p>
            </div>
          </div>
        </div>

        {/* 7. Legal Disclaimer Footer */}
        <div className="border-t border-gray-100 pt-4 text-center space-y-1">
          <p className="text-[8px] text-gray-400 font-bold tracking-tight">
            * This is a computer-generated fee receipt and does not require a physical signature.
          </p>
          <div className="flex justify-center gap-4 text-[8px] text-indigo-405 font-black uppercase tracking-widest opacity-80">
            <span>ERP Generated Receipt</span>
            <span>•</span>
            <span>Receipt Verification Available via QR Code</span>
          </div>
        </div>
      </div>

      {/* Action Buttons (Hidden during printing) */}
      <div className="flex gap-4 pt-4 print:hidden">
        <Button
          variant="secondary"
          icon={Printer}
          onClick={handlePrint}
          className="flex-1 rounded-2xl border-gray-150 h-12 text-xs font-black uppercase tracking-wider"
        >
          Print Receipt
        </Button>
        <Button
          variant="primary"
          icon={Download}
          onClick={handleDownload}
          className="flex-1 rounded-2xl shadow-xl shadow-indigo-100 h-12 text-xs font-black uppercase tracking-wider"
        >
          Download PDF
        </Button>
      </div>
    </div>
  );
};

export default ReceiptPreview;
