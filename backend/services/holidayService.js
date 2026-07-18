const Holiday = require('../models/Holiday');

class HolidayService {
  /**
   * Determine if a given date is a working day for the given group.
   * A working day is ANY day that is NOT a Sunday and NOT an official holiday.
   * @param {Date} date - The date to check.
   * @param {string} applicableTo - 'Teachers', 'Students', or 'Both'.
   * @returns {Promise<boolean>} True if it's a working day, false if it's a holiday or Sunday.
   */
  async isWorkingDay(date, applicableTo = 'Both') {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Step 1: Is today Sunday?
    // In JavaScript Date, 0 is Sunday.
    if (targetDate.getDay() === 0) {
      return false; // Sunday is a non-working day
    }

    // Step 2: Check Holiday Calendar
    // Ensure we only query Active holidays that apply to the group (or 'Both')
    const queryApplicable = ['Both'];
    if (applicableTo !== 'Both') {
      queryApplicable.push(applicableTo);
    }

    const holiday = await Holiday.findOne({
      status: 'Active',
      applicableTo: { $in: queryApplicable },
      startDate: { $lte: targetDate },
      endDate: { $gte: targetDate }
    });

    if (holiday) {
      return false; // It's an official holiday
    }

    return true; // It's a working day
  }

  /**
   * Check if a given date is a Sunday or official Holiday and return the reason if so.
   * Useful for UI to display "Holiday Mode: Summer Vacation" or "Holiday Mode: Sunday".
   * @param {Date} date
   * @param {string} applicableTo
   * @returns {Promise<{isHoliday: boolean, reason: string|null, type: string|null}>}
   */
  async getHolidayDetails(date, applicableTo = 'Both') {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    if (targetDate.getDay() === 0) {
      return { isWorkingDay: false, isHoliday: true, name: 'Sunday', reason: 'Sunday', type: 'Sunday' };
    }

    const queryApplicable = ['Both'];
    if (applicableTo !== 'Both') {
      queryApplicable.push(applicableTo);
    }

    const holiday = await Holiday.findOne({
      status: 'Active',
      applicableTo: { $in: queryApplicable },
      startDate: { $lte: targetDate },
      endDate: { $gte: targetDate }
    });

    if (holiday) {
      return { isWorkingDay: false, isHoliday: true, name: holiday.name, reason: holiday.name, type: holiday.type };
    }

    return { isWorkingDay: true, isHoliday: false, name: null, reason: null, type: null };
  }

  // --- CRUD Operations ---

  async createHoliday(data, userId) {
    // Validate overlap
    const overlap = await Holiday.findOne({
      status: 'Active',
      applicableTo: data.applicableTo,
      $or: [
        { startDate: { $lte: data.endDate }, endDate: { $gte: data.startDate } }
      ]
    });

    if (overlap) {
      throw new Error(`Holiday overlaps with existing holiday: ${overlap.name} (${overlap.startDate.toDateString()} - ${overlap.endDate.toDateString()})`);
    }

    return await Holiday.create({
      ...data,
      createdBy: userId,
    });
  }

  async updateHoliday(id, data, userId) {
    // Validate overlap excluding this id
    if (data.startDate && data.endDate && data.applicableTo) {
        const overlap = await Holiday.findOne({
        _id: { $ne: id },
        status: 'Active',
        applicableTo: data.applicableTo,
        $or: [
            { startDate: { $lte: data.endDate }, endDate: { $gte: data.startDate } }
        ]
        });

        if (overlap) {
        throw new Error(`Holiday overlaps with existing holiday: ${overlap.name} (${overlap.startDate.toDateString()} - ${overlap.endDate.toDateString()})`);
        }
    }

    const holiday = await Holiday.findByIdAndUpdate(
      id,
      { ...data, updatedBy: userId },
      { new: true }
    );
    if (!holiday) throw new Error('Holiday not found');
    return holiday;
  }

  async getHolidays(filters = {}) {
    // Allows filtering by year, month, type, applicableTo
    return await Holiday.find(filters).sort({ startDate: 1 });
  }

  async deleteHoliday(id) {
    const holiday = await Holiday.findByIdAndDelete(id);
    if (!holiday) throw new Error('Holiday not found');
    return holiday;
  }
}

module.exports = new HolidayService();
