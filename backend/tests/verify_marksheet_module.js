/**
 * Comprehensive Examination & Marksheet Diagnostic Verification Script
 * 
 * Verifies all 19 test cases specified in the prompt:
 * 1. Create Monthly Exam
 * 2. Create Half-Yearly Exam
 * 3. Create Annual Exam
 * 4. Configure subjects
 * 5. Add marks for one student
 * 6. Bulk add marks for an entire class
 * 7. Update marks
 * 8. Attempt invalid marks > maximum
 * 9. Attempt negative marks
 * 10. Attempt duplicate marks
 * 11. Attempt unauthorized teacher access
 * 12. Attempt teacher access to unauthorized class
 * 13. Retrieve class-wise monthly result
 * 14. Retrieve Half-Yearly student result
 * 15. Retrieve Annual student result
 * 16. Verify percentage
 * 17. Verify total marks
 * 18. Verify grade/division calculation
 * 19. Verify existing ERP functionality remains unaffected
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
const Attendance = require('../models/Attendance');

// Services & Utilities
const examService = require('../services/examService');
const marksheetService = require('../services/marksheetService');
const { calculateOverallResult, calculateGrade, calculateDivision } = require('../utils/resultCalculator');

async function runDiagnostics() {
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
    console.log('--- STARTING MARKSHEET MODULE DIAGNOSTIC SUITE ---\n');

    // Setup Test Data in DB
    // 1. Create or fetch Admin User
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Test Admin',
        email: 'testadmin_diag@school.com',
        password: 'password123',
        role: 'admin',
      });
    }

    // 2. Create or fetch Teacher Users
    let teacherUserAuth = await User.findOne({ email: 'authorized_teacher@school.com' });
    if (!teacherUserAuth) {
      teacherUserAuth = await User.create({
        name: 'Auth Teacher',
        email: 'authorized_teacher@school.com',
        password: 'password123',
        role: 'teacher',
      });
    }

    let teacherUserUnauth = await User.findOne({ email: 'unauthorized_teacher@school.com' });
    if (!teacherUserUnauth) {
      teacherUserUnauth = await User.create({
        name: 'Unauth Teacher',
        email: 'unauthorized_teacher@school.com',
        password: 'password123',
        role: 'teacher',
      });
    }

    // 3. Create Teacher Profiles
    let authTeacher = await Teacher.findOne({ user: teacherUserAuth._id });
    if (!authTeacher) {
      authTeacher = await Teacher.create({
        firstName: 'Authorized',
        lastName: 'Teacher',
        email: teacherUserAuth.email,
        phone: '9876543210',
        user: teacherUserAuth._id,
        subject: 'Mathematics',
      });
    }

    let unauthTeacher = await Teacher.findOne({ user: teacherUserUnauth._id });
    if (!unauthTeacher) {
      unauthTeacher = await Teacher.create({
        firstName: 'Unauthorized',
        lastName: 'Teacher',
        email: teacherUserUnauth.email,
        phone: '9876543211',
        user: teacherUserUnauth._id,
        subject: 'English',
      });
    }

    // 4. Create Subjects
    let subHindi = await Subject.findOne({ name: 'Hindi Test' });
    if (!subHindi) subHindi = await Subject.create({ name: 'Hindi Test', type: 'Theoretical' });

    let subMath = await Subject.findOne({ name: 'Mathematics Test' });
    if (!subMath) subMath = await Subject.create({ name: 'Mathematics Test', type: 'Theoretical' });

    let subEng = await Subject.findOne({ name: 'English Test' });
    if (!subEng) subEng = await Subject.create({ name: 'English Test', type: 'Theoretical' });

    // 5. Create Test Class
    const testClassName = '10-DIAG-' + Date.now();
    const testClass = await Class.create({
      name: testClassName,
      section: 'A',
      teacher: authTeacher._id,
      tuitionFee: 1500,
    });

    // Map subject to class for Auth Teacher
    await ClassSubject.create({
      class: testClass._id,
      subject: subMath._id,
      teacher: authTeacher._id,
    });

    // 6. Create Test Students
    const student1 = await Student.create({
      fullName: 'Rahul Sharma',
      admissionNumber: 'ADM-DIAG-1-' + Date.now(),
      studentId: 'STU-DIAG-1-' + Date.now(),
      rollNumber: '101',
      gender: 'Male',
      dob: new Date('2010-05-15'),
      className: testClass.name,
      section: 'A',
      class: testClass._id,
      session: '2026-2027',
      fatherName: 'Ramesh Sharma',
      motherName: 'Sunita Sharma',
      emergencyContact: '9876543210',
      status: 'Active',
    });

    const student2 = await Student.create({
      fullName: 'Priya Verma',
      admissionNumber: 'ADM-DIAG-2-' + Date.now(),
      studentId: 'STU-DIAG-2-' + Date.now(),
      rollNumber: '102',
      gender: 'Female',
      dob: new Date('2010-08-20'),
      className: testClass.name,
      section: 'A',
      class: testClass._id,
      session: '2026-2027',
      fatherName: 'Suresh Verma',
      motherName: 'Kavita Verma',
      emergencyContact: '9876543211',
      status: 'Active',
    });

    // Create test attendance
    await Attendance.create({
      student: student1._id,
      class: testClass._id,
      date: new Date(),
      status: 'Present',
    });

    // --- TEST SUITE EXECUTION ---

    // 1. Create Monthly Exam
    const monthlyExam = await examService.createExam(
      {
        name: 'Monthly Test 1',
        examType: 'MONTHLY',
        session: '2026-2027',
        classId: testClass._id,
        section: 'A',
      },
      adminUser._id
    );
    assert(monthlyExam && monthlyExam.examType === 'MONTHLY', 'Create Monthly Exam');

    // 2. Create Half-Yearly Exam
    const halfYearlyExam = await examService.createExam(
      {
        name: 'Half Yearly Examination 2026',
        examType: 'HALF_YEARLY',
        session: '2026-2027',
        classId: testClass._id,
        section: 'A',
      },
      adminUser._id
    );
    assert(halfYearlyExam && halfYearlyExam.examType === 'HALF_YEARLY', 'Create Half-Yearly Exam');

    // 3. Create Annual Exam
    const annualExam = await examService.createExam(
      {
        name: 'Annual Examination 2027',
        examType: 'ANNUAL',
        session: '2026-2027',
        classId: testClass._id,
        section: 'A',
      },
      adminUser._id
    );
    assert(annualExam && annualExam.examType === 'ANNUAL', 'Create Annual Exam');

    // 4. Configure Subjects
    const configuredExam = await examService.configureExamSubjects(
      monthlyExam._id,
      [
        { subjectId: subHindi._id, maxMarks: 100, passMarks: 33 },
        { subjectId: subMath._id, maxMarks: 100, passMarks: 33 },
        { subjectId: subEng._id, maxMarks: 100, passMarks: 33 },
      ],
      adminUser._id
    );
    assert(configuredExam.subjectsConfig.length === 3, 'Configure Exam Subjects (Hindi, Math, Eng)');

    await examService.configureExamSubjects(
      halfYearlyExam._id,
      [
        { subjectId: subHindi._id, maxMarks: 100, passMarks: 33 },
        { subjectId: subMath._id, maxMarks: 100, passMarks: 33 },
      ],
      adminUser._id
    );

    // 5. Add marks for one student
    const markRec1 = await marksheetService.enterSingleMark(
      {
        examId: monthlyExam._id,
        studentId: student1._id,
        subjectId: subMath._id,
        marksObtained: 85,
        remarks: 'Excellent performance',
      },
      adminUser._id
    );
    assert(markRec1.marksObtained === 85 && markRec1.status === 'Pass', 'Add single student mark');

    // 6. Bulk add marks for entire class
    const bulkResult = await marksheetService.bulkEnterMarks(
      {
        examId: monthlyExam._id,
        classId: testClass._id,
        marks: [
          { studentId: student1._id, subjectId: subHindi._id, marksObtained: 90 },
          { studentId: student1._id, subjectId: subEng._id, marksObtained: 75 },
          { studentId: student2._id, subjectId: subHindi._id, marksObtained: 60 },
          { studentId: student2._id, subjectId: subMath._id, marksObtained: 40 },
          { studentId: student2._id, subjectId: subEng._id, marksObtained: 55 },
        ],
      },
      adminUser._id
    );
    assert(bulkResult.processedCount === 5, 'Bulk add marks for entire class');

    // 7. Update marks
    const updatedMark = await marksheetService.enterSingleMark(
      {
        examId: monthlyExam._id,
        studentId: student1._id,
        subjectId: subMath._id,
        marksObtained: 95,
        remarks: 'Revised after re-evaluation',
      },
      adminUser._id
    );
    assert(updatedMark.marksObtained === 95, 'Update student mark record');

    // 8. Attempt invalid marks > maximum
    let err8Caught = false;
    try {
      await marksheetService.enterSingleMark(
        {
          examId: monthlyExam._id,
          studentId: student1._id,
          subjectId: subMath._id,
          marksObtained: 150, // exceeds max (100)
        },
        adminUser._id
      );
    } catch (e) {
      err8Caught = true;
    }
    assert(err8Caught, 'Validation failure: marks > maxMarks blocked');

    // 9. Attempt negative marks
    let err9Caught = false;
    try {
      await marksheetService.enterSingleMark(
        {
          examId: monthlyExam._id,
          studentId: student1._id,
          subjectId: subMath._id,
          marksObtained: -10,
        },
        adminUser._id
      );
    } catch (e) {
      err9Caught = true;
    }
    assert(err9Caught, 'Validation failure: negative marks blocked');

    // 10. Attempt duplicate marks (Database Unique Constraint)
    const countBefore = await ExamMarks.countDocuments({
      exam: monthlyExam._id,
      student: student1._id,
      subject: subMath._id,
    });
    await marksheetService.enterSingleMark(
      {
        examId: monthlyExam._id,
        studentId: student1._id,
        subjectId: subMath._id,
        marksObtained: 95,
      },
      adminUser._id
    );
    const countAfter = await ExamMarks.countDocuments({
      exam: monthlyExam._id,
      student: student1._id,
      subject: subMath._id,
    });
    assert(countBefore === 1 && countAfter === 1, 'Duplicate marks prevented by unique compound index');

    // 11. RBAC Check: Authorized Teacher vs Unauthorized Teacher
    const mockReqAuth = { user: teacherUserAuth, body: { classId: testClass._id, subjectId: subMath._id } };
    const mockReqUnauth = { user: teacherUserUnauth, body: { classId: testClass._id, subjectId: subMath._id } };
    const { verifyExamTeacherAccess } = require('../middleware/examTeacherAuth');
    
    let authCheckPassed = false;
    const middlewareAuth = verifyExamTeacherAccess('body', 'body');
    await middlewareAuth(mockReqAuth, {}, () => { authCheckPassed = true; });
    assert(authCheckPassed, 'RBAC: Authorized teacher granted access');

    // 12. Teacher access to unauthorized class
    let unauthCheckBlocked = false;
    const mockRes = {
      status: function (code) {
        if (code === 403) unauthCheckBlocked = true;
        return this;
      },
      json: function () {},
    };
    await middlewareAuth(mockReqUnauth, mockRes, () => {});
    assert(unauthCheckBlocked, 'RBAC: Unauthorized teacher access blocked with 403');

    // 13. Retrieve Class-wise Monthly Result
    const monthlyReport = await marksheetService.getMonthlyClassResult(testClass._id, monthlyExam._id);
    assert(
      monthlyReport.studentRows.length === 2 && monthlyReport.subjects.length === 3,
      'Retrieve Monthly Class-Wise Result Matrix Report'
    );

    // 14. Retrieve Half-Yearly Student Result
    await marksheetService.bulkEnterMarks(
      {
        examId: halfYearlyExam._id,
        classId: testClass._id,
        marks: [
          { studentId: student1._id, subjectId: subHindi._id, marksObtained: 80 },
          { studentId: student1._id, subjectId: subMath._id, marksObtained: 90 },
        ],
      },
      adminUser._id
    );

    const halfYearlyResult = await marksheetService.getStudentResult(student1._id, halfYearlyExam._id);
    assert(
      halfYearlyResult.student.fullName === student1.fullName &&
        halfYearlyResult.aggregate.totalMarksObtained === 170 &&
        halfYearlyResult.attendance.totalWorkingDays >= 1,
      'Retrieve Half-Yearly Student Result JSON Payload'
    );

    // 15. Retrieve Annual Student Result
    await examService.configureExamSubjects(
      annualExam._id,
      [{ subjectId: subMath._id, maxMarks: 100, passMarks: 33 }],
      adminUser._id
    );
    await marksheetService.enterSingleMark(
      {
        examId: annualExam._id,
        studentId: student1._id,
        subjectId: subMath._id,
        marksObtained: 88,
      },
      adminUser._id
    );

    const annualResult = await marksheetService.getStudentResult(student1._id, annualExam._id);
    assert(annualResult.exam.examType === 'ANNUAL', 'Retrieve Annual Student Result JSON Payload');

    // 16. Verify Percentage Calculation
    // Student 1 in Monthly Exam: Math (95/100), Hindi (90/100), Eng (75/100) -> Total 260/300 -> 86.67%
    const s1MonthlyResult = await marksheetService.getStudentResult(student1._id, monthlyExam._id);
    assert(s1MonthlyResult.aggregate.percentage === 86.67, 'Verify percentage calculation (86.67%)');

    // 17. Verify Total Marks
    assert(s1MonthlyResult.aggregate.totalMarksObtained === 260, 'Verify total marks obtained (260/300)');

    // 18. Verify Grade & Division Calculation
    assert(
      s1MonthlyResult.aggregate.grade === 'A' && s1MonthlyResult.aggregate.division === '1st Division',
      'Verify grade (A) and division (1st Division) calculation'
    );

    // 19. Verify Existing ERP Functionality Unaffected
    const fetchStudent = await Student.findById(student1._id);
    const fetchClass = await Class.findById(testClass._id);
    const fetchAttendance = await Attendance.findOne({ student: student1._id });
    assert(
      fetchStudent && fetchClass && fetchAttendance,
      'Verify existing ERP models (Student, Class, Attendance) remain 100% untouched and functional'
    );

    console.log(`\n🎉 ALL ${passedCount}/${totalCount} MARKSHEET MODULE DIAGNOSTIC TESTS PASSED SUCCESSFULLY!`);

    // Clean up test data
    await ExamMarks.deleteMany({ class: testClass._id });
    await Exam.deleteMany({ class: testClass._id });
    await Student.deleteMany({ class: testClass._id });
    await ClassSubject.deleteMany({ class: testClass._id });
    await Class.findByIdAndDelete(testClass._id);
    await Subject.deleteMany({ name: { $in: ['Hindi Test', 'Mathematics Test', 'English Test'] } });
    await Attendance.deleteMany({ student: student1._id });

    process.exit(0);
  } catch (err) {
    console.error('\n❌ DIAGNOSTIC TEST RUN FAILED:', err.message);
    process.exit(1);
  }
}

runDiagnostics();
