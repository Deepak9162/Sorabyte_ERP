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

    if (req.user.role === 'teacher') {
      const timetableService = require('../services/timetableService');
      const isAssigned = await timetableService.isTeacherAssignedToClass(req.user._id, classId);
      if (!isAssigned) {
        return errorResponse(res, 'You are not authorized to mark attendance for this class', 403);
      }
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

    if (req.user.role === 'teacher') {
      const timetableService = require('../services/timetableService');
      const isAssigned = await timetableService.isTeacherAssignedToClass(req.user._id, classId);
      if (!isAssigned) {
        return errorResponse(res, 'You are not authorized to view attendance for this class', 403);
      }
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

const getStudentMonthlyReport = async (req, res, next) => {
  try {
    const { classId, month, year } = req.query;

    if (!classId || !month || !year) {
      return errorResponse(res, 'Missing query parameters: classId, month, and year are required', 400);
    }

    if (req.user.role === 'teacher') {
      const timetableService = require('../services/timetableService');
      const isAssigned = await timetableService.isTeacherAssignedToClass(req.user._id, classId);
      if (!isAssigned) {
        return errorResponse(res, 'You are not authorized to view attendance report for this class', 403);
      }
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
    const userId = req.user._id;
    if (!userId) {
      return errorResponse(res, 'User not authenticated', 401);
    }
    
    const Teacher = require('../models/Teacher');
    const teacher = await Teacher.findOne({ user: userId });
    
    if (!teacher) {
      return errorResponse(res, 'Teacher profile not found', 404);
    }

    const analysis = await attendanceService.getTeacherAttendanceAnalysis(teacher._id);
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

// Haversine formula to calculate distance in meters
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371e3; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * @desc    Mark self attendance for teacher via Geofencing
 * @route   POST /api/attendance/staff/self-mark
 */
const markSelfAttendance = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
      return errorResponse(res, 'Location coordinates are required', 400);
    }

    // Configured School Location
    const schoolLat = 26.227863;
    const schoolLon = 84.477859;
    const maxRadius = 50; // meters

    const distance = calculateDistance(latitude, longitude, schoolLat, schoolLon);
    if (distance > maxRadius) {
      return errorResponse(res, `You are ${Math.round(distance)} meters away from school. You must be within ${maxRadius} meters.`, 403);
    }

    // Time constraints
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    if (hours >= 12) {
      return errorResponse(res, 'Attendance marking is closed after 12:00 PM.', 403);
    }

    let status = 'Present';
    if (hours > 9 || (hours === 9 && minutes > 30)) {
      status = 'Late';
    }

    const Teacher = require('../models/Teacher');
    const StaffAttendance = require('../models/StaffAttendance');

    const teacher = await Teacher.findOne({ user: req.user._id });
    if (!teacher) {
      return errorResponse(res, 'Teacher profile not found', 404);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existing = await StaffAttendance.findOne({
      teacher: teacher._id,
      date: { $gte: today, $lt: tomorrow }
    });

    if (existing) {
      return errorResponse(res, `Attendance already marked as ${existing.status} for today.`, 409);
    }

    const record = await StaffAttendance.create({
      teacher: teacher._id,
      date: new Date(),
      status: status,
      remarks: 'Self marked via Geofencing'
    });

    return successResponse(res, record, `Attendance successfully marked as ${status}`, 201);
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
  markSelfAttendance,
};
