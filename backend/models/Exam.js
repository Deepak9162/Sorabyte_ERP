/**
 * Exam Model
 * 
 * Represents an examination in the School ERP.
 * Supports MONTHLY, HALF_YEARLY, and ANNUAL exam types.
 */

const mongoose = require('mongoose');

const subjectConfigSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required'],
    },
    maxMarks: {
      type: Number,
      required: [true, 'Maximum marks are required'],
      min: [1, 'Maximum marks must be greater than 0'],
    },
    passMarks: {
      type: Number,
      required: [true, 'Passing marks are required'],
      min: [0, 'Passing marks cannot be negative'],
      validate: {
        validator: function (v) {
          return v <= this.maxMarks;
        },
        message: 'Passing marks cannot exceed maximum marks',
      },
    },
  },
  { _id: false }
);

const scheduleSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    examDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      default: '09:00 AM',
    },
    endTime: {
      type: String,
      default: '12:00 PM',
    },
    reportingTime: {
      type: String,
      default: '08:30 AM',
    },
    room: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const examSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Exam name is required (e.g. Monthly Exam 1, Half Yearly Exam)'],
      trim: true,
    },
    examType: {
      type: String,
      required: [true, 'Exam type is required'],
      enum: {
        values: ['MONTHLY', 'HALF_YEARLY', 'ANNUAL'],
        message: 'Exam type must be MONTHLY, HALF_YEARLY, or ANNUAL',
      },
      index: true,
    },
    session: {
      type: String,
      required: [true, 'Academic session is required (e.g. 2026-2027)'],
      trim: true,
      index: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class reference is required'],
      index: true,
    },
    section: {
      type: String,
      trim: true,
      default: '',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: {
        values: ['Draft', 'Scheduled', 'Ongoing', 'Completed', 'Finalized', 'Published'],
        message: '{VALUE} is not a valid exam status',
      },
      default: 'Draft',
      index: true,
    },
    subjectsConfig: [subjectConfigSchema],
    schedule: [scheduleSchema],
    scheduleStatus: {
      type: String,
      enum: ['Draft', 'Published'],
      default: 'Draft',
    },
    instructions: {
      type: String,
      default: '1. Report 30 minutes before exam commencement.\n2. Carry your official printed Admit Card to the examination hall.\n3. Mobile phones and electronic gadgets are strictly prohibited.',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    finalizedAt: {
      type: Date,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    publishedAt: {
      type: Date,
    },
    reopenedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reopenedAt: {
      type: Date,
    },
    reopenReason: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common search patterns
examSchema.index({ class: 1, session: 1, examType: 1 });
examSchema.index({ session: 1, examType: 1 });

module.exports = mongoose.model('Exam', examSchema);
