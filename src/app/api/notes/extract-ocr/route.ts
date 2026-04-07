import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { base64Image } = await req.json();

    if (!base64Image) {
      return NextResponse.json({ error: "No image payload explicitly provided." }, { status: 400 });
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) throw new Error("CRITICAL: OpenRouter API keys mathematically failed to instantiate.");

    // Vision LLM explicitly instructed to aggressively parse dense handwritten UPSC datasets natively
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "PrepAssist Vision RAG Core"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini", // GPT-4o-mini supports highly optimized internal Vision inputs natively
        messages: [
          {
            role: "system",
            content: "You are an Elite UPSC Exam Document Analyzer. Your sole directive is perfectly extracting handwritten text from images, formatting it beautifully into clean Markdown. Ignore crossed-out text. Utilize structural headers and bullet points where logically derived from the handwriting structure."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract and meticulously format the handwritten notes inside this document explicitly into clean markdown. Maintain its academic tone entirely."
              },
              {
                type: "image_url",
                image_url: {
                  url: base64Image // Base64 Native Vision Payload bridging explicitly
                }
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      console.error(data);
      throw new Error("Vision Core failed to render text from the visual payload array.");
    }

    const extractedText = data.choices[0].message.content;
    
    return NextResponse.json({ text: extractedText });

  } catch (error: any) {
    console.error("Camera Snippet AI Extraction Failed:", error);
    return NextResponse.json({ error: error.message || "Failed to parse handwriting natively." }, { status: 500 });
  }
}
