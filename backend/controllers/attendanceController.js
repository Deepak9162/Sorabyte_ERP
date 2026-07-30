/**
 * Attendance Controller
 * 
 * Handles HTTP requests for attendance marking and reporting.
 * Enforces Class Teacher authorization for student attendance.
 * Admins have full access to all attendance operations.
 */

const attendanceService = require('../services/attendanceService');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { createNotification } = require('../utils/notificationHelper');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const holidayService = require('../services/holidayService');
const { getStartOfDay } = require('../utils/dateUtils');

/**
 * Extract user info from request for audit logging
 */
const getUserInfo = (req) => ({
  userId: req.user?._id,
  userName: req.user?.name || 'Unknown',
  role: req.user?.role || 'teacher',
  ip: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown',
  userAgent: req.headers['user-agent'] || 'Unknown',
});

/**
 * Verify the logged-in teacher is the Class Teacher of the specified class.
 * Returns { authorized, teacher, cls, errorMsg }
 */
const checkClassTeacherAuth = async (userId, classId) => {
  const teacher = await Teacher.findOne({ user: userId });
  if (!teacher) {
    return { authorized: false, errorMsg: 'Teacher profile not found. Please contact your administrator.' };
  }

  const cls = await Class.findById(classId);
  if (!cls) {
    return { authorized: false, errorMsg: 'Class not found' };
  }

  if (!cls.isActive) {
    return { authorized: false, errorMsg: 'This class is currently inactive' };
  }

  const isClassTeacher = cls.teacher && cls.teacher.toString() === teacher._id.toString();
  if (!isClassTeacher) {
    return { authorized: false, errorMsg: 'Only the assigned Class Teacher can manage attendance for this class.' };
  }

  return { authorized: true, teacher, cls };
};

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

    // Class Teacher authorization (admin bypasses)
    if (req.user.role === 'teacher') {
      const authCheck = await checkClassTeacherAuth(req.user._id, classId);
      if (!authCheck.authorized) {
        return errorResponse(res, authCheck.errorMsg, 403);
      }
    }

    const result = await attendanceService.markAttendance(classId, date, attendanceData, getUserInfo(req));
    return successResponse(res, result, 'Attendance marked successfully', 201);
  } catch (error) {
    if (error.message.includes('already marked')) {
        return errorResponse(res, error.message, 409); // Conflict
    }
    if (error.message.includes('locked')) {
        return errorResponse(res, error.message, 423); // Locked
    }
    next(error);
  }
};

/**
 * @desc    Update attendance for a class
 * @route   PUT /api/attendance
 */
const updateAttendance = async (req, res, next) => {
  try {
    const { classId, date, attendanceData } = req.body;

    if (!classId || !date || !attendanceData || !Array.isArray(attendanceData)) {
      return errorResponse(res, 'Missing required fields: classId, date, or attendanceData array', 400);
    }

    // Class Teacher authorization (admin bypasses)
    if (req.user.role === 'teacher') {
      const authCheck = await checkClassTeacherAuth(req.user._id, classId);
      if (!authCheck.authorized) {
        return errorResponse(res, authCheck.errorMsg, 403);
      }
    }

    const result = await attendanceService.updateAttendance(classId, date, attendanceData, getUserInfo(req));
    return successResponse(res, result, 'Attendance updated successfully');
  } catch (error) {
    if (error.message.includes('locked')) {
        return errorResponse(res, error.message, 423);
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

    // Class Teacher authorization for viewing (admin bypasses)
    if (req.user.role === 'teacher') {
      const authCheck = await checkClassTeacherAuth(req.user._id, classId);
      if (!authCheck.authorized) {
        return errorResponse(res, authCheck.errorMsg, 403);
      }
    }

    const report = await attendanceService.getAttendanceReport(classId, date);
    return successResponse(res, report, 'Attendance report fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit attendance (draft → submitted)
 * @route   POST /api/attendance/submit
 */
const submitAttendance = async (req, res, next) => {
  try {
    const { classId, date } = req.body;

    if (!classId || !date) {
      return errorResponse(res, 'Missing required fields: classId and date', 400);
    }

    if (req.user.role === 'teacher') {
      const authCheck = await checkClassTeacherAuth(req.user._id, classId);
      if (!authCheck.authorized) {
        return errorResponse(res, authCheck.errorMsg, 403);
      }
    }

    const session = await attendanceService.submitAttendance(classId, date, getUserInfo(req));
    return successResponse(res, session, 'Attendance submitted successfully');
  } catch (error) {
    if (error.message.includes('already')) {
      return errorResponse(res, error.message, 409);
    }
    next(error);
  }
};

/**
 * @desc    Lock attendance (admin only)
 * @route   POST /api/attendance/lock
 */
const lockAttendance = async (req, res, next) => {
  try {
    const { classId, date } = req.body;

    if (!classId || !date) {
      return errorResponse(res, 'Missing required fields: classId and date', 400);
    }

    const result = await attendanceService.lockAttendance(classId, date, getUserInfo(req));

    // Notify the Class Teacher
    if (result.classTeacherUserId) {
      await createNotification({
        recipientUserId: result.classTeacherUserId,
        senderUserId: req.user._id,
        title: 'Attendance Locked',
        message: `Attendance for ${result.className} on ${new Date(date).toLocaleDateString()} has been locked by the administrator.`,
        type: 'warning',
        link: '/attendance',
      });
    }

    return successResponse(res, result.session, 'Attendance locked successfully');
  } catch (error) {
    if (error.message.includes('already')) {
      return errorResponse(res, error.message, 409);
    }
    next(error);
  }
};

/**
 * @desc    Unlock attendance (admin only)
 * @route   POST /api/attendance/unlock
 */
const unlockAttendance = async (req, res, next) => {
  try {
    const { classId, date } = req.body;

    if (!classId || !date) {
      return errorResponse(res, 'Missing required fields: classId and date', 400);
    }

    const result = await attendanceService.unlockAttendance(classId, date, getUserInfo(req));

    // Notify the Class Teacher
    if (result.classTeacherUserId) {
      await createNotification({
        recipientUserId: result.classTeacherUserId,
        senderUserId: req.user._id,
        title: 'Attendance Unlocked',
        message: `Attendance for ${result.className} on ${new Date(date).toLocaleDateString()} has been unlocked. You can now edit it.`,
        type: 'success',
        link: '/attendance',
      });
    }

    return successResponse(res, result.session, 'Attendance unlocked successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get the class(es) where the logged-in teacher is the Class Teacher
 * @route   GET /api/attendance/my-class
 */
const getMyClassInfo = async (req, res, next) => {
  try {
    const classes = await attendanceService.getClassTeacherClasses(req.user._id);
    return successResponse(res, classes, 'Class Teacher assignment fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance audit log
 * @route   GET /api/attendance/audit-log
 */
const getAuditLog = async (req, res, next) => {
  try {
    const { classId, page, limit } = req.query;
    const logs = await attendanceService.getAuditLog(classId, page, limit);
    return successResponse(res, logs, 'Audit log fetched successfully');
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

    // Class Teacher authorization (admin bypasses)
    if (req.user.role === 'teacher') {
      const authCheck = await checkClassTeacherAuth(req.user._id, classId);
      if (!authCheck.authorized) {
        return errorResponse(res, authCheck.errorMsg, 403);
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
    const maxRadius = 150; // meters

    const today = getStartOfDay(new Date());

    // Check if it's a working day
    const isWorkingDay = await holidayService.isWorkingDay(today, 'Teachers');
    if (!isWorkingDay) {
      return errorResponse(res, 'Today is a non-working day (Holiday/Sunday). Attendance marking is disabled.', 403);
    }

    const distance = calculateDistance(latitude, longitude, schoolLat, schoolLon);
    if (distance > maxRadius) {
      return errorResponse(res, `You are ${Math.round(distance)} meters away from school. You must be within ${maxRadius} meters.`, 403);
    }

    // Time constraints in Asia/Kolkata (IST) timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

    if (hours >= 12) {
      return errorResponse(res, 'Attendance marking is closed after 12:00 PM.', 403);
    }

    let status = 'Present';
    if (hours > 9 || (hours === 9 && minutes > 30)) {
      status = 'Late';
    }

    const StaffAttendance = require('../models/StaffAttendance');

    const teacher = await Teacher.findOne({ user: req.user._id });
    if (!teacher) {
      return errorResponse(res, 'Teacher profile not found', 404);
    }

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existing = await StaffAttendance.findOne({
      teacher: teacher._id,
      date: { $gte: today, $lt: tomorrow }
    });

    if (existing) {
      return errorResponse(res, `Attendance already marked as ${existing.status} for today.`, 409);
    }

    const istTimeString = now.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const record = await StaffAttendance.create({
      teacher: teacher._id,
      date: today,
      status: status,
      remarks: 'Self marked via Geofencing at ' + istTimeString
    });

    return successResponse(res, record, `Attendance successfully marked as ${status}`, 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
