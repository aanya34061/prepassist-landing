import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { text, sourceName } = await req.json();
    if (!text) return NextResponse.json({ error: "No text payload provided" }, { status: 400 });

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) throw new Error("Missing OpenRouter Key for Embeddings");

    // Authenticate Supabase
    const supabase = createClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. Mathematically map the textual context into Float(1536) Arrays natively.
    const embRes = await fetch("https://openrouter.ai/api/v1/embeddings", {
       method: "POST",
       headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "Content-Type": "application/json"
       },
       body: JSON.stringify({
          model: "openai/text-embedding-3-small", 
          input: text
       })
    });

    if (!embRes.ok) {
       const textErr = await embRes.text();
       throw new Error(`Failed to map embeddings: ${textErr}`);
    }

    const embData = await embRes.json();
    const vector = embData.data[0].embedding;

    // 2. Inject Context string and its semantic vector explicitly into the Vault
    const { error } = await supabase.from('knowledge_base').insert({
       content: text,
       metadata: { source: sourceName || "Direct RAG Inject", timestamp: new Date().toISOString() },
       embedding: vector
    });

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Fact securely vectorized and stored in Supabase Vault." });
  } catch (error: any) {
    console.error("Vector Seeding API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
