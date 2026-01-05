const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');
const { createCategoryValidator, updateCategoryValidator, categoryIdValidator } = require('../validators/category.validator');
const validate = require('../middleware/validation.middleware');
const { USER_ROLES } = require('../config/constants');

/**
 * Admin routes (protected)
 */

/**
 * @route   GET /api/admin/categories
 * @desc    Get all categories
 * @access  Admin
 */
router.get(
    '/',
    authenticateToken,
    authorizeRole(USER_ROLES.ADMIN),
    categoryController.getAllCategories
);

/**
 * @route   POST /api/admin/categories
 * @desc    Create new category
 * @access  Admin
 */
router.post(
    '/',
    authenticateToken,
    authorizeRole(USER_ROLES.ADMIN),
    createCategoryValidator,
    validate,
    categoryController.createCategory
);

/**
 * @route   GET /api/admin/categories/:id
 * @desc    Get category by ID
 * @access  Admin
 */
router.get(
    '/:id',
    authenticateToken,
    authorizeRole(USER_ROLES.ADMIN),
    categoryIdValidator,
    validate,
    categoryController.getCategoryById
);

/**
 * @route   PUT /api/admin/categories/:id
 * @desc    Update category
 * @access  Admin
 */
router.put(
    '/:id',
    authenticateToken,
    authorizeRole(USER_ROLES.ADMIN),
    updateCategoryValidator,
    validate,
    categoryController.updateCategory
);

/**
 * @route   DELETE /api/admin/categories/:id
 * @desc    Delete category (soft delete)
 * @access  Admin
 */
router.delete(
    '/:id',
    authenticateToken,
    authorizeRole(USER_ROLES.ADMIN),
    categoryIdValidator,
    validate,
    categoryController.deleteCategory
);

module.exports = router;
