const mongoose = require('mongoose');

const admissionRequestSchema = new mongoose.Schema(
  {
    studentInfo: {
      fullName: {
        type: String,
        required: [true, 'Student full name is required'],
        trim: true
      },
      gender: {
        type: String,
        required: [true, 'Gender is required'],
        enum: {
          values: ['Male', 'Female', 'Other'],
          message: '{VALUE} is not a valid gender'
        }
      },
      dob: {
        type: Date,
        required: [true, 'Date of birth is required']
      },
      admissionClass: {
        type: String,
        required: [true, 'Admission class is required'],
        trim: true
      },
      section: {
        type: String,
        trim: true,
        default: 'A'
      },
      bloodGroup: {
        type: String,
        trim: true,
        enum: {
          values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
          message: '{VALUE} is not a valid blood group'
        },
        default: 'Unknown'
      },
      category: {
        type: String,
        trim: true,
        default: 'General'
      },
      religion: {
        type: String,
        trim: true,
        default: 'Other'
      },
      nationality: {
        type: String,
        trim: true,
        default: 'Indian'
      },
      aadhar: {
        type: String,
        trim: true,
        default: ''
      },
      birthCertificateNumber: {
        type: String,
        trim: true,
        default: ''
      },
      previousSchool: {
        type: String,
        trim: true,
        default: ''
      },
      transferCertificateNumber: {
        type: String,
        trim: true,
        default: ''
      },
      studentPhoto: {
        type: String,
        default: ''
      }
    },
    parentInfo: {
      fatherName: {
        type: String,
        required: [true, "Father's name is required"],
        trim: true
      },
      motherName: {
        type: String,
        required: [true, "Mother's name is required"],
        trim: true
      },
      guardianName: {
        type: String,
        trim: true,
        default: ''
      },
      occupation: {
        type: String,
        trim: true,
        default: ''
      },
      phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
      },
      alternativePhone: {
        type: String,
        trim: true,
        default: ''
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
      },
      annualIncome: {
        type: Number,
        default: 0
      }
    },
    address: {
      currentAddress: {
        type: String,
        trim: true,
        default: ''
      },
      permanentAddress: {
        type: String,
        trim: true,
        default: ''
      },
      city: {
        type: String,
        trim: true,
        default: ''
      },
      state: {
        type: String,
        trim: true,
        default: ''
      },
      country: {
        type: String,
        trim: true,
        default: 'India'
      },
      pinCode: {
        type: String,
        trim: true,
        default: ''
      }
    },
    emergencyContact: {
      contactPerson: {
        type: String,
        required: [true, 'Emergency contact person name is required'],
        trim: true
      },
      relationship: {
        type: String,
        required: [true, 'Relationship is required'],
        trim: true
      },
      phone: {
        type: String,
        required: [true, 'Emergency contact phone number is required'],
        trim: true
      }
    },
    medicalInfo: {
      medicalConditions: {
        type: String,
        trim: true,
        default: ''
      },
      allergies: {
        type: String,
        trim: true,
        default: ''
      },
      disability: {
        type: String,
        trim: true,
        default: ''
      },
      doctorName: {
        type: String,
        trim: true,
        default: ''
      },
      doctorContact: {
        type: String,
        trim: true,
        default: ''
      }
    },
    transport: {
      busRequired: {
        type: Boolean,
        default: false
      },
      pickupPoint: {
        type: String,
        trim: true,
        default: ''
      },
      dropPoint: {
        type: String,
        trim: true,
        default: ''
      }
    },
    hostel: {
      hostelRequired: {
        type: Boolean,
        default: false
      },
      roomPreference: {
        type: String,
        trim: true,
        default: ''
      }
    },
    documents: {
      birthCertificate: { type: String, default: '' },
      transferCertificate: { type: String, default: '' },
      previousMarksheet: { type: String, default: '' },
      aadharCard: { type: String, default: '' },
      studentPhotograph: { type: String, default: '' },
      parentPhotograph: { type: String, default: '' },
      otherDocuments: { type: String, default: '' }
    },
    additionalNotes: {
      remarks: { type: String, trim: true, default: '' },
      teacherComments: { type: String, trim: true, default: '' },
      specialRecommendation: { type: String, trim: true, default: '' }
    },
    status: {
      type: String,
      enum: ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Cancelled'],
      default: 'Draft',
      index: true
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
      index: true
    },
    submittedAt: {
      type: Date
    },
    reviewedAt: {
      type: Date
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewNotes: {
      type: String,
      trim: true,
      default: ''
    },
    timeline: [
      {
        action: { type: String, required: true },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        performedByName: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        notes: { type: String, default: '' }
      }
    ],
    activityLogs: [
      {
        action: { type: String, required: true },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        details: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
admissionRequestSchema.index({ 'studentInfo.fullName': 'text', 'parentInfo.fatherName': 'text', 'parentInfo.phone': 'text' });
admissionRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdmissionRequest', admissionRequestSchema);
