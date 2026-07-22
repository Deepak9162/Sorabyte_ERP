/**
 * Leave Service
 * 
 * Business logic for teacher leave requests, overlapping validations,
 * admin approval workflows, notifications, and attendance priority mapping.
 */

const LeaveRequest = require('../models/LeaveRequest');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const StaffAttendance = require('../models/StaffAttendance');
const Notification = require('../models/Notification');
const { getStartOfDay, getEndOfDay } = require('../utils/dateUtils');

class LeaveService {
  /**
   * Apply for leave (Teacher)
   */
  async applyLeave({ userId, leaveType, startDate, endDate, reason }) {
    if (!startDate || !endDate) {
      throw new Error('Start date and End date are required');
    }

    const startObj = getStartOfDay(startDate);
    const endObj = getEndOfDay(endDate);

    if (startObj.getTime() > endObj.getTime()) {
      throw new Error('Start date cannot be after End date');
    }

    // Find teacher linked to user account
    const teacher = await Teacher.findOne({ user: userId });
    if (!teacher) {
      throw new Error('Teacher profile not found for this account');
    }

    // Calculate total inclusive days
    const msPerDay = 1000 * 60 * 60 * 24;
    const startDayObj = getStartOfDay(startDate);
    const endDayObj = getStartOfDay(endDate);
    const totalDays = Math.round((endDayObj.getTime() - startDayObj.getTime()) / msPerDay) + 1;

    // Check for overlapping pending or approved leave requests
    const overlap = await LeaveRequest.findOne({
      teacher: teacher._id,
      status: { $in: ['Pending', 'Approved'] },
      $or: [
        { startDate: { $lte: endObj }, endDate: { $gte: startObj } }
      ]
    });

    if (overlap) {
      const sStr = new Date(overlap.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const eStr = new Date(overlap.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      throw new Error(`You already have a ${overlap.status.toLowerCase()} leave request covering ${sStr} to ${eStr}`);
    }

    // Create Leave Request
    const leaveRequest = await LeaveRequest.create({
      teacher: teacher._id,
      leaveType,
      startDate: startObj,
      endDate: endObj,
      totalDays,
      reason,
      status: 'Pending',
      appliedAt: new Date()
    });

    // Notify all admin users
    try {
      const admins = await User.find({ role: 'admin' });
      const teacherName = `${teacher.firstName} ${teacher.lastName}`;
      const notificationPromises = admins.map(admin =>
        Notification.create({
          recipient: admin._id,
          sender: userId,
          title: 'New Leave Request',
          message: `${teacherName} has requested ${leaveType} for ${totalDays} day(s) (${startDayObj.toLocaleDateString('en-IN')} to ${endDayObj.toLocaleDateString('en-IN')}).`,
          type: 'info',
          link: '/attendance?tab=leave-requests'
        })
      );
      await Promise.all(notificationPromises);
    } catch (err) {
      console.error('Failed to send leave notifications to admin:', err.message);
    }

    return leaveRequest;
  }

  /**
   * Get own leave requests (Teacher)
   */
  async getTeacherLeaves(userId) {
    const teacher = await Teacher.findOne({ user: userId });
    if (!teacher) return [];

    return await LeaveRequest.find({ teacher: teacher._id }).sort({ createdAt: -1 });
  }

  /**
   * Get all leave requests (Admin)
   */
  async getAdminLeaves(filters = {}) {
    const query = {};

    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    if (filters.leaveType && filters.leaveType !== 'all') {
      query.leaveType = filters.leaveType;
    }

    if (filters.teacherId) {
      query.teacher = filters.teacherId;
    }

    if (filters.startDate || filters.endDate) {
      query.$and = [];
      if (filters.startDate) {
        query.$and.push({ endDate: { $gte: getStartOfDay(filters.startDate) } });
      }
      if (filters.endDate) {
        query.$and.push({ startDate: { $lte: getEndOfDay(filters.endDate) } });
      }
    }

    return await LeaveRequest.find(query)
      .populate('teacher', 'firstName lastName email subject phone qualification')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });
  }

  /**
   * Approve Leave Request (Admin)
   */
  async approveLeave(requestId, adminUserId, adminRemarks = '') {
    const leaveRequest = await LeaveRequest.findById(requestId).populate('teacher');
    if (!leaveRequest) {
      throw new Error('Leave request not found');
    }

    if (leaveRequest.status === 'Approved') {
      return leaveRequest; // Idempotent approval
    }

    leaveRequest.status = 'Approved';
    leaveRequest.reviewedAt = new Date();
    leaveRequest.reviewedBy = adminUserId;
    if (adminRemarks) {
      leaveRequest.adminRemarks = adminRemarks;
    }
    await leaveRequest.save();

    // Clean up any auto-marked absent records for this teacher in the approved date range
    await StaffAttendance.deleteMany({
      teacher: leaveRequest.teacher._id,
      date: { $gte: leaveRequest.startDate, $lte: leaveRequest.endDate },
      remarks: { $regex: /Auto-marked absent/i }
    });

    // Notify teacher
    try {
      if (leaveRequest.teacher && leaveRequest.teacher.user) {
        await Notification.create({
          recipient: leaveRequest.teacher.user,
          sender: adminUserId,
          title: 'Leave Request Approved',
          message: `Your ${leaveRequest.leaveType} request for ${leaveRequest.totalDays} day(s) has been approved.`,
          type: 'success',
          link: '/teacher/my-attendance'
        });
      }
    } catch (err) {
      console.error('Failed to notify teacher of approval:', err.message);
    }

    return leaveRequest;
  }

  /**
   * Reject Leave Request (Admin)
   */
  async rejectLeave(requestId, adminUserId, adminRemarks = '') {
    const leaveRequest = await LeaveRequest.findById(requestId).populate('teacher');
    if (!leaveRequest) {
      throw new Error('Leave request not found');
    }

    leaveRequest.status = 'Rejected';
    leaveRequest.reviewedAt = new Date();
    leaveRequest.reviewedBy = adminUserId;
    if (adminRemarks) {
      leaveRequest.adminRemarks = adminRemarks;
    }
    await leaveRequest.save();

    // Notify teacher
    try {
      if (leaveRequest.teacher && leaveRequest.teacher.user) {
        await Notification.create({
          recipient: leaveRequest.teacher.user,
          sender: adminUserId,
          title: 'Leave Request Rejected',
          message: `Your ${leaveRequest.leaveType} request was rejected.${adminRemarks ? ` Reason: ${adminRemarks}` : ''}`,
          type: 'error',
          link: '/teacher/my-attendance'
        });
      }
    } catch (err) {
      console.error('Failed to notify teacher of rejection:', err.message);
    }

    return leaveRequest;
  }

  /**
   * Cancel Leave Request (Teacher or Admin)
   */
  async cancelLeave(requestId, userId, userRole, cancellationReason = '') {
    const leaveRequest = await LeaveRequest.findById(requestId).populate('teacher');
    if (!leaveRequest) {
      throw new Error('Leave request not found');
    }

    // Verify ownership if teacher
    if (userRole === 'teacher') {
      const teacher = await Teacher.findOne({ user: userId });
      if (!teacher || teacher._id.toString() !== leaveRequest.teacher._id.toString()) {
        throw new Error('Unauthorized to cancel this leave request');
      }
      if (leaveRequest.status !== 'Pending') {
        throw new Error('Teachers can only cancel Pending leave requests');
      }
    }

    leaveRequest.status = 'Cancelled';
    leaveRequest.cancelledAt = new Date();
    leaveRequest.cancellationReason = cancellationReason || 'Cancelled by user';
    await leaveRequest.save();

    return leaveRequest;
  }

  /**
   * Helper: Check if a teacher has an Approved leave covering a given target date
   */
  async isTeacherOnApprovedLeave(teacherId, targetDate) {
    const dayStart = getStartOfDay(targetDate);
    const dayEnd = getEndOfDay(targetDate);

    const approvedLeave = await LeaveRequest.findOne({
      teacher: teacherId,
      status: 'Approved',
      startDate: { $lte: dayEnd },
      endDate: { $gte: dayStart }
    });

    return !!approvedLeave;
  }

  /**
   * Helper: Get map of approved leaves for an array of teacher IDs for a date
   */
  async getApprovedLeavesMap(teacherIds, targetDate) {
    const dayStart = getStartOfDay(targetDate);
    const dayEnd = getEndOfDay(targetDate);

    const approvedLeaves = await LeaveRequest.find({
      teacher: { $in: teacherIds },
      status: 'Approved',
      startDate: { $lte: dayEnd },
      endDate: { $gte: dayStart }
    });

    const map = new Map();
    approvedLeaves.forEach(l => {
      map.set(l.teacher.toString(), l);
    });
    return map;
  }
}

module.exports = new LeaveService();
