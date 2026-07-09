/**
 * Student Model
 * 
 * A professional, highly scalable Mongoose schema designed for a School ERP.
 * Integrates auto-increment student ID generation, precise field validation,
 * and performance-optimized indexes.
 */

const mongoose = require('mongoose');
const Counter = require('./Counter');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const studentSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      index: true,
    },
    admissionNumber: {
      type: String,
      required: [true, 'Admission number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    studentId: {
      type: String,
      unique: true,
      trim: true,
      index: true,
    },
    rollNumber: {
      type: String,
      required: [true, 'Roll number is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          // Allow empty string, but validate format if populated
          return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: 'Please enter a valid email address',
      },
    },
    phone: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: {
        values: ['Male', 'Female', 'Other'],
        message: '{VALUE} is not a valid gender (Choose Male, Female, or Other)',
      },
    },
    dob: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    bloodGroup: {
      type: String,
      trim: true,
      enum: {
        values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
        message: '{VALUE} is not a valid blood group',
      },
      default: 'Unknown',
    },
    address: {
      type: String,
      trim: true,
    },
    className: {
      type: String,
      required: [true, 'Class name is required (e.g. 10th Standard)'],
      trim: true,
      index: true,
    },
    section: {
      type: String,
      trim: true,
      default: 'A',
    },
    aadhar: {
      type: String,
      trim: true,
      default: '',
    },
    cast: {
      type: String,
      trim: true,
      default: '',
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      index: true,
    },
    admissionDate: {
      type: Date,
      default: Date.now,
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%'],
    },
    previousSchool: {
      type: String,
      trim: true,
      default: '',
    },
    session: {
      type: String,
      required: [true, 'Academic session is required (e.g. 2026-2027)'],
      trim: true,
    },
    fatherName: {
      type: String,
      required: [true, "Father's name is required"],
      trim: true,
    },
    motherName: {
      type: String,
      required: [true, "Mother's name is required"],
      trim: true,
    },
    emergencyContact: {
      type: String,
      required: [true, 'Emergency contact number is required'],
      trim: true,
    },
    transportMode: {
      type: String,
      enum: {
        values: ['School Bus', 'Private', 'Self', 'Walking'],
        message: '{VALUE} is not a valid transport mode',
      },
      default: 'Private',
    },
    hostelRequired: {
      type: Boolean,
      default: false,
    },
    studentPhoto: {
      type: String,
      default: '',
    },
    qrCode: {
      type: String,
      default: '',
    },
    barcode: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['Active', 'Inactive', 'Suspended', 'Alumni'],
        message: '{VALUE} is not a valid status',
      },
      default: 'Active',
      index: true,
    },
    customFields: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true, // Auto-generates createdAt and updatedAt timestamps
  }
);

// Pre-save hook to auto-generate unique studentId sequence & write custom QR code image
studentSchema.pre('save', async function () {
  const isNewRecord = !this.studentId;

  if (isNewRecord) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { name: 'studentId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      const year = new Date().getFullYear();
      const sequence = counter.seq.toString().padStart(4, '0');
      this.studentId = `STU-${year}-${sequence}`;
    } catch (err) {
      throw err;
    }
  }

  // Generate QR Code image automatically on save
  try {
    const qrDir = path.join(__dirname, '../uploads/students');
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }

    const qrFileName = `qr-${this.studentId}.png`;
    const qrFilePath = path.join(qrDir, qrFileName);
    const qrPayload = JSON.stringify({
      studentId: this.studentId,
      fullName: this.fullName,
      class: this.className,
      schoolName: 'Little Flower English School'
    });

    // Write QR to file using qrcode npm package
    await QRCode.toFile(qrFilePath, qrPayload, {
      color: {
        dark: '#1e293b', // Slate 800
        light: '#ffffff' // White bg
      },
      width: 250
    });

    // Save relative public path
    this.qrCode = `/uploads/students/${qrFileName}`;
    
    // Barcode placeholder fallback
    if (!this.barcode) this.barcode = `LFES-BAR-${this.studentId}`;
  } catch (err) {
    throw err;
  }
});

// Performance optimization: Compound index for unique roll number within a class in the active session
studentSchema.index({ className: 1, session: 1, rollNumber: 1 }, { unique: true });
studentSchema.index({ className: 1, section: 1, status: 1 }); // Frequently queried
studentSchema.index({ admissionNumber: 1 }); // Frequently queried for uniqueness/search

module.exports = mongoose.model('Student', studentSchema);
