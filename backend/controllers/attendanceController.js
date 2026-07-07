/**
 * Attendance Controller
 * 
 * Handles HTTP requests for attendance marking and reporting.
 */

const attendanceService = require('../services/attendanceService');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * @desc    Mark attendance for a class
 * @route   POST /api/attendance
 */
const markAttendance = async (req, res, next) => {
  try {
    const { classId, date, attendanceData } = req.body;

    if (!classId || !date || !attendanceData || !Array.isArray(attendanceData)) {
      return errorResponse(res, 'Missing required fields: classId, date, or attendanceData array', 400);
    }

    const result = await attendanceService.markAttendance(classId, date, attendanceData);
    return successResponse(res, result, 'Attendance marked successfully', 201);
  } catch (error) {
    if (error.message.includes('already marked')) {
        return errorResponse(res, error.message, 409); // Conflict
    }
    next(error);
  }
};

/**
 * @desc    Get attendance report
 * @route   GET /api/attendance
 */
const getAttendanceReport = async (req, res, next) => {
  try {
    const { classId, date } = req.query;

    if (!classId || !date) {
      return errorResponse(res, 'Missing query parameters: classId and date are required', 400);
    }

    const report = await attendanceService.getAttendanceReport(classId, date);
    return successResponse(res, report, 'Attendance report fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark attendance for staff
 * @route   POST /api/attendance/staff
 */
const markStaffAttendance = async (req, res, next) => {
  try {
    const { date, attendanceData } = req.body;

    if (!date || !attendanceData || !Array.isArray(attendanceData)) {
      return errorResponse(res, 'Missing required fields: date or attendanceData array', 400);
    }

    const result = await attendanceService.markStaffAttendance(date, attendanceData);
    return successResponse(res, result, 'Staff attendance marked successfully', 201);
  } catch (error) {
    if (error.message.includes('already marked')) {
        return errorResponse(res, error.message, 409); // Conflict
    }
    next(error);
  }
};

/**
 * @desc    Get staff attendance report
 * @route   GET /api/attendance/staff
 */
const getStaffAttendanceReport = async (req, res, next) => {
  try {
    const { date } = req.query;

    if (!date) {
      return errorResponse(res, 'Missing query parameter: date is required', 400);
    }

    const report = await attendanceService.getStaffAttendanceReport(date);
    return successResponse(res, report, 'Staff attendance report fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student monthly attendance report for grid view
 * @route   GET /api/attendance/student/monthly
 */
const getStudentMonthlyReport = async (req, res, next) => {
  try {
    const { classId, month, year } = req.query;

    if (!classId || !month || !year) {
      return errorResponse(res, 'Missing query parameters: classId, month, and year are required', 400);
    }

    const report = await attendanceService.getStudentMonthlyReport(classId, month, year);
    return successResponse(res, report, 'Student monthly attendance report fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get staff monthly attendance report for grid view
 * @route   GET /api/attendance/staff/monthly
 */
const getStaffMonthlyReport = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return errorResponse(res, 'Missing query parameters: month and year are required', 400);
    }

    const report = await attendanceService.getStaffMonthlyReport(month, year);
    return successResponse(res, report, 'Staff monthly attendance report fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance analysis for a single teacher (for yearly calendar)
 * @route   GET /api/attendance/staff/analysis/:teacherId
 */
const getTeacherAttendanceAnalysis = async (req, res, next) => {
  try {
    const { teacherId } = req.params;
    if (!teacherId) {
      return errorResponse(res, 'Missing teacherId parameter', 400);
    }
    const analysis = await attendanceService.getTeacherAttendanceAnalysis(teacherId);
    return successResponse(res, analysis, 'Teacher attendance analysis fetched successfully');
  } catch (error) {
    if (error.message === 'Teacher not found') {
      return errorResponse(res, error.message, 404);
    }
    next(error);
  }
};

/**
 * @desc    Get attendance analysis for the logged-in teacher (My Attendance)
 * @route   GET /api/attendance/staff/my-analysis
 */
const getMyAttendanceAnalysis = async (req, res, next) => {
  try {
    const teacherId = req.user._id;
    if (!teacherId) {
      return errorResponse(res, 'User not authenticated as teacher', 401);
    }
    const analysis = await attendanceService.getTeacherAttendanceAnalysis(teacherId);
    return successResponse(res, analysis, 'My attendance analysis fetched successfully');
  } catch (error) {
    if (error.message === 'Teacher not found') {
      return errorResponse(res, error.message, 404);
    }
    next(error);
  }
};

/**
 * @desc    Get overall staff attendance summary (present, absent, leave ratios)
 * @route   GET /api/attendance/staff/summary
 */
const getStaffAttendanceSummary = async (req, res, next) => {
  try {
    const summary = await attendanceService.getStaffAttendanceSummary();
    return successResponse(res, summary, 'Staff attendance overall summary fetched successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  markAttendance,
  getAttendanceReport,
  markStaffAttendance,
  getStaffAttendanceReport,
  getStudentMonthlyReport,
  getStaffMonthlyReport,
  getStaffAttendanceSummary,
  getTeacherAttendanceAnalysis,
  getMyAttendanceAnalysis,
};
