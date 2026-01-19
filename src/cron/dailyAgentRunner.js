const cron = require('node-cron');
const mongoose = require('mongoose');
const discoveryService = require('../services/discovery.service');
const verificationService = require('../services/verification.service');
const generationService = require('../services/generation.service');
const validationService = require('../services/validation.service');
const Post = require('../models/post');
const Category = require('../models/category');
const { AUTO_PUBLISH, DRY_RUN } = require('../config/automation.config');
const connectDatabase = require('../config/database');

class DailyAgent {
    constructor() {
        this.isRunning = false;
        this.categories = [];
    }

    /**
     * Initializes the cron schedule
     */
    init() {
        // Run every day at 02:00 AM
        cron.schedule('0 2 * * *', () => {
            console.log('Running Daily Agent Job...');
            this.run();
        });
        console.log('Daily Agent scheduled for 02:00 AM.');
    }

    /**
     * Main Execution Flow
     */
    async run() {
        if (this.isRunning) {
            console.log('Agent already running, skipping.');
            return;
        }
        this.isRunning = true;
        console.time('DailyRun');

        try {
            // Ensure DB connection if running standalone
            if (mongoose.connection.readyState !== 1) {
                await connectDatabase();
            }

            // 0. Load Context
            await this.loadCategories();

            // 1. Discovery
            const signals = await discoveryService.discover();
            if (signals.length === 0) {
                console.log('No new signals found.');
                return;
            }

            console.log(`Processing ${signals.length} signals...`);

            for (const signal of signals) {
                try {
                    // 2. Verification
                    const verificationResult = await verificationService.verify(signal);

                    if (!verificationResult.verified) {
                        console.log(`Skipping ${signal.rawTitle} - Not verified.`);
                        continue;
                    }

                    // 3. Generation
                    let postData = await generationService.generateContent(verificationResult, signal);

                    // Attach Idempotency Key
                    postData.automationDetails.idempotencyKey = signal.idempotencyKey;

                    // 4. Validation
                    postData = validationService.validate(postData, verificationResult);

                    // 5. Category Mapping
                    postData.category = this.mapCategory(signal.postType);

                    // 6. Save (Publish or Draft)
                    await this.savePost(postData);

                } catch (err) {
                    console.error(`Failed to process signal ${signal.rawTitle}:`, err.message);
                }
            }

        } catch (error) {
            console.error('Critical Agent Error:', error);
        } finally {
            this.isRunning = false;
            console.timeEnd('DailyRun');
        }
    }

    async loadCategories() {
        this.categories = await Category.find({});
        if (this.categories.length === 0) {
            console.warn('No categories found in DB!');
        }
    }

    mapCategory(postType) {
        // Simple mapping based on normalized PostType
        // Assuming standard categories exist: 'Latest Jobs', 'Results', 'Admit Card', 'Syllabus', 'Answer Key'
        // If not found, default to first category (usually dangerous, better to Draft) (or Create?)

        let targetSlug = 'latest-jobs';
        const typeLower = postType.toLowerCase();

        if (typeLower.includes('result')) targetSlug = 'result';
        else if (typeLower.includes('admit')) targetSlug = 'admit-card';
        else if (typeLower.includes('syllabus')) targetSlug = 'syllabus';
        else if (typeLower.includes('answer')) targetSlug = 'answer-key'; // answer-key

        const category = this.categories.find(c => c.slug === targetSlug) ||
            this.categories.find(c => c.name.toLowerCase().includes(targetSlug.replace('-', ' '))) ||
            this.categories[0]; // Fallback

        return category ? category._id : null;
    }

    async savePost(postData) {
        if (DRY_RUN) {
            console.log('[DRY RUN] Would save post:', postData.title, postData.status);
            return;
        }

        try {
            // Final check for duplicates before insert (race condition handling)
            const exists = await Post.findOne({ slug: postData.slug });
            if (exists) {
                // If fuzzy match logic said "Update", we update. 
                // But for now, we just skip or maybe auto-rename slug?
                // Rules: "Exact match -> SKIP". "Fuzzy match -> ..."
                // Discovery service already filtered exact matches.
                // We add random suffix to slug if collision occurs but title is different?
                // Or just Log and Skip.
                console.log(`Duplicate slug ${postData.slug}, skipping save.`);
                return;
            }

            const newPost = await Post.create(postData);
            console.log(`Saved Post: ${newPost.title} [${newPost.status}]`);
        } catch (error) {
            console.error('Error saving post:', error.message);
        }
    }
}

// Export singleton
const agent = new DailyAgent();

// Allow running standalone
if (require.main === module) {
    require('dotenv').config();
    agent.run().then(() => {
        // Only exit if run as script, but let it keep running if expecting async?
        // Actually, run() awaits everything. We can exit.
        // But let's leave it open for a bit or exit explicitly.
        console.log('Manual Run Complete');
        process.exit(0);
    });
}

module.exports = agent;
