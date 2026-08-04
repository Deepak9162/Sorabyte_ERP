/**
 * Student Routes
 * 
 * RESTful CRUD endpoints for the Student resource.
 */

const express = require('express');
const router = express.Router();
const {
  getAllStudents,
  getStudentById,
  getStudentProfile,
  createStudent,
  updateStudent,
  deleteStudent,
  getLatestAdmissionStats,
  bulkMigrateStudents,
} = require('../controllers/studentController');

const { studentPhotoUpload } = require('../middleware/upload');
const { protect, isAdmin } = require('../middleware/auth');

// GET    /api/students        → List all students
// POST   /api/students        → Create a new student
router.route('/').get(getAllStudents).post(studentPhotoUpload, createStudent);
router.post('/create', studentPhotoUpload, createStudent);

// PUT    /api/students/bulk-migrate → Bulk Student Class/Section Migration
router.put('/bulk-migrate', protect, isAdmin, bulkMigrateStudents);

// GET    /api/students/stats/latest-admission
router.get('/stats/latest-admission', getLatestAdmissionStats);

// GET    /api/students/:studentId/profile → Comprehensive profile + fees
router.get('/:studentId/profile', getStudentProfile);

// GET    /api/students/:id    → Get one student (by _id)
// PUT    /api/students/:id    → Update a student
// DELETE /api/students/:id    → Soft-delete a student
router.route('/:id').get(getStudentById).put(studentPhotoUpload, updateStudent).delete(deleteStudent);

module.exports = router;
