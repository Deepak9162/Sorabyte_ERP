/**
 * MarksCorrectionRequest Model
 * 
 * Tracks auditable marks correction & rechecking requests.
 * Preserves original baseline marks, enforces required justification reason,
 * and maintains atomic status transitions (PENDING, APPROVED, REJECTED, COMPLETED, CANCELLED).
 */

const mongoose = require('mongoose');

const marksCorrectionRequestSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: [true, 'Exam reference is required'],
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
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required'],
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
      index: true,
    },
    session: {
      type: String,
      trim: true,
    },
    existingMarks: {
      type: Number,
      default: null,
    },
    requestedMarks: {
      type: Number,
      required: [true, 'Requested marks value is required'],
      min: [0, 'Requested marks cannot be negative'],
    },
    reason: {
      type: String,
      required: [true, 'Justification reason is required for correction request'],
      trim: true,
      minlength: [5, 'Reason must be at least 5 characters long'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    reviewRemarks: {
      type: String,
      trim: true,
      default: '',
    },
    appliedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find active requests and prevent duplicate pending requests
marksCorrectionRequestSchema.index({ exam: 1, student: 1, subject: 1, status: 1 });

module.exports = mongoose.model('MarksCorrectionRequest', marksCorrectionRequestSchema);
