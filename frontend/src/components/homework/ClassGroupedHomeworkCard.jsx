/**
 * ClassGroupedHomeworkCard Component (Mobile-First Ergonomic Edition)
 * ------------------------------------------------------------------
 * Clean, high-density class homework card optimized for mobile & desktop:
 *  - Mobile Header: Sleek 2-line layout with Class badge, date, subject count & WhatsApp Copy
 *  - Subject Pills: Horizontal scrollable tag strip
 *  - Mobile Content: Clean micro-cards with large touch targets
 *  - Desktop Content: High-density compact table
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
        "bg-white rounded-2xl border border-gray-200/90 shadow-2xs transition-all duration-150 overflow-hidden",
        isToday && "border-indigo-200/90 bg-gradient-to-r from-indigo-50/10 via-white to-white",
        className
      )}
    >
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded((v) => !v)}
        className="p-3 sm:p-3.5 bg-slate-50/80 hover:bg-slate-100/70 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 cursor-pointer select-none transition-colors"
      >
        {/* Mobile Header Line 1 */}
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black uppercase text-indigo-700 bg-white px-2.5 py-0.5 rounded-xl border border-indigo-200 shadow-2xs">
              {classLabel}
            </span>

            <span className="text-[11px] sm:text-xs font-bold text-gray-700 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-xl border border-emerald-200">
              {homeworks.length} {homeworks.length === 1 ? "Subject" : "Subjects"}
            </span>

            {isToday && (
              <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-0.5">
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
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 transition-colors sm:hidden"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Mobile Header Line 2: Date & Copy Button */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          <span className="text-[11px] sm:text-xs text-gray-500 font-semibold">
            {formattedHwDate} (Due: <span className="text-indigo-600 font-bold">{formattedDueDate}</span>)
          </span>

          <button
            type="button"
            onClick={handleCopyAllWhatsApp}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-98 shrink-0",
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
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors hidden sm:block"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Submitted Subjects Pills */}
      <div className="px-3 py-2 bg-gray-50/50 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">
          Subjects:
        </span>
        {homeworks.map((hw) => (
          <span
            key={hw._id}
            className="px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shrink-0"
          >
            {hw.subjectName} <span className="text-emerald-600">✓</span>
          </span>
        ))}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-2">
          {/* Desktop Table View (≥ md) */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100 bg-white">
            <table className="w-full text-left text-xs text-gray-800">
              <thead className="bg-gray-50/80 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="py-2 px-3">Subject</th>
                  <th className="py-2 px-3">Topic / Title</th>
                  <th className="py-2 px-3">Instructions / Task Details</th>
                  <th className="py-2 px-3">Teacher</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {homeworks.map((hw) => (
                  <tr key={hw._id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-2 px-3 font-black whitespace-nowrap">
                      <span className="text-[11px] uppercase font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                        {hw.subjectName}
                      </span>
                    </td>

                    <td className="py-2 px-3 max-w-[150px] font-bold text-gray-900 truncate">
                      {hw.title || "—"}
                    </td>

                    <td className="py-2 px-3 max-w-md">
                      <p className="text-xs text-gray-700 font-medium line-clamp-2 leading-relaxed">
                        {hw.description}
                      </p>
                      {hw.attachment && hw.attachment.filePath && (
                        <a
                          href={hw.attachment.filePath}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 hover:underline mt-0.5"
                        >
                          <Paperclip className="w-3 h-3" />
                          {hw.attachment.fileName || "Attachment"}
                        </a>
                      )}
                    </td>

                    <td className="py-2 px-3 font-semibold text-gray-600 whitespace-nowrap">
                      {hw.teacherName}
                    </td>

                    <td className="py-2 px-3 text-right whitespace-nowrap space-x-1">
                      <button
                        type="button"
                        onClick={(e) => handleCopySingleWhatsApp(hw, e)}
                        className={cn(
                          "px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors inline-flex items-center gap-1 cursor-pointer",
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
                          className="p-1 rounded-lg border border-gray-200 text-gray-500 hover:text-indigo-600 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(hw)}
                          className="p-1 rounded-lg border border-orange-200 text-orange-600 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(hw._id)}
                          className="p-1 rounded-lg border border-rose-200 text-rose-600 transition-colors"
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
          <div className="md:hidden space-y-2">
            {homeworks.map((hw) => (
              <div
                key={hw._id}
                className="bg-white rounded-xl p-3 border border-gray-200/80 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                    {hw.subjectName}
                  </span>

                  <span className="text-[10px] font-bold text-gray-400">
                    {hw.teacherName}
                  </span>
                </div>

                {hw.title && (
                  <h4 className="text-xs font-bold text-gray-900 leading-tight">
                    {hw.title}
                  </h4>
                )}

                <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 text-xs font-medium text-gray-800 leading-relaxed">
                  {hw.description}
                </div>

                {hw.attachment && hw.attachment.filePath && (
                  <a
                    href={hw.attachment.filePath}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 hover:underline"
                  >
                    <Paperclip className="w-3 h-3" />
                    {hw.attachment.fileName || "Attachment"}
                  </a>
                )}

                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={(e) => handleCopySingleWhatsApp(hw, e)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors inline-flex items-center gap-1 cursor-pointer",
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
                      className="p-1 rounded-lg border border-gray-200 text-gray-500 hover:text-indigo-600 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(hw)}
                      className="p-1 rounded-lg border border-orange-200 text-orange-600 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(hw._id)}
                      className="p-1 rounded-lg border border-rose-200 text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
