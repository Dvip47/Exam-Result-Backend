const axios = require('axios');
const cheerio = require('cheerio');
const pdfParse = require('pdf-parse');
const { SCORES } = require('../config/automation.config');

class VerificationService {
    constructor() {
        this.officialDomains = ['.gov.in', '.nic.in', '.org.in', '.edu.in', '.res.in'];
    }

    /**
     * Verifies a signal by finding authoritative sources
     * @param {Object} signal - Normalized signal from Discovery
     * @returns {Promise<Object>} VerificationResult
     */
    async verify(signal) {
        console.log(`Verifying signal: ${signal.rawTitle}`);
        const result = {
            verified: false,
            officialUrl: null,
            officialPdfUrl: null,
            extractedText: '',
            confidenceScore: 0,
            facts: {}
        };

        try {
            // 1. Visit Aggregator Page to find Official Links
            const pageData = await this.getPage(signal.url);
            if (!pageData) return result;

            const $ = cheerio.load(pageData);
            const potentialLinks = [];

            $('a').each((i, el) => {
                const href = $(el).attr('href');
                const text = $(el).text().toLowerCase();
                if (href) {
                    potentialLinks.push({ href: href.trim(), text });
                }
            });

            // 2. Filter for Official Links
            // We look for specific anchor text usually found in aggregators OR just check URL patterns
            const officialLinks = potentialLinks.filter(l => this.isOfficialDomain(l.href));

            // Prioritize "Notification" or "PDF" links
            const pdfLink = officialLinks.find(l =>
                l.href.toLowerCase().endsWith('.pdf') ||
                l.text.includes('notification') ||
                l.text.includes('download')
            );

            // Prioritize "Apply Online" or "Official Website" links
            const applyLink = officialLinks.find(l =>
                l.text.includes('apply') ||
                l.text.includes('official') ||
                l.text.includes('website')
            );

            if (pdfLink) {
                result.officialPdfUrl = pdfLink.href;

                // Try to extract text from PDF
                try {
                    const pdfBuffer = await this.getBuffer(pdfLink.href);

                    if (Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 0) {
                        const pdfData = await pdfParse(pdfBuffer);
                        const text = pdfData.text;
                        result.extractedText = text.substring(0, 3000);

                        // PDF VALIDATION RULES
                        const lowerText = text.toLowerCase();
                        const hasKeyword = lowerText.includes(signal.authority.toLowerCase()) ||
                            lowerText.includes(signal.exam.toLowerCase());

                        const datePatterns = [
                            /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/, // DD/MM/YYYY or similar
                            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}/i, // Month YYYY
                            /\d{4}/ // Just year if nothing else
                        ];
                        const hasDate = datePatterns.some(pattern => pattern.test(text));

                        if (hasKeyword && hasDate) {
                            // EXTRA SAFETY: Check if text mentions a different year
                            const otherYearMatch = text.match(/\b(202[0-5]|202[7-9])\b/);
                            if (otherYearMatch && !text.includes('2026')) {
                                console.log(`Skipping non-2026 vacancy discovered in PDF: ${otherYearMatch[0]}`);
                                result.verified = false;
                                return result;
                            }

                            result.confidenceScore += SCORES.OFFICIAL_PDF_FOUND;
                            console.log(`PDF parsed successfully and validated for ${signal.exam}`);
                        } else {
                            console.warn(`PDF parsed successfully but failed validation for ${signal.exam}. Keyword: ${hasKeyword}, Date: ${hasDate}`);
                        }
                    } else {
                        console.warn('PDF parse failed: Invalid or empty buffer');
                    }
                } catch (e) {
                    console.warn(`PDF parse failed: ${e.message}`);
                }
            }

            if (applyLink) {
                result.officialUrl = applyLink.href;
                result.confidenceScore += SCORES.OFFICIAL_APPLY_LINK;
            }

            // If we found at least one official source, we mark as verified enough to proceed
            if (result.officialUrl || result.officialPdfUrl) {
                result.verified = true;
                // Add basic facts we know for sure
                result.facts = {
                    authority: signal.authority,
                    exam: signal.exam,
                    year: signal.year,
                    sourceUrl: result.officialUrl || result.officialPdfUrl
                };
            }

        } catch (error) {
            console.error('Verification failed:', error.message);
        }

        return result;
    }

    isOfficialDomain(url) {
        try {
            const hostname = new URL(url).hostname;
            return this.officialDomains.some(d => hostname.endsWith(d));
        } catch (e) {
            return false; // Invalid URL
        }
    }

    async getPage(url) {
        try {
            const { data } = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 20000
            });
            return data;
        } catch (e) {
            console.error(`Failed to fetch page ${url}: ${e.message}`);
            return null;
        }
    }

    async getBuffer(url) {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 20000
        });
        return response.data;
    }
}

module.exports = new VerificationService();
