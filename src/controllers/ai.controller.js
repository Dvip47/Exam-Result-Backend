const { GoogleGenerativeAI } = require('@google/generative-ai');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const Category = require('../models/Category');
const Post = require('../models/Post');
const { createSlug, generateUniqueSlug } = require('../utils/slugify');
const { POST_STATUS } = require('../config/constants');

class AIController {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }

    /**
     * Process raw text using Gemini AI
     * POST /api/admin/ai/process
     */
    async processText(req, res, next) {
        try {
            const { rawText } = req.body;

            if (!rawText) {
                return ApiResponse.error(res, 'Raw text is required', 400);
            }

            // Try gemini-flash-latest as it is verified to work with this key
            const model = this.genAI.getGenerativeModel({ model: "gemini-flash-latest" });
            // const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
            const prompt = `
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
                "applyOnlineLink": "URL",
                "notificationPdfUrl": "URL",
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

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();

            // Extract JSON from markdown code blocks if present
            if (text.includes('```json')) {
                text = text.split('```json')[1].split('```')[0].trim();
            } else if (text.includes('```')) {
                text = text.split('```')[1].split('```')[0].trim();
            }

            const aiData = JSON.parse(text);

            // Validation Layer
            const validationErrors = this.validateAIData(aiData);
            if (validationErrors.length > 0) {
                return ApiResponse.error(res, 'AI Validation Failed', 422, validationErrors);
            }

            // Map and Save as Draft
            const post = await this.createDraftFromAI(aiData);

            return ApiResponse.success(res, 'Draft created successfully', {
                postId: post._id,
                title: post.title
            });

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
        const forbiddenWords = ['official website', 'government portal', 'apply here officially'];

        if (!data.basicInformation?.postTitle) errors.push('Missing Post Title');
        if (data.basicInformation?.postTitle?.length > 65) errors.push('Title exceeds 65 characters');

        if (data.seoSettings?.metaDescription?.length > 160) errors.push('Meta description exceeds 160 characters');

        const checkForbidden = (obj) => {
            const str = JSON.stringify(obj).toLowerCase();
            forbiddenWords.forEach(word => {
                if (str.includes(word)) {
                    errors.push(`Forbidden word used: "${word}"`);
                }
            });
        };

        checkForbidden(data);

        return [...new Set(errors)]; // Unique errors
    }

    async createDraftFromAI(data) {
        // Find category ID by name
        let categoryId;
        const categoryName = data.basicInformation.category || 'Latest Jobs';
        const category = await Category.findOne({
            name: { $regex: new RegExp(categoryName, 'i') },
            deletedAt: null
        });

        if (category) {
            categoryId = category._id;
        } else {
            // Default to 'Latest Jobs' or first category
            const defaultCat = await Category.findOne({ deletedAt: null });
            categoryId = defaultCat ? defaultCat._id : null;
        }

        if (!categoryId) {
            throw new Error('No valid category found for the job post');
        }

        // Generate unique slug
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
            postDate: data.jobDetails.postDate ? new Date(data.jobDetails.postDate) : new Date(),
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
                    minWeight: v.weight // Schema uses minWeight
                }))
            },
            physicalEfficiencyTest: data.recruitmentCompleteness.physicalEfficiencyTest?.map(v => ({
                category: v.activity,
                distance: v.distance,
                time: v.time
            })),
            importantDates: data.importantDates?.map(d => ({
                label: d.label,
                date: d.date ? new Date(d.date) : null
            })),
            applyLink: data.linksAndStatus.applyOnlineLink,
            notificationPdf: data.linksAndStatus.notificationPdfUrl,
            status: POST_STATUS.DRAFT,
            metaTitle: data.seoSettings.metaTitle,
            metaDescription: data.seoSettings.metaDescription
        };

        const post = new Post(postData);
        await post.save();
        return post;
    }
}

module.exports = new AIController();
