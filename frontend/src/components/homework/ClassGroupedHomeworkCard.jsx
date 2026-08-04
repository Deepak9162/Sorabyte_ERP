/**
 * ClassGroupedHomeworkCard Component (Mobile-First Ergonomic Edition 2026)
 * ------------------------------------------------------------------
 * Clean, high-density class homework card optimized for mobile & desktop:
 *  - Header: Sleek 2-line layout with Class badge, date, subject count & WhatsApp Copy
 *  - Subject Pills: Horizontal scrollable tag strip
 *  - Mobile Content: Clean micro-cards with teacher avatars & rounded action icons
 *  - Desktop Content: Compact SaaS table with status pills & action triggers
 */

import React, { useState } from "react";
import {
  Share2,
  Check,
  Calendar,
  Clock,
  User,
  Paperclip,
  Edit2,
  Trash2,
  Eye,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { cn } from "../../utils/cn";

const ClassGroupedHomeworkCard = ({
  group,
  onEdit,
  onDelete,
  onViewHistory,
  showActions = true,
  className,
}) => {
  const { addToast } = useToast();
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSubjectId, setCopiedSubjectId] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);

  if (!group || !group.homeworks || group.homeworks.length === 0) return null;

  const { className: clsName, section, homeworkDate, submissionDate, homeworks } = group;

  const classLabel = `${clsName || ""}${section ? ` (${section})` : ""}`;
  const formattedHwDate = homeworkDate
    ? new Date(homeworkDate).toLocaleDateString("en-GB")
    : "";
  const formattedDueDate = submissionDate
    ? new Date(submissionDate).toLocaleDateString("en-GB")
    : "";

  const isToday = (() => {
    if (!homeworkDate) return false;
    const d = new Date(homeworkDate);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  })();

  const getTeacherInitials = (name = "") => {
    if (!name) return "T";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getStatusPill = (status) => {
    switch (status) {
      case "Approved":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200">
            Approved
          </span>
        );
      case "Pending Admin":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-700 border border-orange-200">
            Pending Admin
          </span>
        );
      case "Pending Incharge":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 border border-blue-200">
            Pending Incharge
          </span>
        );
      case "Rejected":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 border border-red-200">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
            {status || "Pending"}
          </span>
        );
    }
  };

  // 1-Click Copy ALL Subjects for this Class to WhatsApp
  const handleCopyAllWhatsApp = (e) => {
    e?.stopPropagation();
    let msg =
      `📚 *LITTLE FLOWER ENGLISH SCHOOL*\n` +
      `🏫 *Class:* ${classLabel}\n` +
      `📅 *Date:* ${formattedHwDate} (Due: ${formattedDueDate})\n\n` +
      `----------------------------------------\n`;

    homeworks.forEach((hw, idx) => {
      msg +=
        `📖 *${(hw.subjectName || "SUBJECT").toUpperCase()}*\n` +
        (hw.title ? `📌 *Topic:* ${hw.title}\n` : "") +
        `📝 *Task:* ${hw.description}\n` +
        `👨‍🏫 *Teacher:* ${hw.teacherName || ""}\n`;

      if (idx < homeworks.length - 1) {
        msg += `----------------------------------------\n`;
      }
    });

    msg += `\n_Sent via School ERP_`;

    navigator.clipboard.writeText(msg);
    setCopiedAll(true);
    addToast(`Copied all ${homeworks.length} subjects for ${classLabel}!`, "success");
    setTimeout(() => setCopiedAll(false), 3000);
  };

  // Copy Single Subject to WhatsApp
  const handleCopySingleWhatsApp = (hw, e) => {
    e?.stopPropagation();
    const msg =
      `📚 *HOMEWORK ASSIGNMENT*\n` +
      `🎓 *Class:* ${classLabel}\n` +
      `📖 *Subject:* ${hw.subjectName}\n` +
      `📅 *Date:* ${formattedHwDate} (Due: ${formattedDueDate})\n` +
      `👨‍🏫 *Teacher:* ${hw.teacherName || ""}\n\n` +
      (hw.title ? `📌 *Topic:* ${hw.title}\n` : "") +
      `📝 *Instructions:* ${hw.description}\n\n` +
      `_Sent via School ERP_`;

    navigator.clipboard.writeText(msg);
    setCopiedSubjectId(hw._id);
    addToast(`Copied ${hw.subjectName} homework!`, "success");
    setTimeout(() => setCopiedSubjectId(null), 2500);
  };

  return (
    <div
      className={cn(
        "bg-white rounded-[20px] border border-slate-200/90 shadow-2xs transition-all duration-150 overflow-hidden",
        isToday && "border-orange-200/90 bg-gradient-to-r from-orange-50/10 via-white to-white",
        className
      )}
    >
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded((v) => !v)}
        className="p-3.5 sm:p-4 bg-slate-50/80 hover:bg-slate-100/70 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 cursor-pointer select-none transition-colors"
      >
        {/* Mobile Header Line 1 */}
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black uppercase text-orange-700 bg-orange-50 px-3 py-1 rounded-xl border border-orange-200/80 shadow-2xs">
              {classLabel}
            </span>

            <span className="text-[11px] sm:text-xs font-extrabold text-slate-700 bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-xl border border-emerald-200">
              {homeworks.length} {homeworks.length === 1 ? "Subject" : "Subjects"}
            </span>

            {isToday && (
              <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                Today
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((v) => !v);
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 transition-colors sm:hidden"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Mobile Header Line 2: Date & Copy Button */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <span className="text-[11px] sm:text-xs text-slate-500 font-semibold">
            {formattedHwDate} (Due: <span className="text-orange-600 font-extrabold">{formattedDueDate}</span>)
          </span>

          <button
            type="button"
            onClick={handleCopyAllWhatsApp}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 shrink-0",
              copiedAll
                ? "bg-emerald-600 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
            )}
          >
            {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedAll ? "Copied All!" : "Copy All"}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((v) => !v);
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors hidden sm:block"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Submitted Subjects Pills */}
      <div className="px-3.5 py-2 bg-slate-50/40 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
          Subjects:
        </span>
        {homeworks.map((hw) => (
          <span
            key={hw._id}
            className="px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shrink-0"
          >
            {hw.subjectName} <span className="text-emerald-600">✓</span>
          </span>
        ))}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-2.5">
          {/* Desktop SaaS Table View (≥ md) */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-100 bg-white">
            <table className="w-full text-left text-xs text-slate-800">
              <thead className="bg-slate-50/80 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3.5">Subject</th>
                  <th className="py-2.5 px-3.5">Topic / Title</th>
                  <th className="py-2.5 px-3.5">Instructions / Details</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5">Teacher</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {homeworks.map((hw) => (
                  <tr key={hw._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3.5 font-black whitespace-nowrap">
                      <span className="text-[11px] uppercase font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100">
                        {hw.subjectName}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 max-w-[150px] font-bold text-slate-900 truncate">
                      {hw.title || "—"}
                    </td>

                    <td className="py-2.5 px-3.5 max-w-md">
                      <p className="text-xs text-slate-700 font-medium line-clamp-2 leading-relaxed">
                        {hw.description}
                      </p>
                      {hw.attachment && hw.attachment.filePath && (
                        <a
                          href={hw.attachment.filePath}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-extrabold text-orange-600 hover:underline mt-0.5"
                        >
                          <Paperclip className="w-3 h-3" />
                          {hw.attachment.fileName || "Attachment"}
                        </a>
                      )}
                    </td>

                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      {getStatusPill(hw.status)}
                    </td>

                    <td className="py-2.5 px-3.5 font-semibold text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-[10px] font-black flex items-center justify-center">
                          {getTeacherInitials(hw.teacherName)}
                        </div>
                        <span>{hw.teacherName}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap space-x-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleCopySingleWhatsApp(hw, e)}
                        className={cn(
                          "px-2.5 py-1 rounded-xl text-[11px] font-extrabold border transition-all inline-flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs",
                          copiedSubjectId === hw._id
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        )}
                      >
                        {copiedSubjectId === hw._id ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Share2 className="w-3 h-3 text-emerald-600" />
                        )}
                        <span>Copy</span>
                      </button>

                      {onViewHistory && (
                        <button
                          type="button"
                          onClick={() => onViewHistory(hw)}
                          className="w-8 h-8 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all inline-flex items-center justify-center cursor-pointer active:scale-95"
                          title="View History"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(hw)}
                          className="w-8 h-8 rounded-xl border border-orange-200 bg-orange-50/50 text-orange-600 hover:bg-orange-100 transition-all inline-flex items-center justify-center cursor-pointer active:scale-95"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(hw._id)}
                          className="w-8 h-8 rounded-xl border border-rose-200 bg-rose-50/50 text-rose-600 hover:bg-rose-100 transition-all inline-flex items-center justify-center cursor-pointer active:scale-95"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Compact Mobile List View (< md) */}
          <div className="md:hidden space-y-2.5">
            {homeworks.map((hw) => (
              <div
                key={hw._id}
                className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-lg border border-orange-100">
                      {hw.subjectName}
                    </span>
                    {getStatusPill(hw.status)}
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                    <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-[9px] font-black flex items-center justify-center">
                      {getTeacherInitials(hw.teacherName)}
                    </div>
                    <span>{hw.teacherName}</span>
                  </div>
                </div>

                {hw.title && (
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight">
                    {hw.title}
                  </h4>
                )}

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs font-medium text-slate-800 leading-relaxed">
                  {hw.description}
                </div>

                {hw.attachment && hw.attachment.filePath && (
                  <a
                    href={hw.attachment.filePath}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-extrabold text-orange-600 hover:underline"
                  >
                    <Paperclip className="w-3 h-3" />
                    {hw.attachment.fileName || "Attachment"}
                  </a>
                )}

                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={(e) => handleCopySingleWhatsApp(hw, e)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all inline-flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs",
                      copiedSubjectId === hw._id
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    )}
                  >
                    {copiedSubjectId === hw._id ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    <span>Copy</span>
                  </button>

                  {onViewHistory && (
                    <button
                      type="button"
                      onClick={() => onViewHistory(hw)}
                      className="w-8 h-8 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}

                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(hw)}
                      className="w-8 h-8 rounded-xl border border-orange-200 text-orange-600 bg-orange-50/50 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}

                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(hw._id)}
                      className="w-8 h-8 rounded-xl border border-rose-200 text-rose-600 bg-rose-50/50 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassGroupedHomeworkCard;
