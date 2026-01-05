const express = require('express');
const router = express.Router();
const categoryController = require('../../controllers/category.controller');

/**
 * @route   GET /api/categories
 * @desc    Get active categories (public)
 * @access  Public
 */
router.get('/', categoryController.getActiveCategories);

module.exports = router;
