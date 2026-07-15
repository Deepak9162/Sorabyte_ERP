/**
 * Class Model
 * 
 * Represents a specific class/section in the School ERP.
 * Each class has a name, a primary teacher (User), and a list of students.
 */

const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Class name is required (e.g., 10-A, 12-B)'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    section: {
      type: String,
      trim: true,
      // Room number or section identifier
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'A class must have a primary teacher'],
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    tuitionFee: {
      type: Number,
      required: [true, 'Tuition fee is required for the class'],
      default: 0,
      min: [0, 'Fee cannot be negative'],
    },

  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Class', classSchema);
