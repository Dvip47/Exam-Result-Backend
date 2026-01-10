const Category = require('../models/category');
const { createSlug, generateUniqueSlug } = require('../utils/slugify');

class CategoryService {
    /**
     * Get all categories (admin)
     */
    async getAllCategories(includeInactive = false) {
        const query = includeInactive ? {} : { isActive: true, deletedAt: null };
        return Category.find(query).sort({ displayOrder: 1, createdAt: -1 });
    }

    /**
     * Get category by ID
     */
    async getCategoryById(id) {
        const category = await Category.findById(id);
        if (!category || category.isDeleted()) {
            throw new Error('Category not found');
        }
        return category;
    }

    /**
     * Create new category
     */
    async createCategory(data) {
        // Generate slug from name
        let slug = createSlug(data.name);

        // Ensure slug is unique
        slug = await generateUniqueSlug(slug, async (s) => {
            const existing = await Category.findOne({ slug: s, deletedAt: null });
            return !!existing;
        });

        const category = new Category({
            ...data,
            slug,
        });

        await category.save();
        return category;
    }

    /**
     * Update category
     */
    async updateCategory(id, data) {
        const category = await this.getCategoryById(id);

        // If name is being updated, regenerate slug
        if (data.name && data.name !== category.name) {
            let slug = createSlug(data.name);
            slug = await generateUniqueSlug(slug, async (s) => {
                const existing = await Category.findOne({
                    slug: s,
                    _id: { $ne: id },
                    deletedAt: null
                });
                return !!existing;
            });
            data.slug = slug;
        }

        Object.assign(category, data);
        await category.save();
        return category;
    }

    /**
     * Delete category (soft delete)
     */
    async deleteCategory(id) {
        const category = await this.getCategoryById(id);
        category.deletedAt = new Date();
        await category.save();
        return true;
    }

    /**
     * Get active categories (public)
     */
    async getActiveCategories() {
        return Category.findActive();
    }
}

module.exports = new CategoryService();
