const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');
const { USER_ROLES } = require('../config/constants');

/**
 * @route   POST /api/admin/ai/process
 * @desc    Process raw text using Gemini AI and create a draft
 * @access  Admin
 */
router.post(
    '/process',
    authenticateToken,
    authorizeRole(USER_ROLES.ADMIN),
    aiController.processText.bind(aiController)
);
console.log("AI Routes loaded");

module.exports = router;
