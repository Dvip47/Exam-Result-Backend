const jwt = require('jsonwebtoken');
const { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } = require('../config/auth');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Verify JWT access token and attach user to request
 */
const authenticateToken = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return ApiResponse.error(res, 'Access token required', 401);
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_ACCESS_SECRET);

        // Get user from database
        const user = await User.findById(decoded.userId).select('-password -refreshToken');

        if (!user) {
            return ApiResponse.error(res, 'User not found', 401);
        }

        // Check if user is active and not deleted
        if (!user.isActive || user.isDeleted()) {
            return ApiResponse.error(res, 'Account is inactive or deleted', 403);
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return ApiResponse.error(res, 'Access token expired', 401);
        }
        if (error.name === 'JsonWebTokenError') {
            return ApiResponse.error(res, 'Invalid access token', 401);
        }

        logger.error('Authentication error:', error);
        return ApiResponse.error(res, 'Authentication failed', 500);
    }
};

/**
 * Verify refresh token
 */
const authenticateRefreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return ApiResponse.error(res, 'Refresh token required', 401);
        }

        // Verify token
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

        // Get user and check if refresh token matches
        const user = await User.findById(decoded.userId).select('+refreshToken');

        if (!user || user.refreshToken !== refreshToken) {
            return ApiResponse.error(res, 'Invalid refresh token', 401);
        }

        // Check if user is active and not deleted
        if (!user.isActive || user.isDeleted()) {
            return ApiResponse.error(res, 'Account is inactive or deleted', 403);
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return ApiResponse.error(res, 'Refresh token expired. Please login again', 401);
        }
        if (error.name === 'JsonWebTokenError') {
            return ApiResponse.error(res, 'Invalid refresh token', 401);
        }

        logger.error('Refresh token error:', error);
        return ApiResponse.error(res, 'Token refresh failed', 500);
    }
};

/**
 * Check if user has required role
 */
const authorizeRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return ApiResponse.error(res, 'Authentication required', 401);
        }

        if (!roles.includes(req.user.role)) {
            return ApiResponse.error(res, 'Insufficient permissions', 403);
        }

        next();
    };
};

module.exports = {
    authenticateToken,
    authenticateRefreshToken,
    authorizeRole,
};
