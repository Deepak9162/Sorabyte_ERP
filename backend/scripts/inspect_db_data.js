require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const connectDB = require('../utils/db');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Exam = require('../models/Exam');
const Subject = require('../models/Subject');

async function inspectData() {
  await connectDB();
  console.log('--- DB INSPECTION ---');

  const classes = await Class.find().select('name section').lean();
  console.log(`Total Classes: ${classes.length}`);

  const studentCounts = await Student.aggregate([
    { $group: { _id: '$class', count: { $sum: 1 } } }
  ]);

  for (const item of studentCounts) {
    if (item._id) {
      const cls = classes.find(c => c._id.toString() === item._id.toString());
      console.log(`Class: ${cls ? `${cls.name} (Section: ${cls.section || 'N/A'})` : item._id} -> ${item.count} students`);
    }
  }

  const exams = await Exam.find().populate('class', 'name section').lean();
  console.log(`\nTotal Exams in DB: ${exams.length}`);
  exams.forEach(e => {
    console.log(`- Exam: "${e.name}" | Type: ${e.examType} | Session: ${e.session} | Class: ${e.class ? `${e.class.name} (${e.class.section})` : 'N/A'} | Status: ${e.status}`);
  });

  const subjects = await Subject.find().select('name code type').lean();
  console.log(`\nTotal Subjects: ${subjects.length}`);
  subjects.forEach(s => {
    console.log(`- Subject: "${s.name}" (Code: ${s.code || 'N/A'}, Type: ${s.type})`);
  });

  process.exit(0);
}

inspectData();
