const Page = require('../models/Page');
const { createSlug, generateUniqueSlug } = require('../utils/slugify');

class PageService {
    /**
     * Get all pages (admin)
     */
    async getAllPages(includeInactive = false) {
        const query = includeInactive ? {} : { isActive: true, deletedAt: null };
        return Page.find(query).sort({ createdAt: -1 });
    }

    /**
     * Get page by ID
     */
    async getPageById(id) {
        const page = await Page.findById(id);
        if (!page || page.isDeleted()) {
            throw new Error('Page not found');
        }
        return page;
    }

    /**
     * Get page by slug (public)
     */
    async getPageBySlug(slug) {
        const page = await Page.findOne({
            slug,
            isActive: true,
            deletedAt: null,
        });

        if (!page) {
            throw new Error('Page not found');
        }

        return page;
    }

    /**
     * Create new page
     */
    async createPage(data) {
        // Generate unique slug
        let slug = createSlug(data.title);
        slug = await generateUniqueSlug(slug, async (s) => {
            const existing = await Page.findOne({ slug: s, deletedAt: null });
            return !!existing;
        });

        const page = new Page({
            ...data,
            slug,
        });

        await page.save();
        return page;
    }

    /**
     * Update page
     */
    async updatePage(id, data) {
        const page = await this.getPageById(id);

        // If title is being updated, regenerate slug
        if (data.title && data.title !== page.title) {
            let slug = createSlug(data.title);
            slug = await generateUniqueSlug(slug, async (s) => {
                const existing = await Page.findOne({
                    slug: s,
                    _id: { $ne: id },
                    deletedAt: null,
                });
                return !!existing;
            });
            data.slug = slug;
        }

        Object.assign(page, data);
        await page.save();
        return page;
    }

    /**
     * Delete page (soft delete)
     */
    async deletePage(id) {
        const page = await this.getPageById(id);
        page.deletedAt = new Date();
        await page.save();
        return true;
    }

    /**
     * Get active pages (public)
     */
    async getActivePages() {
        return Page.findActive();
    }
}

module.exports = new PageService();
