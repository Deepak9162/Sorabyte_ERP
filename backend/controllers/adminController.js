/**
 * Admin Controller
 * 
 * Handles Admin API requests. Calls AdminService for business logic.
 */

const adminService = require('../services/adminService');
const { successResponse } = require('../utils/apiResponse');

/**
 * @desc    Create a new class
 * @route   POST /api/admin/classes
 */
const createClass = async (req, res, next) => {
  try {
    const newClass = await adminService.createClass(req.body);
    return successResponse(res, newClass, 'Class created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing class
 * @route   PUT /api/admin/classes/:id
 */
const updateClass = async (req, res, next) => {
  try {
    const updatedClass = await adminService.updateClass(req.params.id, req.body);
    return successResponse(res, updatedClass, 'Class updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a class
 * @route   DELETE /api/admin/classes/:id
 */
const deleteClass = async (req, res, next) => {
  try {
    await adminService.deleteClass(req.params.id);
    return successResponse(res, null, 'Class deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new teacher (and user account)
 * @route   POST /api/admin/teachers
 */
const createTeacher = async (req, res, next) => {
  try {
    console.log('AdminController: Create Teacher received:', JSON.stringify(req.body, null, 2));
    const { user: userData, teacher: teacherData } = req.body;
    if (!userData || !teacherData) {
        console.error('Missing user or teacher data in request');
        return res.status(400).json({ success: false, message: 'Missing user or teacher data' });
    }
    const result = await adminService.createTeacher(userData, teacherData);
    console.log('Teacher created successfully:', result.teacher._id);
    return successResponse(res, result, 'Teacher created successfully', 201);
  } catch (error) {
    console.error('AdminController: Error creating teacher:', error);
    next(error);
  }
};

/**
 * @desc    Create a new student
 * @route   POST /api/admin/students
 */
const createStudent = async (req, res, next) => {
  try {
    const student = await adminService.createStudent(req.body);
    return successResponse(res, student, 'Student created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Fetch students by class
 * @route   GET /api/admin/classes/:classId/students
 */
const getStudentsByClass = async (req, res, next) => {
  try {
    const students = await adminService.getStudentsByClass(req.params.classId);
    return successResponse(res, students, 'Students fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Fetch all classes
 * @route   GET /api/admin/classes
 */
const getAllClasses = async (req, res, next) => {
  try {
    const classes = await adminService.getAllClasses();
    return successResponse(res, classes, 'Classes fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance report for a class
 * @route   GET /api/admin/attendance/class/:classId
 */
const getClassAttendanceReport = async (req, res, next) => {
  try {
    const report = await adminService.getClassAttendanceReport(req.params.classId);
    return successResponse(res, report, 'Class attendance report fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed attendance report for a student
 * @route   GET /api/admin/attendance/student/:studentId
 */
const getStudentAttendanceReport = async (req, res, next) => {
  try {
    const report = await adminService.getStudentAttendanceReport(req.params.studentId);
    return successResponse(res, report, 'Student attendance report fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance analysis for a student
 * @route   GET /api/admin/attendance/analysis/student/:studentId
 */
const getStudentAttendanceAnalysis = async (req, res, next) => {
  try {
    const analysis = await adminService.getStudentAttendanceAnalysis(req.params.studentId);
    return successResponse(res, analysis, 'Student attendance analysis fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get overall dashboard statistics
 * @route   GET /api/admin/stats
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    return successResponse(res, stats, 'Dashboard stats fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dynamic summary for a specific class
 * @route   GET /api/admin/classes/:id/summary
 */
const getClassSummary = async (req, res, next) => {
  try {
    const summary = await adminService.getClassSummary(req.params.id);
    return successResponse(res, summary, 'Class summary fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all staff (teachers) populated with their User credentials
 * @route   GET /api/admin/staff-credentials
 */
const getStaffCredentials = async (req, res, next) => {
  try {
    const Teacher = require('../models/Teacher');
    const teachers = await Teacher.find()
      .populate('user', 'name email role isActive isOnline lastSeen')
      .sort({ firstName: 1 });
    
    return successResponse(res, teachers, 'Staff credentials fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password or recreate User credentials for a staff member
 * @route   POST /api/admin/staff-credentials/reset-password
 */
const resetStaffPassword = async (req, res, next) => {
  try {
    const { teacherId, newPassword } = req.body;
    if (!teacherId || !newPassword) {
      return res.status(400).json({ success: false, message: 'teacherId and newPassword are required' });
    }

    const Teacher = require('../models/Teacher');
    const User = require('../models/User');

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found' });
    }

    let user;
    if (teacher.user) {
      user = await User.findById(teacher.user);
    }

    if (!user) {
      // Re-create user account if it doesn't exist or is desynced
      user = await User.create({
        name: `${teacher.firstName} ${teacher.lastName}`,
        email: teacher.email,
        password: newPassword,
        role: 'teacher'
      });
      teacher.user = user._id;
      await teacher.save();
    } else {
      // ✅ FIX: Re-fetch with +password so isModified() works and pre-save hook hashes it
      user = await User.findById(teacher.user).select('+password');
      user.password = newPassword;
      await user.save();
    }

    return successResponse(res, null, `Password reset successfully for ${teacher.firstName} ${teacher.lastName}`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
  getStaffCredentials,
  resetStaffPassword,
};
