const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Student = require('../models/Student');
const FeeLedger = require('../models/FeeLedger');

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/little_flower_school_erp');
    console.log("Connected to DB.");

    const students = await Student.find({ class: '6a2312314a07ad2f4507e84b' });
    console.log(`Found ${students.length} students in Class 6.`);

    const feeService = require('../services/feeService');

    for (const student of students) {
      const details = await feeService.getStudentFeeDetails(student.class, student.rollNumber, '2026-2027');
      console.log(`Student: ${student.fullName} (Roll: ${student.rollNumber})`);
      console.log(`- Ledger: totalFee=${details.feeSummary.totalFee}, paidFee=${details.feeSummary.paidFee}, dueFee=${details.feeSummary.dueFee}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
