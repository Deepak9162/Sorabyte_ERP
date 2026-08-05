/**
 * HomeworkCard Component (Mobile-First 2026 ERP Redesign)
 * --------------------------------------------------------
 * Modern Homework Card UI:
 *  - Teacher Avatar Initials / Photo & Name
 *  - Class & Subject pill badges
 *  - Rounded Status Pills: Pending (Orange), Approved (Green), Rejected (Red), Incharge (Blue)
 *  - Title, description box, attachment button
 *  - Rounded Icon Action Buttons (Approve, Reject, Preview, WhatsApp, Delete) with touch feedback
 */

import React, { useState } from "react";
import {
  BookOpen,
  Calendar,
  Clock,
  User,
  Paperclip,
  Share2,
  Check,
  Edit2,
  Trash2,
  Eye,
  Sparkles,
  CheckCircle2,
  XCircle,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { cn } from "../../utils/cn";

const HomeworkCard = ({
  homework,
  onEdit,
  onDelete,
  onViewHistory,
  onApprove,
  onReject,
  showActions = true,
  className,
}) => {
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!homework) return null;

  // Check if homework date is today
  const isToday = (() => {
    if (!homework.homeworkDate) return false;
    const d = new Date(homework.homeworkDate);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  })();

  // Format creation time or assigned time
  const formattedTime = (() => {
    if (homework.createdAt) {
      const d = new Date(homework.createdAt);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return "";
  })();

  const formattedHwDate = homework.homeworkDate
    ? new Date(homework.homeworkDate).toLocaleDateString("en-GB")
    : "";

  // WhatsApp Copy Action
  const handleCopyWhatsApp = (e) => {
    e?.stopPropagation();
    const classStr = homework.className || "";
    const subjectStr = homework.subjectName || "Subject";
    const dateStr = homework.homeworkDate
      ? new Date(homework.homeworkDate).toLocaleDateString("en-GB")
      : "";
    const dueStr = homework.submissionDate
      ? new Date(homework.submissionDate).toLocaleDateString("en-GB")
      : "";

    const whatsappMessage =
      `📚 *HOMEWORK ASSIGNMENT*\n` +
      `🎓 *Class:* ${classStr}\n` +
      `📖 *Subject:* ${subjectStr}\n` +
      `📅 *Date:* ${dateStr} (Due: ${dueStr})\n` +
      `👨‍🏫 *Teacher:* ${homework.teacherName || ""}\n\n` +
      `📌 *Title:* ${homework.title || ""}\n` +
      `📝 *Instructions:* ${homework.description || ""}\n\n` +
      `_Sent via School ERP_`;

    navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    addToast("Copied! Ready to paste in WhatsApp", "success");
    setTimeout(() => setCopied(false), 2500);
  };

  const getStatusPill = (status) => {
    switch (status) {
      case "Approved":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-700 border border-emerald-200/80 inline-flex items-center gap-1 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Approved
          </span>
        );
      case "Pending Admin":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-orange-100 text-orange-700 border border-orange-200/80 inline-flex items-center gap-1 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            Pending Admin
          </span>
        );
      case "Pending Incharge":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-700 border border-blue-200/80 inline-flex items-center gap-1 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Pending Incharge
          </span>
        );
      case "Rejected":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-700 border border-red-200/80 inline-flex items-center gap-1 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
            {status || "Pending"}
          </span>
        );
    }
  };

  const getTeacherInitials = (name = "") => {
    if (!name) return "T";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div
      className={cn(
        "bg-white rounded-[20px] p-4 sm:p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 space-y-3.5 group relative overflow-hidden",
        isToday && "border-orange-200 bg-gradient-to-br from-orange-50/15 via-white to-white",
        className
      )}
    >
      {/* Header: Teacher Profile, Badges, Status */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          {/* Teacher Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-extrabold text-xs flex items-center justify-center shadow-md shrink-0 border border-white">
            {getTeacherInitials(homework.teacherName)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                {homework.teacherName || "Teacher"}
              </h4>
              {isToday && (
                <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                  Today
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-semibold">
              <span className="text-indigo-600 font-extrabold bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                {homework.className}
              </span>
              <span>•</span>
              <span className="text-orange-600 font-extrabold bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100">
                {homework.subjectName}
              </span>
            </div>
          </div>
        </div>

        {/* Status Pill */}
        <div>{getStatusPill(homework.status)}</div>
      </div>

      {/* Title & Description */}
      <div className="space-y-2">
        <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug group-hover:text-orange-600 transition-colors">
          {homework.title}
        </h3>

        <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line">
          {homework.description}
        </div>

        {/* Attachment Link */}
        {homework.attachment && homework.attachment.filePath && (
          <div className="pt-1">
            <a
              href={homework.attachment.filePath}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200/80 text-xs font-extrabold transition-all shadow-2xs"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>{homework.attachment.fileName || "View Attachment"}</span>
            </a>
          </div>
        )}
      </div>

      {/* Card Footer: Metadata & Quick Icon Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
          {formattedHwDate && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {formattedHwDate}
            </span>
          )}
          {formattedTime && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <Clock className="w-3 h-3" />
              {formattedTime}
            </span>
          )}
        </div>

        {/* Rounded Icon Actions Bar */}
        {showActions && (
          <div className="flex items-center gap-1.5 ml-auto">
            {/* WhatsApp Share Icon Button */}
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              title="Copy to WhatsApp"
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-90 border shadow-2xs",
                copied
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-500 hover:text-white"
              )}
            >
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* Audit History / Preview Icon Button */}
            {onViewHistory && (
              <button
                type="button"
                onClick={() => onViewHistory(homework)}
                title="View Approval History"
                className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-2xs"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}

            {/* Approve Button (If passed) */}
            {onApprove && homework.status !== "Approved" && (
              <button
                type="button"
                onClick={() => onApprove(homework._id)}
                title="Approve Homework"
                className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-2xs"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}

            {/* Reject Button (If passed) */}
            {onReject && homework.status !== "Rejected" && (
              <button
                type="button"
                onClick={() => onReject(homework._id)}
                title="Reject Homework"
                className="w-9 h-9 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-2xs"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}

            {/* Edit Button */}
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(homework)}
                title="Edit Homework"
                className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-500 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-2xs"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}

            {/* Delete Button */}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(homework._id)}
                title="Delete Homework"
                className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-2xs"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeworkCard;
