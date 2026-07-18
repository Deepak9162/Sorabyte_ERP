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

    const students = await Student.find({ fullName: /Aditya/i }).populate('class');
    console.log(`Found ${students.length} students matching "Aditya":`);

    for (const student of students) {
      console.log(`\n----------------------------------------`);
      console.log('fullName:', student.fullName);
      console.log('admissionNumber:', student.admissionNumber);
      console.log('studentId:', student.studentId);
      console.log('rollNumber:', student.rollNumber);
      console.log('fatherName:', student.fatherName);
      console.log('phone:', student.phone);
      console.log('section:', student.section);
      console.log('class:', student.class ? student.class.name : 'N/A');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
