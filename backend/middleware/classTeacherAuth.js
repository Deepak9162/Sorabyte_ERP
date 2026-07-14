/**
 * Class Teacher Authorization Middleware
 * 
 * Enforces that only the assigned Class Teacher (or Admin) can perform
 * attendance operations on a specific class. This is the core RBAC
 * enforcement for the attendance authorization system.
 * 
 * Usage:
 *   verifyClassTeacher('classId', 'body')   — reads classId from req.body
 *   verifyClassTeacher('classId', 'query')  — reads classId from req.query
 *   verifyClassTeacher('classId', 'params') — reads classId from req.params
 */

const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const { errorResponse } = require('../utils/apiResponse');

/**
 * Creates middleware that verifies the logged-in user is the Class Teacher
 * of the specified class, or is an Admin.
 * 
 * @param {string} classIdField - The field name containing the class ID
 * @param {string} source - Where to read classIdField from: 'body', 'query', or 'params'
 * @returns {Function} Express middleware
 */
const verifyClassTeacher = (classIdField = 'classId', source = 'body') => {
  return async (req, res, next) => {
    try {
      // Admins have full access — bypass class teacher check
      if (req.user && req.user.role === 'admin') {
        return next();
      }

      // Extract classId from the specified source
      let classId;
      if (source === 'body') {
        classId = req.body[classIdField];
      } else if (source === 'query') {
        classId = req.query[classIdField];
      } else if (source === 'params') {
        classId = req.params[classIdField];
      }

      if (!classId) {
        return errorResponse(res, 'Class ID is required for authorization', 400);
      }

      // Find the teacher profile linked to the logged-in user
      const teacher = await Teacher.findOne({ user: req.user._id });
      if (!teacher) {
        return errorResponse(
          res,
          'Teacher profile not found. Please contact your administrator.',
          403
        );
      }

      // Find the class and verify ownership
      const cls = await Class.findById(classId);
      if (!cls) {
        return errorResponse(res, 'Class not found', 404);
      }

      if (!cls.isActive) {
        return errorResponse(res, 'This class is currently inactive', 403);
      }

      // Core authorization check: Is this teacher the Class Teacher?
      const isClassTeacher = cls.teacher && cls.teacher.toString() === teacher._id.toString();
      if (!isClassTeacher) {
        return errorResponse(
          res,
          'Only the assigned Class Teacher can manage attendance for this class.',
          403
        );
      }

      // Attach teacher and class info to request for downstream use
      req.teacherProfile = teacher;
      req.classInfo = cls;

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { verifyClassTeacher };
