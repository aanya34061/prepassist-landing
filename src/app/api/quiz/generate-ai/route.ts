import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { topic, difficulty, numQuestions = 10, language = 'English' } = await req.json();

    if (!topic || !difficulty) {
      return NextResponse.json({ error: "Missing topic or difficulty." }, { status: 400 });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("Missing OpenRouter API Key.");
    }

    // Build specialized prompt mapping difficulty logic
    const difficultyRules: Record<string, string> = {
      Beginner: "Focus on factual, straightforward one-liner questions testing direct knowledge of the given topic.",
      Medium: "Include a mix of analytical questions and fundamental concepts. You may include 2-statement based questions occasionally.",
      Advanced: "Simulate exact UPSC Civil Services standard deep analytical questions. The majority MUST be multi-statement assertion reasoning questions requiring high conceptual clarity."
    };

    const generateBatch = async (batchId: number, countRequired: number) => {
        const strictSeed = Math.floor(Math.random() * 999999);
        const prompt = `You are a strict UPSC Civil Services Prelims examiner. 
        Topic: "${topic}"
        Difficulty: "${difficulty}"

        Generate EXACTLY ${countRequired} unique and highly accurate multiple-choice questions natively focused on the provided Topic at the exact specified Difficulty.
        IMPORTANT: The actual question text, the 4 options, and the detailed explanation MUST be generated strictly in ${language}. However, the JSON structural keys (like "questionText", "options") MUST remain in English to prevent parsing crashes.
        To ensure variance across parallel generation batches, rigidly enforce this randomization seed internally: SEED-[${strictSeed}]. Do not generate generic questions.
        
        DIFFICULTY RULES:
        ${difficultyRules[difficulty] || difficultyRules.Medium}
        
        MANDATORY INSTRUCTIONS:
        1. DO NOT invent fake facts. Use established historical, political, geographic, or economic UPSC syllabus data perfectly.
        2. Preserve statement formatting perfectly using explicit '\\n' characters inside the 'questionText' JSON string if writing multi-statement questions.
        3. Generate EXACTLY 4 options for each question (ids: "a", "b", "c", "d").
        4. Provide a deeply detailed, highly analytical explanation for WHY the answer is correct and why the other options are logically incorrect. Focus on UPSC Syllabus context.

        JSON SCHEMA FORMAT:
        [
          {
             "questionText": "Question text here... \\n1. Statement 1\\n2. Statement 2",
             "options": [{"id": "a", "text": "Option text strictly"}, {"id": "b", "text": "Option text strictly"}, {"id": "c", "text": "Option text strictly"}, {"id": "d", "text": "Option text strictly"}],
             "correctOptionId": "a", 
             "explanation": "A deeply detailed analytical explanation analyzing the logic behind the correct answer."
          }
        ]
        
        OUTPUT ONLY VALID JSON. STRICTLY NO MARKDOWN CONVERSATION OR BACKTICKS OUTSIDE THE ARRAY!`;

        // Stagger API execution sequentially by exactly 800ms per batch to prevent OpenRouter TCP Rate-Limit Drops.
        await new Promise(resolve => setTimeout(resolve, batchId * 800));

        try {
            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: { 
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`, 
                "Content-Type": "application/json" 
              },
              body: JSON.stringify({
                model: "openai/gpt-4o-mini", // LIGHTNING FAST 
                max_tokens: 3000,
                temperature: 0.9, // Higher variance to prevent identical topics across blocks
                messages: [{ role: "user", content: prompt }]
              })
            });

            if (!res.ok) return [];

            const aiData = await res.json();
            let raw = aiData.choices?.[0]?.message?.content || "[]";
            
            const jsonMatch = raw.match(/\[[\s\S]*\]/);
            if (jsonMatch) raw = jsonMatch[0];
            else raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            
            try { return JSON.parse(raw); } 
            catch (err) { 
                try { return JSON.parse(raw + (raw.endsWith("}") ? "]" : "}]")); } 
                catch { return []; } 
            }
        } catch (fetchError) {
            console.error(`Batch ${batchId} socket dropped actively:`, fetchError);
            return []; // Gracefully fail block rather than crashing entire Matrix
        }
    };

    console.log(`Executing AI Generation for [Topic: ${topic}] @ [Level: ${difficulty}] - Requesting ${numQuestions} MCQs`);

    const batchCount = Math.ceil(numQuestions / 2);
    const parallelBatches = Array.from({ length: batchCount }).map((_, id) => {
        const countRequired = (id === batchCount - 1 && numQuestions % 2 !== 0) ? 1 : 2;
        return generateBatch(id, countRequired);
    });
    
    const allBatches = await Promise.all(parallelBatches);
    const generatedQuestions = allBatches.flat().filter(q => q && q.questionText).slice(0, numQuestions);

    if (!generatedQuestions || generatedQuestions.length === 0) {
        return NextResponse.json({ error: "Failed to generate AI questions. Parsing engine crashed natively." }, { status: 500 });
    }

    return NextResponse.json({ results: generatedQuestions });

  } catch (err: any) {
    console.error("AI Generation Crash:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
