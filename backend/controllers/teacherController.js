/**
 * Teacher Controller
 * 
 * Full CRUD operations for the Teacher resource.
 * Errors are forwarded to the centralized error handler via next().
 */

const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * @desc    Get all teachers (with optional filters)
 * @route   GET /api/teachers
 * @access  Public
 */
const getAllTeachers = async (req, res, next) => {
  try {
    const { subject, isActive, page = 1, limit = 20 } = req.query;

    // Build filter object
    const filter = {};
    if (subject) filter.subject = subject;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [teachers, total] = await Promise.all([
      Teacher.find(filter)
        .populate('user', 'isOnline lastSeen isActive name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Teacher.countDocuments(filter),
    ]);

    return successResponse(res, {
      teachers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    }, 'Teachers fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single teacher by ID
 * @route   GET /api/teachers/:id
 * @access  Public
 */
const getTeacherById = async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return errorResponse(res, 'Teacher not found', 404);
    }

    return successResponse(res, teacher, 'Teacher fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new teacher (supports single & bulk)
 * @route   POST /api/teachers
 * @access  Public
 */
const createTeacher = async (req, res, next) => {
  try {
    const data = req.body;

    // 🔹 BULK INSERT SUPPORT
    if (Array.isArray(data)) {
      if (!data.length) {
        return errorResponse(res, "Teacher array is empty", 400);
      }

      for (const teacher of data) {
        if (!teacher.user) {
          return errorResponse(res, "Missing user in one of the teacher records", 400);
        }
      }

      const teachers = await Teacher.insertMany(data);
      return successResponse(res, {
        teachers,
        count: teachers.length
      }, 'Teachers added successfully', 201);
    }

    // 🔹 SINGLE INSERT SUPPORT
    if (!data.user) {
      return errorResponse(res, "Missing user or teacher data", 400);
    }

    const teacher = await Teacher.create(data);
    return successResponse(res, teacher, 'Teacher created successfully', 201);

  } catch (error) {
    console.error("Create teacher error:", error);
    next(error);
  }
};

/**
 * @desc    Update a teacher
 * @route   PUT /api/teachers/:id
 * @access  Public
 */
const updateTeacher = async (req, res, next) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!teacher) {
      return errorResponse(res, 'Teacher not found', 404);
    }

    return successResponse(res, teacher, 'Teacher updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a teacher (permanently deletes teacher and associated user account)
 * @route   DELETE /api/teachers/:id
 * @access  Public
 */
const deleteTeacher = async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return errorResponse(res, 'Teacher not found', 404);
    }

    const mongoose = require('mongoose');
    // Delete the associated User account if it exists (handles both populated object and unpopulated ID)
    const userId = teacher.user && (teacher.user._id || teacher.user);
    if (userId) {
      await mongoose.model('User').findByIdAndDelete(userId);
    }

    // Also delete any User account with the same email as a fallback (case-insensitive)
    if (teacher.email) {
      await mongoose.model('User').findOneAndDelete({ email: teacher.email.toLowerCase() });
    }

    // Clean up associated class-subject mappings
    await mongoose.model('ClassSubject').deleteMany({ teacher: req.params.id });

    // Delete the Teacher document
    await Teacher.findByIdAndDelete(req.params.id);

    return successResponse(res, null, 'Teacher and associated user account deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard stats for logged-in teacher
 * @route   GET /api/teachers/dashboard/stats
 * @access  Private (Teacher)
 */
const getTeacherDashboardStats = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ user: req.user._id });
    if (!teacher) {
      return errorResponse(res, 'Teacher profile not found', 404);
    }

    // Robustly fetch all unique classes assigned to this teacher
    const timetableService = require('../services/timetableService');
    const assignedClassesList = await timetableService.getTeacherAssignedClasses(req.user._id);
    const classIds = assignedClassesList.map(c => c._id);

    // Fetch full Class documents for the assigned classes to calculate student counts
    const mongoose = require('mongoose');
    const rawClasses = await Class.find({ _id: { $in: classIds } });
    
    // Find class(es) where this teacher is the Class Teacher
    const rawClassTeacherClasses = await Class.find({ teacher: teacher._id, isActive: true })
      .select('name'); // We don't need the static students field

    const allQueryClassIds = [
      ...new Set([
        ...classIds.map(id => id.toString()),
        ...rawClassTeacherClasses.map(c => c._id.toString())
      ])
    ].map(id => new mongoose.Types.ObjectId(id));
    
    const studentGroups = await Student.aggregate([
      { $match: { class: { $in: allQueryClassIds }, status: 'Active' } },
      { $group: { _id: '$class', studentIds: { $push: '$_id' } } }
    ]);

    const studentMap = new Map();
    studentGroups.forEach(g => {
      if (g._id) {
        studentMap.set(g._id.toString(), g.studentIds);
      }
    });

    const classes = rawClasses.map(c => {
      const cObj = c.toObject();
      cObj.students = studentMap.get(c._id.toString()) || [];
      return cObj;
    });
    classes.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    const classTeacherClasses = rawClassTeacherClasses.map(c => {
      const cObj = c.toObject();
      cObj.students = studentMap.get(c._id.toString()) || [];
      return cObj;
    });
    classTeacherClasses.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    // Total Students across all assigned classes
    const totalStudents = classes.reduce((acc, c) => acc + (c.students ? c.students.length : 0), 0);

    // Today's attendance summary — scoped to Class Teacher classes only
    const classTeacherIds = classTeacherClasses.map(c => c._id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await Attendance.find({
      class: { $in: classTeacherIds.length > 0 ? classTeacherIds : classIds },
      date: { $gte: today, $lt: tomorrow }
    }).select('status student class');

    let presentCount = 0;
    let absentCount = 0;
    todayAttendance.forEach(att => {
      if (att.status === 'Present') presentCount++;
      else if (att.status === 'Absent') absentCount++;
    });

    const extendedAbsenceService = require('../services/extendedAbsenceService');
    let extendedAbsenceAlerts = { available: true, totalAlertCount: 0, criticalCount: 0, warningCount: 0, students: [] };
    try {
      extendedAbsenceAlerts = await extendedAbsenceService.getExtendedAbsenceAlerts({
        classIds: allQueryClassIds,
        threshold: 8
      });
    } catch (e) {
      console.error('Failed to attach extendedAbsenceAlerts to teacher dashboard stats:', e);
    }

    return successResponse(res, {
      totalClasses: classes.length,
      totalStudents,
      attendanceSummary: {
        present: presentCount,
        absent: absentCount,
        totalMarked: todayAttendance.length
      },
      assignedClasses: classes.map(c => ({
        id: c._id,
        name: c.name,
        studentCount: c.students ? c.students.length : 0
      })),
      // Class Teacher specific data
      classTeacherOf: classTeacherClasses.map(c => ({
        id: c._id,
        name: c.name,
        studentCount: c.students ? c.students.length : 0
      })),
      extendedAbsenceAlerts
    }, 'Teacher stats fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get the class(es) where the logged-in teacher is the Class Teacher
 * @route   GET /api/teachers/my-class
 * @access  Private (Teacher)
 */
const getMyClass = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ user: req.user._id });
    if (!teacher) {
      return errorResponse(res, 'Teacher profile not found', 404);
    }

    const classes = await Class.find({ teacher: teacher._id, isActive: true })
      .populate('teacher', 'firstName lastName')
      .select('name section students teacher tuitionFee isActive');

    classes.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    return successResponse(res, classes, 'Class Teacher assignment fetched successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getTeacherDashboardStats,
  getMyClass,
};




