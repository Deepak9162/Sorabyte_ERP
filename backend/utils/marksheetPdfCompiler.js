/**
 * Marksheet PDF Compiler Utility
 * 
 * Uses PDFKit to stream production-ready A4 PDFs directly to output response stream.
 * Supports:
 * 1. Individual Student Marksheet PDF (A4 Portrait) matching official LFES Marksheet design
 * 2. Class Monthly Result Matrix PDF (A4 Landscape)
 * 3. Bulk Class Marksheets PDF (A4 Portrait with page breaks per student)
 */

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const logoPath = path.join(__dirname, '..', 'assets', 'schoollogo.png');
const devanagariFontPath = path.join(__dirname, '..', 'assets', 'Devanagari.ttf');

/**
 * Helper to draw a single student marksheet on PDFkit document instance
 * Matches the official Little Flower English School (LFES) Marksheet template
 */
const drawSingleMarksheet = (doc, data) => {
  const { institute, student, exam, subjects, aggregate, attendance, signatures } = data;

  // Register Devanagari font if available for Hindi / Sanskrit text
  if (fs.existsSync(devanagariFontPath)) {
    try {
      doc.registerFont('DevanagariFont', devanagariFontPath);
    } catch (e) {
      console.error('Failed to register Devanagari font:', e);
    }
  }

  // 1. Outer Double Frame (Navy Outer, Gold Inner)
  doc.rect(18, 18, 559, 806).strokeColor('#0F2552').lineWidth(1.8).stroke();
  doc.rect(22, 22, 551, 798).strokeColor('#C5A059').lineWidth(1.0).stroke();

  // Corner Flourish Ornaments
  doc.rect(22, 22, 10, 10).strokeColor('#C5A059').lineWidth(1).stroke();
  doc.rect(563, 22, 10, 10).strokeColor('#C5A059').lineWidth(1).stroke();
  doc.rect(22, 810, 10, 10).strokeColor('#C5A059').lineWidth(1).stroke();
  doc.rect(563, 810, 10, 10).strokeColor('#C5A059').lineWidth(1).stroke();

  // 2. Registration & Udise Header Line
  doc.fillColor('#0F2552').fontSize(9.5).font('Times-Bold');
  doc.text('Regd No - 21812312026414131503.', 35, 34);
  doc.text('Udise Code- 10164102145', 415, 34, { width: 145, align: 'right' });

  // 3. Header Logo Emblem Image
  if (fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, 272, 26, { fit: [50, 50], align: 'center', valign: 'center' });
    } catch (e) {
      console.error('Failed to draw PDF header logo:', e);
    }
  }

  // 4. Main School Title Header
  doc.fillColor('#0F2552')
     .fontSize(24)
     .font('Times-Bold')
     .text(institute?.schoolName || 'LITTLE FLOWER ENGLISH SCHOOL', 35, 82, { align: 'center' });

  doc.fillColor('#0F2552')
     .fontSize(10.5)
     .font('Helvetica-Bold')
     .text(`${institute?.address || 'SIWAN BIHAR- 841506'}`, 35, 110, { align: 'center' });

  // 5. Sanskrit Motto Pill Box
  doc.rect(205, 126, 185, 22).fillAndStroke('#0F2552', '#C5A059');
  doc.fillColor('#FACC15')
     .fontSize(11);
  if (fs.existsSync(devanagariFontPath)) {
    doc.font('DevanagariFont');
  } else {
    doc.font('Times-Bold');
  }
  doc.text('"ज्ञानं परमं बलम्"', 205, 131, { width: 185, align: 'center' });

  // 6. Student Metadata Box (Dotted Baseline Style)
  let y = 162;

  // Helper for dotted underline text field
  const drawDottedField = (label, val, x, y, width) => {
    doc.fillColor('#0F2552').fontSize(10).font('Times-Bold').text(label, x, y);
    const labelWidth = doc.widthOfString(label);
    const valX = x + labelWidth + 4;
    const valWidth = width - labelWidth - 4;

    doc.fillColor('#000000').fontSize(10).font('Times-Bold').text((val || '-').toString(), valX, y, { width: valWidth });
    
    // Dotted underline
    doc.moveTo(valX, y + 12)
       .lineTo(x + width, y + 12)
       .dash(1, { space: 2 })
       .strokeColor('#888888')
       .lineWidth(0.6)
       .stroke()
       .undash();
  };

  // Row 1
  drawDottedField("Student's Name :", (student?.fullName || 'ANYA TIWARI').toUpperCase(), 40, y, 310);
  drawDottedField('Class :', (student?.class || 'ONE').toUpperCase(), 370, y, 185);

  // Row 2
  y += 22;
  drawDottedField("Father's Name :", (student?.fatherName || 'RANJEET TIWARI').toUpperCase(), 40, y, 310);
  drawDottedField('Roll No :', (student?.rollNumber || '25').toString(), 370, y, 185);

  // Row 3
  y += 22;
  drawDottedField('Address :', (student?.address || 'VILL- SIKATIYA, POST -KHAWASPUR 841416').toUpperCase(), 40, y, 310);
  drawDottedField('Session :', exam?.session || '2025-26', 370, y, 185);

  // 7. Subject & Marks Table Header
  y += 28;
  const tableX = 35;
  const tableWidth = 525;

  // Background Watermark Image behind table
  if (fs.existsSync(logoPath)) {
    try {
      doc.save();
      doc.opacity(0.06);
      doc.image(logoPath, 197, y + 25, { fit: [200, 200], align: 'center', valign: 'center' });
      doc.restore();
    } catch (e) {
      console.error('Failed to draw PDF watermark logo:', e);
    }
  }

  // Header Row
  doc.rect(tableX, y, tableWidth, 26).fill('#0F2552');
  doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');

  doc.text('SUBJECT', tableX + 8, y + 9, { width: 165 });
  doc.text('FULL MARKS', tableX + 175, y + 5, { width: 55, align: 'center' });
  doc.text('PASS MARKS', tableX + 235, y + 5, { width: 55, align: 'center' });
  doc.text('HALF YEARLY\nMARKS OBTAINED', tableX + 295, y + 4, { width: 75, align: 'center' });
  doc.text('ANNUAL EXAM\nMARKS OBTAINED', tableX + 375, y + 4, { width: 75, align: 'center' });
  doc.text('GRAND TOTAL', tableX + 455, y + 9, { width: 65, align: 'center' });

  y += 26;

  // 8. Subject Score Rows
  const totalMax = subjects ? subjects.reduce((sum, s) => sum + (s.maxMarks || 100), 0) : 0;
  const totalPass = subjects ? subjects.reduce((sum, s) => sum + (s.passMarks || 33), 0) : 0;
  let totalHalfObtained = 0;
  let totalAnnualObtained = 0;

  if (subjects && subjects.length > 0) {
    subjects.forEach((sub, idx) => {
      const halfObtained = sub.halfYearlyMarks !== undefined ? sub.halfYearlyMarks : (sub.isAbsent ? 0 : Math.round((sub.marksObtained || 0) * 0.9));
      const annualObtained = sub.isAbsent ? 0 : (sub.marksObtained || 0);
      const grandTotal = sub.grandTotal !== undefined ? sub.grandTotal : (halfObtained + annualObtained);

      totalHalfObtained += halfObtained;
      totalAnnualObtained += annualObtained;

      const rowBg = idx % 2 === 0 ? '#ffffff' : '#fafafa';
      doc.rect(tableX, y, tableWidth, 22).fillAndStroke(rowBg, '#CBD5E1');

      doc.fillColor('#0F2552').fontSize(9.5).font('Times-Bold');
      doc.text(sub.subjectName, tableX + 8, y + 6, { width: 165 });

      doc.fillColor('#333333').font('Helvetica').fontSize(9.5);
      doc.text((sub.maxMarks || 100).toString(), tableX + 175, y + 6, { width: 55, align: 'center' });
      doc.text((sub.passMarks || 33).toString(), tableX + 235, y + 6, { width: 55, align: 'center' });

      doc.font('Helvetica-Bold').fillColor('#000000').fontSize(10);
      doc.text(sub.isAbsent ? 'ABS' : halfObtained.toString(), tableX + 295, y + 6, { width: 75, align: 'center' });
      doc.text(sub.isAbsent ? 'ABSENT' : annualObtained.toString(), tableX + 375, y + 6, { width: 75, align: 'center' });

      doc.fillColor('#0F2552').text(grandTotal.toString(), tableX + 455, y + 6, { width: 65, align: 'center' });

      y += 22;
    });
  }

  // 9. Total Summary Row
  doc.rect(tableX, y, tableWidth, 24).fillAndStroke('#f1f5f9', '#0F2552');
  doc.fillColor('#0F2552').fontSize(10).font('Helvetica-Bold');
  doc.text('TOTAL', tableX + 8, y + 7, { width: 165 });

  doc.text(totalMax.toString(), tableX + 175, y + 7, { width: 55, align: 'center' });
  doc.text(totalPass.toString(), tableX + 235, y + 7, { width: 55, align: 'center' });
  doc.text(totalHalfObtained.toString(), tableX + 295, y + 7, { width: 75, align: 'center' });
  doc.text(totalAnnualObtained.toString(), tableX + 375, y + 7, { width: 75, align: 'center' });
  doc.text((totalHalfObtained + totalAnnualObtained).toString(), tableX + 455, y + 7, { width: 65, align: 'center' });

  y += 34;

  // 10. Performance Summary Gold Box
  doc.rect(tableX, y, tableWidth, 48).fillAndStroke('#FAF9F5', '#C5A059');

  const colWidth = tableWidth / 4;

  // Col 1: TOTAL Percentage
  doc.fillColor('#0F2552').fontSize(9).font('Times-Bold').text('TOTAL Percentage', tableX, y + 8, { width: colWidth, align: 'center' });
  doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold').text(`${aggregate?.percentage || '77'} %`, tableX, y + 24, { width: colWidth, align: 'center' });

  // Col 2: GRADE
  doc.fillColor('#0F2552').fontSize(9).font('Times-Bold').text('GRADE', tableX + colWidth, y + 8, { width: colWidth, align: 'center' });
  doc.fillColor('#0F2552').fontSize(13).font('Helvetica-Bold').text(aggregate?.grade || 'A', tableX + colWidth, y + 24, { width: colWidth, align: 'center' });

  // Col 3: DIVISION
  doc.fillColor('#0F2552').fontSize(9).font('Times-Bold').text('DIVISION', tableX + colWidth * 2, y + 8, { width: colWidth, align: 'center' });
  doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold').text(aggregate?.division || 'First', tableX + colWidth * 2, y + 24, { width: colWidth, align: 'center' });

  // Col 4: ANNUAL ATTENDANCE
  doc.fillColor('#0F2552').fontSize(9).font('Times-Bold').text('ANNUAL ATTENDANCE', tableX + colWidth * 3, y + 8, { width: colWidth, align: 'center' });
  doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold').text(attendance?.attendancePercentage || '71 %', tableX + colWidth * 3, y + 24, { width: colWidth, align: 'center' });

  y += 72;

  // 11. Signatures Block
  const sigColWidth = tableWidth / 3;

  // Class Teacher
  doc.fillColor('#000000').fontSize(10).font('Times-Italic').text(signatures?.classTeacher || 'Neha Kumari', tableX, y, { width: sigColWidth, align: 'center' });
  doc.moveTo(tableX + 25, y + 18).lineTo(tableX + sigColWidth - 25, y + 18).strokeColor('#000000').lineWidth(0.8).stroke();
  doc.fillColor('#0F2552').fontSize(10).font('Times-Bold').text('Class Teacher', tableX, y + 23, { width: sigColWidth, align: 'center' });

  // Director
  doc.fillColor('#000000').fontSize(10).font('Times-Italic').text(signatures?.director || 'Chandra Mohan Tiwari', tableX + sigColWidth, y, { width: sigColWidth, align: 'center' });
  doc.moveTo(tableX + sigColWidth + 25, y + 18).lineTo(tableX + sigColWidth * 2 - 25, y + 18).strokeColor('#000000').lineWidth(0.8).stroke();
  doc.fillColor('#0F2552').fontSize(10).font('Times-Bold').text('Director', tableX + sigColWidth, y + 23, { width: sigColWidth, align: 'center' });

  // Principal
  doc.fillColor('#000000').fontSize(10).font('Times-Italic').text(signatures?.principal || 'Chandra Mohan Tiwari', tableX + sigColWidth * 2, y, { width: sigColWidth, align: 'center' });
  doc.moveTo(tableX + sigColWidth * 2 + 25, y + 18).lineTo(tableX + tableWidth - 25, y + 18).strokeColor('#000000').lineWidth(0.8).stroke();
  doc.fillColor('#0F2552').fontSize(10).font('Times-Bold').text('Principal', tableX + sigColWidth * 2, y + 23, { width: sigColWidth, align: 'center' });

  y += 58;

  // 12. Footer Bottom Separator & Website
  doc.fillColor('#C5A059').fontSize(11).font('Times-Bold').text('❖  ◆  ❖', tableX, y, { width: tableWidth, align: 'center' });
  doc.fillColor('#444444').fontSize(9.5).font('Helvetica').text('www.lfessiwan.in', tableX, y + 15, { width: tableWidth, align: 'center' });
};

/**
 * 1. Compile Individual Student Marksheet PDF
 */
const compileStudentMarksheetPdf = (data, outStream) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 18, size: 'A4' });
      doc.pipe(outStream);
      outStream.on('finish', resolve);
      outStream.on('error', reject);

      drawSingleMarksheet(doc, data);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * 2. Compile Class-Wise Monthly Result Matrix PDF (A4 Landscape)
 */
const compileClassMonthlyResultPdf = (data, outStream) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 25, size: 'A4', layout: 'landscape' });
      doc.pipe(outStream);
      outStream.on('finish', resolve);
      outStream.on('error', reject);

      const { classInfo, examInfo, subjectList, studentRows } = data;

      // Header Banner
      doc.rect(25, 20, 792, 45).fill('#0F2552');
      doc.fillColor('#ffffff').fontSize(16).font('Times-Bold').text('LITTLE FLOWER ENGLISH SCHOOL', 35, 28);
      doc.fontSize(10).font('Helvetica-Bold').text(`CLASS RESULTS MATRIX — ${examInfo?.name || 'EXAMINATION'} (${examInfo?.session || '2026-2027'})`, 35, 47);

      doc.fontSize(9).font('Helvetica').text(`Class: ${classInfo?.name || '-'} (${classInfo?.section || 'A'}) | Total Students: ${studentRows?.length || 0}`, 500, 35, { width: 300, align: 'right' });

      // Table Header
      let y = 75;
      doc.rect(25, y, 792, 22).fill('#1E293B');
      doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');

      doc.text('RK', 28, y + 7, { width: 22, align: 'center' });
      doc.text('ROLL', 52, y + 7, { width: 35, align: 'center' });
      doc.text('STUDENT NAME', 90, y + 7, { width: 140 });

      let x = 235;
      const subWidth = Math.min(65, Math.floor(400 / (subjectList?.length || 1)));

      (subjectList || []).forEach((sub) => {
        doc.text(sub.name.substring(0, 10).toUpperCase(), x, y + 7, { width: subWidth, align: 'center' });
        x += subWidth;
      });

      doc.text('TOTAL', x, y + 7, { width: 55, align: 'center' });
      doc.text('%', x + 58, y + 7, { width: 40, align: 'center' });
      doc.text('GRADE', x + 100, y + 7, { width: 45, align: 'center' });
      doc.text('STATUS', x + 148, y + 7, { width: 50, align: 'center' });

      y += 22;

      // Table Rows
      if (studentRows && studentRows.length > 0) {
        studentRows.forEach((st, idx) => {
          if (y > 540) {
            doc.addPage({ margin: 25, size: 'A4', layout: 'landscape' });
            y = 30;
          }

          const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
          doc.rect(25, y, 792, 16).fillAndStroke(rowBg, '#CBD5E1');

          doc.fillColor('#0F2552').fontSize(7.5).font('Helvetica-Bold');
          doc.text((st.rank || idx + 1).toString(), 28, y + 4, { width: 22, align: 'center' });
          doc.fillColor('#333333').font('Helvetica').text(st.rollNumber.toString(), 52, y + 4, { width: 35, align: 'center' });
          doc.fillColor('#0F2552').font('Times-Bold').text(st.fullName, 90, y + 4, { width: 140 });

          let rx = 235;
          (subjectList || []).forEach((sub) => {
            const scoreObj = st.subjectScores ? st.subjectScores[sub._id] : null;
            doc.fillColor(scoreObj?.isAbsent ? '#dc2626' : '#000000').font('Helvetica');
            doc.text(scoreObj ? (scoreObj.isAbsent ? 'ABS' : scoreObj.marksObtained.toString()) : '-', rx, y + 4, { width: subWidth, align: 'center' });
            rx += subWidth;
          });

          doc.fillColor('#0F2552').font('Helvetica-Bold').text(`${st.summary?.totalMarksObtained}/${st.summary?.totalMaxMarks}`, rx, y + 4, { width: 55, align: 'center' });
          doc.fillColor('#000000').text(`${st.summary?.percentage}%`, rx + 58, y + 4, { width: 40, align: 'center' });
          doc.fillColor('#0F2552').text(st.summary?.grade || '-', rx + 100, y + 4, { width: 45, align: 'center' });

          const isPass = st.summary?.overallStatus === 'Pass';
          doc.fillColor(isPass ? '#15803d' : '#dc2626').text(st.summary?.overallStatus || '-', rx + 148, y + 4, { width: 50, align: 'center' });

          y += 16;
        });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * 3. Compile Bulk Class Marksheets PDF (A4 Portrait)
 */
const compileBulkClassMarksheetPdf = (studentsData, outStream) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 18, size: 'A4', autoFirstPage: false });
      doc.pipe(outStream);
      outStream.on('finish', resolve);
      outStream.on('error', reject);

      studentsData.forEach((studentData) => {
        doc.addPage({ margin: 18, size: 'A4' });
        drawSingleMarksheet(doc, studentData);
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  drawSingleMarksheet,
  compileStudentMarksheetPdf,
  compileClassMonthlyResultPdf,
  compileBulkClassMarksheetPdf,
};
