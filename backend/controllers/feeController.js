/**
 * Fee Controller
 * 
 * Handles fee inquiries and payment recordings.
 */

const Student = require('../models/Student');
const FeeLedger = require('../models/FeeLedger');
const feeService = require('../services/feeService');
const logger = require('../utils/logger');
const { generateFeeReceipt } = require('../utils/pdfGenerator');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * @desc    Get student fee summary
 * @route   GET /api/fees/:classId/:rollNumber
 */
const getFeeDetails = async (req, res, next) => {
  try {
    const { classId, rollNumber } = req.params;
    const { academicYear } = req.query;
    const details = await feeService.getStudentFeeDetails(classId, rollNumber, academicYear || '2026-2027');
    return successResponse(res, details, 'Fee details fetched successfully');
  } catch (error) {
    if (error.message.includes('not found')) {
      return errorResponse(res, error.message, 404);
    }
    next(error);
  }
};

/**
 * @desc    Record a new fee payment
 * @route   POST /api/fees/pay
 */
const recordPayment = async (req, res, next) => {
  try {
    const { 
      studentId, 
      amount, 
      type, 
      transactionId, 
      remarks, 
      dueDate,
      month,
      academicYear,
      paymentMode,
      includeTransport
    } = req.body;

    // Log request for debugging
    logger.info(`Payment Request: ${JSON.stringify(req.body)}`);

    const missingFields = [];
    if (!studentId) missingFields.push('studentId');
    if (!amount) missingFields.push('amount');
    if (!type) missingFields.push('type');
    if (!month) missingFields.push('month');
    if (!academicYear) missingFields.push('academicYear');

    if (missingFields.length > 0) {
      return errorResponse(res, `Missing required fields: ${missingFields.join(', ')}`, 400);
    }

    const transaction = await feeService.processPayment(studentId, {
      amount,
      type,
      transactionId,
      remarks,
      dueDate,
      month,
      academicYear,
      paymentMode,
      includeTransport
    });

    // Fetch student info first to get class and rollNumber
    const Student = require('../models/Student');
    const student = await Student.findById(studentId).populate('class');

    // Fetch updated fee summary
    const studentFeeDetails = await feeService.getStudentFeeDetails(
      student.class._id, 
      student.rollNumber
    );

    const receiptData = {
      receiptNumber: transaction.receiptNumber,
      date: transaction.paymentDate,
      studentName: student.fullName,
      class: student.class.name,
      rollNumber: student.rollNumber,
      paidAmount: transaction.amount,
      dueAmount: studentFeeDetails.feeSummary.dueFee,
      paymentMode: paymentMode || transaction.paymentMode || 'CASH'
    };

    const pdfResult = await generateFeeReceipt(receiptData);

    return successResponse(res, {
      transaction,
      receiptUrl: pdfResult.downloadUrl
    }, 'Payment recorded and receipt generated successfully', 201);

  } catch (error) {
    next(error);
  }
};


/**
 * @desc    Download fee receipt PDF
 * @route   GET /api/fees/receipt/:transactionId
 */
const downloadReceipt = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt_${transactionId}.pdf`);

    await feeService.generateFeeReceiptPDF(transactionId, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get month-wise fee status for a student
 * @route   GET /api/fees/student/:studentId
 * @access  Public (Protected by middleware)
 */
const getStudentFeesByMonth = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    // 1. Find the student by their unique studentId string
    const student = await Student.findOne({ studentId });

    if (!student) {
      return errorResponse(res, 'Student not found', 404);
    }

    // 2. Find the FeeLedger for this student
    const feeLedger = await FeeLedger.findOne({ studentId: student._id })
      .sort({ createdAt: -1 });

    if (!feeLedger) {
      return errorResponse(res, 'No fee ledger found for this student', 404);
    }

    // 3. Construct response optimized for table UI
    // Note: Schema ensures April -> March order in monthlyFees array
    const response = {
      academicYear: feeLedger.academicYear,
      studentName: student.name,
      studentId: student.studentId,
      summary: {
        totalFee: feeLedger.totalFee,
        totalPaid: feeLedger.totalPaid,
        pendingAmount: feeLedger.pendingAmount
      },
      monthlyBreakdown: feeLedger.monthlyFees.map(item => ({
        month: item.month,
        amount: item.amount,
        paidAmount: item.paidAmount,
        pending: item.amount - item.paidAmount,
        status: item.status,
        paidOn: item.paidOn || null
      }))
    };

    return successResponse(res, response, 'Student fees fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all students with pending fees
 * @route   GET /api/fees/pending-students
 * @access  Protected
 */
const getPendingFeesStudents = async (req, res, next) => {
  try {
    const ledgers = await FeeLedger.find({ pendingAmount: { $gt: 0 } })
      .populate({
        path: 'studentId',
        select: 'fullName rollNumber class studentId fatherName emergencyContact email',
        populate: {
          path: 'class',
          select: 'name'
        }
      });

    const students = ledgers
      .filter(l => l.studentId !== null && l.studentId !== undefined)
      .map(ledger => ({
        id: ledger.studentId._id,
        studentId: ledger.studentId.studentId,
        fullName: ledger.studentId.fullName,
        rollNumber: ledger.studentId.rollNumber,
        className: ledger.studentId.class ? ledger.studentId.class.name : ledger.studentId.className || 'N/A',
        parentName: ledger.studentId.fatherName,
        parentPhone: ledger.studentId.emergencyContact,
        pendingAmount: ledger.pendingAmount,
        totalFee: ledger.totalFee,
        totalPaid: ledger.totalPaid
      }));

    return successResponse(res, students, 'Pending fee students fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get monthly expected vs collected financial summary
 * @route   GET /api/fees/monthly-summary
 * @access  Protected (Admin only)
 */
const getMonthlyFinancialSummary = async (req, res, next) => {
  try {
    const FeeTransaction = require('../models/FeeTransaction');
    const Student = require('../models/Student');
    
    // 1. Get total expected monthly tuition fee from all active students
    const students = await Student.find({ status: 'Active' }).populate('class');
    let totalMonthlyExpected = 0;
    students.forEach(s => {
      if (s.class && s.class.tuitionFee) {
        const discount = s.discountPercentage || 0;
        totalMonthlyExpected += Math.round(s.class.tuitionFee * (1 - (discount / 100)));
      }
    });

    // 2. Aggregate actual payments by month for the current academic session
    const months = [
      'April', 'May', 'June', 'July', 'August', 'September',
      'October', 'November', 'December', 'January', 'February', 'March'
    ];

    const currentYear = new Date().getFullYear();
    const academicYear = '2026-2027'; // matching system defaults

    const payments = await FeeTransaction.aggregate([
      { 
        $match: { 
          status: 'Paid',
          academicYear: academicYear
        } 
      },
      {
        $group: {
          _id: '$month',
          collected: { $sum: '$amount' }
        }
      }
    ]);

    const paymentMap = new Map();
    payments.forEach(p => paymentMap.set(p._id, p.collected));

    // Combine expected vs collected for each month
    const monthlyData = months.map(m => {
      const collected = paymentMap.get(m) || 0;
      return {
        month: m,
        expected: totalMonthlyExpected || 120000,
        collected: collected
      };
    });

    return successResponse(res, {
      academicYear,
      monthlyData
    }, 'Monthly financial summary fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update student transport fee
 * @route   PUT /api/fees/student/:studentId/transport-fee
 */
const updateTransportFee = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { transportFee, academicYear } = req.body;

    if (transportFee === undefined || transportFee < 0) {
      return errorResponse(res, 'Please provide a valid non-negative transport fee amount', 400);
    }

    const student = await feeService.updateStudentTransportFee(
      studentId, 
      parseFloat(transportFee), 
      academicYear || '2026-2027'
    );

    return successResponse(res, student, 'Transport fee updated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFeeDetails,
  recordPayment,
  downloadReceipt,
  getStudentFeesByMonth,
  getPendingFeesStudents,
  getMonthlyFinancialSummary,
  updateTransportFee,
};
