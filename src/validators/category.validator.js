const { body, param } = require('express-validator');

const createCategoryValidator = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Category name is required')
        .isLength({ max: 100 })
        .withMessage('Name cannot exceed 100 characters'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),

    body('displayOrder')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Display order must be a positive number'),

    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean'),
];

const updateCategoryValidator = [
    param('id')
        .isMongoId()
        .withMessage('Invalid category ID'),

    body('name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Category name cannot be empty')
        .isLength({ max: 100 })
        .withMessage('Name cannot exceed 100 characters'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),

    body('displayOrder')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Display order must be a positive number'),

    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean'),
];

const categoryIdValidator = [
    param('id')
        .isMongoId()
        .withMessage('Invalid category ID'),
];

module.exports = {
    createCategoryValidator,
    updateCategoryValidator,
    categoryIdValidator,
};
