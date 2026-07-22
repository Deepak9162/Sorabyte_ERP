const mongoose = require('mongoose');
require('dotenv').config();

const Holiday = require('../models/Holiday');
const StaffAttendance = require('../models/StaffAttendance');

async function checkDb() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lbs_school';
    await mongoose.connect(mongoUri);

    console.log('=== ACTIVE HOLIDAYS ===');
    const holidays = await Holiday.find({});
    console.log(JSON.stringify(holidays, null, 2));

    console.log('\n=== STAFF ATTENDANCE FOR JULY 2026 ===');
    const records = await StaffAttendance.find({
      date: {
        $gte: new Date('2026-07-01T00:00:00.000Z'),
        $lte: new Date('2026-07-31T23:59:59.999Z')
      }
    }).populate('teacher', 'firstName lastName');
    
    records.forEach(r => {
      console.log(`Date: ${r.date.toISOString().split('T')[0]}, Teacher: ${r.teacher?.firstName} ${r.teacher?.lastName}, Status: ${r.status}, Remarks: ${r.remarks}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkDb();
