import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { payload } = await req.json();
    if (!payload || !Array.isArray(payload)) return NextResponse.json({ error: "Missing payload" }, { status: 400 });

    const prompt = `Classify each of the following multiple-choice questions into exactly ONE of these 7 core UPSC subjects based on its context: "Geography", "History", "Environment", "Economy", "Polity", "Art & Culture", "Agriculture".

    INPUT FORMAT:
    ${JSON.stringify(payload)}
    
    OUTPUT JSON SCHEMA:
    [
      { "index": 0, "subject": "Geography" },
      { "index": 1, "subject": "Polity" }
    ]`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini", // LIGHTNING FAST 
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!res.ok) throw new Error("Classification failed at OpenRouter");

    const aiData = await res.json();
    let raw = aiData.choices?.[0]?.message?.content || "[]";
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) raw = match[0];
    else raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();

    return NextResponse.json(JSON.parse(raw));

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
