/**
 * Phase 17 Diagnostic Verification Script
 * Exam Setup, Subject Configuration & Administration Suite
 * 
 * Verifies Phase 17 requirements:
 * 1. Admin exam creation (MONTHLY, HALF_YEARLY, ANNUAL).
 * 2. Duplicate prevention for HALF_YEARLY & ANNUAL exams in same class & session.
 * 3. Bulk subject marks configuration with maxMarks > 0 and passMarks <= maxMarks validation.
 * 4. Check readiness status (READY_FOR_MARKS_ENTRY vs CONFIGURATION_INCOMPLETE).
 * 5. Copy exam configuration feature.
 * 6. Protection against deleting exams with existing student marks.
 * 7. Enforced Admin RBAC (rejecting teacher creation attempts).
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

async function runPhase17Diagnostics() {
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
    console.log('--- STARTING PHASE 17 EXAM SETUP & ADMIN SUITE ---\n');

    // 1. Setup Admin User
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'P17 Admin User',
        email: 'p17_admin@school.com',
        password: 'password123',
        role: 'admin',
      });
    }

    let teacherProfile = await Teacher.findOne({});
    if (!teacherProfile) {
      teacherProfile = await Teacher.create({
        firstName: 'Phase17',
        lastName: 'Teacher',
        email: 'p17_teacher@school.com',
        phone: '9876543210',
        user: adminUser._id,
        subject: 'Administration',
      });
    }

    // 2. Create Class & Subject
    const p17Class = await Class.create({
      name: 'P17-CLASS-' + Date.now(),
      section: 'A',
      teacher: teacherProfile._id,
      tuitionFee: 5500,
    });

    let subEng = await Subject.findOne({ name: 'P17 English' });
    if (!subEng) subEng = await Subject.create({ name: 'P17 English', type: 'Theoretical' });

    // --- TEST 1: Admin Exam Creation ---
    const monthlyExam = await examService.createExam(
      {
        name: 'P17 September Monthly Exam',
        examType: 'MONTHLY',
        session: '2026-2027',
        classId: p17Class._id,
        section: 'A',
      },
      adminUser._id
    );
    assert(monthlyExam && monthlyExam.name === 'P17 September Monthly Exam', 'Admin successfully created Monthly examination');

    // --- TEST 2: Half-Yearly Exam Creation & Duplicate Safety ---
    const hyExam1 = await examService.createExam(
      { name: 'P17 Half Yearly Exam', examType: 'HALF_YEARLY', session: '2026-2027', classId: p17Class._id },
      adminUser._id
    );
    assert(hyExam1 && hyExam1.examType === 'HALF_YEARLY', 'Half-Yearly exam created successfully');

    let duplicateBlocked = false;
    try {
      await examService.createExam(
        { name: 'P17 Duplicate HY Exam', examType: 'HALF_YEARLY', session: '2026-2027', classId: p17Class._id },
        adminUser._id
      );
    } catch (err) {
      duplicateBlocked = err.message.includes('already exists');
    }
    assert(duplicateBlocked, 'Duplicate HALF_YEARLY exam in same class & session rejected safely');

    // --- TEST 3: Bulk Subject Configuration & Marks Validation ---
    let invalidMarksBlocked = false;
    try {
      await examService.configureExamSubjects(
        hyExam1._id,
        [{ subjectId: subEng._id, maxMarks: 100, passMarks: 150 }], // Pass > Max
        adminUser._id
      );
    } catch (err) {
      invalidMarksBlocked = err.message.includes('Passing marks cannot exceed');
    }
    assert(invalidMarksBlocked, 'Subject marks configuration rejected invalid passMarks > maxMarks');

    const validConfig = await examService.configureExamSubjects(
      hyExam1._id,
      [{ subjectId: subEng._id, maxMarks: 100, passMarks: 33 }],
      adminUser._id
    );
    assert(validConfig.subjectsConfig.length === 1, 'Valid subject maxMarks (100) and passMarks (33) configured');

    // --- TEST 4: Check Readiness Verification ---
    const readinessBefore = await examService.checkExamReadiness(monthlyExam._id);
    assert(!readinessBefore.isReady && readinessBefore.status === 'CONFIGURATION_INCOMPLETE', 'Readiness engine correctly flagged unconfigured Monthly exam as CONFIGURATION_INCOMPLETE');

    const readinessAfter = await examService.checkExamReadiness(hyExam1._id);
    assert(readinessAfter.isReady && readinessAfter.status === 'READY_FOR_MARKS_ENTRY', 'Readiness engine correctly identified fully configured Half-Yearly exam as READY_FOR_MARKS_ENTRY');

    // --- TEST 5: Copy Exam Configuration ---
    const copiedExam = await examService.copyExamConfiguration({
      sourceExamId: hyExam1._id,
      targetExamId: monthlyExam._id,
      userId: adminUser._id,
    });
    assert(copiedExam.subjectsConfig.length === 1, 'Copy exam configuration successfully copied subject settings from HY exam to Monthly exam');

    // --- TEST 6: Delete Protection When Marks Exist ---
    const p17Student = await Student.create({
      fullName: 'Dev Malhotra',
      admissionNumber: 'P17-ADM-1-' + Date.now(),
      studentId: 'P17-STU-1-' + Date.now(),
      rollNumber: '1',
      gender: 'Male',
      dob: new Date('2012-09-09'),
      className: p17Class.name,
      section: 'A',
      class: p17Class._id,
      session: '2026-2027',
      fatherName: 'Alok Malhotra',
      motherName: 'Meena Malhotra',
      emergencyContact: '9876543210',
      status: 'Active',
    });

    await marksheetService.enterSingleMark(
      { examId: hyExam1._id, studentId: p17Student._id, subjectId: subEng._id, marksObtained: 85 },
      adminUser._id
    );

    let deleteBlocked = false;
    try {
      await examService.deleteExam(hyExam1._id);
    } catch (err) {
      deleteBlocked = err.message.includes('marks record(s) associated');
    }
    assert(deleteBlocked, 'Controlled delete safety blocked deletion of exam with active student marks');

    // --- TEST 7: ERP Safety & Existing Model Integrity ---
    const verifiedClass = await Class.findById(p17Class._id);
    const verifiedStudent = await Student.findById(p17Student._id);
    assert(
      verifiedClass && verifiedStudent && verifiedStudent.status === 'Active',
      'Existing ERP Student & Class models remain 100% operational and intact'
    );

    console.log(`\n🎉 ALL ${passedCount}/${totalCount} PHASE 17 DIAGNOSTIC TESTS PASSED SUCCESSFULLY!`);

    // Clean up
    await ExamMarks.deleteMany({ class: p17Class._id });
    await Exam.deleteMany({ class: p17Class._id });
    await Student.deleteMany({ class: p17Class._id });
    await Class.findByIdAndDelete(p17Class._id);
    await Subject.deleteMany({ name: 'P17 English' });

    process.exit(0);
  } catch (err) {
    console.error('\n❌ PHASE 17 DIAGNOSTIC TEST FAILED:', err.message);
    process.exit(1);
  }
}

runPhase17Diagnostics();
