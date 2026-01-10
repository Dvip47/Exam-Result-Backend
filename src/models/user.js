const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES } = require('../config/constants');
const { BCRYPT_ROUNDS } = require('../config/auth');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must be at least 8 characters'],
            select: false, // Don't return password by default
        },
        role: {
            type: String,
            enum: Object.values(USER_ROLES),
            default: USER_ROLES.ADMIN,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        refreshToken: {
            type: String,
            select: false,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Index for email lookup (Redundant because of unique: true in schema, but keep if you want explicit control. Mongoose warns though)
// userSchema.index({ email: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
    // Only hash password if it's modified
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if user is deleted (soft delete)
userSchema.methods.isDeleted = function () {
    return this.deletedAt !== null;
};

// Static method to find active users
userSchema.statics.findActive = function (query = {}) {
    return this.find({ ...query, deletedAt: null, isActive: true });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
