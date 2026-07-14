/**
 * Attendance Audit Log Model
 * 
 * Records every attendance action for compliance and traceability.
 * Captures: who, what, when, where (IP/device).
 */

const mongoose = require('mongoose');

const attendanceAuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: {
        values: ['created', 'updated', 'submitted', 'locked', 'unlocked'],
        message: 'Action must be created, updated, submitted, locked, or unlocked',
      },
      required: [true, 'Audit action is required'],
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class reference is required'],
    },
    date: {
      type: Date,
      required: [true, 'Attendance date is required'],
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Performing user is required'],
    },
    teacherName: {
      type: String,
      trim: true,
    },
    className: {
      type: String,
      trim: true,
    },
    ip: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    details: {
      type: String,
      trim: true,
      maxlength: [500, 'Details cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Query audit logs by class and date
attendanceAuditLogSchema.index({ class: 1, date: -1 });
// Query audit logs by user
attendanceAuditLogSchema.index({ performedBy: 1, createdAt: -1 });

module.exports = mongoose.model('AttendanceAuditLog', attendanceAuditLogSchema);
