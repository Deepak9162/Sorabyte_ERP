/**
 * ExamMarks Model
 * 
 * Stores student marks for specific subject in an exam.
 * Enforces data integrity with unique compound index (exam + student + subject).
 */

const mongoose = require('mongoose');

const examMarksSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: [true, 'Exam reference is required'],
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
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
    rollNumber: {
      type: String,
      trim: true,
      default: '',
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required'],
      index: true,
    },
    session: {
      type: String,
      required: [true, 'Academic session is required'],
      trim: true,
      index: true,
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
    },
    marksObtained: {
      type: Number,
      required: [true, 'Marks obtained is required'],
      min: [0, 'Marks obtained cannot be negative'],
    },
    isAbsent: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: {
        values: ['Pass', 'Fail'],
        message: 'Status must be Pass or Fail',
      },
      required: true,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [200, 'Remarks cannot exceed 200 characters'],
      default: '',
    },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// ──────────────────────────────────────────────
// Data Integrity: Unique Compound Index
// Ensures a student cannot have duplicate marks for the same exam & subject
// ──────────────────────────────────────────────
examMarksSchema.index({ exam: 1, student: 1, subject: 1 }, { unique: true });

// Performance indexes for frequent queries
examMarksSchema.index({ exam: 1, class: 1 });
examMarksSchema.index({ student: 1, session: 1 });
examMarksSchema.index({ class: 1, subject: 1 });

module.exports = mongoose.model('ExamMarks', examMarksSchema);
