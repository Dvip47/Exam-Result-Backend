const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiresponse');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    logger.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map((e) => e.message);
        return ApiResponse.error(res, 'Validation failed', 400, errors);
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return ApiResponse.error(res, `${field} already exists`, 409);
    }

    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        return ApiResponse.error(res, 'Invalid ID format', 400);
    }

    // JWT errors (if not caught earlier)
    if (err.name === 'JsonWebTokenError') {
        return ApiResponse.error(res, 'Invalid token', 401);
    }

    if (err.name === 'TokenExpiredError') {
        return ApiResponse.error(res, 'Token expired', 401);
    }

    // Multer file upload errors
    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return ApiResponse.error(res, 'File too large', 413);
        }
        return ApiResponse.error(res, `Upload error: ${err.message}`, 400);
    }

    // Default server error
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';

    return ApiResponse.error(res, message, statusCode);
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
    return ApiResponse.error(res, `Route not found: ${req.originalUrl}`, 404);
};

module.exports = {
    errorHandler,
    notFoundHandler,
};
