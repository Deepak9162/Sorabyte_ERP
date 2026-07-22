/**
 * Leave Routes
 * 
 * Defines endpoints for teacher leave requests and admin approvals.
 */

const express = require('express');
const router = express.Router();
const {
  applyLeave,
  getMyLeaves,
  getAdminLeaves,
  approveLeave,
  rejectLeave,
  cancelLeave,
} = require('../controllers/leaveController');
const { protect, isAdmin } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Teacher routes
router.post('/', applyLeave);
router.get('/my', getMyLeaves);

// Admin routes
router.get('/admin', isAdmin, getAdminLeaves);
router.put('/:id/approve', isAdmin, approveLeave);
router.put('/:id/reject', isAdmin, rejectLeave);

// Shared route (Teacher or Admin)
router.put('/:id/cancel', cancelLeave);

module.exports = router;
