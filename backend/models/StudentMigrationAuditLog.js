/**
 * Student Migration Audit Log Model
 * 
 * Records every bulk student class/section migration for compliance and auditability.
 */

const mongoose = require('mongoose');

const studentMigrationAuditLogSchema = new mongoose.Schema(
  {
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Performing user reference is required'],
    },
    adminName: {
      type: String,
      required: [true, 'Admin name is required'],
      trim: true,
    },
    ip: {
      type: String,
      trim: true,
    },
    oldClassName: {
      type: String,
      trim: true,
    },
    oldSection: {
      type: String,
      trim: true,
    },
    newClassName: {
      type: String,
      trim: true,
      required: [true, 'Target class name is required'],
    },
    newSection: {
      type: String,
      trim: true,
    },
    studentCount: {
      type: Number,
      required: [true, 'Student count is required'],
    },
    rollMode: {
      type: String,
      enum: ['keep', 'regenerate'],
      default: 'keep',
    },
  },
  {
    timestamps: true,
  }
);

studentMigrationAuditLogSchema.index({ performedBy: 1, createdAt: -1 });
studentMigrationAuditLogSchema.index({ newClassName: 1, createdAt: -1 });

module.exports = mongoose.model('StudentMigrationAuditLog', studentMigrationAuditLogSchema);
