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
 * @desc    Delete a teacher (soft delete — sets isActive to false)
 * @route   DELETE /api/teachers/:id
 * @access  Public
 */
const deleteTeacher = async (req, res, next) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!teacher) {
      return errorResponse(res, 'Teacher not found', 404);
    }

    return successResponse(res, teacher, 'Teacher deactivated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard stats for logic-in teacher
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
    const classes = await Class.find({ _id: { $in: classIds } });
    classes.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    
    // Total Students across all assigned classes
    const totalStudents = classes.reduce((acc, c) => acc + (c.students ? c.students.length : 0), 0);

    // Today's Attendance Summary
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await Attendance.find({
      class: { $in: classIds },
      date: { $gte: today, $lt: tomorrow }
    });

    const presentCount = todayAttendance.filter(a => a.status === 'Present').length;
    const absentCount = todayAttendance.filter(a => a.status === 'Absent').length;

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
      }))
    }, 'Teacher stats fetched successfully');
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
};




