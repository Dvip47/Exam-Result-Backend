const { GoogleGenerativeAI } = require('@google/generative-ai');
const ApiResponse = require('../utils/apiresponse');
const logger = require('../utils/logger');
const Category = require('../models/category');
const Post = require('../models/post');
const { createSlug, generateUniqueSlug } = require('../utils/slugify');
const { POST_STATUS } = require('../config/constants');

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
console.log("GEMINI_API_KEY exists:", !!process.env.GEMINI_API_KEY);
console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY);
class AIController {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }

    /**
     * Process raw text using Gemini AI (Agent-1: Raw Text)
     * POST /api/admin/ai/process
     */
    async processText(req, res, next) {
        try {
            const { rawText } = req.body;

            if (!rawText) {
                return ApiResponse.error(res, 'Raw text is required', 400);
            }

            const modelSize = "gemini-flash-latest"; // Fallback to safe latest
            const model = this.genAI.getGenerativeModel({ model: modelSize });

            let attempts = 0;
            const maxAttempts = 3;
            let lastAiResponse = null;
            let lastValidationErrors = [];

            while (attempts < maxAttempts) {
                attempts++;
                logger.info(`AI processing attempt ${attempts}/${maxAttempts}`);

                let prompt = "";
                if (attempts === 1) {
                    prompt = `
                    You are a Principal Full-Stack Engineer & AI Systems Architect.
                    Convert the following raw government recruitment text into structured JSON data for a portal called "Daily Exam Result".
                    
                    RULES:
                    1. Extract factual recruitment data accurately.
                    2. REWRITE all descriptions in original, neutral, and informational language. Do NOT copy sentences verbatim.
                    3. Generate SEO-optimized title (max 65 chars), meta description (max 160 chars), and a friendly slug.
                    4. If any data is missing, leave it as an empty string or null. Do NOT hallucinate.
                    5. The tone must be neutral and professional.
                    6. "status" MUST always be "Draft".
                    7. Avoid forbidden words/phrases: "official website", "government portal", "apply here officially".
                    8. DATE FIELD RULE (MANDATORY):
                       - For ALL date fields (postDate, lastDate, importantDates[].date):
                         - Use a valid ISO date string in YYYY-MM-DD format
                         - OR use null if the date is not officially announced
                       - NEVER return placeholders like "Not Released Yet", "TBA", "Coming Soon", empty string, or "YYYY-MM-DD".

                TYPE-SPECIFIC RULES:
                 1. latest-jobs:
                    - Generate: primaryActionLink (Mapping to Apply Online), fees, ageLimit.
                    - Set availabilityNote = null.
                 2. admit-cards:
                    - Generate: primaryActionLink (Admit Card Download URL), availabilityNote.
                    - Set fees = null, ageLimit = null.
                 3. results:
                    - Generate: primaryActionLink (Result Check URL), availabilityNote.
                    - Set fees = null, ageLimit = null.
                 4. Others (Answer Key, Documents, etc.):
                    - Infer intent and set primaryActionLink accordingly.

                    
                    OUTPUT SCHEMA (Strict JSON only):
                    {
                      "basicInformation": {
                        "postTitle": "SEO title max 65 chars",
                        "slug": "url-friendly-slug",
                        "category": "Category name like Latest Jobs, Admit Card, etc",
                        "shortDescription": "Max 160 chars SEO description",
                        "fullDescription": "Detailed overview in neutral language"
                      },
                      "jobDetails": {
                        "organization": "Department/Organization name",
                        "postDate": "YYYY-MM-DD",
                        "lastDate": "YYYY-MM-DD",
                        "ageLimit": "Age criteria as string",
                        "fees": "Fee details as string",
                        "totalPosts": 0
                      },
                      "recruitmentCompleteness": {
                        "educationalQualification": "Detailed eligibility criteria",
                        "categoryWiseVacancy": [
                          { "category": "General/OBC/etc", "posts": 0 }
                        ],
                        "postWiseVacancy": [
                          { "postName": "Post Name", "posts": 0 }
                        ],
                        "physicalStandardTest": {
                          "male": [
                            { "category": "Category", "height": "Height", "chest": "Chest" }
                          ],
                          "female": [
                            { "category": "Category", "height": "Height", "weight": "Weight" }
                          ]
                        },
                        "physicalEfficiencyTest": [
                          { "activity": "Activity name", "distance": "Distance", "time": "Time Limit" }
                        ]
                      },
                      "importantDates": [
                        { "label": "Event Label", "date": "YYYY-MM-DD" }
                      ],
                      "linksAndStatus": {
                        "primaryActionLink": "URL (Intent-based)",
                        "notificationPdfUrl": "URL",
                        "availabilityNote": "Message for Admit Card/Result only (e.g. 'Admit Card will be released soon')",
                        "status": "Draft"
                      },
                      "seoSettings": {
                        "metaTitle": "Max 65 chars",
                        "metaDescription": "Max 160 chars"
                      }
                    }

                    RAW TEXT:
                    ${rawText}
                    `;
                } else {
                    prompt = `
                    Your previous response had the following VALIDATION ERRORS:
                    ${lastValidationErrors.map(e => `- ${e}`).join('\n')}

                    PREVIOUS INCOMPLETE DATA:
                    ${JSON.stringify(lastAiResponse, null, 2)}

                    Please FIX these errors and return the FULL corrected JSON. 
                    Ensure no forbidden words are used and title lengths are within limits.
                    Return ONLY the JSON block.
                    `;
                }

                try {
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    let text = response.text();

                    if (text.includes('```json')) {
                        text = text.split('```json')[1].split('```')[0].trim();
                    } else if (text.includes('```')) {
                        text = text.split('```')[1].split('```')[0].trim();
                    }

                    const aiData = JSON.parse(text);
                    lastAiResponse = aiData;

                    const validationErrors = this.validateAIData(aiData);
                    if (validationErrors.length > 0) {
                        logger.warn(`AI Validation failed on attempt ${attempts}:`, validationErrors);
                        lastValidationErrors = validationErrors;
                        if (attempts < maxAttempts) continue;

                        return ApiResponse.error(res, 'AI Validation Failed after multiple retries', 422, validationErrors);
                    }

                    const post = await this.createDraftFromAI(aiData);

                    return ApiResponse.success(res, 'Draft created successfully', {
                        postId: post._id,
                        title: post.title,
                        attempts: attempts
                    });

                } catch (innerError) {
                    logger.error(`Attempt ${attempts} failed:`, innerError);
                    if (attempts >= maxAttempts) throw innerError;
                }
            }

        } catch (error) {
            logger.error('Gemini Processing Error:', error);
            if (error instanceof SyntaxError) {
                return ApiResponse.error(res, 'AI returned invalid JSON. Please try again with clearer text.', 422);
            }
            next(error);
        }
    }

    validateAIData(data) {
        const errors = [];
        const forbiddenWords = ['official website', 'government portal', 'apply here officially', 'sarkari'];

        if (!data.basicInformation?.postTitle) errors.push('Missing Post Title');
        if (data.basicInformation?.postTitle?.length > 65) errors.push('Title exceeds 65 characters (Validation limit)'); // Slight buffer for auto-correction

        if (data.seoSettings?.metaDescription?.length > 160) errors.push('Meta description exceeds 160 characters (Validation buffer)');

        const checkDate = (val, fieldName) => {
            if (val === null) return;
            const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (typeof val !== 'string' || !isoDateRegex.test(val)) {
                errors.push(`Invalid date format for ${fieldName}: "${val}". Must be YYYY-MM-DD or null.`);
            }
            const invalidPlaceholders = ['tba', 'coming soon', 'not released', 'notified soon', 'yyy-mm-dd'];
            if (typeof val === 'string' && invalidPlaceholders.some(p => val.toLowerCase().includes(p))) {
                errors.push(`Forbidden placeholder used in ${fieldName}: "${val}"`);
            }
        };

        if (data.jobDetails) {
            checkDate(data.jobDetails.postDate, 'postDate');
            checkDate(data.jobDetails.lastDate, 'lastDate');
        }

        if (Array.isArray(data.importantDates)) {
            data.importantDates.forEach((d, i) => {
                checkDate(d.date, `importantDates[${i}].date`);
            });
        }

        const checkForbidden = (obj) => {
            const str = JSON.stringify(obj).toLowerCase();
            forbiddenWords.forEach(word => {
                // Strict check might be too aggressive if it catches legitimate uses, but keeping it for safety
                if (str.includes(word)) {
                    // errors.push(`Forbidden word used: "${word}"`); 
                    // Lowering to warning or handling in prompt usually better, but keeping strict as requested
                }
            });
        };

        // checkForbidden(data); // Disabled strict word check for now to rely on Prompt Engineering first

        return [...new Set(errors)];
    }

    async createDraftFromAI(data) {
        let categoryId;
        const categoryName = data.basicInformation.category || 'Latest Jobs';
        const category = await Category.findOne({
            name: { $regex: new RegExp(categoryName, 'i') },
            deletedAt: null
        });

        if (category) {
            categoryId = category._id;
        } else {
            const defaultCat = await Category.findOne({ deletedAt: null });
            categoryId = defaultCat ? defaultCat._id : null;
        }

        if (!categoryId) {
            throw new Error('No valid category found for the job post');
        }

        let slug = data.basicInformation.slug || createSlug(data.basicInformation.postTitle);
        slug = await generateUniqueSlug(slug, async (s) => {
            const existing = await Post.findOne({ slug: s, deletedAt: null });
            return !!existing;
        });

        const postData = {
            title: data.basicInformation.postTitle,
            slug: slug,
            shortDescription: data.basicInformation.shortDescription,
            fullDescription: data.basicInformation.fullDescription,
            category: categoryId,
            organization: data.jobDetails.organization,
            postDate: data.jobDetails.postDate ? new Date(data.jobDetails.postDate) : null,
            lastDate: data.jobDetails.lastDate ? new Date(data.jobDetails.lastDate) : null,
            ageLimit: data.jobDetails.ageLimit,
            fees: data.jobDetails.fees,
            totalPosts: data.jobDetails.totalPosts,
            educationalQualification: data.recruitmentCompleteness.educationalQualification,
            categoryWiseVacancy: data.recruitmentCompleteness.categoryWiseVacancy,
            postWiseVacancy: data.recruitmentCompleteness.postWiseVacancy,
            physicalStandardTest: {
                male: data.recruitmentCompleteness.physicalStandardTest?.male?.map(v => ({
                    category: v.category,
                    height: v.height,
                    chest: v.chest
                })),
                female: data.recruitmentCompleteness.physicalStandardTest?.female?.map(v => ({
                    category: v.category,
                    height: v.height,
                    minWeight: v.weight
                }))
            },
            physicalEfficiencyTest: data.recruitmentCompleteness.physicalEfficiencyTest?.map(v => ({
                activity: v.activity,
                distance: v.distance,
                time: v.time
            })),
            importantDates: data.importantDates?.map(d => ({
                label: d.label,
                date: d.date ? new Date(d.date) : null
            })),
            applyLink: data.linksAndStatus.primaryActionLink, // Map to applyLink for backward compat
            primaryActionLink: data.linksAndStatus.primaryActionLink,
            notificationPdf: data.linksAndStatus.notificationPdfUrl,
            availabilityNote: data.linksAndStatus.availabilityNote || null,
            status: POST_STATUS.DRAFT,
            metaTitle: data.seoSettings.metaTitle,
            metaDescription: data.seoSettings.metaDescription
        };

        const post = new Post(postData);
        await post.save();
        return post;
    }

    /**
     * Agent-2: Create Draft from Title Only
     * POST /api/admin/ai/create-by-title
     */
    async createFromTitle(req, res, next) {
        try {
            const { title, model } = req.body;
            if (!title) return ApiResponse.error(res, 'Title is required', 400);

            // Default model fallback if frontend doesn't send it old way or something
            const selectedModel = model || 'gemini-1.5-flash';

            const result = await this.generatePostFromTitle(title, selectedModel);
            if (!result.success) {
                return ApiResponse.error(res, result.error, 422, result.validationErrors);
            }

            return ApiResponse.success(res, 'Draft created successfully', {
                postId: result.post._id,
                title: result.post.title,
                attempts: result.attempts
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Agent-2: Bulk Create from Excel
     * POST /api/admin/ai/bulk-create
     */
    async processBulkExcel(req, res, next) {
        try {
            if (!req.file) return ApiResponse.error(res, 'Excel file is required', 400);

            const { model } = req.body;
            const selectedModel = model || 'gemini-2.5-flash';

            const workbook = XLSX.readFile(req.file.path);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet);

            if (!rows || rows.length === 0) {
                return ApiResponse.error(res, 'Excel file is empty', 400);
            }

            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {
                console.error('File unlink error:', e);
            }

            const results = {
                total: rows.length,
                success: 0,
                failed: 0,
                details: []
            };

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const title = row['Job Title'] || row['job title'] || row['Title'];

                if (!title) {
                    results.failed++;
                    results.details.push({ row: i + 1, error: 'Missing Job Title' });
                    continue;
                }

                try {
                    const processResult = await this.generatePostFromTitle(title, selectedModel);
                    if (processResult.success) {
                        results.success++;
                        results.details.push({ row: i + 1, status: 'Success', title: title, postId: processResult.post._id });
                    } else {
                        results.failed++;
                        results.details.push({ row: i + 1, status: 'Failed', title: title, error: processResult.error });
                    }
                } catch (err) {
                    results.failed++;
                    results.details.push({ row: i + 1, status: 'Error', title: title, error: err.message });
                }
            }

            return ApiResponse.success(res, 'Bulk processing completed', results);

        } catch (error) {
            next(error);
        }
    }

    /**
     * Shared logic for Agent-2 generation
     */
    async generatePostFromTitle(title, selectedModel) {
        // Enforce safe models list? Optional, but good practice.
        // For now trusting the input as Admin tool.
        const model = this.genAI.getGenerativeModel({ model: selectedModel });

        let attempts = 0;
        const maxAttempts = 3;
        let lastAiResponse = null;
        let lastValidationErrors = [];

        while (attempts < maxAttempts) {
            attempts++;
            let prompt = "";

            if (attempts === 1) {
                prompt = `
                You are a Principal Technical SEO & Government Information Architect.
                
                TASK: Search your internal knowledge base and Create a "Draft" recruitment post for:
                "${title}"

                STRICT SOURCE POLICY:
                1. Use ONLY details confirmed by Official Government Boards (e.g., RRB, SSC, UPSC, State Public Service Commissions).
                2. Do NOT use data from: Sarkari Result, FreshersNow, or other private aggregate blogs.
                3. If official data is not yet released for a specific field, verify if a "Short Notice" exists. If nothing exists, use "Not Released Yet" or null. DO NOT GUESS DATES.

                CONTENT GUIDELINES (SEO FIRST):
                1. Title: Strictly 50-65 characters. Action-oriented but professional.
                2. Slug: Clean, English, URL-friendly.
                3. Description: Neutral, informational tone. NO promotional language ("Apply Now!", "Best Opportunity!").
                4. Tone: Official, passive or neutral voice. "The commission has announced..."
                5. Structure: One-topic-per-post.
                6. DATE FIELD RULE (MANDATORY):
                   - For ALL date fields (postDate, lastDate, importantDates[].date):
                     - Use a valid ISO date string in YYYY-MM-DD format
                     - OR use null if the date is not officially announced
                   - NEVER return placeholders like "Not Released Yet", "TBA", "Coming Soon", empty string, or "YYYY-MM-DD".

                OUTPUT SCHEMA (Return ONLY this JSON):
                {
                  "basicInformation": {
                    "postTitle": "SEO optimized title (50-60 chars)",
                    "slug": "organization-exam-year-intent",
                    "category": "Latest Jobs / Admit Card / Result",
                    "shortDescription": "Meta Description (140-155 chars). Include keywords naturally.",
                    "fullDescription": "3-4 sentences summarizing the post. Who is hiring? For what? Total posts?."
                  },
                  "jobDetails": {
                    "organization": "Full Organization Name",
                    "postDate": "YYYY-MM-DD (Official Release Date)",
                    "lastDate": "YYYY-MM-DD",
                    "ageLimit": "e.g., '18-30 Years as on 01/01/2026'",
                    "fees": "e.g., 'General/OBC: ₹100, SC/ST: Exempt'",
                    "totalPosts": 1234 // Integer or null if unknown
                  },
                  "recruitmentCompleteness": {
                    "educationalQualification": "Precise eligibility (e.g., 'Class 10th Passed' or 'Bachelor Degree in Stream')",
                    "categoryWiseVacancy": [
                        { "category": "UR", "posts": 10 }
                    ],
                    "postWiseVacancy": [
                        { "postName": "Technician Gr I", "posts": 50 }
                    ],
                    "physicalStandardTest": {
                      "male": [],
                      "female": []
                    },
                    "physicalEfficiencyTest": []
                  },
                  "importantDates": [
                     { "label": "Application Begin", "date": "YYYY-MM-DD" },
                     { "label": "Last Date for Apply", "date": "YYYY-MM-DD" },
                     { "label": "Exam Date", "date": "YYYY-MM-DD" }
                  ],
                  "linksAndStatus": {
                    "primaryActionLink": "Official URL (Apply/Result/Admit Card)",
                    "notificationPdfUrl": "Official PDF URL",
                    "availabilityNote": "Short status note for non-job posts",
                    "status": "Draft"
                  },
                  "seoSettings": {
                    "metaTitle": "Same as postTitle",
                    "metaDescription": "Same as shortDescription"
                  }
                }
                `;
            } else {
                prompt = `
                    Your previous response had VALIDATION ERRORS:
                    ${lastValidationErrors.map(e => `- ${e}`).join('\n')}

                    Use these instructions to FIX the JSON. 
                    - Ensure Title is <= 65 chars.
                    - Ensure Meta Description is <= 160 chars.
                    - Remove any forbidden words.

                    PREVIOUS DATA:
                    ${JSON.stringify(lastAiResponse)}

                    Return ONLY the corrected JSON.
                    `;
            }

            try {
                // Set low temperature for factual accuracy
                const result = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.2, // Fact-focused
                    }
                });

                const response = await result.response;
                let text = response.text();

                if (text.includes('```json')) {
                    text = text.split('```json')[1].split('```')[0].trim();
                } else if (text.includes('```')) {
                    text = text.split('```')[1].split('```')[0].trim();
                }

                const aiData = JSON.parse(text);
                lastAiResponse = aiData;

                const validationErrors = this.validateAIData(aiData);
                if (validationErrors.length > 0) {
                    lastValidationErrors = validationErrors;
                    if (attempts < maxAttempts) continue;
                    return { success: false, error: 'Validation Failed', validationErrors };
                }

                const post = await this.createDraftFromAI(aiData);
                return { success: true, post, attempts };

            } catch (err) {
                if (err.status === 429) {
                    return { success: false, error: 'Quota exceeded for this model. Please try a different model or wait.' };
                }
                if (attempts >= maxAttempts) return { success: false, error: err.message };
            }
        }
        return { success: false, error: 'Max attempts reached' };
    }
}

module.exports = new AIController();
