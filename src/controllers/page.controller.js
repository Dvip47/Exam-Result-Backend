const pageService = require('../services/page.service');
const ApiResponse = require('../utils/apiresponse');
const logger = require('../utils/logger');

class PageController {
    async getAllPages(req, res, next) {
        try {
            const includeInactive = req.query.includeInactive === 'true';
            const pages = await pageService.getAllPages(includeInactive);
            return ApiResponse.success(res, 'Pages retrieved successfully', pages);
        } catch (error) {
            next(error);
        }
    }

    async getPageById(req, res, next) {
        try {
            const page = await pageService.getPageById(req.params.id);
            return ApiResponse.success(res, 'Page retrieved successfully', page);
        } catch (error) {
            if (error.message === 'Page not found') {
                return ApiResponse.error(res, error.message, 404);
            }
            next(error);
        }
    }

    async createPage(req, res, next) {
        try {
            const page = await pageService.createPage(req.body);
            logger.info(`Page created: ${page.title}`);
            return ApiResponse.created(res, 'Page created successfully', page);
        } catch (error) {
            next(error);
        }
    }

    async updatePage(req, res, next) {
        try {
            const page = await pageService.updatePage(req.params.id, req.body);
            logger.info(`Page updated: ${page.title}`);
            return ApiResponse.success(res, 'Page updated successfully', page);
        } catch (error) {
            if (error.message === 'Page not found') {
                return ApiResponse.error(res, error.message, 404);
            }
            next(error);
        }
    }

    async deletePage(req, res, next) {
        try {
            await pageService.deletePage(req.params.id);
            logger.info(`Page deleted: ${req.params.id}`);
            return ApiResponse.success(res, 'Page deleted successfully');
        } catch (error) {
            if (error.message === 'Page not found') {
                return ApiResponse.error(res, error.message, 404);
            }
            next(error);
        }
    }

    async getPageBySlug(req, res, next) {
        try {
            const page = await pageService.getPageBySlug(req.params.slug);
            return ApiResponse.success(res, 'Page retrieved successfully', page);
        } catch (error) {
            if (error.message === 'Page not found') {
                return ApiResponse.error(res, error.message, 404);
            }
            next(error);
        }
    }
}

module.exports = new PageController();
