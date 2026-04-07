import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300; // Allows up to 5 minutes for massive payload inference

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('pdf') as File | null;
    const newspaperType = formData.get('provider') as string;

    if (!file || !newspaperType) {
      return NextResponse.json({ error: "Missing PDF file or provider type" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Bypassing Next.js Turbopack CJS interop bugs by using the completely async, DOM-independent pdf2json engine
    const PDFParser = require("pdf2json");
    
    let extractedText = await new Promise<string>((resolve, reject) => {
       const pdfParser = new PDFParser(null, 1);
       pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
       pdfParser.on("pdfParser_dataReady", () => {
          resolve(pdfParser.getRawTextContent());
       });
       pdfParser.parseBuffer(buffer);
    });

    // Clean structural metadata tags out of the raw stream to calculate TRUE extracted word count
    const trueOCRWordCount = extractedText.replace(/-+Page \(\d+\) Break-+/g, "").trim().length;

    if (trueOCRWordCount < 100) {
       console.log("No readable text found via pdf2json. Engaging Google Cloud Vision OCR Fallback Pipeline...");
       
       try {
           const { ImageAnnotatorClient } = require('@google-cloud/vision');
           const { PDFDocument } = require('pdf-lib');

           // 1. Slice PDF to max 5 pages for synchronous Vision OCR limits.
           const pdfDoc = await PDFDocument.load(buffer);
           const totalPages = pdfDoc.getPageCount();
           const pagesToExtract = Math.min(totalPages, 5);
           
           const newPdf = await PDFDocument.create();
           const copiedPages = await newPdf.copyPages(pdfDoc, Array.from({length: pagesToExtract}, (_, i) => i));
           copiedPages.forEach((page: any) => newPdf.addPage(page));
           
           const slicedPdfBytes = await newPdf.save();
           const slicedBase64 = Buffer.from(slicedPdfBytes).toString('base64');
           
           // 2. Instantiate Vision Client using standard ENV overrides or GCP Default chaining.
           let visionClient;
           if (process.env.GCP_PRIVATE_KEY && process.env.GCP_CLIENT_EMAIL) {
              visionClient = new ImageAnnotatorClient({
                 credentials: {
                    client_email: process.env.GCP_CLIENT_EMAIL,
                    private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
                 },
                 projectId: process.env.GCP_PROJECT_ID,
              });
           } else {
              visionClient = new ImageAnnotatorClient(); // Relies natively on GOOGLE_APPLICATION_CREDENTIALS
           }

           // 3. Dispatch to GCP processing engine
           const [result] = await visionClient.batchAnnotateFiles({
              requests: [{
                 inputConfig: {
                    mimeType: 'application/pdf',
                    content: slicedBase64
                 },
                 features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
                 pages: Array.from({length: pagesToExtract}, (_, i) => i + 1)
              }]
           });

           // 4. Re-construct the massive OCR text payload
           extractedText = "";
           const responses = result.responses?.[0]?.responses || [];
           responses.forEach((pageResponse: any) => {
               if (pageResponse.fullTextAnnotation?.text) {
                  extractedText += pageResponse.fullTextAnnotation.text + "\n\n";
               }
           });

           if (!extractedText || extractedText.trim().length < 100) {
              throw new Error("GCP Vision engine finalized analysis but found zero comprehensible text block structures.");
           }
           
       } catch (ocrError: any) {
           throw new Error("GCP Vision OCR Fallback engaged but crashed: " + ocrError.message + ". Ensure GCP_PRIVATE_KEY Env variables or GOOGLE_APPLICATION_CREDENTIALS are linked!");
       }
    }

    // AI Context window guardrail: 
    // Truncate to ~100,000 chars to comfortably fit inside GPT-4o's 128k context without timing out the severless function setup.
    if (extractedText.length > 100000) {
       extractedText = extractedText.substring(0, 100000); 
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
       console.warn("No OpenRouter Key Found. Yielding mock dataset for RAG PDF extraction.");
       return NextResponse.json({
         results: [
           { 
             title: "Election Commission Reform Verdict", 
             source: newspaperType, 
             tags: ["GS2", "Polity", "Constitutional Bodies"], 
             content: "The Supreme Court delivered a landmark ruling altering the appointment mechanism for the Chief Election Commissioner (CEC) and Election Commissioners (ECs). By instituting a collegium model comprising the Prime Minister, Leader of Opposition, and the Chief Justice of India, the court asserts the absolute independence of the election machinery.\n\nFrom a GS2 perspective, this mitigates executive overreach and reinforces Article 324 structural autonomies. It mirrors the Vineet Narain judgment's intent to shield specialized bodies. Candidates must link this to the broader trajectory of democratic decentralization.\n\nLooking forward, Parliament may enact a law circumscribing these guidelines. However, the foundational blueprint of electoral impartiality as part of the 'Basic Structure' remains deeply solidified." 
           },
           { 
             title: "Green Hydrogen Mission Advancements", 
             source: newspaperType, 
             tags: ["GS3", "Environment", "Energy"], 
             content: "The Ministry of New and Renewable Energy has unlocked the initial tranches of subsidies tailored for electrolyser manufacturing. This accelerates India's National Green Hydrogen Mission (NGHM) targeting 5 MMT production capacity by 2030, a vital node in cutting carbon intensity by 45%.\n\nEconomic viability hinges upon reducing the levelized cost of hydrogen to under $1.5/kg. The immediate infrastructural blockades include pure water scarcity and the high capital outlay for renewable integration.\n\nPolicy synthesis demands marrying this mission efficiently with the PLI schemes and the overarching Panchamrit COP26 pledges to achieve Net Zero by 2070." 
           }
         ],
         isMock: true
       });
    }

    const prompt = `You are a top-tier UPSC Civil Services Examiner analyzing today's ${newspaperType}. 
    Extract the MOST EXHAUSTIVE, critical high-yield topics from this newspaper's text.
    You MUST extract a MINIMUM of 12 to 15 completely distinct, highly important articles. Do not stop at just 5. 

    You MUST output your ENTIRE response as a RAW JSON array of objects. Do not wrap in markdown or backticks.
    Each object MUST have:
    - title (String): The exact UPSC Syllabus topic name.
    - tags (Array of Strings): e.g. ["GS2", "International Relations"].
    - content (String): A massively detailed, highly structured UPSC Mains Answer template analyzing the topic.
    
    For the 'content' string, you MUST output a deep minimum 300-word analysis formatting using explicit sub-headings and literal hyphen (-) bullet points. 
    Use this EXACT structural blueprint for the content string:
    
    Context & Background
    - [Detail the immediate reason this is in the news]
    - [Provide historical or constitutional backing]
    
    Core Analysis & Implications
    - [Analyze the political, economic, or social impacts]
    - [Discuss the challenges or criticisms]
    
    Way Forward (Mains Conclusion)
    - [Provide policy recommendations or Supreme Court/Committee judgements]
    - [Final optimistic conclusion]
    
    Use explicit \n\n for paragraph spacing between sections.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        messages: [
           { role: "system", content: prompt },
           { role: "user", content: extractedText }
        ],
        temperature: 0.1,
        max_tokens: 12000
      })
    });

    if (!response.ok) throw new Error("AI Processing failed: " + response.statusText);
    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
       throw new Error("OpenRouter API responded, but completely failed to generate any tokens. Details: " + JSON.stringify(data));
    }

    let resultText = data.choices[0]?.message?.content?.trim();
    if (!resultText || resultText === "[]") {
       const preview = extractedText.substring(0, 300).replace(/\r?\n|\r/g, ' ');
       throw new Error(`The AI successfully read the document but output 0 arrays! This usually means the PDF text is completely corrupted by custom fonts. \n\nRAW TEXT PREVIEW RECEIVED BY AI: "${preview}..."`);
    }
    
    if (resultText.startsWith("```json")) resultText = resultText.replace(/```json/g, "");
    if (resultText.endsWith("```")) resultText = resultText.replace(/```$/g, "");
    resultText = resultText.trim();
    
      const parsedResults = JSON.parse(resultText);
      return NextResponse.json({ results: parsedResults });
      
  } catch (err: any) {
    console.error("Newspaper Extraction Error:", err);
    return NextResponse.json({ 
       error: "Execution crashed at: " + (err.message || String(err)),
       stack: err.stack 
    }, { status: 500 });
  }
}
