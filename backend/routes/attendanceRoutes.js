/**
 * Attendance Routes
 * 
 * Accessible by Teachers and Admins based on specific operations.
 */

const express = require('express');
const router = express.Router();
const {
  markAttendance,
  getAttendanceReport,
  markStaffAttendance,
  getStaffAttendanceReport,
  getStudentMonthlyReport,
  getStaffMonthlyReport,
  getStaffAttendanceSummary,
  getTeacherAttendanceAnalysis,
  getMyAttendanceAnalysis,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// Student monthly grid view report
router.get('/student/monthly', authorize('admin', 'teacher'), getStudentMonthlyReport);

// Student daily attendance endpoints
router.post('/', authorize('admin', 'teacher'), markAttendance);
router.get('/', authorize('admin', 'teacher'), getAttendanceReport);

// Staff daily attendance endpoints (admin only)
router.post('/staff', authorize('admin'), markStaffAttendance);
router.get('/staff', authorize('admin'), getStaffAttendanceReport);

// Staff monthly grid view report (admin only)
router.get('/staff/monthly', authorize('admin'), getStaffMonthlyReport);

// Staff overall summary stats (admin only)
router.get('/staff/summary', authorize('admin'), getStaffAttendanceSummary);

// Staff single-teacher attendance analysis for yearly calendar view
router.get('/staff/analysis/:teacherId', authorize('admin'), getTeacherAttendanceAnalysis);

// Logged-in teacher's own attendance analysis (teacher only)
router.get('/staff/my-analysis', authorize('teacher'), getMyAttendanceAnalysis);

module.exports = router;
