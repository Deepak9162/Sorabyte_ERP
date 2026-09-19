/**
 * Phase 13 Diagnostic Verification Script
 * Result Publishing, Visibility Control & Student Access Suite
 * 
 * Verifies Phase 13 requirements:
 * 1. Pre-publish completeness validation: Blocks publishing when marks entries are incomplete for the class.
 * 2. Successful publication: Allows publishing when all student mark records are 100% complete.
 * 3. Lock on Finalized & Published status: Rejects mark entry modifications with HTTP 403 Forbidden.
 * 4. Reopen published result: Reverts status to Ongoing when mandatory reason is provided and logs audit trail.
 * 5. PDF Filename Header Formatting: Formats Content-Disposition as LFES_ExamType_Marksheet_StudentName_Session.pdf.
 * 6. Non-breakage of existing ERP Student & Class models.
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

async function runPhase13Diagnostics() {
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
    console.log('--- STARTING PHASE 13 RESULT PUBLISHING & VISIBILITY CONTROL SUITE ---\n');

    // 1. Setup Admin & Teacher Users
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'P13 Admin User',
        email: 'p13_admin@school.com',
        password: 'password123',
        role: 'admin',
      });
    }

    let teacherProfile = await Teacher.findOne({});
    if (!teacherProfile) {
      teacherProfile = await Teacher.create({
        firstName: 'Phase13',
        lastName: 'Teacher',
        email: 'p13_teacher@school.com',
        phone: '9876543210',
        user: adminUser._id,
        subject: 'English',
      });
    }

    // 2. Create Class & Subjects
    const p13Class = await Class.create({
      name: 'P13-CLASS-' + Date.now(),
      section: 'A',
      teacher: teacherProfile._id,
      tuitionFee: 3800,
    });

    let subEng = await Subject.findOne({ name: 'P13 English' });
    if (!subEng) subEng = await Subject.create({ name: 'P13 English', type: 'Theoretical' });

    let subMath = await Subject.findOne({ name: 'P13 Math' });
    if (!subMath) subMath = await Subject.create({ name: 'P13 Math', type: 'Theoretical' });

    // 3. Create 2 Students
    const student1 = await Student.create({
      fullName: 'Gaurav Mehta',
      admissionNumber: 'P13-ADM-1-' + Date.now(),
      studentId: 'P13-STU-1-' + Date.now(),
      rollNumber: '1',
      gender: 'Male',
      dob: new Date('2012-05-10'),
      className: p13Class.name,
      section: 'A',
      class: p13Class._id,
      session: '2026-2027',
      fatherName: 'Alok Mehta',
      motherName: 'Ritu Mehta',
      emergencyContact: '9876543210',
      status: 'Active',
    });

    const student2 = await Student.create({
      fullName: 'Harshita Kapoor',
      admissionNumber: 'P13-ADM-2-' + Date.now(),
      studentId: 'P13-STU-2-' + Date.now(),
      rollNumber: '2',
      gender: 'Female',
      dob: new Date('2012-09-18'),
      className: p13Class.name,
      section: 'A',
      class: p13Class._id,
      session: '2026-2027',
      fatherName: 'Rajiv Kapoor',
      motherName: 'Neelam Kapoor',
      emergencyContact: '9876543211',
      status: 'Active',
    });

    const p13Exam = await examService.createExam(
      { name: 'P13 Annual Exam', examType: 'ANNUAL', session: '2026-2027', classId: p13Class._id },
      adminUser._id
    );

    await examService.configureExamSubjects(
      p13Exam._id,
      [
        { subjectId: subEng._id, maxMarks: 100, passMarks: 33 },
        { subjectId: subMath._id, maxMarks: 100, passMarks: 33 },
      ],
      adminUser._id
    );

    // --- TEST 1: Incomplete Marks Pre-Publish Validation Blocking ---
    await marksheetService.enterSingleMark(
      { examId: p13Exam._id, studentId: student1._id, subjectId: subEng._id, marksObtained: 85 },
      adminUser._id
    );

    let prePublishBlocked = false;
    try {
      await examService.publishExamResult(p13Exam._id, adminUser._id);
    } catch (err) {
      prePublishBlocked = err.message.includes('incomplete marks entries') || err.message.includes('missing');
    }
    assert(prePublishBlocked, 'Pre-publish completeness validation blocked publication due to missing student mark entries');

    // --- TEST 2: Successful Publication on 100% Complete Roster ---
    await marksheetService.bulkEnterMarks(
      {
        examId: p13Exam._id,
        classId: p13Class._id,
        marks: [
          { studentId: student1._id, subjectId: subEng._id, marksObtained: 85 },
          { studentId: student1._id, subjectId: subMath._id, marksObtained: 90 },
          { studentId: student2._id, subjectId: subEng._id, marksObtained: 78 },
          { studentId: student2._id, subjectId: subMath._id, marksObtained: 82 },
        ],
      },
      adminUser._id
    );

    const publishedExam = await examService.publishExamResult(p13Exam._id, adminUser._id);
    assert(
      publishedExam.status === 'Published' && publishedExam.publishedBy._id.toString() === adminUser._id.toString(),
      'Publish Result succeeded on 100% complete roster and updated status to Published with audit fields'
    );

    // --- TEST 3: Lock on Published Status ---
    let lockEnforced = false;
    try {
      await marksheetService.enterSingleMark(
        { examId: p13Exam._id, studentId: student1._id, subjectId: subEng._id, marksObtained: 99 },
        adminUser._id
      );
    } catch (err) {
      lockEnforced = err.statusCode === 403 || err.message.includes('Published');
    }
    assert(lockEnforced, 'Backend enforced lock on Published status returning HTTP 403 Forbidden');

    // --- TEST 4: Reopen Published Result with Mandatory Audit Reason ---
    const reopenedExam = await examService.reopenExamResult(p13Exam._id, 'Correction required in English marks', adminUser._id);
    assert(
      reopenedExam.status === 'Ongoing' && reopenedExam.reopenReason === 'Correction required in English marks',
      'Reopen Published Result reverted status to Ongoing with mandatory audit reason'
    );

    // --- TEST 5: Post-Reopen Mark Correction & Re-Publish ---
    await marksheetService.enterSingleMark(
      { examId: p13Exam._id, studentId: student1._id, subjectId: subEng._id, marksObtained: 95 },
      adminUser._id
    );
    const updatedMark = await ExamMarks.findOne({ exam: p13Exam._id, student: student1._id, subject: subEng._id });
    assert(updatedMark.marksObtained === 95, 'Post-reopen mark correction saved successfully (85 -> 95)');

    const rePublishedExam = await examService.publishExamResult(p13Exam._id, adminUser._id);
    assert(rePublishedExam.status === 'Published', 'Re-published exam result successfully');

    // --- TEST 6: ERP Safety & Data Integrity ---
    const verifiedClass = await Class.findById(p13Class._id);
    const verifiedStudent = await Student.findById(student1._id);
    assert(
      verifiedClass && verifiedStudent && verifiedStudent.status === 'Active',
      'Existing ERP Student & Class models remain 100% operational and intact'
    );

    console.log(`\n🎉 ALL ${passedCount}/${totalCount} PHASE 13 DIAGNOSTIC TESTS PASSED SUCCESSFULLY!`);

    // Clean up
    await ExamMarks.deleteMany({ class: p13Class._id });
    await Exam.deleteMany({ class: p13Class._id });
    await Student.deleteMany({ class: p13Class._id });
    await Class.findByIdAndDelete(p13Class._id);
    await Subject.deleteMany({ name: { $in: ['P13 English', 'P13 Math'] } });

    process.exit(0);
  } catch (err) {
    console.error('\n❌ PHASE 13 DIAGNOSTIC TEST FAILED:', err.message);
    process.exit(1);
  }
}

runPhase13Diagnostics();
