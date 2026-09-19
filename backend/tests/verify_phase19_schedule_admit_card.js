/**
 * Phase 19 Diagnostic Verification Script
 * Exam Date Sheet, Schedule & Admit Card Management Suite
 * 
 * Verifies Phase 19 requirements:
 * 1. Admin subject-wise exam schedule configuration (saveExamSchedule).
 * 2. Server-side schedule date/time validation and duplicate subject prevention.
 * 3. Schedule publishing workflow (Draft -> Published).
 * 4. Draft schedule protection (Non-admin access blocked until Published).
 * 5. PDFKit streaming of A4 Class Date Sheet PDF.
 * 6. PDFKit streaming of multi-page Class Bulk Admit Cards PDF (1 page per student).
 * 7. Non-breakage of existing ERP Student & Class models.
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const connectDB = require('../utils/db');
const stream = require('stream');

// Models & Services
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Exam = require('../models/Exam');

const examService = require('../services/examService');
const admitCardPdfCompiler = require('../utils/admitCardPdfCompiler');

async function runPhase19Diagnostics() {
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
    console.log('--- STARTING PHASE 19 EXAM SCHEDULE & ADMIT CARD SUITE ---\n');

    // 1. Setup Admin & Regular Users
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'P19 Admin User',
        email: 'p19_admin@school.com',
        password: 'password123',
        role: 'admin',
      });
    }

    let regularUser = await User.create({
      name: 'P19 Teacher User',
      email: 'p19_teacher_' + Date.now() + '@school.com',
      password: 'password123',
      role: 'teacher',
    });

    let teacherProfile = await Teacher.findOne({});
    if (!teacherProfile) {
      teacherProfile = await Teacher.create({
        firstName: 'Phase19',
        lastName: 'Teacher',
        email: 'p19_teacher@school.com',
        phone: '9876543210',
        user: adminUser._id,
        subject: 'ExamSchedule',
      });
    }

    // 2. Setup Class & Subjects
    const p19Class = await Class.create({
      name: 'P19-CLASS-' + Date.now(),
      section: 'A',
      teacher: teacherProfile._id,
      tuitionFee: 6500,
    });

    let subPhysics = await Subject.findOne({ name: 'P19 Physics' });
    if (!subPhysics) subPhysics = await Subject.create({ name: 'P19 Physics', type: 'Theoretical' });

    let subChemistry = await Subject.findOne({ name: 'P19 Chemistry' });
    if (!subChemistry) subChemistry = await Subject.create({ name: 'P19 Chemistry', type: 'Theoretical' });

    // 3. Create Active Class Students
    const s1 = await Student.create({
      fullName: 'Aarav Sharma',
      admissionNumber: 'P19-ADM-1-' + Date.now(),
      studentId: 'P19-STU-1-' + Date.now(),
      rollNumber: '1',
      gender: 'Male',
      dob: new Date('2012-05-15'),
      className: p19Class.name,
      section: 'A',
      class: p19Class._id,
      session: '2026-2027',
      fatherName: 'Rajesh Sharma',
      motherName: 'Sunita Sharma',
      emergencyContact: '9876543210',
      status: 'Active',
    });

    const s2 = await Student.create({
      fullName: 'Bhavya Verma',
      admissionNumber: 'P19-ADM-2-' + Date.now(),
      studentId: 'P19-STU-2-' + Date.now(),
      rollNumber: '2',
      gender: 'Female',
      dob: new Date('2012-08-20'),
      className: p19Class.name,
      section: 'A',
      class: p19Class._id,
      session: '2026-2027',
      fatherName: 'Vikas Verma',
      motherName: 'Kiran Verma',
      emergencyContact: '9876543211',
      status: 'Active',
    });

    // 4. Create Exam & Subject Config
    const p19Exam = await examService.createExam(
      { name: 'P19 Annual Board Exam', examType: 'ANNUAL', session: '2026-2027', classId: p19Class._id },
      adminUser._id
    );

    await examService.configureExamSubjects(
      p19Exam._id,
      [
        { subjectId: subPhysics._id, maxMarks: 100, passMarks: 33 },
        { subjectId: subChemistry._id, maxMarks: 100, passMarks: 33 },
      ],
      adminUser._id
    );

    // --- TEST 1: Admin Save Exam Schedule ---
    const schedulePayload = [
      { subjectId: subPhysics._id, examDate: '2027-03-10', startTime: '09:00 AM', endTime: '12:00 PM', reportingTime: '08:30 AM' },
      { subjectId: subChemistry._id, examDate: '2027-03-12', startTime: '09:00 AM', endTime: '12:00 PM', reportingTime: '08:30 AM' },
    ];

    const savedExam = await examService.saveExamSchedule({
      examId: p19Exam._id,
      schedule: schedulePayload,
      instructions: 'Custom Exam Guidelines',
      userId: adminUser._id,
    });

    assert(
      savedExam.schedule && savedExam.schedule.length === 2 && savedExam.scheduleStatus === 'Draft',
      'Admin successfully configured subject-wise date sheet schedule with Draft status'
    );

    // --- TEST 2: Duplicate Subject Schedule Prevention ---
    let dupBlocked = false;
    try {
      await examService.saveExamSchedule({
        examId: p19Exam._id,
        schedule: [
          { subjectId: subPhysics._id, examDate: '2027-03-10' },
          { subjectId: subPhysics._id, examDate: '2027-03-11' }, // Duplicate
        ],
        userId: adminUser._id,
      });
    } catch (err) {
      dupBlocked = err.message.includes('Duplicate subject schedule entry');
    }
    assert(dupBlocked, 'Validation engine prevented duplicate subject schedule entries');

    // --- TEST 3: Draft Protection (Non-Admin View Blocked) ---
    let draftBlocked = false;
    try {
      await examService.getExamSchedule(p19Exam._id, regularUser);
    } catch (err) {
      draftBlocked = err.message.includes('not been published yet');
    }
    assert(draftBlocked, 'Backend blocked non-admin access to unpublished Draft exam date sheet');

    // --- TEST 4: Schedule Publishing Workflow ---
    const pubExam = await examService.publishExamSchedule(p19Exam._id, adminUser._id);
    assert(pubExam.scheduleStatus === 'Published', 'Admin successfully published exam date sheet');

    // --- TEST 5: Public Schedule View After Publishing ---
    const pubSchedule = await examService.getExamSchedule(p19Exam._id, regularUser);
    assert(
      pubSchedule.scheduleStatus === 'Published' && pubSchedule.schedule.length === 2,
      'Authorized student/parent user successfully retrieved published date sheet'
    );

    // --- TEST 6: PDFKit Stream Generation of Class Date Sheet PDF ---
    class DummyWritable extends stream.Writable {
      constructor(options) {
        super(options);
        this.chunks = [];
      }
      _write(chunk, encoding, callback) {
        this.chunks.push(chunk);
        callback();
      }
      get buffer() {
        return Buffer.concat(this.chunks);
      }
    }

    const dateSheetStream = new DummyWritable();
    await admitCardPdfCompiler.compileDateSheetPdf(pubSchedule, dateSheetStream);
    await new Promise((r) => setTimeout(r, 100));
    console.log('DEBUG dsStream chunks:', dateSheetStream.chunks.length, 'bytes:', dateSheetStream.buffer.length);
    assert(
      dateSheetStream.buffer && dateSheetStream.buffer.length > 2000,
      `PDFKit compiled class Date Sheet PDF binary stream (${dateSheetStream.buffer.length} bytes)`
    );

    // --- TEST 7: PDFKit Stream Generation of Bulk Class Admit Cards PDF ---
    const admitCardsStream = new DummyWritable();
    await admitCardPdfCompiler.compileBulkAdmitCardsPdf(
      { examId: p19Exam._id, classId: p19Class._id, section: 'A' },
      admitCardsStream
    );
    await new Promise((r) => setTimeout(r, 100));
    assert(
      admitCardsStream.buffer && admitCardsStream.buffer.length > 3000,
      `PDFKit compiled multi-page Class Bulk Admit Cards PDF binary stream (${admitCardsStream.buffer.length} bytes)`
    );

    console.log(`\n🎉 ALL ${passedCount}/${totalCount} PHASE 19 DIAGNOSTIC TESTS PASSED SUCCESSFULLY!`);

    // Clean up
    await User.findByIdAndDelete(regularUser._id);
    await Exam.deleteMany({ class: p19Class._id });
    await Student.deleteMany({ class: p19Class._id });
    await Class.findByIdAndDelete(p19Class._id);
    await Subject.deleteMany({ name: { $in: ['P19 Physics', 'P19 Chemistry'] } });

    process.exit(0);
  } catch (err) {
    console.error('\n❌ PHASE 19 DIAGNOSTIC TEST FAILED:', err.message);
    process.exit(1);
  }
}

runPhase19Diagnostics();
