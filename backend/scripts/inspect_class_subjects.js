const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const connectDB = require('../utils/db');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const ClassSubject = require('../models/ClassSubject');

const inspect = async () => {
  try {
    await connectDB();

    const classes = await Class.find({}).select('name section').lean();
    console.log('\n=== All Classes ===');
    classes.forEach(c => console.log(' -', c._id, c.name, c.section || ''));

    const allSubjects = await Subject.find({}).select('name type').lean();
    console.log('\n=== All Subjects ===');
    allSubjects.forEach(s => console.log(' -', s._id, s.name, s.type || ''));

    const mappings = await ClassSubject.find({})
      .populate('subject', 'name')
      .populate('class', 'name section')
      .lean();
    console.log('\n=== All Class-Subject Mappings ===', mappings.length, 'total');
    mappings.forEach(m => {
      const cls = m.class ? `${m.class.name} ${m.class.section || ''}`.trim() : 'N/A';
      const sub = m.subject ? m.subject.name : 'N/A';
      console.log(` - ${cls} -> ${sub} (maxMarks: ${m.maxMarks}, passMarks: ${m.passMarks})`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

inspect();
