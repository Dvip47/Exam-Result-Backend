const mongoose = require('mongoose');
const verificationService = require('../services/verification.service');
const generationService = require('../services/generation.service');
const validationService = require('../services/validation.service');
const Post = require('../models/post');
const Category = require('../models/category');
const connectDatabase = require('../config/database');

// Mock Signal mimicking a successful Discovery
const MOCK_SIGNAL = {
    rawTitle: 'UPSC Civil Services IFS 2024 Apply Online',
    url: 'https://upsc.gov.in', // Official site directly, simulating a finding
    authority: 'UPSC',
    exam: 'Civil Services',
    year: '2024',
    postType: 'Recruitment',
    source: 'test_script'
};

async function testPipeline() {
    console.log('--- Starting Test Pipeline ---');
    await connectDatabase();

    // 1. Mock Discovery
    console.log(`1. Mock Discovery: Signal for ${MOCK_SIGNAL.rawTitle}`);

    // 2. Verification
    // We point it to a real page or PDF to verify scraping/PDF parsing
    // Let's use a real UPSC PDF url to verify PDF parsing specifically?
    // Or let logic find it from 'upsc.gov.in'?
    // 'upsc.gov.in' main page might be too big. 
    // Let's give it a direct PDF URL as if the aggregator linked to it.

    MOCK_SIGNAL.url = "http://mock-aggregator.com/upsc-post";

    // Mock getPage to avoid scraping real aggregator and ensuring we find the link
    verificationService.getPage = async (url) => {
        if (url === MOCK_SIGNAL.url) {
            return `
                <html>
                <body>
                    <h1>UPSC Civil Services 2024</h1>
                    <a href="https://upsc.gov.in/sites/default/files/Notif-CSP-24-engl-140224.pdf">Official Notification PDF</a>
                    <a href="https://upsc.gov.in/apply-online">Apply Online</a>
                </body>
                </html>
            `;
        }
        return null;
    };

    console.log(`   URL: ${MOCK_SIGNAL.url} (Mocked Content)`);

    const verificationResult = await verificationService.verify(MOCK_SIGNAL);
    console.log('2. Verification Result:', {
        verified: verificationResult.verified,
        score: verificationResult.confidenceScore,
        pdfFound: !!verificationResult.officialPdfUrl,
        textExtractedLen: verificationResult.extractedText?.length
    });

    if (!verificationResult.verified) {
        console.error('Verification Failed. Aborting test.');
        return;
    }

    // 3. Generation
    const postData = await generationService.generateContent(verificationResult, MOCK_SIGNAL);
    console.log('3. Generation Result Title:', postData.title);

    // 4. Validation
    const validatedData = validationService.validate(postData, verificationResult);
    console.log('4. Validation Result:', {
        isValid: validatedData.automationDetails.issues.length === 0,
        status: validatedData.status,
        confidence: validatedData.automationDetails.confidenceScore,
        completeness: validatedData.automationDetails.completenessScore
    });

    // 5. Save (mock)
    if (validatedData.status === 'Draft' || validatedData.status === 'Published') {
        console.log('5. Save: Would save to DB.');
        // Cleanup if we actually saved
    }

    console.log('--- Test Complete ---');
    process.exit(0);
}

testPipeline().catch(err => {
    console.error(err);
    process.exit(1);
});
