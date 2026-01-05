const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken, authenticateRefreshToken } = require('../middleware/auth.middleware');
const { registerValidator, loginValidator, refreshTokenValidator } = require('../validators/auth.validator');
const validate = require('../middleware/validation.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');

/**
 * @route   POST /api/auth/register
 * @desc    Register new admin user
 * @access  Protected (admin only - implemented in controller or via middleware)
 */
router.post('/register', authLimiter, registerValidator, validate, authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authLimiter, loginValidator, validate, authController.login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public (but requires valid refresh token)
 */
router.post('/refresh', refreshTokenValidator, validate, authenticateRefreshToken, authController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate refresh token)
 * @access  Protected
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged-in user
 * @access  Protected
 */
router.get('/me', authenticateToken, authController.me);

module.exports = router;
