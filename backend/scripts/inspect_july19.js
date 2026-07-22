const mongoose = require('mongoose');
require('dotenv').config();

const StaffAttendance = require('../models/StaffAttendance');
const Teacher = require('../models/Teacher');
const { getStartOfDay, getEndOfDay } = require('../utils/dateUtils');

async function inspect() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lbs_school';
    await mongoose.connect(mongoUri);

    const dayStart = getStartOfDay('2026-07-19');
    const dayEnd = getEndOfDay('2026-07-19');

    console.log('Querying StaffAttendance for July 19, 2026 between:', dayStart, 'and', dayEnd);
    const records = await StaffAttendance.find({
      date: { $gte: dayStart, $lte: dayEnd }
    }).populate('teacher', 'firstName lastName');

    console.log(`Found ${records.length} records for July 19, 2026:`);
    records.forEach(r => {
      console.log(`Teacher: ${r.teacher?.firstName} ${r.teacher?.lastName}, Status: ${r.status}, Remarks: ${r.remarks}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

inspect();
