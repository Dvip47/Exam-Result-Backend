const express = require('express');
const router = express.Router();
const postController = require('../../controllers/post.controller');
const { postSlugValidator } = require('../../validators/post.validator');
const validate = require('../../middleware/validation.middleware');

/**
 * @route   GET /api/posts
 * @desc    Get published posts (public)
 * @access  Public
 * @query   ?category=slug&page=1&limit=20
 */
router.get('/', postController.getPublishedPosts);

/**
 * @route   GET /api/posts/slug/:slug
 * @desc    Get post by slug (public)
 * @access  Public
 */
router.get('/slug/:slug', postSlugValidator, validate, postController.getPostBySlug);

module.exports = router;
