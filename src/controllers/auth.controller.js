const authService = require('../services/auth.service');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

class AuthController {
    /**
     * Register new user
     * POST /api/auth/register
     */
    async register(req, res, next) {
        try {
            const result = await authService.register(req.body);
            logger.info(`New user registered: ${req.body.email}`);
            return ApiResponse.created(res, 'User registered successfully', result);
        } catch (error) {
            if (error.message === 'Email already registered') {
                return ApiResponse.error(res, error.message, 409);
            }
            next(error);
        }
    }

    /**
     * Login user
     * POST /api/auth/login
     */
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const result = await authService.login(email, password);
            logger.info(`User logged in: ${email}`);
            return ApiResponse.success(res, 'Login successful', result);
        } catch (error) {
            if (error.message === 'Invalid credentials' || error.message === 'Account is inactive or deleted') {
                return ApiResponse.error(res, error.message, 401);
            }
            next(error);
        }
    }

    /**
     * Refresh access token
     * POST /api/auth/refresh
     */
    async refreshToken(req, res, next) {
        try {
            const result = await authService.refreshAccessToken(req.user._id);
            return ApiResponse.success(res, 'Token refreshed successfully', result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Logout user
     * POST /api/auth/logout
     */
    async logout(req, res, next) {
        try {
            await authService.logout(req.user._id);
            logger.info(`User logged out: ${req.user.email}`);
            return ApiResponse.success(res, 'Logout successful');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get current user
     * GET /api/auth/me
     */
    async me(req, res, next) {
        try {
            const user = await authService.getCurrentUser(req.user._id);
            return ApiResponse.success(res, 'User retrieved successfully', user);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AuthController();
