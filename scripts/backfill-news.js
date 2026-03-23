/**
 * Backfill UPSC News — Uses Perplexity to generate articles for past dates
 * where RSS feeds are no longer available.
 *
 * Usage:
 *   node scripts/backfill-news.js                    # Backfill missing dates in past 30 days
 *   node scripts/backfill-news.js 2026-02-18 2026-03-05  # Backfill specific range
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || process.env.EXPO_PUBLIC_PERPLEXITY_API_KEY;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!PERPLEXITY_API_KEY) { console.error('Missing PERPLEXITY_API_KEY'); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Missing Supabase credentials'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SUBJECTS = ['Polity', 'Economy', 'Science & Technology', 'Environment', 'Current Affairs'];

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatReadable(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Check which dates already have articles
async function getDatesWithArticles(startDate, endDate) {
  const { data } = await supabase
    .from('articles')
    .select('published_date')
    .eq('is_published', true)
    .gte('published_date', startDate)
    .lt('published_date', endDate + 'T23:59:59');

  const dates = new Set();
  (data || []).forEach(a => dates.add(a.published_date.slice(0, 10)));
  return dates;
}

// Generate multiple UPSC articles for a date using Perplexity
async function generateArticlesForDate(dateStr) {
  const readable = formatReadable(dateStr);

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{
        role: 'user',
        content: `Find 8 important UPSC-relevant news events from India that happened on or around ${readable} (${dateStr}).

For each news item, return a JSON array with objects having these fields:
- "title": headline (max 150 chars)
- "subject": one of: Polity, Economy, Science & Technology, Environment, Current Affairs
- "source_url": the actual URL of the news article from The Hindu, Hindustan Times, or Indian Express
- "summary": a detailed UPSC-focused analysis (400-600 words) covering:
  * Lead paragraph (who, what, when, where, why)
  * Background & Context
  * Key Details (bullet points)
  * Analysis & Significance
  * UPSC Relevance (GS Paper, Key Concepts)

Return ONLY a valid JSON array, no other text. Example format:
[{"title":"...","subject":"...","source_url":"...","summary":"..."}]`,
      }],
      max_tokens: 4000,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Perplexity error (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim() || '';

  // Extract JSON from response
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found');
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.warn(`  Failed to parse JSON for ${dateStr}: ${e.message}`);
    return [];
  }
}

// Insert articles into Supabase
async function insertArticles(articles, dateStr) {
  let inserted = 0;
  for (const article of articles) {
    if (!article.title || !article.summary) continue;

    // Check if already exists
    const { data: existing } = await supabase
      .from('articles')
      .select('id')
      .eq('title', article.title.trim().slice(0, 300))
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`    skip (exists): ${article.title.slice(0, 50)}...`);
      continue;
    }

    const { error } = await supabase.from('articles').insert({
      title: article.title.trim().slice(0, 300),
      summary: article.summary.trim(),
      subject: SUBJECTS.includes(article.subject) ? article.subject : 'Current Affairs',
      author: 'PrepAssist AI',
      tags: JSON.stringify([]),
      gs_paper: 'CA',
      source_url: article.source_url || `https://www.thehindu.com/news/${dateStr}`,
      published_date: `${dateStr}T08:00:00`,
      is_published: true,
    });

    if (error) {
      console.error(`    insert error: ${error.message}`);
    } else {
      console.log(`    + ${article.title.slice(0, 60)}...`);
      inserted++;
    }
  }
  return inserted;
}

async function main() {
  const startTime = Date.now();
  const args = process.argv.slice(2);

  let startDate, endDate;
  if (args.length >= 2) {
    startDate = args[0];
    endDate = args[1];
  } else {
    // Default: past 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    startDate = formatDate(thirtyDaysAgo);
    endDate = formatDate(now);
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('  UPSC News Backfill — Perplexity Edition');
  console.log(`  Range: ${startDate} to ${endDate}`);
  console.log('═══════════════════════════════════════════════════\n');

  // Find dates that already have articles
  const existingDates = await getDatesWithArticles(startDate, endDate);
  console.log(`Dates with existing articles: ${existingDates.size}`);

  // Generate list of missing dates
  const missingDates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    const ds = formatDate(current);
    if (!existingDates.has(ds)) {
      missingDates.push(ds);
    }
    current.setDate(current.getDate() + 1);
  }

  console.log(`Missing dates to backfill: ${missingDates.length}\n`);

  if (missingDates.length === 0) {
    console.log('Nothing to backfill!');
    return;
  }

  let totalInserted = 0;

  for (let i = 0; i < missingDates.length; i++) {
    const dateStr = missingDates[i];
    console.log(`[${i + 1}/${missingDates.length}] ${dateStr} (${formatReadable(dateStr)})`);

    try {
      const articles = await generateArticlesForDate(dateStr);
      console.log(`  Found ${articles.length} articles`);

      if (articles.length > 0) {
        const inserted = await insertArticles(articles, dateStr);
        totalInserted += inserted;
        console.log(`  Inserted: ${inserted}\n`);
      } else {
        console.log(`  No articles generated\n`);
      }

      // Delay between dates to avoid rate limiting
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`  Error: ${err.message}\n`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('═══════════════════════════════════════════════════');
  console.log(`Done in ${elapsed}s — Total inserted: ${totalInserted}`);
  console.log('═══════════════════════════════════════════════════');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
