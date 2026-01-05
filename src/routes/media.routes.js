const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/media.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');
const upload = require('../utils/fileUpload');
const { uploadLimiter } = require('../middleware/rateLimit.middleware');
const { USER_ROLES } = require('../config/constants');

/**
 * @route   POST /api/admin/media/upload
 * @desc    Upload file (PDF or image)
 * @access  Admin
 */
router.post(
    '/upload',
    authenticateToken,
    authorizeRole(USER_ROLES.ADMIN),
    uploadLimiter,
    upload.single('file'),
    mediaController.uploadFile
);

/**
 * @route   GET /api/admin/media
 * @desc    Get all media files
 * @access  Admin
 */
router.get(
    '/',
    authenticateToken,
    authorizeRole(USER_ROLES.ADMIN),
    mediaController.getAllMedia
);

/**
 * @route   GET /api/admin/media/:id
 * @desc    Get file by ID
 * @access  Admin
 */
router.get(
    '/:id',
    authenticateToken,
    authorizeRole(USER_ROLES.ADMIN),
    mediaController.getFileById
);

/**
 * @route   DELETE /api/admin/media/:id
 * @desc    Delete file
 * @access  Admin
 */
router.delete(
    '/:id',
    authenticateToken,
    authorizeRole(USER_ROLES.ADMIN),
    mediaController.deleteFile
);

module.exports = router;
