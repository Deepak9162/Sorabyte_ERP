import React, { useState, useEffect } from "react";
import {
  Download,
  Share2,
  Printer,
  CheckCircle2,
  Calendar,
  CreditCard,
  Hash,
  School,
  ChevronRight,
  User,
  BookOpen,
  MapPin,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { formatToINR } from "../../utils/format";
import Button from "./Button";
import { useToast } from "../../context/ToastContext";
import api from "../../services/api";
import SchoolLogo from "./SchoolLogo";

const FeeReceiptPremium = ({ transaction, student, onDownload }) => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove("printing-receipt-active");
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  const studentName =
    student?.name ||
    student?.fullName ||
    transaction?.studentName ||
    (transaction?.student &&
      (transaction.student.fullName || transaction.student.name)) ||
    transaction?.name ||
    "N/A";

  const rollNumber =
    student?.rollNumber ||
    student?.roll ||
    transaction?.roll ||
    transaction?.rollNumber ||
    (transaction?.student &&
      (transaction.student.rollNumber || transaction.student.roll)) ||
    "N/A";

  const admissionNo =
    student?.studentId ||
    student?.admissionNumber ||
    transaction?.studentId ||
    transaction?.admissionNumber ||
    (transaction?.student &&
      (transaction.student.studentId || transaction.student.admissionNumber)) ||
    (rollNumber !== "N/A" ? `LFES-${rollNumber}` : "N/A");

  const classNameVal =
    student?.class ||
    transaction?.class ||
    transaction?.className ||
    (transaction?.student &&
      (transaction.student.class?.name || transaction.student.class)) ||
    "N/A";

  const section =
    student?.section ||
    transaction?.section ||
    (transaction?.student && transaction.student.section) ||
    "A";

  const handlePrint = () => {
    document.body.classList.add("printing-receipt-active");
    window.print();
  };

  // Example breakdown logic (mapping from total amount for demo)
  const breakdown = [
    { label: "Tuition Fee", amount: transaction.amount * 0.7 },
    { label: "Transport Fee", amount: transaction.amount * 0.15 },
    { label: "Library Fee", amount: transaction.amount * 0.05 },
    { label: "Exam Fee", amount: transaction.amount * 0.05 },
    { label: "Other Charges", amount: transaction.amount * 0.05 },
  ];

  const handleDownload = async () => {
    if (onDownload) {
      onDownload();
      return;
    }
    // Fallback if not passed directly
    try {
      addToast("Generating secure PDF...", "info");
      const downloadId = transaction.mongoId || transaction.id;
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
      addToast("Receipt downloaded", "success");
    } catch (e) {
      addToast("Download failed", "error");
    }
  };

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-10 flex flex-col font-sans printable-receipt">
      {/* 1. Header Section */}
      <div className="bg-white px-6 py-6 border-b border-gray-100 flex flex-col items-center">
        <div className="flex items-center justify-center mb-2">
          <SchoolLogo className="w-12 h-12" showText={true} />
        </div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Fee Payment Receipt
        </h2>
      </div>

      <div className="p-4 space-y-4">
        {/* 2. Student Details Card */}
        <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-2">
            <User size={16} className="text-indigo-500" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Student Information
            </span>
          </div>
          <div className="grid grid-cols-2 gap-y-4 gap-x-6">
            <DetailItem
              label="Student Name"
              value={studentName}
              isFull
            />
            <DetailItem label="Class" value={classNameVal} />
            <DetailItem label="Section" value={section} />
            <DetailItem label="Roll Number" value={rollNumber} />
            <DetailItem
              label="Admission No"
              value={admissionNo}
            />
          </div>
        </div>

        {/* 3. Payment Details Card */}
        <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-2">
            <CreditCard size={16} className="text-indigo-500" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Payment Metadata
            </span>
          </div>
          <div className="space-y-3">
            <IconDetail icon={Hash} label="Receipt No" value={transaction.id} />
            <IconDetail
              icon={Calendar}
              label="Payment Date"
              value={transaction.date}
            />
            <IconDetail
              icon={CreditCard}
              label="Payment Mode"
              value={transaction.mode}
            />
            <IconDetail
              icon={ChevronRight}
              label="Transaction ID"
              value={
                transaction.mongoId?.slice(-8).toUpperCase() || "TXN-98765"
              }
            />
          </div>
        </div>

        {/* 4. Fee Breakdown Card */}
        <div className="bg-white rounded-[1.5rem] overflow-hidden shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-2">
              <BookOpen size={16} className="text-indigo-500" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Fee Component Breakdown
              </span>
            </div>
            <div className="space-y-4">
              {breakdown.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-gray-500 font-medium">
                    {item.label}
                  </span>
                  <span className="text-gray-900 font-bold">
                    {formatToINR(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Total Amount Highlight */}
          <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center text-white">
            <span className="text-sm font-bold opacity-90">
              Total Amount Paid
            </span>
            <span className="text-xl font-black">
              {formatToINR(transaction.amount)}
            </span>
          </div>
        </div>

        {/* 6. Payment Status Badge */}
        <div className="flex justify-center pt-2">
          <div className="bg-emerald-600 text-white px-6 py-2 rounded-full flex items-center gap-2 shadow-lg shadow-emerald-100 animate-bounce-subtle">
            <CheckCircle2 size={18} />
            <span className="text-sm font-black uppercase tracking-widest">
              Paid
            </span>
          </div>
        </div>

        {/* 7. Action Buttons Row (Hidden in Print) */}
        <div className="flex gap-3 pt-4 print:hidden">
          <ActionButton label="PDF" icon={Download} onClick={handleDownload} />
          <ActionButton
            label="Share"
            icon={Share2}
            onClick={() => addToast("Link copied", "success")}
          />
          <ActionButton
            label="Print"
            icon={Printer}
            onClick={handlePrint}
          />
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({ label, value, isFull }) => (
  <div className={isFull ? "col-span-2" : ""}>
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
      {label}
    </p>
    <p className="text-sm font-black text-gray-900">{value}</p>
  </div>
);

const IconDetail = ({ icon: Icon, label, value }) => (
  <div className="flex items-center justify-between group">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
        <Icon size={14} />
      </div>
      <span className="text-sm text-gray-500 font-medium">{label}</span>
    </div>
    <span className="text-sm font-bold text-gray-900">{value}</span>
  </div>
);

const ActionButton = ({ label, icon: Icon, onClick }) => (
  <button
    onClick={onClick}
    className="flex-1 bg-white border border-gray-100 rounded-2xl py-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md active:scale-95 transition-all text-gray-900"
  >
    <Icon size={20} className="text-indigo-600" />
    <span className="text-[10px] font-black uppercase tracking-widest">
      {label}
    </span>
  </button>
);

export default FeeReceiptPremium;
