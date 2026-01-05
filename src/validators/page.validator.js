const { body, param } = require('express-validator');

const createPageValidator = [
    body('title')
        .trim()
        .notEmpty()
        .withMessage('Page title is required')
        .isLength({ max: 200 })
        .withMessage('Title cannot exceed 200 characters'),

    body('content')
        .trim()
        .notEmpty()
        .withMessage('Content is required'),

    body('metaTitle')
        .optional()
        .trim()
        .isLength({ max: 70 })
        .withMessage('Meta title cannot exceed 70 characters'),

    body('metaDescription')
        .optional()
        .trim()
        .isLength({ max: 160 })
        .withMessage('Meta description cannot exceed 160 characters'),

    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean'),
];

const updatePageValidator = [
    param('id')
        .isMongoId()
        .withMessage('Invalid page ID'),

    ...createPageValidator.slice(1),
];

const pageIdValidator = [
    param('id')
        .isMongoId()
        .withMessage('Invalid page ID'),
];

const pageSlugValidator = [
    param('slug')
        .trim()
        .notEmpty()
        .withMessage('Slug is required'),
];

module.exports = {
    createPageValidator,
    updatePageValidator,
    pageIdValidator,
    pageSlugValidator,
};
