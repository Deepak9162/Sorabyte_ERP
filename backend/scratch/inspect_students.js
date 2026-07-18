const mongoose = require('mongoose');
const path = require('path');
const Student = require('../models/Student');
const FeeLedger = require('../models/FeeLedger');

async function run() {
  try {
    const dotenvPath = path.resolve(__dirname, '../.env');
    require('dotenv').config({ path: dotenvPath });

    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/little_flower_school_erp';
    console.log('Connecting to Mongo at:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    // Count of students
    const totalStudents = await Student.countDocuments();
    console.log('Total students in DB:', totalStudents);

    // Group by transportMode
    const transportModes = await Student.aggregate([
      { $group: { _id: '$transportMode', count: { $sum: 1 } } }
    ]);
    console.log('Transport modes found in Student collection:', transportModes);

    // Let\'s find students whose transportMode is \'School Bus\'
    const schoolBusStudents = await Student.find({ transportMode: 'School Bus' });
    console.log('Count of School Bus students:', schoolBusStudents.length);

    // Find sample student details
    if (schoolBusStudents.length > 0) {
      console.log('Sample School Bus students (first 5):');
      schoolBusStudents.slice(0, 5).forEach(s => {
        console.log(`- ID: ${s._id}, Name: ${s.fullName}, Roll: ${s.rollNumber}, transportMode: ${s.transportMode}, transportFee: ${s.transportFee}`);
      });
    }

    // Check if there are other spelling variations or lowercase versions in transportMode
    const allStudents = await Student.find({});
    const caseVariations = {};
    allStudents.forEach(s => {
      if (s.transportMode) {
        const lower = s.transportMode.toLowerCase();
        if (!caseVariations[lower]) caseVariations[lower] = [];
        if (!caseVariations[lower].includes(s.transportMode)) {
          caseVariations[lower].push(s.transportMode);
        }
      } else {
        if (!caseVariations['undefined']) caseVariations['undefined'] = 0;
        caseVariations['undefined']++;
      }
    });
    console.log('Transport mode variations:', caseVariations);

    // Check FeeLedgers for transport amount mismatch
    const ledgers = await FeeLedger.find({}).populate('studentId');
    console.log('Total Fee Ledgers:', ledgers.length);

    const transportStatusCount = {};
    let mismatchCount = 0;
    ledgers.forEach(l => {
      l.monthlyFees.forEach(m => {
        const status = m.transportStatus;
        transportStatusCount[status] = (transportStatusCount[status] || 0) + 1;
        
        // If student is School Bus, check transportAmount in ledger
        const student = l.studentId;
        if (student && student.transportMode === 'School Bus') {
          const expected = student.transportFee !== undefined ? student.transportFee : 500;
          if (m.transportStatus !== 'EXEMPTED' && m.transportAmount !== expected) {
            mismatchCount++;
          }
        }
      });
    });
    console.log('Transport status counts in ledgers:', transportStatusCount);
    console.log('Ledger months with transport fee mismatches compared to student transportFee:', mismatchCount);

    process.exit(0);
  } catch (err) {
    console.error('Error running diagnostic:', err);
    process.exit(1);
  }
}

run();
