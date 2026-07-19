/**
 * Centralized Date Utility
 * Ensures all dates are processed, compared, and formatted in Asia/Kolkata timezone
 */

const TIMEZONE = 'Asia/Kolkata';

/**
 * Returns today's date string in YYYY-MM-DD format for Asia/Kolkata
 */
export const getTodayDateString = () => {
  return formatDateString(new Date());
};

/**
 * Converts any valid Date object or string into a YYYY-MM-DD string in Asia/Kolkata timezone
 * @param {Date|string} dateInput 
 * @returns {string|null} YYYY-MM-DD string, or null if invalid
 */
export const formatDateString = (dateInput) => {
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
export const extractYearMonth = (dateInput) => {
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
export const isSameDay = (date1, date2) => {
  const d1 = formatDateString(date1);
  const d2 = formatDateString(date2);
  return d1 !== null && d2 !== null && d1 === d2;
};

/**
 * Safely parses a given date/time and extracts the localized day of the month
 */
export const getCalendarDay = (dateInput) => {
  const formatted = formatDateString(dateInput);
  if (!formatted) return null;
  return parseInt(formatted.split('-')[2], 10);
};
