const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
    console.log("GEMINI_API_KEY exists:", !!process.env.GEMINI_API_KEY);
    console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const models = await genAI.listModels();
        console.log(JSON.stringify(models, null, 2));
    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
