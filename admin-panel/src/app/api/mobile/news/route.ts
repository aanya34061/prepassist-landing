import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { fetchFromPerplexity } from '@/lib/perplexity-news';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Concurrency guard: coalesce duplicate in-flight requests for the same date
const inFlightFetches = new Map<string, Promise<any[]>>();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Public endpoint - no auth required
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    // --- Validate date param ---
    if (!dateParam) {
      return NextResponse.json(
        { error: 'Missing required query parameter: date (YYYY-MM-DD)' },
        { status: 400, headers: corsHeaders },
      );
    }

    if (!DATE_RE.test(dateParam)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400, headers: corsHeaders },
      );
    }

    const requestedDate = new Date(dateParam + 'T00:00:00Z');
    if (isNaN(requestedDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date.' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Not in the future (compare date strings to avoid timezone issues)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const todayStr = istNow.toISOString().split('T')[0];
    if (dateParam > todayStr) {
      return NextResponse.json(
        { error: 'Cannot fetch news for a future date.' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Not older than 90 days
    const ninetyDaysAgo = new Date(istNow.getTime() - 90 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0];
    if (dateParam < ninetyDaysAgoStr) {
      return NextResponse.json(
        { error: 'Date is too old. Maximum 90 days in the past.' },
        { status: 400, headers: corsHeaders },
      );
    }

    // --- Check Firestore for existing articles ---
    const db = getAdminDb();
    const snapshot = await db
      .collection('daily_news')
      .where('date', '==', dateParam)
      .get();

    if (!snapshot.empty) {
      const articles = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          summary: data.summary,
          content: data.content,
          subject: data.subject,
          source: data.source,
          tags: data.tags,
          author: data.author,
          date: data.date,
          publishedDate: data.publishedDate?.toDate?.() || data.publishedDate,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
        };
      });

      return NextResponse.json(
        { articles, source: 'cache' },
        { headers: corsHeaders },
      );
    }

    // --- No articles found — fetch from Perplexity ---
    console.log(`[MobileNews] No articles for ${dateParam}, fetching from Perplexity...`);

    // Coalesce concurrent requests for the same date
    let fetchPromise = inFlightFetches.get(dateParam);
    if (!fetchPromise) {
      fetchPromise = (async () => {
        try {
          const newsArticles = await fetchFromPerplexity(dateParam);

          if (newsArticles.length === 0) {
            return [];
          }

          // Write to Firestore
          const batch = db.batch();
          const colRef = db.collection('daily_news');
          const written: any[] = [];

          for (const article of newsArticles) {
            const docRef = colRef.doc();
            const docData = {
              title: article.title,
              summary: article.summary,
              content: article.content,
              subject: article.subject,
              source: article.source,
              tags: [...article.tags, 'Daily News', dateParam],
              author: 'AI Daily News',
              date: dateParam,
              publishedDate: new Date(`${dateParam}T05:00:00.000Z`),
              createdAt: new Date(),
            };
            batch.set(docRef, docData);
            written.push({ id: docRef.id, ...docData });
          }

          await batch.commit();
          console.log(`[MobileNews] Wrote ${written.length} articles for ${dateParam}`);
          return written;
        } finally {
          inFlightFetches.delete(dateParam);
        }
      })();
      inFlightFetches.set(dateParam, fetchPromise);
    }

    const articles = await fetchPromise;

    if (articles.length === 0) {
      return NextResponse.json(
        { articles: [], source: 'perplexity', message: 'No articles found for this date.' },
        { headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { articles, source: 'perplexity' },
      { headers: corsHeaders },
    );
  } catch (error: any) {
    console.error('[MobileNews] Error:', error);

    if (error.message?.includes('PERPLEXITY_API_KEY')) {
      return NextResponse.json(
        { error: 'News service not configured.' },
        { status: 502, headers: corsHeaders },
      );
    }

    if (error.message?.includes('Perplexity API error')) {
      return NextResponse.json(
        { error: 'Upstream news service error. Try again later.' },
        { status: 502, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
}
