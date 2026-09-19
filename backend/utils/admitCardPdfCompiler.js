/**
 * Admit Card & Date Sheet PDF Compiler Utility
 * 
 * Uses PDFKit to stream production-ready A4 PDFs directly to output response stream.
 * Supports:
 * 1. Class Date Sheet PDF (A4 Portrait)
 * 2. Individual & Bulk Student Admit Cards PDF (A4 Portrait, 1 page per student)
 */

const PDFDocument = require('pdfkit');
const Exam = require('../models/Exam');
const Class = require('../models/Class');
const Student = require('../models/Student');
const InstituteSettings = require('../models/InstituteSettings');

/**
 * Draw a single student Admit Card on a PDFKit document
 */
const drawSingleAdmitCard = (doc, { institute, student, exam, schedule, instructions }) => {
  // 1. Top Primary Accent Strip
  doc.rect(30, 20, 535, 4).fill('#ea580c'); // Primary Orange

  // 2. School Header Branding
  doc.fillColor('#0f172a')
     .fontSize(16)
     .font('Helvetica-Bold')
     .text(institute?.schoolName || 'LITTLE FLOWER ENGLISH SCHOOL', 30, 30, { align: 'center' });

  doc.fillColor('#64748b')
     .fontSize(8)
     .font('Helvetica-Oblique')
     .text(`${institute?.address || 'Main Road, Siwan, Bihar'} • Affiliation: ${institute?.affiliation || 'CBSE'}`, 30, 49, { align: 'center' });

  // 3. Document Title Banner
  doc.rect(30, 62, 535, 20).fill('#0f172a');
  doc.fillColor('#ffffff')
     .fontSize(10)
     .font('Helvetica-Bold')
     .text(`OFFICIAL ADMIT CARD — ${exam?.name?.toUpperCase()} (${exam?.session})`, 30, 67, { align: 'center' });

  // 4. Student Details Card Box
  doc.rect(30, 88, 415, 80).fillAndStroke('#f8fafc', '#e2e8f0');

  doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold');

  // Column 1
  doc.text('Student Name:', 40, 96);
  doc.font('Helvetica').text(student?.fullName || '-', 115, 96);

  doc.font('Helvetica-Bold').text("Father's Name:", 40, 112);
  doc.font('Helvetica').text(student?.fatherName || '-', 115, 112);

  doc.font('Helvetica-Bold').text("Mother's Name:", 40, 128);
  doc.font('Helvetica').text(student?.motherName || '-', 115, 128);

  doc.font('Helvetica-Bold').text('Admission No:', 40, 144);
  doc.font('Helvetica').text(student?.admissionNumber || '-', 115, 144);

  // Column 2
  doc.font('Helvetica-Bold').text('Roll Number:', 260, 96);
  doc.font('Helvetica').text(student?.rollNumber || '-', 335, 96);

  doc.font('Helvetica-Bold').text('Class & Sec:', 260, 112);
  doc.font('Helvetica').text(`${student?.className || student?.class?.name || ''} - ${student?.section || 'A'}`, 335, 112);

  doc.font('Helvetica-Bold').text('Session:', 260, 128);
  doc.font('Helvetica').text(exam?.session || '2026-2027', 335, 128);

  doc.font('Helvetica-Bold').text('Student ID:', 260, 144);
  doc.font('Helvetica').text(student?.studentId || student?.admissionNumber || '-', 335, 144);

  // Photo Box (Right Column)
  doc.rect(455, 88, 110, 80).fillAndStroke('#ffffff', '#cbd5e1');
  doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica').text('PASTE / PRINT\nSTUDENT PHOTO', 460, 118, { width: 100, align: 'center' });

  // 5. Exam Date Sheet Table Header
  let y = 178;
  doc.rect(30, y, 535, 18).fill('#0f172a');
  doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');

  doc.text('#', 35, y + 5, { width: 25, align: 'center' });
  doc.text('EXAM DATE & DAY', 65, y + 5, { width: 150 });
  doc.text('SUBJECT NAME', 220, y + 5, { width: 150 });
  doc.text('TIMINGS', 375, y + 5, { width: 110, align: 'center' });
  doc.text('REPORTING', 490, y + 5, { width: 70, align: 'center' });

  y += 18;

  // 6. Exam Date Sheet Table Rows
  if (schedule && schedule.length > 0) {
    schedule.forEach((item, idx) => {
      const bgColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(30, y, 535, 16).fillAndStroke(bgColor, '#e2e8f0');

      const dt = new Date(item.examDate);
      const dateStr = !isNaN(dt.getTime())
        ? dt.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
        : '-';

      doc.fillColor('#334155').fontSize(7.5).font('Helvetica');
      doc.text((idx + 1).toString(), 35, y + 4, { width: 25, align: 'center' });
      doc.font('Helvetica-Bold').fillColor('#0f172a').text(dateStr, 65, y + 4, { width: 150 });
      doc.font('Helvetica-Bold').fillColor('#ea580c').text(item.subject?.name || 'Subject', 220, y + 4, { width: 150 });
      doc.font('Helvetica').fillColor('#334155').text(`${item.startTime || '09:00 AM'} - ${item.endTime || '12:00 PM'}`, 375, y + 4, { width: 110, align: 'center' });
      doc.font('Helvetica-Bold').fillColor('#475569').text(item.reportingTime || '08:30 AM', 490, y + 4, { width: 70, align: 'center' });

      y += 16;
    });
  } else {
    doc.rect(30, y, 535, 20).fillAndStroke('#ffffff', '#e2e8f0');
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica-Oblique').text('No subject schedule items configured.', 40, y + 6);
    y += 20;
  }

  y += 10;

  // 7. Examination Instructions Box
  doc.rect(30, y, 535, 55).fillAndStroke('#fffbebe6', '#fef3c7');
  doc.fillColor('#78350f').fontSize(8).font('Helvetica-Bold').text('IMPORTANT EXAMINATION INSTRUCTIONS:', 40, y + 6);
  doc.fillColor('#1e293b').fontSize(7).font('Helvetica').text(
    instructions || '1. Report 30 minutes before exam commencement.\n2. Carry your official printed Admit Card to the examination hall.\n3. Mobile phones and electronic gadgets are strictly prohibited.',
    40,
    y + 18,
    { width: 515 }
  );

  y += 65;

  // 8. Signatures Block
  doc.moveTo(40, y + 25).lineTo(170, y + 25).strokeColor('#94a3b8').stroke();
  doc.moveTo(215, y + 25).lineTo(345, y + 25).strokeColor('#94a3b8').stroke();
  doc.moveTo(395, y + 25).lineTo(535, y + 25).strokeColor('#94a3b8').stroke();

  doc.fillColor('#334155').fontSize(7.5).font('Helvetica-Bold');
  doc.text('Student Signature', 40, y + 29, { width: 130, align: 'center' });
  doc.text('Class Teacher Signature', 215, y + 29, { width: 130, align: 'center' });
  doc.text('Director / Principal Signature', 395, y + 29, { width: 140, align: 'center' });

  doc.fillColor('#94a3b8').fontSize(7).font('Helvetica').text(`Issued by LFES School ERP • Date: ${new Date().toLocaleDateString()}`, 30, y + 42, { width: 535, align: 'center' });
};

/**
 * 1. Compile Class Date Sheet PDF Stream
 */
const compileDateSheetPdf = async (data, outStream) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });

      outStream.on('finish', resolve);
      outStream.on('error', reject);
      doc.pipe(outStream);

      const { institute, exam, schedule, instructions } = data;

      // School Branding Header
      doc.rect(30, 20, 535, 4).fill('#ea580c');
      doc.fillColor('#0f172a').fontSize(18).font('Helvetica-Bold').text(institute?.schoolName || 'LITTLE FLOWER ENGLISH SCHOOL', 30, 32, { align: 'center' });
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Oblique').text(`${institute?.address || 'Main Road, Siwan, Bihar'} • Affiliation: ${institute?.affiliation || 'CBSE'}`, 30, 53, { align: 'center' });

      // Title Banner
      doc.rect(30, 68, 535, 22).fill('#0f172a');
      doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text(`EXAMINATION DATE SHEET — ${exam?.name?.toUpperCase()} (${exam?.session})`, 30, 73, { align: 'center' });

      // Table Header
      let y = 100;
      doc.rect(30, y, 535, 20).fill('#0f172a');
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
      doc.text('#', 35, y + 6, { width: 30, align: 'center' });
      doc.text('EXAM DATE & DAY', 70, y + 6, { width: 160 });
      doc.text('SUBJECT NAME', 235, y + 6, { width: 160 });
      doc.text('TIMINGS', 400, y + 6, { width: 160, align: 'center' });

      y += 20;

      // Table Rows
      if (schedule && schedule.length > 0) {
        schedule.forEach((item, idx) => {
          const bgColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
          doc.rect(30, y, 535, 18).fillAndStroke(bgColor, '#e2e8f0');

          const dt = new Date(item.examDate);
          const dateStr = !isNaN(dt.getTime())
            ? dt.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })
            : '-';

          doc.fillColor('#334155').fontSize(8).font('Helvetica');
          doc.text((idx + 1).toString(), 35, y + 5, { width: 30, align: 'center' });
          doc.font('Helvetica-Bold').fillColor('#0f172a').text(dateStr, 70, y + 5, { width: 160 });
          doc.font('Helvetica-Bold').fillColor('#ea580c').text(item.subject?.name || 'Subject', 235, y + 5, { width: 160 });
          doc.font('Helvetica').fillColor('#334155').text(`${item.startTime || '09:00 AM'} - ${item.endTime || '12:00 PM'}`, 400, y + 5, { width: 160, align: 'center' });

          y += 18;
        });
      }

      y += 15;
      doc.rect(30, y, 535, 50).fillAndStroke('#fffbebe6', '#fef3c7');
      doc.fillColor('#78350f').fontSize(8.5).font('Helvetica-Bold').text('INSTRUCTIONS:', 40, y + 6);
      doc.fillColor('#1e293b').fontSize(7.5).font('Helvetica').text(instructions || 'Report on time.', 40, y + 18, { width: 515 });

      doc.end();
      resolve();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * 2. Compile Bulk Class Admit Cards PDF Stream (Multi-page, 1 per student)
 */
const compileBulkAdmitCardsPdf = async ({ examId, classId, section, studentId }, outStream) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });

      outStream.on('finish', resolve);
      outStream.on('error', reject);
      doc.pipe(outStream);

      const exam = await Exam.findById(examId)
        .populate('class', 'name section')
        .populate('schedule.subject', 'name type')
        .lean();

      if (!exam) throw new Error('Exam not found');

      let institute = await InstituteSettings.findOne().lean();
      if (!institute) {
        institute = { schoolName: 'LITTLE FLOWER ENGLISH SCHOOL', address: 'Main Road, Siwan, Bihar', affiliation: 'CBSE' };
      }

      const targetClassId = classId || exam.class._id;
      const studentQuery = { class: targetClassId, status: 'Active' };
      if (studentId) studentQuery._id = studentId;
      if (section) studentQuery.section = section;

      const students = await Student.find(studentQuery)
        .sort({ rollNumber: 1, fullName: 1 })
        .lean();

      if (!students || students.length === 0) {
        throw new Error('No active students found for Admit Card generation');
      }

      const schedule = (exam.schedule || []).sort((a, b) => new Date(a.examDate) - new Date(b.examDate));

      students.forEach((st, idx) => {
        if (idx > 0) doc.addPage();
        drawSingleAdmitCard(doc, {
          institute,
          student: st,
          exam,
          schedule,
          instructions: exam.instructions,
        });
      });

      doc.end();
      resolve();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  compileDateSheetPdf,
  compileBulkAdmitCardsPdf,
};
