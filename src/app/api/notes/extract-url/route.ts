import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url || !url.startsWith("http")) {
      return NextResponse.json({ error: "Invalid HTTP/HTTPS prefix natively provided. Scraper locked." }, { status: 400 });
    }

    const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
    if (!APIFY_API_TOKEN) {
      // Graceful fallback protecting the UI when key isn't setup
      return NextResponse.json({ 
          error: "Apify API Token not found in your environment variables. Please add APIFY_API_TOKEN to your .env.local configuration file to initialize the scraper!" 
      }, { status: 500 });
    }

    // 1. Initialize Apify Client natively
    const client = new ApifyClient({ token: APIFY_API_TOKEN });

    // 2. Build explicit Actor input variables configuring a lightweight footprint
    const input = {
        startUrls: [{ url }],
        maxCrawlPages: 1, // Only scrape the exact single URL passed in! No deep crawling allowed.
        crawlerType: "playwright:adaptive", // Enterprise JS rendering support
    };

    // 3. Mount and trigger "website-content-crawler" Actor 
    const run = await client.actor("apify/website-content-crawler").call(input);

    // 4. Download extracted nodes directly from Apify's Dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (!items || items.length === 0) {
       throw new Error("Apify successfully penetrated the site but could not extract deep Markdown content.");
    }

    // 5. Destructure the raw Markdown specifically generated for RAG
    const markdownContext = items[0].markdown || items[0].text;
    const pageTitle = (items[0].metadata as any)?.title || url.split('/')[url.split('/').length-1] || "Extracted Resource";

    if (!markdownContext) {
      throw new Error("Target extraction matrix failed. Content crawler returned empty structural Markdown.");
    }

    return NextResponse.json({ 
       text: markdownContext,
       pageTitle: pageTitle
    });

  } catch (error: any) {
    console.error("Apify Extraction Pipeline Failed:", error);
    return NextResponse.json({ error: error.message || "Apify cloud scraper encountered a fatal architecture error during URL digestion." }, { status: 500 });
  }
}
