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
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

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

/**
 * @route   POST /api/admin/ai/create-by-title
 * @desc    Agent-2: Create Draft from Title Only
 * @access  Admin
 */
router.post(
    '/create-by-title',
    authenticateToken,
    authorizeRole(USER_ROLES.ADMIN),
    aiController.createFromTitle.bind(aiController)
);

/**
 * @route   POST /api/admin/ai/bulk-create
 * @desc    Agent-2: Bulk Create from Excel
 * @access  Admin
 */
router.post(
    '/bulk-create',
    authenticateToken,
    authorizeRole(USER_ROLES.ADMIN),
    upload.single('file'),
    aiController.processBulkExcel.bind(aiController)
);
console.log("AI Routes loaded");

module.exports = router;
