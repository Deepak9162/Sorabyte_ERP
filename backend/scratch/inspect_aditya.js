const mongoose = require('mongoose');
const path = require('path');
const Class = require('../models/Class');
const Student = require('../models/Student');

async function run() {
  try {
    const dotenvPath = path.resolve(__dirname, '../.env');
    require('dotenv').config({ path: dotenvPath });

    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/little_flower_school_erp';
    await mongoose.connect(mongoUri);

    const student = await Student.findOne({ fullName: /Aaditya Kumar/i });
    if (!student) {
      console.log('Student not found!');
      process.exit(1);
    }

    console.log('Aaditya Kumar database document:');
    console.log('fullName:', student.fullName);
    console.log('className:', student.className);
    console.log('status:', student.status);

    const allNur = await Student.find({ className: /Nur/i });
    console.log(`\nFound ${allNur.length} Nur students:`);
    allNur.forEach(s => {
      console.log(`- ${s.fullName}: status = ${s.status}, className = ${s.className}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
