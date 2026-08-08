const cron = require('node-cron');
const logger = require('./logger');
const attendanceService = require('../services/attendanceService');
const extendedAbsenceService = require('../services/extendedAbsenceService');

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

  // Run every day at 12:30 PM (noon) for Student Extended Absence Notifications
  cron.schedule('30 12 * * *', async () => {
    try {
      logger.info('Running cron job: Evaluating student extended absence alerts...');
      const result = await extendedAbsenceService.evaluateAndTriggerNotifications();
      logger.info(`Cron job finished: Extended absence evaluation complete (${result.processed} students scanned, ${result.notificationsSent} new notifications created).`);
    } catch (error) {
      logger.error('Error in cron job (Extended absence evaluation):', error);
    }
  });
};

module.exports = startCronJobs;
