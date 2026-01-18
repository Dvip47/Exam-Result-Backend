const { body, param, query } = require('express-validator');
const { POST_STATUS, POST_BADGES } = require('../config/constants');

const createPostValidator = [
    body('title')
        .trim()
        .notEmpty()
        .withMessage('Title is required')
        .isLength({ max: 200 })
        .withMessage('Title cannot exceed 200 characters'),

    body('shortDescription')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Short description cannot exceed 500 characters'),

    body('fullDescription')
        .optional()
        .trim(),

    body('category')
        .notEmpty()
        .withMessage('Category is required')
        .isMongoId()
        .withMessage('Invalid category ID'),

    body('organization')
        .optional()
        .trim(),

    body('postDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid post date format'),

    body('lastDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid last date format'),

    body('qualification')
        .optional()
        .trim(),

    body('ageLimit')
        .optional()
        .trim(),

    body('fees')
        .optional()
        .trim(),

    body('totalPosts')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Total posts must be a positive number'),

    body('importantDates')
        .optional()
        .isArray()
        .withMessage('Important dates must be an array'),

    body('primaryActionLink')
        .optional()
        .trim()
        .isURL()
        .withMessage('Primary action link must be a valid URL'),

    body('status')
        .optional()
        .isIn(Object.values(POST_STATUS))
        .withMessage('Invalid status'),

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

    body('badges')
        .optional()
        .isArray()
        .withMessage('Badges must be an array'),

    body('expiresAt')
        .optional()
        .isISO8601()
        .withMessage('Invalid expiry date format'),
];

const updatePostValidator = [
    param('id')
        .isMongoId()
        .withMessage('Invalid post ID'),

    ...createPostValidator.slice(1), // Reuse create validators except first
];

const postIdValidator = [
    param('id')
        .isMongoId()
        .withMessage('Invalid post ID'),
];

const postSlugValidator = [
    param('slug')
        .trim()
        .notEmpty()
        .withMessage('Slug is required'),
];

module.exports = {
    createPostValidator,
    updatePostValidator,
    postIdValidator,
    postSlugValidator,
};
