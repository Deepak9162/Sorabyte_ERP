const mongoose = require('mongoose');
const path = require('path');
const Class = require('../models/Class');
const Student = require('../models/Student');
const FeeLedger = require('../models/FeeLedger');

async function testFix() {
  try {
    const dotenvPath = path.resolve(__dirname, '../.env');
    require('dotenv').config({ path: dotenvPath });

    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/little_flower_school_erp';
    await mongoose.connect(mongoUri);

    const schoolBusStudents = await Student.find({ transportMode: 'School Bus' }).populate('class');
    const academicYear = '2026-2027';

    console.log('--- RUNNING LEDGER SYNC TEST ---');

    for (const student of schoolBusStudents) {
      console.log(`\nStudent: ${student.fullName}`);
      const ledger = await FeeLedger.findOne({ studentId: student._id, academicYear });
      if (!ledger) {
        console.log('No ledger found!');
        continue;
      }

      console.log('Before fix (July to Sept):');
      ledger.monthlyFees.forEach(m => {
        if (['July', 'August', 'September'].includes(m.month)) {
          console.log(`  - ${m.month}: tuitionStatus=${m.status} | transportAmount=${m.transportAmount}, transportPaidAmount=${m.transportPaidAmount}, transportStatus=${m.transportStatus}`);
        }
      });

      // Simulation of fixed ensureFeeLedger logic
      const discount = student.discountPercentage || 0;
      const tuitionFee = student.class.tuitionFee || 0;
      const finalTuitionFee = Math.round(tuitionFee * (1 - (discount / 100)));
      const studentAdmissionDate = student.admissionDate || student.createdAt || null;
      const hasSchoolBus = student.transportMode === 'School Bus';
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

        if (shouldBeExempted) {
          if (m.status !== 'EXEMPTED' || m.transportStatus !== 'EXEMPTED') {
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
            m.status = 'UNPAID';
            m.amount = finalTuitionFee;
            m.paidAmount = 0;
            modified = true;
          } else {
            if (m.status === 'UNPAID' && m.amount !== finalTuitionFee) {
              m.amount = finalTuitionFee;
              modified = true;
            }
          }

          // Sync Transport (Fixed Logic)
          if (hasSchoolBus) {
            const expectedTransportFee = student.transportFee !== undefined ? student.transportFee : 500;
            if (m.transportStatus === 'EXEMPTED') {
              m.transportStatus = 'UNPAID';
              m.transportAmount = expectedTransportFee;
              m.transportPaidAmount = 0;
              modified = true;
            } else if (m.transportStatus === 'UNPAID' && m.transportAmount !== expectedTransportFee) {
              m.transportAmount = expectedTransportFee;
              modified = true;
            } else if (m.transportStatus === 'PAID' && m.transportPaidAmount === 0 && expectedTransportFee > 0) {
              // If it was marked PAID simply because transportAmount was 0, but now there is an expected fee:
              m.transportStatus = 'UNPAID';
              m.transportAmount = expectedTransportFee;
              m.transportPaidAmount = 0;
              modified = true;
            } else if (m.transportStatus === 'PARTIAL' && m.transportAmount !== expectedTransportFee) {
              m.transportAmount = expectedTransportFee;
              modified = true;
            }
          } else {
            if (m.transportStatus !== 'EXEMPTED') {
              m.transportStatus = 'EXEMPTED';
              m.transportAmount = 0;
              m.transportPaidAmount = 0;
              modified = true;
            }
          }
        }
      });

      if (modified) {
        console.log('-> Ledger modified. Running pre-save calculation and saving...');
        // Run the pre-save hook calculation logic manually for logging
        ledger.monthlyFees.forEach(month => {
          if (month.transportStatus === "EXEMPTED") {
            month.transportAmount = 0;
            month.transportPaidAmount = 0;
          } else if (month.transportPaidAmount >= month.transportAmount) {
            month.transportStatus = "PAID";
          } else if (month.transportPaidAmount > 0) {
            month.transportStatus = "PARTIAL";
          } else {
            month.transportStatus = "UNPAID";
          }
        });
        
        ledger.totalFee = ledger.monthlyFees.reduce((acc, curr) => acc + curr.amount + (curr.transportAmount || 0), 0);
        ledger.totalPaid = ledger.monthlyFees.reduce((acc, curr) => acc + (curr.paidAmount || 0) + (curr.transportPaidAmount || 0), 0);
        ledger.pendingAmount = ledger.totalFee - ledger.totalPaid;
        
        console.log('After simulation:');
        ledger.monthlyFees.forEach(m => {
          if (['July', 'August', 'September'].includes(m.month)) {
            console.log(`  - ${m.month}: tuitionStatus=${m.status} | transportAmount=${m.transportAmount}, transportPaidAmount=${m.transportPaidAmount}, transportStatus=${m.transportStatus}`);
          }
        });
        console.log(`New Totals - TotalFee: ${ledger.totalFee}, TotalPaid: ${ledger.totalPaid}, Pending: ${ledger.pendingAmount}`);
      } else {
        console.log('-> No modification needed.');
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testFix();
