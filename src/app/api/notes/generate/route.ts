import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { topic } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "No topic provided" }, { status: 400 });
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
      console.warn("No OpenRouter API key found. Returning mock RAG notes.");
      return NextResponse.json({
        title: topic,
        markdownContext: `# ${topic}\n\n## Introduction\nThese are dynamically generated notes serving as a highly optimized fallback. True RAG extraction from the Web or Vector DBs will populate here when the API is verified.\n\n### Key Supreme Court Judgments\n- Kesavananda Bharati case (1973) - Basic Structure Doctrine\n- Minerva Mills (1980)\n\n### Contemporary Metrics\n- Ensure mapping of constitutional benchmarks to present day administrative scenarios.\n\n### Conclusion\nA synthesized path forward emphasizing cooperative federalism and judicial accountability.`,
      });
    }

    // --- PHASE 1 & 2: RAG EMBEDDING & RETRIEVAL ---
    let contextPassages = "";
    try {
       // Authenticate Supabase for Vector DB matching
       const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
       );

       // 1. Generate Semantic Embedding Vector of the User's Topic using OpenRouter
       const embRes = await fetch("https://openrouter.ai/api/v1/embeddings", {
          method: "POST",
          headers: {
             "Authorization": `Bearer ${openRouterKey}`,
             "Content-Type": "application/json"
          },
          body: JSON.stringify({
             model: "openai/text-embedding-3-small", 
             input: topic
          })
       });
       
       if (embRes.ok) {
          const embData = await embRes.json();
          const queryVector = embData.data[0].embedding;
          
          // 2. Perform Supabase pgvector Similarity Search
          const { data: documents, error } = await supabase.rpc('match_knowledge', {
             query_embedding: queryVector,
             match_threshold: 0.60,
             match_count: 3
          });
          
          if (!error && documents && documents.length > 0) {
             contextPassages = documents.map((d: any) => d.content).join("\n\n---\n\n");
          } else if (error) {
             // Silently trap schema errors if the user hasn't executed the SQL script yet.
             console.warn("Supabase RAG RPC Error - Table likely missing. Fallback logic intact.");
          }
       }
    } catch (e) {
       console.warn("RAG Context Extraction Pipeline failed. Defaulting to Generative Fallback.");
    }

    // --- PHASE 3: AUGMENTED GENERATION ---
    const prompt = `You are an elite UPSC Civil Services Mentor natively aggregating multiple data vectors simultaneously.
    You must intelligently synthesize an exhaustive, perfectly structured answer exclusively on the query: "${topic}".
    
    You are actively fusing three isolated sources:
    1) User's Personal Vault (Stored context below)
    2) Daily Current Affairs Database (Stored context below)
    3) Your expansive foundational AI Knowledge (Fill in the academic gaps perfectly!)
    
    ### Extracted Context Arrays (Source 1 & 2 via Vector DB Matching):
    ${contextPassages ? contextPassages : "[No local vector context extracted. Rely completely on Source 3: Your foundational LLM Knowledge Base!]"}

    Your exhaustive output MUST strictly be in a stunning readable Markdown format featuring:
    1. A sharp, crisp Introduction.
    2. Historical Background // Contextual Evolution.
    3. Multi-dimensional Analysis (Social, Economic, Political, Environmental, Security impacts).
    4. Relevant Supreme Court Judgements, Committees, or Articles.
    5. Real-time Current Events (Inject Data from Source 2 if applicable).
    6. A highly visionary "Way Forward" or Conclusion emphasizing administrative logic.
    
    CRITICAL RULE: Just output the raw pristine markdown text. Avoid stating "Based on the internal context..." - speak authoritatively!`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      })
    });

    if (!response.ok) throw new Error(`API responded with ${response.status}`);

    const data = await response.json();
    let resultText = data.choices[0]?.message?.content;
    
    // Cleanup markdown wrapping if the AI decides to wrap in ```markdown
    if (resultText?.startsWith("```markdown")) {
        resultText = resultText.replace("```markdown", "").replace(/```$/, "").trim();
    } else if (resultText?.startsWith("```")) {
        resultText = resultText.replace("```", "").replace(/```$/, "").trim();
    }

    return NextResponse.json({ title: topic, markdownContext: resultText.trim() });
  } catch (error) {
    console.error("Notes Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate notes." }, { status: 500 });
  }
}
