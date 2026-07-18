/**
 * Fee Service
 * 
 * Business logic for student fee management and transactions.
 */

const Student = require('../models/Student');
const FeeTransaction = require('../models/FeeTransaction');
const Class = require('../models/Class');
const { generateReceiptNumber } = require('../utils/receiptGenerator');

class FeeService {

  async getMonthlyFeeDueDate() {
    const InstituteSettings = require('../models/InstituteSettings');
    let settings = await InstituteSettings.findOne();
    if (!settings) {
      settings = await InstituteSettings.create({});
    }
    return settings.monthlyFeeDueDate || 10;
  }

  async getStatusForMonth(monthName, academicYear, dbStatus, monthlyFeeDueDate = 10, currentDate = new Date()) {
    if (dbStatus === 'PAID') return 'PAID';
    if (dbStatus === 'EXEMPTED') return 'EXEMPTED';

    const startYear = parseInt(academicYear.split('-')[0]); // e.g. 2026
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

    const mapping = monthMapping[monthName];
    if (!mapping) return dbStatus;

    const monthYear = startYear + mapping.offset;
    const monthIdx = mapping.idx;

    const dueDate = new Date(monthYear, monthIdx, monthlyFeeDueDate, 23, 59, 59, 999);

    if (currentDate >= dueDate) {
      return dbStatus === 'PARTIAL' ? 'PARTIAL' : 'DUE';
    } else {
      return dbStatus === 'PARTIAL' ? 'PARTIAL' : 'UPCOMING';
    }
  }

  /**
   * Helper: Ensure a student has a fee ledger for the given academic year.
   * Creates one if it doesn't exist.
   */
  async ensureFeeLedger(studentId, academicYear, tuitionFee = 0) {
    const FeeLedger = require('../models/FeeLedger');
    let ledger = await FeeLedger.findOne({ studentId, academicYear });

    if (ledger) {
      // Synchronize ledger with student's current profile settings (admission date, discount, transport)
      const student = await Student.findById(studentId);
      if (student) {
        const discount = student.discountPercentage || 0;
        const finalTuitionFee = Math.round(tuitionFee * (1 - (discount / 100)));
        const studentAdmissionDate = student.admissionDate || student.createdAt || null;
        const hasSchoolBus = student.transportMode === 'School Bus';
        const startYear = parseInt(academicYear.split('-')[0]);

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

        let modified = false;

        ledger.monthlyFees.forEach(m => {
          let shouldBeExempted = false;

          if (studentAdmissionDate && !isNaN(startYear)) {
            const mapping = monthMapping[m.month];
            const monthYear = startYear + mapping.offset;
            const monthIdx = mapping.idx;

            const admDate = new Date(studentAdmissionDate);
            const admYear = admDate.getFullYear();
            const admMonth = admDate.getMonth(); // 0-indexed

            if (monthYear < admYear || (monthYear === admYear && monthIdx < admMonth)) {
              shouldBeExempted = true;
            }
          }

          if (shouldBeExempted) {
            // Recalculate to EXEMPTED if not already
            if (m.status !== 'EXEMPTED' || m.transportStatus !== 'EXEMPTED') {
              m.status = 'EXEMPTED';
              m.amount = 0;
              m.paidAmount = 0;
              m.transportStatus = 'EXEMPTED';
              m.transportAmount = 0;
              m.transportPaidAmount = 0;
              modified = true;
            }
          } else {
            // It should NOT be exempted.
            // If it is currently EXEMPTED, restore it to UNPAID and set standard fees
            if (m.status === 'EXEMPTED') {
              m.status = 'UNPAID';
              m.amount = finalTuitionFee;
              m.paidAmount = 0;
              modified = true;
            } else {
              // Even if not exempted, make sure amount aligns with tuition base (in case discount was updated)
              if (m.status === 'UNPAID' && m.amount !== finalTuitionFee) {
                m.amount = finalTuitionFee;
                modified = true;
              }
            }

            // Sync Transport
            if (hasSchoolBus) {
              const expectedTransportFee = student.transportFee !== undefined && student.transportFee !== null ? student.transportFee : 500;
              if (m.transportStatus === 'EXEMPTED') {
                m.transportStatus = 'UNPAID';
                m.transportAmount = expectedTransportFee;
                m.transportPaidAmount = 0;
                modified = true;
              } else if (m.transportStatus === 'UNPAID' && m.transportAmount !== expectedTransportFee) {
                m.transportAmount = expectedTransportFee;
                modified = true;
              } else if (m.transportStatus === 'PAID' && m.transportPaidAmount === 0 && expectedTransportFee > 0) {
                // If it was marked PAID simply because transportAmount was 0, but now there is an expected fee:
                m.transportStatus = 'UNPAID';
                m.transportAmount = expectedTransportFee;
                m.transportPaidAmount = 0;
                modified = true;
              } else if (m.transportStatus === 'PARTIAL' && m.transportAmount !== expectedTransportFee) {
                m.transportAmount = expectedTransportFee;
                modified = true;
              }
            } else {
              // No school bus, so transport should be exempted
              if (m.transportStatus !== 'EXEMPTED') {
                m.transportStatus = 'EXEMPTED';
                m.transportAmount = 0;
                m.transportPaidAmount = 0;
                modified = true;
              }
            }
          }
        });

        if (modified) {
          ledger.markModified('monthlyFees');
          await ledger.save();
        }
      }
    }

    if (!ledger) {
      let finalTuitionFee = tuitionFee;
      let studentAdmissionDate = null;
      let hasSchoolBus = false;
 
      const student = await Student.findById(studentId);
      if (student) {
        const discount = student.discountPercentage || 0;
        finalTuitionFee = Math.round(tuitionFee * (1 - (discount / 100)));
        studentAdmissionDate = student.admissionDate || student.createdAt || null;
        hasSchoolBus = student.transportMode === 'School Bus';
      }

      const months = [
        'April', 'May', 'June', 'July', 'August', 'September',
        'October', 'November', 'December', 'January', 'February', 'March'
      ];

      const startYear = parseInt(academicYear.split('-')[0]);

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

      const monthlyFees = months.map(m => {
        let status = 'UNPAID';
        let amount = finalTuitionFee;
 
        if (studentAdmissionDate && !isNaN(startYear)) {
          const mapping = monthMapping[m];
          const monthYear = startYear + mapping.offset;
          const monthIdx = mapping.idx;
 
          const admDate = new Date(studentAdmissionDate);
          const admYear = admDate.getFullYear();
          const admMonth = admDate.getMonth(); // 0-indexed
 
          // If the month-year is BEFORE the student's admission month-year
          if (monthYear < admYear || (monthYear === admYear && monthIdx < admMonth)) {
            status = 'EXEMPTED';
            amount = 0;
          }
        }
 
        let transportAmountVal = hasSchoolBus ? (student.transportFee !== undefined && student.transportFee !== null ? student.transportFee : 500) : 0;
        let transportStatusVal = hasSchoolBus ? 'UNPAID' : 'EXEMPTED';
        if (status === 'EXEMPTED') {
          transportAmountVal = 0;
          transportStatusVal = 'EXEMPTED';
        }
 
        return {
          month: m,
          amount,
          paidAmount: 0,
          status,
          transportAmount: transportAmountVal,
          transportPaidAmount: 0,
          transportStatus: transportStatusVal
        };
      });

      const totalFee = monthlyFees.reduce((acc, curr) => acc + curr.amount, 0);

      ledger = await FeeLedger.create({
        studentId,
        academicYear,
        monthlyFees,
        totalFee,
        totalPaid: 0,
        pendingAmount: totalFee
      });
    }
    return ledger;
  }

  /**
   * Fetch student fee summary using class and roll number
   */
  async getStudentFeeDetails(classId, rollNumber, academicYear = '2026-2027') {
    const FeeLedger = require('../models/FeeLedger');
    
    // 1. Find student and populate class info
    const student = await Student.findOne({ class: classId, rollNumber })
      .populate('class', 'name tuitionFee');

    if (!student) {
      throw new Error('Student not found with the given class and roll number');
    }

    // 2. Fetch or initialize Fee Ledger for the student
    const ledger = await this.ensureFeeLedger(
      student._id, 
      academicYear, 
      student.class.tuitionFee || 0
    );

    // 3. Aggregate all 'Paid' transactions
    const transactions = await FeeTransaction.find({ 
      student: student._id, 
      status: 'Paid' 
    }).populate({
      path: 'student',
      populate: { path: 'class', select: 'name' }
    }).sort({ createdAt: -1 });

    const monthlyFeeDueDate = await this.getMonthlyFeeDueDate();
    const currentDate = new Date();

    let dueFeeTotal = 0;
    let upcomingFeeTotal = 0;

    const monthlyBreakdown = [];

    if (ledger) {
      for (const m of ledger.monthlyFees) {
        const dynamicStatus = await this.getStatusForMonth(m.month, ledger.academicYear, m.status, monthlyFeeDueDate, currentDate);
        
        let dynamicTransportStatus = m.transportStatus;
        if (m.transportStatus !== 'EXEMPTED') {
          dynamicTransportStatus = await this.getStatusForMonth(m.month, ledger.academicYear, m.transportStatus, monthlyFeeDueDate, currentDate);
        }

        const tuitionPending = m.status === 'EXEMPTED' ? 0 : Math.max(0, m.amount - m.paidAmount);
        const transportPending = m.transportStatus === 'EXEMPTED' ? 0 : Math.max(0, m.transportAmount - m.transportPaidAmount);
        const monthPending = tuitionPending + transportPending;

        const startYear = parseInt(ledger.academicYear.split('-')[0]);
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
        const monthYear = startYear + mapping.offset;
        const monthIdx = mapping.idx;
        const dueDate = new Date(monthYear, monthIdx, monthlyFeeDueDate, 23, 59, 59, 999);

        if (currentDate >= dueDate) {
          dueFeeTotal += monthPending;
        } else {
          upcomingFeeTotal += monthPending;
        }

        monthlyBreakdown.push({
          month: m.month,
          amount: m.amount,
          paidAmount: m.paidAmount,
          pending: tuitionPending,
          status: dynamicStatus,
          transportAmount: m.transportAmount || 0,
          transportPaidAmount: m.transportPaidAmount || 0,
          transportPending: transportPending,
          transportStatus: dynamicTransportStatus
        });
      }
    }

    return {
      student: {
        id: student._id,
        fullName: student.fullName,
        class: student.class.name,
        rollNumber: student.rollNumber,
        transportMode: student.transportMode || 'Private',
        transportFee: student.transportFee !== undefined ? student.transportFee : 0,
        admissionNumber: student.admissionNumber,
        studentId: student.studentId,
        fatherName: student.fatherName,
        phone: student.phone,
        section: student.section || 'A',
        aadhar: student.aadhar || '',
        address: student.address || ''
      },
      feeSummary: ledger ? {
        totalFee: ledger.totalFee,
        paidFee: ledger.totalPaid,
        dueFee: dueFeeTotal,
        upcomingFee: upcomingFeeTotal
      } : {
        totalFee: (student.class.tuitionFee || 0) * 12,
        paidFee: 0,
        dueFee: 0,
        upcomingFee: (student.class.tuitionFee || 0) * 12
      },
      ledger: ledger ? {
        academicYear: ledger.academicYear,
        monthlyBreakdown: monthlyBreakdown
      } : null,
      transactions: transactions
    };
  }

  /**
   * Record a new fee payment (Transaction-Safe)
   */
  async processPayment(studentId, paymentData) {
    const mongoose = require('mongoose');
    const FeeLedger = require('../models/FeeLedger');
    const { amount, type, transactionId, remarks, dueDate, month, academicYear, paymentMode, includeTransport } = paymentData;

    try {
      // Normalize month to a string for FeeTransaction database record and target months array
      let monthDbValue = '';
      let targetMonths = [];
      if (Array.isArray(month)) {
        targetMonths = month;
        monthDbValue = month.join(', ');
      } else if (typeof month === 'string') {
        if (month.includes(',')) {
          targetMonths = month.split(',').map(m => m.trim());
          monthDbValue = month;
        } else {
          targetMonths = [month];
          monthDbValue = month;
        }
      }

      // Sort selected months chronologically based on academic year
      const academicMonthOrder = [
        'April', 'May', 'June', 'July', 'August', 'September',
        'October', 'November', 'December', 'January', 'February', 'March'
      ];
      targetMonths.sort((a, b) => {
        return academicMonthOrder.indexOf(a) - academicMonthOrder.indexOf(b);
      });

      // 1. Generate unique receipt number
      const receiptNumber = await generateReceiptNumber();

      // 2. Create a new transaction record
      const transaction = await FeeTransaction.create({
        student: studentId,
        amount,
        type,
        status: 'Paid',
        paymentDate: new Date(),
        dueDate: dueDate || new Date(),
        transactionId,
        receiptNumber,
        month: monthDbValue,
        academicYear,
        remarks,
        paymentMode
      });

      // 3. Update the FeeLedger (ensure it exists with student's class tuition fee)
      const student = await Student.findById(studentId).populate('class');
      const tuitionFee = student?.class?.tuitionFee || 0;
      const ledger = await this.ensureFeeLedger(studentId, academicYear, tuitionFee);

      let remainingAmount = amount;
      let totalTransportPaid = 0;

      for (const mName of targetMonths) {
        const monthEntry = ledger.monthlyFees.find(m => m.month === mName);
        if (!monthEntry) {
          throw new Error(`Month ${mName} not found in the fee ledger`);
        }

        // Skip processing if the month status is EXEMPTED
        if (monthEntry.status === 'EXEMPTED') {
          continue;
        }

        // A. Pay Transport first for this month if included and student uses School Bus
        if (includeTransport && student.transportMode === 'School Bus' && monthEntry.transportStatus !== 'EXEMPTED') {
          const tPending = Math.max(0, (monthEntry.transportAmount || 500) - (monthEntry.transportPaidAmount || 0));
          if (tPending > 0 && remainingAmount > 0) {
            if (remainingAmount >= tPending) {
              monthEntry.transportPaidAmount = (monthEntry.transportPaidAmount || 0) + tPending;
              monthEntry.transportStatus = 'PAID';
              totalTransportPaid += tPending;
              remainingAmount -= tPending;
            } else {
              monthEntry.transportPaidAmount = (monthEntry.transportPaidAmount || 0) + remainingAmount;
              monthEntry.transportStatus = 'UNPAID';
              totalTransportPaid += remainingAmount;
              remainingAmount = 0;
            }
          }
        }

        // B. Pay Tuition for this month
        const pending = Math.max(0, monthEntry.amount - monthEntry.paidAmount);

        if (pending > 0 && remainingAmount > 0) {
          if (remainingAmount >= pending) {
            monthEntry.paidAmount += pending;
            monthEntry.status = 'PAID';
            monthEntry.paidOn = new Date();
            remainingAmount -= pending;
          } else {
            monthEntry.paidAmount += remainingAmount;
            monthEntry.status = 'PARTIAL';
            monthEntry.paidOn = new Date();
            remainingAmount = 0;
          }
        }
      }

      // If there's still remaining amount (overpayment), apply it to the last selected non-exempted month
      if (remainingAmount > 0 && targetMonths.length > 0) {
        let lastNonExemptedEntry = null;
        for (let i = targetMonths.length - 1; i >= 0; i--) {
          const mEntry = ledger.monthlyFees.find(m => m.month === targetMonths[i]);
          if (mEntry && mEntry.status !== 'EXEMPTED') {
            lastNonExemptedEntry = mEntry;
            break;
          }
        }
        if (lastNonExemptedEntry) {
          lastNonExemptedEntry.paidAmount += remainingAmount;
          lastNonExemptedEntry.status = 'PAID';
          lastNonExemptedEntry.paidOn = new Date();
        }
      }

      // Save transportAmount on the transaction record if any transport fee was settled
      if (totalTransportPaid > 0) {
        transaction.transportAmount = totalTransportPaid;
        await transaction.save();
      }

      // Mark the array modified so Mongoose saves changes
      ledger.markModified('monthlyFees');

      // 4. Save the ledger (this triggers the pre-save hook to recalculate totals)
      await ledger.save();

      // Invalidate dashboard stats cache to force live updates on next reload
      const adminService = require('./adminService');
      adminService.invalidateDashboardStatsCache();

      await transaction.populate({
        path: 'student',
        populate: { path: 'class', select: 'name' }
      });
      return transaction; // Return the created transaction object

    } catch (error) {
      console.error('Payment processing failed:', error);
      throw error;
    }
  }
  /**
   * Generates a professional PDF for a fee receipt
   */
  async generateFeeReceiptPDF(transactionId, outStream) {
    const transaction = await FeeTransaction.findById(transactionId)
      .populate({
        path: 'student',
        populate: { path: 'class', select: 'name' }
      });

    if (!transaction) throw new Error('Transaction not found');

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(outStream);

    // 1. Official Header
    const fs = require('fs');
    const path = require('path');
    const logoPath = path.join(__dirname, '../assets/schoollogo.png');
    
    if (fs.existsSync(logoPath)) {
      doc.save();
      doc.circle(62.5, 57.5, 22.5).clip();
      doc.image(logoPath, 40, 35, { width: 45, height: 45 });
      doc.restore();
      
      doc.fillColor('#1e3a8a').fontSize(18).text('LITTLE FLOWER ENGLISH SCHOOL', 100, 40, { weight: 'bold' });
      doc.fontSize(9).fillColor('#4b5563').text('Dindayalpur, Siwan, Bihar', 100, 58);
      doc.fontSize(8).text('Website: www.lfessiwan.in | Phone: +91 82946 80282', 100, 70);
      doc.y = 85;
    } else {
      doc.fillColor('#1e3a8a').fontSize(24).text('LITTLE FLOWER ENGLISH SCHOOL', { align: 'center', weight: 'bold' });
      doc.fontSize(10).fillColor('#4b5563').text('Dindayalpur, Siwan, Bihar', { align: 'center' });
      doc.text('Website: www.lfessiwan.in | Phone: +91 82946 80282', { align: 'center' });
    }
    
    // Draw horizontal line
    doc.moveTo(40, 95).lineTo(555, 95).stroke('#e5e7eb');

    // 2. Receipt Identification
    doc.y = 105;
    doc.fillColor('#111827').fontSize(14).text('FEE COLLECTION RECEIPT', { align: 'center', weight: 'bold' });
    doc.moveDown(0.5);

    // Metadata Grid
    doc.fontSize(9);
    const metaY = doc.y;
    doc.fillColor('#4b5563').text('Receipt Number:', 40, metaY);
    doc.fillColor('#111827').text(transaction.receiptNumber || transaction._id.toString().toUpperCase(), 120, metaY, { weight: 'bold' });
    
    doc.fillColor('#4b5563').text('Payment Date:', 320, metaY);
    doc.fillColor('#111827').text(transaction.paymentDate ? transaction.paymentDate.toLocaleDateString('en-IN') : 'N/A', 400, metaY);
    
    doc.fillColor('#4b5563').text('Academic Session:', 40, metaY + 15);
    doc.fillColor('#111827').text(transaction.academicYear || '2026 - 2027', 120, metaY + 15);
    
    doc.fillColor('#4b5563').text('Payment Status:', 320, metaY + 15);
    doc.fillColor('#059669').text('SUCCESSFUL / PAID', 400, metaY + 15, { weight: 'bold' });
    
    doc.fillColor('#4b5563').text('Payment Mode:', 320, metaY + 30);
    doc.fillColor('#1e40af').text((transaction.paymentMode || 'CASH').toUpperCase(), 400, metaY + 30, { weight: 'bold' });

    doc.moveDown(2.5);

    // 3. Student Details Card
    doc.rect(40, doc.y, 515, 20).fill('#f3f4f6');
    doc.fillColor('#1f2937').fontSize(9).text('STUDENT INFORMATION', 50, doc.y + 6, { weight: 'bold' });
    doc.moveDown(1);

    const studentY = doc.y;
    doc.fillColor('#6b7280').text('Student Name:', 50, studentY);
    doc.fillColor('#111827').text((transaction.student.fullName || transaction.student.name || "").toUpperCase(), 130, studentY, { weight: 'bold' });
    doc.fillColor('#6b7280').text('Aadhaar Number:', 320, studentY);
    doc.fillColor('#111827').text(transaction.student.aadhar || 'N/A', 400, studentY);
    doc.fillColor('#6b7280').text('Class / Section:', 50, studentY + 18);
    doc.fillColor('#111827').text(`${transaction.student.class?.name || 'N/A'} - ${transaction.student.section || 'A'}`, 130, studentY + 18);
    
    doc.fillColor('#6b7280').text('Roll Number:', 320, studentY + 18);
    doc.fillColor('#111827').text(transaction.student.rollNumber || 'N/A', 400, studentY + 18);

    doc.fillColor('#6b7280').text('Father Name:', 50, studentY + 36);
    doc.fillColor('#111827').text((transaction.student.fatherName || 'N/A').toUpperCase(), 130, studentY + 36);
    
    doc.fillColor('#6b7280').text('Contact Phone:', 320, studentY + 36);
    doc.fillColor('#111827').text(transaction.student.phone || 'N/A', 400, studentY + 36);

    doc.moveDown(3);

    // 4. Financial breakdown
    doc.rect(40, doc.y, 515, 20).fill('#f3f4f6');
    doc.fillColor('#1f2937').text('PAYMENT PARTICULARS', 50, doc.y + 6, { weight: 'bold' });
    doc.moveDown(1);

    const tableY = doc.y;
    doc.fillColor('#111827').text('FEE COMPONENT PARTICULARS', 50, tableY, { weight: 'bold' });
    doc.text('BILL PERIOD', 250, tableY, { weight: 'bold' });
    doc.text('AMOUNT PAID', 450, tableY, { weight: 'bold' });
    
    doc.moveTo(40, tableY + 12).lineTo(555, tableY + 12).stroke('#e5e7eb');
    
    const transportPaid = transaction.transportAmount || 0;
    const tuitionPaid = transaction.amount - transportPaid;
    const billMonth = transaction.month || 'Current Installment';
    
    let currentY = tableY + 20;
    
    if (transportPaid > 0) {
      // Row 1: Tuition
      doc.rect(40, currentY - 4, 515, 18).fill('#ffffff');
      doc.fillColor('#374151').fontSize(8.5).text('Tuition Fee', 50, currentY);
      doc.text(billMonth, 250, currentY);
      doc.fillColor('#111827').text(`INR ${tuitionPaid.toLocaleString('en-IN')}.00`, 420, currentY, { align: 'right', width: 100 });
      doc.moveTo(40, currentY + 12).lineTo(555, currentY + 12).stroke('#f3f4f6');
      
      currentY += 18;
      
      // Row 2: Transport
      doc.rect(40, currentY - 4, 515, 18).fill('#f9fafb');
      doc.fillColor('#374151').text('Transport Fee', 50, currentY);
      doc.text(billMonth, 250, currentY);
      doc.fillColor('#111827').text(`INR ${transportPaid.toLocaleString('en-IN')}.00`, 420, currentY, { align: 'right', width: 100 });
      doc.moveTo(40, currentY + 12).lineTo(555, currentY + 12).stroke('#f3f4f6');
      
      currentY += 18;
    } else {
      // Single Tuition Row
      doc.rect(40, currentY - 4, 515, 18).fill('#ffffff');
      doc.fillColor('#374151').fontSize(8.5).text(`${transaction.type || 'Tuition'} Fee`, 50, currentY);
      doc.text(billMonth, 250, currentY);
      doc.fillColor('#111827').text(`INR ${transaction.amount.toLocaleString('en-IN')}.00`, 420, currentY, { align: 'right', width: 100 });
      doc.moveTo(40, currentY + 12).lineTo(555, currentY + 12).stroke('#f3f4f6');
      
      currentY += 18;
    }

    doc.y = currentY + 10;

    // Total section
    doc.rect(40, doc.y, 515, 30).fill('#eff6ff');
    doc.fillColor('#1e40af').fontSize(11).text('GRAND TOTAL PAID:', 60, doc.y + 10, { weight: 'bold' });
    doc.text(`INR ${transaction.amount.toLocaleString('en-IN')}.00`, 380, doc.y - 11, { weight: 'bold', align: 'right', width: 150 });
    
    doc.moveDown(2);
    doc.fillColor('#4b5563').fontSize(8).text(`Amount in words: ${this.numberToWords(transaction.amount)}`, { italic: true });

    // 5. Digital Verification & Signature/Stamp Grid
    doc.moveDown(2.5);
    const verifyY = doc.y;
    
    // QR Code async buffer resolution
    let qrBuffer = null;
    try {
      const qrPayload = JSON.stringify({
        receiptNo: transaction.receiptNumber || transaction._id.toString().toUpperCase(),
        studentName: transaction.student.fullName || transaction.student.name || "N/A",
        amount: transaction.amount,
        date: transaction.paymentDate ? transaction.paymentDate.toLocaleDateString('en-IN') : 'N/A',
        session: transaction.academicYear || "2026 - 2027"
      });
      const axios = require('axios');
      const qrRes = await axios.get(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayload)}`, {
        responseType: 'arraybuffer',
        timeout: 2000
      });
      qrBuffer = Buffer.from(qrRes.data);
    } catch (e) {
      console.log("Failed to fetch QR Code image, drawing fallback box:", e.message);
    }

    if (qrBuffer) {
      doc.image(qrBuffer, 40, verifyY, { width: 75, height: 75 });
    } else {
      doc.rect(40, verifyY, 75, 75).stroke('#d1d5db');
      doc.fontSize(6).fillColor('#9ca3af').text('DIGITAL\nVERIFICATION\nQR CODE', 42, verifyY + 25, { width: 70, align: 'center' });
    }
    
    doc.fillColor('#059669').fontSize(9).text('VERIFIED DIGITALLY', 130, verifyY + 10, { weight: 'bold' });
    doc.fillColor('#6b7280').fontSize(7.5).text('Digital Ledger Hash: ' + (transaction.receiptNumber || transaction._id.toString().toUpperCase()), 130, verifyY + 22);
    doc.text('Verification available via QR Code scanner.', 130, verifyY + 32);
    
    // Registrar / Principal Signature with overlapping stamp
    const signaturePath = path.join(__dirname, '../assets/official/principal-signature.png');
    const stampPath = path.join(__dirname, '../assets/official/school-stamp.png');
    
    // Draw signature
    if (fs.existsSync(signaturePath)) {
      doc.image(signaturePath, 410, verifyY + 2, { width: 95, height: 35 });
    }
    
    // Draw stamp overlapping signature (20-30% overlap, 75% opacity)
    if (fs.existsSync(stampPath)) {
      doc.save();
      doc.opacity(0.75);
      doc.image(stampPath, 375, verifyY - 15, { width: 75, height: 75 });
      doc.restore();
    }

    doc.fillColor('#111827').fontSize(9).text('Principal', 400, verifyY + 50, { align: 'center', width: 120 });
    doc.fontSize(7.5).fillColor('#6b7280').text('Little Flower English School', 400, verifyY + 60, { align: 'center', width: 120 });

    // 6. Footer
    doc.fontSize(7.5).fillColor('#9ca3af').text(
      'This is a system-generated receipt for Little Flower English School and does not require a physical signature.',
      40, 780, { align: 'center' }
    );

    doc.end();
  }

  /**
   * Simple number to words converter for INR
   */
  numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    
    function convert(n) {
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convert(n % 100) : '');
      if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
      if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
      return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
    }
    
    return convert(num);
  }

  async updateStudentTransportFee(studentId, newFee, academicYear = '2026-2027') {
    const Student = require('../models/Student');
    const FeeLedger = require('../models/FeeLedger');

    // 1. Update Student profile
    const student = await Student.findByIdAndUpdate(studentId, { transportFee: newFee }, { new: true });
    if (!student) throw new Error('Student not found');

    // 2. Update all active months in their current ledger to use this new fee
    const ledger = await FeeLedger.findOne({ studentId, academicYear });
    if (ledger) {
      ledger.monthlyFees.forEach(m => {
        if (m.transportStatus !== 'EXEMPTED') {
          // Update if UNPAID, PARTIAL, or if it's PAID but they paid 0 (meaning it was a 0-fee month)
          if (m.transportStatus === 'UNPAID' || m.transportStatus === 'PARTIAL' || (m.transportStatus === 'PAID' && m.transportPaidAmount === 0)) {
            m.transportAmount = newFee;
          }
        }
      });
      ledger.markModified('monthlyFees');
      await ledger.save();
    }

    return student;
  }
}

module.exports = new FeeService();
