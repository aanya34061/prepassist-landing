require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

supabase.from('articles')
  .select('id, author, gs_paper, source_url')
  .eq('is_published', true)
  .or('source_url.like.https://www.thehindu.com%,source_url.like.https://www.hindustantimes.com%')
  .gte('published_date', '2026-03-18')
  .lt('published_date', '2026-03-19')
  .order('published_date', { ascending: false })
  .limit(60)
  .then(({ data, error }) => {
    if (error) { console.error(error); return; }
    const wrong = data.filter(a =>
      a.source_url && !a.source_url.startsWith('https://www.thehindu.com') && !a.source_url.startsWith('https://www.hindustantimes.com')
    );
    console.log('Total fetched:', data.length, '| Wrong domain:', wrong.length);
    wrong.forEach(a => console.log('WRONG:', a.author, '|', a.source_url));
    console.log('\nSample URLs:');
    data.slice(0, 5).forEach(a => console.log(' author:', a.author, '| url:', (a.source_url || '').slice(0, 70)));
  });
