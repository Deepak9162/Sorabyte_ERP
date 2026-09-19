/**
 * Marksheet Service
 * 
 * Handles single & bulk marks entry, validation, query optimization,
 * class-wise monthly exam matrix reports, and individual student marksheet data generation.
 */

const Exam = require('../models/Exam');
const ExamMarks = require('../models/ExamMarks');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const ExamStudentDetail = require('../models/ExamStudentDetail');
const InstituteSettings = require('../models/InstituteSettings');
const { calculateSubjectResult, calculateOverallResult } = require('../utils/resultCalculator');

class MarksheetService {
  /**
   * Fast Class-Subject Roster & Existing Marks Loader for Marks Entry Console
   */
  async getClassSubjectRoster({ examId, classId, subjectId, section }) {
    if (!examId || !classId || !subjectId) {
      throw new Error('examId, classId, and subjectId are required');
    }

    const exam = await Exam.findById(examId)
      .populate('class', 'name section')
      .populate('subjectsConfig.subject', 'name type')
      .lean();

    if (!exam) throw new Error('Exam not found');
    if (exam.class._id.toString() !== classId.toString()) {
      throw new Error('Exam does not belong to the requested class');
    }

    const subjectConfigItem = exam.subjectsConfig.find(
      (sc) => sc.subject && sc.subject._id.toString() === subjectId.toString()
    );

    if (!subjectConfigItem) {
      throw new Error('Selected subject is not configured for this exam');
    }

    const studentFilter = { class: classId, status: 'Active' };
    if (section) studentFilter.section = section;

    // Fast lean roster query
    const students = await Student.find(studentFilter)
      .select('_id fullName rollNumber admissionNumber section fatherName studentId')
      .sort({ rollNumber: 1, fullName: 1 })
      .lean();

    // Fetch existing marks records in single lean query
    const existingMarks = await ExamMarks.find({
      exam: examId,
      class: classId,
      subject: subjectId,
    }).lean();

    const marksMap = new Map();
    existingMarks.forEach((m) => {
      marksMap.set(m.student.toString(), m);
    });

    const roster = students.map((s) => {
      const markDoc = marksMap.get(s._id.toString());
      return {
        studentId: s._id,
        fullName: s.fullName,
        rollNumber: s.rollNumber,
        admissionNumber: s.admissionNumber,
        section: s.section,
        fatherName: s.fatherName,
        marksObtained: markDoc ? (markDoc.isAbsent ? '' : markDoc.marksObtained) : '',
        isAbsent: markDoc ? markDoc.isAbsent : false,
        status: markDoc ? markDoc.status : '',
        remarks: markDoc ? markDoc.remarks : '',
        isSaved: !!markDoc,
      };
    });

    return {
      exam: {
        id: exam._id,
        name: exam.name,
        examType: exam.examType,
        session: exam.session,
        status: exam.status,
        class: exam.class,
      },
      subjectConfig: {
        subjectId: subjectConfigItem.subject._id,
        subjectName: subjectConfigItem.subject.name,
        subjectType: subjectConfigItem.subject.type,
        maxMarks: subjectConfigItem.maxMarks,
        passMarks: subjectConfigItem.passMarks,
      },
      totalStudents: roster.length,
      students: roster,
    };
  }

  /**
   * Enter or Update a single student mark record
   */
  async enterSingleMark(data, userId) {
    const { examId, studentId, subjectId, marksObtained, isAbsent, remarks } = data;

    if (!examId || !studentId || !subjectId) {
      throw new Error('examId, studentId, and subjectId are required');
    }

    // 1. Fetch exam
    const exam = await Exam.findById(examId);
    if (!exam) throw new Error('Exam not found');

    if (exam.status === 'Finalized' || exam.status === 'Published') {
      const err = new Error(`Marks cannot be modified because the exam result is currently '${exam.status}'. An administrator must explicitly reopen the exam result to make corrections.`);
      err.statusCode = 403;
      throw err;
    }

    // 2. Check if subject configured in exam
    const subjectConfig = exam.subjectsConfig.find(
      (sc) => sc.subject.toString() === subjectId.toString()
    );
    if (!subjectConfig) {
      throw new Error(`Subject is not configured for exam '${exam.name}'`);
    }

    const { maxMarks, passMarks } = subjectConfig;
    const obtainedNum = isAbsent ? 0 : Number(marksObtained);

    // 3. Validations
    if (isNaN(obtainedNum) || obtainedNum < 0) {
      throw new Error('Marks obtained cannot be negative');
    }
    if (obtainedNum > maxMarks) {
      throw new Error(`Marks obtained (${obtainedNum}) cannot exceed maximum marks (${maxMarks})`);
    }

    // 4. Fetch and validate student
    const student = await Student.findById(studentId);
    if (!student) throw new Error('Student not found');
    if (student.status !== 'Active') {
      throw new Error(`Student '${student.fullName}' is not active`);
    }

    // Verify student class matches exam class
    if (student.class && student.class.toString() !== exam.class.toString()) {
      throw new Error(`Student '${student.fullName}' does not belong to the exam class`);
    }

    const status = calculateSubjectResult(obtainedNum, passMarks, !!isAbsent);

    // 5. Upsert mark record
    const filter = { exam: examId, student: studentId, subject: subjectId };
    const update = {
      class: exam.class,
      section: student.section || exam.section || '',
      rollNumber: student.rollNumber || '',
      session: exam.session,
      maxMarks,
      passMarks,
      marksObtained: obtainedNum,
      isAbsent: !!isAbsent,
      status,
      remarks: remarks ? remarks.trim() : '',
      updatedBy: userId,
    };

    const options = { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true };
    const markRecord = await ExamMarks.findOneAndUpdate(
      filter,
      { ...update, $setOnInsert: { enteredBy: userId } },
      options
    );

    return markRecord;
  }

  /**
   * Bulk Enter / Update marks for an entire class using optimized MongoDB bulkWrite
   */
  async bulkEnterMarks(payload, userId) {
    const { examId, classId, marks = [] } = payload;

    if (!examId || !classId) {
      throw new Error('examId and classId are required for bulk marks entry');
    }

    if (!Array.isArray(marks) || marks.length === 0) {
      throw new Error('marks payload must be a non-empty array');
    }

    // 1. Fetch exam
    const exam = await Exam.findById(examId);
    if (!exam) throw new Error('Exam not found');

    if (exam.status === 'Finalized' || exam.status === 'Published') {
      const err = new Error(`Marks cannot be modified because the exam result is currently '${exam.status}'. An administrator must explicitly reopen the exam result to make corrections.`);
      err.statusCode = 403;
      throw err;
    }

    if (exam.class.toString() !== classId.toString()) {
      throw new Error('Exam class does not match the provided classId');
    }

    // Map subject configs for fast O(1) lookup
    const configMap = new Map();
    exam.subjectsConfig.forEach((sc) => {
      configMap.set(sc.subject.toString(), sc);
    });

    // 2. Fetch all valid students in class
    const classStudents = await Student.find({ class: classId, status: 'Active' })
      .select('_id fullName section rollNumber')
      .lean();

    const studentMap = new Map(classStudents.map((s) => [s._id.toString(), s]));

    // 3. Prepare bulk operations & validate each record in memory
    const bulkOps = [];
    const errors = [];

    for (let index = 0; index < marks.length; index++) {
      const item = marks[index];
      const { studentId, subjectId: itemSubId, marksObtained, isAbsent, remarks } = item;
      const targetSubjectId = itemSubId || payload.subjectId;

      const student = studentMap.get(studentId ? studentId.toString() : '');
      if (!student) {
        errors.push(`Row ${index + 1}: Invalid or inactive student ID '${studentId}' for this class`);
        continue;
      }

      const subjectConfig = configMap.get(targetSubjectId ? targetSubjectId.toString() : '');
      if (!subjectConfig) {
        errors.push(`Row ${index + 1}: Subject ID '${targetSubjectId}' is not configured in this exam`);
        continue;
      }

      const { maxMarks, passMarks } = subjectConfig;
      const obtainedNum = isAbsent ? 0 : Number(marksObtained);

      if (isNaN(obtainedNum) || obtainedNum < 0) {
        errors.push(`Row ${index + 1} (${student.fullName}): Marks obtained cannot be negative`);
        continue;
      }
      if (obtainedNum > maxMarks) {
        errors.push(`Row ${index + 1} (${student.fullName}): Marks (${obtainedNum}) exceed maximum marks (${maxMarks})`);
        continue;
      }

      const status = calculateSubjectResult(obtainedNum, passMarks, !!isAbsent);

      bulkOps.push({
        updateOne: {
          filter: { exam: examId, student: studentId, subject: targetSubjectId },
          update: {
            $set: {
              class: classId,
              section: student.section || exam.section || '',
              rollNumber: student.rollNumber || '',
              session: exam.session,
              maxMarks,
              passMarks,
              marksObtained: obtainedNum,
              isAbsent: !!isAbsent,
              status,
              remarks: remarks ? remarks.trim() : '',
              updatedBy: userId,
            },
            $setOnInsert: {
              enteredBy: userId,
            },
          },
          upsert: true,
        },
      });
    }

    if (errors.length > 0) {
      const err = new Error(`Bulk marks validation failed with ${errors.length} error(s)`);
      err.validationErrors = errors;
      throw err;
    }

    // 4. Execute bulkWrite if ops exist
    if (bulkOps.length > 0) {
      await ExamMarks.bulkWrite(bulkOps);
    }

    return {
      success: true,
      processedCount: bulkOps.length,
      message: `Successfully entered/updated marks for ${bulkOps.length} record(s)`,
    };
  }

  /**
   * Get student marks history across exams
   */
  async getStudentMarks(studentId, session = null) {
    const query = { student: studentId };
    if (session) query.session = session;

    return await ExamMarks.find(query)
      .populate('exam', 'name examType session startDate endDate')
      .populate('subject', 'name type')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Get all marks for a specific class and exam
   */
  async getClassMarks(classId, examId) {
    return await ExamMarks.find({ class: classId, exam: examId })
      .populate('student', 'fullName rollNumber admissionNumber studentId')
      .populate('subject', 'name type')
      .lean();
  }

  /**
   * MONTHLY EXAM REQUIREMENT: Generate Class-Wise Monthly Result Matrix Report
   */
  async getMonthlyClassResult(classId, examId) {
    const exam = await Exam.findById(examId)
      .populate('class', 'name section')
      .populate('subjectsConfig.subject', 'name type')
      .lean();

    if (!exam) throw new Error('Exam not found');
    if (exam.class._id.toString() !== classId.toString()) {
      throw new Error('Exam does not belong to the requested class');
    }

    // Fetch active students in class
    const students = await Student.find({ class: classId, status: 'Active' })
      .select('fullName rollNumber admissionNumber studentId section')
      .sort({ rollNumber: 1, fullName: 1 })
      .lean();

    // Fetch marks records for exam & class
    const marksRecords = await ExamMarks.find({ exam: examId, class: classId }).lean();

    // Create lookup matrix: studentId -> subjectId -> mark
    const marksLookup = new Map();
    marksRecords.forEach((m) => {
      const sId = m.student.toString();
      if (!marksLookup.has(sId)) {
        marksLookup.set(sId, new Map());
      }
      marksLookup.get(sId).set(m.subject.toString(), m);
    });

    const subjectsList = exam.subjectsConfig.map((sc) => ({
      subjectId: sc.subject._id,
      name: sc.subject.name,
      type: sc.subject.type,
      maxMarks: sc.maxMarks,
      passMarks: sc.passMarks,
    }));

    // Build student rows
    const studentRows = students.map((s) => {
      const sId = s._id.toString();
      const sMarksMap = marksLookup.get(sId) || new Map();
      const subjectMarks = [];

      subjectsList.forEach((sub) => {
        const markDoc = sMarksMap.get(sub.subjectId.toString());
        subjectMarks.push({
          subjectId: sub.subjectId,
          subjectName: sub.name,
          maxMarks: sub.maxMarks,
          passMarks: sub.passMarks,
          marksObtained: markDoc ? markDoc.marksObtained : null,
          isAbsent: markDoc ? markDoc.isAbsent : false,
          status: markDoc ? markDoc.status : 'N/A',
        });
      });

      // Calculate summary for this student
      const validMarks = subjectMarks.filter((sm) => sm.marksObtained !== null || sm.isAbsent);
      const summary = calculateOverallResult(validMarks);

      return {
        studentId: s._id,
        fullName: s.fullName,
        rollNumber: s.rollNumber,
        admissionNumber: s.admissionNumber,
        subjectMarks,
        summary,
      };
    });

    // Assign rank by percentage descending
    studentRows.sort((a, b) => b.summary.percentage - a.summary.percentage);
    studentRows.forEach((row, idx) => {
      row.rank = idx + 1;
    });

    return {
      exam: {
        id: exam._id,
        name: exam.name,
        examType: exam.examType,
        session: exam.session,
        class: exam.class,
        status: exam.status,
      },
      subjects: subjectsList,
      totalStudents: students.length,
      studentRows,
    };
  }

  /**
   * HALF YEARLY + ANNUAL REQUIREMENT: Generate Individual Student Marksheet Structured Data
   */
  async getStudentResult(studentId, examId) {
    const student = await Student.findById(studentId)
      .populate('class', 'name section teacher')
      .lean();

    if (!student) throw new Error('Student not found');

    const exam = await Exam.findById(examId)
      .populate('class', 'name section')
      .populate('subjectsConfig.subject', 'name type')
      .lean();

    if (!exam) throw new Error('Exam not found');

    // Fetch student marks for this exam
    const marksRecords = await ExamMarks.find({ student: studentId, exam: examId })
      .populate('subject', 'name type')
      .lean();

    // Map subject details
    const subjectBreakdown = exam.subjectsConfig.map((sc) => {
      const subId = sc.subject._id.toString();
      const markDoc = marksRecords.find((m) => m.subject._id.toString() === subId);

      const obtained = markDoc ? markDoc.marksObtained : 0;
      const isAbsent = markDoc ? markDoc.isAbsent : false;
      const status = markDoc
        ? markDoc.status
        : calculateSubjectResult(obtained, sc.passMarks, isAbsent);

      const subjectPercentage = sc.maxMarks > 0 ? (obtained / sc.maxMarks) * 100 : 0;
      const grade = calculateOverallResult([
        { maxMarks: sc.maxMarks, passMarks: sc.passMarks, marksObtained: obtained, isAbsent, status },
      ]).grade;

      return {
        subjectId: sc.subject._id,
        subjectName: sc.subject.name,
        subjectType: sc.subject.type,
        maxMarks: sc.maxMarks,
        passMarks: sc.passMarks,
        marksObtained: markDoc ? (isAbsent ? 'ABSENT' : obtained) : 'N/A',
        isAbsent,
        status,
        grade,
        remarks: markDoc ? markDoc.remarks : '',
      };
    });

    // Calculate aggregate result
    const validMarksForCalc = exam.subjectsConfig.map((sc) => {
      const subId = sc.subject._id.toString();
      const markDoc = marksRecords.find((m) => m.subject._id.toString() === subId);
      const obtained = markDoc ? markDoc.marksObtained : 0;
      const isAbsent = markDoc ? markDoc.isAbsent : false;
      const status = markDoc
        ? markDoc.status
        : calculateSubjectResult(obtained, sc.passMarks, isAbsent);

      return {
        maxMarks: sc.maxMarks,
        passMarks: sc.passMarks,
        marksObtained: obtained,
        isAbsent,
        status,
      };
    });
    const aggregateSummary = calculateOverallResult(validMarksForCalc);

    // Query Attendance summary from existing Attendance model (Read-only integration)
    const attendanceStats = await Attendance.aggregate([
      { $match: { student: student._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    let daysPresent = 0;
    let daysAbsent = 0;
    let daysLeave = 0;
    let totalWorkingDays = 0;

    attendanceStats.forEach((stat) => {
      totalWorkingDays += stat.count;
      if (stat._id === 'Present' || stat._id === 'Late') daysPresent += stat.count;
      else if (stat._id === 'Absent') daysAbsent += stat.count;
      else if (stat._id === 'Leave') daysLeave += stat.count;
    });

    const attendancePercentage =
      totalWorkingDays > 0 ? Math.round((daysPresent / totalWorkingDays) * 10000) / 100 : 0;

    // Fetch student-level detail (remarks & co-scholastic grades)
    const studentDetail = await ExamStudentDetail.findOne({ exam: examId, student: studentId }).lean();

    // Default co-scholastic categories if none saved
    const defaultCoScholastic = [
      { category: 'Discipline & Conduct', grade: 'A+' },
      { category: 'Regularity & Punctuality', grade: 'A' },
      { category: 'Work Education / Skills', grade: 'A' },
      { category: 'Art & Craft Education', grade: 'A+' },
      { category: 'Health & Physical Education', grade: 'A' },
    ];

    const coScholastic = (studentDetail && studentDetail.coScholasticGrades && studentDetail.coScholasticGrades.length > 0)
      ? studentDetail.coScholasticGrades
      : defaultCoScholastic;

    const teacherRemarks = (studentDetail && studentDetail.teacherRemarks)
      ? studentDetail.teacherRemarks
      : (aggregateSummary.overallStatus === 'Pass'
          ? 'Excellent academic performance and consistent progress. Keep up the good work!'
          : 'Needs improvement in core subjects. Additional guidance and practice recommended.');

    return {
      institute: {
        schoolName: 'Little Flower English School',
        address: 'School Address, Main Road',
        affiliation: 'CBSE / State Board',
        academicSession: exam.session,
      },
      student: {
        id: student._id,
        studentCustomId: student.studentId,
        fullName: student.fullName,
        fatherName: student.fatherName,
        motherName: student.motherName,
        rollNumber: (marksRecords[0] && marksRecords[0].rollNumber) ? marksRecords[0].rollNumber : student.rollNumber,
        admissionNumber: student.admissionNumber,
        class: (exam.class && exam.class.name) ? exam.class.name : (student.className || ''),
        section: (marksRecords[0] && marksRecords[0].section) ? marksRecords[0].section : (exam.class && exam.class.section ? exam.class.section : (student.section || 'A')),
        address: student.address || '',
        dob: student.dob,
        photoUrl: student.studentPhoto || student.photoUrl || '',
      },
      exam: {
        id: exam._id,
        name: exam.name,
        examType: exam.examType,
        session: exam.session,
        startDate: exam.startDate,
        endDate: exam.endDate,
      },
      subjects: subjectBreakdown,
      aggregate: aggregateSummary,
      teacherRemarks,
      coScholastic,
      attendance: {
        totalWorkingDays,
        daysPresent,
        daysAbsent,
        daysLeave,
        attendancePercentage: `${attendancePercentage}%`,
      },
      signatures: {
        classTeacher: 'Class Teacher Signature',
        principal: 'Director / Principal Signature',
        dateGenerated: new Date().toISOString(),
      },
    };
  }

  /**
   * Bulk Fetch All Student Marksheet Payload Data for an entire Class
   */
  async getBulkClassMarksheetData(classId, examId) {
    const students = await Student.find({ class: classId, status: 'Active' })
      .select('_id')
      .sort({ rollNumber: 1, fullName: 1 })
      .lean();

    if (!students || students.length === 0) {
      throw new Error('No active students found in this class');
    }

    const marksheetPromises = students.map((s) => this.getStudentResult(s._id, examId));
    return await Promise.all(marksheetPromises);
  }

  /**
   * PHASE 14 REQUIREMENT: Permanent Student Academic History Across Sessions
   */
  async getStudentAcademicHistory(studentId) {
    const student = await Student.findById(studentId).lean();
    if (!student) throw new Error('Student not found');

    // Fetch all marks records for this student
    const marksRecords = await ExamMarks.find({ student: studentId }).select('exam class section rollNumber').lean();
    if (!marksRecords || marksRecords.length === 0) {
      return [];
    }

    const uniqueExamIds = Array.from(new Set(marksRecords.map((m) => m.exam.toString())));

    // Fetch published exams for these exam IDs
    const publishedExams = await Exam.find({ _id: { $in: uniqueExamIds }, status: 'Published' })
      .populate('class', 'name section')
      .sort({ createdAt: -1 })
      .lean();

    const historyList = [];
    for (const exam of publishedExams) {
      try {
        const result = await this.getStudentResult(studentId, exam._id);
        historyList.push({
          examId: exam._id,
          examName: exam.name,
          examType: exam.examType,
          academicSession: exam.session,
          className: result.student.class,
          section: result.student.section,
          rollNumber: result.student.rollNumber,
          percentage: result.aggregate.percentage,
          grade: result.aggregate.overallGrade,
          division: result.aggregate.division,
          resultStatus: result.aggregate.resultStatus,
          publishedAt: exam.publishedAt,
        });
      } catch (err) {
        // Safe fallback
      }
    }

    return historyList;
  }

  /**
   * PHASE 14 REQUIREMENT: Decision-Support Promotion Readiness Indicator (Read-Only)
   */
  async getPromotionReadiness(classId, examId) {
    const exam = await Exam.findById(examId).populate('class', 'name section').lean();
    if (!exam) throw new Error('Exam not found');

    if (exam.examType !== 'ANNUAL') {
      throw new Error('Promotion readiness is only applicable for ANNUAL examinations');
    }

    const students = await Student.find({ class: classId, status: 'Active' })
      .select('_id fullName rollNumber admissionNumber section')
      .sort({ rollNumber: 1, fullName: 1 })
      .lean();

    const studentResults = [];
    let promotionReadyCount = 0;
    let reviewRequiredCount = 0;

    for (const s of students) {
      try {
        const result = await this.getStudentResult(s._id, examId);
        const isReady = result.aggregate.resultStatus === 'Pass';
        if (isReady) promotionReadyCount++;
        else reviewRequiredCount++;

        studentResults.push({
          studentId: s._id,
          fullName: s.fullName,
          rollNumber: s.rollNumber,
          admissionNumber: s.admissionNumber,
          percentage: result.aggregate.percentage,
          overallGrade: result.aggregate.overallGrade,
          resultStatus: result.aggregate.resultStatus,
          promotionReadiness: isReady ? 'READY' : 'REVIEW_REQUIRED',
        });
      } catch (err) {
        reviewRequiredCount++;
        studentResults.push({
          studentId: s._id,
          fullName: s.fullName,
          rollNumber: s.rollNumber,
          admissionNumber: s.admissionNumber,
          percentage: 0,
          overallGrade: 'F',
          resultStatus: 'Fail',
          promotionReadiness: 'REVIEW_REQUIRED',
        });
      }
    }

    return {
      exam: {
        id: exam._id,
        name: exam.name,
        session: exam.session,
        status: exam.status,
      },
      class: {
        id: exam.class._id,
        name: exam.class.name,
        section: exam.class.section,
      },
      totalStudents: students.length,
      promotionReadyCount,
      reviewRequiredCount,
      students: studentResults,
    };
  }

  /**
   * PHASE 15 REQUIREMENT: Bulk Save Teacher Remarks for a Class
   */
  async bulkSaveTeacherRemarks({ classId, examId, remarksData }, userId) {
    const exam = await Exam.findById(examId);
    if (!exam) throw new Error('Exam not found');

    if (exam.status === 'Finalized' || exam.status === 'Published') {
      const err = new Error(`Teacher remarks cannot be modified because the exam result is currently '${exam.status}'. An administrator must explicitly reopen the exam result to make corrections.`);
      err.statusCode = 403;
      throw err;
    }

    const bulkOps = remarksData.map((item) => ({
      updateOne: {
        filter: { exam: examId, student: item.studentId },
        update: {
          $set: {
            class: classId,
            teacherRemarks: (item.remark || '').trim().substring(0, 500),
            updatedBy: userId,
          },
        },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      await ExamStudentDetail.bulkWrite(bulkOps);
    }

    return {
      success: true,
      processedCount: bulkOps.length,
      message: `Successfully saved teacher remarks for ${bulkOps.length} student(s)`,
    };
  }

  /**
   * PHASE 15 REQUIREMENT: Bulk Save Co-Scholastic Grades for a Class
   */
  async bulkSaveCoScholasticGrades({ classId, examId, gradesData }, userId) {
    const exam = await Exam.findById(examId);
    if (!exam) throw new Error('Exam not found');

    if (exam.status === 'Finalized' || exam.status === 'Published') {
      const err = new Error(`Co-scholastic grades cannot be modified because the exam result is currently '${exam.status}'. An administrator must explicitly reopen the exam result to make corrections.`);
      err.statusCode = 403;
      throw err;
    }

    const validGrades = ['A+', 'A', 'B+', 'B', 'C'];
    const bulkOps = gradesData.map((item) => {
      const sanitizedGrades = (item.grades || []).map((g) => ({
        category: (g.category || '').trim(),
        grade: validGrades.includes(g.grade) ? g.grade : 'A',
      }));

      return {
        updateOne: {
          filter: { exam: examId, student: item.studentId },
          update: {
            $set: {
              class: classId,
              coScholasticGrades: sanitizedGrades,
              updatedBy: userId,
            },
          },
          upsert: true,
        },
      };
    });

    if (bulkOps.length > 0) {
      await ExamStudentDetail.bulkWrite(bulkOps);
    }

    return {
      success: true,
      processedCount: bulkOps.length,
      message: `Successfully saved co-scholastic grades for ${bulkOps.length} student(s)`,
    };
  }

  /**
   * PHASE 18 REQUIREMENT: Generate Excel Marks Template
   */
  async generateMarksTemplate({ examId, classId, subjectId, section }) {
    const XLSX = require('xlsx');

    const exam = await Exam.findById(examId).populate('class', 'name section').lean();
    if (!exam) throw new Error('Exam not found');

    const targetClassId = classId || exam.class._id;
    const cls = await Class.findById(targetClassId).lean();
    if (!cls) throw new Error('Class not found');

    const subject = await Subject.findById(subjectId).lean();
    if (!subject) throw new Error('Subject not found');

    const subConfig = (exam.subjectsConfig || []).find(
      (sc) => (sc.subject?._id || sc.subject).toString() === subjectId.toString()
    );
    const maxMarks = subConfig ? subConfig.maxMarks : 100;
    const passMarks = subConfig ? subConfig.passMarks : 33;

    const filterStudentQuery = { class: targetClassId, status: 'Active' };
    if (section) filterStudentQuery.section = section;

    const activeStudents = await Student.find(filterStudentQuery)
      .select('_id studentId fullName rollNumber admissionNumber section')
      .sort({ rollNumber: 1, fullName: 1 })
      .lean();

    const existingMarks = await ExamMarks.find({
      exam: examId,
      class: targetClassId,
      subject: subjectId,
    }).lean();

    const existingMarksMap = {};
    existingMarks.forEach((m) => {
      existingMarksMap[m.student.toString()] = m.marksObtained;
    });

    const rows = [
      ['LITTLE FLOWER ENGLISH SCHOOL (LFES)'],
      [`EXAMINATION: ${exam.name} (${exam.session})`],
      [`CLASS: ${cls.name} (${section || cls.section || 'A'}) • SUBJECT: ${subject.name}`],
      [`MAXIMUM MARKS: ${maxMarks} • PASS MARKS: ${passMarks}`],
      [],
      ['S.No.', 'Student ID', 'Roll No.', 'Student Name', 'Marks Obtained', 'Remarks'],
    ];

    activeStudents.forEach((st, idx) => {
      const studentCustomId = st.studentId || st.admissionNumber || st._id.toString();
      const existingVal = existingMarksMap[st._id.toString()];
      rows.push([
        idx + 1,
        studentCustomId,
        st.rollNumber || '',
        st.fullName,
        existingVal !== undefined ? existingVal : '',
        '',
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Marks Template');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `LFES_${exam.name.replace(/\s+/g, '_')}_${cls.name.replace(/\s+/g, '_')}_${subject.name.replace(/\s+/g, '_')}_MarksTemplate.xlsx`;

    return { buffer, filename };
  }

  /**
   * PHASE 18 REQUIREMENT: Server-Side Excel Import Validation (No DB Write)
   */
  async validateMarksImport({ examId, classId, subjectId, section, fileBuffer }) {
    const XLSX = require('xlsx');

    const exam = await Exam.findById(examId).populate('class', 'name section').lean();
    if (!exam) throw new Error('Exam not found');

    if (exam.status === 'Finalized' || exam.status === 'Published') {
      throw new Error(`Cannot import marks into '${exam.status}' exam. Please reopen the exam first.`);
    }

    const targetClassId = classId || exam.class._id;
    const cls = await Class.findById(targetClassId).lean();
    if (!cls) throw new Error('Class not found');

    const subject = await Subject.findById(subjectId).lean();
    if (!subject) throw new Error('Subject not found');

    const subConfig = (exam.subjectsConfig || []).find(
      (sc) => (sc.subject?._id || sc.subject).toString() === subjectId.toString()
    );
    const maxMarks = subConfig ? subConfig.maxMarks : 100;
    const passMarks = subConfig ? subConfig.passMarks : 33;

    let workbook;
    try {
      workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    } catch (e) {
      throw new Error('Invalid or corrupted spreadsheet file. Unable to parse Excel content.');
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('Spreadsheet contains no worksheets');

    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (!rawRows || rawRows.length === 0) {
      throw new Error('Uploaded spreadsheet is completely empty');
    }

    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(10, rawRows.length); i++) {
      const r = rawRows[i];
      if (Array.isArray(r) && r.some((c) => typeof c === 'string' && (c.includes('Student ID') || c.includes('Marks Obtained')))) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1) {
      throw new Error("Invalid template format: Missing required table columns ('Student ID', 'Marks Obtained')");
    }

    const headers = rawRows[headerRowIdx].map((h) => (h ? h.toString().trim() : ''));
    const studentIdColIdx = headers.findIndex((h) => h.toLowerCase().includes('student id'));
    const rollColIdx = headers.findIndex((h) => h.toLowerCase().includes('roll'));
    const nameColIdx = headers.findIndex((h) => h.toLowerCase().includes('name'));
    const marksColIdx = headers.findIndex((h) => h.toLowerCase().includes('marks'));
    const remarksColIdx = headers.findIndex((h) => h.toLowerCase().includes('remark'));

    if (studentIdColIdx === -1 || marksColIdx === -1) {
      throw new Error("Missing required columns: Spreadsheet must contain 'Student ID' and 'Marks Obtained'");
    }

    const filterStudentQuery = { class: targetClassId, status: 'Active' };
    if (section) filterStudentQuery.section = section;

    const activeStudents = await Student.find(filterStudentQuery)
      .select('_id studentId fullName rollNumber admissionNumber section')
      .lean();

    const existingMarks = await ExamMarks.find({
      exam: examId,
      class: targetClassId,
      subject: subjectId,
    }).lean();

    const studentMap = {};
    activeStudents.forEach((st) => {
      if (st.studentId) studentMap[st.studentId.trim()] = st;
      if (st.admissionNumber) studentMap[st.admissionNumber.trim()] = st;
      studentMap[st._id.toString()] = st;
    });

    const existingMarksMap = {};
    existingMarks.forEach((m) => {
      existingMarksMap[m.student.toString()] = m.marksObtained;
    });

    const seenStudentIdsInFile = new Set();
    const validatedRows = [];

    let countValid = 0;
    let countInvalid = 0;
    let countChanged = 0;
    let countUnchanged = 0;
    let countEmpty = 0;

    for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0) continue;

      const rawStudentId = row[studentIdColIdx] ? row[studentIdColIdx].toString().trim() : '';
      const rawRoll = rollColIdx !== -1 && row[rollColIdx] !== undefined ? row[rollColIdx].toString().trim() : '';
      const rawName = nameColIdx !== -1 && row[nameColIdx] !== undefined ? row[nameColIdx].toString().trim() : '';
      const rawMarks = row[marksColIdx] !== undefined && row[marksColIdx] !== null ? row[marksColIdx].toString().trim() : '';
      const rawRemarks = remarksColIdx !== -1 && row[remarksColIdx] !== undefined ? row[remarksColIdx].toString().trim() : '';

      if (!rawStudentId && !rawName && !rawMarks) continue;

      const matchedStudent = studentMap[rawStudentId];
      const issues = [];
      let rowStatus = 'VALID';

      if (!rawStudentId) {
        issues.push('Missing Student ID');
        rowStatus = 'INVALID';
      } else if (!matchedStudent) {
        issues.push(`Student ID '${rawStudentId}' not found in target class roster`);
        rowStatus = 'INVALID';
      } else if (seenStudentIdsInFile.has(rawStudentId)) {
        issues.push(`Duplicate Student ID '${rawStudentId}' in uploaded file`);
        rowStatus = 'INVALID';
      } else {
        seenStudentIdsInFile.add(rawStudentId);
      }

      let numericMarks = null;
      if (rawMarks === '') {
        rowStatus = rowStatus === 'INVALID' ? 'INVALID' : 'EMPTY';
        countEmpty++;
      } else {
        numericMarks = Number(rawMarks);
        if (isNaN(numericMarks)) {
          issues.push(`Invalid numeric marks value '${rawMarks}'`);
          rowStatus = 'INVALID';
        } else if (numericMarks < 0) {
          issues.push('Marks obtained cannot be negative');
          rowStatus = 'INVALID';
        } else if (numericMarks > maxMarks) {
          issues.push(`Marks obtained (${numericMarks}) exceed maximum marks (${maxMarks})`);
          rowStatus = 'INVALID';
        }
      }

      if (rowStatus !== 'INVALID' && rowStatus !== 'EMPTY' && matchedStudent) {
        const existingVal = existingMarksMap[matchedStudent._id.toString()];
        if (existingVal !== undefined && existingVal === numericMarks) {
          rowStatus = 'UNCHANGED';
          countUnchanged++;
        } else if (existingVal !== undefined && existingVal !== numericMarks) {
          rowStatus = 'CHANGED';
          countChanged++;
        } else {
          rowStatus = 'NEW';
          countValid++;
        }
      } else if (rowStatus === 'INVALID') {
        countInvalid++;
      }

      validatedRows.push({
        rowNumber: i + 1,
        studentId: rawStudentId,
        studentMongoId: matchedStudent ? matchedStudent._id : null,
        rollNumber: matchedStudent ? matchedStudent.rollNumber : rawRoll,
        fullName: matchedStudent ? matchedStudent.fullName : rawName,
        existingMarks: matchedStudent ? existingMarksMap[matchedStudent._id.toString()] ?? '-' : '-',
        importedMarks: numericMarks,
        remarks: rawRemarks,
        status: rowStatus,
        issue: issues.join('; '),
      });
    }

    return {
      exam: { id: exam._id, name: exam.name, session: exam.session },
      class: { id: cls._id, name: cls.name, section: section || cls.section },
      subject: { id: subject._id, name: subject.name, maxMarks, passMarks },
      summary: {
        totalRows: validatedRows.length,
        valid: countValid + countChanged + countUnchanged,
        changed: countChanged,
        unchanged: countUnchanged,
        empty: countEmpty,
        invalid: countInvalid,
      },
      rows: validatedRows,
    };
  }

  /**
   * PHASE 20 REQUIREMENT: Create Marks Correction Request
   */
  async createCorrectionRequest({ examId, studentId, subjectId, requestedMarks, reason, userId }) {
    const MarksCorrectionRequest = require('../models/MarksCorrectionRequest');

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      throw new Error('Justification reason is required and must be at least 5 characters long.');
    }

    const exam = await Exam.findById(examId);
    if (!exam) throw new Error('Exam not found');

    const student = await Student.findById(studentId);
    if (!student) throw new Error('Student not found');

    const subject = await Subject.findById(subjectId);
    if (!subject) throw new Error('Subject not found');

    const subConfig = (exam.subjectsConfig || []).find(
      (sc) => (sc.subject?._id || sc.subject).toString() === subjectId.toString()
    );
    const maxMarks = subConfig ? subConfig.maxMarks : 100;

    const numericReqMarks = Number(requestedMarks);
    if (isNaN(numericReqMarks) || numericReqMarks < 0 || numericReqMarks > maxMarks) {
      throw new Error(`Requested marks (${numericReqMarks}) must be between 0 and maximum marks (${maxMarks}).`);
    }

    // Check duplicate pending request
    const existingPending = await MarksCorrectionRequest.findOne({
      exam: examId,
      student: studentId,
      subject: subjectId,
      status: 'PENDING',
    });
    if (existingPending) {
      throw new Error('A marks correction request is already pending for this student and subject.');
    }

    // Fetch baseline current mark
    const currentMarkDoc = await ExamMarks.findOne({
      exam: examId,
      student: studentId,
      subject: subjectId,
    }).lean();

    const baselineValue = currentMarkDoc ? currentMarkDoc.marksObtained : null;

    const requestDoc = await MarksCorrectionRequest.create({
      exam: examId,
      class: exam.class,
      section: student.section || exam.section || 'A',
      subject: subjectId,
      student: studentId,
      session: exam.session,
      existingMarks: baselineValue,
      requestedMarks: numericReqMarks,
      reason: reason.trim(),
      requestedBy: userId,
      status: 'PENDING',
    });

    return await MarksCorrectionRequest.findById(requestDoc._id)
      .populate('student', 'fullName rollNumber studentId admissionNumber')
      .populate('subject', 'name type')
      .populate('exam', 'name session')
      .populate('requestedBy', 'name email role');
  }

  /**
   * PHASE 20 REQUIREMENT: Get Paginated & Filtered Correction Requests
   */
  async getCorrectionRequests({ session, examId, classId, status, page = 1, limit = 20 }) {
    const MarksCorrectionRequest = require('../models/MarksCorrectionRequest');

    const filter = {};
    if (session) filter.session = session;
    if (examId) filter.exam = examId;
    if (classId) filter.class = classId;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [requests, total] = await Promise.all([
      MarksCorrectionRequest.find(filter)
        .populate('student', 'fullName rollNumber studentId admissionNumber')
        .populate('subject', 'name type')
        .populate('exam', 'name session status')
        .populate('class', 'name section')
        .populate('requestedBy', 'name email role')
        .populate('reviewedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      MarksCorrectionRequest.countDocuments(filter),
    ]);

    return {
      requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * PHASE 20 REQUIREMENT: Admin Approve Correction Request
   */
  async approveCorrectionRequest(requestId, reviewRemarks, adminUserId) {
    const MarksCorrectionRequest = require('../models/MarksCorrectionRequest');
    const examService = require('./examService');

    const reqDoc = await MarksCorrectionRequest.findById(requestId);
    if (!reqDoc) throw new Error('Correction request not found');

    if (reqDoc.status !== 'PENDING') {
      throw new Error(`Cannot approve request with status '${reqDoc.status}'. Only PENDING requests can be approved.`);
    }

    // Verify current mark baseline
    const currentMarkDoc = await ExamMarks.findOne({
      exam: reqDoc.exam,
      student: reqDoc.student,
      subject: reqDoc.subject,
    }).lean();

    const actualCurrentMark = currentMarkDoc ? currentMarkDoc.marksObtained : null;
    if (actualCurrentMark !== reqDoc.existingMarks) {
      throw new Error(
        `Marks have changed since this request was submitted (baseline: ${reqDoc.existingMarks}, current: ${actualCurrentMark}). Please review current marks before approving.`
      );
    }

    const exam = await Exam.findById(reqDoc.exam);
    if (!exam) throw new Error('Associated exam not found');

    const wasPublishedOrFinalized = exam.status === 'Finalized' || exam.status === 'Published';

    // If exam is Finalized or Published, reopen exam first
    if (wasPublishedOrFinalized) {
      await examService.reopenExamResult(
        exam._id,
        `Auto-reopened for approved marks correction request #${reqDoc._id}`,
        adminUserId
      );
    }

    // Apply mark change via bulkEnterMarks
    await this.bulkEnterMarks(
      {
        examId: reqDoc.exam,
        classId: reqDoc.class,
        subjectId: reqDoc.subject,
        marks: [
          {
            studentId: reqDoc.student,
            marksObtained: reqDoc.requestedMarks,
            remarks: `Corrected via request: ${reqDoc.reason}`,
          },
        ],
      },
      adminUserId
    );

    // Finalize & Republish exam if it was published
    if (wasPublishedOrFinalized) {
      await examService.finalizeExamResult(exam._id, adminUserId);
      await examService.publishExamResult(exam._id, adminUserId);
    }

    // Update request status atomically to COMPLETED
    reqDoc.status = 'COMPLETED';
    reqDoc.reviewedBy = adminUserId;
    reqDoc.reviewedAt = new Date();
    reqDoc.appliedAt = new Date();
    if (reviewRemarks) reqDoc.reviewRemarks = reviewRemarks.trim();

    await reqDoc.save();

    return await MarksCorrectionRequest.findById(reqDoc._id)
      .populate('student', 'fullName rollNumber studentId')
      .populate('subject', 'name')
      .populate('exam', 'name session')
      .populate('reviewedBy', 'name email role');
  }

  /**
   * PHASE 20 REQUIREMENT: Admin Reject Correction Request
   */
  async rejectCorrectionRequest(requestId, reviewRemarks, adminUserId) {
    const MarksCorrectionRequest = require('../models/MarksCorrectionRequest');

    const reqDoc = await MarksCorrectionRequest.findById(requestId);
    if (!reqDoc) throw new Error('Correction request not found');

    if (reqDoc.status !== 'PENDING') {
      throw new Error(`Cannot reject request with status '${reqDoc.status}'. Only PENDING requests can be rejected.`);
    }

    reqDoc.status = 'REJECTED';
    reqDoc.reviewedBy = adminUserId;
    reqDoc.reviewedAt = new Date();
    if (reviewRemarks) reqDoc.reviewRemarks = reviewRemarks.trim();

    await reqDoc.save();

    return await MarksCorrectionRequest.findById(reqDoc._id)
      .populate('student', 'fullName rollNumber studentId')
      .populate('subject', 'name')
      .populate('exam', 'name session')
      .populate('reviewedBy', 'name email role');
  }

  /**
   * PHASE 20 REQUIREMENT: Cancel Correction Request
   */
  async cancelCorrectionRequest(requestId, userId) {
    const MarksCorrectionRequest = require('../models/MarksCorrectionRequest');

    const reqDoc = await MarksCorrectionRequest.findById(requestId);
    if (!reqDoc) throw new Error('Correction request not found');

    if (reqDoc.status !== 'PENDING') {
      throw new Error(`Cannot cancel request with status '${reqDoc.status}'. Only PENDING requests can be cancelled.`);
    }

    if (reqDoc.requestedBy.toString() !== userId.toString()) {
      throw new Error('Unauthorized: You can only cancel your own correction requests.');
    }

    reqDoc.status = 'CANCELLED';
    await reqDoc.save();

    return { success: true, message: 'Marks correction request cancelled successfully' };
  }

  /**
   * PHASE 21 REQUIREMENT: Get Result Version History for a Student
   */
  async getResultVersionHistory(examId, studentId) {
    const ExamResultVersion = require('../models/ExamResultVersion');

    const versions = await ExamResultVersion.find({ exam: examId, student: studentId })
      .populate('publishedBy', 'name email role')
      .sort({ version: -1 })
      .select('version isCurrent publishedBy publishedAt revisionReason snapshot.aggregate')
      .lean();

    return versions;
  }

  /**
   * PHASE 21 REQUIREMENT: Get Specific Immutable Result Version Snapshot
   */
  async getStudentResultByVersion(examId, studentId, versionNumber) {
    const ExamResultVersion = require('../models/ExamResultVersion');

    const versionDoc = await ExamResultVersion.findOne({
      exam: examId,
      student: studentId,
      version: Number(versionNumber),
    })
      .populate('student', 'fullName admissionNumber studentId rollNumber gender dob fatherName motherName guardianName avatar class section')
      .populate('exam', 'name examType session status')
      .populate('class', 'name section')
      .populate('publishedBy', 'name email role')
      .lean();

    if (!versionDoc) {
      throw new Error(`Result version ${versionNumber} not found for student.`);
    }

    return {
      version: versionDoc.version,
      isCurrent: versionDoc.isCurrent,
      publishedAt: versionDoc.publishedAt,
      publishedBy: versionDoc.publishedBy,
      revisionReason: versionDoc.revisionReason,
      student: versionDoc.student,
      exam: versionDoc.exam,
      class: versionDoc.class || { name: versionDoc.student?.class?.name, section: versionDoc.section },
      subjects: versionDoc.snapshot.subjects || [],
      aggregate: versionDoc.snapshot.aggregate || {},
      attendance: versionDoc.snapshot.attendance || {},
      coScholastic: versionDoc.snapshot.coScholastic || [],
      remarks: versionDoc.snapshot.remarks || {},
    };
  }

  /**
   * PHASE 21 REQUIREMENT: Stream Historical Version PDF directly from Immutable Snapshot
   */
  async generateVersionPdf(examId, studentId, versionNumber, outStream) {
    const PDFDocument = require('pdfkit');
    const versionData = await this.getStudentResultByVersion(examId, studentId, versionNumber);

    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    doc.pipe(outStream);

    // Render header
    doc.rect(30, 30, 535, 780).strokeColor('#0f172a').lineWidth(2).stroke();
    doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('LITTLE FLOWER ENGLISH SCHOOL', 30, 45, { align: 'center' });
    doc.fillColor('#475569').fontSize(9).font('Helvetica').text('Official Academic Record — Historical Version Snapshot', 30, 65, { align: 'center' });
    doc.fillColor('#dc2626').fontSize(10).font('Helvetica-Bold').text(`HISTORICAL VERSION v${versionData.version} (${versionData.isCurrent ? 'CURRENT' : 'SUPERSEDED'})`, 30, 80, { align: 'center' });

    // Details Box
    doc.rect(40, 100, 515, 60).fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold');
    doc.text(`Student Name: ${versionData.student?.fullName || 'N/A'}`, 50, 110);
    doc.text(`Roll No: ${versionData.rollNumber || versionData.student?.rollNumber || '-'}`, 300, 110);
    doc.text(`Class & Sec: ${versionData.class?.name || '-'} (${versionData.section || 'A'})`, 50, 125);
    doc.text(`Session: ${versionData.exam?.session || '-'}`, 300, 125);
    doc.text(`Published Date: ${new Date(versionData.publishedAt).toLocaleDateString()}`, 50, 140);
    doc.text(`Revision Reason: ${versionData.revisionReason}`, 300, 140);

    // Subjects Table
    let y = 175;
    doc.rect(40, y, 515, 20).fill('#1e293b');
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    doc.text('SUBJECT', 50, y + 5);
    doc.text('MAX MARKS', 230, y + 5);
    doc.text('PASS MARKS', 310, y + 5);
    doc.text('OBTAINED', 390, y + 5);
    doc.text('STATUS', 470, y + 5);
    y += 20;

    (versionData.subjects || []).forEach((sub) => {
      doc.rect(40, y, 515, 18).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      doc.fillColor('#0f172a').fontSize(8).font('Helvetica');
      doc.text(sub.subjectName, 50, y + 4);
      doc.text(String(sub.maxMarks), 230, y + 4);
      doc.text(String(sub.passMarks), 310, y + 4);
      doc.text(String(sub.marksObtained), 390, y + 4);
      doc.fillColor(sub.status === 'Pass' ? '#166534' : '#991b1b').font('Helvetica-Bold');
      doc.text(sub.status, 470, y + 4);
      y += 18;
    });

    // Summary Box
    y += 15;
    const agg = versionData.aggregate || {};
    doc.rect(40, y, 515, 40).fillAndStroke('#f1f5f9', '#cbd5e1');
    doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold');
    doc.text(`Total Obtained: ${agg.totalMarksObtained} / ${agg.totalMaxMarks}`, 50, y + 10);
    doc.text(`Percentage: ${agg.percentage}%`, 220, y + 10);
    doc.text(`Grade: ${agg.overallGrade}`, 350, y + 10);
    doc.text(`Result Status: ${agg.overallStatus}`, 450, y + 10);

    doc.end();
  }
}

module.exports = new MarksheetService();
