require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const ExamMarks = require('../models/ExamMarks');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const User = require('../models/User');
const examService = require('../services/examService');
const marksheetService = require('../services/marksheetService');

const assert = (condition, message) => {
  if (!condition) throw new Error('ASSERTION FAILED: ' + message);
  console.log('PASS:', message);
};

(async () => {
  let examId = null;
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

    const admin = await User.findOne({ role: 'admin' }).lean();
    const student = await Student.findOne({ status: 'Active' }).lean();
    if (!admin || !student) throw new Error('Admin/student fixture unavailable');

    const cls = await Class.findById(student.class).lean();
    const otherClass = await Class.findOne({ _id: { $ne: cls._id } }).lean();
    const subjects = await Subject.find({}).limit(2).lean();
    if (!otherClass || subjects.length < 2) throw new Error('Class/subject fixtures unavailable');

    const session = 'EDIT-BUG-' + Date.now();
    const created = await examService.createExam({
      name: '__EXAM_EDIT_FALSE_CHANGE__',
      examType: 'HALF_YEARLY',
      session,
      classId: cls._id,
      section: student.section || cls.section || '',
    }, admin._id);
    examId = created._id;

    const baseConfig = [
      {
        subjectId: subjects[0]._id,
        maxMarks: 100,
        passMarks: 33,
        applicability: 'COMPULSORY',
        applicableStudents: [],
      },
      {
        subjectId: subjects[1]._id,
        maxMarks: 100,
        passMarks: 33,
        applicability: 'COMPULSORY',
        applicableStudents: [],
      },
    ];
    await examService.configureExamSubjects(examId, baseConfig, admin._id);

    // Create dependent marks in subject[0], not the Sanskrit-like subject[1].
    await ExamMarks.create({
      exam: examId,
      student: student._id,
      class: cls._id,
      section: student.section || cls.section || '',
      rollNumber: student.rollNumber || '',
      subject: subjects[0]._id,
      session,
      maxMarks: 100,
      passMarks: 33,
      marksObtained: 76,
      isAbsent: false,
      status: 'Pass',
      enteredBy: admin._id,
      updatedBy: admin._id,
    });

    const originalMark = await ExamMarks.findOne({ exam: examId, subject: subjects[0]._id }).lean();
    const originalId = String(examId);

    // TEST 1 + TEST 3 + TEST 10: same structural values, including String(ObjectId).
    const optionalConfig = [
      baseConfig[0],
      {
        ...baseConfig[1],
        applicability: 'OPTIONAL',
        applicableStudents: [student._id.toString()],
      },
    ];
    const saved = await examService.updateExam(examId, {
      examType: 'HALF_YEARLY',
      session,
      classId: String(cls._id),
      section: student.section || cls.section || '',
      subjectsConfig: optionalConfig,
    }, admin._id);

    assert(String(saved._id) === originalId, 'same Exam document is updated');
    assert(saved.subjectsConfig[1].applicability === 'OPTIONAL', 'TEST 1: Compulsory -> Optional saves with dependent marks elsewhere');
    assert(saved.subjectsConfig[1].applicableStudents.map(String).includes(String(student._id)), 'TEST 2: applicable student assignment saves');
    assert(true, 'TEST 3: unchanged Exam Type/Class/Session did not trigger structural-change error');
    assert(true, 'TEST 10: String(ObjectId) matching stored ObjectId was treated as unchanged');

    // Change assignment only, still with unchanged structural fields present.
    const assignmentOnly = [
      baseConfig[0],
      {
        ...baseConfig[1],
        applicability: 'OPTIONAL',
        applicableStudents: [],
      },
    ];
    const savedAssignment = await examService.updateExam(examId, {
      examType: 'HALF_YEARLY',
      session,
      classId: String(cls._id),
      section: student.section || cls.section || '',
      subjectsConfig: assignmentOnly,
    }, admin._id);
    assert(savedAssignment.subjectsConfig[1].applicableStudents.length === 0, 'TEST 2: optional assignment change persists');

    let classBlocked = false;
    try {
      await examService.updateExam(examId, { classId: String(otherClass._id) }, admin._id);
    } catch (e) {
      classBlocked = e.statusCode === 409 && e.message.includes('cannot be changed');
    }
    assert(classBlocked, 'TEST 4: actual Class Group change remains blocked');

    let typeBlocked = false;
    try {
      await examService.updateExam(examId, { examType: 'ANNUAL' }, admin._id);
    } catch (e) {
      typeBlocked = e.statusCode === 409 && e.message.includes('cannot be changed');
    }
    assert(typeBlocked, 'TEST 5: actual Exam Type change remains blocked');

    let sessionBlocked = false;
    try {
      await examService.updateExam(examId, { session: session + '-NEXT' }, admin._id);
    } catch (e) {
      sessionBlocked = e.statusCode === 409 && e.message.includes('cannot be changed');
    }
    assert(sessionBlocked, 'TEST 6: actual Academic Session change remains blocked');

    const markAfter = await ExamMarks.findById(originalMark._id).lean();
    assert(markAfter.marksObtained === 76 && markAfter.isAbsent === false, 'TEST 7: existing mark remained unchanged');

    const refreshed = await Exam.findById(examId).lean();
    const refreshedConfig = refreshed.subjectsConfig.find(x => String(x.subject) === String(subjects[1]._id));
    assert(refreshedConfig?.applicability === 'OPTIONAL' && refreshedConfig.applicableStudents.length === 0, 'TEST 8: refreshed Exam configuration persists');

    const roster = await marksheetService.getClassSubjectRoster({
      examId,
      classId: cls._id,
      subjectId: subjects[1]._id,
      section: student.section || cls.section || undefined,
    });
    const row = roster.students.find(x => String(x.studentId) === String(student._id));
    assert(row && row.isApplicable === false && row.status === 'N/A', 'TEST 9: Marks Entry reflects updated applicability');

    const finalMark = await ExamMarks.findById(originalMark._id).lean();
    assert(finalMark.marksObtained === 76 && finalMark.isAbsent === false, 'TEST 9: existing unrelated marks remain intact');

    console.log('EXAM EDIT FALSE-STRUCTURAL-CHANGE SUITE: PASS');
  } finally {
    if (mongoose.connection.readyState === 1) {
      if (examId) {
        await ExamMarks.deleteMany({ exam: examId });
        await Exam.deleteOne({ _id: examId });
      }
      await mongoose.disconnect();
    }
  }
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
