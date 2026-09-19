/**
 * Examination & Marksheet Routes
 * 
 * Defines RESTful endpoints for Exam management, Subject Configuration,
 * Single & Bulk Marks Entry, Class Monthly Reports, and Individual Student Marksheet Data.
 */

const express = require('express');
const router = express.Router();

const examController = require('../controllers/examController');
const marksheetController = require('../controllers/marksheetController');
const { protect, isAdmin } = require('../middleware/auth');
const { verifyExamTeacherAccess } = require('../middleware/examTeacherAuth');

const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

// All exam routes require authentication
router.use(protect);

// ──────────────────────────────────────────────
// Filter Options & Roster Loading Routes (STATIC FIRST)
// ──────────────────────────────────────────────
router.get('/options', examController.getMarksEntryOptions);
router.get('/roster', verifyExamTeacherAccess('query', 'query'), marksheetController.getClassSubjectRoster);

// ──────────────────────────────────────────────
// Phase 20: Marks Correction & Rechecking Routes (STATIC FIRST)
// ──────────────────────────────────────────────
router.post('/correction-requests', marksheetController.createCorrectionRequest);
router.get('/correction-requests', marksheetController.getCorrectionRequests);
router.post('/correction-requests/:id/approve', isAdmin, marksheetController.approveCorrectionRequest);
router.post('/correction-requests/:id/reject', isAdmin, marksheetController.rejectCorrectionRequest);
router.post('/correction-requests/:id/cancel', marksheetController.cancelCorrectionRequest);

// ──────────────────────────────────────────────
// Marks Entry & Management Routes (STATIC FIRST)
// ──────────────────────────────────────────────
router.post('/marks', verifyExamTeacherAccess('body', 'body'), marksheetController.enterSingleMark);
router.post('/marks/bulk', verifyExamTeacherAccess('body', null), marksheetController.bulkEnterMarks);
router.get('/marks/template', verifyExamTeacherAccess('query', 'query'), marksheetController.generateMarksTemplate);
router.post('/marks/import/validate', upload.single('file'), verifyExamTeacherAccess('body', 'body'), marksheetController.validateMarksImport);
router.get('/marks/student/:studentId', marksheetController.getStudentMarks);
router.get('/marks/class/:classId/exam/:examId', verifyExamTeacherAccess('params', null), marksheetController.getClassMarks);

// ──────────────────────────────────────────────
// Results & Marksheet Reporting Routes (STATIC FIRST)
// ──────────────────────────────────────────────
router.get('/results/monthly/class/:classId/exam/:examId', verifyExamTeacherAccess('params', null), marksheetController.getMonthlyClassResult);
router.get('/results/student/:studentId/exam/:examId', marksheetController.getStudentResult);

// ──────────────────────────────────────────────
// Streaming PDF Generation Routes (STATIC FIRST)
// ──────────────────────────────────────────────
router.get('/marksheets/student/:studentId/:examId/pdf', marksheetController.generateStudentMarksheetPdf);
router.get('/results/monthly/class/:classId/exam/:examId/pdf', verifyExamTeacherAccess('params', null), marksheetController.generateClassMonthlyResultPdf);
router.get('/marksheets/class/:classId/:examId/bulk-data', verifyExamTeacherAccess('params', null), marksheetController.getBulkClassMarksheetData);
router.get('/marksheets/class/:classId/:examId/bulk-pdf', verifyExamTeacherAccess('params', null), marksheetController.generateBulkClassMarksheetPdf);

// ──────────────────────────────────────────────
// Phase 14: Academic History & Promotion Readiness Routes (STATIC FIRST)
// ──────────────────────────────────────────────
router.get('/students/:studentId/academic-history', marksheetController.getStudentAcademicHistory);
router.get('/promotion-readiness/class/:classId/exam/:examId', isAdmin, marksheetController.getPromotionReadiness);

// ──────────────────────────────────────────────
// Phase 15: Remarks & Co-Scholastic Routes (STATIC FIRST)
// ──────────────────────────────────────────────
router.post('/remarks/bulk', verifyExamTeacherAccess('body', null), marksheetController.bulkSaveTeacherRemarks);
router.post('/co-scholastic/bulk', verifyExamTeacherAccess('body', null), marksheetController.bulkSaveCoScholasticGrades);

// ──────────────────────────────────────────────
// Base Exam CRUD Routes (STATIC / FIRST)
// ──────────────────────────────────────────────
router.post('/', isAdmin, examController.createExam);
router.get('/', examController.getAllExams);

// ──────────────────────────────────────────────
// Exam Parameterized Routes (/:id AT THE END)
// ──────────────────────────────────────────────
router.get('/:id', examController.getExamById);
router.put('/:id', isAdmin, examController.updateExam);
router.delete('/:id', isAdmin, examController.deleteExam);
router.post('/:id/subjects', isAdmin, examController.configureExamSubjects);
router.post('/:id/finalize', isAdmin, examController.finalizeExamResult);
router.post('/:id/publish', isAdmin, examController.publishExamResult);
router.post('/:id/reopen', isAdmin, examController.reopenExamResult);
router.get('/:id/analytics', verifyExamTeacherAccess('params', 'query'), examController.getExamAnalytics);
router.get('/:id/readiness', examController.checkExamReadiness);
router.post('/:id/copy-config', isAdmin, examController.copyExamConfiguration);
router.get('/:id/schedule', examController.getExamSchedule);
router.post('/:id/schedule', isAdmin, examController.saveExamSchedule);
router.post('/:id/schedule/publish', isAdmin, examController.publishExamSchedule);
router.get('/:id/date-sheet/pdf', examController.generateDateSheetPdf);
router.get('/:id/admit-cards/pdf', examController.generateBulkAdmitCardsPdf);

// ──────────────────────────────────────────────
// Phase 21: Result Versioning & Audit History Routes (/:id SUBPATHS AT THE END)
// ──────────────────────────────────────────────
router.get('/:id/student/:studentId/versions', marksheetController.getResultVersionHistory);
router.get('/:id/student/:studentId/versions/:version', marksheetController.getStudentResultByVersion);
router.get('/:id/student/:studentId/versions/:version/pdf', marksheetController.generateVersionPdf);

module.exports = router;
