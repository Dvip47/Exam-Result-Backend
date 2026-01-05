const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../config/constants');

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Admin
 */
router.get(
    '/stats',
    authenticateToken,
    authorizeRole(USER_ROLES.ADMIN),
    dashboardController.getStats
);

module.exports = router;
