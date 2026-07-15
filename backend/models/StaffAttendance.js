/**
 * Staff Attendance Model
 * 
 * Tracks daily attendance for staff members (teachers).
 */

const mongoose = require('mongoose');

const staffAttendanceSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher reference is required'],
    },
    date: {
      type: Date,
      required: [true, 'Attendance date is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['Present', 'Absent', 'Leave', 'Late'],
        message: 'Status must be Present, Absent, Leave, or Late',
      },
      required: [true, 'Attendance status is required'],
      default: 'Present',
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [200, 'Remarks cannot exceed 200 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness of teacher-date attendance records
staffAttendanceSchema.index({ teacher: 1, date: 1 }, { unique: true });
// Indexes for optimized aggregation on dashboard
staffAttendanceSchema.index({ date: 1 });
staffAttendanceSchema.index({ status: 1 });

module.exports = mongoose.model('StaffAttendance', staffAttendanceSchema);
