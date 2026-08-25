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
import { resolvePolymarketOdds, truncateLeader, isDomesticEvent } from './resolvePolymarketOdds.mjs';

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

// ==============================================================================
// N-49: JSを実行しないクローラに <div id="root"></div> しか届いていなかった問題
// ------------------------------------------------------------------------------
// プリレンダーは <head> の meta だけを差し替えており、<body> は空のままだった。
// そのため sitemap の 79URL 中 78URL が、静的HTMLでは本文0文字・内部リンク0本。
// アプリは createRoot（hydrateRoot ではない）なのでマウント時にコンテナを空にする。
// つまり #root の中に静的本文を置いても不整合は起きず、起動後に置き換わるだけ。
// ==============================================================================
const SITE_NAV = [
  ['/', 'トップ（全銘柄の一覧）'],
  ['/forecast', '予測ハブ'],
  ['/rankings', '的中ランキング'],
  ['/guide/polymarket-japan', 'Polymarketとは（解説記事）'],
  ['/about', '未来レーダーについて'],
  ['/track-record', '的中トラックレコード（全決着の予測 vs 結果）'],
  ['/ai-connector', 'AI連携（WebMCP）'],
];

function navHtml(currentPath) {
  const items = SITE_NAV
    .filter(([href]) => href !== currentPath)
    .map(([href, label]) => `<li><a href="${href}">${escapeHtml(label)}</a></li>`)
    .join('');
  return `<nav aria-label="サイト内リンク"><h2>未来レーダーの他のページ</h2><ul>${items}</ul></nav>`;
}

function staticBody({ h1, lead, currentPath, facts = [], links = [], linksHeading = '関連する銘柄' }) {
  const factsHtml = facts.length
    ? `<dl>${facts.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('')}</dl>`
    : '';
  const linksHtml = links.length
    ? `<h2>${escapeHtml(linksHeading)}</h2><ul>${links
        .map(([href, label]) => `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`)
        .join('')}</ul>`
    : '';
  // Tailwind の preflight が見出しもリンクも素の文字に潰すため、シェル内だけ最小限を戻す。
  // JSが失敗したときにここが唯一の導線になるので、リンクは押せると分かる必要がある。
  const shellStyle = '<style>#root h1{font-size:1.5rem;font-weight:700;margin:1rem 0}'
    + '#root h2{font-size:1.1rem;font-weight:700;margin:1.25rem 0 .5rem}'
    + '#root p{margin:.5rem 0;line-height:1.7}'
    + '#root ul{margin:.5rem 0;padding-left:1.25rem}#root li{margin:.35rem 0;list-style:disc}'
    + '#root dt{font-weight:700;margin-top:.5rem}#root dd{margin:0 0 .25rem}'
    + '#root a{color:#7dd3fc;text-decoration:underline}</style>';
  return '<div id="root">' + shellStyle
    + `<h1>${escapeHtml(h1)}</h1><p>${escapeHtml(lead)}</p>`
    + factsHtml + linksHtml + navHtml(currentPath)
    + '</div>';
}

// baseHtml の空 #root を静的本文で置き換える。置換できなければ黙って進めない。
function injectStaticBody(html, body, whatFor) {
  if (!html.includes('<div id="root"></div>')) {
    throw new Error(`❌ [CRITICAL] 静的本文を注入できません（${whatFor}）: <div id="root"></div> が見つかりません`);
  }
  return html.replace('<div id="root"></div>', body);
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

  // Phase 2-A: 静的シェルの「掲載面」リンク（トップ・関連銘柄・静的ページ）は掲載中の銘柄だけで作る。
  // プリレンダー自体は全有効銘柄に対して行う（観測対象外は noindex で残す）。
  const listedEvents = events.filter(e => e.is_listed !== false);

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

  // N-58: OGP生成が同じビルド内で解決したオッズがあれば、それを使う。
  //   ここで独自に取り直すと、vite build を挟んだぶん（20〜30秒）価格が動き、
  //   共有カードとリンク先ページで数字が食い違う。
  //   スナップショットが無い・古い場合は従来どおり自前で取りに行く。
  let usedSnapshot = false;
  try {
    const snapPath = path.resolve(ROOT, '.build-cache', 'odds-snapshot.json');
    if (fs.existsSync(snapPath)) {
      const snap = JSON.parse(fs.readFileSync(snapPath, 'utf-8'));
      const ageMs = Date.now() - new Date(snap.generatedAt).getTime();
      const entries = Object.entries(snap.odds || {});
      if (ageMs >= 0 && ageMs < 10 * 60 * 1000 && entries.length > 0) {
        for (const [k, v] of entries) oddsMap.set(k, v);
        usedSnapshot = true;
        console.log(`📸 OGP生成のオッズを再利用しました（${entries.length}件 / 生成から${Math.round(ageMs / 1000)}秒 / N-58）`);
      } else {
        console.log(`📸 スナップショットが古いか空のため使いません（${Math.round(ageMs / 1000)}秒前 / ${entries.length}件）`);
      }
    }
  } catch (err) {
    console.warn('スナップショットの読み込みに失敗:', err.message);
  }

  if (!usedSnapshot) try {
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
  // Phase 2-D: /api/mcp が返す実データのスナップショット（掲載銘柄のみ）。
  // ここで組み立てるのは、ページに描いたのと同じ数字を同じガードで出すため。
  // n<3 の日本世論は確率を出さない（サイト全体と同じ基準）。
  const mcpSnapshotEvents = [];

  for (const event of events) {
    const slug = event.slug || event.id;
    const titleJa = event.title_ja || event.title_en || '未来予測銘柄';
    const isDomestic = isDomesticEvent(event.id);

    // 実オッズの厳密解決 (N-30, N-33, N-34: 50% 無言フォールバック完全撤廃)
    const oddsEntry = oddsMap.get(String(event.id)) || oddsMap.get(slug);
    const isPolymarketObserved = !isDomestic && oddsEntry && typeof oddsEntry.probYes === 'number';
    const worldProb = isPolymarketObserved ? oddsEntry.probYes : null;
    const isMultiChoice = oddsEntry?.isMultiChoice;
    const leaderName = truncateLeader(oddsEntry?.leaderName);  // 辞書由来の長い名前も必ず切り詰める

    const stat = voteStats.get(String(event.id)) || { yes: 0, no: 0, total: 0 };
    const n = stat.total;
    const japanProb = n > 0 ? Math.round((stat.yes / n) * 100) : 50;
    const hasConsensus = n >= 3;
    const gap = isPolymarketObserved ? Math.abs(worldProb - japanProb) : null;

    // N-50/N-53: この確率が「何の確率か」は1か所で決める。
    //   outcomeSubject : outcomes[0] が "Yes" でない（例「Pablo Carreno Busta」）＝YESではない
    //   matchedLabel   : 日本語タイトルが問いになっていない場合の対象（例「Arsenal」「↑ $150」）
    //   どちらも無ければ、その数字は素直に YES の確率。
    //
    // ここをブロックの中で個別に計算していたため、og:title だけ直って
    // JSON-LD と静的シェルが「YES」のまま残った（N-53）。
    // 1銘柄につき1回だけ決めて、全ての面がこれを使う。
    const isLeader = Boolean(isPolymarketObserved && isMultiChoice && leaderName);
    const titleIsQuestion = /か[？?]\s*$/.test(titleJa);
    const subject = (!isPolymarketObserved || isLeader) ? null : truncateLeader(
      oddsEntry?.outcomeSubject || (!titleIsQuestion ? oddsEntry?.matchedLabel : null)
    );
    // 確率の主語を各面が同じ言葉で名乗るための共通ラベル
    const probSubjectLabel = isLeader ? `本命 ${leaderName}` : (subject || 'YES');

    // description の出し分け (n>=3 ガード & 世界オッズ実測値準拠 & N-33/N-34 正確な名乗り)
    let description = '';
    let ogTitle = '';

    if (isPolymarketObserved) {
      // 多肢イベントは「誰の確率か」を必ず併記する（N-34/第11回指摘）
      ogTitle = isLeader
        ? `【世界本命 ${leaderName} ${worldProb}%】${titleJa}`
        : subject
          ? `【世界の確率「${subject}」${worldProb}%】${titleJa}`
          : `【世界の確率 ${worldProb}%】${titleJa}`;
      const worldPhrase = isLeader
        ? `世界のリアルマネーは本命 ${leaderName} が ${worldProb}%`
        : subject
          ? `世界のリアルマネーは「${subject}」に ${worldProb}%`
          : `世界のリアルマネーはYES ${worldProb}%`;
      description = hasConsensus
        ? `${worldPhrase}、日本の世論はYES ${japanProb}%（n=${n}）。乖離${gap}ポイント。未来レーダーで比較。`
        : `${worldPhrase}。日本の世論は集計中（n=${n}）。あなたの直感を1秒で投票。`;
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
      // N-53: og:title と同じ主語を名乗る。ここが「YES」のままだと、
      //   機械可読な面だけが嘘をつく（AIクローラが読むのはこちら）。
      variableMeasured.push({ "@type": "PropertyValue", "name": `世界オッズ(${probSubjectLabel})`, "value": worldProb });
    }
    if (hasConsensus) {
      variableMeasured.push(
        { "@type": "PropertyValue", "name": "日本世論(YES)", "value": japanProb },
        { "@type": "PropertyValue", "name": "サンプル数", "value": n }
      );
    }

    // GSC「データセット」要件: description は 50〜5000 文字、license は必須。
    // license は既公表の利用条件（商用・非商用とも無料、事前許諾不要）と整合する CC BY 4.0。
    const jsonLdDescription = isPolymarketObserved
      ? `「${titleJa}」に関する予測データセット。Polymarket（世界最大級の予測市場）のリアルマネー確率と、未来レーダーが収集した日本の無料世論投票（YES/NO形式）の結果を毎日比較・記録しています。`
      : `「${titleJa}」に関する意識調査データセット。未来レーダーが収集した日本の無料世論投票（YES/NO形式）の回答結果を毎日集計・記録しています。世界の予測市場には未上場の日本国内テーマです。`;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Dataset",
      "name": titleJa,
      "description": jsonLdDescription,
      "url": canonicalUrl,
      "license": "https://creativecommons.org/licenses/by/4.0/",
      "isAccessibleForFree": true,
      "dateModified": event.updated_at || new Date().toISOString(),
      "creator": { "@type": "Organization", "name": "未来レーダー", "url": SITE_URL },
      "variableMeasured": variableMeasured
    };

    let html = baseHtml;

    // 1. <title> 置換
    html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(titleJa)} ｜ 未来レーダー</title>`);

    // 2. <meta name="description"> 置換
    html = html.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${escapeHtml(description)}" />`);

    // 3. canonical 置換 (自己参照)
    html = html.replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${canonicalUrl}" />`);

    // 3b. 観測対象外（is_listed=false）は noindex を立てる (Phase 2-A)。
    //     ページは残す：「決着した」とも「存在しない」とも言わないため、404にも既定タイトルにもしない。
    if (event.is_listed === false) {
      html = html.replace('</head>', '  <meta name="robots" content="noindex" />\n</head>');
    }

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
    // N-49: 静的本文と内部リンクを注入（JS実行前のクローラ向け）
    {
      const facts = [];
      if (isPolymarketObserved) {
        facts.push([
          `世界のリアルマネー（${probSubjectLabel}）`,
          `${worldProb}%`,
        ]);
      }
      if (hasConsensus) facts.push(['日本の世論（YES）', `${japanProb}%（n=${n}）`]);
      else facts.push(['日本の世論', `集計中（n=${n}、3票から表示）`]);

      // 同カテゴリの銘柄へリンクし、静的な内部リンクグラフを作る。
      // 絞り込み後はカテゴリ内の掲載が1件だけのことがある（スポーツ枠1件で実際に起きた）。
      // 同カテゴリを優先しつつ、5本に満たない分は他カテゴリの掲載銘柄で補完する
      const otherListed = listedEvents.filter(e => String(e.id) !== String(event.id));
      const sameCat = otherListed.filter(e => !event.category || e.category === event.category);
      const crossCat = otherListed.filter(e => !sameCat.includes(e));
      const siblings = [...sameCat, ...crossCat]
        .slice(0, 5)
        .map(e => [`/market/${e.slug || e.id}`, e.title_ja || e.title_en || String(e.slug || e.id)]);

      if (event.is_listed !== false) {
        mcpSnapshotEvents.push({
          id: String(event.id),
          slug,
          titleJa,
          category: event.category || 'other',
          endDate: event.end_date || null,
          world: isPolymarketObserved
            ? { hasOdds: true, probYes: worldProb, subject: probSubjectLabel }
            : { hasOdds: false, probYes: null, subject: null },
          japan: hasConsensus
            ? { n, probYes: japanProb }
            : { n, probYes: null, note: '集計中（3票未満は確率を出さない）' },
          gapPct: isPolymarketObserved && hasConsensus ? gap : null,
          url: `${SITE_URL}/market/${slug}`,
        });
      }

      // Phase 2-A: 観測対象外の説明はランタイムのバナーだけでなく静的シェルにも置く。
      // JS を実行しない読者・クローラーにも状態が伝わり、noindex の理由が本文で読める
      const delistedNote = event.is_listed === false
        ? '【観測対象外】この銘柄は現在、未来レーダーの定点観測（厳選20銘柄）の対象外です。決着した、という意味ではありません。記録のためページを残しています。 '
        : '';
      html = injectStaticBody(html, staticBody({
        h1: titleJa,
        lead: delistedNote + description,
        currentPath: `/market/${slug}`,
        facts,
        links: siblings,
      }), `銘柄 ${slug}`);
    }

    fs.writeFileSync(path.join(marketBaseDir, `${slug}.html`), html, 'utf-8');
    marketCount++;
  }

  console.log(`✅ 有効銘柄 ${marketCount}件 のプリレンダーHTMLを出力完了 (.html 形式単独 / 307根絶)！`);

  // Phase 2-D: MCP スナップショットの書き出し（Worker が env.ASSETS 経由で読む）
  {
    const dataDir = path.join(DIST_DIR, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'mcp_snapshot.json'), JSON.stringify({
      generatedAt: new Date().toISOString(),
      minVotesForJapan: 3,
      site: SITE_URL,
      events: mcpSnapshotEvents,
    }, null, 2), 'utf-8');
    console.log(`🤖 MCPスナップショット ${mcpSnapshotEvents.length}件（掲載銘柄のみ・実データ）を出力しました`);
  }

  // ==============================================================================
  // A-2. 決着済み・非アクティブ銘柄の自己参照Canonical＆確定アーカイブHTML生成 (N-37: ソフト404完全根絶)
  // ==============================================================================
  const { data: closedEvents } = await supabase
    .from('events')
    .select('*')
    .eq('is_active', false);

  if (closedEvents && closedEvents.length > 0) {
    console.log(`📦 決着済み・非アクティブ銘柄 ${closedEvents.length}件 の確定アーカイブHTMLを生成中 (N-37)...`);
    const marketBaseDir = path.join(DIST_DIR, 'market');
    for (const event of closedEvents) {
      const slug = event.slug || event.id;
      const canonicalUrl = `${SITE_URL}/market/${slug}`;
      const titleJa = event.title_ja || event.title_en || slug;
      const pageTitle = `【決着・終了】${titleJa} ｜ 未来レーダー`;
      const description = `【この予測市場は決着・終了しました】${titleJa}。世界の最終予測結果と日本の世論集計アーカイブ。`;
      const ogImageUrl = `${SITE_URL}/ogp/market/${slug}.png`;

      let html = baseHtml;
      html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);
      html = html.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${escapeHtml(description)}" />`);
      html = html.replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${canonicalUrl}" />`);
      
      // robots noindex, follow を設定し、検索エンジンに重複ペナルティを与えず過去URLのソフト404を根絶
      if (html.includes('<meta name="robots"')) {
        html = html.replace(/<meta name="robots" content=".*?" \/>/i, `<meta name="robots" content="noindex, follow" />`);
      } else {
        html = html.replace(/<head>/i, `<head>\n    <meta name="robots" content="noindex, follow" />`);
      }

      html = html.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${escapeHtml(pageTitle)}" />`);
      html = html.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${escapeHtml(description)}" />`);
      html = html.replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${canonicalUrl}" />`);
      html = html.replace(/<meta property="og:image" content=".*?" \/>/i, `<meta property="og:image" content="${ogImageUrl}" />`);
      html = html.replace(/<meta property="og:image:alt" content=".*?" \/>/i, `<meta property="og:image:alt" content="${escapeHtml(titleJa)}" />`);

      html = html.replace(/<meta name="twitter:url" content=".*?" \/>/i, `<meta name="twitter:url" content="${canonicalUrl}" />`);
      html = html.replace(/<meta name="twitter:title" content=".*?" \/>/i, `<meta name="twitter:title" content="${escapeHtml(pageTitle)}" />`);
      html = html.replace(/<meta name="twitter:description" content=".*?" \/>/i, `<meta name="twitter:description" content="${escapeHtml(description)}" />`);
      html = html.replace(/<meta name="twitter:image" content=".*?" \/>/i, `<meta name="twitter:image" content="${ogImageUrl}" />`);
      html = html.replace(/<meta name="twitter:image:alt" content=".*?" \/>/i, `<meta name="twitter:image:alt" content="${escapeHtml(titleJa)}" />`);

      // JSON-LD
      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "ItemPage",
        "name": pageTitle,
        "description": description,
        "url": canonicalUrl,
        "mainEntity": {
          "@type": "Question",
          "name": event.question_ja || event.title_ja || titleJa,
          "text": `この予測市場は決着・終了しました。`
        }
      };
      const jsonLdScript = `<script type="application/ld+json">\n    ${JSON.stringify(jsonLd, null, 2)}\n    </script>`;
      html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, jsonLdScript);

      // N-49: 決着ページにも静的本文と内部リンクを置く（noindex, follow なので follow 先が要る）
      html = injectStaticBody(html, staticBody({
        h1: `【決着・終了】${titleJa}`,
        lead: description,
        currentPath: `/market/${slug}`,
        links: listedEvents.slice(0, 5).map(e => [`/market/${e.slug || e.id}`, e.title_ja || e.title_en || String(e.slug || e.id)]),
        linksHeading: 'いま予測できる銘柄',
      }), `決着 ${slug}`);

      fs.writeFileSync(path.join(marketBaseDir, `${slug}.html`), html, 'utf-8');
    }
    console.log(`✅ 決着済み銘柄 ${closedEvents.length}件 の確定アーカイブHTMLを出力完了 (.html 形式単独 / ソフト404完全根絶)！`);
  }

  // ==============================================================================
  // A-3. 埋め込みシェルのプリレンダー（P0-6 / D の前提）
  // ------------------------------------------------------------------------------
  // /embed/<slug> は外部サイトの iframe から参照される配布面だが、静的ファイルが無く
  // SPA フォールバックだけで生きていた。フォールバックを切る（本番404の解消と
  // Functions 有効化）と配布済みの埋め込みが全滅するため、全銘柄
  // （有効＋決着アーカイブ）のシェルを静的に出力する。
  // iframe 専用面なので noindex、canonical は銘柄ページへ向ける。
  // アプリは location.pathname の /embed/ を見て EmbedWidgetPage を起動する
  // （拡張子付き直アクセスは Pages が /embed/<slug> へ正規化してから配信する）。
  // ==============================================================================
  {
    const embedDir = path.join(DIST_DIR, 'embed');
    if (!fs.existsSync(embedDir)) fs.mkdirSync(embedDir, { recursive: true });
    const embedTargets = [...events, ...(closedEvents || [])];
    for (const event of embedTargets) {
      const slug = event.slug || event.id;
      const titleJa = event.title_ja || event.title_en || String(slug);
      const pageTitle = `${titleJa} ｜ 未来レーダー 埋め込みウィジェット`;
      const embedLead = `「${titleJa}」の埋め込みウィジェットです。世界の予測市場（Polymarket）のリアルマネー確率と日本の読者投票をリアルタイムで並べて表示します。単体ページではなく、記事やブログへの埋め込み（iframe）でご利用ください。`;

      let html = baseHtml;
      html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);
      html = html.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${escapeHtml(embedLead)}" />`);
      html = html.replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${SITE_URL}/market/${slug}" />`);
      if (html.includes('<meta name="robots"')) {
        html = html.replace(/<meta name="robots" content=".*?" \/>/i, `<meta name="robots" content="noindex" />`);
      } else {
        html = html.replace('</head>', '  <meta name="robots" content="noindex" />\n</head>');
      }

      html = injectStaticBody(html, staticBody({
        h1: titleJa,
        lead: embedLead,
        currentPath: `/embed/${slug}`,
        links: [[`/market/${slug}`, `${titleJa}（銘柄ページ・詳細分析）`]],
        linksHeading: 'この銘柄のページ',
      }), `埋め込みシェル ${slug}`);

      fs.writeFileSync(path.join(embedDir, `${slug}.html`), html, 'utf-8');
    }
    console.log(`🔌 埋め込みシェル ${embedTargets.length}件 を出力しました（/embed/* の静的化・フォールバック非依存）`);
  }

  // ==============================================================================
  // B. 静的ページの自己参照 Canonical ＆ 固有 description プリレンダー (P1-1)
  // ==============================================================================
  let trackRecordFacts = [];
  try {
    const tr = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'data', 'track_record.json'), 'utf-8'));
    trackRecordFacts = [
      ['採点した決着銘柄', `${tr.summary.worldScored}件（${new Date(tr.generatedAt).toISOString().slice(0, 10)} 時点）`],
      ['全体の的中率', `${tr.summary.worldAccuracy}%（${tr.summary.worldHits}/${tr.summary.worldScored}件）`],
      ['スポーツの1試合を除く', `${tr.breakdown.nonSports.accuracy}%（${tr.breakdown.nonSports.hits}/${tr.breakdown.nonSports.n}件）`],
      ['24時間前にほぼ確定していた分を除く', `${tr.breakdown.excludingDegenerate.accuracy}%（${tr.breakdown.excludingDegenerate.hits}/${tr.breakdown.excludingDegenerate.n}件）`],
    ];
  } catch {}

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
    },
    {
      // Phase 2 / B: 的中トラックレコード。実数は track_record.json から静的本文に載せる
      dir: 'track-record',
      h1: '的中トラックレコード',
      title: '的中トラックレコード ｜ 未来レーダー',
      description: '世界の予測市場は本当に当たるのか。決着済み全銘柄の「24時間前の予測」と実際の結果を全量公開。削除も選別もしない的中トラックレコード。',
      canonical: `${SITE_URL}/track-record`,
      facts: trackRecordFacts,
    },
    {
      dir: 'about',
      title: '未来レーダーについて ｜ 世界の集合知 × 日本の世論インテリジェンス・メディア',
      description: '世界の集合知（Polymarket）と日本の世論を対比し未来を可視化する非胴元型インテリジェンス・メディア。気象台モデル、3大上場基準、WebMCP連携を宣言。',
      canonical: `${SITE_URL}/about`,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        "name": "未来レーダーについて",
        "description": "世界の集合知（Polymarket）と日本の世論を対比し未来を可視化する非胴元型インテリジェンス・メディア",
        "url": `${SITE_URL}/about`,
        "mainEntity": {
          "@type": "Organization",
          "name": "未来レーダー",
          "url": SITE_URL,
          "logo": `${SITE_URL}/ogp-main.png`,
          "founder": {
            "@type": "Person",
            "name": "霧島フェニックス",
            "alternateName": "Phoenix Kirishima"
          }
        }
      }
    },
    {
      // 個人ページ。索引はしないが、404.html を置くとソフト404ではなく本物の404に
      // なるため、実在するルートはプリレンダーしておく必要がある（第12回 N-47）
      dir: 'profile',
      title: 'マイ予報プロファイル ｜ 未来レーダー',
      description: 'あなたの未来予報の的中率・連続ストリーク・投票ポートフォリオ。未来レーダーのサイバー予報士プロファイル。',
      canonical: `${SITE_URL}/profile`,
      noindex: true
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

    if (page.jsonLd) {
      const jsonLdScript = `<script type="application/ld+json">\n    ${JSON.stringify(page.jsonLd, null, 2)}\n    </script>`;
      html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, jsonLdScript);
    }

    // 旧ディレクトリ形式が存在していれば削除
    const oldPageDir = path.join(DIST_DIR, page.dir);
    if (fs.existsSync(oldPageDir) && fs.lstatSync(oldPageDir).isDirectory()) {
      fs.rmSync(oldPageDir, { recursive: true, force: true });
    }

    if (page.noindex && !/name="robots"/.test(html)) {
      html = html.replace('</head>', '  <meta name="robots" content="noindex, follow" />\n</head>');
    }

    // N-49: 固定ページにも静的本文と内部リンクを置く
    html = injectStaticBody(html, staticBody({
      h1: page.h1 || page.title,
      lead: page.description,
      currentPath: `/${page.dir}`,
      facts: page.facts || [],
      links: listedEvents.slice(0, 5).map(e => [`/market/${e.slug || e.id}`, e.title_ja || e.title_en || String(e.slug || e.id)]),
      linksHeading: '注目の銘柄',
    }), `固定ページ ${page.dir}`);

    // 直接 .html 形式
    fs.writeFileSync(path.join(DIST_DIR, `${page.dir}.html`), html, 'utf-8');
  }

  // ==============================================================================
  // A-4. トップページ（N-49）
  // ------------------------------------------------------------------------------
  // dist/index.html は Vite の出力のままで、プリレンダーの対象外だった。
  // baseHtml として読まれるだけで、本文は <div id="root"></div> の空のまま。
  // サイトで最も重要なページが、JSを実行しないクローラには白紙で届いていた。
  // ==============================================================================
  {
    const topPath = path.join(DIST_DIR, 'index.html');
    let topHtml = fs.readFileSync(topPath, 'utf-8');
    const topLinks = listedEvents.slice(0, 12).map(e => [
      `/market/${e.slug || e.id}`,
      e.title_ja || e.title_en || String(e.slug || e.id),
    ]);
    topHtml = injectStaticBody(topHtml, staticBody({
      h1: '未来レーダー ｜ 世界の集合知 × 日本の世論',
      lead: 'Polymarketのリアルマネー確率と、日本の生活者による無料投票を並べて見せています。世界がいくら賭けているかと、日本人がどう思っているかは、しばしば食い違います。',
      currentPath: '/',
      links: topLinks,
      linksHeading: 'いま予測できる銘柄',
    }), 'トップページ');
    fs.writeFileSync(topPath, topHtml, 'utf-8');
    console.log(`🏠 トップページに静的本文と内部リンク ${topLinks.length + SITE_NAV.length - 1}本を注入しました (N-49)`);
  }

  // ==============================================================================
  // B-1. 公開バンドルに service_role キーが混入していないか (N-48)
  // ==============================================================================
  // Vite は import.meta.env.VITE_* をビルド時に文字列として埋め込む。
  // VITE_SUPABASE_SERVICE_ROLE_KEY が定義されていると、全権キーが公開JSに載る。
  // 実測：ローカルビルドの dist に service_role の JWT が1件混入していた（本番は無事）。
  // 二度と出荷されないよう、ここで止める。
  {
    const assetsDir = path.join(DIST_DIR, 'assets');
    const leaked = [];
    if (fs.existsSync(assetsDir)) {
      for (const f of fs.readdirSync(assetsDir).filter(x => x.endsWith('.js'))) {
        const body = fs.readFileSync(path.join(assetsDir, f), 'utf-8');
        for (const m of body.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g)) {
          try {
            const claims = JSON.parse(Buffer.from(m[0].split('.')[1], 'base64').toString());
            if (claims.role && claims.role !== 'anon') leaked.push(`${f} (role=${claims.role})`);
          } catch {}
        }
      }
    }
    if (leaked.length > 0) {
      throw new Error(
        `❌ [CRITICAL] 公開バンドルに anon 以外の Supabase キーが含まれています: ${[...new Set(leaked)].join(', ')}\n` +
        `   .env の VITE_SUPABASE_SERVICE_ROLE_KEY を削除してください（VITE_ 接頭辞はバンドルに埋め込まれます）。\n` +
        `   管理者コンソールの鍵は localStorage('mirairadar_admin_key') から実行時に読みます。`
      );
    }
    console.log('🔐 公開バンドルの鍵検査：anon 以外のキーは含まれていません');
  }

  // ==============================================================================
  // B-2. 404.html（ソフト404の解消 / N-47）
  // ==============================================================================
  // Cloudflare Pages は 404.html があれば、未知のパスにそれを 404 で返す。
  // 無いと index.html を 200 で返し、存在しないURLがすべてトップの複製になる
  // （Search Console にソフト404が計上され、Phase 0 で解いた「全ページがトップの複製」
  //   と同じ状態が未知URLで再発する）。
  // 中身は SPA シェルのコピーにして、人はページが描画され、クローラは 404 を受け取る形にする。
  {
    let notFound = baseHtml;
    notFound = notFound.replace(/<title>.*?<\/title>/i, '<title>ページが見つかりません ｜ 未来レーダー</title>');
    notFound = notFound.replace(/<meta name="description" content=".*?" \/>/i, '<meta name="description" content="お探しのページは見つかりませんでした。未来レーダーのトップから観測銘柄をご覧ください。" />');
    if (!/name="robots"/.test(notFound)) {
      notFound = notFound.replace('</head>', '  <meta name="robots" content="noindex, follow" />\n</head>');
    }
    // N-49: JSが動かなくても出口があるようにする
    notFound = injectStaticBody(notFound, staticBody({
      h1: 'ページが見つかりません',
      lead: 'お探しのページは見つかりませんでした。以下から探し直せます。',
      currentPath: '/404',
      links: listedEvents.slice(0, 5).map(e => [`/market/${e.slug || e.id}`, e.title_ja || e.title_en || String(e.slug || e.id)]),
      linksHeading: 'いま予測できる銘柄',
    }), '404ページ');

    fs.writeFileSync(path.join(DIST_DIR, '404.html'), notFound, 'utf-8');
    console.log('🚧 404.html を生成しました（ソフト404の解消 ＋ 静的な出口リンク）');
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
      canonical: `${SITE_URL}/guide/polymarket-japan`,
      // 関連銘柄は記事ソース（src/content/guides/*.ts）を唯一の正とする。
      // ここに二重で持つと、記事側を直してもプリレンダーに届かない（第12回 N-43）
      sourceFile: 'src/content/guides/polymarketJapan.ts'
    }
  ];

  // 記事ソースから relatedMarketSlugs を取り出す
  const readRelatedSlugs = (sourceFile) => {
    const abs = path.join(ROOT, sourceFile);
    if (!fs.existsSync(abs)) return [];
    const src = fs.readFileSync(abs, 'utf-8');
    const m = src.match(/relatedMarketSlugs:\s*\[([\s\S]*?)\]/);
    if (!m) return [];
    return [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map(x => x[1]);
  };

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

    // 記事側のプロパティ名は relatedMarketSlugs。relatedSlugs で読んでいたため常に
    // 未定義となり、実在しない slug を含むハードコード配列が使われていた（第12回 N-43）
    const relatedSlugs = readRelatedSlugs(guide.sourceFile);
    // 死んだリンクを黙って出さない：有効銘柄に無い slug があればビルドを止める
    const activeSlugSet = new Set(events.map(e => String(e.slug || e.id)));
    const deadSlugs = relatedSlugs.filter(sl => !activeSlugSet.has(sl));
    if (relatedSlugs.length === 0) {
      throw new Error(`❌ [CRITICAL] 記事 [${guide.slug}] の relatedMarketSlugs が空です。内部リンクが生成できません。`);
    }
    if (deadSlugs.length > 0) {
      throw new Error(`❌ [CRITICAL] 記事 [${guide.slug}] が有効銘柄に存在しない slug へリンクしています: ${deadSlugs.join(', ')}`);
    }
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
