/**
 * Exam Service
 * 
 * Manages creation, updating, subject configuration, listing, and safety-checked
 * deletion of examinations.
 */

const Exam = require('../models/Exam');
const ExamMarks = require('../models/ExamMarks');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const ClassSubject = require('../models/ClassSubject');
const Student = require('../models/Student');

class ExamService {
  /**
   * Get dynamic options for Marks Entry filter bar based on user role
   */
  async getMarksEntryOptions(user) {
    const sessions = ['2026-2027', '2025-2026'];
    const examTypes = ['MONTHLY', 'HALF_YEARLY', 'ANNUAL'];

    let classQuery = { isActive: true };
    let examQuery = {};

    if (user.role === 'teacher') {
      const teacher = await Teacher.findOne({ user: user._id, isActive: true });
      if (!teacher) {
        throw new Error('Active teacher profile not found for logged in user');
      }

      // Classes assigned as Class Teacher
      const classTeacherClasses = await Class.find({ teacher: teacher._id, isActive: true }).select('_id');
      const classTeacherClassIds = classTeacherClasses.map((c) => c._id.toString());

      // Classes assigned as Subject Teacher in ClassSubject
      const subjectMappings = await ClassSubject.find({ teacher: teacher._id }).select('class');
      const subjectClassIds = subjectMappings.map((m) => m.class.toString());

      const allowedClassIds = Array.from(new Set([...classTeacherClassIds, ...subjectClassIds]));
      classQuery._id = { $in: allowedClassIds };
      examQuery.class = { $in: allowedClassIds };
    }

    const classes = await Class.find(classQuery).select('name section teacher').sort({ name: 1 }).lean();
    const exams = await Exam.find(examQuery)
      .populate('class', 'name section')
      .populate('subjectsConfig.subject', 'name type')
      .sort({ createdAt: -1 })
      .lean();

    return {
      sessions,
      examTypes,
      classes,
      exams,
    };
  }

  /**
   * Create a new exam
   */
  async createExam(examData, userId) {
    const { name, examType, session, classId, section, startDate, endDate } = examData;

    if (!name || !examType || !session || !classId) {
      throw new Error('Name, examType, session, and classId are required');
    }

    const validTypes = ['MONTHLY', 'HALF_YEARLY', 'ANNUAL'];
    if (!validTypes.includes(examType)) {
      throw new Error(`Invalid examType '${examType}'. Must be one of: ${validTypes.join(', ')}`);
    }

    const cls = await Class.findById(classId);
    if (!cls) {
      throw new Error('Class not found');
    }

    // For HALF_YEARLY and ANNUAL, check if exam of same type already exists for this class & session
    if (examType === 'HALF_YEARLY' || examType === 'ANNUAL') {
      const existingExam = await Exam.findOne({
        class: classId,
        session: session.trim(),
        examType,
      });

      if (existingExam) {
        throw new Error(
          `A ${examType} exam already exists for class '${cls.name}' in session '${session}'`
        );
      }
    }

    const exam = await Exam.create({
      name: name.trim(),
      examType,
      session: session.trim(),
      class: classId,
      section: section ? section.trim() : (cls.section || ''),
      startDate,
      endDate,
      createdBy: userId,
      updatedBy: userId,
    });

    return await Exam.findById(exam._id).populate('class', 'name section');
  }

  /**
   * Get all exams with optional filters
   */
  async getAllExams(filters = {}) {
    const query = {};

    if (filters.classId) query.class = filters.classId;
    if (filters.session) query.session = filters.session;
    if (filters.examType) query.examType = filters.examType;
    if (filters.status) query.status = filters.status;

    return await Exam.find(query)
      .populate('class', 'name section')
      .populate('subjectsConfig.subject', 'name type')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Get exam by ID
   */
  async getExamById(examId) {
    const exam = await Exam.findById(examId)
      .populate('class', 'name section')
      .populate('subjectsConfig.subject', 'name type')
      .populate('createdBy', 'name email');

    if (!exam) {
      throw new Error('Exam not found');
    }

    return exam;
  }

  /**
   * Update exam basic details
   */
  async updateExam(examId, updateData, userId) {
    const exam = await Exam.findById(examId);
    if (!exam) {
      throw new Error('Exam not found');
    }

    const allowedFields = ['name', 'startDate', 'endDate', 'status', 'section'];
    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        exam[field] = updateData[field];
      }
    });

    exam.updatedBy = userId;
    await exam.save();

    return await Exam.findById(exam._id)
      .populate('class', 'name section')
      .populate('subjectsConfig.subject', 'name type');
  }

  /**
   * Configure exam subjects with Max Marks and Passing Marks
   */
  async configureExamSubjects(examId, subjectsConfig = [], userId) {
    const exam = await Exam.findById(examId);
    if (!exam) {
      throw new Error('Exam not found');
    }

    if (!Array.isArray(subjectsConfig) || subjectsConfig.length === 0) {
      throw new Error('subjectsConfig must be a non-empty array');
    }

    const validatedConfigs = [];
    for (const item of subjectsConfig) {
      const subjectId = item.subjectId || item.subject;
      const maxMarks = Number(item.maxMarks);
      const passMarks = Number(item.passMarks);

      if (!subjectId) throw new Error('Each subject configuration must include a valid subject ID');
      if (isNaN(maxMarks) || maxMarks <= 0) throw new Error('Maximum marks must be greater than 0');
      if (isNaN(passMarks) || passMarks < 0) throw new Error('Passing marks cannot be negative');
      if (passMarks > maxMarks) throw new Error('Passing marks cannot exceed maximum marks');

      const subjectExists = await Subject.findById(subjectId);
      if (!subjectExists) throw new Error(`Subject with ID '${subjectId}' does not exist`);

      validatedConfigs.push({
        subject: subjectId,
        maxMarks,
        passMarks,
      });
    }

    exam.subjectsConfig = validatedConfigs;
    exam.updatedBy = userId;
    await exam.save();

    return await Exam.findById(exam._id)
      .populate('class', 'name section')
      .populate('subjectsConfig.subject', 'name type');
  }

  /**
   * Delete exam with safety checks against deleting active marks records
   */
  async deleteExam(examId) {
    const exam = await Exam.findById(examId);
    if (!exam) {
      throw new Error('Exam not found');
    }

    // Check if marks records exist for this exam
    const marksCount = await ExamMarks.countDocuments({ exam: examId });
    if (marksCount > 0) {
      throw new Error(
        `Cannot delete exam '${exam.name}' as it already has ${marksCount} marks record(s) associated with it. Controlled deletion is enforced to prevent academic data loss.`
      );
    }

    await Exam.findByIdAndDelete(examId);
    return { id: examId, message: 'Exam deleted successfully' };
  }

  /**
   * Finalize Exam Result after reviewing completeness
   */
  async finalizeExamResult(examId, userId) {
    const exam = await Exam.findById(examId);
    if (!exam) throw new Error('Exam not found');

    if (exam.status === 'Finalized' || exam.status === 'Published') {
      throw new Error(`Exam result is already '${exam.status}'`);
    }

    // Completeness validation: Check active students in class vs entered marks
    const activeStudents = await Student.find({ class: exam.class, status: 'Active' }).select('_id');
    const configuredSubjectCount = exam.subjectsConfig ? exam.subjectsConfig.length : 0;
    const totalExpectedRecords = activeStudents.length * configuredSubjectCount;

    const actualEnteredRecords = await ExamMarks.countDocuments({ exam: examId });

    if (actualEnteredRecords < totalExpectedRecords && configuredSubjectCount > 0) {
      const missingCount = totalExpectedRecords - actualEnteredRecords;
      throw new Error(
        `Cannot finalize result: Exam has incomplete marks entries. ${missingCount} mark entry record(s) missing out of ${totalExpectedRecords} total expected records across ${activeStudents.length} student(s).`
      );
    }

    exam.status = 'Finalized';
    exam.finalizedBy = userId;
    exam.finalizedAt = new Date();
    exam.updatedBy = userId;
    await exam.save();

    return await Exam.findById(exam._id)
      .populate('class', 'name section')
      .populate('finalizedBy', 'name email');
  }

  /**
   * Publish Exam Result for official release with Phase 21 Immutable Result Versioning
   */
  async publishExamResult(examId, userId) {
    const ExamResultVersion = require('../models/ExamResultVersion');
    const marksheetService = require('./marksheetService');

    const exam = await Exam.findById(examId);
    if (!exam) throw new Error('Exam not found');

    if (exam.status === 'Published') {
      throw new Error('Exam result is already Published');
    }

    // Pre-publish completeness validation
    const activeStudents = await Student.find({ class: exam.class, status: 'Active' })
      .select('_id fullName rollNumber studentId section')
      .lean();
    const configuredSubjectCount = exam.subjectsConfig ? exam.subjectsConfig.length : 0;
    const totalExpectedRecords = activeStudents.length * configuredSubjectCount;

    const actualEnteredRecords = await ExamMarks.countDocuments({ exam: examId });

    if (actualEnteredRecords < totalExpectedRecords && configuredSubjectCount > 0) {
      const missingCount = totalExpectedRecords - actualEnteredRecords;
      throw new Error(
        `Cannot publish result: Exam has incomplete marks entries. ${missingCount} mark entry record(s) missing out of ${totalExpectedRecords} total expected records across ${activeStudents.length} student(s).`
      );
    }

    // Determine next version number for this exam
    const maxVersionDoc = await ExamResultVersion.findOne({ exam: examId }).sort({ version: -1 }).select('version').lean();
    const nextVersionNumber = maxVersionDoc ? maxVersionDoc.version + 1 : 1;

    // Revision reason derivation
    const revisionReason =
      nextVersionNumber === 1
        ? 'Initial Official Result Publication'
        : exam.reopenReason
        ? `Republished after correction: ${exam.reopenReason}`
        : 'Official Result Correction & Revision';

    // Compute result summaries for all students in 1 batch query
    const classResultData = await marksheetService.getMonthlyClassResult(exam.class, examId);
    const { studentRows = [] } = classResultData;

    // Unset isCurrent flag on all older version documents for this exam
    await ExamResultVersion.updateMany({ exam: examId }, { $set: { isCurrent: false } });

    // Prepare version snapshot documents for bulk insertion
    const versionDocs = [];
    const publishedTimestamp = new Date();

    studentRows.forEach((row) => {
      if (!row || !row.summary) return;

      versionDocs.push({
        exam: exam._id,
        student: row.studentId,
        class: exam.class,
        section: row.section || exam.section || 'A',
        rollNumber: row.rollNumber || '',
        session: exam.session,
        version: nextVersionNumber,
        isCurrent: true,
        publishedBy: userId,
        publishedAt: publishedTimestamp,
        revisionReason,
        snapshot: {
          subjects: (row.subjectMarks || []).map((sub) => ({
            subjectId: sub.subjectId,
            subjectName: sub.subjectName,
            subjectType: sub.subjectType || 'Theoretical',
            maxMarks: sub.maxMarks,
            passMarks: sub.passMarks,
            marksObtained: sub.marksObtained ?? 0,
            isAbsent: !!sub.isAbsent,
            status: sub.status,
            grade: sub.grade || 'F',
            gradePoint: sub.gradePoint || 0,
            remarks: sub.remarks || '',
          })),
          aggregate: {
            totalMarksObtained: row.summary.totalMarksObtained ?? 0,
            totalMaxMarks: row.summary.totalMaxMarks ?? 0,
            percentage: row.summary.percentage ?? 0,
            overallGrade: row.summary.overallGrade || 'F',
            gradePointAverage: row.summary.gradePointAverage || 0,
            overallStatus: row.summary.overallStatus || 'Fail',
            division: row.summary.division || 'N/A',
            resultSummary: row.summary.resultSummary || '',
          },
          attendance: row.attendance || { totalWorkingDays: 0, daysPresent: 0, daysAbsent: 0, percentage: 0 },
          coScholastic: row.coScholastic || [],
          remarks: row.remarks || { teacherRemark: '', principalRemark: '' },
        },
      });
    });

    if (versionDocs.length > 0) {
      await ExamResultVersion.insertMany(versionDocs, { ordered: false });
    }

    exam.status = 'Published';
    exam.publishedBy = userId;
    exam.publishedAt = publishedTimestamp;
    exam.updatedBy = userId;
    await exam.save();

    return await Exam.findById(exam._id)
      .populate('class', 'name section')
      .populate('publishedBy', 'name email');
  }

  /**
   * Reopen Exam Result with mandatory reason for mark correction
   */
  async reopenExamResult(examId, reason, userId) {
    if (!reason || !reason.trim()) {
      throw new Error('A valid reason is required to reopen a finalized or published result');
    }

    const exam = await Exam.findById(examId);
    if (!exam) throw new Error('Exam not found');

    if (exam.status !== 'Finalized' && exam.status !== 'Published') {
      throw new Error(`Only Finalized or Published results can be reopened (Current status: '${exam.status}')`);
    }

    exam.status = 'Ongoing';
    exam.reopenedBy = userId;
    exam.reopenedAt = new Date();
    exam.reopenReason = reason.trim();
    exam.updatedBy = userId;
    await exam.save();

    return await Exam.findById(exam._id)
      .populate('class', 'name section')
      .populate('reopenedBy', 'name email');
  }

  /**
   * PHASE 16 REQUIREMENT: Academic Result Analytics Engine
   */
  async getExamAnalytics({ examId, classId, section }) {
    const exam = await Exam.findById(examId)
      .populate('class', 'name section')
      .populate('subjectsConfig.subject', 'name type')
      .lean();
    if (!exam) throw new Error('Exam not found');

    const targetClassId = classId || exam.class._id;
    const filterStudentQuery = { class: targetClassId, status: 'Active' };
    if (section) filterStudentQuery.section = section;

    const activeStudents = await Student.find(filterStudentQuery)
      .select('_id fullName rollNumber admissionNumber section')
      .sort({ rollNumber: 1, fullName: 1 })
      .lean();

    if (!activeStudents || activeStudents.length === 0) {
      return {
        exam: { id: exam._id, name: exam.name, examType: exam.examType, session: exam.session, status: exam.status },
        class: { id: exam.class._id, name: exam.class.name, section: exam.class.section },
        summary: { totalStudents: 0, completed: 0, pending: 0, passed: 0, failed: 0, passPercentage: '0%', averagePercentage: '0%', highestPercentage: '0%', lowestPercentage: '0%' },
        subjectPerformance: [],
        gradeDistribution: [],
        topPerformers: [],
        attentionRequired: [],
      };
    }

    const marksheetService = require('./marksheetService');
    const classResultData = await marksheetService.getMonthlyClassResult(targetClassId, examId);
    const { studentRows = [] } = classResultData;

    let completed = 0;
    let pending = 0;
    let passed = 0;
    let failed = 0;
    let totalPctSum = 0;
    let highestPct = -1;
    let lowestPct = 101;

    const gradeCounts = { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
    const topPerformers = [];
    const attentionRequired = [];

    const subjectMap = {};
    (exam.subjectsConfig || []).forEach((sc) => {
      if (sc.subject) {
        subjectMap[sc.subject._id.toString()] = {
          subjectId: sc.subject._id,
          subjectName: sc.subject.name,
          subjectType: sc.subject.type || 'Theoretical',
          maxMarks: sc.maxMarks,
          passMarks: sc.passMarks,
          totalObtainedSum: 0,
          highestMarks: -1,
          lowestMarks: 9999,
          passCount: 0,
          failCount: 0,
          totalEntered: 0,
        };
      }
    });

    studentRows.forEach((row) => {
      const { studentId, fullName, rollNumber, subjectMarks = [], summary } = row;

      if (!summary || summary.totalMarksObtained === null || summary.percentage === undefined) {
        pending++;
        attentionRequired.push({
          studentId,
          fullName,
          rollNumber,
          section: section || exam.class?.section || 'A',
          reason: 'Pending / Incomplete Marks Entry',
          resultStatus: 'Incomplete',
        });
        return;
      }

      completed++;
      const pct = summary.percentage;
      totalPctSum += pct;

      if (pct > highestPct) highestPct = pct;
      if (pct < lowestPct) lowestPct = pct;

      if (summary.overallStatus === 'Pass') passed++;
      else failed++;

      if (gradeCounts[summary.overallGrade] !== undefined) {
        gradeCounts[summary.overallGrade]++;
      }

      topPerformers.push({
        studentId,
        fullName,
        rollNumber,
        section: section || exam.class?.section || 'A',
        percentage: pct,
        overallGrade: summary.overallGrade,
        division: summary.division || 'N/A',
        resultStatus: summary.overallStatus,
      });

      const failedSubs = subjectMarks.filter((sub) => sub.status === 'Fail');
      if (summary.overallStatus === 'Fail' || failedSubs.length > 0) {
        attentionRequired.push({
          studentId,
          fullName,
          rollNumber,
          section: section || exam.class?.section || 'A',
          reason: summary.overallStatus === 'Fail' ? `Overall Fail (${failedSubs.length} failed subject(s))` : `Failed subject: ${failedSubs.map(f => f.subjectName).join(', ')}`,
          resultStatus: summary.overallStatus,
          percentage: pct,
        });
      }

      subjectMarks.forEach((sub) => {
        const sKey = sub.subjectId.toString();
        if (subjectMap[sKey] && typeof sub.marksObtained === 'number') {
          const sObj = subjectMap[sKey];
          const m = sub.marksObtained;
          sObj.totalEntered++;
          sObj.totalObtainedSum += m;
          if (m > sObj.highestMarks) sObj.highestMarks = m;
          if (m < sObj.lowestMarks) sObj.lowestMarks = m;
          if (sub.status === 'Pass') sObj.passCount++;
          else if (sub.status === 'Fail') sObj.failCount++;
        }
      });
    });

    const subjectPerformance = Object.values(subjectMap).map((sObj) => {
      const avg = sObj.totalEntered > 0 ? Math.round((sObj.totalObtainedSum / sObj.totalEntered) * 100) / 100 : 0;
      const passPct = sObj.totalEntered > 0 ? Math.round((sObj.passCount / sObj.totalEntered) * 10000) / 100 : 0;
      return {
        subjectId: sObj.subjectId,
        subjectName: sObj.subjectName,
        subjectType: sObj.subjectType,
        maxMarks: sObj.maxMarks,
        averageMarks: avg,
        highestMarks: sObj.highestMarks === -1 ? 0 : sObj.highestMarks,
        lowestMarks: sObj.lowestMarks === 9999 ? 0 : sObj.lowestMarks,
        passCount: sObj.passCount,
        failCount: sObj.failCount,
        passPercentage: `${passPct}%`,
      };
    });

    topPerformers.sort((a, b) => b.percentage - a.percentage);

    const classAverage = completed > 0 ? Math.round((totalPctSum / completed) * 100) / 100 : 0;
    const overallPassPct = completed > 0 ? Math.round((passed / completed) * 10000) / 100 : 0;

    return {
      exam: { id: exam._id, name: exam.name, examType: exam.examType, session: exam.session, status: exam.status },
      class: { id: exam.class._id, name: exam.class.name, section: exam.class.section },
      summary: {
        totalStudents: activeStudents.length,
        completed,
        pending,
        passed,
        failed,
        passPercentage: `${overallPassPct}%`,
        averagePercentage: `${classAverage}%`,
        highestPercentage: `${highestPct === -1 ? 0 : highestPct}%`,
        lowestPercentage: `${lowestPct === 101 ? 0 : lowestPct}%`,
      },
      gradeDistribution: Object.keys(gradeCounts).map((g) => ({
        grade: g,
        count: gradeCounts[g],
        percentage: completed > 0 ? `${Math.round((gradeCounts[g] / completed) * 10000) / 100}%` : '0%',
      })),
      subjectPerformance,
      topPerformers: topPerformers.slice(0, 10),
      attentionRequired,
    };
  }

  /**
   * PHASE 17 REQUIREMENT: Check Exam Marks-Entry Readiness
   */
  async checkExamReadiness(examId) {
    const exam = await Exam.findById(examId)
      .populate('class', 'name section')
      .populate('subjectsConfig.subject', 'name type')
      .lean();
    if (!exam) throw new Error('Exam not found');

    const missingItems = [];
    if (!exam.session) missingItems.push('Academic session is not defined');
    if (!exam.class) missingItems.push('Target Class is not assigned');

    if (!exam.subjectsConfig || exam.subjectsConfig.length === 0) {
      missingItems.push('No subjects are configured for this examination');
    } else {
      exam.subjectsConfig.forEach((sc, idx) => {
        if (!sc.subject) missingItems.push(`Subject #${idx + 1} reference is missing`);
        if (!sc.maxMarks || sc.maxMarks <= 0) missingItems.push(`Subject '${sc.subject?.name || idx + 1}' maximum marks must be > 0`);
        if (sc.passMarks === undefined || sc.passMarks < 0 || sc.passMarks > sc.maxMarks) {
          missingItems.push(`Subject '${sc.subject?.name || idx + 1}' passing marks invalid`);
        }
      });
    }

    const isReady = missingItems.length === 0;
    return {
      examId: exam._id,
      name: exam.name,
      status: isReady ? 'READY_FOR_MARKS_ENTRY' : 'CONFIGURATION_INCOMPLETE',
      isReady,
      missingItems,
      configuredSubjectCount: exam.subjectsConfig ? exam.subjectsConfig.length : 0,
    };
  }

  /**
   * PHASE 17 REQUIREMENT: Copy Exam Configuration
   */
  async copyExamConfiguration({ sourceExamId, targetExamId, userId }) {
    const sourceExam = await Exam.findById(sourceExamId).lean();
    if (!sourceExam) throw new Error('Source exam not found');

    const targetExam = await Exam.findById(targetExamId);
    if (!targetExam) throw new Error('Target exam not found');

    if (targetExam.status === 'Finalized' || targetExam.status === 'Published') {
      throw new Error(`Cannot modify configuration of '${targetExam.status}' exam`);
    }

    if (!sourceExam.subjectsConfig || sourceExam.subjectsConfig.length === 0) {
      throw new Error('Source exam has no subject configuration to copy');
    }

    targetExam.subjectsConfig = sourceExam.subjectsConfig.map((sc) => ({
      subject: sc.subject._id || sc.subject,
      maxMarks: sc.maxMarks,
      passMarks: sc.passMarks,
    }));

    targetExam.updatedBy = userId;
    await targetExam.save();

    return await Exam.findById(targetExam._id)
      .populate('class', 'name section')
      .populate('subjectsConfig.subject', 'name type');
  }

  /**
   * PHASE 19 REQUIREMENT: Save Exam Date Sheet Schedule
   */
  async saveExamSchedule({ examId, schedule = [], instructions, userId }) {
    const exam = await Exam.findById(examId);
    if (!exam) throw new Error('Exam not found');

    if (!Array.isArray(schedule)) throw new Error('Schedule must be an array of subject exam dates');

    const seenSubjectIds = new Set();
    const validatedSchedule = [];

    for (const item of schedule) {
      const subjectId = item.subjectId || item.subject;
      if (!subjectId) throw new Error('Subject ID is required for each schedule entry');

      const sKey = subjectId.toString();
      if (seenSubjectIds.has(sKey)) {
        throw new Error('Duplicate subject schedule entry detected in request');
      }
      seenSubjectIds.add(sKey);

      if (!item.examDate) throw new Error('Exam date is required for each scheduled subject');
      const parsedDate = new Date(item.examDate);
      if (isNaN(parsedDate.getTime())) throw new Error(`Invalid exam date '${item.examDate}'`);

      validatedSchedule.push({
        subject: subjectId,
        examDate: parsedDate,
        startTime: item.startTime || '09:00 AM',
        endTime: item.endTime || '12:00 PM',
        reportingTime: item.reportingTime || '08:30 AM',
        room: item.room || '',
      });
    }

    exam.schedule = validatedSchedule;
    if (instructions !== undefined) {
      exam.instructions = instructions.trim();
    }
    exam.updatedBy = userId;
    await exam.save();

    return await Exam.findById(exam._id)
      .populate('class', 'name section')
      .populate('schedule.subject', 'name type');
  }

  /**
   * PHASE 19 REQUIREMENT: Publish Exam Schedule
   */
  async publishExamSchedule(examId, userId) {
    const exam = await Exam.findById(examId);
    if (!exam) throw new Error('Exam not found');

    if (!exam.schedule || exam.schedule.length === 0) {
      throw new Error('Cannot publish date sheet: No subject schedule entries configured');
    }

    const configuredSubjectIds = (exam.subjectsConfig || []).map((sc) => (sc.subject?._id || sc.subject).toString());
    const scheduledSubjectIds = (exam.schedule || []).map((s) => (s.subject?._id || s.subject).toString());

    const unscheduledCount = configuredSubjectIds.filter((sid) => !scheduledSubjectIds.includes(sid)).length;
    if (unscheduledCount > 0 && configuredSubjectIds.length > 0) {
      throw new Error(`Cannot publish date sheet: ${unscheduledCount} configured subject(s) lack exam schedule entries.`);
    }

    exam.scheduleStatus = 'Published';
    exam.updatedBy = userId;
    await exam.save();

    return await Exam.findById(exam._id)
      .populate('class', 'name section')
      .populate('schedule.subject', 'name type');
  }

  /**
   * PHASE 19 REQUIREMENT: Get Exam Schedule with Role-Based Visibility
   */
  async getExamSchedule(examId, user) {
    const exam = await Exam.findById(examId)
      .populate('class', 'name section')
      .populate('schedule.subject', 'name type')
      .lean();

    if (!exam) throw new Error('Exam not found');

    const isAdminUser = user && user.role === 'admin';
    if (!isAdminUser && exam.scheduleStatus !== 'Published') {
      throw new Error('Exam date sheet has not been published yet.');
    }

    return {
      examId: exam._id,
      name: exam.name,
      session: exam.session,
      examType: exam.examType,
      class: exam.class,
      scheduleStatus: exam.scheduleStatus,
      instructions: exam.instructions,
      schedule: (exam.schedule || []).sort((a, b) => new Date(a.examDate) - new Date(b.examDate)),
    };
  }
}

module.exports = new ExamService();
