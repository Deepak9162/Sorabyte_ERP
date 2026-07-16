/**
 * Fee Management Routes
 * 
 * Secured for Admin and Staff.
 */

const express = require('express');
const router = express.Router();
const { 
  getFeeDetails, 
  recordPayment, 
  downloadReceipt,
  getStudentFeesByMonth,
  getPendingFeesStudents,
  getMonthlyFinancialSummary,
  updateTransportFee
} = require('../controllers/feeController');
const { protect, isAdmin } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// GET /api/fees/student/:studentId → Month-wise fee status
router.get('/student/:studentId', getStudentFeesByMonth);

router.get('/receipt/:transactionId', downloadReceipt);

router.get('/pending-students', getPendingFeesStudents);

router.get('/monthly-summary', getMonthlyFinancialSummary);

router.use(isAdmin); // Restrict to admin role for direct financial edits

// Fetch summary using classId and rollNumber
router.get('/:classId/:rollNumber', getFeeDetails);

// Post a new payment
router.post('/pay', recordPayment);

// Update student transport fee
router.put('/student/:studentId/transport-fee', updateTransportFee);

module.exports = router;
