const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fs = require('fs');

const connectDB = require('../utils/db');
const Exam = require('../models/Exam');
const marksheetService = require('../services/marksheetService');
const { compileBulkClassMarksheetPdf } = require('../utils/marksheetPdfCompiler');

const testBulkPdf = async () => {
  try {
    await connectDB();
    console.log('DB connected');

    const exam = await Exam.findOne({ name: /Annual/i });
    if (!exam) {
      console.log('No annual exam found');
      process.exit(1);
    }

    const studentsData = await marksheetService.getBulkClassMarksheetData(exam.class, exam._id);
    console.log(`Fetched bulk data for ${studentsData.length} students`);

    const outPath = path.join(__dirname, 'test_bulk_class_marksheets.pdf');
    const outStream = fs.createWriteStream(outPath);

    await compileBulkClassMarksheetPdf(studentsData, outStream);
    console.log(`Bulk PDF compiled successfully to ${outPath} (Size: ${fs.statSync(outPath).size} bytes)`);

    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
};

testBulkPdf();
