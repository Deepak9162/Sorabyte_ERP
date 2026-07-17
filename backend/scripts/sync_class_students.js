const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Class = require('../models/Class');
const Student = require('../models/Student');

async function syncClassStudents() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/little_flower_school_erp');
    console.log("Connected to Database successfully.");

    const classes = await Class.find({});
    console.log(`Found ${classes.length} classes. Starting synchronization...\n`);

    for (const c of classes) {
      // Find all active students registered under this class in the Student collection
      const activeStudents = await Student.find({ class: c._id, status: 'Active' });
      const activeStudentIds = activeStudents.map(s => s._id);

      console.log(`Class: ${c.name}`);
      console.log(`  - Old student count in array: ${c.students ? c.students.length : 0}`);
      console.log(`  - New dynamic active student count: ${activeStudentIds.length}`);

      // Set the class's students array directly to these student IDs
      c.students = activeStudentIds;
      await c.save();

      console.log(`  - Successfully synced Class "${c.name}"`);
      console.log("-----------------------------------------");
    }

    console.log("Database synchronization completed successfully.");

  } catch (err) {
    console.error("Error during synchronization:", err);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

syncClassStudents();
