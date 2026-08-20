import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://mirairadar.com';
const today = new Date().toISOString().split('T')[0];

// 1. 初期・静的銘柄リスト（フォールバック用）
const staticSlugs = [
  'fed-decision-in-september',
  'presidential-election-winner-2028',
  'openai-gpt5-or-next-flagship-release',
  'bank-of-japan-rate-hike-by-december',
  'shohei-ohtani-50-home-runs-2026',
  'nintendo-switch-2-announcement-timing',
  'nikkei-225-45000-by-year-end',
  'us-recession-in-2026',
  'bitcoin-100k-in-2026',
  'japan-minimum-wage-1500-yen',
];

async function fetchLiveMarketSlugs() {
  const slugs = new Set(staticSlugs);
  try {
    const res = await fetch('https://gamma-api.polymarket.com/events?limit=80&active=true&closed=false&order=volume24hr&ascending=false');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        data.forEach(item => {
          if (item.slug) slugs.add(item.slug);
          if (item.id) slugs.add(String(item.id));
        });
      }
    }
  } catch (err) {
    console.warn('Could not fetch live Polymarket events, using static list:', err.message);
  }
  return Array.from(slugs);
}

async function buildSitemap() {
  const marketSlugs = await fetchLiveMarketSlugs();
  console.log(`Generating sitemap with ${marketSlugs.length} market detail pages...`);

  const urls = [];

  // トップページ
  urls.push({
    loc: `${SITE_URL}/`,
    lastmod: today,
    changefreq: 'always',
    priority: '1.0'
  });

  // 主要固定ページ
  urls.push({
    loc: `${SITE_URL}/letter-to-mike`,
    lastmod: today,
    changefreq: 'weekly',
    priority: '0.8'
  });

  urls.push({
    loc: `${SITE_URL}/api/mcp`,
    lastmod: today,
    changefreq: 'weekly',
    priority: '0.8'
  });

  // カテゴリ別ハブ
  const categories = ['trending', 'economy', 'tech', 'politics', 'sports', 'entertainment'];
  categories.forEach(cat => {
    urls.push({
      loc: `${SITE_URL}/?category=${cat}`,
      lastmod: today,
      changefreq: 'hourly',
      priority: '0.9'
    });
  });

  // 全個別銘柄ページ
  marketSlugs.forEach(slug => {
    urls.push({
      loc: `${SITE_URL}/market/${encodeURIComponent(slug)}`,
      lastmod: today,
      changefreq: 'hourly',
      priority: '0.85'
    });
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

  const outputPath = path.resolve('./public/sitemap.xml');
  fs.writeFileSync(outputPath, xml, 'utf8');
  console.log(`✅ Sitemap successfully created at ${outputPath} with ${urls.length} URLs!`);
}

buildSitemap();
