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

    for (const student of students) {
      // Set session to 2026-2027
      student.session = '2026-2027';
      
      if (student.fullName === 'Vivek Kumari') {
        student.admissionDate = new Date('2026-04-01');
      } else {
        student.admissionDate = new Date('2026-07-15');
      }

      await student.save();
      
      // Delete existing ledger to force recreation for the correct session 2025-2026
      await FeeLedger.deleteMany({ studentId: student._id });
      console.log(`Updated Student: ${student.fullName} (Roll: ${student.rollNumber}) to session 2025-2026 and cleared old ledgers.`);
    }

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
