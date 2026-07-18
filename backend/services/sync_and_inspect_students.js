const mongoose = require('mongoose');
const path = require('path');
const Class = require('../models/Class');
const Student = require('../models/Student');
const FeeLedger = require('../models/FeeLedger');
const feeService = require('./feeService');

async function run() {
  try {
    const dotenvPath = path.resolve(__dirname, '../.env');
    require('dotenv').config({ path: dotenvPath });

    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/little_flower_school_erp';
    await mongoose.connect(mongoUri);

    const schoolBusStudents = await Student.find({ transportMode: 'School Bus' }).populate('class');
    const academicYear = '2026-2027';

    console.log('--- SYNCING SCHOOL BUS STUDENTS LEDGERS ---');

    for (const student of schoolBusStudents) {
      console.log(`\nSyncing ${student.fullName} (Roll: ${student.rollNumber})...`);
      
      const ledger = await feeService.ensureFeeLedger(
        student._id,
        academicYear,
        student.class.tuitionFee || 0
      );

      console.log(`Synced totals -> TotalFee: ${ledger.totalFee}, TotalPaid: ${ledger.totalPaid}, Pending: ${ledger.pendingAmount}`);
      console.log('Monthly breakdown (July to September):');
      ledger.monthlyFees.forEach(m => {
        if (['July', 'August', 'September'].includes(m.month)) {
          console.log(`  - ${m.month}: tuitionStatus=${m.status} | transportAmount=${m.transportAmount}, transportPaidAmount=${m.transportPaidAmount}, transportStatus=${m.transportStatus}`);
        }
      });
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
