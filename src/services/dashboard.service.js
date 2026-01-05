const Post = require('../models/Post');
const Category = require('../models/Category');
const { POST_STATUS } = require('../config/constants');

class DashboardService {
    /**
     * Get dashboard statistics
     */
    async getStats() {
        // Total posts count
        const totalPosts = await Post.countDocuments({ deletedAt: null });

        // Posts by status
        const postsByStatus = await Post.aggregate([
            { $match: { deletedAt: null } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);

        // Posts by category
        const postsByCategory = await Post.aggregate([
            { $match: { deletedAt: null, status: POST_STATUS.PUBLISHED } },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'categoryInfo',
                },
            },
            { $unwind: '$categoryInfo' },
            {
                $group: {
                    _id: '$categoryInfo.name',
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]);

        // Active vs expired posts
        const activePosts = await Post.countDocuments({
            deletedAt: null,
            status: POST_STATUS.PUBLISHED,
            isExpired: false,
        });

        const expiredPosts = await Post.countDocuments({
            deletedAt: null,
            isExpired: true,
        });

        // Recently updated posts (last 10)
        const recentPosts = await Post.find({ deletedAt: null })
            .populate('category', 'name slug')
            .sort({ updatedAt: -1 })
            .limit(10)
            .select('title slug status updatedAt');

        // Total categories
        const totalCategories = await Category.countDocuments({ deletedAt: null });

        // Most viewed posts
        const popularPosts = await Post.find({
            deletedAt: null,
            status: POST_STATUS.PUBLISHED,
        })
            .populate('category', 'name slug')
            .sort({ views: -1 })
            .limit(10)
            .select('title slug views category');

        return {
            overview: {
                totalPosts,
                totalCategories,
                activePosts,
                expiredPosts,
            },
            postsByStatus: postsByStatus.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            postsByCategory: postsByCategory.map((item) => ({
                category: item._id,
                count: item.count,
            })),
            recentPosts,
            popularPosts,
        };
    }
}

module.exports = new DashboardService();
