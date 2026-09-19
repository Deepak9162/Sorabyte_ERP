/**
 * Seed Production Exams Script
 * Little Flower English School (LFES) School ERP
 * 
 * Cleans up temporary test classes/exams and seeds complete, dynamic exam records,
 * subject configurations, student marks, teacher remarks, co-scholastic grades,
 * date sheets, and published result version snapshots for all real school classes.
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const connectDB = require('../utils/db');

const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Exam = require('../models/Exam');
const ExamMarks = require('../models/ExamMarks');
const ExamResultVersion = require('../models/ExamResultVersion');
const MarksCorrectionRequest = require('../models/MarksCorrectionRequest');
const examService = require('../services/examService');
const marksheetService = require('../services/marksheetService');

async function seedProductionExams() {
  try {
    await connectDB();
    console.log('--- SEEDING PRODUCTION EXAM DATA FOR REAL SCHOOL CLASSES ---\n');

    // 1. Fetch Admin User
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Little Flower Administrator',
        email: 'admin@lfes.com',
        password: 'password123',
        role: 'admin',
      });
    }

    // 2. Cleanup Temporary Test Classes and Exams
    const tempClassNames = await Class.find({
      name: { $regex: /^(P\d+|10-DIAG|FEE-TEST|TEST-CLASS|OTHER-CLASS)/i }
    }).select('_id name');

    const tempClassIds = tempClassNames.map(c => c._id);
    if (tempClassIds.length > 0) {
      console.log(`Cleaning up ${tempClassIds.length} temporary test classes...`);
      await ExamResultVersion.deleteMany({ class: { $in: tempClassIds } });
      await MarksCorrectionRequest.deleteMany({ class: { $in: tempClassIds } });
      await ExamMarks.deleteMany({ class: { $in: tempClassIds } });
      await Exam.deleteMany({ class: { $in: tempClassIds } });
      await Student.deleteMany({ class: { $in: tempClassIds } });
      await Class.deleteMany({ _id: { $in: tempClassIds } });
    }

    // 3. Ensure Core Subjects Exist
    const subjectsToEnsure = [
      { name: 'English', code: 'ENG101', type: 'Theoretical' },
      { name: 'Mathematics', code: 'MATH101', type: 'Theoretical' },
      { name: 'Science / EVS', code: 'EVS101', type: 'Theoretical' },
      { name: 'Hindi', code: 'HIN101', type: 'Theoretical' },
      { name: 'Computer Science', code: 'CS101', type: 'Practical' },
    ];

    const ensuredSubjects = [];
    for (const subDef of subjectsToEnsure) {
      let sub = await Subject.findOne({ name: subDef.name });
      if (!sub) {
        sub = await Subject.create(subDef);
      }
      ensuredSubjects.push(sub);
    }
    console.log(`Ensured ${ensuredSubjects.length} core subjects in DB.`);

    // 4. Fetch Real School Classes
    const realClasses = await Class.find().sort({ name: 1 }).lean();
    console.log(`Found ${realClasses.length} active school classes.`);

    const academicSession = '2026-2027';

    for (const cls of realClasses) {
      const activeStudents = await Student.find({ class: cls._id, status: 'Active' }).sort({ rollNumber: 1, fullName: 1 }).lean();
      if (activeStudents.length === 0) {
        console.log(`Class "${cls.name} (${cls.section || 'N/A'})" has 0 active students. Skipping exam creation.`);
        continue;
      }

      console.log(`\nConfiguring exams for Class "${cls.name} (${cls.section || 'N/A'})" (${activeStudents.length} students)...`);

      // Defined Exam Definitions for this Class
      const examDefs = [
        { name: `Monthly Examination - August 2026`, type: 'MONTHLY' },
        { name: `Half-Yearly Examination 2026`, type: 'HALF_YEARLY' },
        { name: `Annual Examination 2027`, type: 'ANNUAL' },
      ];

      for (const def of examDefs) {
        // Check if exam already exists
        let exam = await Exam.findOne({
          class: cls._id,
          session: academicSession,
          examType: def.type,
          name: def.name,
        });

        if (!exam) {
          exam = await examService.createExam(
            {
              name: def.name,
              examType: def.type,
              session: academicSession,
              classId: cls._id,
              section: cls.section || 'A',
            },
            adminUser._id
          );
        }

        // Configure Subjects with Max 100, Pass 33
        const subjectConfigs = ensuredSubjects.map(s => ({
          subjectId: s._id,
          maxMarks: 100,
          passMarks: 33,
        }));

        await examService.configureExamSubjects(exam._id, subjectConfigs, adminUser._id);

        // Enter Marks for all active students in class
        for (const sub of ensuredSubjects) {
          const marksData = activeStudents.map((st, idx) => {
            // Generate realistic varied score (60 - 98)
            const baseScore = 65 + ((idx * 7 + sub.name.length * 3) % 32);
            return {
              studentId: st._id,
              marksObtained: baseScore,
              isAbsent: false,
            };
          });

          await marksheetService.bulkEnterMarks(
            {
              examId: exam._id,
              classId: cls._id,
              subjectId: sub._id,
              marks: marksData,
            },
            adminUser._id
          );
        }

        // Add Remarks and Co-Scholastic Grades for Half Yearly & Annual
        if (def.type === 'HALF_YEARLY' || def.type === 'ANNUAL') {
          const remarksData = activeStudents.map(st => ({
            studentId: st._id,
            remark: 'Excellent academic progress, punctual and attentive in class.',
          }));

          await marksheetService.bulkSaveTeacherRemarks(
            { classId: cls._id, examId: exam._id, remarksData },
            adminUser._id
          );

          const gradesData = activeStudents.map(st => ({
            studentId: st._id,
            grades: [
              { category: 'Work Education', grade: 'A' },
              { category: 'Art Education', grade: 'A+' },
              { category: 'Health & Physical Education', grade: 'A' },
              { category: 'Discipline & Conduct', grade: 'A+' },
            ],
          }));

          await marksheetService.bulkSaveCoScholasticGrades(
            { classId: cls._id, examId: exam._id, gradesData },
            adminUser._id
          );
        }

        // Save Date Sheet Schedule
        const dateSheetEntries = ensuredSubjects.map((s, idx) => {
          const examDate = new Date(Date.now() + (idx + 1) * 86400000);
          return {
            subjectId: s._id,
            examDate,
            startTime: '09:00 AM',
            endTime: '12:00 PM',
            reportingTime: '08:30 AM',
            room: 'Hall A',
          };
        });

        await examService.saveExamSchedule({
          examId: exam._id,
          schedule: dateSheetEntries,
          instructions: '1. Report 30 minutes before exam commencement.\n2. Carry your printed Admit Card.\n3. Mobile phones are prohibited.',
          userId: adminUser._id,
        });

        await examService.publishExamSchedule(exam._id, adminUser._id);

        // Finalize & Publish Exam Result
        await examService.finalizeExamResult(exam._id, adminUser._id);
        await examService.publishExamResult(exam._id, adminUser._id);

        console.log(`  ✓ Exam "${def.name}" (${def.type}) created, marks saved, date sheet & results published!`);
      }
    }

    console.log('\n🎉 ALL PRODUCTION EXAMS SEEDED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ SEEDING FAILED:', err.message, err.stack);
    process.exit(1);
  }
}

seedProductionExams();
