const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiresponse');

/**
 * Validate request using express-validator rules
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map((err) => ({
            field: err.path,
            message: err.msg,
        }));

        return ApiResponse.error(res, 'Validation failed', 400, formattedErrors);
    }

    next();
};

module.exports = validate;
