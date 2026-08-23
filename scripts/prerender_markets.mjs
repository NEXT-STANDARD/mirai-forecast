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
import { resolvePolymarketOdds } from './resolvePolymarketOdds.mjs';

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

  // 3. Polymarket リアルタイム市場オッズの読み込み＆多段取得 (N-30, N-33, N-34, N-35, N-36: 単一共有エンジン)
  let marketOdds = {};
  const oddsJsonPath = path.resolve(ROOT, 'public', 'data', 'market_odds.json');
  if (fs.existsSync(oddsJsonPath)) {
    try {
      marketOdds = JSON.parse(fs.readFileSync(oddsJsonPath, 'utf-8'));
    } catch {}
  }

  const oddsMap = new Map(Object.entries(marketOdds));
  try {
    const polyMap = new Map();
    for (const offset of [0, 100, 200, 300, 400]) {
      const pageUrl = `https://gamma-api.polymarket.com/events?limit=100&offset=${offset}&active=true&closed=false&order=volume24hr&ascending=false`;
      const res = await fetch(pageUrl);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          list.forEach(ev => {
            polyMap.set(String(ev.id), ev);
            if (ev.slug) polyMap.set(ev.slug, ev);
          });
        }
      }
    }

    for (const event of events) {
      if (!polyMap.has(String(event.id)) && !polyMap.has(event.slug) && /^\d+$/.test(String(event.id))) {
        try {
          const directRes = await fetch(`https://gamma-api.polymarket.com/events/${event.id}`);
          if (directRes.ok) {
            const directEv = await directRes.json();
            polyMap.set(String(directEv.id), directEv);
            if (directEv.slug) polyMap.set(directEv.slug, directEv);
          }
        } catch {}
      }
    }

    polyMap.forEach((ev, key) => {
      const dbEv = events.find(e => String(e.id) === String(ev.id) || e.slug === ev.slug);
      const odds = resolvePolymarketOdds(ev, dbEv?.title_ja, dbEv?.title_en);
      if (odds) oddsMap.set(key, odds);
    });
  } catch (err) {
    console.warn('Live odds fetch warning in prerender:', err.message);
  }

  if (oddsMap.size === 0) {
    throw new Error('❌ [CRITICAL] Polymarket 市場オッズの取得に失敗しました（0エントリ）。ビルドを中止します。');
  }

  // ==============================================================================
  // A. 全有効銘柄ページのプリレンダー (P0-2, P0-4)
  // ==============================================================================
  console.log(`📦 有効銘柄 ${events.length}件 のプリレンダーHTMLを生成中...`);
  let marketCount = 0;

  for (const event of events) {
    const slug = event.slug || event.id;
    const titleJa = event.title_ja || event.title_en || '未来予測銘柄';
    const isDomestic = String(event.id).startsWith('council-') || String(event.id).startsWith('official-') || String(event.id).startsWith('proposal-') || ['japan-lower-house-dissolution-2026', 'sam-altman-world-ai-summit-tokyo', 'boj-rate-hike-september-2026'].includes(String(event.id));

    // 実オッズの厳密解決 (N-30, N-33, N-34: 50% 無言フォールバック完全撤廃)
    const oddsEntry = oddsMap.get(String(event.id)) || oddsMap.get(slug);
    const isPolymarketObserved = !isDomestic && oddsEntry && typeof oddsEntry.probYes === 'number';
    const worldProb = isPolymarketObserved ? oddsEntry.probYes : null;
    const isMultiChoice = oddsEntry?.isMultiChoice;
    const leaderName = oddsEntry?.leaderName;

    const stat = voteStats.get(String(event.id)) || { yes: 0, no: 0, total: 0 };
    const n = stat.total;
    const japanProb = n > 0 ? Math.round((stat.yes / n) * 100) : 50;
    const hasConsensus = n >= 3;
    const gap = isPolymarketObserved ? Math.abs(worldProb - japanProb) : null;

    // description の出し分け (n>=3 ガード & 世界オッズ実測値準拠 & N-33/N-34 正確な名乗り)
    let description = '';
    let ogTitle = '';

    if (isPolymarketObserved) {
      ogTitle = isMultiChoice && leaderName
        ? `【世界本命 ${worldProb}%】${titleJa}`
        : `【世界の確率 ${worldProb}%】${titleJa}`;
      description = hasConsensus
        ? `世界のリアルマネーはYES ${worldProb}%、日本の世論はYES ${japanProb}%（n=${n}）。乖離${gap}ポイント。未来レーダーで比較。`
        : `世界のリアルマネーはYES ${worldProb}%。日本の世論は集計中（n=${n}）。あなたの直感を1秒で投票。`;
    } else if (isDomestic) {
      // 日本国内独自調査銘柄 (council / official / proposal 等)
      ogTitle = `【日本世論調査】${titleJa}`;
      description = hasConsensus
        ? `日本の世論はYES ${japanProb}%（n=${n}）。未来レーダーで世論比較。`
        : `日本の世論は集計中（n=${n}）。あなたの直感を1秒で投票。`;
    } else {
      // Polymarket観測対象だが取引僅少
      ogTitle = `【世界観測銘柄】${titleJa}`;
      description = hasConsensus
        ? `日本の世論はYES ${japanProb}%（n=${n}）。世界予測市場の流動性待機中。未来レーダーで世論比較。`
        : `日本の世論は集計中（n=${n}）。あなたの直感を1秒で投票。`;
    }

    const canonicalUrl = `${SITE_URL}/market/${slug}`;
    const ogImageUrl = `${SITE_URL}/ogp/market/${slug}.png`;

    // JSON-LD 構造化データ (P0-4: 統計的一貫性ガード & 実オッズ反映)
    const variableMeasured = [];
    if (isPolymarketObserved) {
      variableMeasured.push({ "@type": "PropertyValue", "name": "世界オッズ(YES)", "value": worldProb });
    }
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
      "description": isPolymarketObserved ? "Polymarketのリアルマネー確率と日本の無料世論投票の比較データ" : "日本の世論投票データ",
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
  // B. 静的ページの自己参照 Canonical ＆ 固有 description プリレンダー (P1-1)
  // ==============================================================================
  const staticPages = [
    {
      dir: 'forecast',
      title: '予測一覧・マーケット ｜ 未来レーダー',
      description: '世界最大の予測市場Polymarketと日本のリアルタイム世論を比較できる全観測銘柄一覧。経済・テック・国際情勢・スポーツの未来予測オッズを即時確認。',
      canonical: `${SITE_URL}/forecast`
    },
    {
      dir: 'rankings',
      title: '世論スプレッド乖離ランキング ｜ 未来レーダー',
      description: '世界のスマートマネー（Polymarket）と日本の生活者世論の間で、見解が最も乖離している注目銘柄ランキング。世論ギャップをリアルタイム可視化。',
      canonical: `${SITE_URL}/rankings`
    },
    {
      dir: 'ai-connector',
      title: 'AI連携・WebMCP設定 ｜ 未来レーダー',
      description: 'Claude、ChatGPT、Cursor等の自律型AIエージェントから未来レーダーの予測市場データ・世論スプレッドを直接取得できるWebMCP API設定手順。',
      canonical: `${SITE_URL}/ai-connector`
    },
    {
      dir: 'developers',
      title: '開発者・APIドキュメント ｜ 未来レーダー',
      description: '開発者・データアナリスト向けオープンAPI（WebMCP）ドキュメント。リアルタイムなPolymarketオッズと日本世論データを無料で取得・連携可能。',
      canonical: `${SITE_URL}/developers`
    },
    {
      dir: 'letter-to-mike',
      title: 'Mikeへの手紙 ｜ 未来レーダー',
      description: 'Polymarket日本市場責任者 Mike Eidlin 氏への公開書簡。日本における予測市場の健全な発展と、未来レーダーが目指す世論インテリジェンスの理念。',
      canonical: `${SITE_URL}/letter-to-mike`
    }
  ];

  console.log(`📄 固定ページ ${staticPages.length}件 の自己参照Canonical ＆ 固有Description HTMLを生成中...`);
  for (const page of staticPages) {
    let html = baseHtml;
    html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);
    html = html.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${escapeHtml(page.description)}" />`);
    html = html.replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${page.canonical}" />`);
    html = html.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${escapeHtml(page.title)}" />`);
    html = html.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${escapeHtml(page.description)}" />`);
    html = html.replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${page.canonical}" />`);
    html = html.replace(/<meta name="twitter:title" content=".*?" \/>/i, `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`);
    html = html.replace(/<meta name="twitter:description" content=".*?" \/>/i, `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`);
    html = html.replace(/<meta name="twitter:url" content=".*?" \/>/i, `<meta name="twitter:url" content="${page.canonical}" />`);

    // 旧ディレクトリ形式が存在していれば削除
    const oldPageDir = path.join(DIST_DIR, page.dir);
    if (fs.existsSync(oldPageDir) && fs.lstatSync(oldPageDir).isDirectory()) {
      fs.rmSync(oldPageDir, { recursive: true, force: true });
    }

    // 直接 .html 形式
    fs.writeFileSync(path.join(DIST_DIR, `${page.dir}.html`), html, 'utf-8');
  }

  // ==============================================================================
  // C. ガイド記事ページのプリレンダー (P1-2, P1-3)
  // ==============================================================================
  const guideArticles = [
    {
      slug: 'polymarket-japan',
      title: 'Polymarket（ポリマーケット）は日本から使えるのか？規制の現状と日本語での見方・活用法 ｜ 未来レーダー',
      description: '世界最大の予測市場Polymarketは日本から使えるのか？2026年現在の利用制限、賭博規制の整理、日本語でリアルマネー確率を閲覧・比較する代替手段を分かりやすく解説。',
      publishedAt: '2026-08-23',
      canonical: `${SITE_URL}/guide/polymarket-japan`
    }
  ];

  console.log(`📚 ガイド記事ページ ${guideArticles.length}件 のプリレンダーHTMLを生成中...`);
  const guideBaseDir = path.join(DIST_DIR, 'guide');
  if (!fs.existsSync(guideBaseDir)) {
    fs.mkdirSync(guideBaseDir, { recursive: true });
  }

  for (const guide of guideArticles) {
    let html = baseHtml;
    html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(guide.title)}</title>`);
    html = html.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${escapeHtml(guide.description)}" />`);
    html = html.replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${guide.canonical}" />`);
    html = html.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${escapeHtml(guide.title)}" />`);
    html = html.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${escapeHtml(guide.description)}" />`);
    html = html.replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${guide.canonical}" />`);
    html = html.replace(/<meta property="og:type" content=".*?" \/>/i, `<meta property="og:type" content="article" />`);
    html = html.replace(/<meta name="twitter:title" content=".*?" \/>/i, `<meta name="twitter:title" content="${escapeHtml(guide.title)}" />`);
    html = html.replace(/<meta name="twitter:description" content=".*?" \/>/i, `<meta name="twitter:description" content="${escapeHtml(guide.description)}" />`);
    html = html.replace(/<meta name="twitter:url" content=".*?" \/>/i, `<meta name="twitter:url" content="${guide.canonical}" />`);

    // Schema.org Article JSON-LD
    const articleJsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": guide.canonical
      },
      "headline": guide.title,
      "description": guide.description,
      "image": "https://mirairadar.com/ogp-main.png",
      "author": {
        "@type": "Organization",
        "name": "未来レーダー編集部"
      },
      "publisher": {
        "@type": "Organization",
        "name": "未来レーダー (MiraiRadar)",
        "logo": {
          "@type": "ImageObject",
          "url": "https://mirairadar.com/favicon.svg"
        }
      },
      "datePublished": guide.publishedAt,
      "dateModified": guide.publishedAt
    };

    const jsonLdScript = `<script type="application/ld+json">\n    ${JSON.stringify(articleJsonLd, null, 2)}\n    </script>`;
    html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, jsonLdScript);

    const relatedSlugs = guide.relatedSlugs || ['fed-decision-in-september-762', 'boj-rate-hike-by-december-2026', 'openai-gpt-5-release-2026'];
    const crawlableLinksHtml = `
  <div id="root">
    <main class="prerender-guide-shell" style="max-width:800px;margin:0 auto;padding:24px;font-family:sans-serif;">
      <h1>${escapeHtml(guide.title)}</h1>
      <p>${escapeHtml(guide.description)}</p>
      <section style="margin-top:24px;">
        <h2>注目のリアルタイム観測銘柄</h2>
        <ul>
          ${relatedSlugs.map(slug => `<li><a href="/market/${slug}">観測銘柄: ${slug}</a></li>`).join('\n          ')}
        </ul>
        <p><a href="/">未来レーダー トップへ戻る</a></p>
      </section>
    </main>
  </div>`;
    html = html.replace(/<div id="root"><\/div>/i, crawlableLinksHtml);

    // 旧ディレクトリ形式が存在していれば削除
    const oldGuideDir = path.join(guideBaseDir, guide.slug);
    if (fs.existsSync(oldGuideDir) && fs.lstatSync(oldGuideDir).isDirectory()) {
      fs.rmSync(oldGuideDir, { recursive: true, force: true });
    }

    // 直接 .html 形式
    fs.writeFileSync(path.join(guideBaseDir, `${guide.slug}.html`), html, 'utf-8');
  }

  console.log('✅ 全プリレンダー処理が正常完了しました！');
}

prerenderAll();
