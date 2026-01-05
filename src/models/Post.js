const mongoose = require('mongoose');
const { POST_STATUS, POST_BADGES } = require('../config/constants');

const postSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },
        slug: {
            type: String,
            required: [true, 'Slug is required'],
            unique: true,
            lowercase: true,
            trim: true,
        },
        shortDescription: {
            type: String,
            trim: true,
            maxlength: [500, 'Short description cannot exceed 500 characters'],
        },
        fullDescription: {
            type: String,
            trim: true,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: [true, 'Category is required'],
        },

        // Job-specific fields
        organization: {
            type: String,
            trim: true,
        },
        postDate: {
            type: Date,
        },
        lastDate: {
            type: Date,
        },
        qualification: {
            type: String,
            trim: true,
        },
        ageLimit: {
            type: String,
            trim: true,
        },
        fees: {
            type: String,
            trim: true,
        },
        totalPosts: {
            type: Number,
        },

        // Important dates
        importantDates: [
            {
                label: String,
                date: Date,
            },
        ],

        // Links
        applyLink: {
            type: String,
            trim: true,
        },
        notificationPdf: {
            type: String,
            trim: true,
        },
        syllabusPdf: {
            type: String,
            trim: true,
        },
        resultPdf: {
            type: String,
            trim: true,
        },

        // Status
        status: {
            type: String,
            enum: Object.values(POST_STATUS),
            default: POST_STATUS.DRAFT,
        },
        isExpired: {
            type: Boolean,
            default: false,
        },

        // SEO
        metaTitle: {
            type: String,
            trim: true,
            maxlength: [70, 'Meta title cannot exceed 70 characters'],
        },
        metaDescription: {
            type: String,
            trim: true,
            maxlength: [160, 'Meta description cannot exceed 160 characters'],
        },

        // Badges
        badges: [
            {
                type: String,
                enum: Object.values(POST_BADGES),
            },
        ],

        // Stats
        views: {
            type: Number,
            default: 0,
        },

        // Timestamps
        publishedAt: {
            type: Date,
        },
        expiresAt: {
            type: Date,
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

// Indexes for performance
// postSchema.index({ slug: 1 }, { unique: true }); // Redundant because of unique: true in schema
postSchema.index({ category: 1, status: 1 });
postSchema.index({ status: 1, isExpired: 1, publishedAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ title: 'text' }); // Full-text search

// Virtual for checking if post is currently expired
postSchema.virtual('isCurrentlyExpired').get(function () {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
});

// Pre-save middleware to auto-update isExpired
postSchema.pre('save', function (next) {
    if (this.expiresAt && new Date() > this.expiresAt) {
        this.isExpired = true;
    }
    next();
});

// Static method to find published posts
postSchema.statics.findPublished = function (query = {}) {
    return this.find({
        ...query,
        status: POST_STATUS.PUBLISHED,
        isExpired: false,
        deletedAt: null,
    })
        .populate('category', 'name slug')
        .sort({ publishedAt: -1 });
};

// Static method to find by category slug
postSchema.statics.findByCategory = function (categoryId, limit = 20) {
    return this.findPublished({ category: categoryId }).limit(limit);
};

// Method to check if deleted
postSchema.methods.isDeleted = function () {
    return this.deletedAt !== null;
};

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
