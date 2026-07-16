const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const feeService = require('../services/feeService');
const FeeTransaction = require('../models/FeeTransaction');
const Student = require('../models/Student');
const Class = require('../models/Class');

const testReceipt = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB...');

    // 1. Create a mock class
    let cls = await Class.findOne({ name: '5-D' });
    if (!cls) {
        cls = await Class.create({
            name: '5-D',
            teacher: new mongoose.Types.ObjectId(), // dummy teacher
            tuitionFee: 50000
        });
    }

    // 2. Retrieve an existing student
    const student = await Student.findOne();
    if (!student) {
        throw new Error('No students found in database to run receipt test.');
    }

    // 3. Create a mock transaction
    await FeeTransaction.deleteMany({ receiptNumber: 'SCH-2026-TEST-001' });
    const transaction = await FeeTransaction.create({
        student: student._id,
        amount: 125000, // Testing Lakhs
        type: 'Tuition',
        status: 'Paid',
        paymentDate: new Date(),
        dueDate: new Date(),
        receiptNumber: 'SCH-2026-TEST-001',
        remarks: 'Test receipt generation',
        academicYear: '2026-2027',
        month: 'May'
    });

    console.log('Created mock transaction:', transaction.receiptNumber);

    // 4. Generate PDF
    const outPath = path.join(__dirname, '../test_receipt_fixed.pdf');
    const outStream = fs.createWriteStream(outPath);
    
    await feeService.generateFeeReceiptPDF(transaction._id, outStream);
    
    outStream.on('finish', () => {
        console.log('PDF generated successfully at:', outPath);
        process.exit(0);
    });

  } catch (error) {
    console.error('Error testing receipt:', error);
    process.exit(1);
  }
};

testReceipt();
