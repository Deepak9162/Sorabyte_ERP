const mongoose = require('mongoose');

const instituteSettingsSchema = new mongoose.Schema({
  workingDays: {
    type: [String],
    default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },
  // We can add other institute settings here in the future
}, { timestamps: true });

module.exports = mongoose.model('InstituteSettings', instituteSettingsSchema);
