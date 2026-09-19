import React, { forwardRef } from 'react';
import schoolLogo from '../../assets/schoollogo.png';

/**
 * MarksheetDocument
 * 
 * Single Authoritative Visual Source of Truth for LFES Marksheet.
 * Shared across:
 * 1. Screen Preview Modal
 * 2. High-Fidelity A4 PDF Generation (html2canvas-pro + jsPDF)
 * 3. Browser Print Media (@media print)
 */
const MarksheetDocument = forwardRef(({ data, className = '', id = 'marksheet-document-root' }, ref) => {
  if (!data) return null;

  const { student, exam, subjects, aggregate, attendance, signatures } = data;

  // Calculate totals
  const totalMax = subjects ? subjects.reduce((sum, s) => sum + (s.maxMarks || 100), 0) : 0;
  const totalPass = subjects ? subjects.reduce((sum, s) => sum + (s.passMarks || 33), 0) : 0;
  const totalObtained = subjects ? subjects.reduce((sum, s) => sum + (s.isAbsent ? 0 : (s.marksObtained || 0)), 0) : 0;
  const totalHalfObtained = subjects ? subjects.reduce((sum, s) => {
    if (s.halfYearlyMarks !== undefined) return sum + s.halfYearlyMarks;
    if (s.isAbsent) return sum;
    return sum + Math.round((s.marksObtained || 0) * 0.9);
  }, 0) : 0;

  return (
    <div
      ref={ref}
      id={id}
      className={`marksheet-print-area marksheet-document bg-white text-[#0F2552] relative overflow-hidden box-border mx-auto ${className}`}
      style={{
        width: '100%',
        maxWidth: '820px',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {/* Double Border Outer Frame */}
      <div className="border-2 border-[#0F2552] p-1.5 relative bg-white">
        <div className="border border-[#C5A059] p-4 sm:p-7 relative space-y-4 bg-[#FAF9F5]/40">
          
          {/* Corner Decorative Ornaments */}
          <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-[#C5A059]"></div>
          <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-[#C5A059]"></div>
          <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-[#C5A059]"></div>
          <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-[#C5A059]"></div>

          {/* 1. Header Registration & Logo Line */}
          <div className="flex items-center justify-between text-xs font-black text-slate-800 font-serif pt-1">
            <div>
              <span>Regd No - 21812312026414131503.</span>
            </div>

            {/* School Emblem Logo */}
            <div className="flex-shrink-0">
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full border-2 border-[#0F2552] bg-white p-1 flex items-center justify-center shadow-xs overflow-hidden">
                <img
                  src={schoolLogo}
                  alt="LFES Logo"
                  className="w-full h-full object-contain"
                  crossOrigin="anonymous"
                />
              </div>
            </div>

            <div>
              <span>Udise Code- 10164102145</span>
            </div>
          </div>

          {/* 2. School Title & Subtitle */}
          <div className="text-center space-y-1.5 pt-1">
            <h1
              className="text-3xl sm:text-4xl font-black tracking-wide text-[#0F2552] uppercase font-serif"
              style={{ fontFamily: "'Cinzel', 'Playfair Display', 'Times New Roman', serif" }}
            >
              LITTLE FLOWER ENGLISH SCHOOL
            </h1>
            <p className="text-xs sm:text-sm font-extrabold tracking-widest text-[#0F2552] uppercase">
              SIWAN BIHAR- 841506
            </p>
          </div>

          {/* 3. Sanskrit Motto Box */}
          <div className="flex justify-center pt-1.5">
            <div className="bg-[#0F2552] px-10 py-1.5 rounded-sm border border-[#C5A059] shadow-xs">
              <span className="text-amber-300 font-extrabold text-sm sm:text-base tracking-widest font-sans">
                "ज्ञानं परमं बलम्"
              </span>
            </div>
          </div>

          {/* 4. Student Info Section (Dotted Underline Fields) */}
          <div className="grid grid-cols-12 gap-y-3.5 gap-x-6 text-xs sm:text-sm pt-3 font-serif">
            {/* Left Column (7 cols / ~58%) */}
            <div className="col-span-7 space-y-2.5">
              <div className="flex items-end">
                <span className="font-extrabold text-[#0F2552] whitespace-nowrap min-w-[120px]">
                  Student's Name :
                </span>
                <span className="flex-1 font-bold text-slate-900 border-b border-dotted border-slate-500 pb-0.5 px-2 uppercase tracking-wide truncate">
                  {student?.fullName || 'ANYA TIWARI'}
                </span>
              </div>

              <div className="flex items-end">
                <span className="font-extrabold text-[#0F2552] whitespace-nowrap min-w-[120px]">
                  Father's Name :
                </span>
                <span className="flex-1 font-bold text-slate-900 border-b border-dotted border-slate-500 pb-0.5 px-2 uppercase tracking-wide truncate">
                  {student?.fatherName || 'RANJEET TIWARI'}
                </span>
              </div>

              <div className="flex items-end">
                <span className="font-extrabold text-[#0F2552] whitespace-nowrap min-w-[120px]">
                  Address :
                </span>
                <span className="flex-1 font-bold text-slate-900 border-b border-dotted border-slate-500 pb-0.5 px-2 uppercase tracking-wide truncate">
                  {student?.address || 'VILL- SIKATIYA, POST -KHAWASPUR 841416'}
                </span>
              </div>
            </div>

            {/* Right Column (5 cols / ~42%) */}
            <div className="col-span-5 space-y-2.5">
              <div className="flex items-end">
                <span className="font-extrabold text-[#0F2552] whitespace-nowrap min-w-[90px]">
                  Class :
                </span>
                <span className="flex-1 font-bold text-slate-900 border-b border-dotted border-slate-500 pb-0.5 px-2 text-center uppercase truncate">
                  {student?.class || 'ONE'}
                </span>
              </div>

              <div className="flex items-end">
                <span className="font-extrabold text-[#0F2552] whitespace-nowrap min-w-[90px]">
                  Roll No :
                </span>
                <span className="flex-1 font-bold text-slate-900 border-b border-dotted border-slate-500 pb-0.5 px-2 text-center">
                  {student?.rollNumber || '25'}
                </span>
              </div>

              <div className="flex items-end">
                <span className="font-extrabold text-[#0F2552] whitespace-nowrap min-w-[90px]">
                  Session :
                </span>
                <span className="flex-1 font-bold text-slate-900 border-b border-dotted border-slate-500 pb-0.5 px-2 text-center">
                  {exam?.session || '2025-26'}
                </span>
              </div>
            </div>
          </div>

          {/* 5. Subject & Marks Table with Background Emblem Watermark */}
          <div className="relative pt-2">
            {/* Background Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.07] pointer-events-none z-0">
              <img
                src={schoolLogo}
                alt="LFES Watermark"
                className="w-64 h-64 object-contain"
                crossOrigin="anonymous"
              />
            </div>

            <table className="w-full text-left border-collapse text-xs relative z-10 border border-slate-300">
              <thead>
                <tr className="bg-[#0F2552] text-white font-extrabold text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3 border border-[#0F2552] w-[35%]">SUBJECT</th>
                  <th className="py-2.5 px-2 border border-[#0F2552] text-center w-[13%]">FULL MARKS</th>
                  <th className="py-2.5 px-2 border border-[#0F2552] text-center w-[13%]">PASS MARKS</th>
                  <th className="py-2.5 px-2 border border-[#0F2552] text-center w-[15%]">
                    HALF YEARLY MARKS OBTAINED
                  </th>
                  <th className="py-2.5 px-2 border border-[#0F2552] text-center w-[15%]">
                    ANNUAL EXAM MARKS OBTAINED
                  </th>
                  <th className="py-2.5 px-2 border border-[#0F2552] text-center w-[14%]">GRAND TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 font-serif">
                {subjects && subjects.length > 0 ? (
                  subjects.map((sub, idx) => (
                    <tr key={sub.subjectId || idx} className="bg-white/80 hover:bg-slate-50/80">
                      <td className="py-2 px-3 border border-slate-300 font-bold text-[#0F2552]">
                        {sub.subjectName}
                      </td>
                      <td className="py-2 px-2 border border-slate-300 text-center font-semibold">
                        {sub.maxMarks || 100}
                      </td>
                      <td className="py-2 px-2 border border-slate-300 text-center font-semibold text-slate-700">
                        {sub.passMarks || 33}
                      </td>
                      <td className="py-2 px-2 border border-slate-300 text-center font-bold text-slate-900">
                        {sub.halfYearlyMarks !== undefined ? sub.halfYearlyMarks : (sub.isAbsent ? 'ABS' : Math.round((sub.marksObtained || 0) * 0.9))}
                      </td>
                      <td className="py-2 px-2 border border-slate-300 text-center font-bold text-slate-900">
                        {sub.isAbsent ? 'ABSENT' : sub.marksObtained}
                      </td>
                      <td className="py-2 px-2 border border-slate-300 text-center font-black text-[#0F2552]">
                        {sub.grandTotal !== undefined ? sub.grandTotal : ((sub.isAbsent ? 0 : (sub.marksObtained || 0)) + Math.round((sub.marksObtained || 0) * 0.9))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-4 text-center text-slate-400 italic">
                      No subject evaluation records available
                    </td>
                  </tr>
                )}

                {/* Table Summary Total Row */}
                <tr className="bg-slate-100 font-black border-t-2 border-[#0F2552] text-slate-900 text-xs">
                  <td className="py-2.5 px-3 border border-slate-300 font-black text-[#0F2552]">
                    TOTAL
                  </td>
                  <td className="py-2.5 px-2 border border-slate-300 text-center">{totalMax}</td>
                  <td className="py-2.5 px-2 border border-slate-300 text-center">{totalPass}</td>
                  <td className="py-2.5 px-2 border border-slate-300 text-center">
                    {totalHalfObtained}
                  </td>
                  <td className="py-2.5 px-2 border border-slate-300 text-center">{totalObtained}</td>
                  <td className="py-2.5 px-2 border border-slate-300 text-center text-[#0F2552]">
                    {totalObtained + totalHalfObtained}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 6. Gold Performance Summary Box */}
          <div className="border border-[#C5A059] bg-[#FAF9F5] p-3 rounded-sm text-xs font-serif shadow-2xs">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="space-y-1">
                <span className="block text-[11px] font-extrabold text-[#0F2552] uppercase tracking-wider">
                  TOTAL Percentage
                </span>
                <div className="border-b border-dotted border-slate-500 pb-0.5 inline-block px-4">
                  <span className="font-extrabold text-sm text-slate-900">
                    {aggregate?.percentage || '77'} %
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="block text-[11px] font-extrabold text-[#0F2552] uppercase tracking-wider">
                  GRADE
                </span>
                <div className="border-b border-dotted border-slate-500 pb-0.5 inline-block px-4">
                  <span className="font-extrabold text-sm text-[#0F2552]">
                    {aggregate?.grade || 'A'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="block text-[11px] font-extrabold text-[#0F2552] uppercase tracking-wider">
                  DIVISION
                </span>
                <div className="border-b border-dotted border-slate-500 pb-0.5 inline-block px-4">
                  <span className="font-extrabold text-sm text-slate-900">
                    {aggregate?.division || 'First'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="block text-[11px] font-extrabold text-[#0F2552] uppercase tracking-wider">
                  ANNUAL ATTENDANCE
                </span>
                <div className="border-b border-dotted border-slate-500 pb-0.5 inline-block px-4">
                  <span className="font-extrabold text-sm text-slate-900">
                    {attendance?.attendancePercentage || '71 %'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 7. Signatures Block */}
          <div className="pt-8 pb-3 grid grid-cols-3 gap-4 text-center text-xs font-serif">
            {/* Class Teacher Signature */}
            <div className="space-y-2">
              <div className="h-10 flex items-end justify-center">
                <span className="font-script italic text-base text-slate-800 font-bold tracking-wide">
                  {signatures?.classTeacher || 'Neha Kumari'}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-1">
                <span className="font-extrabold text-[#0F2552]">Class Teacher</span>
              </div>
            </div>

            {/* Director Signature */}
            <div className="space-y-2">
              <div className="h-10 flex items-end justify-center">
                <span className="font-script italic text-base text-slate-800 font-bold tracking-wide">
                  {signatures?.director || 'Chandra Mohan Tiwari'}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-1">
                <span className="font-extrabold text-[#0F2552]">Director</span>
              </div>
            </div>

            {/* Principal Signature & Stamp */}
            <div className="space-y-2 relative">
              <div className="h-10 flex items-end justify-center relative">
                <span className="font-script italic text-base text-slate-900 font-bold tracking-wide z-10">
                  {signatures?.principal || 'Chandra Mohan Tiwari'}
                </span>
                {/* Stamp Graphic Overlay */}
                <div className="absolute bottom-0 w-24 h-12 border-2 border-indigo-900/40 rounded-full flex flex-col items-center justify-center transform -rotate-6 pointer-events-none opacity-80">
                  <span className="text-[7px] font-black text-indigo-950 uppercase tracking-tighter">Principal</span>
                  <span className="text-[6px] text-indigo-900 text-center leading-tight font-bold">Little Flower English School<br/>Dindayalpur (Siwan)</span>
                </div>
              </div>
              <div className="border-t border-slate-800 pt-1">
                <span className="font-extrabold text-[#0F2552]">Principal</span>
              </div>
            </div>
          </div>

          {/* 8. Footer Bottom Separator & Website */}
          <div className="text-center pt-1 space-y-0.5 text-slate-700 font-serif">
            <div className="text-amber-600 text-xs tracking-widest font-sans">
              ❖ ◆ ❖
            </div>
            <p className="text-[11px] font-bold text-slate-600">
              www.lfessiwan.in
            </p>
          </div>

        </div>
      </div>
    </div>
  );
});

MarksheetDocument.displayName = 'MarksheetDocument';

export default MarksheetDocument;
