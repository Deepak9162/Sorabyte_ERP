/**
 * Exam Controller
 * 
 * Express request handlers for Exam creation, listing, detail retrieval, updating,
 * subject configuration, and deletion.
 */

const examService = require('../services/examService');
const { successResponse } = require('../utils/apiResponse');

exports.getMarksEntryOptions = async (req, res, next) => {
  try {
    const options = await examService.getMarksEntryOptions(req.user);
    return successResponse(res, options, 'Marks entry options fetched successfully');
  } catch (error) {
    next(error);
  }
};

exports.createExam = async (req, res, next) => {
  try {
    const exam = await examService.createExam(req.body, req.user._id);
    return successResponse(res, exam, 'Exam created successfully', 201);
  } catch (error) {
    next(error);
  }
};

exports.getAllExams = async (req, res, next) => {
  try {
    const exams = await examService.getAllExams(req.query);
    return successResponse(res, exams, 'Exams retrieved successfully');
  } catch (error) {
    next(error);
  }
};

exports.getExamById = async (req, res, next) => {
  try {
    const exam = await examService.getExamById(req.params.id);
    return successResponse(res, exam, 'Exam fetched successfully');
  } catch (error) {
    next(error);
  }
};

exports.updateExam = async (req, res, next) => {
  try {
    const exam = await examService.updateExam(req.params.id, req.body, req.user._id);
    return successResponse(res, exam, 'Exam updated successfully');
  } catch (error) {
    next(error);
  }
};

exports.configureExamSubjects = async (req, res, next) => {
  try {
    const subjectsConfig = req.body.subjectsConfig || req.body.subjects;
    const exam = await examService.configureExamSubjects(req.params.id, subjectsConfig, req.user._id);
    return successResponse(res, exam, 'Exam subjects configured successfully');
  } catch (error) {
    next(error);
  }
};

exports.deleteExam = async (req, res, next) => {
  try {
    const result = await examService.deleteExam(req.params.id);
    return successResponse(res, result, 'Exam deleted successfully');
  } catch (error) {
    next(error);
  }
};

exports.finalizeExamResult = async (req, res, next) => {
  try {
    const exam = await examService.finalizeExamResult(req.params.id, req.user._id);
    return successResponse(res, exam, 'Exam result finalized successfully');
  } catch (error) {
    next(error);
  }
};

exports.publishExamResult = async (req, res, next) => {
  try {
    const exam = await examService.publishExamResult(req.params.id, req.user._id);
    return successResponse(res, exam, 'Exam result published successfully');
  } catch (error) {
    next(error);
  }
};

exports.reopenExamResult = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const exam = await examService.reopenExamResult(req.params.id, reason, req.user._id);
    return successResponse(res, exam, 'Exam result reopened successfully');
  } catch (error) {
    next(error);
  }
};

exports.getExamAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { classId, section } = req.query;
    const analytics = await examService.getExamAnalytics({ examId: id, classId, section });
    return successResponse(res, analytics, 'Exam analytics fetched successfully');
  } catch (error) {
    next(error);
  }
};

exports.checkExamReadiness = async (req, res, next) => {
  try {
    const readiness = await examService.checkExamReadiness(req.params.id);
    return successResponse(res, readiness, 'Exam readiness status checked successfully');
  } catch (error) {
    next(error);
  }
};

exports.copyExamConfiguration = async (req, res, next) => {
  try {
    const { sourceExamId } = req.body;
    const exam = await examService.copyExamConfiguration({
      sourceExamId,
      targetExamId: req.params.id,
      userId: req.user._id,
    });
    return successResponse(res, exam, 'Exam configuration copied successfully');
  } catch (error) {
    next(error);
  }
};

exports.saveExamSchedule = async (req, res, next) => {
  try {
    const { schedule, instructions } = req.body;
    const exam = await examService.saveExamSchedule({
      examId: req.params.id,
      schedule,
      instructions,
      userId: req.user._id,
    });
    return successResponse(res, exam, 'Exam date sheet schedule saved successfully');
  } catch (error) {
    next(error);
  }
};

exports.publishExamSchedule = async (req, res, next) => {
  try {
    const exam = await examService.publishExamSchedule(req.params.id, req.user._id);
    return successResponse(res, exam, 'Exam date sheet schedule published successfully');
  } catch (error) {
    next(error);
  }
};

exports.getExamSchedule = async (req, res, next) => {
  try {
    const scheduleData = await examService.getExamSchedule(req.params.id, req.user);
    return successResponse(res, scheduleData, 'Exam date sheet fetched successfully');
  } catch (error) {
    next(error);
  }
};

exports.generateDateSheetPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const scheduleData = await examService.getExamSchedule(id, req.user);
    const admitCardPdfCompiler = require('../utils/admitCardPdfCompiler');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="LFES_${scheduleData.name}_DateSheet.pdf"`);

    await admitCardPdfCompiler.compileDateSheetPdf(scheduleData, res);
  } catch (error) {
    next(error);
  }
};

exports.generateBulkAdmitCardsPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { classId, section, studentId } = req.query;
    const admitCardPdfCompiler = require('../utils/admitCardPdfCompiler');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="LFES_AdmitCards.pdf"`);

    await admitCardPdfCompiler.compileBulkAdmitCardsPdf(
      { examId: id, classId, section, studentId },
      res
    );
  } catch (error) {
    next(error);
  }
};
