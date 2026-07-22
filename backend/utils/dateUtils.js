/**
 * Centralized Date Utility
 * Ensures all dates are processed, compared, and formatted in Asia/Kolkata timezone
 */

const TIMEZONE = 'Asia/Kolkata';

/**
 * Returns today's date string in YYYY-MM-DD format for Asia/Kolkata
 */
const getTodayDateString = () => {
  return formatDateString(new Date());
};

/**
 * Converts any valid Date object or string into a YYYY-MM-DD string in Asia/Kolkata timezone
 * @param {Date|string} dateInput 
 * @returns {string|null} YYYY-MM-DD string, or null if invalid
 */
const formatDateString = (dateInput) => {
  if (!dateInput) return null;
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return null;

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;

    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch (error) {
    console.error("Error formatting date string", error);
  }
  
  // Fallback (safe string parsing, though less robust than Intl)
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/**
 * Extracts the calendar Year and Month safely in Asia/Kolkata timezone
 * Useful for ledger, fee comparisons, and monthly analytics
 * @param {Date|string} dateInput 
 * @returns {{ year: number, month: number }|null}
 */
const extractYearMonth = (dateInput) => {
  const formatted = formatDateString(dateInput);
  if (!formatted) return null;
  const [yearStr, monthStr] = formatted.split('-');
  return {
    year: parseInt(yearStr, 10),
    month: parseInt(monthStr, 10)
  };
};

/**
 * Normalizes two dates and checks if they represent the same calendar day in Asia/Kolkata
 * @param {Date|string} date1 
 * @param {Date|string} date2 
 * @returns {boolean}
 */
const isSameDay = (date1, date2) => {
  const d1 = formatDateString(date1);
  const d2 = formatDateString(date2);
  return d1 !== null && d2 !== null && d1 === d2;
};

/**
 * Gets a precise UTC Date object representing the start of the day (00:00:00) in Asia/Kolkata
 * @param {Date|string} dateInput 
 * @returns {Date|null}
 */
const getStartOfDay = (dateInput) => {
  const formatted = formatDateString(dateInput);
  if (!formatted) return null;
  // +05:30 is Asia/Kolkata
  return new Date(`${formatted}T00:00:00.000+05:30`);
};

/**
 * Gets a precise UTC Date object representing the end of the day (23:59:59.999) in Asia/Kolkata
 * @param {Date|string} dateInput 
 * @returns {Date|null}
 */
const getEndOfDay = (dateInput) => {
  const formatted = formatDateString(dateInput);
  if (!formatted) return null;
  return new Date(`${formatted}T23:59:59.999+05:30`);
};

/**
 * Safely parses a given date/time and extracts the localized day of the month
 */
const getCalendarDay = (dateInput) => {
  const formatted = formatDateString(dateInput);
  if (!formatted) return null;
  return parseInt(formatted.split('-')[2], 10);
};

/**
 * Gets a precise UTC Date object representing the start of the month in Asia/Kolkata
 * @param {Date|string} dateInput 
 * @returns {Date|null}
 */
const getStartOfMonth = (dateInput) => {
  const formatted = formatDateString(dateInput);
  if (!formatted) return null;
  const [year, month] = formatted.split('-');
  return new Date(`${year}-${month}-01T00:00:00.000+05:30`);
};

/**
 * Gets a precise UTC Date object representing the end of the month in Asia/Kolkata
 * @param {Date|string} dateInput 
 * @returns {Date|null}
 */
const getEndOfMonth = (dateInput) => {
  const formatted = formatDateString(dateInput);
  if (!formatted) return null;
  const [yearStr, monthStr] = formatted.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);
  
  // To get the last day of the month, we can construct the next month's 1st day and subtract 1 ms
  if (month === 12) {
    year += 1;
    month = 1;
  } else {
    month += 1;
  }
  
  const nextMonthStr = String(month).padStart(2, '0');
  const nextMonthFirst = new Date(`${year}-${nextMonthStr}-01T00:00:00.000+05:30`);
  return new Date(nextMonthFirst.getTime() - 1);
};

/**
 * Safely parses a given date/time and extracts the localized day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * evaluated in Asia/Kolkata timezone
 */
const getDayOfWeek = (dateInput) => {
  const formatted = formatDateString(dateInput);
  if (!formatted) return null;
  const noonIst = new Date(`${formatted}T12:00:00.000+05:30`);
  return noonIst.getUTCDay();
};

module.exports = {
  getTodayDateString,
  formatDateString,
  extractYearMonth,
  isSameDay,
  getStartOfDay,
  getEndOfDay,
  getStartOfMonth,
  getEndOfMonth,
  getCalendarDay,
  getDayOfWeek
};

