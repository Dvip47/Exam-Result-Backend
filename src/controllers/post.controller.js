const postService = require('../services/post.service');
const ApiResponse = require('../utils/apiresponse');
const logger = require('../utils/logger');

class PostController {
    /**
     * Get all posts (admin)
     * GET /api/admin/posts
     */
    async getAllPosts(req, res, next) {
        try {
            const result = await postService.getAllPosts(req.query);
            return ApiResponse.success(res, 'Posts retrieved successfully', result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get post by ID (admin)
     * GET /api/admin/posts/:id
     */
    async getPostById(req, res, next) {
        try {
            const post = await postService.getPostById(req.params.id);
            return ApiResponse.success(res, 'Post retrieved successfully', post);
        } catch (error) {
            if (error.message === 'Post not found') {
                return ApiResponse.error(res, error.message, 404);
            }
            next(error);
        }
    }

    /**
     * Create new post
     * POST /api/admin/posts
     */
    async createPost(req, res, next) {
        try {
            const post = await postService.createPost(req.body);
            logger.info(`Post created: ${post.title}`);
            return ApiResponse.created(res, 'Post created successfully', post);
        } catch (error) {
            if (error.message === 'Category not found') {
                return ApiResponse.error(res, error.message, 404);
            }
            next(error);
        }
    }

    /**
     * Update post
     * PUT /api/admin/posts/:id
     */
    async updatePost(req, res, next) {
        try {
            const post = await postService.updatePost(req.params.id, req.body);
            logger.info(`Post updated: ${post.title}`);
            return ApiResponse.success(res, 'Post updated successfully', post);
        } catch (error) {
            if (error.message === 'Post not found' || error.message === 'Category not found') {
                return ApiResponse.error(res, error.message, 404);
            }
            next(error);
        }
    }

    /**
     * Delete post
     * DELETE /api/admin/posts/:id
     */
    async deletePost(req, res, next) {
        try {
            await postService.deletePost(req.params.id);
            logger.info(`Post deleted: ${req.params.id}`);
            return ApiResponse.success(res, 'Post deleted successfully');
        } catch (error) {
            if (error.message === 'Post not found') {
                return ApiResponse.error(res, error.message, 404);
            }
            next(error);
        }
    }

    /**
     * Get published posts (public)
     * GET /api/posts
     */
    async getPublishedPosts(req, res, next) {
        try {
            const result = await postService.getPublishedPosts(req.query);
            return ApiResponse.success(res, 'Posts retrieved successfully', result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get post by slug (public)
     * GET /api/posts/slug/:slug
     */
    async getPostBySlug(req, res, next) {
        try {
            const post = await postService.getPostBySlug(req.params.slug);
            return ApiResponse.success(res, 'Post retrieved successfully', post);
        } catch (error) {
            if (error.message === 'Post not found') {
                return ApiResponse.error(res, error.message, 404);
            }
            next(error);
        }
    }
}

module.exports = new PostController();
