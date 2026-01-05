const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Page title is required'],
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
        content: {
            type: String,
            required: [true, 'Content is required'],
        },
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
        isActive: {
            type: Boolean,
            default: true,
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

// Indexes
// pageSchema.index({ slug: 1 }, { unique: true }); // Redundant because of unique: true in schema
pageSchema.index({ isActive: 1, deletedAt: 1 });

// Static method to find active pages
pageSchema.statics.findActive = function (query = {}) {
    return this.find({ ...query, deletedAt: null, isActive: true });
};

// Method to check if deleted
pageSchema.methods.isDeleted = function () {
    return this.deletedAt !== null;
};

const Page = mongoose.model('Page', pageSchema);

module.exports = Page;
