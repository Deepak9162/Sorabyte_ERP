/**
 * Homework Model
 * 
 * Centralized homework management schema with 2-level approval workflow:
 * Teacher -> Class Incharge -> Admin
 */

const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    trim: true,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    required: true,
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  remarks: {
    type: String,
    trim: true,
    default: '',
  },
}, { _id: true });

const homeworkSchema = new mongoose.Schema(
  {
    instituteId: {
      type: String,
      default: 'LFES',
      trim: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class selection is required'],
      index: true,
    },
    className: {
      type: String,
      required: [true, 'Class name is required'],
      trim: true,
    },
    section: {
      type: String,
      trim: true,
      default: '',
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject selection is required'],
      index: true,
    },
    subjectName: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher reference is required'],
      index: true,
    },
    teacherName: {
      type: String,
      required: [true, 'Teacher name is required'],
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    homeworkDate: {
      type: Date,
      required: [true, 'Homework date is required'],
      index: true,
    },
    submissionDate: {
      type: Date,
      required: [true, 'Submission due date is required'],
    },
    title: {
      type: String,
      required: [true, 'Homework title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Homework description is required'],
      trim: true,
    },
    attachment: {
      fileName: { type: String, trim: true },
      filePath: { type: String, trim: true },
      fileType: { type: String, trim: true },
      fileSize: { type: Number },
    },
    homeworkType: {
      type: String,
      enum: {
        values: ['Home Assignment', 'Project Work', 'Classwork Revision', 'Reading / Practice', 'Other'],
        message: 'Invalid homework type',
      },
      default: 'Home Assignment',
    },
    priority: {
      type: String,
      enum: {
        values: ['Low', 'Normal', 'High'],
        message: 'Invalid priority level',
      },
      default: 'Normal',
    },
    status: {
      type: String,
      enum: {
        values: ['Approved', 'Pending Incharge', 'Pending Admin', 'Rejected'],
        message: 'Invalid homework status',
      },
      default: 'Approved',
      index: true,
    },
    inchargeApproval: {
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, trim: true },
      approvedAt: { type: Date },
      remarks: { type: String, trim: true },
    },
    adminApproval: {
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, trim: true },
      approvedAt: { type: Date },
      remarks: { type: String, trim: true },
    },
    history: [historySchema],
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
homeworkSchema.index({ class: 1, section: 1, homeworkDate: 1, status: 1 });
homeworkSchema.index({ teacher: 1, homeworkDate: 1 });
homeworkSchema.index({ class: 1, section: 1, subject: 1, homeworkDate: 1 });

module.exports = mongoose.model('Homework', homeworkSchema);
