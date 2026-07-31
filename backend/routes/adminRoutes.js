/**
 * Admin Routes
 * 
 * All routes here require Admin privileges.
 */

const express = require('express');
const router = express.Router();
const { 
  createClass,
  updateClass,
  deleteClass,
  createTeacher,
  createStudent, 
  getStudentsByClass, 
  getAllClasses,
  getClassSummary,
  getClassAttendanceReport,
  getStudentAttendanceReport,
  getStudentAttendanceAnalysis,
  getDashboardStats,
  getTodayCollectionStats,
  getStaffCredentials,
  resetStaffPassword,
  getAttendanceAnalytics
} = require('../controllers/adminController');
const { protect, authorize, isAdmin } = require('../middleware/auth');

// Apply protection to all routes
router.use(protect);

// Admin-only routes middleware
const adminOnly = isAdmin;
// Shared (Admin + Teacher) routes middleware
const sharedAccess = authorize('admin', 'teacher');

// Stats route (Admin only)
router.get('/stats', adminOnly, getDashboardStats);
router.get('/today-collection', adminOnly, getTodayCollectionStats);


// Attendance Analytics route (Admin only)
router.get('/attendance-analytics', adminOnly, getAttendanceAnalytics);

// Class routes (Shared access for viewing, Admin only for mutations)
router.post('/classes', adminOnly, createClass);
router.get('/classes', sharedAccess, getAllClasses);
router.put('/classes/:id', adminOnly, updateClass);
router.delete('/classes/:id', adminOnly, deleteClass);
router.get('/classes/:classId/students', sharedAccess, getStudentsByClass);
router.get('/classes/:id/summary', adminOnly, getClassSummary);

// Resource creation routes
router.post('/teachers', adminOnly, createTeacher);
router.post('/students', sharedAccess, createStudent); // Allow teachers to enroll students

// Staff credentials management (Admin only)
router.get('/staff-credentials', adminOnly, getStaffCredentials);
router.post('/staff-credentials/reset-password', adminOnly, resetStaffPassword);

// Analytics routes
router.get('/attendance/class/:classId', getClassAttendanceReport);
router.get('/attendance/student/:studentId', getStudentAttendanceReport);
router.get('/attendance/analysis/student/:studentId', getStudentAttendanceAnalysis);

module.exports = router;
