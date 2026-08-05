const express = require('express');
const router = express.Router();
const {
  createHoliday,
  updateHoliday,
  getHolidays,
  deleteHoliday,
  checkHolidayStatus,
  getUpcomingHoliday
} = require('../controllers/holidayController');
const { protect, authorize } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// Get the nearest valid upcoming holiday (open to all authenticated users)
router.get('/upcoming', getUpcomingHoliday);

// Check if a specific date is a holiday (open to all authenticated users for UI)
router.get('/status', checkHolidayStatus);

// Get all holidays (open to all authenticated users for UI)
router.get('/', getHolidays);

// All other holiday operations are Admin only
router.use(authorize('admin'));

router.post('/', createHoliday);

router.route('/:id')
  .put(updateHoliday)
  .delete(deleteHoliday);

module.exports = router;
