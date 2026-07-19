/**
 * Attendance Service
 * 
 * Business logic for student and staff attendance.
 * Includes Class Teacher authorization helpers, session management,
 * attendance locking, and audit logging.
 */

const Attendance = require('../models/Attendance');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceAuditLog = require('../models/AttendanceAuditLog');
const StaffAttendance = require('../models/StaffAttendance');
const Class = require('../models/Class');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const adminService = require('./adminService');
const holidayService = require('./holidayService');

class AttendanceService {
  /**
   * Get the class(es) where the given user is the Class Teacher
   * @param {string} userId - User account ID
   * @returns {Array} Array of class objects (or empty array)
   */
  async getClassTeacherClasses(userId) {
    const teacher = await Teacher.findOne({ user: userId });
    if (!teacher) return [];

    const classes = await Class.find({ teacher: teacher._id, isActive: true })
      .populate('teacher', 'firstName lastName')
      .select('name section students teacher tuitionFee isActive');

    // Sort by class name naturally
    classes.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    return classes;
  }

  /**
   * Mark attendance for multiple students in a class on a specific date
   * @param {string} classId - ID of the class
   * @param {string} date - Date of attendance (YYYY-MM-DD or comparable)
   * @param {Array} attendanceData - Array of { studentId, status, remarks }
   * @param {Object} userInfo - { userId, userName, ip, userAgent }
   */
  async markAttendance(classId, date, attendanceData, userInfo = {}) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0); // Normalize to start of day

    // 1. Verify class exists
    const cls = await Class.findById(classId);
    if (!cls) {
      throw new Error('Class not found');
    }

    // 2. Check if attendance already exists for this class and date
    const existing = await Attendance.findOne({ class: classId, date: targetDate });
    if (existing) {
      throw new Error(`Attendance already marked for this class on ${targetDate.toDateString()}`);
    }

    // 3. Check if a session exists and is locked
    const existingSession = await AttendanceSession.findOne({ class: classId, date: targetDate });
    if (existingSession && existingSession.attendanceStatus === 'locked') {
      throw new Error('Attendance is locked for this date. Only an administrator can unlock it.');
    }

    // 4. Insert attendance records
    const operations = attendanceData.map(item => ({
      student: item.studentId,
      class: classId,
      date: targetDate,
      status: item.status,
      remarks: item.remarks || ''
    }));

    const results = await Attendance.insertMany(operations);

    // 5. Create or update attendance session
    await AttendanceSession.findOneAndUpdate(
      { class: classId, date: targetDate },
      {
        class: classId,
        date: targetDate,
        markedBy: userInfo.userId || null,
        attendanceStatus: 'draft',
      },
      { upsert: true, new: true }
    );

    // 6. Create audit log
    await this.createAuditLog({
      action: 'created',
      classId,
      date: targetDate,
      userId: userInfo.userId,
      teacherName: userInfo.userName || 'Unknown',
      className: cls.name,
      ip: userInfo.ip,
      userAgent: userInfo.userAgent,
      details: `Attendance marked for ${results.length} students`,
    });

    adminService.invalidateAnalyticsCache();
    return results;
  }

  /**
   * Update attendance for a class on a specific date
   * @param {string} classId - ID of the class
   * @param {string} date - Date of attendance
   * @param {Array} attendanceData - Array of { studentId, status, remarks }
   * @param {Object} userInfo - { userId, userName, ip, userAgent }
   */
  async updateAttendance(classId, date, attendanceData, userInfo = {}) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Check lock status (Admins can bypass the lock)
    const session = await AttendanceSession.findOne({ class: classId, date: targetDate });
    if (session && session.attendanceStatus === 'locked' && userInfo.role !== 'admin') {
      throw new Error('Attendance is locked for this date. Only an administrator can unlock it.');
    }

    const cls = await Class.findById(classId);
    if (!cls) {
      throw new Error('Class not found');
    }

    // Update each student's attendance record
    const updatePromises = attendanceData.map(item =>
      Attendance.findOneAndUpdate(
        { student: item.studentId, class: classId, date: targetDate },
        { status: item.status, remarks: item.remarks || '' },
        { new: true, upsert: true }
      )
    );

    const results = await Promise.all(updatePromises);

    // Update session status back to draft if it was submitted
    if (session && session.attendanceStatus === 'submitted') {
      session.attendanceStatus = 'draft';
      await session.save();
    }

    // Audit log
    await this.createAuditLog({
      action: 'updated',
      classId,
      date: targetDate,
      userId: userInfo.userId,
      teacherName: userInfo.userName || 'Unknown',
      className: cls.name,
      ip: userInfo.ip,
      userAgent: userInfo.userAgent,
      details: `Attendance updated for ${results.length} students`,
    });

    adminService.invalidateAnalyticsCache();
    return results;
  }

  /**
   * Submit attendance (draft → submitted)
   */
  async submitAttendance(classId, date, userInfo = {}) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const session = await AttendanceSession.findOne({ class: classId, date: targetDate });
    if (!session) {
      throw new Error('No attendance record found for this class and date');
    }

    if (session.attendanceStatus === 'locked') {
      throw new Error('Attendance is already locked');
    }

    if (session.attendanceStatus === 'submitted') {
      throw new Error('Attendance is already submitted');
    }

    session.attendanceStatus = 'submitted';
    session.submittedAt = new Date();
    await session.save();

    const cls = await Class.findById(classId);

    await this.createAuditLog({
      action: 'submitted',
      classId,
      date: targetDate,
      userId: userInfo.userId,
      teacherName: userInfo.userName || 'Unknown',
      className: cls ? cls.name : 'Unknown',
      ip: userInfo.ip,
      userAgent: userInfo.userAgent,
      details: 'Attendance submitted for review',
    });

    adminService.invalidateAnalyticsCache();
    return session;
  }

  /**
   * Lock attendance (admin only: submitted → locked)
   */
  async lockAttendance(classId, date, userInfo = {}) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const session = await AttendanceSession.findOne({ class: classId, date: targetDate });
    if (!session) {
      throw new Error('No attendance record found for this class and date');
    }

    if (session.attendanceStatus === 'locked') {
      throw new Error('Attendance is already locked');
    }

    session.attendanceStatus = 'locked';
    session.lockedBy = userInfo.userId || null;
    session.lockedAt = new Date();
    await session.save();

    const cls = await Class.findById(classId).populate('teacher');

    await this.createAuditLog({
      action: 'locked',
      classId,
      date: targetDate,
      userId: userInfo.userId,
      teacherName: userInfo.userName || 'Admin',
      className: cls ? cls.name : 'Unknown',
      ip: userInfo.ip,
      userAgent: userInfo.userAgent,
      details: 'Attendance locked by administrator',
    });

    // Return class teacher's user ID for notification
    adminService.invalidateAnalyticsCache();
    return {
      session,
      classTeacherUserId: cls && cls.teacher ? cls.teacher.user : null,
      className: cls ? cls.name : 'Unknown',
    };
  }

  /**
   * Unlock attendance (admin only: locked → submitted)
   */
  async unlockAttendance(classId, date, userInfo = {}) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const session = await AttendanceSession.findOne({ class: classId, date: targetDate });
    if (!session) {
      throw new Error('No attendance record found for this class and date');
    }

    if (session.attendanceStatus !== 'locked') {
      throw new Error('Attendance is not locked');
    }

    session.attendanceStatus = 'submitted';
    session.lockedBy = null;
    session.lockedAt = null;
    await session.save();

    const cls = await Class.findById(classId).populate('teacher');

    await this.createAuditLog({
      action: 'unlocked',
      classId,
      date: targetDate,
      userId: userInfo.userId,
      teacherName: userInfo.userName || 'Admin',
      className: cls ? cls.name : 'Unknown',
      ip: userInfo.ip,
      userAgent: userInfo.userAgent,
      details: 'Attendance unlocked by administrator',
    });

    adminService.invalidateAnalyticsCache();
    return {
      session,
      classTeacherUserId: cls && cls.teacher ? cls.teacher.user : null,
      className: cls ? cls.name : 'Unknown',
    };
  }

  /**
   * Get attendance session info for a class and date
   */
  async getAttendanceSession(classId, date) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const session = await AttendanceSession.findOne({ class: classId, date: targetDate })
      .populate('markedBy', 'name')
      .populate('lockedBy', 'name');

    return session;
  }

  /**
   * Fetch attendance report for a class and date
   */
  async getAttendanceReport(classId, date) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const report = await Attendance.find({
      class: classId,
      date: targetDate
    })
    .populate('student', 'fullName rollNumber');

    report.sort((a, b) => {
      const rollA = a.student ? (parseInt(a.student.rollNumber) || 0) : 0;
      const rollB = b.student ? (parseInt(b.student.rollNumber) || 0) : 0;
      return rollA - rollB;
    });

    // Also fetch session info
    const session = await this.getAttendanceSession(classId, date);

    return {
      records: report,
      session: session || null,
    };
  }

  /**
   * Sync and automatically mark active teachers as absent if it is past 12:00 PM (IST)
   * @param {Date} targetDate - Normalized date to check
   */
  async syncAutoAbsentTeachers(targetDate) {
    try {
      const nowUtc = new Date();
      // Shift UTC time to IST (UTC + 5:30)
      const nowIst = new Date(nowUtc.getTime() + (5.5 * 60 * 60 * 1000));
      const hoursIst = nowIst.getUTCHours();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Only sync if targetDate is today or in the past
      if (targetDate.getTime() > today.getTime()) {
        return;
      }

      // Check if targetDate is a working day
      const isWorkingDay = await holidayService.isWorkingDay(targetDate, 'Teachers');
      if (!isWorkingDay) {
        return; // Skip auto-absent logic for holidays/Sundays
      }

      // If checking today, only sync if it is past 12:00 PM IST
      if (targetDate.getTime() === today.getTime() && hoursIst < 12) {
        return;
      }

      // Get all active teachers
      const activeTeachers = await Teacher.find({ isActive: true });

      const tomorrow = new Date(targetDate);
      tomorrow.setDate(tomorrow.getDate() + 1);

      for (const teacher of activeTeachers) {
        const existing = await StaffAttendance.findOne({
          teacher: teacher._id,
          date: { $gte: targetDate, $lt: tomorrow }
        });

        if (!existing) {
          await StaffAttendance.create({
            teacher: teacher._id,
            date: targetDate,
            status: 'Absent',
            remarks: 'Auto-marked absent by system (did not mark before 12:00 PM)'
          });
        }
      }
    } catch (error) {
      console.error('Error syncing auto absent teachers:', error);
    }
  }

  /**
   * Mark attendance for staff (teachers)
   * @param {string} date - Date of attendance
   * @param {Array} attendanceData - Array of { teacherId, status, remarks }
   */
  async markStaffAttendance(date, attendanceData) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Update or insert staff attendance records (Admin can overwrite multiple times)
    const updatePromises = attendanceData.map(item =>
      StaffAttendance.findOneAndUpdate(
        { teacher: item.teacherId, date: targetDate },
        { status: item.status, remarks: item.remarks || '' },
        { new: true, upsert: true }
      )
    );

    const results = await Promise.all(updatePromises);
    adminService.invalidateAnalyticsCache();
    return results;
  }

  /**
   * Fetch staff attendance report for a date
   */
  async getStaffAttendanceReport(date) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    await this.syncAutoAbsentTeachers(targetDate);

    const report = await StaffAttendance.find({
      date: targetDate
    })
    .populate('teacher', 'firstName lastName email subject phone')
    .sort({ 'teacher.firstName': 1 });

    return report;
  }

  /**
   * Get student monthly attendance report for grid view
   */
  async getStudentMonthlyReport(classId, month, year) {
    const parsedMonth = parseInt(month);
    const parsedYear = parseInt(year);

    const startDate = new Date(parsedYear, parsedMonth - 1, 1);
    const endDate = new Date(parsedYear, parsedMonth, 0, 23, 59, 59, 999);

    const students = await Student.find({ class: classId });
    students.sort((a, b) => (parseInt(a.rollNumber) || 0) - (parseInt(b.rollNumber) || 0));
    const attendanceRecords = await Attendance.find({
      class: classId,
      date: { $gte: startDate, $lte: endDate }
    });

    const report = students.map(student => {
      const studentRecords = attendanceRecords.filter(r => r.student.toString() === student._id.toString());
      const dailyStatus = {};
      
      studentRecords.forEach(r => {
        const day = new Date(r.date).getDate();
        dailyStatus[day] = r.status;
      });

      return {
        student: {
          _id: student._id,
          fullName: student.fullName,
          rollNumber: student.rollNumber,
          admissionNumber: student.admissionNumber
        },
        attendance: dailyStatus
      };
    });

    return report;
  }

  /**
   * Get staff monthly attendance report for grid view
   */
  async getStaffMonthlyReport(month, year) {
    const parsedMonth = parseInt(month);
    const parsedYear = parseInt(year);

    const startDate = new Date(parsedYear, parsedMonth - 1, 1);
    const endDate = new Date(parsedYear, parsedMonth, 0, 23, 59, 59, 999);

    const teachers = await Teacher.find({ isActive: true }).sort({ firstName: 1 });
    const attendanceRecords = await StaffAttendance.find({
      date: { $gte: startDate, $lte: endDate }
    });

    const report = teachers.map(teacher => {
      const teacherRecords = attendanceRecords.filter(r => r.teacher.toString() === teacher._id.toString());
      const dailyStatus = {};
      
      teacherRecords.forEach(r => {
        const day = new Date(r.date).getDate();
        dailyStatus[day] = r.status;
      });

      return {
        teacher: {
          _id: teacher._id,
          fullName: `${teacher.firstName} ${teacher.lastName}`,
          email: teacher.email,
          subject: teacher.subject
        },
        attendance: dailyStatus
      };
    });

    return report;
  }

  /**
   * Get detailed attendance analysis for a single teacher (for yearly calendar view)
   * @param {string} teacherId - ID of the teacher
   */
  async getTeacherAttendanceAnalysis(teacherId) {
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) throw new Error('Teacher not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await this.syncAutoAbsentTeachers(today);

    const allRecords = await StaffAttendance.find({ teacher: teacherId }).sort({ date: 1, updatedAt: 1 });
    
    const { formatDateString } = require('../utils/dateUtils');
    const uniqueRecordsMap = new Map();
    const holidayService = require('./holidayService');
    for (const r of allRecords) {
      if (await holidayService.isWorkingDay(r.date, 'Teachers')) {
        const dateKey = formatDateString(r.date);
        uniqueRecordsMap.set(dateKey, r);
      }
    }
    
    const records = Array.from(uniqueRecordsMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));

    const totalDays = records.length;
    const presentCount = records.filter(r => r.status === 'Present').length;
    const absentCount = records.filter(r => r.status === 'Absent').length;
    const leaveCount = records.filter(r => r.status === 'Leave').length;
    const lateCount = records.filter(r => r.status === 'Late').length;

    const attendancePercentage = totalDays > 0
      ? (((presentCount + lateCount) / totalDays) * 100).toFixed(2)
      : '0.00';

    return {
      teacherInfo: {
        name: `${teacher.firstName} ${teacher.lastName}`,
        subject: teacher.subject || 'N/A',
        phone: teacher.phone || 'N/A',
        email: teacher.email || 'N/A',
        employeeId: teacher.employeeId || teacher._id.toString().slice(-8).toUpperCase(),
        joiningDate: teacher.joiningDate,
        assignedClasses: teacher.assignedClasses || [],
        isActive: teacher.isActive,
        qualification: teacher.qualification || 'N/A'
      },
      overallAttendance: {
        totalDays,
        presentCount,
        absentCount,
        leaveCount,
        lateCount,
        percentage: attendancePercentage
      },
      records: records.map(r => ({
        date: r.date,
        status: r.status,
        remarks: r.remarks || '',
        markedAt: r.createdAt
      }))
    };
  }

  /**
   * Get overall staff attendance summary for all teachers
   */
  async getStaffAttendanceSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await this.syncAutoAbsentTeachers(today);

    const teachers = await Teacher.find({ isActive: true }).sort({ firstName: 1 });
    const allRecords = await StaffAttendance.find({}).sort({ date: 1, updatedAt: 1 });
    
    const { formatDateString } = require('../utils/dateUtils');
    const uniqueRecordsMap = new Map();
    const holidayService = require('./holidayService');
    
    for (const r of allRecords) {
      if (r.teacher) {
        if (await holidayService.isWorkingDay(r.date, 'Teachers')) {
          const dateStr = formatDateString(r.date);
          const key = `${r.teacher.toString()}_${dateStr}`;
          uniqueRecordsMap.set(key, r);
        }
      }
    }
    const records = Array.from(uniqueRecordsMap.values());
    const uniqueDates = new Set(records.map(r => formatDateString(r.date)));

    const summary = teachers.map(teacher => {
      const teacherRecords = records.filter(r => r.teacher.toString() === teacher._id.toString());
      const totalDays = teacherRecords.length;
      
      const presentCount = teacherRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
      const absentCount = teacherRecords.filter(r => r.status === 'Absent').length;
      const leaveCount = teacherRecords.filter(r => r.status === 'Leave').length;
      const lateCount = teacherRecords.filter(r => r.status === 'Late').length;
      
      const attendancePercentage = totalDays > 0 
        ? ((presentCount / totalDays) * 100).toFixed(2)
        : "100.00";

      return {
        teacherId: teacher._id,
        name: `${teacher.firstName} ${teacher.lastName}`,
        subject: teacher.subject,
        phone: teacher.phone,
        totalDays,
        presentCount,
        absentCount,
        leaveCount,
        lateCount,
        attendancePercentage
      };
    });

    return {
      totalDays: uniqueDates.size,
      staff: summary
    };
  }

  /**
   * Get audit log entries for a class
   */
  async getAuditLog(classId, page = 1, limit = 50) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = classId ? { class: classId } : {};

    const [logs, total] = await Promise.all([
      AttendanceAuditLog.find(filter)
        .populate('performedBy', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AttendanceAuditLog.countDocuments(filter),
    ]);

    return {
      logs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  /**
   * Create an audit log entry
   * @private
   */
  async createAuditLog({ action, classId, date, userId, teacherName, className, ip, userAgent, details }) {
    try {
      await AttendanceAuditLog.create({
        action,
        class: classId,
        date,
        performedBy: userId,
        teacherName: teacherName || 'Unknown',
        className: className || 'Unknown',
        ip: ip || 'Unknown',
        userAgent: userAgent || 'Unknown',
        details: details || '',
      });
    } catch (error) {
      // Silent failure — audit logs should never break core attendance operations
      console.error('Failed to create audit log:', error.message);
    }
  }
}

module.exports = new AttendanceService();
