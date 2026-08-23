#!/usr/bin/env node

/**
 * ==============================================================================
 * 🚀 未来レーダー (MiraiRadar.com) - 銘柄＆静的ページ プリレンダラー (P0-2, P0-3, P0-4)
 * ==============================================================================
 * ビルド成果物 (dist/index.html) を雛形として、全有効銘柄および静的ページの
 * 完全な静的HTML (OGP, self-referencing canonical, JSON-LD, description) を生成します。
 * 
 * これにより、Cloudflare Functions や JavaScript クローラー実行に一切依存せず、
 * Twitterbot, Googlebot, Facebookbot 等で 100% 正確な銘柄別OGP・検索インデックスを実現します。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(ROOT, 'dist');
const SITE_URL = 'https://mirairadar.com';

if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ dist ディレクトリが存在しません。vite build の後に実行してください。');
  process.exit(1);
}

const templatePath = path.join(DIST_DIR, 'index.html');
if (!fs.existsSync(templatePath)) {
  console.error('❌ dist/index.html が見つかりません。');
  process.exit(1);
}

const baseHtml = fs.readFileSync(templatePath, 'utf-8');

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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function prerenderAll() {
  console.log('🚀 [Prerender] 銘柄ページ ＆ 静的ページのプリレンダーを開始します...');

  // 1. Supabase から有効銘柄を取得
  const { data: events, error: evErr } = await supabase
    .from('events')
    .select('*')
    .eq('is_active', true)
    .order('updated_at', { ascending: false });

  if (evErr) {
    console.error('❌ events 取得エラー:', evErr.message);
    process.exit(1);
  }

  // 2. 投票データの集計
  const { data: voteLogs } = await supabase
    .from('japan_vote_logs')
    .select('event_id, choice');

  const voteStats = new Map();
  (voteLogs || []).forEach(v => {
    if (!v.event_id) return;
    const stat = voteStats.get(v.event_id) || { yes: 0, no: 0, total: 0 };
    if (v.choice === 'YES') stat.yes++;
    else if (v.choice === 'NO') stat.no++;
    stat.total++;
    voteStats.set(v.event_id, stat);
  });

  // ==============================================================================
  // A. 全有効銘柄ページのプリレンダー (P0-2, P0-4)
  // ==============================================================================
  console.log(`📦 有効銘柄 ${events.length}件 のプリレンダーHTMLを生成中...`);
  let marketCount = 0;

  for (const event of events) {
    const slug = event.slug || event.id;
    const titleJa = event.title_ja || event.title_en || '未来予測銘柄';
    const worldProb = event.world_prob_yes !== undefined && event.world_prob_yes !== null ? Number(event.world_prob_yes) : 50;

    const stat = voteStats.get(String(event.id)) || { yes: 0, no: 0, total: 0 };
    const n = stat.total;
    const japanProb = n > 0 ? Math.round((stat.yes / n) * 100) : 50;
    const hasConsensus = n >= 3;
    const gap = Math.abs(worldProb - japanProb);

    // description の出し分け (n>=3 ガード準拠)
    const description = hasConsensus
      ? `世界のリアルマネーはYES ${worldProb}%、日本の世論はYES ${japanProb}%（n=${n}）。乖離${gap}ポイント。未来レーダーで比較。`
      : `世界のリアルマネーはYES ${worldProb}%。日本の世論は集計中（n=${n}）。あなたの直感を1秒で投票。`;

    const ogTitle = `【世界の確率 ${worldProb}%】${titleJa}`;
    const canonicalUrl = `${SITE_URL}/market/${slug}`;
    const ogImageUrl = `${SITE_URL}/ogp/market/${slug}.png`;

    // JSON-LD 構造化データ (P0-4: n<3 のときは日本世論を含めない統計的一貫性ガード)
    const variableMeasured = [
      { "@type": "PropertyValue", "name": "世界オッズ(YES)", "value": worldProb }
    ];
    if (hasConsensus) {
      variableMeasured.push(
        { "@type": "PropertyValue", "name": "日本世論(YES)", "value": japanProb },
        { "@type": "PropertyValue", "name": "サンプル数", "value": n }
      );
    }

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Dataset",
      "name": titleJa,
      "description": "Polymarketのリアルマネー確率と日本の無料世論投票の比較データ",
      "url": canonicalUrl,
      "dateModified": event.updated_at || new Date().toISOString(),
      "creator": { "@type": "Organization", "name": "未来レーダー" },
      "variableMeasured": variableMeasured
    };

    let html = baseHtml;

    // 1. <title> 置換
    html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(titleJa)} ｜ 未来レーダー</title>`);

    // 2. <meta name="description"> 置換
    html = html.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${escapeHtml(description)}" />`);

    // 3. canonical 置換 (自己参照)
    html = html.replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${canonicalUrl}" />`);

    // 4. OGP 置換
    html = html.replace(/<meta property="og:type" content=".*?" \/>/i, `<meta property="og:type" content="article" />`);
    html = html.replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${canonicalUrl}" />`);
    html = html.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${escapeHtml(ogTitle)}" />`);
    html = html.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${escapeHtml(description)}" />`);
    html = html.replace(/<meta property="og:image" content=".*?" \/>/i, `<meta property="og:image" content="${ogImageUrl}" />`);
    html = html.replace(/<meta property="og:image:secure_url" content=".*?" \/>/i, `<meta property="og:image:secure_url" content="${ogImageUrl}" />`);
    html = html.replace(/<meta property="og:image:alt" content=".*?" \/>/i, `<meta property="og:image:alt" content="${escapeHtml(titleJa)}" />`);

    // 5. Twitter Card 置換
    html = html.replace(/<meta name="twitter:url" content=".*?" \/>/i, `<meta name="twitter:url" content="${canonicalUrl}" />`);
    html = html.replace(/<meta name="twitter:title" content=".*?" \/>/i, `<meta name="twitter:title" content="${escapeHtml(ogTitle)}" />`);
    html = html.replace(/<meta name="twitter:description" content=".*?" \/>/i, `<meta name="twitter:description" content="${escapeHtml(description)}" />`);
    html = html.replace(/<meta name="twitter:image" content=".*?" \/>/i, `<meta name="twitter:image" content="${ogImageUrl}" />`);
    html = html.replace(/<meta name="twitter:image:alt" content=".*?" \/>/i, `<meta name="twitter:image:alt" content="${escapeHtml(titleJa)}" />`);

    // 6. JSON-LD 置換 (P0-4: 1つの妥当な Dataset 構造化データに置換)
    const jsonLdScript = `<script type="application/ld+json">\n    ${JSON.stringify(jsonLd, null, 2)}\n    </script>`;
    html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, jsonLdScript);

    // 出力ディレクトリ作成 & 書き出し（直接 .html 形式単独出力により 307 リダイレクトを完全根絶）
    const marketBaseDir = path.join(DIST_DIR, 'market');
    if (!fs.existsSync(marketBaseDir)) {
      fs.mkdirSync(marketBaseDir, { recursive: true });
    }
    
    // ディレクトリ形式がもし存在していれば削除（Cloudflare Pages の 307 リダイレクト優先を防ぐ）
    const oldDir = path.join(marketBaseDir, slug);
    if (fs.existsSync(oldDir) && fs.lstatSync(oldDir).isDirectory()) {
      fs.rmSync(oldDir, { recursive: true, force: true });
    }

    // Cloudflare Pages が 307 リダイレクトなしに HTTP 200 を返す直接 .html 形式
    fs.writeFileSync(path.join(marketBaseDir, `${slug}.html`), html, 'utf-8');
    marketCount++;
  }

  console.log(`✅ 有効銘柄 ${marketCount}件 のプリレンダーHTMLを出力完了 (.html 形式単独 / 307根絶)！`);

  // ==============================================================================
  // B. 静的ページの自己参照 Canonical プリレンダー (P0-3)
  // ==============================================================================
  const staticPages = [
    { dir: 'forecast', title: '予測一覧・マーケット ｜ 未来レーダー', canonical: `${SITE_URL}/forecast` },
    { dir: 'rankings', title: '世論スプレッド乖離ランキング ｜ 未来レーダー', canonical: `${SITE_URL}/rankings` },
    { dir: 'ai-connector', title: 'AI連携・WebMCP設定 ｜ 未来レーダー', canonical: `${SITE_URL}/ai-connector` },
    { dir: 'developers', title: '開発者・APIドキュメント ｜ 未来レーダー', canonical: `${SITE_URL}/developers` },
    { dir: 'letter-to-mike', title: 'Mikeへの手紙 ｜ 未来レーダー', canonical: `${SITE_URL}/letter-to-mike` }
  ];

  console.log(`📄 固定ページ ${staticPages.length}件 の自己参照Canonical HTMLを生成中...`);
  for (const page of staticPages) {
    let html = baseHtml;
    html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);
    html = html.replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${page.canonical}" />`);
    html = html.replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${page.canonical}" />`);
    html = html.replace(/<meta name="twitter:url" content=".*?" \/>/i, `<meta name="twitter:url" content="${page.canonical}" />`);

    // 旧ディレクトリ形式が存在していれば削除
    const oldPageDir = path.join(DIST_DIR, page.dir);
    if (fs.existsSync(oldPageDir) && fs.lstatSync(oldPageDir).isDirectory()) {
      fs.rmSync(oldPageDir, { recursive: true, force: true });
    }

    // 直接 .html 形式
    fs.writeFileSync(path.join(DIST_DIR, `${page.dir}.html`), html, 'utf-8');
  }

  console.log('✅ 全プリレンダー処理が正常完了しました！');
}

prerenderAll();
