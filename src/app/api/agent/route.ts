import { NextResponse } from "next/server";
import { deductCredit } from "@/lib/credits";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
   try {
      const body = await req.json();
      const { messages } = body;

      const authHeader = req.headers.get("Authorization");
      const token = authHeader?.split(" ")[1];
      
      if (!token) {
          return NextResponse.json({ error: "System Auth Missing Secure Identity Token." }, { status: 401 });
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
          return NextResponse.json({ error: "Identity Verification Failure." }, { status: 401 });
      }

      const userId = user.id;

      if (!messages || !Array.isArray(messages)) {
         return NextResponse.json({ error: "Invalid payload matrices." }, { status: 400 });
      }

      if (!process.env.OPENROUTER_API_KEY) {
         return NextResponse.json({ error: "Internal API Key Missing Structure." }, { status: 500 });
      }

      // Secure Credit Verification Pipeline
      try {
         await deductCredit(userId, 1, "AI Mentor Execution");
      } catch (err: any) {
         if (err.message === "INSUFFICIENT_CREDITS") {
            return NextResponse.json({ error: "Insufficient AI Credits. Please upgrade plan." }, { status: 402 });
         }
         throw err;
      }

      const systemPrompt = `You are the PrepAssist AI Core, an elite, highly qualified Mentor for students preparing for the grueling Indian UPSC Civil Services Examination. 
Your goal is to guide students precisely. Use structured formatting.
- STRICTLY format your major headings using Markdown ### (Example: ### Geography Strategy)
- Make sure to use **bold** text to emphasize crucial terms.
- Use numbered lists or bullet points to make logic digestible.
- Never hallucinate data. Be encouraging, highly professional, and strictly accurate.`;

      // Map the GenAI "parts: [{text}]" structure explicitly to OpenRouter / OpenAI "content" structure
      const mappedMessages = messages.map(msg => ({
         role: msg.role === "model" ? "assistant" : "user",
         content: msg.parts?.[0]?.text || ""
      }));

      // Inject system prompt explicitly to OpenRouter topology
      mappedMessages.unshift({ role: "system", content: systemPrompt });

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
         method: "POST",
         headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
         },
         body: JSON.stringify({
            model: "openai/gpt-4o-mini", // Core fallback ensuring maximal speed and extreme stability
            messages: mappedMessages,
            temperature: 0.7,
            max_tokens: 3000
         })
      });

      if (!res.ok) {
         throw new Error(`OpenRouter socket failure: ${res.statusText}`);
      }

      const aiData = await res.json();
      const textOutput = aiData.choices?.[0]?.message?.content;

      if (!textOutput) {
         throw new Error("AI Returned Null Output Mapping");
      }

      return NextResponse.json({ text: textOutput });
   } catch (error: any) {
      console.error("AI Backplane Error:", error);
      return NextResponse.json({ error: `Internal API Error: ${error?.message || 'Unknown Context'}` }, { status: 500 });
   }
}
