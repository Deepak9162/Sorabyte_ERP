/**
 * Homework Controller
 * 
 * HTTP Endpoints for Homework Management Module.
 */

const homeworkService = require('../services/homeworkService');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * @desc    Create new homework (Teacher)
 * @route   POST /api/homework
 * @access  Private (Teacher)
 */
const createHomework = async (req, res, next) => {
  try {
    const {
      classId,
      section,
      subjectId,
      homeworkDate,
      submissionDate,
      title,
      description,
      homeworkType,
      priority,
      overwrite,
    } = req.body;

    const attachment = req.homeworkAttachment || null;

    const homework = await homeworkService.createHomework({
      userId: req.user._id,
      classId,
      section,
      subjectId,
      homeworkDate,
      submissionDate,
      title,
      description,
      homeworkType,
      priority,
      attachment,
      overwrite: overwrite === true || overwrite === 'true',
    });

    return successResponse(res, homework, 'Homework submitted successfully for Class Incharge review', 201);
  } catch (error) {
    if (error.statusCode === 409) {
      return errorResponse(res, error.message, 409, { existingHomework: error.existingHomework });
    }
    next(error);
  }
};

/**
 * @desc    Update homework (Teacher)
 * @route   PUT /api/homework/:id
 * @access  Private (Teacher)
 */
const updateTeacherHomework = async (req, res, next) => {
  try {
    const { title, description, submissionDate, homeworkType, priority } = req.body;
    const attachment = req.homeworkAttachment || null;

    const homework = await homeworkService.updateTeacherHomework({
      userId: req.user._id,
      homeworkId: req.params.id,
      title,
      description,
      submissionDate,
      homeworkType,
      priority,
      attachment,
    });

    return successResponse(res, homework, 'Homework updated and resubmitted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete homework (Teacher)
 * @route   DELETE /api/homework/:id
 * @access  Private (Teacher)
 */
const deleteTeacherHomework = async (req, res, next) => {
  try {
    await homeworkService.deleteTeacherHomework({
      userId: req.user._id,
      homeworkId: req.params.id,
    });

    return successResponse(res, null, 'Homework deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get teacher's own homework history
 * @route   GET /api/homework/teacher/my-homework
 * @access  Private (Teacher)
 */
const getTeacherMyHomework = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;
    const data = await homeworkService.getTeacherMyHomework({
      userId: req.user._id,
      status,
      page,
      limit,
      search,
    });

    return successResponse(res, data, 'Teacher homework history retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Class Incharge review queue for assigned classes
 * @route   GET /api/homework/incharge/class-homework
 * @access  Private (Teacher)
 */
const getInchargeClassHomework = async (req, res, next) => {
  try {
    const { status, classId, date, page = 1, limit = 10 } = req.query;
    const data = await homeworkService.getInchargeClassHomework({
      userId: req.user._id,
      status,
      classId,
      date,
      page,
      limit,
    });

    return successResponse(res, data, 'Class Incharge homework queue retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Class Incharge approve/reject homework
 * @route   PUT /api/homework/incharge/:id/status
 * @access  Private (Teacher)
 */
const inchargeApproveOrReject = async (req, res, next) => {
  try {
    const { action, remarks } = req.body;
    const homework = await homeworkService.inchargeApproveOrReject({
      userId: req.user._id,
      homeworkId: req.params.id,
      action,
      remarks,
    });

    return successResponse(
      res,
      homework,
      `Homework ${action === 'approve' ? 'approved and forwarded to Admin' : 'rejected by Class Incharge'}`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin approve/reject homework (Final approval)
 * @route   PUT /api/homework/admin/:id/status
 * @access  Private (Admin)
 */
const adminApproveOrReject = async (req, res, next) => {
  try {
    const { action, remarks } = req.body;
    const homework = await homeworkService.adminApproveOrReject({
      user: req.user,
      homeworkId: req.params.id,
      action,
      remarks,
    });

    return successResponse(
      res,
      homework,
      `Homework ${action === 'approve' ? 'final approved' : 'rejected'} by Admin`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin bulk approve/reject homework
 * @route   PUT /api/homework/admin/bulk-status
 * @access  Private (Admin)
 */
const adminBulkStatusUpdate = async (req, res, next) => {
  try {
    const { homeworkIds, action, remarks } = req.body;
    const results = await homeworkService.adminBulkStatusUpdate({
      user: req.user,
      homeworkIds,
      action,
      remarks,
    });

    return successResponse(res, results, `Bulk ${action} completed successfully`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin view all homeworks with filtering & pagination
 * @route   GET /api/homework/admin/all
 * @access  Private (Admin)
 */
const getAllAdminHomework = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      classId,
      section,
      subjectId,
      teacherId,
      status,
      startDate,
      endDate,
      search,
    } = req.query;

    const data = await homeworkService.getAllAdminHomework({
      page,
      limit,
      classId,
      section,
      subjectId,
      teacherId,
      status,
      startDate,
      endDate,
      search,
    });

    return successResponse(res, data, 'All homework submissions retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get consolidated class homework for WhatsApp & PDF Export
 * @route   GET /api/homework/consolidated
 * @access  Private (Admin & Teacher)
 */
const getConsolidatedHomework = async (req, res, next) => {
  try {
    const { classId, section, date } = req.query;
    const data = await homeworkService.getConsolidatedHomework({
      classId,
      section,
      date,
    });

    return successResponse(res, data, 'Consolidated homework retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard metrics summary
 * @route   GET /api/homework/dashboard-summary
 * @access  Private
 */
const getDashboardSummary = async (req, res, next) => {
  try {
    const summary = await homeworkService.getDashboardSummary({
      userId: req.user._id,
      role: req.user.role,
    });

    return successResponse(res, summary, 'Dashboard summary retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get teacher's assigned classes & subject options
 * @route   GET /api/homework/teacher/assigned-options
 * @access  Private (Teacher)
 */
const getTeacherAssignedOptions = async (req, res, next) => {
  try {
    const data = await homeworkService.getTeacherAssignedOptions(req.user._id);
    return successResponse(res, data, 'Assigned options fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Class Teacher consolidated homework (derived server-side for assigned Class Teacher ONLY)
 * @route   GET /api/homework/class-teacher/consolidated
 * @access  Private (Teacher)
 */
const getClassTeacherConsolidatedHomework = async (req, res, next) => {
  try {
    const { classId, date } = req.query;
    const data = await homeworkService.getClassTeacherConsolidatedHomework({
      userId: req.user._id,
      classId,
      date,
    });
    return successResponse(res, data, 'Class Teacher consolidated homework retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createHomework,
  updateTeacherHomework,
  deleteTeacherHomework,
  getTeacherMyHomework,
  getInchargeClassHomework,
  inchargeApproveOrReject,
  adminApproveOrReject,
  adminBulkStatusUpdate,
  getAllAdminHomework,
  getConsolidatedHomework,
  getDashboardSummary,
  getTeacherAssignedOptions,
  getClassTeacherConsolidatedHomework,
};
