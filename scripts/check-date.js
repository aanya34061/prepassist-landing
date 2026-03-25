require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

// Test for yesterday
const date = '2026-03-17';
supabase.from('articles')
  .select('id, gs_paper, source_url')
  .eq('is_published', true)
  .in('gs_paper', ['TH', 'HT'])
  .or('source_url.like.https://www.thehindu.com%,source_url.like.https://www.hindustantimes.com%')
  .gte('published_date', date)
  .lt('published_date', '2026-03-18')
  .limit(5)
  .then(({ data, error }) => {
    if (error) console.error('ERROR:', error.message, error.code);
    else console.log('March 17 results:', data.length);
  });
