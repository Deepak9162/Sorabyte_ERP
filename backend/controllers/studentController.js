/**
 * Student Controller
 * 
 * Full CRUD operations for the Student resource.
 * Errors are forwarded to the centralized error handler via next().
 */

const Student = require('../models/Student');
const Class = require('../models/Class');
const Teacher = require('../models/Teacher');
const FeeLedger = require('../models/FeeLedger');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Helper function to resolve or create a Class automatically
const getOrCreateClass = async (className, section) => {
  if (!className) return null;
  const classFullName = section ? `${className}-${section}` : className;
  
  let targetClass = await Class.findOne({ name: classFullName });
  if (!targetClass) {
    targetClass = await Class.findOne({ name: className });
  }
  
  if (!targetClass) {
    // Find a teacher to assign
    let teacher = await Teacher.findOne({});
    if (!teacher) {
      teacher = await Teacher.create({
        fullName: "Primary Class Teacher",
        email: `teacher-${className.replace(/\s+/g, '-').toLowerCase()}@lfes.com`,
        phone: "9876543210",
        gender: "Other",
        qualification: "B.Ed",
        joiningDate: new Date(),
        salary: 25000,
        status: "Active"
      });
    }
    
    targetClass = await Class.create({
      name: className,
      teacher: teacher._id,
      tuitionFee: 1500, // Default tuition fee
      isActive: true
    });
  }
  
  return targetClass;
};

/**
 * @desc    Get all students (with optional filters)
 * @route   GET /api/students
 * @access  Public
 */
const getAllStudents = async (req, res, next) => {
  try {
    const { grade, className, class: classQuery, section, isActive, page = 1, limit = 20 } = req.query;

    // Build filter object
    const filter = {};
    const cls = grade || className || classQuery;
    if (cls) {
      filter.$or = [
        { className: cls },
        { grade: cls }
      ];
    }
    if (section) filter.section = section;
    if (isActive !== undefined) {
      if (isActive === 'true') {
        // Show active OR students with no status field
        filter.status = 'Active';
      } else {
        filter.status = 'Inactive';
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [students, total] = await Promise.all([
      Student.find(filter)
        .sort({ className: 1, rollNumber: 1 })
        .collation({ locale: 'en', numericOrdering: true })
        .skip(skip)
        .limit(parseInt(limit)),
      Student.countDocuments(filter),
    ]);

    return successResponse(res, {
      students,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    }, 'Students fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single student by ID
 * @route   GET /api/students/:id
 * @access  Public
 */
const getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return errorResponse(res, 'Student not found', 404);
    }

    return successResponse(res, student, 'Student fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new student
 * @route   POST /api/students
 * @access  Public
 */
const createStudent = async (req, res, next) => {
  try {
    const isArray = Array.isArray(req.body);
    const studentsData = isArray ? req.body : [req.body];

    // Cache classes to avoid querying too many times
    const classCache = {};

    for (const data of studentsData) {
      if (data.className) {
        const cacheKey = data.section ? `${data.className}-${data.section}` : data.className;
        let targetClass = classCache[cacheKey];
        
        if (!targetClass) {
          targetClass = await getOrCreateClass(data.className, data.section);
          if (targetClass) {
            classCache[cacheKey] = targetClass;
          }
        }
        
        if (targetClass) {
          data.class = targetClass._id;
        }
      }
    }

    const createdStudents = await Student.create(studentsData);

    // Update class references
    const createdArray = Array.isArray(createdStudents) ? createdStudents : [createdStudents];
    for (const student of createdArray) {
      if (student.class) {
        await Class.findByIdAndUpdate(student.class, {
          $addToSet: { students: student._id }
        });
      }
    }

    return successResponse(
      res, 
      isArray ? createdStudents : createdStudents[0], 
      `${isArray ? 'Students' : 'Student'} created successfully`, 
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a student
 * @route   PUT /api/students/:id
 * @access  Public
 */
const updateStudent = async (req, res, next) => {
  try {
    const oldStudent = await Student.findById(req.params.id);
    if (!oldStudent) {
      return errorResponse(res, 'Student not found', 404);
    }

    // Resolve class if className or section is modified
    if (req.body.className !== undefined || req.body.section !== undefined) {
      const className = req.body.className !== undefined ? req.body.className : oldStudent.className;
      const section = req.body.section !== undefined ? req.body.section : oldStudent.section;
      
      const targetClass = await getOrCreateClass(className, section);
      if (targetClass) {
        req.body.class = targetClass._id;
      }
    }

    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // If class has changed, remove from old class and add to new class
    if (oldStudent.class && student.class && oldStudent.class.toString() !== student.class.toString()) {
      // Remove from old class
      await Class.findByIdAndUpdate(oldStudent.class, {
        $pull: { students: student._id }
      });
      // Add to new class
      if (student.status === 'Active') {
        await Class.findByIdAndUpdate(student.class, {
          $addToSet: { students: student._id }
        });
      }
    } else if (!oldStudent.class && student.class && student.status === 'Active') {
      // Add to new class
      await Class.findByIdAndUpdate(student.class, {
        $addToSet: { students: student._id }
      });
    }

    // If status has changed, update class student list accordingly
    if (oldStudent.status !== student.status && student.class) {
      if (student.status === 'Active') {
        await Class.findByIdAndUpdate(student.class, {
          $addToSet: { students: student._id }
        });
      } else {
        await Class.findByIdAndUpdate(student.class, {
          $pull: { students: student._id }
        });
      }
    }

    // Sync ledger if transport details have changed
    if (req.body.transportMode !== undefined || req.body.transportFee !== undefined) {
      const populatedStudent = await Student.findById(student._id).populate('class');
      if (populatedStudent && populatedStudent.class) {
        const feeService = require('../services/feeService');
        await feeService.ensureFeeLedger(
          populatedStudent._id,
          populatedStudent.session || '2026-2027',
          populatedStudent.class.tuitionFee || 0
        );
      }
    }

    return successResponse(res, student, 'Student updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a student (soft delete — sets status to Inactive)
 * @route   DELETE /api/students/:id
 * @access  Public
 */
const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { status: 'Inactive' },
      { new: true }
    );

    if (!student) {
      return errorResponse(res, 'Student not found', 404);
    }

    // Pull student from class.students array since they are now inactive/deleted
    if (student.class) {
      await Class.findByIdAndUpdate(student.class, {
        $pull: { students: student._id }
      });
    }

    return successResponse(res, student, 'Student deactivated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a student's full profile (including fee summary)
 * @route   GET /api/students/:studentId/profile
 * @access  Public
 */
const getStudentProfile = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    // 1. Fetch Student details
    // Support both custom studentId (e.g., STU-2026-0001) and MongoDB _id as fallback
    let student = await Student.findOne({ studentId });
    
    // Fallback to searching by MongoDB _id if not found by studentId
    if (!student && /^[0-9a-fA-F]{24}$/.test(studentId)) {
      student = await Student.findById(studentId);
    }

    if (!student) {
      return errorResponse(res, 'Student not found', 404);
    }

    // 2. Fetch the latest FeeLedger for the student
    const feeLedger = await FeeLedger.findOne({ studentId: student._id })
      .sort({ createdAt: -1 });

    // 3. Construct clean, frontend-ready JSON
    const response = {
      _id: student._id,
      personalDetails: {
        _id: student._id,
        name: student.fullName,
        fullName: student.fullName,
        studentId: student.studentId,
        rollNumber: student.rollNumber,
        admissionNumber: student.admissionNumber,
        admissionDate: student.admissionDate || student.createdAt,
        discountPercentage: student.discountPercentage || 0,
        previousSchool: student.previousSchool || '',
        status: student.status,
        gender: student.gender,
        dob: student.dob,
        studentPhoto: student.studentPhoto,
        bloodGroup: student.bloodGroup,
        cast: student.cast,
        aadhar: student.aadhar,
        qrCode: student.qrCode,
        barcode: student.barcode,
        customFields: student.customFields || {},
      },
      academicDetails: {
        className: student.className || student.grade || 'N/A',
        section: student.section,
        session: student.session,
      },
      contactDetails: {
        address: student.address,
        phone: student.phone,
        fatherName: student.fatherName,
        motherName: student.motherName,
        parentName: student.fatherName || student.motherName, // Backward compatibility
        parentMobile: student.emergencyContact, // Backward compatibility
        emergencyContact: student.emergencyContact,
      },
      feeSummary: feeLedger ? {
        academicYear: feeLedger.academicYear,
        totalFee: feeLedger.totalFee,
        totalPaid: feeLedger.totalPaid,
        pendingAmount: feeLedger.pendingAmount,
        monthlyFees: feeLedger.monthlyFees,
      } : {
        message: 'No fee record found for this academic year',
        totalFee: 0,
        totalPaid: 0,
        pendingAmount: 0,
        monthlyFees: [],
      }
    };

    return successResponse(res, response, 'Student profile fetched successfully');
  } catch (error) {
    next(error);
  }
};

const getLatestAdmissionStats = async (req, res, next) => {
  try {
    const totalStudents = await Student.countDocuments();
    // Sort by createdAt descending to find the last added student
    const lastStudent = await Student.findOne().sort({ createdAt: -1 });
    
    let nextAdmissionNumber = "1001";
    let lastAdmissionNumber = null;
    
    if (lastStudent && lastStudent.admissionNumber) {
      let currentNumber = lastStudent.admissionNumber;
      lastAdmissionNumber = currentNumber;
      let isUnique = false;
      
      while (!isUnique) {
        const numMatch = currentNumber.match(/\d+$/);
        if (numMatch) {
          const numPart = numMatch[0];
          const nextNum = parseInt(numPart, 10) + 1;
          const nextNumStr = nextNum.toString().padStart(numPart.length, '0');
          nextAdmissionNumber = currentNumber.replace(new RegExp(numPart + '$'), nextNumStr);
        } else {
          nextAdmissionNumber = currentNumber + "-1";
        }
        
        const existing = await Student.findOne({ admissionNumber: nextAdmissionNumber });
        if (!existing) {
          isUnique = true;
        } else {
          currentNumber = nextAdmissionNumber;
        }
      }
    } else {
      while (await Student.findOne({ admissionNumber: nextAdmissionNumber })) {
        nextAdmissionNumber = (parseInt(nextAdmissionNumber, 10) + 1).toString();
      }
    }
    
    return successResponse(res, {
      totalStudents,
      lastAdmissionNumber,
      nextAdmissionNumber
    }, 'Latest admission stats fetched');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  getStudentProfile,
  createStudent,
  updateStudent,
  deleteStudent,
  getLatestAdmissionStats,
};
