import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300; 

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('pdf') as File | null;

    if (!file) {
      return NextResponse.json({ error: "Missing PDF file payload" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let finalBuffer = buffer;

    // Proactive XRef Reconstruction Engine
    // pdf-lib natively sanitizes and rebuilds complex or broken XRef headers inside the PDF
    try {
       const { PDFDocument } = require('pdf-lib');
       const tempDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
       const rebuiltBytes = await tempDoc.save();
       finalBuffer = Buffer.from(rebuiltBytes);
    } catch (rebuildErr) {
       console.warn("PDF-lib reconstruction skipped:", rebuildErr);
    }

    const PDFParser = require("pdf2json");
    let extractedText = await new Promise<string>((resolve, reject) => {
       const pdfParser = new PDFParser(null, 1);
       pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
       pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent()));
       
       // Run extraction on the chemically cleaned and structurally repaired binary
       pdfParser.parseBuffer(finalBuffer);
    });

    if (!extractedText || extractedText.trim().length < 50) {
       throw new Error("No readable text found. Ensure the PDF is not purely scanned images without OCR.");
    }

    if (extractedText.length > 80000) {
       extractedText = extractedText.substring(0, 80000); 
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
       return NextResponse.json({
         text: "Mock Extraction text since OpenRouter Key is missing.\n\n" + extractedText.substring(0, 500)
       });
    }

    const prompt = `You are an expert UPSC instructor. I have extracted raw text from a PDF study document. 
Your job is to read the raw, messy text and instantly clean it up into highly readable, structurally brilliant Markdown Study Notes.

Analyze the text and extract ALL KEY INFORMATION. 
Format using:
- # Main Headers
- ## Sub-Topics
- Explicit Bullet points (-) for facts and stats.
- **Bold** critical keywords.

DO NOT hallucinate information not present in the text. Simply clean up and structure the messiness of the raw PDF extraction into a beautiful Markdown note for a student.

RAW EXTRACT:
${extractedText}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1
      })
    });

    if (!response.ok) throw new Error("AI Clean-Up failed: " + response.statusText);
    const data = await response.json();
    
    let resultText = data.choices[0]?.message?.content?.trim() || "";
    
    return NextResponse.json({ text: resultText });
      
  } catch (err: any) {
    console.error("Notes PDF Extraction Error:", err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
