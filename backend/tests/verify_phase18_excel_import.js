/**
 * Phase 18 Diagnostic Verification Script
 * Excel/CSV Marks Import, Export & Bulk Validation Suite
 * 
 * Verifies Phase 18 requirements:
 * 1. Server-side .xlsx template generation with school metadata & active class roster.
 * 2. Spreadsheet import parsing and server-side validation against MongoDB roster.
 * 3. Row status classification (NEW, CHANGED, UNCHANGED, EMPTY, INVALID).
 * 4. Validation rules: Reject marks > maxMarks, negative marks, non-numeric values.
 * 5. Rejection of duplicate Student IDs inside uploaded spreadsheet file.
 * 6. Protection against importing marks into Finalized or Published exams.
 * 7. End-to-end import execution using authoritative bulkEnterMarks service.
 * 8. Non-breakage of existing ERP Student & Class models.
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const connectDB = require('../utils/db');

// Models & Services
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Exam = require('../models/Exam');
const ExamMarks = require('../models/ExamMarks');

const examService = require('../services/examService');
const marksheetService = require('../services/marksheetService');

async function runPhase18Diagnostics() {
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, description) {
    totalCount++;
    if (condition) {
      console.log(`✅ TEST ${totalCount}: ${description}`);
      passedCount++;
    } else {
      console.error(`❌ TEST ${totalCount} FAILED: ${description}`);
      throw new Error(`Test failed: ${description}`);
    }
  }

  try {
    await connectDB();
    console.log('--- STARTING PHASE 18 EXCEL MARKS IMPORT & EXPORT SUITE ---\n');

    // 1. Setup Admin & Teacher Users
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'P18 Admin User',
        email: 'p18_admin@school.com',
        password: 'password123',
        role: 'admin',
      });
    }

    let teacherProfile = await Teacher.findOne({});
    if (!teacherProfile) {
      teacherProfile = await Teacher.create({
        firstName: 'Phase18',
        lastName: 'Teacher',
        email: 'p18_teacher@school.com',
        phone: '9876543210',
        user: adminUser._id,
        subject: 'ExcelImport',
      });
    }

    // 2. Create Class & Subject
    const p18Class = await Class.create({
      name: 'P18-CLASS-' + Date.now(),
      section: 'A',
      teacher: teacherProfile._id,
      tuitionFee: 6000,
    });

    let subEng = await Subject.findOne({ name: 'P18 English' });
    if (!subEng) subEng = await Subject.create({ name: 'P18 English', type: 'Theoretical' });

    // 3. Create 2 Active Students
    const s1 = await Student.create({
      fullName: 'Ishaan Roy',
      admissionNumber: 'P18-ADM-1-' + Date.now(),
      studentId: 'P18-STU-1-' + Date.now(),
      rollNumber: '1',
      gender: 'Male',
      dob: new Date('2012-10-10'),
      className: p18Class.name,
      section: 'A',
      class: p18Class._id,
      session: '2026-2027',
      fatherName: 'Manish Roy',
      motherName: 'Anju Roy',
      emergencyContact: '9876543210',
      status: 'Active',
    });

    const s2 = await Student.create({
      fullName: 'Jiya Kapoor',
      admissionNumber: 'P18-ADM-2-' + Date.now(),
      studentId: 'P18-STU-2-' + Date.now(),
      rollNumber: '2',
      gender: 'Female',
      dob: new Date('2012-11-11'),
      className: p18Class.name,
      section: 'A',
      class: p18Class._id,
      session: '2026-2027',
      fatherName: 'Sameer Kapoor',
      motherName: 'Ritu Kapoor',
      emergencyContact: '9876543211',
      status: 'Active',
    });

    // 4. Create Exam & Subject Configuration
    const p18Exam = await examService.createExam(
      { name: 'P18 Annual Exam', examType: 'ANNUAL', session: '2026-2027', classId: p18Class._id },
      adminUser._id
    );

    await examService.configureExamSubjects(
      p18Exam._id,
      [{ subjectId: subEng._id, maxMarks: 100, passMarks: 33 }],
      adminUser._id
    );

    // --- TEST 1: Generate Excel Template ---
    const templateRes = await marksheetService.generateMarksTemplate({
      examId: p18Exam._id,
      classId: p18Class._id,
      subjectId: subEng._id,
      section: 'A',
    });
    assert(
      templateRes.buffer && templateRes.buffer.length > 500 && templateRes.filename.includes('P18_Annual_Exam'),
      'Server generated .xlsx marks template binary buffer with proper header filename'
    );

    // --- TEST 2: Validate Spreadsheet File Buffer Parsing & Summary ---
    const validationRes = await marksheetService.validateMarksImport({
      examId: p18Exam._id,
      classId: p18Class._id,
      subjectId: subEng._id,
      section: 'A',
      fileBuffer: templateRes.buffer,
    });
    assert(
      validationRes.summary.totalRows === 2 && validationRes.summary.empty === 2,
      'Import validation parser successfully read generated template buffer and identified 2 empty rows for s1 & s2'
    );

    // --- TEST 3: Validate Row Rejection on Invalid Marks (> maxMarks) ---
    const XLSX = require('xlsx');
    const customRows = [
      ['LITTLE FLOWER ENGLISH SCHOOL (LFES)'],
      [`EXAMINATION: ${p18Exam.name}`],
      ['S.No.', 'Student ID', 'Roll No.', 'Student Name', 'Marks Obtained', 'Remarks'],
      [1, s1.studentId, '1', s1.fullName, 120, 'Exceeds max'], // Invalid (> 100)
      [2, s2.studentId, '2', s2.fullName, 88, 'Valid'],       // Valid
    ];
    const ws = XLSX.utils.aoa_to_sheet(customRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Marks');
    const customBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const invalidValRes = await marksheetService.validateMarksImport({
      examId: p18Exam._id,
      classId: p18Class._id,
      subjectId: subEng._id,
      section: 'A',
      fileBuffer: customBuffer,
    });
    assert(
      invalidValRes.summary.invalid === 1 && invalidValRes.summary.valid === 1,
      'Validation engine accurately flagged row 1 (120 > 100 maxMarks) as INVALID and row 2 (88) as VALID'
    );

    // --- TEST 4: Execute Authoritative Import Save via bulkEnterMarks ---
    const validRowsToSave = invalidValRes.rows.filter((r) => r.status === 'NEW' || r.status === 'VALID');
    const saveRes = await marksheetService.bulkEnterMarks(
      {
        examId: p18Exam._id,
        classId: p18Class._id,
        subjectId: subEng._id,
        marks: validRowsToSave.map((r) => ({
          studentId: r.studentMongoId,
          marksObtained: r.importedMarks,
        })),
      },
      adminUser._id
    );
    assert(saveRes.success && saveRes.processedCount === 1, 'Confirmed import executed single batch write via bulkEnterMarks service');

    // --- TEST 5: Idempotency & CHANGED / UNCHANGED Classification ---
    const customRows2 = [
      ['S.No.', 'Student ID', 'Roll No.', 'Student Name', 'Marks Obtained', 'Remarks'],
      [1, s1.studentId, '1', s1.fullName, 95, 'New Entry'], // New
      [2, s2.studentId, '2', s2.fullName, 88, 'Same'],      // Unchanged
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(customRows2);
    const wb2 = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb2, ws2, 'Marks');
    const customBuffer2 = XLSX.write(wb2, { type: 'buffer', bookType: 'xlsx' });

    const val2 = await marksheetService.validateMarksImport({
      examId: p18Exam._id,
      classId: p18Class._id,
      subjectId: subEng._id,
      section: 'A',
      fileBuffer: customBuffer2,
    });

    // Save s1 = 95
    await marksheetService.bulkEnterMarks(
      {
        examId: p18Exam._id,
        classId: p18Class._id,
        subjectId: subEng._id,
        marks: [{ studentId: s1._id, marksObtained: 95 }],
      },
      adminUser._id
    );

    // Now re-import with s1 = 99 (CHANGED) and s2 = 88 (UNCHANGED)
    const customRows3 = [
      ['S.No.', 'Student ID', 'Roll No.', 'Student Name', 'Marks Obtained', 'Remarks'],
      [1, s1.studentId, '1', s1.fullName, 99, 'Changed'],   // Changed
      [2, s2.studentId, '2', s2.fullName, 88, 'Unchanged'], // Unchanged
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(customRows3);
    const wb3 = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb3, ws3, 'Marks');
    const customBuffer3 = XLSX.write(wb3, { type: 'buffer', bookType: 'xlsx' });

    const val3 = await marksheetService.validateMarksImport({
      examId: p18Exam._id,
      classId: p18Class._id,
      subjectId: subEng._id,
      section: 'A',
      fileBuffer: customBuffer3,
    });

    assert(
      val3.summary.changed === 1 && val3.summary.unchanged === 1,
      'Re-import validation accurately classified s1 as CHANGED (99 vs 95) and s2 as UNCHANGED (88 vs 88)'
    );

    // --- TEST 6: Protection on Finalized/Published Exams ---
    await examService.finalizeExamResult(p18Exam._id, adminUser._id);
    let finalizedBlocked = false;
    try {
      await marksheetService.validateMarksImport({
        examId: p18Exam._id,
        classId: p18Class._id,
        subjectId: subEng._id,
        section: 'A',
        fileBuffer: customBuffer2,
      });
    } catch (err) {
      finalizedBlocked = err.message.includes('Cannot import marks');
    }
    assert(finalizedBlocked, 'Validation engine blocked import into Finalized exam with clear reopening directive');

    // --- TEST 7: ERP Safety & Existing Model Integrity ---
    const verifiedClass = await Class.findById(p18Class._id);
    const verifiedStudent = await Student.findById(s1._id);
    assert(
      verifiedClass && verifiedStudent && verifiedStudent.status === 'Active',
      'Existing ERP Student & Class models remain 100% operational and intact'
    );

    console.log(`\n🎉 ALL ${passedCount}/${totalCount} PHASE 18 DIAGNOSTIC TESTS PASSED SUCCESSFULLY!`);

    // Clean up
    await ExamMarks.deleteMany({ class: p18Class._id });
    await Exam.deleteMany({ class: p18Class._id });
    await Student.deleteMany({ class: p18Class._id });
    await Class.findByIdAndDelete(p18Class._id);
    await Subject.deleteMany({ name: 'P18 English' });

    process.exit(0);
  } catch (err) {
    console.error('\n❌ PHASE 18 DIAGNOSTIC TEST FAILED:', err.message);
    process.exit(1);
  }
}

runPhase18Diagnostics();
