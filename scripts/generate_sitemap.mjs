#!/usr/bin/env node

/**
 * ==============================================================================
 * 🗺️ 未来レーダー (MiraiRadar.com) - サイトマップ自動生成スクリプト
 * ==============================================================================
 * Supabase の有効銘柄（is_active = true）を正として 100% 実在するURLのみを出力します。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SITE_URL = 'https://mirairadar.com';
const today = new Date().toISOString().split('T')[0];

// 環境変数読み込み
const env = {};
if (fs.existsSync(path.join(ROOT, '.env'))) {
  const envStr = fs.readFileSync(path.join(ROOT, '.env'), 'utf-8');
  envStr.split('\n').forEach((line) => {
    const [k, ...v] = line.split('=');
    if (k && !k.startsWith('#')) env[k.trim()] = v.join('=').trim();
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || 'https://wdpygtmqehoepgrueeda.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchActiveMarkets() {
  try {
    // is_listed 列は DDL 適用前は存在しないため、列指定ではなく '*' で取り、
    // クライアント側で `!== false`（列なし＝掲載）に倒す (Phase 2-A)
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    // 観測対象外（is_listed=false）は sitemap に載せない。ページ自体は noindex で残る
    return (data || []).filter((e) => e.is_listed !== false);
  } catch (err) {
    console.error('❌ Supabase からの有効銘柄取得に失敗しました:', err.message);
    process.exit(1);
  }
}

async function buildSitemap() {
  const activeEvents = await fetchActiveMarkets();
  console.log(`🗺️ Supabase から有効銘柄 ${activeEvents.length}件 を取得しました。サイトマップを生成中...`);

  const urls = [];

  // 1. トップページ
  urls.push({
    loc: `${SITE_URL}/`,
    lastmod: today,
    changefreq: 'always',
    priority: '1.0'
  });

  // 2. 主要固定ページ ＆ 解説ガイド
  const staticPages = [
    { path: '/forecast', priority: '0.9', changefreq: 'always' },
    { path: '/rankings', priority: '0.9', changefreq: 'always' },
    { path: '/about', priority: '0.8', changefreq: 'weekly' },
    { path: '/guide/polymarket-japan', priority: '0.9', changefreq: 'weekly' },
    { path: '/ai-connector', priority: '0.8', changefreq: 'weekly' },
    { path: '/developers', priority: '0.8', changefreq: 'weekly' },
    { path: '/letter-to-mike', priority: '0.8', changefreq: 'weekly' }
    // '/api/mcp' は API エンドポイントでページではない。canonical も '/' を指すため
    // sitemap に載せると「重複・正規URLではない」として計上される（第12回 N-46）
  ];

  staticPages.forEach(p => {
    urls.push({
      loc: `${SITE_URL}${p.path}`,
      lastmod: today,
      changefreq: p.changefreq,
      priority: p.priority
    });
  });

  // 3. カテゴリ別ハブ（?category=）は canonical が '/' に集約される重複URLなので
  //    sitemap には載せない（第12回 N-46）。トップからのリンクで巡回はされる。

  // 4. 全有効個別銘柄ページ (100% 実在する銘柄のみ)
  activeEvents.forEach(event => {
    const slug = event.slug || event.id;
    const lastmod = event.updated_at ? new Date(event.updated_at).toISOString().split('T')[0] : today;
    urls.push({
      loc: `${SITE_URL}/market/${encodeURIComponent(slug)}`,
      lastmod,
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

  const outputPath = path.resolve(ROOT, 'public', 'sitemap.xml');
  fs.writeFileSync(outputPath, xml, 'utf8');
  console.log(`✅ Sitemap successfully created at ${outputPath} with ${urls.length} URLs (有効銘柄: ${activeEvents.length}件, 死にURL: 0件)!`);
}

buildSitemap();
