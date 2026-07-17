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
  }
}, { timestamps: true });

module.exports = mongoose.model('InstituteSettings', instituteSettingsSchema);
