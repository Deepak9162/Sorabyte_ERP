const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const Timetable = require('../models/Timetable');
const ClassSubject = require('../models/ClassSubject');

const seedTimetableAndSubjects = async () => {
  console.log('Starting rich Timetable & Subjects seeding script...');
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB...');

    // 1. Create standard subjects
    const subjectTemplates = [
      { name: 'Mathematics' },
      { name: 'English' },
      { name: 'Science' },
      { name: 'History' },
      { name: 'Computers' }
    ];

    const subjects = [];
    for (const t of subjectTemplates) {
      let sub = await Subject.findOne({ name: t.name });
      if (!sub) {
        sub = await Subject.create(t);
        console.log(`Created Subject: ${t.name}`);
      } else {
        console.log(`Subject already exists: ${t.name}`);
      }
      subjects.push(sub);
    }

    // 2. Fetch existing Teachers
    const teachers = await Teacher.find({});
    if (teachers.length === 0) {
      console.error('No teachers found in database. Please run seedFullDemo.js first.');
      process.exit(1);
    }
    console.log(`Found ${teachers.length} teachers in database.`);

    // 3. Map teachers to subjects (Map based on teacher's subject field)
    const teacherMap = {};
    for (const teacher of teachers) {
      const matchingSub = subjects.find(s => s.name.toLowerCase() === (teacher.subject || '').toLowerCase()) 
        || subjects.find(s => (teacher.subject || '').toLowerCase().includes(s.name.toLowerCase()))
        || subjects[0]; // fallback
      teacherMap[matchingSub._id.toString()] = teacher._id;
    }

    // 4. Fetch existing Classes
    const classes = await Class.find({});
    if (classes.length === 0) {
      console.error('No classes found in database. Please run seedFullDemo.js first.');
      process.exit(1);
    }
    console.log(`Found ${classes.length} classes in database.`);

    // 5. Create Class-Subject Mappings & Timetables
    await ClassSubject.deleteMany({});
    await Timetable.deleteMany({});
    console.log('Cleared existing ClassSubject mappings and Timetables.');

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const slotTimes = [
      { start: "08:00 AM", end: "09:00 AM" },
      { start: "09:00 AM", end: "10:00 AM" },
      { start: "10:00 AM", end: "10:30 AM", isBreak: true, label: "Recess Break" },
      { start: "10:30 AM", end: "11:30 AM" },
      { start: "11:30 AM", end: "12:30 PM" }
    ];

    for (const cls of classes) {
      console.log(`Processing class: ${cls.name}`);

      // Create mapping for all 5 subjects for this class
      for (let i = 0; i < subjects.length; i++) {
        const sub = subjects[i];
        const teacherId = teacherMap[sub._id.toString()] || teachers[i % teachers.length]._id;

        await ClassSubject.create({
          class: cls._id,
          subject: sub._id,
          teacher: teacherId,
          sessionsPerWeek: 5
        });
      }

      // Generate rich weekly schedule
      const weeklySchedule = days.map((day, dayIdx) => {
        const slots = slotTimes.map((time, slotIdx) => {
          if (time.isBreak) {
            return {
              startTime: time.start,
              endTime: time.end,
              type: "Break",
              label: time.label
            };
          } else {
            // Cycle through subjects
            const subIdx = (dayIdx + slotIdx) % subjects.length;
            const sub = subjects[subIdx];
            const teacherId = teacherMap[sub._id.toString()] || teachers[subIdx % teachers.length]._id;
            
            return {
              startTime: time.start,
              endTime: time.end,
              subject: sub._id,
              teacher: teacherId,
              type: "Theory"
            };
          }
        });

        return { day, slots };
      });

      // Create Timetable for this class
      await Timetable.create({
        class: cls._id,
        academicYear: '2026',
        semester: 'Annual Term',
        weeklySchedule,
        isActive: true
      });
      console.log(`Seeded Timetable for ${cls.name} (Annual Term) successfully.`);
    }

    console.log('Rich Timetable & Subject Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed with error:', error);
    process.exit(1);
  }
};

seedTimetableAndSubjects();
