/**
 * LeaveRequest Model
 * 
 * Represents a leave request submitted by a teacher.
 */

const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher reference is required'],
      index: true,
    },
    leaveType: {
      type: String,
      enum: {
        values: ['Sick Leave', 'Casual Leave', 'Emergency Leave', 'Personal Leave', 'Other'],
        message: 'Invalid leave type',
      },
      required: [true, 'Leave type is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    totalDays: {
      type: Number,
      required: true,
      min: [1, 'Total days must be at least 1'],
    },
    reason: {
      type: String,
      required: [true, 'Reason for leave is required'],
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
        message: 'Status must be Pending, Approved, Rejected, or Cancelled',
      },
      default: 'Pending',
      index: true,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    adminRemarks: {
      type: String,
      trim: true,
      maxlength: [500, 'Admin remarks cannot exceed 500 characters'],
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    cancelledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient overlapping checks
leaveRequestSchema.index({ teacher: 1, startDate: 1, endDate: 1 });
leaveRequestSchema.index({ teacher: 1, status: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
