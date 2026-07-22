const Holiday = require('../models/Holiday');
const { getStartOfDay, getEndOfDay, getDayOfWeek } = require('../utils/dateUtils');

class HolidayService {
  /**
   * Determine if a given date is a working day for the given group.
   * A working day is ANY day that is NOT a Sunday and NOT an official holiday.
   * @param {Date|string} date - The date to check.
   * @param {string} applicableTo - 'Teachers', 'Students', or 'Both'.
   * @returns {Promise<boolean>} True if it's a working day, false if it's a holiday or Sunday.
   */
  async isWorkingDay(date, applicableTo = 'Both') {
    if (!date) return true;

    // Step 1: Check Sunday in Asia/Kolkata timezone
    const dayOfWeek = getDayOfWeek(date);
    if (dayOfWeek === 0) {
      return false; // Sunday is a non-working day
    }

    // Step 2: Check Holiday Calendar using precise timezone boundaries
    const dayStart = getStartOfDay(date);
    const dayEnd = getEndOfDay(date);
    if (!dayStart || !dayEnd) return true;

    const queryApplicable = ['Both'];
    if (applicableTo !== 'Both') {
      queryApplicable.push(applicableTo);
    }

    const holiday = await Holiday.findOne({
      status: 'Active',
      applicableTo: { $in: queryApplicable },
      startDate: { $lte: dayEnd },
      endDate: { $gte: dayStart }
    });

    if (holiday) {
      return false; // It's an official holiday
    }

    return true; // It's a working day
  }

  /**
   * Check if a given date is a Sunday or official Holiday and return the reason if so.
   * @param {Date|string} date
   * @param {string} applicableTo
   * @returns {Promise<{isWorkingDay: boolean, isHoliday: boolean, name: string|null, reason: string|null, type: string|null}>}
   */
  async getHolidayDetails(date, applicableTo = 'Both') {
    if (!date) {
      return { isWorkingDay: true, isHoliday: false, name: null, reason: null, type: null };
    }

    const dayOfWeek = getDayOfWeek(date);
    if (dayOfWeek === 0) {
      return { isWorkingDay: false, isHoliday: true, name: 'Sunday', reason: 'Sunday', type: 'Sunday' };
    }

    const dayStart = getStartOfDay(date);
    const dayEnd = getEndOfDay(date);
    if (!dayStart || !dayEnd) {
      return { isWorkingDay: true, isHoliday: false, name: null, reason: null, type: null };
    }

    const queryApplicable = ['Both'];
    if (applicableTo !== 'Both') {
      queryApplicable.push(applicableTo);
    }

    const holiday = await Holiday.findOne({
      status: 'Active',
      applicableTo: { $in: queryApplicable },
      startDate: { $lte: dayEnd },
      endDate: { $gte: dayStart }
    });

    if (holiday) {
      return { isWorkingDay: false, isHoliday: true, name: holiday.name, reason: holiday.name, type: holiday.type };
    }

    return { isWorkingDay: true, isHoliday: false, name: null, reason: null, type: null };
  }

  // --- CRUD Operations ---

  async createHoliday(data, userId) {
    const startDate = getStartOfDay(data.startDate);
    const endDate = getEndOfDay(data.endDate);

    if (!startDate || !endDate) {
      throw new Error('Invalid start or end date');
    }

    // Validate overlap
    const overlap = await Holiday.findOne({
      status: 'Active',
      applicableTo: data.applicableTo,
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
      ]
    });

    if (overlap) {
      throw new Error(`Holiday overlaps with existing holiday: ${overlap.name} (${overlap.startDate.toDateString()} - ${overlap.endDate.toDateString()})`);
    }

    return await Holiday.create({
      ...data,
      startDate,
      endDate,
      createdBy: userId,
    });
  }

  async updateHoliday(id, data, userId) {
    const updateData = { ...data };

    if (data.startDate) {
      updateData.startDate = getStartOfDay(data.startDate);
    }
    if (data.endDate) {
      updateData.endDate = getEndOfDay(data.endDate);
    }

    const startDate = updateData.startDate || (await Holiday.findById(id))?.startDate;
    const endDate = updateData.endDate || (await Holiday.findById(id))?.endDate;
    const applicableTo = updateData.applicableTo || (await Holiday.findById(id))?.applicableTo;

    if (startDate && endDate && applicableTo) {
      const overlap = await Holiday.findOne({
        _id: { $ne: id },
        status: 'Active',
        applicableTo: applicableTo,
        $or: [
          { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
        ]
      });

      if (overlap) {
        throw new Error(`Holiday overlaps with existing holiday: ${overlap.name} (${overlap.startDate.toDateString()} - ${overlap.endDate.toDateString()})`);
      }
    }

    const holiday = await Holiday.findByIdAndUpdate(
      id,
      { ...updateData, updatedBy: userId },
      { new: true }
    );
    if (!holiday) throw new Error('Holiday not found');
    return holiday;
  }

  async getHolidays(filters = {}) {
    return await Holiday.find(filters).sort({ startDate: 1 });
  }

  async deleteHoliday(id) {
    const holiday = await Holiday.findByIdAndDelete(id);
    if (!holiday) throw new Error('Holiday not found');
    return holiday;
  }
}

module.exports = new HolidayService();
