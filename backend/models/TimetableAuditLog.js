const mongoose = require('mongoose');

const timetableAuditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['COPY_TIMETABLE', 'UNDO_COPY', 'APPLY_WEEKLY'],
    required: true,
  },
  timetable: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Timetable',
    required: true,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sourceDay: {
    type: String,
  },
  destinationDays: {
    type: [String],
  },
  previousVersion: {
    type: mongoose.Schema.Types.Mixed, // The entire weeklySchedule array before the change
  },
  newVersion: {
    type: mongoose.Schema.Types.Mixed, // The entire weeklySchedule array after the change
  },
  details: {
    type: String,
  }
}, { timestamps: true });

timetableAuditLogSchema.index({ timetable: 1, createdAt: -1 });

module.exports = mongoose.model('TimetableAuditLog', timetableAuditLogSchema);
