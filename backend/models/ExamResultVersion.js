/**
 * ExamResultVersion Model
 * 
 * Stores immutable result version snapshots when official results are published or republished.
 * Preserves historical class context, section, roll number, subject marks, aggregate totals,
 * attendance, co-scholastic grades, remarks, and revision reasons.
 */

const mongoose = require('mongoose');

const examResultVersionSchema = new mongoose.Schema(
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
    },
    section: {
      type: String,
      trim: true,
      default: 'A',
    },
    rollNumber: {
      type: String,
      trim: true,
      default: '',
    },
    session: {
      type: String,
      required: [true, 'Academic session is required'],
      trim: true,
    },
    version: {
      type: Number,
      required: [true, 'Version number is required'],
      min: [1, 'Version number must be at least 1'],
    },
    isCurrent: {
      type: Boolean,
      default: true,
      index: true,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    revisionReason: {
      type: String,
      trim: true,
      default: 'Initial Official Result Publication',
    },
    // Immutable Snapshot Object
    snapshot: {
      subjects: [
        {
          subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
          subjectName: { type: String, required: true },
          subjectType: { type: String, default: 'Theoretical' },
          maxMarks: { type: Number, required: true },
          passMarks: { type: Number, required: true },
          marksObtained: { type: Number, default: 0 },
          isAbsent: { type: Boolean, default: false },
          status: { type: String, required: true },
          grade: { type: String, default: 'F' },
          gradePoint: { type: Number, default: 0 },
          remarks: { type: String, default: '' },
        },
      ],
      aggregate: {
        totalMarksObtained: { type: Number, required: true },
        totalMaxMarks: { type: Number, required: true },
        percentage: { type: Number, required: true },
        overallGrade: { type: String, required: true },
        gradePointAverage: { type: Number, default: 0 },
        overallStatus: { type: String, required: true },
        division: { type: String, default: 'N/A' },
        resultSummary: { type: String, default: '' },
      },
      attendance: {
        totalWorkingDays: { type: Number, default: 0 },
        daysPresent: { type: Number, default: 0 },
        daysAbsent: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
      },
      coScholastic: [
        {
          activityName: String,
          grade: String,
          descriptiveIndicator: String,
        },
      ],
      remarks: {
        teacherRemark: { type: String, default: '' },
        principalRemark: { type: String, default: '' },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index enforcing single version number per student per exam
examResultVersionSchema.index({ exam: 1, student: 1, version: 1 }, { unique: true });
// Index for fast query of current version
examResultVersionSchema.index({ exam: 1, student: 1, isCurrent: 1 });

module.exports = mongoose.model('ExamResultVersion', examResultVersionSchema);
