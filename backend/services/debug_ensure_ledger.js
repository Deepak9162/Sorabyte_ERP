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
    const tuitionFee = student.class.tuitionFee || 0;
    const studentId = student._id;

    console.log(`Student Class Tuition Fee: ${tuitionFee}`);

    let ledger = await FeeLedger.findOne({ studentId, academicYear });
    if (!ledger) {
      console.log('No ledger found!');
      process.exit(1);
    }

    const discount = student.discountPercentage || 0;
    const finalTuitionFee = Math.round(tuitionFee * (1 - (discount / 100)));
    const studentAdmissionDate = student.admissionDate || student.createdAt || null;
    const hasSchoolBus = student.transportMode === 'School Bus';
    const startYear = parseInt(academicYear.split('-')[0]);

    console.log(`discount: ${discount}`);
    console.log(`finalTuitionFee: ${finalTuitionFee}`);
    console.log(`studentAdmissionDate: ${studentAdmissionDate}`);
    console.log(`hasSchoolBus: ${hasSchoolBus}`);
    console.log(`startYear: ${startYear}`);

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

    let modified = false;

    ledger.monthlyFees.forEach(m => {
      let shouldBeExempted = false;

      if (studentAdmissionDate && !isNaN(startYear)) {
        const mapping = monthMapping[m.month];
        const monthYear = startYear + mapping.offset;
        const monthIdx = mapping.idx;

        const admDate = new Date(studentAdmissionDate);
        const admYear = admDate.getFullYear();
        const admMonth = admDate.getMonth(); // 0-indexed

        if (monthYear < admYear || (monthYear === admYear && monthIdx < admMonth)) {
          shouldBeExempted = true;
        }
      }

      console.log(`\nMonth: ${m.month} | shouldBeExempted: ${shouldBeExempted}`);
      console.log(`Before: status=${m.status}, amount=${m.amount}, transportStatus=${m.transportStatus}, transportAmount=${m.transportAmount}`);

      if (shouldBeExempted) {
        if (m.status !== 'EXEMPTED' || m.transportStatus !== 'EXEMPTED') {
          console.log(`-> Exempting month`);
          m.status = 'EXEMPTED';
          m.amount = 0;
          m.paidAmount = 0;
          m.transportStatus = 'EXEMPTED';
          m.transportAmount = 0;
          m.transportPaidAmount = 0;
          modified = true;
        }
      } else {
        if (m.status === 'EXEMPTED') {
          console.log(`-> Unexempting tuition`);
          m.status = 'UNPAID';
          m.amount = finalTuitionFee;
          m.paidAmount = 0;
          modified = true;
        } else {
          if (m.status === 'UNPAID' && m.amount !== finalTuitionFee) {
            console.log(`-> Updating tuition amount from ${m.amount} to ${finalTuitionFee}`);
            m.amount = finalTuitionFee;
            modified = true;
          }
        }

        if (hasSchoolBus) {
          const expectedTransportFee = student.transportFee !== undefined ? student.transportFee : 500;
          if (m.transportStatus === 'EXEMPTED') {
            console.log(`-> Unexempting transport`);
            m.transportStatus = 'UNPAID';
            m.transportAmount = expectedTransportFee;
            m.transportPaidAmount = 0;
            modified = true;
          } else if (m.transportStatus === 'UNPAID' && m.transportAmount !== expectedTransportFee) {
            console.log(`-> Updating transport amount from ${m.transportAmount} to ${expectedTransportFee}`);
            m.transportAmount = expectedTransportFee;
            modified = true;
          }
        } else {
          if (m.transportStatus !== 'EXEMPTED') {
            console.log(`-> Exempting transport`);
            m.transportStatus = 'EXEMPTED';
            m.transportAmount = 0;
            m.transportPaidAmount = 0;
            modified = true;
          }
        }
      }
      console.log(`After: status=${m.status}, amount=${m.amount}, transportStatus=${m.transportStatus}, transportAmount=${m.transportAmount}`);
    });

    console.log(`\nModified: ${modified}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
