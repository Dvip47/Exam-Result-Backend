const { uploadFile, deleteFile } = require('../utils/fileupload');
const fs = require('fs').promises;
const Media = require('../models/media');
const path = require('path');

class MediaService {
    /**
     * Get all media files
     */
    async getAllMedia(filters = {}) {
        const { page = 1, limit = 20 } = filters;
        const skip = (page - 1) * limit;

        const query = { deletedAt: null };

        const [media, total] = await Promise.all([
            Media.find(query)
                .populate('uploadedBy', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Media.countDocuments(query),
        ]);

        return {
            media,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Upload file
     */
    async uploadFile(file, userId) {
        if (!file) {
            throw new Error('No file provided');
        }

        // Generate URL (adjust based on your deployment)
        const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
        const fileUrl = `${baseUrl}/uploads/${file.filename}`;

        const media = new Media({
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            path: file.path,
            url: fileUrl,
            uploadedBy: userId,
        });

        await media.save();
        return media.populate('uploadedBy', 'name email');
    }

    /**
     * Delete file (soft delete)
     */
    async deleteFile(id) {
        const media = await Media.findById(id);
        if (!media || media.isDeleted()) {
            throw new Error('File not found');
        }

        media.deletedAt = new Date();
        await media.save();

        // Optionally delete physical file
        try {
            await fs.unlink(media.path);
        } catch (error) {
            // File might already be deleted, log but don't fail
            console.error('Error deleting physical file:', error);
        }

        return true;
    }

    /**
     * Get file by ID
     */
    async getFileById(id) {
        const media = await Media.findById(id).populate('uploadedBy', 'name email');
        if (!media || media.isDeleted()) {
            throw new Error('File not found');
        }
        return media;
    }
}

module.exports = new MediaService();
