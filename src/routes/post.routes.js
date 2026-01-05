const express = require('express');
const router = express.Router();
const postController = require('../controllers/post.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');
const { createPostValidator, updatePostValidator, postIdValidator } = require('../validators/post.validator');
const validate = require('../middleware/validation.middleware');
const { USER_ROLES } = require('../config/constants');

/**
 * Admin routes (protected)
 */

/**
 * @route   GET /api/admin/posts
 * @desc    Get all posts with filters
 * @access  Admin
 * @query   ?category=id&status=published&search=keyword&page=1&limit=20
 */
router.get(
    '/',
    authenticateToken,
    authorizeRole(USER_ROLES.ADMIN),
    postController.getAllPosts
);

/**
 * @route   POST /api/admin/posts
 * @desc    Create new post
 * @access  Admin
 */
router.post(
    '/',
    authenticateToken,
    authorizeRole(USER_ROLES.ADMIN),
    createPostValidator,
    validate,
    postController.createPost
);

/**
 * @route   GET /api/admin/posts/:id
 * @desc    Get post by ID
 * @access  Admin
 */
router.get(
    '/:id',
    authenticateToken,
    authorizeRole(USER_ROLES.ADMIN),
    postIdValidator,
    validate,
    postController.getPostById
);

/**
 * @route   PUT /api/admin/posts/:id
 * @desc    Update post
 * @access  Admin
 */
router.put(
    '/:id',
    authenticateToken,
    authorizeRole(USER_ROLES.ADMIN),
    updatePostValidator,
    validate,
    postController.updatePost
);

/**
 * @route   DELETE /api/admin/posts/:id
 * @desc    Delete post (soft delete)
 * @access  Admin
 */
router.delete(
    '/:id',
    authenticateToken,
    authorizeRole(USER_ROLES.ADMIN),
    postIdValidator,
    validate,
    postController.deletePost
);

module.exports = router;
