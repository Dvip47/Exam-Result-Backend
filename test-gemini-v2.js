const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listAllModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log("GEMINI_API_KEY exists:", !!process.env.GEMINI_API_KEY);
    console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY);
    try {
        // Correct way to list models in latest SDK
        // Actually, listModels is often problematic in some node environments
        // Let's try to just test "gemini-1.5-flash-latest" or "gemini-1.5-pro-latest"
        const testModels = ["gemini-1.5-flash-latest", "gemini-1.5-pro-latest", "gemini-pro-vision"];
        for (const name of testModels) {
            console.log(`Trying ${name}...`);
            try {
                const model = genAI.getGenerativeModel({ model: name });
                const result = await model.generateContent("Hi");
                console.log(`✅ ${name} works!`);
                return;
            } catch (e) {
                console.log(`❌ ${name} failed: ${e.message}`);
            }
        }
    } catch (error) {
        console.error('Fatal Error:', error);
    }
}

listAllModels();
