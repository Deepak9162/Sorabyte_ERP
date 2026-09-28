require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const connectDB = require('../utils/db');
const Exam = require('../models/Exam');
const ExamMarks = require('../models/ExamMarks');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const User = require('../models/User');
const examService = require('../services/examService');
const marksheetService = require('../services/marksheetService');
const { authorize } = require('../middleware/auth');

const prefix = '__SAFE_EXAM_MGMT_TEST__';

const assert = (condition, message) => {
  if (!condition) throw new Error('ASSERTION FAILED: ' + message);
  console.log('PASS:', message);
};

(async () => {
  const createdExamIds = [];
  try {
    await connectDB();

    const admin = await User.findOne({ role: 'admin', isActive: { $ne: false } }).lean();
    if (!admin) throw new Error('No active admin available for isolated test');

    const student = await Student.findOne({ status: 'Active' }).lean();
    if (!student) throw new Error('No active student available for isolated test');

    const cls = await Class.findById(student.class).lean();
    if (!cls) throw new Error('Student class not found');

    const subjects = await Subject.find({}).limit(3).lean();
    if (subjects.length < 3) throw new Error('At least 3 subjects are required for isolated test');

    const session = 'TEST-' + Date.now();

    const exam = await examService.createExam({
      name: prefix + ' EDIT',
      examType: 'MONTHLY',
      session,
      classId: cls._id,
      section: student.section || cls.section || 'A',
    }, admin._id);
    createdExamIds.push(exam._id);
    const originalId = exam._id.toString();

    const baseConfig = subjects.slice(0, 2).map((subject) => ({
      subjectId: subject._id,
      maxMarks: 100,
      passMarks: 33,
      applicability: 'COMPULSORY',
      applicableStudents: [],
    }));
    await examService.configureExamSubjects(exam._id, baseConfig, admin._id);

    const addedConfig = [...baseConfig, {
      subjectId: subjects[2]._id,
      maxMarks: 100,
      passMarks: 33,
      applicability: 'COMPULSORY',
      applicableStudents: [],
    }];

    const edited = await examService.updateExam(exam._id, {
      name: prefix + ' EDITED',
      examType: 'MONTHLY',
      session,
      classId: cls._id,
      section: student.section || cls.section || 'A',
      subjectsConfig: addedConfig,
    }, admin._id);

    assert(edited._id.toString() === originalId, 'Edit updates SAME exam ID');
    assert(edited.subjectsConfig.length === 3, 'Missing subject can be added to existing exam');
    assert(await ExamMarks.countDocuments({ exam: exam._id }) === 0, 'Adding subject creates no zero/ABS mark records');

    // Return to two subjects before creating a mark so the next step verifies
    // the exact production case: add a missing subject AFTER marks already exist.
    await examService.updateExam(exam._id, { subjectsConfig: baseConfig }, admin._id);

    await ExamMarks.create({
      exam: exam._id,
      student: student._id,
      class: cls._id,
      section: student.section || cls.section || 'A',
      rollNumber: student.rollNumber || '',
      subject: subjects[0]._id,
      session,
      maxMarks: 100,
      passMarks: 33,
      marksObtained: 72,
      isAbsent: false,
      status: 'Pass',
      enteredBy: admin._id,
      updatedBy: admin._id,
    });

    const beforeMark = await ExamMarks.findOne({ exam: exam._id, student: student._id, subject: subjects[0]._id }).lean();

    const afterMarksAdd = await examService.updateExam(exam._id, {
      subjectsConfig: addedConfig,
    }, admin._id);
    assert(afterMarksAdd._id.toString() === originalId, 'Adding subject after marks exist keeps SAME exam ID');
    assert(afterMarksAdd.subjectsConfig.length === 3, 'New subject can be added after other subjects already have marks');
    assert(await ExamMarks.countDocuments({ exam: exam._id }) === 1, 'New subject does not auto-create zero/ABS records after marks exist');

    const withPendingNewSubject = await marksheetService.getStudentResult(student._id, exam._id);
    const pendingSubject = withPendingNewSubject.subjects.find((item) => item.subjectId.toString() === subjects[1]._id.toString());
    assert(pendingSubject?.status === 'Pending', 'Missing applicable marks remain Pending, not zero/ABS');
    assert(withPendingNewSubject.aggregate.overallStatus === 'Incomplete', 'Pending subject keeps result Incomplete');

    const afterMark = await ExamMarks.findById(beforeMark._id).lean();
    assert(afterMark.marksObtained === 72 && afterMark.isAbsent === false, 'Existing marks stay unchanged');

    const removedUnused = await examService.updateExam(exam._id, {
      subjectsConfig: baseConfig,
    }, admin._id);
    assert(removedUnused.subjectsConfig.length === 2, 'Unused subject can be safely removed');

    let usedRemoveBlocked = false;
    try {
      await examService.updateExam(exam._id, {
        subjectsConfig: [baseConfig[1]],
      }, admin._id);
    } catch (error) {
      usedRemoveBlocked = error.statusCode === 409;
    }
    assert(usedRemoveBlocked, 'Subject with existing marks cannot be removed');

    let maxChangeBlocked = false;
    try {
      await examService.updateExam(exam._id, {
        subjectsConfig: [
          { ...baseConfig[0], maxMarks: 80 },
          baseConfig[1],
        ],
      }, admin._id);
    } catch (error) {
      maxChangeBlocked = error.statusCode === 409;
    }
    assert(maxChangeBlocked, 'Max/Pass change is blocked when subject marks exist');

    const optionalEdited = await examService.updateExam(exam._id, {
      subjectsConfig: [
        baseConfig[0],
        {
          ...baseConfig[1],
          applicability: 'OPTIONAL',
          applicableStudents: [student._id.toString()],
        },
      ],
    }, admin._id);
    const optionalConfig = optionalEdited.subjectsConfig.find(
      (item) => item.subject._id.toString() === subjects[1]._id.toString()
    );
    assert(optionalConfig.applicability === 'OPTIONAL', 'Optional subject configuration works in Edit mode');

    const crossClassStudent = await Student.findOne({
      _id: { $ne: student._id },
      class: { $ne: cls._id },
      status: 'Active',
    }).lean();
    if (crossClassStudent) {
      let crossClassBlocked = false;
      try {
        await examService.updateExam(exam._id, {
          subjectsConfig: [
            baseConfig[0],
            {
              ...baseConfig[1],
              applicability: 'OPTIONAL',
              applicableStudents: [crossClassStudent._id.toString()],
            },
          ],
        }, admin._id);
      } catch (error) {
        crossClassBlocked = error.statusCode === 400;
      }
      assert(crossClassBlocked, 'Cross-class crafted optional assignment is rejected');
    } else {
      console.log('SKIP: Cross-class assignment test (no student in another class)');
    }

    let teacherStatus = null;
    let teacherNextCalled = false;
    authorize('admin')(
      { user: { role: 'teacher' } },
      {
        status(code) {
          teacherStatus = code;
          return this;
        },
        json() {
          return this;
        },
      },
      () => {
        teacherNextCalled = true;
      }
    );
    assert(teacherStatus === 403 && !teacherNextCalled, 'Teacher is rejected by Admin-only destructive route middleware');

    let deleteWithMarksBlocked = false;
    try {
      await examService.deleteExam(exam._id);
    } catch (error) {
      deleteWithMarksBlocked = error.statusCode === 409;
    }
    assert(deleteWithMarksBlocked, 'Exam with marks cannot be deleted');

    const emptyExam = await examService.createExam({
      name: prefix + ' EMPTY',
      examType: 'MONTHLY',
      session: session + '-EMPTY',
      classId: cls._id,
      section: student.section || cls.section || 'A',
    }, admin._id);
    createdExamIds.push(emptyExam._id);
    const emptyId = emptyExam._id.toString();
    await examService.deleteExam(emptyExam._id);
    assert(!(await Exam.exists({ _id: emptyId })), 'Empty accidental exam can be deleted');

    const duplicateExam = await examService.createExam({
      name: prefix + ' DUP',
      examType: 'HALF_YEARLY',
      session: session + '-DUP',
      classId: cls._id,
      section: student.section || cls.section || 'A',
    }, admin._id);
    createdExamIds.push(duplicateExam._id);

    let duplicateBlocked = false;
    try {
      await examService.createExam({
        name: prefix + ' DUP 2',
        examType: 'HALF_YEARLY',
        session: session + '-DUP',
        classId: cls._id,
        section: student.section || cls.section || 'A',
      }, admin._id);
    } catch (error) {
      duplicateBlocked = error.statusCode === 409;
    }
    assert(duplicateBlocked, 'Duplicate CREATE protection remains active');

    const selfEdit = await examService.updateExam(duplicateExam._id, {
      name: prefix + ' DUP RENAMED',
      examType: 'HALF_YEARLY',
      session: session + '-DUP',
      classId: cls._id,
      section: student.section || cls.section || 'A',
    }, admin._id);
    assert(selfEdit._id.toString() === duplicateExam._id.toString(), 'Edit excludes current exam from duplicate check');

    const markedDoc = await Exam.findById(exam._id);
    markedDoc.status = 'Published';
    await markedDoc.save();

    let publishedEditBlocked = false;
    try {
      await examService.updateExam(exam._id, { name: prefix + ' SHOULD BLOCK' }, admin._id);
    } catch (error) {
      publishedEditBlocked = error.statusCode === 403;
    }
    assert(publishedEditBlocked, 'Published structural edit is blocked');

    let publishedDeleteBlocked = false;
    try {
      await examService.deleteExam(exam._id);
    } catch (error) {
      publishedDeleteBlocked = error.statusCode === 409;
    }
    assert(publishedDeleteBlocked, 'Published exam delete is blocked');

    console.log('SAFE EXAM MANAGEMENT TEST SUITE: PASS');
  } finally {
    if (mongoose.connection.readyState === 1) {
      const ids = createdExamIds.filter(Boolean);
      if (ids.length) {
        await ExamMarks.deleteMany({ exam: { $in: ids } });
        await Exam.deleteMany({ _id: { $in: ids } });
      }
      await mongoose.disconnect();
    }
  }
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
