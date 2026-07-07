/**
 * Auth Routes
 * 
 * Public:   POST /api/auth/register, POST /api/auth/login
 * Private:  GET  /api/auth/me (requires JWT)
 *           POST /api/auth/logout (marks user offline)
 *           POST /api/auth/heartbeat (keeps user online)
 */

const express = require('express');
const router = express.Router();
const { register, login, logout, heartbeat, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.post('/heartbeat', protect, heartbeat);

module.exports = router;
