const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Class = require('../models/Class');
const feeService = require('../services/feeService');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB.");
    const Student = require('../models/Student');
    const Class = require('../models/Class');
    const FeeLedger = require('../models/FeeLedger');
    const feeService = require('../services/feeService');

    const student = await Student.findOne({ fullName: "Vivek Kumari" });
    if (student) {
      await FeeLedger.deleteMany({ studentId: student._id });
      console.log("Deleted existing fee ledgers for Vivek Kumari");

      const classId = student.class.toString();
      const details = await feeService.getStudentFeeDetails(classId, student.rollNumber);
      console.log("Clean reconstructed ledger monthly breakdown transport details:");
      console.log(details.ledger.monthlyBreakdown.map(m => `${m.month}: amount=${m.amount}, transportAmount=${m.transportAmount}, transportStatus=${m.transportStatus}`));
    } else {
      console.log("Vivek Kumari not found");
    }
    process.exit(0);

    console.log("Manual query student:", studentManual);

    // Try feeService query
    console.log("Calling getStudentFeeDetails...");
    const details = await feeService.getStudentFeeDetails(classId, rollNumber);
    console.log("Details returned:", details);

    process.exit(0);
  } catch (error) {
    console.error("Error in test script:", error);
    process.exit(1);
  }
};

run();
