const mongoose = require('mongoose');

const instituteSettingsSchema = new mongoose.Schema({
  workingDays: {
    type: [String],
    default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },
  monthlyFeeDueDate: {
    type: Number,
    default: 10,
    min: 1,
    max: 28
  },
  principalName: {
    type: String,
    trim: true,
    default: 'Chandra Mohan Tiwari',
  },
  directorName: {
    type: String,
    trim: true,
    default: 'Chandra Mohan Tiwari',
  }
}, { timestamps: true });

module.exports = mongoose.model('InstituteSettings', instituteSettingsSchema);
