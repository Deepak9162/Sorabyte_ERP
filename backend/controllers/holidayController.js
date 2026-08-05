const holidayService = require('../services/holidayService');
const Announcement = require('../models/Announcement');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const createHoliday = async (req, res, next) => {
  try {
    const data = req.body;
    if (!data.name || !data.type || !data.startDate || !data.endDate) {
      return errorResponse(res, 'Missing required fields: name, type, startDate, endDate', 400);
    }
    const holiday = await holidayService.createHoliday(data, req.user._id);

    // Auto-create announcement for the holiday
    try {
      const formatDate = (d) => {
        const date = new Date(d);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      };
      const dateStr = data.startDate === data.endDate 
        ? formatDate(data.startDate)
        : `${formatDate(data.startDate)} to ${formatDate(data.endDate)}`;
      
      const targetStr = data.applicableTo === 'Both' ? 'Students and Staff' : data.applicableTo;
      
      await Announcement.create({
        title: `Upcoming Holiday: ${data.name}`,
        content: `School will remain closed for ${targetStr} on ${dateStr} due to ${data.name}.`,
        createdBy: req.user._id
      });
    } catch (err) {
      console.error('Failed to create holiday announcement:', err);
    }

    return successResponse(res, holiday, 'Holiday created successfully', 201);
  } catch (error) {
    if (error.message.includes('overlaps')) {
      return errorResponse(res, error.message, 409); // Conflict
    }
    next(error);
  }
};

const updateHoliday = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const holiday = await holidayService.updateHoliday(id, data, req.user._id);
    return successResponse(res, holiday, 'Holiday updated successfully');
  } catch (error) {
    if (error.message.includes('overlaps')) {
      return errorResponse(res, error.message, 409); // Conflict
    }
    if (error.message === 'Holiday not found') {
        return errorResponse(res, error.message, 404);
    }
    next(error);
  }
};

const getHolidays = async (req, res, next) => {
  try {
    // Basic filters can be passed via query
    const filters = {};
    if (req.query.year) {
      const year = parseInt(req.query.year);
      filters.startDate = { $gte: new Date(year, 0, 1) };
      filters.endDate = { $lte: new Date(year, 11, 31, 23, 59, 59) };
    }
    if (req.query.type) filters.type = req.query.type;
    if (req.query.applicableTo) filters.applicableTo = req.query.applicableTo;

    const holidays = await holidayService.getHolidays(filters);
    return successResponse(res, holidays, 'Holidays fetched successfully');
  } catch (error) {
    next(error);
  }
};

const deleteHoliday = async (req, res, next) => {
  try {
    const { id } = req.params;
    await holidayService.deleteHoliday(id);
    return successResponse(res, null, 'Holiday deleted successfully');
  } catch (error) {
    if (error.message === 'Holiday not found') {
        return errorResponse(res, error.message, 404);
    }
    next(error);
  }
};

const checkHolidayStatus = async (req, res, next) => {
    try {
        const { date, applicableTo } = req.query;
        if (!date) {
            return errorResponse(res, 'Missing date parameter', 400);
        }
        const targetDate = new Date(date);
        if (isNaN(targetDate)) {
            return errorResponse(res, 'Invalid date format', 400);
        }
        
        const details = await holidayService.getHolidayDetails(targetDate, applicableTo || 'Both');
        return successResponse(res, details, 'Holiday status fetched successfully');
    } catch (error) {
        next(error);
    }
};

const getUpcomingHoliday = async (req, res, next) => {
  try {
    // Tenant / Institute isolation scoping
    const tenantFilter = {};
    if (req.user?.schoolId) tenantFilter.schoolId = req.user.schoolId;
    else if (req.user?.tenantId) tenantFilter.tenantId = req.user.tenantId;
    else if (req.user?.instituteId) tenantFilter.instituteId = req.user.instituteId;

    const holiday = await holidayService.getUpcomingHoliday(tenantFilter);
    if (!holiday) {
      return successResponse(res, null, 'No upcoming holiday found');
    }

    const formatDate = (d) => {
      const date = new Date(d);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const startDateStr = formatDate(holiday.startDate);
    const endDateStr = formatDate(holiday.endDate);
    const dateStr = startDateStr === endDateStr ? startDateStr : `${startDateStr} to ${endDateStr}`;
    const targetStr = holiday.applicableTo === 'Both' ? 'Students and Staff' : holiday.applicableTo;

    // Optimized minimal payload response
    const data = {
      title: `Upcoming Holiday: ${holiday.name}`,
      content: holiday.description || `School will remain closed for ${targetStr} on ${dateStr} due to ${holiday.name}.`,
      description: holiday.description || `School will remain closed for ${targetStr} on ${dateStr} due to ${holiday.name}.`,
      holidayName: holiday.name,
      holidayType: holiday.type,
      startDate: holiday.startDate,
      endDate: holiday.endDate,
      applicableTo: holiday.applicableTo,
      createdBy: holiday.createdBy ? { name: holiday.createdBy.name } : { name: 'Admin' },
      createdAt: holiday.createdAt
    };

    return successResponse(res, data, 'Upcoming holiday fetched successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createHoliday,
  updateHoliday,
  getHolidays,
  deleteHoliday,
  checkHolidayStatus,
  getUpcomingHoliday
};
