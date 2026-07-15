const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const StaffAttendance = require('../models/StaffAttendance');
const Teacher = require('../models/Teacher');
const User = require('../models/User');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Fetch all teachers
    const teachers = await Teacher.find({});
    console.log('\n--- ALL TEACHERS ---');
    teachers.forEach(t => {
      console.log(`ID: ${t._id} | Name: ${t.firstName} ${t.lastName} | Email: ${t.email} | User: ${t.user}`);
    });

    // Fetch all staff attendance records
    const attendance = await StaffAttendance.find().populate('teacher', 'firstName lastName');
    console.log('\n--- STAFF ATTENDANCE RECORDS ---');
    attendance.forEach(a => {
      console.log(`ID: ${a._id} | Date: ${a.date.toISOString()} | Status: ${a.status} | Teacher: ${a.teacher ? `${a.teacher.firstName} ${a.teacher.lastName} (${a.teacher._id})` : 'NULL'}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
};

run();
