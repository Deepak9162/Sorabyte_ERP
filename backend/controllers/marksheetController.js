/**
 * Marksheet Controller
 * 
 * Express request handlers for marks entry (single & bulk), student marks history,
 * class marks retrieval, monthly class result report, and student marksheet data payload.
 */

const marksheetService = require('../services/marksheetService');
const { successResponse } = require('../utils/apiResponse');
const {
  compileStudentMarksheetPdf,
  compileClassMonthlyResultPdf,
  compileBulkClassMarksheetPdf,
} = require('../utils/marksheetPdfCompiler');

exports.getClassSubjectRoster = async (req, res, next) => {
  try {
    const { examId, classId, subjectId, section } = req.query;
    const roster = await marksheetService.getClassSubjectRoster({ examId, classId, subjectId, section });
    return successResponse(res, roster, 'Class subject roster fetched successfully');
  } catch (error) {
    next(error);
  }
};

exports.enterSingleMark = async (req, res, next) => {
  try {
    const markRecord = await marksheetService.enterSingleMark(req.body, req.user._id);
    return successResponse(res, markRecord, 'Marks recorded successfully', 200);
  } catch (error) {
    next(error);
  }
};

exports.bulkEnterMarks = async (req, res, next) => {
  try {
    const result = await marksheetService.bulkEnterMarks(req.body, req.user._id);
    return successResponse(res, result, result.message, 200);
  } catch (error) {
    if (error.validationErrors) {
      return res.status(400).json({
        success: false,
        message: error.message,
        errors: error.validationErrors,
      });
    }
    next(error);
  }
};

exports.getStudentMarks = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { session } = req.query;
    const marks = await marksheetService.getStudentMarks(studentId, session);
    return successResponse(res, marks, 'Student marks fetched successfully');
  } catch (error) {
    next(error);
  }
};

exports.getClassMarks = async (req, res, next) => {
  try {
    const { classId, examId } = req.params;
    const marks = await marksheetService.getClassMarks(classId, examId);
    return successResponse(res, marks, 'Class marks fetched successfully');
  } catch (error) {
    next(error);
  }
};

exports.getMonthlyClassResult = async (req, res, next) => {
  try {
    const { classId, examId } = req.params;
    const report = await marksheetService.getMonthlyClassResult(classId, examId);
    return successResponse(res, report, 'Monthly class result report fetched successfully');
  } catch (error) {
    next(error);
  }
};

exports.getStudentResult = async (req, res, next) => {
  try {
    const { studentId, examId } = req.params;
    const report = await marksheetService.getStudentResult(studentId, examId);
    return successResponse(res, report, 'Student marksheet data fetched successfully');
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------
// PDF GENERATION STREAMING HANDLERS
// ----------------------------------------------------

exports.generateStudentMarksheetPdf = async (req, res, next) => {
  try {
    const { studentId, examId } = req.params;
    const data = await marksheetService.getStudentResult(studentId, examId);

    const studentName = data.student?.fullName ? data.student.fullName.replace(/\s+/g, '_') : 'Student';
    const examType = data.exam?.examType || 'Exam';
    const session = data.exam?.session || '2026-2027';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="LFES_${examType}_Marksheet_${studentName}_${session}.pdf"`);

    await compileStudentMarksheetPdf(data, res);
  } catch (error) {
    next(error);
  }
};

exports.generateClassMonthlyResultPdf = async (req, res, next) => {
  try {
    const { classId, examId } = req.params;
    const data = await marksheetService.getMonthlyClassResult(classId, examId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Class_Monthly_Result_${examId}.pdf"`);

    await compileClassMonthlyResultPdf(data, res);
  } catch (error) {
    next(error);
  }
};

exports.getBulkClassMarksheetData = async (req, res, next) => {
  try {
    const { classId, examId } = req.params;
    const studentsData = await marksheetService.getBulkClassMarksheetData(classId, examId);
    return successResponse(res, studentsData, 'Bulk class marksheet data fetched successfully');
  } catch (error) {
    next(error);
  }
};

exports.generateBulkClassMarksheetPdf = async (req, res, next) => {
  try {
    const { classId, examId } = req.params;
    const studentsData = await marksheetService.getBulkClassMarksheetData(classId, examId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Bulk_Class_Marksheets_${classId}.pdf"`);

    await compileBulkClassMarksheetPdf(studentsData, res);
  } catch (error) {
    next(error);
  }
};

exports.getStudentAcademicHistory = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const history = await marksheetService.getStudentAcademicHistory(studentId);
    return successResponse(res, history, 'Student academic history fetched successfully');
  } catch (error) {
    next(error);
  }
};

exports.getPromotionReadiness = async (req, res, next) => {
  try {
    const { classId, examId } = req.params;
    const readiness = await marksheetService.getPromotionReadiness(classId, examId);
    return successResponse(res, readiness, 'Promotion readiness report fetched successfully');
  } catch (error) {
    next(error);
  }
};

exports.bulkSaveTeacherRemarks = async (req, res, next) => {
  try {
    const result = await marksheetService.bulkSaveTeacherRemarks(req.body, req.user._id);
    return successResponse(res, result, result.message, 200);
  } catch (error) {
    next(error);
  }
};

exports.bulkSaveCoScholasticGrades = async (req, res, next) => {
  try {
    const result = await marksheetService.bulkSaveCoScholasticGrades(req.body, req.user._id);
    return successResponse(res, result, result.message, 200);
  } catch (error) {
    next(error);
  }
};

exports.generateMarksTemplate = async (req, res, next) => {
  try {
    const { examId, classId, subjectId, section } = req.query;
    const { buffer, filename } = await marksheetService.generateMarksTemplate({
      examId,
      classId,
      subjectId,
      section,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

exports.validateMarksImport = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      throw new Error('Please upload a valid Excel spreadsheet (.xlsx)');
    }

    const { examId, classId, subjectId, section } = req.body;
    const validation = await marksheetService.validateMarksImport({
      examId,
      classId,
      subjectId,
      section,
      fileBuffer: req.file.buffer,
    });

    return successResponse(res, validation, 'Marks import spreadsheet validated successfully');
  } catch (error) {
    next(error);
  }
};

exports.createCorrectionRequest = async (req, res, next) => {
  try {
    const { examId, studentId, subjectId, requestedMarks, reason } = req.body;
    const requestDoc = await marksheetService.createCorrectionRequest({
      examId,
      studentId,
      subjectId,
      requestedMarks,
      reason,
      userId: req.user._id,
    });
    return successResponse(res, requestDoc, 'Marks correction request submitted successfully', 201);
  } catch (error) {
    next(error);
  }
};

exports.getCorrectionRequests = async (req, res, next) => {
  try {
    const { session, examId, classId, status, page, limit } = req.query;
    const result = await marksheetService.getCorrectionRequests({
      session,
      examId,
      classId,
      status,
      page,
      limit,
    });
    return successResponse(res, result, 'Correction requests fetched successfully');
  } catch (error) {
    next(error);
  }
};

exports.approveCorrectionRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reviewRemarks } = req.body;
    const result = await marksheetService.approveCorrectionRequest(id, reviewRemarks, req.user._id);
    return successResponse(res, result, 'Marks correction request approved and applied successfully');
  } catch (error) {
    next(error);
  }
};

exports.rejectCorrectionRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reviewRemarks } = req.body;
    const result = await marksheetService.rejectCorrectionRequest(id, reviewRemarks, req.user._id);
    return successResponse(res, result, 'Marks correction request rejected');
  } catch (error) {
    next(error);
  }
};

exports.cancelCorrectionRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await marksheetService.cancelCorrectionRequest(id, req.user._id);
    return successResponse(res, result, 'Marks correction request cancelled');
  } catch (error) {
    next(error);
  }
};

exports.getResultVersionHistory = async (req, res, next) => {
  try {
    const { id: examId, studentId } = req.params;
    const versions = await marksheetService.getResultVersionHistory(examId, studentId);
    return successResponse(res, versions, 'Result version history fetched successfully');
  } catch (error) {
    next(error);
  }
};

exports.getStudentResultByVersion = async (req, res, next) => {
  try {
    const { id: examId, studentId, version } = req.params;
    const versionData = await marksheetService.getStudentResultByVersion(examId, studentId, version);
    return successResponse(res, versionData, 'Historical result version snapshot fetched successfully');
  } catch (error) {
    next(error);
  }
};

exports.generateVersionPdf = async (req, res, next) => {
  try {
    const { id: examId, studentId, version } = req.params;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Marksheet_${studentId}_v${version}.pdf"`);
    await marksheetService.generateVersionPdf(examId, studentId, version, res);
  } catch (error) {
    next(error);
  }
};
