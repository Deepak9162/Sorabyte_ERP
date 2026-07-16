const fs = require('fs');
const path = require('path');
const FeeTransaction = require('../models/FeeTransaction');
const feeService = require('../services/feeService');

/**
 * PDF Generator Utility
 * 
 * Reuses the premium feeService PDF kit generator to compile
 * matching printed copies.
 */

/**
 * Generate Fee Receipt PDF
 * @param {Object} data - Receipt data
 * @returns {Promise<Object>} Object containing filePath and downloadUrl
 */
const generateFeeReceipt = async (data) => {
  const { receiptNumber } = data;
  const fileName = `Receipt_${receiptNumber}.pdf`;
  const dirPath = path.join(__dirname, '../uploads/receipts');
  const filePath = path.join(dirPath, fileName);

  // Ensure directory exists
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // Retrieve transaction from database to compile full ledger fields
  const transaction = await FeeTransaction.findOne({ receiptNumber });
  if (!transaction) {
    throw new Error(`Transaction with receipt number ${receiptNumber} not found.`);
  }

  return new Promise(async (resolve, reject) => {
    try {
      const stream = fs.createWriteStream(filePath);
      
      // Call premium feeService PDF compiler
      await feeService.generateFeeReceiptPDF(transaction._id, stream);
      
      stream.on('finish', () => {
        resolve({
          filePath,
          downloadUrl: `/uploads/receipts/${fileName}`
        });
      });

      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateFeeReceipt };
