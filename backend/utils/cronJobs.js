const cron = require('node-cron');
const logger = require('./logger');
const attendanceService = require('../services/attendanceService');

const startCronJobs = () => {
  // Run every day at 12:00 PM (noon)
  cron.schedule('0 12 * * *', async () => {
    try {
      logger.info('Running cron job: Marking absent teachers...');
      const today = new Date();
      await attendanceService.syncAutoAbsentTeachers(today);
      logger.info('Cron job finished: Auto-absent sync complete.');
    } catch (error) {
      logger.error('Error in cron job (Auto-absent):', error);
    }
  });
};

module.exports = startCronJobs;
