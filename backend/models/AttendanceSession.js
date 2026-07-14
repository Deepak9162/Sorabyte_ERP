/**
 * Attendance Session Model
 * 
 * Tracks per-class, per-day attendance session metadata.
 * Manages the lifecycle: draft → submitted → locked.
 * Ensures one attendance session per class per day.
 */

const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema(
  {
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class reference is required'],
    },
    date: {
      type: Date,
      required: [true, 'Attendance date is required'],
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User who marked attendance is required'],
    },
    attendanceStatus: {
      type: String,
      enum: {
        values: ['draft', 'submitted', 'locked'],
        message: 'Status must be draft, submitted, or locked',
      },
      default: 'draft',
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// One session per class per day
attendanceSessionSchema.index({ class: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
