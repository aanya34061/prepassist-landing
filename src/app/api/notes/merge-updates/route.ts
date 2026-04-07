import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { existingContent, updates } = await req.json();

    if (!existingContent || !updates || updates.length === 0) {
      return NextResponse.json({ error: "Missing explicitly required notes or updates array structurally." }, { status: 400 });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("Missing OpenRouter framework API Key natively.");
    }

    const updatesString = updates.map((u: any, i: number) => `Update ${i+1} (${u.date} - ${u.source}): ${u.title}\n${u.excerpt}`).join('\n\n');

    const prompt = `You are a hyper-intelligent UPSC Civil Services exam mentor specializing exclusively in synthesizing robust conceptual structures.

Your objective is to seamlessly MERGE and SUMMARIZE new global current affairs updates strictly into the user's existing core Notes, explicitly retaining all foundational information securely.

### Existing Core Notes:
${existingContent}

### Newly Detected Constraints (Global Updates):
${updatesString}

INSTRUCTIONS:
1. Meticulously read the extracted new constraints natively.
2. Interweave and synthesize the new critical data seamlessly into the parent logical structure of the 'Existing Core Notes'. 
3. Explicitly retain the exact original Markdown formatting (### Headers, **bolding**, lists) from the user's base payload natively. Do not erase their original intelligence.
4. If the new updates introduce fresh angles, seamlessly generate a "### Contemporary Context" or explicit sub-header gracefully mapping it.
5. The final output must read naturally as one single, deeply exhaustive academic study matrix precisely.
6. OUTPUT STRICTLY THE RAW MARKDOWN TEXT AND NOTHING ELSE. DO NOT WRAP IN INTERNAL CODE BLOCKS OR CHATTER.`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        max_tokens: 3500,
        temperature: 0.3, // Lower temperature to rigidly prevent AI hallucinations efficiently
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!res.ok) throw new Error(`OpenRouter processing API failed gracefully.`);

    const aiData = await res.json();
    let mergedText = aiData.choices?.[0]?.message?.content || "";
    
    // Auto-strip accidental nested markdown wrappings explicitly
    mergedText = mergedText.replace(/^```[a-z]*\s*/i, '').replace(/```$/, '').trim();

    return NextResponse.json({ mergedText });

  } catch (err: any) {
    console.error("AI Target Merge Pipeline Crash:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
