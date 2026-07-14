/**
 * Teacher Routes
 * 
 * RESTful CRUD endpoints for the Teacher resource.
 */

const express = require('express');
const router = express.Router();
const {
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getTeacherDashboardStats,
  getMyClass,
} = require('../controllers/teacherController');
const { protect, authorize } = require('../middleware/auth');

// Dashboard stats for the current logged-in teacher
router.get('/dashboard/stats', protect, getTeacherDashboardStats);

// Get the class(es) where the logged-in teacher is the Class Teacher
router.get('/my-class', protect, authorize('teacher'), getMyClass);

// GET    /api/teachers        → List all teachers (supports ?subject=&isActive=&page=&limit=)
// POST   /api/teachers        → Create a new teacher
router.route('/').get(getAllTeachers).post(createTeacher);

// GET    /api/teachers/:id    → Get one teacher
// PUT    /api/teachers/:id    → Update a teacher
// DELETE /api/teachers/:id    → Soft-delete a teacher
router.route('/:id').get(getTeacherById).put(updateTeacher).delete(deleteTeacher);

module.exports = router;
