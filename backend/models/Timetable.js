/**
 * Timetable Model
 * 
 * Represents the weekly schedule for a specific class.
 * Managed by Admin only.
 */

const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  startTime: {
    type: String,
    required: [true, 'Start time is required (e.g., 08:00 AM)'],
    trim: true,
  },
  endTime: {
    type: String,
    required: [true, 'End time is required (e.g., 09:00 AM)'],
    trim: true,
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    // Optional for breaks
  },
  subjectCode: {
    type: String,
    trim: true,
    uppercase: true,
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher', // Referencing the dedicated Teacher model for profile info
    // Optional for breaks
  },
  room: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: {
      values: ['Theory', 'Lab', 'Project', 'Break'],
      message: '{VALUE} is not a supported slot type',
    },
    default: 'Theory',
  },
  label: {
    type: String,
    trim: true,
    // Useful for custom labels like "Lunch Break" or "Assembly"
  }
});

const dayScheduleSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
  },
  slots: [slotSchema],
});

const timetableSchema = new mongoose.Schema(
  {
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Timetable must be associated with a class'],
      unique: true, // One timetable per class
    },
    weeklySchedule: [dayScheduleSchema],
    academicYear: {
      type: String,
      required: true,
      default: () => {
        const { extractYearMonth } = require('../utils/dateUtils');
        const ym = extractYearMonth(new Date());
        return (ym ? ym.year : new Date().getFullYear()).toString();
      },
    },
    semester: {
      type: String,
      required: [true, 'Semester is required (e.g., Semester 1, Fall)'],
      trim: true,
    },
    isActive: {

      type: Boolean,
      default: true,
    }
  },
  {
    timestamps: true,
  }
);

// Index for performance and uniqueness
timetableSchema.index({ class: 1, academicYear: 1, semester: 1 }, { unique: true });


// Helper to validate that periods don't overlap (Can be implemented here or in controller)
// For now, keeping it basic and scalable.

module.exports = mongoose.model('Timetable', timetableSchema);
