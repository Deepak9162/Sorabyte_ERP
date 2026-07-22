/**
 * Leave Controller
 * 
 * Express endpoints for Leave Requests and Admin Approvals.
 */

const leaveService = require('../services/leaveService');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * @desc    Submit a new leave request (Teacher)
 * @route   POST /api/leaves
 * @access  Private (Teacher)
 */
const applyLeave = async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    const leave = await leaveService.applyLeave({
      userId: req.user._id,
      leaveType,
      startDate,
      endDate,
      reason,
    });

    return successResponse(res, leave, 'Leave request submitted successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user's leave requests (Teacher)
 * @route   GET /api/leaves/my
 * @access  Private (Teacher)
 */
const getMyLeaves = async (req, res, next) => {
  try {
    const leaves = await leaveService.getTeacherLeaves(req.user._id);
    return successResponse(res, leaves, 'My leave requests fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all leave requests with filters (Admin)
 * @route   GET /api/leaves/admin
 * @access  Private (Admin)
 */
const getAdminLeaves = async (req, res, next) => {
  try {
    const leaves = await leaveService.getAdminLeaves(req.query);
    return successResponse(res, leaves, 'Leave requests fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve a leave request (Admin)
 * @route   PUT /api/leaves/:id/approve
 * @access  Private (Admin)
 */
const approveLeave = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const leave = await leaveService.approveLeave(req.params.id, req.user._id, remarks);
    return successResponse(res, leave, 'Leave request approved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject a leave request (Admin)
 * @route   PUT /api/leaves/:id/reject
 * @access  Private (Admin)
 */
const rejectLeave = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const leave = await leaveService.rejectLeave(req.params.id, req.user._id, remarks);
    return successResponse(res, leave, 'Leave request rejected');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel a leave request (Teacher/Admin)
 * @route   PUT /api/leaves/:id/cancel
 * @access  Private (Teacher/Admin)
 */
const cancelLeave = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const leave = await leaveService.cancelLeave(req.params.id, req.user._id, req.user.role, reason);
    return successResponse(res, leave, 'Leave request cancelled');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyLeave,
  getMyLeaves,
  getAdminLeaves,
  approveLeave,
  rejectLeave,
  cancelLeave,
};
