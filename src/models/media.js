const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
    {
        filename: {
            type: String,
            required: [true, 'Filename is required'],
        },
        originalName: {
            type: String,
            required: [true, 'Original name is required'],
        },
        mimeType: {
            type: String,
            required: [true, 'MIME type is required'],
        },
        size: {
            type: Number,
            required: [true, 'File size is required'],
        },
        path: {
            type: String,
            required: [true, 'File path is required'],
        },
        url: {
            type: String,
            required: [true, 'URL is required'],
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
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
mediaSchema.index({ uploadedBy: 1 });
mediaSchema.index({ createdAt: -1 });

// Static method to find active media
mediaSchema.statics.findActive = function (query = {}) {
    return this.find({ ...query, deletedAt: null }).sort({ createdAt: -1 });
};

// Method to check if deleted
mediaSchema.methods.isDeleted = function () {
    return this.deletedAt !== null;
};

const Media = mongoose.model('Media', mediaSchema);

module.exports = Media;
