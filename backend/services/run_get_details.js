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

    const student = await Student.findOne({ fullName: 'Ankit Kumari' }).populate('class');
    const academicYear = '2026-2027';
    const studentAdmissionDate = student.admissionDate || student.createdAt || null;
    const startYear = parseInt(academicYear.split('-')[0]);

    const monthMapping = {
      'April': { idx: 3, offset: 0 },
      'May': { idx: 4, offset: 0 },
      'June': { idx: 5, offset: 0 },
      'July': { idx: 6, offset: 0 },
      'August': { idx: 7, offset: 0 },
      'September': { idx: 8, offset: 0 },
      'October': { idx: 9, offset: 0 },
      'November': { idx: 10, offset: 0 },
      'December': { idx: 11, offset: 0 },
      'January': { idx: 0, offset: 1 },
      'February': { idx: 1, offset: 1 },
      'March': { idx: 2, offset: 1 }
    };

    console.log(`Student Admission Date: ${studentAdmissionDate}`);
    console.log(`Start Year: ${startYear}`);

    const admDate = new Date(studentAdmissionDate);
    const admYear = admDate.getFullYear();
    const admMonth = admDate.getMonth(); // 0-indexed
    console.log(`admYear: ${admYear}, admMonth (0-indexed): ${admMonth}`);

    const months = Object.keys(monthMapping);
    months.forEach(month => {
      const mapping = monthMapping[month];
      const monthYear = startYear + mapping.offset;
      const monthIdx = mapping.idx;

      let shouldBeExempted = false;
      if (studentAdmissionDate && !isNaN(startYear)) {
        if (monthYear < admYear || (monthYear === admYear && monthIdx < admMonth)) {
          shouldBeExempted = true;
        }
      }
      console.log(`Month: ${month.padEnd(10)} | MonthYear: ${monthYear} | MonthIdx: ${monthIdx} | shouldBeExempted: ${shouldBeExempted}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
