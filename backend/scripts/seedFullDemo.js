const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Class = require('../models/Class');
const FeeTransaction = require('../models/FeeTransaction');
const Attendance = require('../models/Attendance');
const logger = require('../utils/logger');

const seedFullDemo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('Connected to MongoDB for Full Demo Seeding...');

    // Clear Existing
    await User.deleteMany({});
    await Teacher.deleteMany({});
    await Student.deleteMany({});
    await Class.deleteMany({});
    await FeeTransaction.deleteMany({});
    await Attendance.deleteMany({});

    // 1. Admin
    const adminUser = await User.create({
      name: 'Sorabyte Administrator',
      email: 'admin@lfes.com',
      password: 'password123',
      role: 'admin',
    });

    // 2. Teachers
    const teacherData = [
      { name: 'Dr. Ramesh Kumar', email: 'ramesh@lfes.com', subject: 'Mathematics' },
      { name: 'Mrs. Sunita Sharma', email: 'sunita@lfes.com', subject: 'English' },
      { name: 'Mr. Arvind Singh', email: 'arvind@lfes.com', subject: 'Science' },
      { name: 'Ms. Priya Verma', email: 'priya@lfes.com', subject: 'History' },
      { name: 'Mr. Rajesh Khanna', email: 'rajesh@lfes.com', subject: 'Computers' },
    ];

    const teachers = [];
    for (const t of teacherData) {
      const user = await User.create({
        name: t.name,
        email: t.email,
        password: 'password123',
        role: 'teacher'
      });
      
      const profile = await Teacher.create({
        firstName: t.name.split(' ')[1],
        lastName: t.name.split(' ')[2] || '',
        email: t.email,
        phone: '987654321' + Math.floor(Math.random() * 9),
        subject: t.subject,
        qualification: 'Master Degree',
        user: user._id
      });
      teachers.push({ user, profile });
    }

    // 3. Classes
    const classNames = ['1-A', '2-B', '5-A', '8-C', '10-A', '11-B', '12-C'];
    const createdClasses = [];
    
    for (let i = 0; i < classNames.length; i++) {
        const cls = await Class.create({
            name: classNames[i],
            teacher: teachers[i % teachers.length].profile._id,
            tuitionFee: 15000 + (i * 2000),
            section: 'A-Block'
        });
        createdClasses.push(cls);
    }

    // 4. Students
    const firstNames = ['Aarav', 'Ishani', 'Rohan', 'Ananya', 'Vihaan', 'Saanvi', 'Arjun', 'Diya', 'Reyansh', 'Myra'];
    const lastNames = ['Patel', 'Gupta', 'Mehta', 'Singh', 'Shah', 'Iyer', 'Reddy', 'Kapoor', 'Verma', 'Chopra'];

    const allStudents = [];
    for (let i = 0; i < 30; i++) {
        const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const cls = createdClasses[Math.floor(Math.random() * createdClasses.length)];
        
        const student = await Student.create({
            firstName: fName,
            lastName: lName,
            email: `${fName.toLowerCase()}${i}@lfes.com`,
            grade: cls.name.split('-')[0],
            class: cls._id,
            rollNumber: (100 + i).toString(),
            parentName: 'Parent of ' + fName,
            parentPhone: '998877665' + (i % 10),
        });
        allStudents.push(student);
        
        // Update class
        await Class.findByIdAndUpdate(cls._id, { $push: { students: student._id } });

        // Add 2 initial transactions for each student (one paid, one pending)
        await FeeTransaction.create([
            {
                student: student._id,
                amount: 5000,
                type: 'Admission Fee',
                status: 'Paid',
                paymentDate: new Date(),
                dueDate: new Date(),
                transactionId: `TXN-ADM-${i}`,
                receiptNumber: `REC-ADM-${i}`,
                month: 'April',
                academicYear: '2025-26'
            },
            {
                student: student._id,
                amount: cls.tuitionFee,
                type: 'Tuition Fee',
                status: 'Pending',
                dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
                month: 'May',
                academicYear: '2025-26'
            }
        ]);
    }

    logger.info('Full Demo Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Seeding Error:', error);
    process.exit(1);
  }
};

seedFullDemo();
