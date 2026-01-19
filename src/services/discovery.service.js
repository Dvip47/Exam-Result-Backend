const axios = require('axios');
const cheerio = require('cheerio');
const Post = require('../models/post');

class DiscoveryService {
    constructor() {
        // Known aggregators (signals only)
        this.aggregators = [
            'https://www.sarkariresult.com'
        ];

        // Keywords to identify relevant links
        this.keywords = ['apply', 'online', 'form', 'notification', 'result', 'admit card'];
    }

    /**
     * Main discovery loop
     * @returns {Promise<Array>} List of new potential posts
     */
    async discover() {
        console.log('Starting Discovery...');
        const newSignals = [];

        for (const url of this.aggregators) {
            try {
                // Robots.txt check
                const isAllowed = await this.isAllowedByRobots(url);
                if (!isAllowed) {
                    console.log(`Skipping ${url} due to robots.txt disallow.`);
                    continue;
                }

                const signals = await this.scrapeAggregator(url);
                for (const signal of signals) {
                    // YEAR FILTER FIX
                    if (signal.year !== '2026') {
                        console.log(`Skipping ${signal.rawTitle} – year not 2026 (Found: ${signal.year})`);
                        continue;
                    }

                    const key = this.generateIdempotencyKey(signal);
                    signal.idempotencyKey = key;

                    const exists = await this.checkIfExists(signal);
                    if (!exists) {
                        newSignals.push(signal);
                    }
                }
            } catch (error) {
                console.error(`Error scraping ${url}:`, error.message);
            }
        }

        console.log(`Discovered ${newSignals.length} new signals.`);
        return newSignals;
    }

    async isAllowedByRobots(baseUrl) {
        try {
            const robotsUrl = new URL('/robots.txt', baseUrl).href;
            const { data } = await axios.get(robotsUrl, { timeout: 5000 });
            // Simple check: looking for "Disallow: /" or specific paths
            const disallowAll = /Disallow:\s*\/\s*($|\n)/i.test(data);
            return !disallowAll;
        } catch (e) {
            return true; // Assume allowed if robots.txt 404s
        }
    }

    generateIdempotencyKey(signal) {
        const crypto = require('crypto');
        const data = `${signal.authority}|${signal.exam}|${signal.year}|${signal.postType}`;
        return crypto.createHash('md5').update(data).digest('hex');
    }

    /**
     * Scrapes a single aggregator URL for links
     * @param {string} url 
     * @returns {Promise<Array>}
     */
    async scrapeAggregator(url) {
        try {
            const { data } = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            const $ = cheerio.load(data);
            const signals = [];
            const seenLinks = new Set();

            $('a').each((i, el) => {
                const title = $(el).text().trim();
                const link = $(el).attr('href');

                if (title && link && !seenLinks.has(link)) {
                    // Filter Noise
                    const noise = ['result', 'app', 'youtube', 'portal'];
                    const isNoise = noise.some(n => title.toLowerCase().includes(n));
                    if (isNoise) return;

                    // Filter by keywords
                    if (this.isRelevant(title)) {
                        const normalized = this.normalizeTitle(title);
                        if (normalized) {
                            signals.push({
                                rawTitle: title,
                                url: this.resolveUrl(url, link),
                                ...normalized,
                                source: url
                            });
                            seenLinks.add(link);
                        }
                    }
                }
            });

            return signals;
        } catch (error) {
            console.error(`Failed to fetch ${url}: ${error.message}`);
            return []; // Return empty on failure to continue flow
        }
    }

    /**
     * Checks if title contains relevant keywords
     * @param {string} title 
     */
    isRelevant(title) {
        const lower = title.toLowerCase();
        return this.keywords.some(k => lower.includes(k));
    }

    /**
     * Normalizes a raw title into structured data
     * Format assumption: "Authority Name Exam Name Year Post Type"
     * @param {string} rawTitle 
     */
    normalizeTitle(rawTitle) {
        // Regex to extract Year (Strictly 202x)
        const yearMatch = rawTitle.match(/(202[0-9])/);
        const year = yearMatch ? yearMatch[0] : null;

        // Simple heuristic parsing
        // This is a "best effort" normalizer. 
        // Real implementation would need complex regex or LLM based parsing for "Authority" vs "Exam"

        // Check for specific known authorities to split string
        const authorities = ['UPSC', 'SSC', 'IBPS', 'SBI', 'RBI', 'UPPSC', 'BPSC', 'RPSC', 'MPPSC', 'Indian Navy', 'Indian Army', 'Indian Air Force'];
        let authority = 'Unknown';
        let exam = rawTitle;
        let postType = 'Recruitment';

        for (const auth of authorities) {
            if (rawTitle.includes(auth)) {
                authority = auth;
                break;
            }
        }

        if (rawTitle.toLowerCase().includes('result')) postType = 'Result';
        if (rawTitle.toLowerCase().includes('admit card')) postType = 'Admit Card';
        if (rawTitle.toLowerCase().includes('syllabus')) postType = 'Syllabus';
        if (rawTitle.toLowerCase().includes('answer key')) postType = 'Answer Key';
        if (rawTitle.toLowerCase().includes('apply online') || rawTitle.toLowerCase().includes('online form')) postType = 'Recruitment';

        return {
            authority,
            exam, // In a real world, we'd strip the authority from the exam string
            year,
            postType
        };
    }

    /**
     * Check if post already exists in DB
     * @param {Object} signal 
     */
    async checkIfExists(signal) {
        // Use Idempotency Key first
        const existing = await Post.findOne({
            'automationDetails.idempotencyKey': signal.idempotencyKey,
            'automationDetails.automationStatus': 'completed'
        });

        if (existing) return true;

        // Fallback to title match for safety
        const count = await Post.countDocuments({
            title: { $regex: new RegExp(signal.rawTitle, 'i') },
        });

        return count > 0;
    }

    resolveUrl(base, relative) {
        try {
            return new URL(relative, base).href;
        } catch (e) {
            return relative;
        }
    }
}

module.exports = new DiscoveryService();
