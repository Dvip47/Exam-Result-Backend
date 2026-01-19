const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

class GenerationService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Use the model from env, or fallback to a high-reasoning model if possible
        const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-1.5-pro';
        this.model = this.genAI.getGenerativeModel({ model: modelName });
        this.callTimestamps = [];
    }

    async rateLimit() {
        const now = Date.now();
        this.callTimestamps = this.callTimestamps.filter(t => now - t < 60000);

        if (this.callTimestamps.length >= 5) {
            const oldest = this.callTimestamps[0];
            const waitTime = 60000 - (now - oldest) + 1000;
            console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return this.rateLimit(); // Re-check after waiting
        }

        this.callTimestamps.push(Date.now());
    }

    /**
     * Generates a full Post object from verified facts
     * @param {Object} verificationResult 
     * @param {Object} signal 
     * @returns {Promise<Object>} JSON matching Post schema
     */
    async generateContent(verificationResult, signal) {
        await this.rateLimit();
        console.log('Generating content with Gemini...');

        // If not verified, we can't generate a high-quality post. 
        // But we might still draft it if we have at least some signal data?
        // Rules say: "If any critical field uncertain -> SAVE AS DRAFT".
        // "Official gov / nic domains = ONLY truth".

        const inputContext = `
        Source Signal: ${JSON.stringify(signal)}
        Verified Facts: ${JSON.stringify(verificationResult.facts)}
        Extracted Official Text (Snippet): ${verificationResult.extractedText ? verificationResult.extractedText.substring(0, 10000) : 'Not available'}
        Official PDF URL: ${verificationResult.officialPdfUrl}
        Official Website: ${verificationResult.officialUrl}
        `;

        const prompt = `
        You are an AI assistant for "SarkariResult", a job portal.
        Your task is to generate a JSON object for a Job Post based STRICTLY on the provided text.
        
        RULES:
        1. **NO HALLUCITATIONS**: If a specific detail (like fee, age limit) is not in the text, use null or a safe string.
        2. **Official Source is Truth**: Prioritize "Extracted Official Text".
        3. **Schema**: The output MUST be a valid JSON object matching the detailed structure below.
        4. **Original Content**: Rewrite descriptions in professional words.
        5. **SEO LIMITS** (MANDATORY): 
           - metaTitle length ≤ 65 characters.
           - metaDescription length ≤ 150 characters.
           - If metaTitle exceeds 65 chars or metaDescription exceeds 150 chars, regenerate until limits are satisfied.
        6. **Availability & Standards**: 
           - Extract "Availability Notes" (e.g., "Admit card expected in April") if found and set to \`availabilityNote\`.
           - Extract Physical Standards (Height, Chest, Weight) into \`physicalStandardTest\`.
           - Extract Physical Efficiency (Running, etc.) into \`physicalEfficiencyTest\`.
        
        REQUIRED JSON STRUCTURE:
        {
          "title": "Normalized Title",
          "slug": "url-friendly-slug-with-year",
          "shortDescription": "2-3 lines summary.",
          "fullDescription": "Detailed info in HTML (p, ul, li tags only).",
          "category": null,
          "organization": "Organization Name",
          "postDate": "YYYY-MM-DD",
          "lastDate": "YYYY-MM-DD",
          "qualification": "Brief Eligibility",
          "ageLimit": "Age range details",
          "fees": "Application Fee details",
          "totalPosts": Number,
          "educationalQualification": "Detailed Edu Qual",
          "categoryWiseVacancy": [ { "category": "Gen/OBC/SC/ST", "totalPosts": 0 } ],
          "postWiseVacancy": [ { "postName": "Post Name", "totalPosts": 0 } ],
          "importantDates": [ { "label": "Application Begin", "date": "YYYY-MM-DD" }, { "label": "Last Date", "date": "YYYY-MM-DD" } ],
          "notificationPdf": "URL from input",
          "primaryActionLink": "URL from input",
          "availabilityNote": "String (e.g. Card out on 15th)",
          "physicalStandardTest": {
             "male": [ { "category": "General", "height": "170 cm", "chest": "80-85 cm" } ],
             "female": [ { "category": "General", "height": "157 cm", "minWeight": "45 kg" } ]
          },
          "physicalEfficiencyTest": [ { "category": "Running", "distance": "5km", "time": "24 mins" } ],
          "metaTitle": "SEO Title (≤ 65 chars)",
          "metaDescription": "SEO Description (≤ 150 chars)"
        }

        INPUT DATA:
        ${inputContext}
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Clean markdown code blocks if present
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(jsonStr);

            // Post-processing
            data.automationDetails = {
                discoveredVia: signal.source,
                sourceType: 'aggregator',
                verifiedFrom: verificationResult.officialUrl || 'aggregator_signal',
                officialPdfUrl: verificationResult.officialPdfUrl,
                verificationTimestamp: new Date(),
                contentGeneratedAt: new Date(),
                automationVersion: require('../config/automation.config').AGENT_VERSION,
                aiModelUsed: this.model.model,
            };

            return data;

        } catch (error) {
            console.error('Generation failed:', error);
            // Return a minimal draft if generation fails
            return {
                title: signal.rawTitle,
                slug: this.slugify(signal.rawTitle),
                status: 'draft',
                automationDetails: {
                    issues: ['Generation Failed: ' + error.message]
                }
            };
        }
    }

    slugify(text) {
        return text.toString().toLowerCase()
            .replace(/\s+/g, '-')           // Replace spaces with -
            .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
            .replace(/\-\-+/g, '-')         // Replace multiple - with single -
            .replace(/^-+/, '')             // Trim - from start of text
            .replace(/-+$/, '');            // Trim - from end of text
    }
}

module.exports = new GenerationService();
