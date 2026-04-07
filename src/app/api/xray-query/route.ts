import { NextResponse } from 'next/server';
import { generateUPSCIdentity } from '@/lib/ai/google-embeddings';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Native Fallback Engine Initialization
const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  try {
    const { sentence } = await req.json();

    if (!sentence) {
      return NextResponse.json({ error: 'Sentence not provided.' }, { status: 400 });
    }

    // Phase 1: Native Vector Searching globally against pre-seeded exact matrices.
    try {
      const targetVector = await generateUPSCIdentity(sentence);
      const { data, error } = await supabase.rpc('match_xray_references', {
        query_embedding: targetVector,
        match_threshold: 0.80, 
        match_count: 1
      });

      if (!error && data && data.length > 0) {
        const match = data[0];
        return NextResponse.json({
          match: true,
          similarity: match.similarity,
          deep_dive: match.deep_dive,
          current_affairs: match.current_affairs,
          prelims_practice: match.prelims_practice,
          history: "Pre-seeded historical data unavailable. Relies on static semantic arrays.",
          references: "Refer to core UPSC textbooks or official Constitutional provisions."
        });
      }
    } catch (e) {
      console.log("Vector DB Miss/Error. Triggering Generative AI Fallback Engine.", e);
    }

    // Phase 2: Generative AI Dynamic Synthesis (If Supabase misses or errors out)
    if (!apiKey) {
      return NextResponse.json({ error: 'Native Google API Credentials missing for fallback generator.' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const extractionPrompt = `
      You are a strict UPSC Professor. I have a sentence extracted from a document. 
      Analyze this sentence strictly from the UPSC Civil Services perspective: "${sentence}"
      
      Generate a perfect JSON object exactly containing these 5 string keys:
      1. "deep_dive": Explain the absolute core administrative or conceptual depth of this topic.
      2. "current_affairs": Provide recent real-world current events or context linked to this.
      3. "prelims_practice": Create one tricky UPSC Prelims-style multiple choice question and provide the answer.
      4. "history": Provide the historical background or evolution of this subject if applicable.
      5. "references": List standard UPSC books (e.g., Laxmikanth, spectrum) or reports (ARC) relevant here.
      
      Output ONLY raw parseable JSON without any markdown formatting or codeblocks.
    `;

    const result = await model.generateContent(extractionPrompt);
    const responseText = result.response.text().trim().replace(/^```json\s*/, '').replace(/```\s*$/, '');
    
    let generatedPackage;
    try {
       generatedPackage = JSON.parse(responseText);
    } catch(e) {
       console.error("AI JSON Parse Error:", e, responseText);
       throw new Error("Generative engine failed to structure UPSC arrays.");
    }

    return NextResponse.json({
      match: false, // Flagging false means it was synthetically generated, not pre-seeded natively.
      similarity: 0,
      deep_dive: generatedPackage.deep_dive || "Synthesis Failed.",
      current_affairs: generatedPackage.current_affairs || "Synthesis Failed.",
      prelims_practice: generatedPackage.prelims_practice || "Synthesis Failed.",
      history: generatedPackage.history || "Synthesis Failed.",
      references: generatedPackage.references || "Synthesis Failed."
    });

  } catch (error: any) {
    console.error('X-Ray API Error:', error);
    return NextResponse.json({ error: 'Internal X-Ray Engine Failure' }, { status: 500 });
  }
}
