/**
 * Attendance Routes
 * 
 * Student attendance: Class Teacher or Admin only.
 * Staff attendance: Admin only (except self-mark).
 * Attendance locking: Admin only.
 */

const express = require('express');
const router = express.Router();
const {
  markAttendance,
  updateAttendance,
  getAttendanceReport,
  submitAttendance,
  lockAttendance,
  unlockAttendance,
  getMyClassInfo,
  getAuditLog,
  markStaffAttendance,
  getStaffAttendanceReport,
  getStudentMonthlyReport,
  getStaffMonthlyReport,
  getStaffAttendanceSummary,
  getTeacherAttendanceAnalysis,
  getMyAttendanceAnalysis,
  markSelfAttendance,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// ── Class Teacher's own class info (teacher only) ──
router.get('/my-class', authorize('admin', 'teacher'), getMyClassInfo);

// ── Student monthly grid view report ──
router.get('/student/monthly', authorize('admin', 'teacher'), getStudentMonthlyReport);

// ── Student daily attendance endpoints ──
router.post('/', authorize('admin', 'teacher'), markAttendance);
router.put('/', authorize('admin', 'teacher'), updateAttendance);
router.get('/', authorize('admin', 'teacher'), getAttendanceReport);

// ── Attendance session lifecycle ──
router.post('/submit', authorize('admin', 'teacher'), submitAttendance);
router.post('/lock', authorize('admin'), lockAttendance);
router.post('/unlock', authorize('admin'), unlockAttendance);

// ── Audit log (admin only) ──
router.get('/audit-log', authorize('admin'), getAuditLog);

// ── Staff daily attendance endpoints (admin only) ──
router.post('/staff', authorize('admin'), markStaffAttendance);
router.get('/staff', authorize('admin'), getStaffAttendanceReport);

// ── Staff monthly grid view report (admin only) ──
router.get('/staff/monthly', authorize('admin'), getStaffMonthlyReport);

// ── Staff overall summary stats (admin only) ──
router.get('/staff/summary', authorize('admin'), getStaffAttendanceSummary);

// ── Staff single-teacher attendance analysis for yearly calendar view ──
router.get('/staff/analysis/:teacherId', authorize('admin'), getTeacherAttendanceAnalysis);

// ── Logged-in teacher's own attendance analysis (teacher only) ──
router.get('/staff/my-analysis', authorize('teacher'), getMyAttendanceAnalysis);

// ── Logged-in teacher marks self attendance (teacher only) ──
router.post('/staff/self-mark', authorize('teacher'), markSelfAttendance);

module.exports = router;
