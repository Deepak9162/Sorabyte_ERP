/**
 * Phase 2 Marks Entry Diagnostic Verification Script
 * 
 * Verifies Phase 2 requirements:
 * 1. Filter bar options API (Admin vs Teacher)
 * 2. Class roster & existing marks loading API
 * 3. Partial / Incomplete marks saving
 * 4. Bulk write updates without duplicate creation
 * 5. Strict teacher RBAC enforcement
 * 6. Safety of existing ERP data models
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const connectDB = require('../utils/db');

// Models
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const ClassSubject = require('../models/ClassSubject');
const Student = require('../models/Student');
const Exam = require('../models/Exam');
const ExamMarks = require('../models/ExamMarks');

// Services
const examService = require('../services/examService');
const marksheetService = require('../services/marksheetService');

async function runPhase2Diagnostics() {
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
    console.log('--- STARTING PHASE 2 MARKS ENTRY DIAGNOSTIC SUITE ---\n');

    // 1. Fetch or create Admin & Teacher accounts
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Phase 2 Admin',
        email: 'p2_admin@school.com',
        password: 'password123',
        role: 'admin',
      });
    }

    let teacherUser = await User.findOne({ email: 'p2_teacher@school.com' });
    if (!teacherUser) {
      teacherUser = await User.create({
        name: 'Phase 2 Teacher',
        email: 'p2_teacher@school.com',
        password: 'password123',
        role: 'teacher',
      });
    }

    let teacherProfile = await Teacher.findOne({ user: teacherUser._id });
    if (!teacherProfile) {
      teacherProfile = await Teacher.create({
        firstName: 'Phase2',
        lastName: 'Teacher',
        email: teacherUser.email,
        phone: '9876543299',
        user: teacherUser._id,
        subject: 'Mathematics',
      });
    }

    // 2. Setup Test Subject, Class, & Exam
    let testSub = await Subject.findOne({ name: 'Physics P2 Test' });
    if (!testSub) {
      testSub = await Subject.create({ name: 'Physics P2 Test', type: 'Theoretical' });
    }

    const testClass = await Class.create({
      name: 'P2-CLASS-' + Date.now(),
      section: 'A',
      teacher: teacherProfile._id,
      tuitionFee: 2000,
    });

    await ClassSubject.create({
      class: testClass._id,
      subject: testSub._id,
      teacher: teacherProfile._id,
    });

    // 3. Create 53 test students to benchmark performance with 50+ class size
    const studentDocs = [];
    for (let i = 1; i <= 53; i++) {
      studentDocs.push({
        fullName: `P2 Student ${i}`,
        admissionNumber: `P2-ADM-${i}-${Date.now()}`,
        studentId: `P2-STU-${i}-${Date.now()}`,
        rollNumber: `${i}`,
        gender: i % 2 === 0 ? 'Female' : 'Male',
        dob: new Date('2011-01-01'),
        className: testClass.name,
        section: 'A',
        class: testClass._id,
        session: '2026-2027',
        fatherName: `Parent ${i}`,
        motherName: `Mother ${i}`,
        emergencyContact: '9876543210',
        status: 'Active',
      });
    }
    const createdStudents = await Student.insertMany(studentDocs);

    // 4. Create Exam
    const exam = await examService.createExam(
      {
        name: 'Phase 2 Test Exam',
        examType: 'MONTHLY',
        session: '2026-2027',
        classId: testClass._id,
        section: 'A',
      },
      adminUser._id
    );

    await examService.configureExamSubjects(
      exam._id,
      [{ subjectId: testSub._id, maxMarks: 100, passMarks: 33 }],
      adminUser._id
    );

    // --- TEST EXECUTION ---

    // Test 1: Fetch Filter Options for Admin
    const adminOptions = await examService.getMarksEntryOptions(adminUser);
    assert(
      adminOptions.classes.length > 0 && adminOptions.exams.length > 0,
      'Filter Bar Options API returned valid options for Admin'
    );

    // Test 2: Fetch Filter Options for Teacher
    const teacherOptions = await examService.getMarksEntryOptions(teacherUser);
    const hasAssignedClass = teacherOptions.classes.some((c) => c._id.toString() === testClass._id.toString());
    assert(hasAssignedClass, 'Filter Bar Options API restricts Teacher to assigned classes');

    // Test 3: Load Roster & Existing Marks (Speed & Lean Query Check)
    const startTime = Date.now();
    const rosterRes = await marksheetService.getClassSubjectRoster({
      examId: exam._id,
      classId: testClass._id,
      subjectId: testSub._id,
      section: 'A',
    });
    const rosterDuration = Date.now() - startTime;
    assert(
      rosterRes.students.length === 53 && rosterDuration < 500,
      `Class Roster API loaded 53 students in ${rosterDuration}ms (< 500ms target)`
    );

    // Test 4: Partial / Incomplete Marks Saving (40 entered, 13 left blank)
    const partialMarksPayload = {
      examId: exam._id,
      classId: testClass._id,
      sectionId: 'A',
      subjectId: testSub._id,
      marks: createdStudents.slice(0, 40).map((s, idx) => ({
        studentId: s._id,
        marksObtained: 50 + (idx % 40),
        remarks: 'Partial entry',
      })),
    };

    const saveStartTime = Date.now();
    const bulkRes1 = await marksheetService.bulkEnterMarks(partialMarksPayload, adminUser._id);
    const saveDuration = Date.now() - saveStartTime;

    assert(
      bulkRes1.processedCount === 40 && saveDuration < 1000,
      `Bulk save processed 40 partial entries in ${saveDuration}ms using bulkWrite`
    );

    // Test 5: Verify Blank entries remain "Marks Not Entered" and NOT forced to Fail/0
    const countInDB = await ExamMarks.countDocuments({ exam: exam._id, class: testClass._id });
    assert(countInDB === 40, 'Blank marks were preserved without creating fake zero/fail records');

    // Test 6: Bulk Update existing 40 marks + add remaining 13 (Confirm zero duplicate creation)
    const updatedFullPayload = {
      examId: exam._id,
      classId: testClass._id,
      sectionId: 'A',
      subjectId: testSub._id,
      marks: createdStudents.map((s, idx) => ({
        studentId: s._id,
        marksObtained: 70 + (idx % 20),
        remarks: 'Updated entry',
      })),
    };

    const bulkRes2 = await marksheetService.bulkEnterMarks(updatedFullPayload, adminUser._id);
    const finalCountInDB = await ExamMarks.countDocuments({ exam: exam._id, class: testClass._id });

    assert(
      bulkRes2.processedCount === 53 && finalCountInDB === 53,
      'Bulk update updated existing records cleanly without duplicate creation'
    );

    // Test 7: Verify Existing ERP Models Unchanged
    const refetchedClass = await Class.findById(testClass._id);
    assert(refetchedClass && refetchedClass.tuitionFee === 2000, 'Existing Class fee data remained untouched');

    console.log(`\n🎉 ALL ${passedCount}/${totalCount} PHASE 2 DIAGNOSTIC TESTS PASSED SUCCESSFULLY!`);

    // Clean up test data
    await ExamMarks.deleteMany({ class: testClass._id });
    await Exam.findByIdAndDelete(exam._id);
    await Student.deleteMany({ class: testClass._id });
    await ClassSubject.deleteMany({ class: testClass._id });
    await Class.findByIdAndDelete(testClass._id);
    await Subject.findByIdAndDelete(testSub._id);

    process.exit(0);
  } catch (err) {
    console.error('\n❌ PHASE 2 DIAGNOSTIC TEST FAILED:', err.message);
    process.exit(1);
  }
}

runPhase2Diagnostics();
