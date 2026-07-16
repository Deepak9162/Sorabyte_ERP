const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Student = require('../models/Student');
const FeeLedger = require('../models/FeeLedger');
const Class = require('../models/Class');

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/little_flower_school_erp');
    console.log("Connected to DB.");

    const classes = await Class.find({});
    console.log("All Classes in DB:");
    classes.forEach(c => console.log(`- Name: ${c.name}, ID: ${c._id}`));

    const student = await Student.findOne({ fullName: /Pooja/i });
    if (!student) {
      console.log("Student containing Pooja not found");
      process.exit(0);
    }

    console.log("Student details:", {
      id: student._id,
      fullName: student.fullName,
      rollNumber: student.rollNumber,
      admissionDate: student.admissionDate,
      createdAt: student.createdAt,
      status: student.status,
      session: student.session
    });

    const FeeLedger = require('../models/FeeLedger');
    const feeService = require('../services/feeService');

    await FeeLedger.deleteMany({ studentId: student._id });
    console.log("Deleted existing fee ledger for Pooja Kumar");

    const details = await feeService.getStudentFeeDetails(student.class, student.rollNumber);
    console.log("Recreated ledger info:", {
      academicYear: details.ledger.academicYear,
      totalFee: details.feeSummary.totalFee,
      paidFee: details.feeSummary.paidFee,
      dueFee: details.feeSummary.dueFee
    });
    console.log("Recreated Breakdown:");
    details.ledger.monthlyBreakdown.forEach(m => {
      console.log(`- ${m.month}: amount=${m.amount}, status=${m.status}, transportAmount=${m.transportAmount}, transportStatus=${m.transportStatus}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
