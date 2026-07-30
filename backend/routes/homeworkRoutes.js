/**
 * Homework Routes
 * 
 * Express routes for Homework Management Module.
 */

const express = require('express');
const router = express.Router();

const { protect, isAdmin, isTeacher } = require('../middleware/auth');
const homeworkUpload = require('../middleware/homeworkUpload');
const homeworkController = require('../controllers/homeworkController');

// All routes require authentication
router.use(protect);

// Shared / General routes
router.get('/dashboard-summary', homeworkController.getDashboardSummary);
router.get('/consolidated', homeworkController.getConsolidatedHomework);

// Teacher & Shared routes
router.post('/', isTeacher, homeworkUpload, homeworkController.createHomework);
router.get('/teacher/assigned-options', homeworkController.getTeacherAssignedOptions);
router.get('/teacher/my-homework', isTeacher, homeworkController.getTeacherMyHomework);
router.put('/:id', isTeacher, homeworkUpload, homeworkController.updateTeacherHomework);
router.delete('/:id', isTeacher, homeworkController.deleteTeacherHomework);

// Class Incharge / Class Teacher routes
router.get('/class-teacher/consolidated', isTeacher, homeworkController.getClassTeacherConsolidatedHomework);
router.get('/incharge/class-homework', isTeacher, homeworkController.getInchargeClassHomework);
router.put('/incharge/:id/status', isTeacher, homeworkController.inchargeApproveOrReject);

// Admin routes
router.get('/admin/all', isAdmin, homeworkController.getAllAdminHomework);
router.put('/admin/bulk-status', isAdmin, homeworkController.adminBulkStatusUpdate);
router.put('/admin/:id/status', isAdmin, homeworkController.adminApproveOrReject);

module.exports = router;
