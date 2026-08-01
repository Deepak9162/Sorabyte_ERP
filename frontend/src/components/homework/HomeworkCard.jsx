/**
 * HomeworkCard Component
 * ------------------------------------------------
 * Modern Homework Card UI:
 *  - Subject, Class, Section, & Status badges
 *  - Green "Today" badge if assigned today
 *  - Teacher name & assigned time
 *  - Title, description, attachment link
 *  - WhatsApp Copy Button with "Copied!" feedback
 *  - Edit/Delete action triggers
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
  AlertCircle,
} from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { cn } from "../../utils/cn";

const HomeworkCard = ({
  homework,
  onEdit,
  onDelete,
  onViewHistory,
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

  // WhatsApp Copy Action
  const handleCopyWhatsApp = () => {
    const classStr = `${homework.className || ""}${
      homework.section ? ` (${homework.section})` : ""
    }`;
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

  const getStatusBadge = (status) => {
    switch (status) {
      case "Approved":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Active
          </span>
        );
      case "Pending Admin":
      case "Pending Incharge":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
            Pending Review
          </span>
        );
      case "Rejected":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-gray-50 text-gray-700 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div
      className={cn(
        "bg-white/95 backdrop-blur-xs rounded-2xl p-4 sm:p-5 border border-gray-200/90 shadow-xs hover:shadow-md transition-all duration-200 space-y-3.5 group relative",
        isToday && "border-indigo-200 bg-gradient-to-br from-indigo-50/20 to-white",
        className
      )}
    >
      {/* Top Header: Class, Subject, Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Class Badge */}
          <span className="text-xs font-black uppercase text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100">
            {homework.className} {homework.section ? `(${homework.section})` : ""}
          </span>

          {/* Subject Badge */}
          <span className="text-xs font-extrabold uppercase text-orange-600 bg-orange-50 px-2.5 py-1 rounded-xl border border-orange-100">
            {homework.subjectName}
          </span>

          {/* Today Badge */}
          {isToday && (
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/90 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Today
            </span>
          )}
        </div>

        {/* Status Badge */}
        <div>{getStatusBadge(homework.status)}</div>
      </div>

      {/* Title & Description */}
      <div className="space-y-1.5">
        <h3 className="text-sm sm:text-base font-black text-gray-900 leading-snug group-hover:text-indigo-600 transition-colors">
          {homework.title}
        </h3>

        <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100/80 text-xs sm:text-sm text-gray-700 leading-relaxed font-medium whitespace-pre-line">
          {homework.description}
        </div>

        {/* Attachment */}
        {homework.attachment && homework.attachment.filePath && (
          <div className="pt-1">
            <a
              href={homework.attachment.filePath}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 text-xs font-bold transition-all"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>{homework.attachment.fileName || "View Attachment"}</span>
            </a>
          </div>
        )}
      </div>

      {/* Meta Details: Teacher & Timestamps */}
      <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100 gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-semibold text-gray-700">
            <User className="w-3.5 h-3.5 text-gray-400" />
            {homework.teacherName}
          </span>
          {formattedTime && (
            <span className="flex items-center gap-1 text-[11px] text-gray-400">
              <Clock className="w-3 h-3" />
              {formattedTime}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] font-semibold text-gray-600">
          <span>
            Assigned:{" "}
            <span className="font-bold text-gray-800">
              {homework.homeworkDate
                ? new Date(homework.homeworkDate).toLocaleDateString("en-GB")
                : ""}
            </span>
          </span>
          <span>
            Due:{" "}
            <span className="font-bold text-indigo-700">
              {homework.submissionDate
                ? new Date(homework.submissionDate).toLocaleDateString("en-GB")
                : ""}
            </span>
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          {/* WhatsApp Copy Button */}
          <button
            type="button"
            onClick={handleCopyWhatsApp}
            className={cn(
              "flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98",
              copied
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            )}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp Copy</span>
              </>
            )}
          </button>

          {/* Optional View History */}
          {onViewHistory && (
            <button
              type="button"
              onClick={() => onViewHistory(homework)}
              className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-indigo-600 transition-all cursor-pointer"
              title="Audit History"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}

          {/* Optional Edit */}
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(homework)}
              className="p-2 rounded-xl border border-orange-200 text-orange-600 hover:bg-orange-100 transition-all cursor-pointer"
              title="Edit Homework"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}

          {/* Optional Delete */}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(homework._id)}
              className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-100 transition-all cursor-pointer"
              title="Delete Homework"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default HomeworkCard;
