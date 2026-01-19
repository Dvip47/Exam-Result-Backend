module.exports = {
    AUTO_PUBLISH: false, // Default to false for safety
    DRY_RUN: false, // Set to true to skip saving to DB
    AGENT_VERSION: '1.0.0',

    // Confidence Thresholds
    THRESHOLDS: {
        PUBLISH_CONFIDENCE: 0.95,
        PUBLISH_COMPLETENESS: 95,
    },

    // Scoring Weights
    SCORES: {
        OFFICIAL_PDF_FOUND: 0.5,
        OFFICIAL_APPLY_LINK: 0.2,
        CRITICAL_DATES_CONFIRMED: 0.2,
        VACANCY_CONFIRMED: 0.1,
    }
};
