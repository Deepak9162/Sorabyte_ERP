const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'National Holiday',
        'Festival Holiday',
        'Emergency Closure',
        'School Holiday',
        'Summer Vacation',
        'Winter Vacation',
        'Exam Break',
        'Government Order',
        'Sunday' // Mainly if they explicitly add a sunday event, though sundays are auto-calculated
      ],
    },
    description: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    applicableTo: {
      type: String,
      required: true,
      enum: ['Students', 'Teachers', 'Both'],
      default: 'Both'
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    reason: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Could be system
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    }
  },
  {
    timestamps: true,
  }
);

// Indexes to speed up range queries for the cron job and scheduler
holidaySchema.index({ startDate: 1, endDate: 1, status: 1 });

module.exports = mongoose.model('Holiday', holidaySchema);
