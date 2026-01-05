const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRE, JWT_REFRESH_EXPIRE } = require('../config/auth');

class AuthService {
    /**
     * Generate access and refresh tokens
     */
    generateTokens(userId) {
        const accessToken = jwt.sign({ userId }, JWT_ACCESS_SECRET, {
            expiresIn: JWT_ACCESS_EXPIRE,
        });

        const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, {
            expiresIn: JWT_REFRESH_EXPIRE,
        });

        return { accessToken, refreshToken };
    }

    /**
     * Register new user
     */
    async register(userData) {
        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
            throw new Error('Email already registered');
        }

        // Create user
        const user = new User(userData);
        await user.save();

        // Generate tokens
        const tokens = this.generateTokens(user._id);

        // Save refresh token
        user.refreshToken = tokens.refreshToken;
        await user.save();

        // Return user without password
        const userObject = user.toObject();
        delete userObject.password;
        delete userObject.refreshToken;

        return { user: userObject, ...tokens };
    }

    /**
     * Login user
     */
    async login(email, password) {
        // Find user with password field
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Check if user is active and not deleted
        if (!user.isActive || user.isDeleted()) {
            throw new Error('Account is inactive or deleted');
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            throw new Error('Invalid credentials');
        }

        // Generate tokens
        const tokens = this.generateTokens(user._id);

        // Save refresh token
        user.refreshToken = tokens.refreshToken;
        await user.save();

        // Return user without password
        const userObject = user.toObject();
        delete userObject.password;
        delete userObject.refreshToken;

        return { user: userObject, ...tokens };
    }

    /**
     * Refresh access token
     */
    async refreshAccessToken(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Generate new access token only
        const accessToken = jwt.sign({ userId }, JWT_ACCESS_SECRET, {
            expiresIn: JWT_ACCESS_EXPIRE,
        });

        return { accessToken };
    }

    /**
     * Logout user (invalidate refresh token)
     */
    async logout(userId) {
        await User.findByIdAndUpdate(userId, { refreshToken: null });
        return true;
    }

    /**
     * Get current user info
     */
    async getCurrentUser(userId) {
        const user = await User.findById(userId).select('-password -refreshToken');
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }
}

module.exports = new AuthService();
