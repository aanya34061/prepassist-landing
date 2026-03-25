const feeds = [
  'https://www.thehindu.com/news/national/feeder/default.rss',
  'https://www.thehindu.com/opinion/feeder/default.rss',
  'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml'
];
const todayStr = '2026-03-18';

Promise.all(feeds.map(url =>
  fetch(url).then(r => r.text()).then(xml => {
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
    const todayItems = items.filter(m => {
      const pd = m[1].match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] || '';
      if (!pd) return false;
      const d = new Date(pd);
      if (isNaN(d.getTime())) return false;
      return d.toISOString().slice(0, 10) === todayStr;
    });
    const stripCDATA = (s) => (s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim();
    if (todayItems.length > 0) {
      const link = todayItems[0][1].match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1];
      console.log(`${url.slice(0,50)} | total:${items.length} today:${todayItems.length} | sample_link:${stripCDATA(link || '').slice(0,80)}`);
    } else {
      const latestPd = items[0]?.[1].match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] || 'none';
      console.log(`${url.slice(0,50)} | total:${items.length} today:0 | latest:${latestPd.slice(0,40)}`);
    }
  }).catch(e => console.log(url.slice(0, 40), 'error:', e.message))
)).then(() => {});
