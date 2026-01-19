const { THRESHOLDS, SCORES } = require('../config/automation.config');

class ValidationService {
    /**
     * Validates the generated post and computes scores
     * @param {Object} postData - The JSON object returned by Generation Service
     * @param {Object} verificationResult - The result from Verification Service
     * @returns {Object} Validated data with status and scores
     */
    validate(postData, verificationResult) {
        const report = {
            isValid: true,
            issues: [],
            confidenceScore: verificationResult.confidenceScore || 0,
            completenessScore: 0
        };

        // 1. Sanity Checks

        // Date Logic
        if (postData.lastDate && new Date(postData.lastDate) < new Date()) {
            report.issues.push('Last date is in the past');
            // Not necessarily invalid, but questionable for a new post
        }

        if (postData.postDate && new Date(postData.postDate) > new Date()) {
            // Future post date is okay
        }

        // Vacancy Sanity
        if (postData.totalPosts && typeof postData.totalPosts === 'number' && postData.totalPosts < 0) {
            report.issues.push('Negative vacancy count');
            report.isValid = false;
        }

        // 2. Compute Completeness Score (0-100)
        let filledFields = 0;
        const criticalFields = ['title', 'shortDescription', 'category', 'postDate', 'lastDate', 'primaryActionLink'];
        const secondaryFields = ['fees', 'ageLimit', 'educationalQualification', 'totalPosts', 'availabilityNote', 'physicalStandardTest', 'physicalEfficiencyTest'];

        criticalFields.forEach(f => {
            if (postData[f]) filledFields += 15;
        });
        secondaryFields.forEach(f => {
            if (postData[f]) filledFields += 2.5;
        });

        report.completenessScore = Math.min(filledFields, 100);

        // 3. Update Confidence based on consistency
        // If generated title matches verification strict facts, boost confidence
        // But base confidence comes from Verification step

        if (postData.importantDates && postData.importantDates.length > 0) {
            report.confidenceScore += SCORES.CRITICAL_DATES_CONFIRMED;
        }
        if (postData.totalPosts) {
            report.confidenceScore += SCORES.VACANCY_CONFIRMED;
        }

        // Cap confidence at 1.0
        report.confidenceScore = Math.min(report.confidenceScore, 1.0);

        // 4. Determine Status
        const { AUTO_PUBLISH } = require('../config/automation.config');

        // Strict Publishing Rule
        const isHighConfidence = report.confidenceScore >= THRESHOLDS.PUBLISH_CONFIDENCE;
        const isComplete = report.completenessScore >= THRESHOLDS.PUBLISH_COMPLETENESS;

        if (AUTO_PUBLISH && isHighConfidence && isComplete && report.isValid) {
            postData.status = 'published';
            postData.automationStatus = 'completed';
        } else {
            postData.status = 'draft';
            postData.automationStatus = report.isValid ? 'completed' : 'failed'; // If valid data but low score, it's still "completed" as a draft, if invalid data then "failed"
            // Actually user said: If validation fails -> failed.
            if (!report.isValid) postData.automationStatus = 'failed';
            else postData.automationStatus = 'completed'; // It's a completed draft
        }

        // Attach scores to the postData for saving
        postData.automationDetails = {
            ...postData.automationDetails,
            confidenceScore: report.confidenceScore,
            completenessScore: report.completenessScore,
            automationStatus: postData.automationStatus,
            issues: report.issues
        };

        return postData;
    }
}

module.exports = new ValidationService();
