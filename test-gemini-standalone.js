const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGemini() {
    console.log('Testing with Key:', process.env.GEMINI_API_KEY.substring(0, 10) + '...');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log("GEMINI_API_KEY exists:", !!process.env.GEMINI_API_KEY);
    console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY);
    // Try different model variations
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];

    for (const modelName of models) {
        try {
            console.log(`Testing model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Say hello");
            const response = await result.response;
            console.log(`✅ Success with ${modelName}:`, response.text());
            break;
        } catch (error) {
            console.error(`❌ Error with ${modelName}:`, error.message);
        }
    }
}

testGemini();
