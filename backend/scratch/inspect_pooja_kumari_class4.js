const mongoose = require('mongoose');
const path = require('path');
const Student = require('../models/Student');
const FeeLedger = require('../models/FeeLedger');
const Class = require('../models/Class');

async function run() {
  try {
    const dotenvPath = path.resolve(__dirname, '../.env');
    require('dotenv').config({ path: dotenvPath });

    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/little_flower_school_erp';
    await mongoose.connect(mongoUri);

    const students = await Student.find({ fullName: /Pooja/i }).populate('class');
    console.log(`Found ${students.length} students with "Pooja" in name:`);

    for (const student of students) {
      console.log(`\n----------------------------------------`);
      console.log(`Name: ${student.fullName}`);
      console.log(`ID: ${student._id}`);
      console.log(`Class: ${student.class ? student.class.name : 'N/A'} (ID: ${student.class ? student.class._id : 'N/A'})`);
      console.log(`Roll: ${student.rollNumber}`);
      console.log(`transportMode: ${student.transportMode}`);
      console.log(`transportFee: ${student.transportFee}`);

      const ledger = await FeeLedger.findOne({ studentId: student._id, academicYear: '2026-2027' });
      if (ledger) {
        console.log(`Ledger found for 2026-2027:`);
        ledger.monthlyFees.forEach(m => {
          if (['July', 'August', 'September'].includes(m.month)) {
            console.log(`  - ${m.month}: tuitionAmount=${m.amount}, tuitionPaid=${m.paidAmount}, tuitionStatus=${m.status} | transportAmount=${m.transportAmount}, transportPaidAmount=${m.transportPaidAmount}, transportStatus=${m.transportStatus}`);
          }
        });
      } else {
        console.log('No ledger found!');
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
