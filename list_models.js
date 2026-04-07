const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function run() {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error("No API key found in .env.local");
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  try {
     // We can just fetch it manually via HTTP to ListModels
     const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
     const data = await response.json();
     if (data.models) {
        console.log(data.models.map(m => m.name).join("\n"));
     } else {
        console.log("No models returned:", data);
     }
  } catch(e) {
     console.error(e);
  }
}
run();
