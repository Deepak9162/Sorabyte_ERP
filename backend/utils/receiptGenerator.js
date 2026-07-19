/**
 * Receipt Generation Utility
 * 
 * Generates unique receipt numbers in the format: SCH-YYYY-XXXX
 * Uses a Counter collection in MongoDB to ensure sequential uniqueness.
 */

const Counter = require('../models/Counter');

/**
 * Generates the next receipt number
 * @returns {Promise<string>} The formatted receipt number
 */
const generateReceiptNumber = async () => {
  const { extractYearMonth } = require('./dateUtils');
  const ym = extractYearMonth(new Date());
  const currentYear = ym ? ym.year : new Date().getFullYear();
  const counterName = `receipt_${currentYear}`;

  // Atomically increment the counter for the current year
  const counter = await Counter.findOneAndUpdate(
    { name: counterName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  // Pad the sequence number to 4 digits (e.g., 0001, 0023)
  const sequence = counter.seq.toString().padStart(4, '0');

  return `SCH-${currentYear}-${sequence}`;
};

module.exports = { generateReceiptNumber };
