/**
 * Attendance Model
 * 
 * Tracks daily attendance for students in specific classes.
 */

const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class reference is required'],
    },
    date: {
      type: Date,
      required: [true, 'Attendance date is required'],
      default: Date.now,
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

// Compound index to ensure uniqueness of student-date-class attendance records
attendanceSchema.index({ student: 1, date: 1, class: 1 }, { unique: true });
// Index for fast lookup by class and date (used in attendance reporting)
attendanceSchema.index({ class: 1, date: 1 });
// Indexes for optimized aggregation on dashboard
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
