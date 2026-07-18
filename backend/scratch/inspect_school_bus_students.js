const mongoose = require('mongoose');
const path = require('path');
const Class = require('../models/Class');
const Student = require('../models/Student');
const FeeLedger = require('../models/FeeLedger');

async function run() {
  try {
    const dotenvPath = path.resolve(__dirname, '../.env');
    require('dotenv').config({ path: dotenvPath });

    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/little_flower_school_erp';
    await mongoose.connect(mongoUri);

    const schoolBusStudents = await Student.find({ transportMode: 'School Bus' }).populate('class');
    
    for (const student of schoolBusStudents) {
      console.log(`\n========================================`);
      console.log(`Student: ${student.fullName} (Roll: ${student.rollNumber})`);
      console.log(`ID: ${student._id}`);
      console.log(`admissionDate: ${student.admissionDate}`);
      console.log(`transportMode: "${student.transportMode}"`);
      console.log(`transportFee: ${student.transportFee}`);
      
      const ledger = await FeeLedger.findOne({ studentId: student._id, academicYear: '2026-2027' });
      if (!ledger) {
        console.log(`Ledger for 2026-2027: None found!`);
        continue;
      }
      
      console.log(`Ledger Total Fee: ${ledger.totalFee}, Total Paid: ${ledger.totalPaid}, Pending: ${ledger.pendingAmount}`);
      console.log(`Ledger Monthly Fees (for July, August, September):`);
      ledger.monthlyFees.forEach(m => {
        if (['July', 'August', 'September'].includes(m.month)) {
          console.log(`  - ${m.month}: tuitionAmount=${m.amount}, tuitionPaid=${m.paidAmount}, tuitionStatus=${m.status} | transportAmount=${m.transportAmount}, transportPaid=${m.transportPaidAmount}, transportStatus=${m.transportStatus}`);
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
