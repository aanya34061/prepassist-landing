/**
 * Daily UPSC News Updater — The Hindu + Hindustan Times
 *
 * Runs at 8 AM IST daily (via scheduler.js).
 * 1. Fetches today's articles from The Hindu & Hindustan Times RSS feeds
 * 2. Generates full UPSC analysis for each article via Perplexity
 * 3. Stores everything pre-processed in Supabase
 *
 * Users then read instantly — no on-device generation needed.
 *
 * Usage:
 *   node scripts/daily-news-updater.js          # Run once (today)
 *   node scripts/daily-news-updater.js 2026-03-18  # Run for specific date
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();


const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || process.env.EXPO_PUBLIC_PERPLEXITY_API_KEY;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!PERPLEXITY_API_KEY) { console.error('❌ Missing PERPLEXITY_API_KEY in .env'); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Missing Supabase credentials in .env'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── RSS feeds — The Hindu + Hindustan Times ───────────────────────────────
const HINDU_RSS_FEEDS = [
  // The Hindu
  { url: 'https://www.thehindu.com/news/national/feeder/default.rss',             subject: 'Polity',              source: 'The Hindu', gs_paper: 'TH' },
  { url: 'https://www.thehindu.com/news/international/feeder/default.rss',        subject: 'Current Affairs',     source: 'The Hindu', gs_paper: 'TH' },
  { url: 'https://www.thehindu.com/business/feeder/default.rss',                  subject: 'Economy',             source: 'The Hindu', gs_paper: 'TH' },
  { url: 'https://www.thehindu.com/sci-tech/feeder/default.rss',                  subject: 'Science & Technology',source: 'The Hindu', gs_paper: 'TH' },
  { url: 'https://www.thehindu.com/news/national/environment/feeder/default.rss', subject: 'Environment',         source: 'The Hindu', gs_paper: 'TH' },
  { url: 'https://www.thehindu.com/opinion/feeder/default.rss',                   subject: 'Current Affairs',     source: 'The Hindu', gs_paper: 'TH' },
  // Hindustan Times
  { url: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml',       subject: 'Polity',              source: 'Hindustan Times', gs_paper: 'HT' },
  { url: 'https://www.hindustantimes.com/feeds/rss/world-news/rssfeed.xml',       subject: 'Current Affairs',     source: 'Hindustan Times', gs_paper: 'HT' },
  { url: 'https://www.hindustantimes.com/feeds/rss/business/rssfeed.xml',         subject: 'Economy',             source: 'Hindustan Times', gs_paper: 'HT' },
  { url: 'https://www.hindustantimes.com/feeds/rss/technology/rssfeed.xml',       subject: 'Science & Technology',source: 'Hindustan Times', gs_paper: 'HT' },
  { url: 'https://www.hindustantimes.com/feeds/rss/environment/rssfeed.xml',      subject: 'Environment',         source: 'Hindustan Times', gs_paper: 'HT' },
];

// ── UPSC relevance filter ─────────────────────────────────────────────────
const SKIP_KEYWORDS = [
  // Sports
  'cricket', 'ipl', 'bcci', 'virat kohli', 'rohit sharma', 'dhoni', 't20', 'odi',
  'football', 'fifa', 'premier league', 'la liga', 'tennis', 'wimbledon',
  'olympic medal', 'hockey league', 'pro kabaddi', 'badminton', 'grand slam',
  'world cup qualifier', 'match preview', 'match result', 'scorecard',
  // Entertainment & Bollywood
  'bollywood', 'hollywood', 'box office', 'movie review', 'film review',
  'trailer', 'ott release', 'netflix', 'web series', 'celebrity',
  'actress', 'red carpet', 'award show', 'filmfare', 'bigg boss',
  // Crime & accidents (local, non-policy)
  'murder suspect', 'road accident', 'car crash', 'hit and run',
  'robbery', 'chain snatching', 'domestic violence case', 'drunk driving',
  // Lifestyle & gossip
  'horoscope', 'zodiac', 'relationship tips', 'beauty tips', 'fashion week',
  'wedding photos', 'viral video', 'meme', 'trending on social media',
  'instagram', 'influencer',
];

function isUPSCRelevant(title) {
  const lower = title.toLowerCase();
  return !SKIP_KEYWORDS.some(kw => lower.includes(kw));
}

// ── RSS helpers ────────────────────────────────────────────────────────────
const stripCDATA = (s) => (s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim();

function parseRSSItems(xml, subject) {
  const items = [];
  const matches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
  for (const m of matches) {
    const block = m[1];
    const get = (tag) => {
      const r = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return r ? stripCDATA(r[1]) : '';
    };
    const title   = get('title');
    const link    = get('link');
    const desc    = get('description');
    const pubDate = get('pubDate');
    if (title && link.startsWith('http')) {
      items.push({ title, link, desc, pubDate, subject });
    }
  }
  return items;
}

function getTodayStr(targetDate) {
  if (targetDate) return targetDate;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── Fetch today's articles from all RSS feeds ──────────────────────────────
async function fetchHinduRSS(todayStr) {
  console.log(`\n📡 Fetching RSS feeds for ${todayStr}...`);
  const allItems = [];

  await Promise.all(HINDU_RSS_FEEDS.map(async (feed) => {
    try {
      const res = await fetch(feed.url);
      const xml = await res.text();
      const items = parseRSSItems(xml, feed.subject);
      // Attach source metadata to each item
      items.forEach(item => { item.source = feed.source; item.gs_paper = feed.gs_paper; });
      console.log(`   ✅ [${feed.source}] ${feed.subject}: ${items.length} items`);
      allItems.push(...items);
    } catch (e) {
      console.warn(`   ⚠️  Failed: ${feed.url} — ${e.message}`);
    }
  }));

  // Filter to today only
  const todayArticles = allItems.filter(item => {
    if (!item.pubDate) return false;
    const d = new Date(item.pubDate);
    if (isNaN(d.getTime())) return false;
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${day}` === todayStr;
  });

  // Filter out non-UPSC articles (sports, entertainment, etc.)
  const upscArticles = todayArticles.filter(item => isUPSCRelevant(item.title));
  console.log(`\n📋 ${todayArticles.length} articles found, ${upscArticles.length} UPSC-relevant for ${todayStr}\n`);
  return upscArticles;
}

// ── Generate UPSC analysis via Perplexity ─────────────────────────────────
async function generateUPSCSummary(article) {
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
        content: `Read this article: ${article.link}
Title: ${article.title}

IMPORTANT: If this article is about sports, entertainment, Bollywood, celebrity gossip, local crime/accidents, lifestyle, or has NO relevance to UPSC Civil Services exam preparation — reply with exactly "NOT_RELEVANT" and nothing else.

Only if the article IS relevant to UPSC (governance, polity, economy, international relations, science & technology policy, environment policy, social issues, schemes, constitutional matters, judiciary, security, history, geography, ethics), write a detailed UPSC-focused analysis (600-800 words) in newspaper format:

[Lead paragraph — who, what, when, where, why in 2-3 sentences]

Background & Context
[2-3 paragraphs giving historical background, previous related events, relevant constitutional/legal provisions, government policies involved]

Key Details
 * [Important fact or figure]
 * [Important fact or figure]
 * [Important fact or figure]
 * [Important fact or figure]

Analysis & Significance
[1-2 paragraphs on political, economic, social, or environmental implications]

UPSC Relevance
 * GS Paper: [GS1/GS2/GS3/GS4 — specific topic]
 * Key Concepts: [Acts, schemes, constitutional provisions to study]
 * Previous Year Connect: [Related PYQ theme]

Return only the article text, no JSON, no markdown code blocks.`,
      }],
      max_tokens: 2000,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Perplexity error (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// ── Check if article already stored (by source_url) ───────────────────────
async function alreadyExists(sourceUrl) {
  const { data } = await supabase
    .from('articles')
    .select('id')
    .eq('source_url', sourceUrl)
    .limit(1);
  return data && data.length > 0;
}

// ── Insert one article into Supabase ──────────────────────────────────────
async function insertArticle(rssItem, summary, todayStr) {
  const { error } = await supabase.from('articles').insert({
    title: rssItem.title.trim().slice(0, 300),
    summary: summary.trim(),
    subject: rssItem.subject,
    author: rssItem.source || 'The Hindu',
    tags: JSON.stringify([]),
    gs_paper: rssItem.gs_paper || 'TH',
    source_url: rssItem.link,
    published_date: `${todayStr}T08:00:00`,
    is_published: true,
  });
  return error;
}

// ── Main ──────────────────────────────────────────────────────────────────
async function runDailyUpdate() {
  const startTime = Date.now();
  const targetDate = process.argv[2] || null;
  const todayStr = getTodayStr(targetDate);

  console.log('═══════════════════════════════════════════════════');
  console.log('📰 UPSC Daily News Updater — The Hindu RSS Edition');
  console.log(`🕐 ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
  console.log(`📅 Date: ${todayStr}`);
  console.log('═══════════════════════════════════════════════════');

  try {
    // Step 1: Fetch RSS
    const rssArticles = await fetchHinduRSS(todayStr);

    if (rssArticles.length === 0) {
      console.log('ℹ️  No articles found for today. Exiting.');
      return { success: true, inserted: 0, skipped: 0 };
    }

    // Step 2: Generate summaries and insert one by one
    console.log('💾 Generating summaries & inserting into Supabase...\n');
    let inserted = 0;
    let skipped = 0;

    for (let i = 0; i < rssArticles.length; i++) {
      const item = rssArticles[i];
      const label = `[${i + 1}/${rssArticles.length}] ${item.title.slice(0, 60)}...`;

      try {
        // Skip if already in DB
        if (await alreadyExists(item.link)) {
          console.log(`  ⏭️  Already exists: ${label}`);
          skipped++;
          continue;
        }

        console.log(`  ⏳ Generating: ${label}`);
        const summary = await generateUPSCSummary(item);

        if (!summary || summary.trim() === 'NOT_RELEVANT') {
          console.log(`  🚫 Not UPSC-relevant, skipping: ${label}`);
          skipped++;
          continue;
        }

        const error = await insertArticle(item, summary, todayStr);
        if (error) {
          console.error(`  ❌ Insert failed: ${label} —`, error.message);
          skipped++;
        } else {
          console.log(`  ✅ Done: ${label}`);
          inserted++;
        }

        // Small delay to avoid rate-limiting
        await new Promise(r => setTimeout(r, 1500));

      } catch (err) {
        console.error(`  ❌ Error: ${label} —`, err.message);
        skipped++;
        // Wait longer after an error
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n═══════════════════════════════════════════════════');
    console.log(`✅ Done in ${elapsed}s`);
    console.log(`   📥 Inserted: ${inserted}`);
    console.log(`   ⏭️  Skipped:  ${skipped}`);
    console.log('═══════════════════════════════════════════════════\n');

    return { success: true, inserted, skipped };

  } catch (err) {
    console.error('\n❌ Update failed:', err.message);
    return { success: false, error: err.message };
  }
}

// Run if called directly
if (require.main === module) {
  runDailyUpdate().then((result) => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = { runDailyUpdate };
