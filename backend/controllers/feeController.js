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
    const students = await Student.find({ status: 'Active' }).populate('class');
    const FeeLedger = require('../models/FeeLedger');
    const ledgers = await FeeLedger.find({ academicYear: '2026-2027' });
    const ledgerMap = new Map();
    ledgers.forEach(l => {
      ledgerMap.set(l.studentId.toString(), l);
    });

    const feeService = require('../services/feeService');
    const currentDate = new Date();
    const calendarMonth = currentDate.getMonth();
    const currentAcademicMonthIdx = (calendarMonth >= 3) ? (calendarMonth - 3) : (calendarMonth + 9);

    const monthOrder = [
      'April', 'May', 'June', 'July', 'August', 'September',
      'October', 'November', 'December', 'January', 'February', 'March'
    ];

    const pendingStudentsList = [];

    for (const student of students) {
      const ledger = ledgerMap.get(student._id.toString());
      let duePendingAmount = 0;

      if (ledger) {
        ledger.monthlyFees.forEach(m => {
          const monthIdx = monthOrder.indexOf(m.month);
          if (monthIdx <= currentAcademicMonthIdx) {
            const tuitionPending = m.status === 'EXEMPTED' ? 0 : Math.max(0, m.amount - m.paidAmount);
            const transportPending = m.transportStatus === 'EXEMPTED' ? 0 : Math.max(0, m.transportAmount - m.transportPaidAmount);
            duePendingAmount += tuitionPending + transportPending;
          }
        });
      } else {
        const tuitionFee = student.class?.tuitionFee || 0;
        const discount = student.discountPercentage || 0;
        const tuitionBase = Math.round(tuitionFee * (1 - (discount / 100)));
        const transportBase = (student.transportMode === 'School Bus' ? (student.transportFee || 0) : 0);
        const admissionDate = student.admissionDate || student.createdAt || new Date();
        const startYear = 2026;

        monthOrder.forEach((mName, mIdx) => {
          if (mIdx <= currentAcademicMonthIdx) {
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
            const mapping = monthMapping[mName];
            const monthYear = startYear + mapping.offset;
            const monthIdxVal = mapping.idx;
            const monthEndDate = new Date(monthYear, monthIdxVal + 1, 0, 23, 59, 59, 999);

            const isExempted = admissionDate > monthEndDate;
            if (!isExempted) {
              duePendingAmount += tuitionBase + transportBase;
            }
          }
        });
      }

      if (duePendingAmount > 0) {
        pendingStudentsList.push({
          id: student._id,
          studentId: student.studentId,
          fullName: student.fullName,
          rollNumber: student.rollNumber,
          className: student.class ? student.class.name : student.className || 'N/A',
          parentName: student.fatherName,
          parentPhone: student.emergencyContact,
          pendingAmount: duePendingAmount,
          totalFee: ledger ? ledger.totalFee : (student.class?.tuitionFee || 0) * 12,
          totalPaid: ledger ? ledger.totalPaid : 0
        });
      }
    }

    return successResponse(res, pendingStudentsList, 'Pending fee students fetched successfully');
  } catch (error) {
    next(error);
  }
};

const getMonthlyFinancialSummary = async (req, res, next) => {
  try {
    const FeeTransaction = require('../models/FeeTransaction');
    const Student = require('../models/Student');
    
    const students = await Student.find({ status: 'Active' }).populate('class');

    const months = [
      'April', 'May', 'June', 'July', 'August', 'September',
      'October', 'November', 'December', 'January', 'February', 'March'
    ];

    const academicYear = '2026-2027';

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

    const monthlyData = months.map(mName => {
      const collected = paymentMap.get(mName) || 0;
      
      let expected = 0;
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
      const mapping = monthMapping[mName];
      const monthYear = 2026 + mapping.offset;
      const monthIdxVal = mapping.idx;
      const monthEndDate = new Date(monthYear, monthIdxVal + 1, 0, 23, 59, 59, 999);

      students.forEach(s => {
        const admissionDate = s.admissionDate || s.createdAt || new Date();
        const isExempted = admissionDate > monthEndDate;
        if (!isExempted && s.class && s.class.tuitionFee) {
          const discount = s.discountPercentage || 0;
          const tuition = Math.round(s.class.tuitionFee * (1 - (discount / 100)));
          const transport = s.transportMode === 'School Bus' ? (s.transportFee || 0) : 0;
          expected += tuition + transport;
        }
      });

      return {
        month: mName,
        expected: expected || 120000,
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

/**
 * @desc    Generate fee report data (isolated read-only)
 * @route   GET /api/fees/reports
 * @access  Protected
 */
const getFeeReport = async (req, res, next) => {
  try {
    const { academicYear, classId, month, reportType, paymentStatus, studentId } = req.query;

    const reportData = await feeService.getFeeReportData({
      academicYear: academicYear || '2026-2027',
      classId: classId || 'ALL',
      month: month || 'ALL',
      reportType: reportType || 'class-summary',
      paymentStatus: paymentStatus || 'ALL',
      studentId: studentId || null,
    });

    return successResponse(res, reportData, 'Fee report generated successfully');
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
  getFeeReport,
};
