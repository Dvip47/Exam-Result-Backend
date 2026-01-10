const mediaService = require('../services/media.service');
const ApiResponse = require('../utils/apiresponse');
const logger = require('../utils/logger');

class MediaController {
    async uploadFile(req, res, next) {
        try {
            if (!req.file) {
                return ApiResponse.error(res, 'No file uploaded', 400);
            }

            const media = await mediaService.uploadFile(req.file, req.user._id);
            logger.info(`File uploaded: ${media.filename} by ${req.user.email}`);
            return ApiResponse.created(res, 'File uploaded successfully', media);
        } catch (error) {
            next(error);
        }
    }

    async getAllMedia(req, res, next) {
        try {
            const result = await mediaService.getAllMedia(req.query);
            return ApiResponse.success(res, 'Media files retrieved successfully', result);
        } catch (error) {
            next(error);
        }
    }

    async getFileById(req, res, next) {
        try {
            const media = await mediaService.getFileById(req.params.id);
            return ApiResponse.success(res, 'File retrieved successfully', media);
        } catch (error) {
            if (error.message === 'File not found') {
                return ApiResponse.error(res, error.message, 404);
            }
            next(error);
        }
    }

    async deleteFile(req, res, next) {
        try {
            await mediaService.deleteFile(req.params.id);
            logger.info(`File deleted: ${req.params.id}`);
            return ApiResponse.success(res, 'File deleted successfully');
        } catch (error) {
            if (error.message === 'File not found') {
                return ApiResponse.error(res, error.message, 404);
            }
            next(error);
        }
    }
}

module.exports = new MediaController();
