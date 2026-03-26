import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import {
  buildPerplexityPrompt,
  parsePerplexityResponse,
  PERPLEXITY_API_URL,
} from '@/lib/perplexity-news';

function getTodayDateString(): string {
  const now = new Date();
  // Use IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  // Verify this is a legitimate cron call or manual trigger
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  const isVercelCron = authHeader === `Bearer ${cronSecret}`;
  const isQuerySecret = request.nextUrl.searchParams.get('secret') === cronSecret;
  const isDev = request.headers.get('host')?.includes('localhost');

  if (!isVercelCron && !isQuerySecret && !isDev) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'PERPLEXITY_API_KEY not configured' }, { status: 500 });
  }

  const todayDate = getTodayDateString();

  try {
    // Check if we already fetched news for today (prevent duplicates)
    const newsRef = collection(db, 'daily_news');
    const existingQuery = query(newsRef, where('date', '==', todayDate));
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      return NextResponse.json({
        message: `Daily news already fetched for ${todayDate}. Found ${existingSnapshot.size} articles.`,
        date: todayDate,
        skipped: true,
      });
    }

    // Fetch news from Perplexity API
    console.log(`[DailyNews] Fetching UPSC news for ${todayDate}...`);

    const perplexityResponse = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a UPSC current affairs expert. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: buildPerplexityPrompt(todayDate),
          },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error('[DailyNews] Perplexity API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch news from Perplexity', details: errorText },
        { status: 502 }
      );
    }

    const perplexityData = await perplexityResponse.json();
    const responseText = perplexityData.choices?.[0]?.message?.content;

    if (!responseText) {
      return NextResponse.json({ error: 'Empty response from Perplexity' }, { status: 502 });
    }

    // Parse the response into articles
    const newsArticles = parsePerplexityResponse(responseText);

    if (newsArticles.length === 0) {
      return NextResponse.json({ error: 'No valid articles parsed from response' }, { status: 502 });
    }

    console.log(`[DailyNews] Parsed ${newsArticles.length} articles. Writing to Firestore...`);

    // Write each article to Firestore `daily_news` collection
    const insertedArticles: { id: string; title: string }[] = [];

    for (const article of newsArticles) {
      const docRef = await addDoc(collection(db, 'daily_news'), {
        title: article.title,
        summary: article.summary,
        content: article.content,
        subject: article.subject,
        source: article.source,
        tags: [...article.tags, 'Daily News', todayDate],
        author: 'AI Daily News',
        date: todayDate, // "2026-03-16" — used for filtering by day
        publishedDate: Timestamp.fromDate(new Date(`${todayDate}T05:00:00.000Z`)),
        createdAt: Timestamp.now(),
      });

      insertedArticles.push({ id: docRef.id, title: article.title });
    }

    console.log(`[DailyNews] Successfully wrote ${insertedArticles.length} articles to Firestore for ${todayDate}`);

    return NextResponse.json({
      success: true,
      date: todayDate,
      articlesCount: insertedArticles.length,
      articles: insertedArticles,
    });
  } catch (error: any) {
    console.error('[DailyNews] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
