import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { GoogleGenerativeAI } from '@google/generative-ai';

async function test() {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
  try {
     const model1 = genAI.getGenerativeModel({ model: "embedding-001" });
     await model1.embedContent("test");
     console.log("embedding-001 SUCCESS");
  } catch(e) {
     console.log("embedding-001 FAIL", e);
  }
  try {
     const model2 = genAI.getGenerativeModel({ model: "text-embedding-004" });
     await model2.embedContent("test");
     console.log("text-embedding-004 SUCCESS");
  } catch(e) {
     console.log("text-embedding-004 FAIL", e);
  }
}
test();
