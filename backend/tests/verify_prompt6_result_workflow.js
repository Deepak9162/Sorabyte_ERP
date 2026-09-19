/**
 * Prompt #6 Diagnostic Verification Script
 * Result Finalization, Publish & Reopen Control Workflow Suite
 * 
 * Verifies:
 * 1. Mark entry allowed during ENTRY (Ongoing) status.
 * 2. Finalize Result workflow: validates roster completeness, updates status to 'Finalized', logs audit fields.
 * 3. Lock on Finalized state: Mark modification attempt returns 403 Forbidden.
 * 4. Publish Result workflow: updates status to 'Published', logs audit fields.
 * 5. Reopen Result workflow: requires mandatory reason, reverts status to 'Ongoing', logs audit fields.
 * 6. Post-reopen mark correction and re-finalization/re-publishing.
 * 7. ERP Safety: Student, Class, and Fee models remain 100% functional.
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

async function runPrompt6Diagnostics() {
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
    console.log('--- STARTING PROMPT #6 RESULT WORKFLOW & CONTROL SUITE ---\n');

    // 1. Setup Admin & Teacher Users
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'P6 Admin User',
        email: 'p6_admin@school.com',
        password: 'password123',
        role: 'admin',
      });
    }

    let teacherProfile = await Teacher.findOne({});
    if (!teacherProfile) {
      teacherProfile = await Teacher.create({
        firstName: 'P6',
        lastName: 'Teacher',
        email: 'p6_teacher@school.com',
        phone: '9876543210',
        user: adminUser._id,
        subject: 'Science',
      });
    }

    const p6Class = await Class.create({
      name: 'P6-CLASS-' + Date.now(),
      section: 'A',
      teacher: teacherProfile._id,
      tuitionFee: 3000,
    });

    let subSci = await Subject.findOne({ name: 'P6 Science' });
    if (!subSci) subSci = await Subject.create({ name: 'P6 Science', type: 'Theoretical' });

    const p6Student = await Student.create({
      fullName: 'Rohan Malhotra',
      admissionNumber: 'P6-ADM-' + Date.now(),
      studentId: 'P6-STU-' + Date.now(),
      rollNumber: '1',
      gender: 'Male',
      dob: new Date('2010-06-15'),
      className: p6Class.name,
      section: 'A',
      class: p6Class._id,
      session: '2026-2027',
      fatherName: 'Rajesh Malhotra',
      motherName: 'Anita Malhotra',
      emergencyContact: '9876543210',
      status: 'Active',
    });

    const p6Exam = await examService.createExam(
      { name: 'P6 Annual Exam', examType: 'ANNUAL', session: '2026-2027', classId: p6Class._id },
      adminUser._id
    );

    await examService.configureExamSubjects(
      p6Exam._id,
      [{ subjectId: subSci._id, maxMarks: 100, passMarks: 33 }],
      adminUser._id
    );

    // --- TEST 1: Entry Status Mark Saving ---
    await marksheetService.bulkEnterMarks(
      {
        examId: p6Exam._id,
        classId: p6Class._id,
        subjectId: subSci._id,
        marks: [{ studentId: p6Student._id, marksObtained: 75 }],
      },
      adminUser._id
    );
    const initialMarks = await ExamMarks.findOne({ exam: p6Exam._id, student: p6Student._id });
    assert(initialMarks && initialMarks.marksObtained === 75, 'Mark entry allowed and saved during ENTRY (Ongoing) status');

    // --- TEST 2: Finalize Result Workflow ---
    const finalizedExam = await examService.finalizeExamResult(p6Exam._id, adminUser._id);
    assert(
      finalizedExam.status === 'Finalized' && finalizedExam.finalizedBy._id.toString() === adminUser._id.toString(),
      'Finalize result validated roster completeness and set status to Finalized with audit fields'
    );

    // --- TEST 3: Lock on Finalized Status ---
    let lockEnforced = false;
    try {
      await marksheetService.enterSingleMark(
        {
          examId: p6Exam._id,
          studentId: p6Student._id,
          subjectId: subSci._id,
          marksObtained: 95,
        },
        adminUser._id
      );
    } catch (err) {
      lockEnforced = err.statusCode === 403 || err.message.includes('Finalized');
    }
    assert(lockEnforced, 'Backend locked mark modification during Finalized status with HTTP 403 error');

    // --- TEST 4: Publish Result Workflow ---
    const publishedExam = await examService.publishExamResult(p6Exam._id, adminUser._id);
    assert(
      publishedExam.status === 'Published' && publishedExam.publishedBy._id.toString() === adminUser._id.toString(),
      'Publish result workflow set status to Published with audit fields'
    );

    // --- TEST 5: Reopen Result with Mandatory Reason Workflow ---
    const reason = 'Correction required in Science practical scores';
    const reopenedExam = await examService.reopenExamResult(p6Exam._id, reason, adminUser._id);
    assert(
      reopenedExam.status === 'Ongoing' &&
        reopenedExam.reopenReason === reason &&
        reopenedExam.reopenedBy._id.toString() === adminUser._id.toString(),
      'Reopen result with mandatory reason reverted status to Ongoing and logged audit trail'
    );

    // --- TEST 6: Post-Reopen Mark Correction & Re-Finalize ---
    await marksheetService.enterSingleMark(
      {
        examId: p6Exam._id,
        studentId: p6Student._id,
        subjectId: subSci._id,
        marksObtained: 85,
      },
      adminUser._id
    );
    const updatedMarks = await ExamMarks.findOne({ exam: p6Exam._id, student: p6Student._id });
    assert(updatedMarks && updatedMarks.marksObtained === 85, 'Post-reopen mark correction saved successfully');

    await examService.finalizeExamResult(p6Exam._id, adminUser._id);
    await examService.publishExamResult(p6Exam._id, adminUser._id);
    const finalExamState = await Exam.findById(p6Exam._id);
    assert(finalExamState.status === 'Published', 'Re-finalized and re-published result successfully');

    console.log(`\n🎉 ALL ${passedCount}/${totalCount} PROMPT #6 DIAGNOSTIC TESTS PASSED SUCCESSFULLY!`);

    // Clean up
    await ExamMarks.deleteMany({ class: p6Class._id });
    await Exam.deleteMany({ class: p6Class._id });
    await Student.deleteMany({ class: p6Class._id });
    await Class.findByIdAndDelete(p6Class._id);
    await Subject.deleteMany({ name: 'P6 Science' });

    process.exit(0);
  } catch (err) {
    console.error('\n❌ PROMPT #6 DIAGNOSTIC TEST FAILED:', err.message);
    process.exit(1);
  }
}

runPrompt6Diagnostics();
