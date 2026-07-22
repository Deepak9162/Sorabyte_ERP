/**
 * Centralized Frontend Holiday Utility
 * Provides uniform holiday, Sunday, and status fallback logic for Student & Staff Attendance.
 */

/**
 * Checks if a given day/month/year represents a Sunday
 * @param {number} day - Day of month (1-31)
 * @param {number} month - Month (1-12)
 * @param {number} year - Full Year (e.g. 2026)
 * @returns {boolean}
 */
export const isSunday = (day, month, year) => {
  const date = new Date(year, month - 1, day);
  return date.getDay() === 0;
};

/**
 * Checks if a specific calendar day is a Sunday or official school holiday.
 * @param {number} day - Day of month (1-31)
 * @param {number} month - Month (1-12)
 * @param {number} year - Year (e.g. 2026)
 * @param {string} type - Applicable group: "Students", "Teachers", or "Both"
 * @param {Array} holidays - Array of holiday objects from API
 * @returns {boolean}
 */
export const isDayHoliday = (day, month, year, type = "Students", holidays = []) => {
  const date = new Date(year, month - 1, day);
  date.setHours(12, 0, 0, 0);

  if (date.getDay() === 0) return true; // Sunday is always a weekly off

  if (!Array.isArray(holidays) || holidays.length === 0) return false;

  return holidays.some((h) => {
    if (!h || h.status === 'Inactive') return false;
    if (h.applicableTo !== 'Both' && h.applicableTo !== type && type !== 'Both') return false;

    const start = new Date(h.startDate);
    const end = new Date(h.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return date >= start && date <= end;
  });
};

/**
 * Determines the effective display status for an attendance record.
 * On any Sunday or official school holiday, status is ALWAYS 'holiday' (H).
 * 
 * @param {string|null} status - Database status ('present', 'absent', 'leave', 'late', etc.)
 * @param {boolean} isHoliday - True if the date is a holiday or Sunday
 * @returns {string|null} Effective status string ('present', 'absent', 'leave', 'late', 'holiday', or null)
 */
export const getEffectiveAttendanceStatus = (status, isHoliday) => {
  if (isHoliday) {
    return 'holiday';
  }
  return status ? String(status).toLowerCase() : null;
};
