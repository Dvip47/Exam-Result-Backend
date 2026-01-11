const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Category name is required'],
            trim: true,
            unique: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        slug: {
            type: String,
            required: [true, 'Slug is required'],
            unique: true,
            lowercase: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        displayOrder: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        primaryActionLabel: {
            type: String,
            default: "View Details",
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
// categorySchema.index({ slug: 1 }, { unique: true }); // Redundant because of unique: true in schema
categorySchema.index({ displayOrder: 1 });
categorySchema.index({ isActive: 1, deletedAt: 1 });

// Static method to find active categories
categorySchema.statics.findActive = function (query = {}) {
    return this.find({ ...query, deletedAt: null, isActive: true }).sort({ displayOrder: 1 });
};

// Method to check if deleted
categorySchema.methods.isDeleted = function () {
    return this.deletedAt !== null;
};

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
