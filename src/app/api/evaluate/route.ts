import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { imageBase64, answerText, questionContext, wordLimit, includeNotes, includeCurrentAffairs } = await req.json();

    if (!imageBase64 && !answerText) {
      return NextResponse.json({ error: "No answer provided" }, { status: 400 });
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
      console.warn("No OpenRouter API key found. Returning mock evaluation.");
      return NextResponse.json({
        score: 72,
        examinerRemark: "Good structural flow, but the content needs tighter alignment with the specific word limit constraint.",
        strengths: ["Clear introduction", "Good legibility and formatting", "Solid constitutional baseline"],
        weaknesses: ["Missed contemporary SC judgements", "Word limit could be better respected"],
        improvementPlan: ["Add recent Supreme Court citations", "Map keywords directly to the GS syllabus"],
        rewrittenIntro: "To begin with, the multifaceted nature of the topic demands a constitutional approach. The foundational ethos dictates that administration must serve the marginalized...",
        rewrittenConclusion: "Conclusively, embracing a cooperative model ensures sustainable civil development, cementing the democratic framework for the future...",
        detailedFeedback: {
            content: "Relevant core points but relies on generic filler in body paragraphs.",
            structure: "Well separated paragraphs, introduction hooks the reader.",
            language: "Clear and concise, with no major grammatical errors.",
            arguments: "Needs more empirical data backing for justification.",
            upscRelevance: "Matches GS Paper 2 standards accurately."
        },
        ocrText: imageBase64 ? "This is a mocked transcription of your handwritten document representing the essay content." : undefined
      });
    }

    let messages: any[] = [];
    let ragConfiguration = "";

    if (includeNotes) {
        ragConfiguration += "\n- STRICTLY verify if the answer reflects deep, personalized subject-matter knowledge found in standard UPSC vault notes.";
    }
    if (includeCurrentAffairs) {
        ragConfiguration += "\n- STRICTLY evaluate the inclusion of contemporary events, metrics, and Current Affairs related precisely to the topic over the past 12 months.";
    }

    const basePrompt = `You are an expert UPSC essay examiner with 20+ years of experience.
${imageBase64 ? 'First, carefully TRANSCRIBE the handwritten essay in the image.' : ''}
Evaluate the essay written for UPSC Mains examination based on the ${imageBase64 ? 'transcribed text' : 'provided text'}.

**Question Context / Topic:** ${questionContext || "General Essay/Answer"}
**Target Word Limit:** ${wordLimit} words. Please penalize in the detailed feedback if the answer significantly exceeds or falls short of this limit.

${answerText ? `**Essay Answer Text:**\n${answerText}\n` : ''}

**IMPORTANT RAG / METRIC EVALUATION CONSTRAINTS:**${ragConfiguration}

Please provide a comprehensive evaluation in the following JSON format (respond ONLY with valid JSON, no markdown or extra text):

{
  ${imageBase64 ? '"ocrText": "<FULL_TRANSCRIPTION_OF_THE_ESSAY>",' : ''}
  "score": <number between 0-100>,
  "examinerRemark": "<overall assessment in 2-3 sentences>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "improvementPlan": ["<specific actionable improvement 1>", "<specific improvement 2>"],
  "rewrittenIntro": "<rewrite the introduction paragraph to make it more impactful>",
  "rewrittenConclusion": "<rewrite the conclusion paragraph to make it more powerful>",
  "detailedFeedback": {
    "content": "<feedback on relevance, depth of analysis, factual accuracy (30%)>",
    "structure": "<feedback on introduction, body paragraphs, conclusion, flow (20%)>",
    "language": "<feedback on grammar, vocabulary, clarity, coherence (15%)>",
    "arguments": "<feedback on quality of arguments, use of examples, case studies (25%)>",
    "upscRelevance": "<how well it addresses UPSC multi-dimensional requirements (10%)>"
  }
}

Be honest, constructive, and specific in your feedback. The score should reflect stringent UPSC Mains standards.`;

    if (imageBase64) {
        messages = [
          {
            role: "user",
            content: [
              { type: "text", text: basePrompt },
              { type: "image_url", image_url: { url: imageBase64 } }
            ]
          }
        ];
    } else {
        messages = [
          {
            role: "user",
            content: basePrompt
          }
        ];
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o", // Changed to robust vision/text multimodel for max generation depth
        messages: messages,
        temperature: 0.7
      })
    });

    if (!response.ok) throw new Error(`API responded with ${response.status}`);

    const data = await response.json();
    const resultText = data.choices[0]?.message?.content;
    const cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    const evaluation = JSON.parse(cleanJson);

    if (typeof evaluation.score !== 'number' || evaluation.score < 0 || evaluation.score > 100) {
        evaluation.score = 65;
    }

    return NextResponse.json(evaluation);
  } catch (error) {
    console.error("Evaluation Error:", error);
    return NextResponse.json({ error: "Failed to evaluate the answer accurately." }, { status: 500 });
  }
}
