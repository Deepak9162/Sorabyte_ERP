const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth');
const admissionUpload = require('../middleware/admissionUpload');
const {
  createRequest,
  updateRequest,
  getRequests,
  getRequestDetails,
  deleteRequest,
  submitDraft,
  reviewRequest,
  addComment,
  directAdmission
} = require('../controllers/admissionRequestController');

// All routes require authentication
router.use(protect);

router.post('/direct-admission', isAdmin, admissionUpload, directAdmission);

router.route('/')
  .post(admissionUpload, createRequest)
  .get(getRequests);

router.route('/:id')
  .get(getRequestDetails)
  .put(admissionUpload, updateRequest)
  .delete(deleteRequest);

router.post('/:id/submit', submitDraft);
router.post('/:id/review', isAdmin, reviewRequest);
router.post('/:id/comments', addComment);

module.exports = router;
