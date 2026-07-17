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

    const student = await Student.findOne({ studentId });

    if (!student) {
      return errorResponse(res, 'Student not found', 404);
    }

    const feeLedger = await FeeLedger.findOne({ studentId: student._id })
      .sort({ createdAt: -1 });

    if (!feeLedger) {
      return errorResponse(res, 'No fee ledger found for this student', 404);
    }

    const feeService = require('../services/feeService');
    const monthlyFeeDueDate = await feeService.getMonthlyFeeDueDate();
    const currentDate = new Date();

    let duePending = 0;
    let upcomingPending = 0;

    const monthlyBreakdown = [];
    for (const item of feeLedger.monthlyFees) {
      const dynamicStatus = await feeService.getStatusForMonth(
        item.month,
        feeLedger.academicYear,
        item.status,
        monthlyFeeDueDate,
        currentDate
      );

      const tuitionPending = item.status === 'EXEMPTED' ? 0 : Math.max(0, item.amount - item.paidAmount);
      const transportPending = item.transportStatus === 'EXEMPTED' ? 0 : Math.max(0, item.transportAmount - item.transportPaidAmount);
      const pending = tuitionPending + transportPending;

      const startYear = parseInt(feeLedger.academicYear.split('-')[0]);
      const monthMapping = {
        'April': { idx: 3, offset: 0 },
        'May': { idx: 4, offset: 0 },
        'June': { idx: 5, offset: 0 },
        'July': { idx: 6, offset: 0 },
        'August': { idx: 7, offset: 0 },
        'September': { idx: 8, offset: 0 },
        'October': { idx: 9, offset: 0 },
        'November': { idx: 10, offset: 0 },
        'December': { idx: 11, offset: 0 },
        'January': { idx: 0, offset: 1 },
        'February': { idx: 1, offset: 1 },
        'March': { idx: 2, offset: 1 }
      };
      const mapping = monthMapping[item.month];
      const monthYear = startYear + mapping.offset;
      const monthIdx = mapping.idx;
      const dueDate = new Date(monthYear, monthIdx, monthlyFeeDueDate, 23, 59, 59, 999);

      if (currentDate >= dueDate) {
        duePending += pending;
      } else {
        upcomingPending += pending;
      }

      monthlyBreakdown.push({
        month: item.month,
        amount: item.amount,
        paidAmount: item.paidAmount,
        pending: tuitionPending,
        status: dynamicStatus,
        paidOn: item.paidOn || null
      });
    }

    const response = {
      academicYear: feeLedger.academicYear,
      studentName: student.fullName || student.name,
      studentId: student.studentId,
      summary: {
        totalFee: feeLedger.totalFee,
        totalPaid: feeLedger.totalPaid,
        pendingAmount: duePending,
        upcomingAmount: upcomingPending
      },
      monthlyBreakdown
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
    const ledgers = await FeeLedger.find()
      .populate({
        path: 'studentId',
        select: 'fullName rollNumber class studentId fatherName emergencyContact email status',
        populate: {
          path: 'class',
          select: 'name'
        }
      });

    const feeService = require('../services/feeService');
    const monthlyFeeDueDate = await feeService.getMonthlyFeeDueDate();
    const currentDate = new Date();

    const students = [];

    for (const ledger of ledgers) {
      if (!ledger.studentId || ledger.studentId.status !== 'Active') continue;

      let duePendingAmount = 0;
      const startYear = parseInt(ledger.academicYear.split('-')[0]);

      ledger.monthlyFees.forEach(m => {
        const monthMapping = {
          'April': { idx: 3, offset: 0 },
          'May': { idx: 4, offset: 0 },
          'June': { idx: 5, offset: 0 },
          'July': { idx: 6, offset: 0 },
          'August': { idx: 7, offset: 0 },
          'September': { idx: 8, offset: 0 },
          'October': { idx: 9, offset: 0 },
          'November': { idx: 10, offset: 0 },
          'December': { idx: 11, offset: 0 },
          'January': { idx: 0, offset: 1 },
          'February': { idx: 1, offset: 1 },
          'March': { idx: 2, offset: 1 }
        };
        const mapping = monthMapping[m.month];
        if (!mapping) return;

        const monthYear = startYear + mapping.offset;
        const monthIdx = mapping.idx;
        const dueDate = new Date(monthYear, monthIdx, monthlyFeeDueDate, 23, 59, 59, 999);

        if (currentDate >= dueDate) {
          const tuitionPending = m.status === 'EXEMPTED' ? 0 : Math.max(0, m.amount - m.paidAmount);
          const transportPending = m.transportStatus === 'EXEMPTED' ? 0 : Math.max(0, m.transportAmount - m.transportPaidAmount);
          duePendingAmount += tuitionPending + transportPending;
        }
      });

      if (duePendingAmount > 0) {
        students.push({
          id: ledger.studentId._id,
          studentId: ledger.studentId.studentId,
          fullName: ledger.studentId.fullName,
          rollNumber: ledger.studentId.rollNumber,
          className: ledger.studentId.class ? ledger.studentId.class.name : ledger.studentId.className || 'N/A',
          parentName: ledger.studentId.fatherName,
          parentPhone: ledger.studentId.emergencyContact,
          pendingAmount: duePendingAmount,
          totalFee: ledger.totalFee,
          totalPaid: ledger.totalPaid
        });
      }
    }

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
