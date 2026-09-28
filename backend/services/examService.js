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
const ExamResultVersion = require('../models/ExamResultVersion');
const ExamStudentDetail = require('../models/ExamStudentDetail');
const MarksCorrectionRequest = require('../models/MarksCorrectionRequest');
const { countExpectedMarkRecords } = require('../utils/subjectApplicability');

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
        const err = new Error(
          `A ${examType} exam already exists for class '${cls.name}' in session '${session}'`
        );
        err.statusCode = 409;
        throw err;
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
   * Inspect persisted dependencies only when an Admin opens management actions.
   * The dashboard list itself stays a single exam query (no N+1 dependency checks).
   */
  async getExamManagementInfo(examId) {
    const exam = await Exam.findById(examId)
      .populate('class', 'name section')
      .populate('subjectsConfig.subject', 'name type')
      .lean();

    if (!exam) {
      const err = new Error('Exam not found');
      err.statusCode = 404;
      throw err;
    }

    const [marksCount, resultVersionsCount, studentDetailsCount, correctionRequestsCount] =
      await Promise.all([
        ExamMarks.countDocuments({ exam: examId }),
        ExamResultVersion.countDocuments({ exam: examId }),
        ExamStudentDetail.countDocuments({ exam: examId }),
        MarksCorrectionRequest.countDocuments({ exam: examId }),
      ]);

    const scheduleEntriesCount = Array.isArray(exam.schedule) ? exam.schedule.length : 0;
    const schedulePublished = exam.scheduleStatus === 'Published';
    const structuralLocked =
      exam.status === 'Published' || exam.status === 'Finalized';
    const hasOfficialRecords = structuralLocked || resultVersionsCount > 0;
    const hasDependentData =
      marksCount > 0 ||
      resultVersionsCount > 0 ||
      studentDetailsCount > 0 ||
      correctionRequestsCount > 0 ||
      scheduleEntriesCount > 0 ||
      schedulePublished;

    const canDelete =
      !hasOfficialRecords &&
      marksCount === 0 &&
      resultVersionsCount === 0 &&
      studentDetailsCount === 0 &&
      correctionRequestsCount === 0 &&
      scheduleEntriesCount === 0 &&
      !schedulePublished;

    return {
      exam,
      dependencies: {
        marksCount,
        resultVersionsCount,
        studentDetailsCount,
        correctionRequestsCount,
        scheduleEntriesCount,
        schedulePublished,
      },
      locks: {
        structuralLocked,
        identityLocked: hasDependentData || hasOfficialRecords,
        hasMarks: marksCount > 0,
        hasDependentData,
      },
      canDelete,
      deleteMessage: canDelete
        ? 'This exam has no academic records and can be safely deleted.'
        : hasOfficialRecords
        ? 'This exam contains official academic records and cannot be deleted.'
        : marksCount > 0
        ? 'Cannot delete this exam because marks have already been entered.'
        : 'Cannot delete this exam because dependent academic or schedule records already exist.',
    };
  }

  /**
   * Validate one complete embedded subject configuration before saving.
   * Existing marks are never deleted, reset, hidden, or rewritten.
   */
  async validateSubjectConfigurationChange(exam, subjectsConfig = [], options = {}) {
    if (!Array.isArray(subjectsConfig) || subjectsConfig.length === 0) {
      throw new Error('subjectsConfig must be a non-empty array');
    }

    const normalized = subjectsConfig.map((item) => {
      const subjectId = item.subjectId || item.subject;
      const maxMarks = Number(item.maxMarks);
      const passMarks = Number(item.passMarks);
      const applicability = item.applicability === 'OPTIONAL' ? 'OPTIONAL' : 'COMPULSORY';
      const applicableStudents = Array.isArray(item.applicableStudents)
        ? [...new Set(item.applicableStudents.map(String))]
        : [];

      if (!subjectId) throw new Error('Each subject configuration must include a valid subject ID');
      if (!Number.isFinite(maxMarks) || maxMarks <= 0) throw new Error('Maximum marks must be greater than 0');
      if (!Number.isFinite(passMarks) || passMarks < 0) throw new Error('Passing marks cannot be negative');
      if (passMarks > maxMarks) throw new Error('Passing marks cannot exceed maximum marks');

      return {
        subject: String(subjectId),
        maxMarks,
        passMarks,
        applicability,
        applicableStudents,
      };
    });

    const subjectIds = normalized.map((item) => item.subject);
    if (new Set(subjectIds).size !== subjectIds.length) {
      throw new Error('Duplicate subjects are not allowed in an exam configuration');
    }

    const subjectDocs = await Subject.find({ _id: { $in: subjectIds } }).select('_id').lean();
    if (subjectDocs.length !== subjectIds.length) {
      throw new Error('One or more configured subjects do not exist');
    }

    const [classStudents, existingMarks] = await Promise.all([
      Student.find({ class: exam.class, status: 'Active' }).select('_id fullName').lean(),
      ExamMarks.find({ exam: exam._id }).select('student subject marksObtained isAbsent').lean(),
    ]);
    const classStudentIds = new Set(classStudents.map((student) => student._id.toString()));

    const marksBySubject = new Map();
    existingMarks.forEach((mark) => {
      const subjectId = mark.subject.toString();
      if (!marksBySubject.has(subjectId)) marksBySubject.set(subjectId, []);
      marksBySubject.get(subjectId).push(mark);
    });

    const oldConfigBySubject = new Map(
      (exam.subjectsConfig || []).map((config) => [config.subject.toString(), config])
    );
    const newSubjectIds = new Set(subjectIds);

    for (const oldConfig of exam.subjectsConfig || []) {
      const oldSubjectId = oldConfig.subject.toString();
      if (
        !newSubjectIds.has(oldSubjectId) &&
        (marksBySubject.get(oldSubjectId) || []).length > 0
      ) {
        const err = new Error(
          'Cannot remove this subject because marks have already been entered. Remove/correct the related marks through the approved workflow first.'
        );
        err.statusCode = 409;
        throw err;
      }
    }

    let applicabilityChangedWithMarks = false;

    for (const item of normalized) {
      const oldConfig = oldConfigBySubject.get(item.subject);
      if (!oldConfig) continue;

      const subjectMarks = marksBySubject.get(item.subject) || [];
      if (
        subjectMarks.length > 0 &&
        (Number(oldConfig.maxMarks) !== item.maxMarks ||
          Number(oldConfig.passMarks) !== item.passMarks)
      ) {
        const err = new Error(
          'Marks already exist for this subject. Changing Max/Pass Marks may affect existing results and is blocked.'
        );
        err.statusCode = 409;
        throw err;
      }

      if (subjectMarks.length > 0) {
        const oldMode =
          oldConfig.applicability === 'OPTIONAL' ? 'OPTIONAL' : 'COMPULSORY';
        const oldIds = new Set((oldConfig.applicableStudents || []).map(String));
        const newIds = new Set(item.applicableStudents);
        const assignmentsChanged =
          oldIds.size !== newIds.size ||
          [...oldIds].some((id) => !newIds.has(id));

        if (oldMode !== item.applicability || assignmentsChanged) {
          applicabilityChangedWithMarks = true;
        }
      }
    }

    if (
      applicabilityChangedWithMarks &&
      options.confirmExistingMarksImpact !== true
    ) {
      const err = new Error(
        'Marks already exist for one or more affected students. Changing subject applicability may affect current result calculations. Existing marks will not be deleted. Confirm to continue.'
      );
      err.statusCode = 409;
      err.code = 'EXISTING_MARKS_APPLICABILITY_CONFIRMATION';
      throw err;
    }

    return normalized.map((item) => {
      if (item.applicability === 'OPTIONAL') {
        for (const studentId of item.applicableStudents) {
          if (!classStudentIds.has(studentId)) {
            const err = new Error(
              "Student '" + studentId + "' is not an active student of the exam class"
            );
            err.statusCode = 400;
            throw err;
          }
        }

        // Once the authorized user confirms an applicability change, the
        // Exam subject configuration is authoritative. Existing ExamMarks are
        // preserved in the database but are not silently re-added here.
      } else {
        item.applicableStudents = [];
      }

      return item;
    });
  }

  /**
   * Update the SAME Exam document. Basic fields + subject config are saved
   * together; the exam _id is never recreated.
   */
  async updateExam(examId, updateData, userId) {
    const exam = await Exam.findById(examId);
    if (!exam) {
      const err = new Error('Exam not found');
      err.statusCode = 404;
      throw err;
    }

    if (exam.status === 'Finalized' || exam.status === 'Published') {
      const err = new Error(
        "Exam is '" + exam.status + "'. Reopen the result before making structural exam changes."
      );
      err.statusCode = 403;
      throw err;
    }

    const managementInfo = await this.getExamManagementInfo(examId);
    const hasDependentData = managementInfo.locks.hasDependentData;

    const normalizeValue = (value) => String(value ?? '').trim();

    const incomingClassId =
      updateData.classId !== undefined
        ? updateData.classId
        : updateData.class !== undefined
        ? updateData.class
        : undefined;

    const examTypeChanged =
      updateData.examType !== undefined &&
      normalizeValue(updateData.examType) !== normalizeValue(exam.examType);

    const sessionChanged =
      updateData.session !== undefined &&
      normalizeValue(updateData.session) !== normalizeValue(exam.session);

    const classChanged =
      incomingClassId !== undefined &&
      normalizeValue(incomingClassId) !== normalizeValue(exam.class);

    const sectionChanged =
      updateData.section !== undefined &&
      normalizeValue(updateData.section) !== normalizeValue(exam.section);

    const identityChanged =
      examTypeChanged || sessionChanged || classChanged || sectionChanged;

    if (identityChanged && hasDependentData) {
      const err = new Error(
        'Exam Type, Class Group, Academic Session, or Section cannot be changed after dependent academic/schedule data exists.'
      );
      err.statusCode = 409;
      throw err;
    }

    const nextExamType =
      updateData.examType !== undefined ? normalizeValue(updateData.examType) : exam.examType;
    const nextSession =
      updateData.session !== undefined ? normalizeValue(updateData.session) : exam.session;
    const nextClassId =
      incomingClassId !== undefined ? incomingClassId : exam.class.toString();
    const nextSection =
      updateData.section !== undefined
        ? normalizeValue(updateData.section)
        : normalizeValue(exam.section);

    const validTypes = ['MONTHLY', 'HALF_YEARLY', 'ANNUAL'];
    if (!validTypes.includes(nextExamType)) {
      const err = new Error("Invalid examType '" + nextExamType + "'");
      err.statusCode = 400;
      throw err;
    }

    if (!nextSession) {
      const err = new Error('Academic session is required');
      err.statusCode = 400;
      throw err;
    }

    const targetClass = await Class.findById(nextClassId);
    if (!targetClass) {
      const err = new Error('Class not found');
      err.statusCode = 404;
      throw err;
    }

    if (nextExamType === 'HALF_YEARLY' || nextExamType === 'ANNUAL') {
      const duplicate = await Exam.findOne({
        _id: { $ne: exam._id },
        class: nextClassId,
        session: nextSession,
        examType: nextExamType,
      }).select('_id');

      if (duplicate) {
        const err = new Error(
          'A ' + nextExamType + " exam already exists for class '" +
          targetClass.name + "' in session '" + nextSession + "'"
        );
        err.statusCode = 409;
        throw err;
      }
    }

    if (updateData.name !== undefined) {
      const name = String(updateData.name).trim();
      if (!name) {
        const err = new Error('Exam name is required');
        err.statusCode = 400;
        throw err;
      }
      exam.name = name;
    }

    exam.examType = nextExamType;
    exam.session = nextSession;
    exam.class = nextClassId;

    if (updateData.section !== undefined) {
      exam.section = nextSection;
    } else if (identityChanged) {
      exam.section = targetClass.section || '';
    }

    if (updateData.startDate !== undefined) exam.startDate = updateData.startDate || undefined;
    if (updateData.endDate !== undefined) exam.endDate = updateData.endDate || undefined;

    const incomingSubjectsConfig =
      updateData.subjectsConfig || updateData.subjects || null;

    if (incomingSubjectsConfig) {
      exam.subjectsConfig = await this.validateSubjectConfigurationChange(
        exam,
        incomingSubjectsConfig,
        {
          confirmExistingMarksImpact:
            updateData.confirmExistingMarksImpact === true,
        }
      );
    }

    exam.updatedBy = userId;
    await exam.save();

    return await Exam.findById(exam._id)
      .populate('class', 'name section')
      .populate('subjectsConfig.subject', 'name type');
  }

  /**
   * Configure exam subjects with Max Marks and Passing Marks.
   * Reuses the same safe validator used by Edit Exam.
   */
  async configureExamSubjects(examId, subjectsConfig = [], userId, options = {}) {
    const exam = await Exam.findById(examId);
    if (!exam) {
      const err = new Error('Exam not found');
      err.statusCode = 404;
      throw err;
    }

    if (exam.status === 'Finalized' || exam.status === 'Published') {
      const err = new Error(
        "Subject configuration cannot be changed while the exam is '" +
          exam.status +
          "'. Reopen the result first."
      );
      err.statusCode = 403;
      throw err;
    }

    exam.subjectsConfig = await this.validateSubjectConfigurationChange(
      exam,
      subjectsConfig,
      options
    );
    exam.updatedBy = userId;
    await exam.save();

    return await Exam.findById(exam._id)
      .populate('class', 'name section')
      .populate('subjectsConfig.subject', 'name type');
  }

  async getApplicabilityStudents(classId) {
    if (!classId) throw new Error('classId is required');

    const students = await Student.find({ class: classId, status: 'Active' })
      .select('_id fullName rollNumber section fatherName')
      .lean();

    students.sort((a, b) => {
      const aRoll = Number(a.rollNumber);
      const bRoll = Number(b.rollNumber);
      const aValid = Number.isFinite(aRoll);
      const bValid = Number.isFinite(bRoll);
      if (aValid && bValid && aRoll !== bRoll) return aRoll - bRoll;
      if (aValid !== bValid) return aValid ? -1 : 1;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });

    return students;
  }

  /**
   * Delete only an empty accidental exam. No cascade delete is performed.
   */
  async deleteExam(examId) {
    const info = await this.getExamManagementInfo(examId);
    const { exam, dependencies } = info;

    if (!info.canDelete) {
      let message = info.deleteMessage;

      if (
        exam.status === 'Published' ||
        exam.status === 'Finalized' ||
        dependencies.resultVersionsCount > 0
      ) {
        message = 'This exam contains official academic records and cannot be deleted.';
      } else if (dependencies.marksCount > 0) {
        message = 'Cannot delete this exam because marks have already been entered.';
      }

      const err = new Error(message);
      err.statusCode = 409;
      throw err;
    }

    const deleted = await Exam.findOneAndDelete({ _id: examId });
    if (!deleted) {
      const err = new Error('Exam not found');
      err.statusCode = 404;
      throw err;
    }

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

    // Completeness is student-specific because OPTIONAL subjects may be N/A.
    const activeStudents = await Student.find({ class: exam.class, status: 'Active' }).select('_id').lean();
    const activeStudentIds = activeStudents.map((student) => student._id);
    const existingMarks = await ExamMarks.find({
      exam: examId,
      student: { $in: activeStudentIds },
    }).select('student subject').lean();
    const totalExpectedRecords = countExpectedMarkRecords(exam, activeStudents, existingMarks);
    const actualEnteredRecords = existingMarks.length;

    if (actualEnteredRecords < totalExpectedRecords && (exam.subjectsConfig || []).length > 0) {
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
    const activeStudentIds = activeStudents.map((student) => student._id);
    const existingMarks = await ExamMarks.find({
      exam: examId,
      student: { $in: activeStudentIds },
    }).select('student subject').lean();
    const totalExpectedRecords = countExpectedMarkRecords(exam, activeStudents, existingMarks);
    const actualEnteredRecords = existingMarks.length;

    if (actualEnteredRecords < totalExpectedRecords && (exam.subjectsConfig || []).length > 0) {
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
            marksObtained: sub.isApplicable === false ? null : (sub.marksObtained ?? 0),
            isAbsent: !!sub.isAbsent,
            isApplicable: sub.isApplicable !== false,
            status: sub.status,
            grade: sub.grade || (sub.isApplicable === false ? 'N/A' : 'F'),
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
          absentCount: 0,
          applicableCount: 0,
          totalEntered: 0,
        };
      }
    });

    studentRows.forEach((row) => {
      const { studentId, fullName, rollNumber, subjectMarks = [], summary } = row;

      // Subject analytics use every student's applicability independently of
      // whether the student's overall result is complete. N/A rows never
      // enter the denominator; applicable pending rows still count as expected
      // candidates without being counted as entered/pass/fail.
      subjectMarks.forEach((sub) => {
        const sKey = sub.subjectId.toString();
        const sObj = subjectMap[sKey];
        if (!sObj || sub.isApplicable === false || sub.status === 'N/A') return;

        sObj.applicableCount++;

        if (typeof sub.marksObtained === 'number') {
          const m = sub.marksObtained;
          sObj.totalEntered++;
          sObj.totalObtainedSum += m;
          if (m > sObj.highestMarks) sObj.highestMarks = m;
          if (m < sObj.lowestMarks) sObj.lowestMarks = m;
          if (sub.isAbsent) sObj.absentCount++;
          if (sub.status === 'Pass') sObj.passCount++;
          else if (sub.status === 'Fail') sObj.failCount++;
        }
      });

      if (
        !summary ||
        summary.totalMarksObtained === null ||
        summary.percentage === undefined ||
        summary.overallStatus === 'Incomplete' ||
        (summary.pendingSubjects || 0) > 0
      ) {
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

    });

    const subjectPerformance = Object.values(subjectMap).map((sObj) => {
      const avg = sObj.totalEntered > 0 ? Math.round((sObj.totalObtainedSum / sObj.totalEntered) * 100) / 100 : 0;
      const passPct = sObj.applicableCount > 0
        ? Math.round((sObj.passCount / sObj.applicableCount) * 10000) / 100
        : 0;
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
        absentCount: sObj.absentCount,
        applicableStudents: sObj.applicableCount,
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

    const sameClass = sourceExam.class.toString() === targetExam.class.toString();
    targetExam.subjectsConfig = sourceExam.subjectsConfig.map((sc) => ({
      subject: sc.subject._id || sc.subject,
      maxMarks: sc.maxMarks,
      passMarks: sc.passMarks,
      applicability: sc.applicability === 'OPTIONAL' ? 'OPTIONAL' : 'COMPULSORY',
      applicableStudents:
        sameClass && sc.applicability === 'OPTIONAL'
          ? (sc.applicableStudents || [])
          : [],
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
