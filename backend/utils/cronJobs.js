const cron = require('node-cron');
const Teacher = require('../models/Teacher');
const StaffAttendance = require('../models/StaffAttendance');
const logger = require('./logger');

const startCronJobs = () => {
  // Run every day at 12:00 PM (noon)
  cron.schedule('0 12 * * *', async () => {
    try {
      logger.info('Running cron job: Marking absent teachers...');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get all active teachers
      const activeTeachers = await Teacher.find({ isActive: true });

      let absentCount = 0;
      for (const teacher of activeTeachers) {
        // Check if attendance is already marked for today
        const existing = await StaffAttendance.findOne({
          teacher: teacher._id,
          date: today
        });

        // If no record exists, mark as Absent
        if (!existing) {
          await StaffAttendance.create({
            teacher: teacher._id,
            date: today,
            status: 'Absent',
            remarks: 'Auto-marked absent by system (did not mark before 12:00 PM)'
          });
          absentCount++;
        }
      }

      logger.info(`Cron job finished: Marked ${absentCount} teachers as Absent.`);
    } catch (error) {
      logger.error('Error in cron job (Auto-absent):', error);
    }
  });
};

module.exports = startCronJobs;
