const categoryService = require('../services/category.service');
const ApiResponse = require('../utils/apiresponse');
const logger = require('../utils/logger');

class CategoryController {
    /**
     * Get all categories
     * GET /api/admin/categories
     */
    async getAllCategories(req, res, next) {
        try {
            const includeInactive = req.query.includeInactive === 'true';
            const categories = await categoryService.getAllCategories(includeInactive);
            return ApiResponse.success(res, 'Categories retrieved successfully', categories);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get category by ID
     * GET /api/admin/categories/:id
     */
    async getCategoryById(req, res, next) {
        try {
            const category = await categoryService.getCategoryById(req.params.id);
            return ApiResponse.success(res, 'Category retrieved successfully', category);
        } catch (error) {
            if (error.message === 'Category not found') {
                return ApiResponse.error(res, error.message, 404);
            }
            next(error);
        }
    }

    /**
     * Create new category
     * POST /api/admin/categories
     */
    async createCategory(req, res, next) {
        try {
            const category = await categoryService.createCategory(req.body);
            logger.info(`Category created: ${category.name}`);
            return ApiResponse.created(res, 'Category created successfully', category);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update category
     * PUT /api/admin/categories/:id
     */
    async updateCategory(req, res, next) {
        try {
            const category = await categoryService.updateCategory(req.params.id, req.body);
            logger.info(`Category updated: ${category.name}`);
            return ApiResponse.success(res, 'Category updated successfully', category);
        } catch (error) {
            if (error.message === 'Category not found') {
                return ApiResponse.error(res, error.message, 404);
            }
            next(error);
        }
    }

    /**
     * Delete category
     * DELETE /api/admin/categories/:id
     */
    async deleteCategory(req, res, next) {
        try {
            await categoryService.deleteCategory(req.params.id);
            logger.info(`Category deleted: ${req.params.id}`);
            return ApiResponse.success(res, 'Category deleted successfully');
        } catch (error) {
            if (error.message === 'Category not found') {
                return ApiResponse.error(res, error.message, 404);
            }
            next(error);
        }
    }

    /**
     * Get active categories (public)
     * GET /api/categories
     */
    async getActiveCategories(req, res, next) {
        try {
            const categories = await categoryService.getActiveCategories();
            return ApiResponse.success(res, 'Categories retrieved successfully', categories);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CategoryController();
