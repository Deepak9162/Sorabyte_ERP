const mongoose = require('mongoose');

const feeLedgerSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
      index: true,
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required (e.g., 2024-25)'],
      trim: true,
      index: true,
    },
    monthlyFees: [
      {
        month: {
          type: String,
          required: [true, 'Month name is required'],
          enum: [
            'April', 'May', 'June', 'July', 'August', 'September',
            'October', 'November', 'December', 'January', 'February', 'March'
          ],
        },
        amount: {
          type: Number,
          required: [true, 'Fee amount is required'],
          min: [0, 'Amount cannot be negative'],
        },
        paidAmount: {
          type: Number,
          default: 0,
          min: [0, 'Paid amount cannot be negative'],
        },
        status: {
          type: String,
          enum: ["PAID", "PARTIAL", "UNPAID", "EXEMPTED"],
          default: "UNPAID",
        },
        paidOn: {
          type: Date,
        },
        transportAmount: {
          type: Number,
          default: 0,
          min: [0, 'Transport amount cannot be negative'],
        },
        transportPaidAmount: {
          type: Number,
          default: 0,
          min: [0, 'Transport paid amount cannot be negative'],
        },
        transportStatus: {
          type: String,
          enum: ["PAID", "UNPAID", "EXEMPTED"],
          default: "UNPAID",
        },
      },
    ],
    totalFee: {
      type: Number,
      default: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
    },
    pendingAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast lookup of a student's ledger for a specific year
feeLedgerSchema.index({ studentId: 1, academicYear: 1 }, { unique: true });

// Pre-save middleware to calculate totals and status
feeLedgerSchema.pre('save', async function () {
  if (this.monthlyFees && this.monthlyFees.length > 0) {
    this.monthlyFees.forEach((month) => {
      // Handle Tuition Status
      if (month.status === "EXEMPTED") {
        month.amount = 0;
        month.paidAmount = 0;
      } else if (month.paidAmount >= month.amount) {
        month.status = "PAID";
      } else if (month.paidAmount > 0) {
        month.status = "PARTIAL";
      } else {
        month.status = "UNPAID";
      }

      // Handle Transport Status
      if (month.transportStatus === "EXEMPTED") {
        month.transportAmount = 0;
        month.transportPaidAmount = 0;
      } else if (month.transportPaidAmount >= month.transportAmount) {
        month.transportStatus = "PAID";
      } else if (month.transportPaidAmount > 0) {
        month.transportStatus = "PARTIAL";
      } else {
        month.transportStatus = "UNPAID";
      }
    });

    this.totalFee = this.monthlyFees.reduce((acc, curr) => acc + curr.amount + (curr.transportAmount || 0), 0);
    this.totalPaid = this.monthlyFees.reduce((acc, curr) => acc + (curr.paidAmount || 0) + (curr.transportPaidAmount || 0), 0);
    this.pendingAmount = this.totalFee - this.totalPaid;
  }
});

module.exports = mongoose.model('FeeLedger', feeLedgerSchema);
