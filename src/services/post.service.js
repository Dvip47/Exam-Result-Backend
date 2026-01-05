const Post = require('../models/Post');
const Category = require('../models/Category');
const { createSlug, generateUniqueSlug } = require('../utils/slugify');
const { POST_STATUS } = require('../config/constants');

class PostService {
    /**
     * Get all posts with filters (admin)
     */
    async getAllPosts(filters = {}) {
        const { category, status, search, page = 1, limit = 20 } = filters;

        const query = { deletedAt: null };

        if (category) query.category = category;
        if (status) query.status = status;
        if (search) query.$text = { $search: search };

        const skip = (page - 1) * limit;

        const [posts, total] = await Promise.all([
            Post.find(query)
                .populate('category', 'name slug')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Post.countDocuments(query),
        ]);

        return {
            posts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get post by ID
     */
    async getPostById(id) {
        const post = await Post.findById(id).populate('category', 'name slug');
        if (!post || post.isDeleted()) {
            throw new Error('Post not found');
        }
        return post;
    }

    /**
     * Get post by slug (public)
     */
    async getPostBySlug(slug) {
        const post = await Post.findOne({
            slug,
            status: POST_STATUS.PUBLISHED,
            isExpired: false,
            deletedAt: null,
        }).populate('category', 'name slug');

        if (!post) {
            throw new Error('Post not found');
        }

        // Increment view count
        post.views += 1;
        await post.save();

        return post;
    }

    /**
     * Create new post
     */
    async createPost(data) {
        // Verify category exists
        const category = await Category.findById(data.category);
        if (!category || category.isDeleted()) {
            throw new Error('Category not found');
        }

        // Generate unique slug
        let slug = createSlug(data.title);
        slug = await generateUniqueSlug(slug, async (s) => {
            const existing = await Post.findOne({ slug: s, deletedAt: null });
            return !!existing;
        });

        // Set publishedAt if status is published
        if (data.status === POST_STATUS.PUBLISHED && !data.publishedAt) {
            data.publishedAt = new Date();
        }

        const post = new Post({
            ...data,
            slug,
        });

        await post.save();
        return post.populate('category', 'name slug');
    }

    /**
     * Update post
     */
    async updatePost(id, data) {
        const post = await this.getPostById(id);

        // If title is being updated, regenerate slug
        if (data.title && data.title !== post.title) {
            let slug = createSlug(data.title);
            slug = await generateUniqueSlug(slug, async (s) => {
                const existing = await Post.findOne({
                    slug: s,
                    _id: { $ne: id },
                    deletedAt: null,
                });
                return !!existing;
            });
            data.slug = slug;
        }

        // If category is being updated, verify it exists
        if (data.category && data.category.toString() !== post.category._id.toString()) {
            const category = await Category.findById(data.category);
            if (!category || category.isDeleted()) {
                throw new Error('Category not found');
            }
        }

        // Set publishedAt when status changes to published
        if (data.status === POST_STATUS.PUBLISHED && !post.publishedAt) {
            data.publishedAt = new Date();
        }

        Object.assign(post, data);
        await post.save();
        return post.populate('category', 'name slug');
    }

    /**
     * Delete post (soft delete)
     */
    async deletePost(id) {
        const post = await this.getPostById(id);
        post.deletedAt = new Date();
        await post.save();
        return true;
    }

    /**
     * Get published posts (public)
     */
    async getPublishedPosts(filters = {}) {
        const { category, limit = 20, page = 1 } = filters;
        const skip = (page - 1) * limit;

        const query = {
            status: POST_STATUS.PUBLISHED,
            isExpired: false,
            deletedAt: null,
        };

        if (category) {
            const categoryDoc = await Category.findOne({ slug: category, deletedAt: null });
            if (categoryDoc) {
                query.category = categoryDoc._id;
            }
        }

        const [posts, total] = await Promise.all([
            Post.find(query)
                .populate('category', 'name slug')
                .sort({ publishedAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Post.countDocuments(query),
        ]);

        return {
            posts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
}

module.exports = new PostService();
