const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

// Import all models
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Class = require('../models/Class');
const FeeTransaction = require('../models/FeeTransaction');
const FeeLedger = require('../models/FeeLedger');
const Attendance = require('../models/Attendance');
const Subject = require('../models/Subject');
const ClassSubject = require('../models/ClassSubject');
const Timetable = require('../models/Timetable');
const Counter = require('../models/Counter');
const StaffAttendance = require('../models/StaffAttendance');

// Helper function to clear files in directory while keeping directory structure and .gitkeep
const clearDirectory = (dirPath) => {
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    let deletedCount = 0;
    for (const file of files) {
      if (file === '.gitkeep') continue;
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isFile()) {
        try {
          fs.unlinkSync(curPath);
          deletedCount++;
        } catch (err) {
          console.error(`Error deleting file ${file}:`, err);
        }
      }
    }
    console.log(`Cleared ${deletedCount} files from directory: ${dirPath}`);
  } else {
    console.log(`Directory does not exist, skipping: ${dirPath}`);
  }
};

const cleanupData = async () => {
  try {
    // 1. Connect to Database
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI not found in .env');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for cleanup...');

    // 2. Clear All Collections
    await Promise.all([
      User.deleteMany({}),
      Teacher.deleteMany({}),
      Student.deleteMany({}),
      Class.deleteMany({}),
      FeeTransaction.deleteMany({}),
      FeeLedger.deleteMany({}),
      Attendance.deleteMany({}),
      StaffAttendance.deleteMany({}),
      Subject.deleteMany({}),
      ClassSubject.deleteMany({}),
      Timetable.deleteMany({}),
      Counter.deleteMany({}),
    ]);
    console.log('Cleared all school ERP database collections.');

    // 3. Clear Uploaded Files (QR codes and PDF receipts)
    clearDirectory(path.join(__dirname, '../uploads/students'));
    clearDirectory(path.join(__dirname, '../uploads/receipts'));

    // 4. Recreate Default Admin
    // This ensures the user can still log in after cleanup
    const adminUser = await User.create({
      name: 'Sorabyte Administrator',
      email: 'admin@lfes.com',
      password: 'password123',
      role: 'admin',
    });
    console.log('Recreated default admin: admin@lfes.com / password123');

    console.log('Cleanup complete. System is fresh!');
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
};

cleanupData();
