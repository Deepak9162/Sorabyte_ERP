/**
 * ExamStudentDetail Model
 * 
 * Stores student-level teacher remarks, co-scholastic grades,
 * and snapshotted attendance summary for an examination.
 * Enforces unique compound index: { exam: 1, student: 1 }.
 */

const mongoose = require('mongoose');

const coScholasticGradeSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, 'Co-scholastic category is required'],
      trim: true,
    },
    grade: {
      type: String,
      required: [true, 'Co-scholastic grade is required'],
      enum: ['A+', 'A', 'B+', 'B', 'C'],
      default: 'A',
    },
  },
  { _id: false }
);

const examStudentDetailSchema = new mongoose.Schema(
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
    teacherRemarks: {
      type: String,
      trim: true,
      maxlength: [500, 'Teacher remarks cannot exceed 500 characters'],
      default: '',
    },
    coScholasticGrades: [coScholasticGradeSchema],
    attendanceSnapshot: {
      totalWorkingDays: { type: Number, default: 0 },
      daysPresent: { type: Number, default: 0 },
      daysAbsent: { type: Number, default: 0 },
      daysLeave: { type: Number, default: 0 },
      attendancePercentage: { type: Number, default: 0 },
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

examStudentDetailSchema.index({ exam: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('ExamStudentDetail', examStudentDetailSchema);
