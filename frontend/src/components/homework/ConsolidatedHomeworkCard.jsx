import React, { useState } from 'react';
import { Copy, Check, FileDown, Lock, ShieldAlert, Sparkles, BookOpen } from 'lucide-react';
import Button from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import jsPDF from 'jspdf';

const ConsolidatedHomeworkCard = ({ consolidatedData, loading }) => {
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-xs flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <p className="text-xs font-semibold text-gray-500">Loading consolidated homework summary...</p>
        </div>
      </div>
    );
  }

  if (!consolidatedData || !consolidatedData.homeworks || consolidatedData.homeworks.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-xs text-center space-y-3 min-h-[250px] flex flex-col items-center justify-center">
        <BookOpen className="w-10 h-10 text-gray-300" />
        <h3 className="text-sm font-bold text-gray-800">No Homework Found for Selected Date</h3>
        <p className="text-xs text-gray-500 max-w-sm">
          No homework submissions have been recorded for this class and date yet.
        </p>
      </div>
    );
  }

  const { classInfo, dateFormatted, isUnlocked, stats, formattedText, homeworks } = consolidatedData;

  const handleCopyWhatsApp = () => {
    if (!isUnlocked) {
      addToast('Copy is locked until all subject homework entries are Final Approved by Admin.', 'error');
      return;
    }

    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    addToast('Consolidated homework copied to clipboard! Paste directly into WhatsApp.', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadPDF = () => {
    if (!isUnlocked) {
      addToast('PDF download is locked until all subject homework entries are Final Approved by Admin.', 'error');
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Styling parameters
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let yPos = 20;

      // School Header Banner
      doc.setFillColor(249, 115, 22); // Orange primary
      doc.rect(0, 0, pageWidth, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('LITTLE FLOWER ENGLISH SCHOOL', pageWidth / 2, 12, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('DAILY HOMEWORK SUMMARY', pageWidth / 2, 19, { align: 'center' });

      yPos = 38;

      // Class Metadata Info Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, yPos, contentWidth, 18, 3, 3, 'FD');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`Class: ${classInfo.name}${classInfo.section ? ' - ' + classInfo.section : ''}`, margin + 5, yPos + 11);

      doc.text(`Date: ${dateFormatted}`, pageWidth - margin - 5, yPos + 11, { align: 'right' });

      yPos += 26;

      // Homework Subjects Breakdown
      homeworks.forEach((hw, idx) => {
        // Check for page overflow
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }

        // Subject Header Strip
        doc.setFillColor(238, 242, 255); // Indigo light
        doc.setDrawColor(199, 210, 254);
        doc.roundedRect(margin, yPos, contentWidth, 8, 2, 2, 'FD');

        doc.setTextColor(67, 56, 202); // Indigo text
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`${idx + 1}. ${hw.subjectName.toUpperCase()}`, margin + 4, yPos + 5.5);

        yPos += 12;

        // Homework Description Lines
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);

        const splitDescription = doc.splitTextToSize(hw.description.trim(), contentWidth - 8);
        doc.text(splitDescription, margin + 4, yPos);

        yPos += splitDescription.length * 5.5 + 8;
      });

      // Footer Signoff
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }

      yPos += 6;
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, yPos, pageWidth - margin, yPos);

      yPos += 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text('Regards,', margin, yPos);

      yPos += 5;
      doc.text('Little Flower English School', margin, yPos);

      yPos += 10;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated by Little Flower ERP • ${new Date().toLocaleString('en-GB')}`, pageWidth / 2, yPos, { align: 'center' });

      // Save PDF document
      const filename = `Homework_${classInfo.name}_${dateFormatted.replace(/ /g, '_')}.pdf`;
      doc.save(filename);
      addToast('Homework PDF generated and downloaded successfully!', 'success');
    } catch (err) {
      console.error('PDF Generation Error:', err);
      addToast('Failed to generate PDF document.', 'error');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-0">
      {/* Header & Lock Status */}
      <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-orange-600 tracking-wider">Consolidated Homework</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {stats.totalSubjectsSubmitted} Subjects Submitted
            </span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mt-0.5">
            Class {classInfo.name} {classInfo.section ? `(${classInfo.section})` : ''} • {dateFormatted}
          </h2>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleCopyWhatsApp}
            disabled={!isUnlocked}
            className="w-full md:w-auto justify-center bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy to WhatsApp'}
          </Button>
        </div>
      </div>

      {/* Subject Status Chips */}
      <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider mr-2">Submitted Subjects:</span>
        {homeworks.map((hw) => (
          <span
            key={hw._id}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-200"
          >
            <span className="font-bold">{hw.subjectName}</span>
            <span className="text-[10px] uppercase font-bold text-emerald-600">✓ Added</span>
          </span>
        ))}
      </div>

      {/* Visual Subject Homework Cards Section */}
      <div className="p-5 border-b border-gray-100 space-y-3 bg-gray-50/30">
        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
          <span>Subject-Wise Homework Summary ({homeworks.length} Subjects)</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {homeworks.map((hw) => (
            <div key={hw._id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-2xs space-y-2 relative group hover:border-orange-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                  {hw.subjectName}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  hw.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  hw.status === 'Pending Admin' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  hw.status === 'Pending Incharge' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {hw.status}
                </span>
              </div>

              {hw.title && hw.title.trim() && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400">Topic / Book Reading:</span>
                  <p className="text-xs font-bold text-gray-900 leading-snug">{hw.title}</p>
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400">Task Details:</span>
                <p className="text-xs font-medium text-gray-800 leading-relaxed bg-gray-50 p-2.5 rounded-lg border border-gray-100 mt-0.5">
                  {hw.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-gray-500 border-t border-gray-100">
                <span>Teacher: <span className="font-semibold text-gray-700">{hw.teacherName}</span></span>
                <span>Type: <span className="font-semibold text-gray-700">{hw.homeworkType || 'Assignment'}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WhatsApp Formatted Text Preview */}
      <div className="p-5">
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>WhatsApp Formatted Message Preview</span>
          {isUnlocked && <span className="text-emerald-600 font-semibold flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Ready to Copy</span>}
        </label>
        <div className="relative">
          <textarea
            readOnly
            rows={12}
            value={formattedText}
            className="w-full p-4 rounded-xl border border-gray-200 font-mono text-xs text-gray-800 bg-gray-50/80 focus:outline-none resize-none leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
};

export default ConsolidatedHomeworkCard;
