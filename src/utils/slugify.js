const slugify = require('slugify');

/**
 * Generate URL-friendly slug from text
 * @param {string} text - Text to slugify
 * @returns {string} Slug
 */
const createSlug = (text) => {
    return slugify(text, {
        lower: true,
        strict: true,
        remove: /[*+~.()'"!:@]/g,
    });
};

/**
 * Generate unique slug by appending number if needed
 * @param {string} baseSlug - Base slug
 * @param {Function} checkExists - Async function to check if slug exists
 * @returns {Promise<string>} Unique slug
 */
const generateUniqueSlug = async (baseSlug, checkExists) => {
    let slug = baseSlug;
    let counter = 1;

    while (await checkExists(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }

    return slug;
};

module.exports = {
    createSlug,
    generateUniqueSlug,
};
