module.exports = {
    USER_ROLES: {
        ADMIN: 'admin',
        EDITOR: 'editor',
    },

    POST_STATUS: {
        DRAFT: 'draft',
        PUBLISHED: 'published',
        ARCHIVED: 'archived',
    },

    POST_BADGES: {
        NEW: 'new',
        HOT: 'hot',
        URGENT: 'urgent',
    },

    FILE_TYPES: {
        PDF: 'application/pdf',
        IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
    },

    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
};
