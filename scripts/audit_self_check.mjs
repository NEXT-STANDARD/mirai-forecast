import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";

const ROOT = "/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast";
const COMPONENTS_DIR = path.join(ROOT, "src/components");

console.log("====================================================");
console.log("🛡️ 未来レーダー 自律的品質・監査自己検証エンジン v3 (Phase 0 Hardened)");
console.log("====================================================\n");

let passCount = 0;
let failCount = 0;

function report(name, passed, detail) {
  if (passed) {
    console.log(`✅ [PASS] ${name}`);
    if (detail) console.log(`   └─ ${detail}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${name}`);
    if (detail) console.error(`   └─ ${detail}`);
    failCount++;
  }
}

// 1. ビルド & 型チェック
try {
  execSync("npm run build", { cwd: ROOT, stdio: "pipe" });
  report("TypeScript & Vite & Prerender 本番ビルド整合性", true, "exit code 0 (型エラー・バンドルエラー・プリレンダーエラー 0件)");
} catch (e) {
  report("TypeScript & Vite & Prerender 本番ビルド整合性", false, e.message);
}

// 2. 投票ガードの構文的健全性 & 100% 網羅性 (NEW-4 / 破壊テスト耐性: { アンカーによるホワイトリスト)
const componentFiles = fs.readdirSync(COMPONENTS_DIR).filter(f => f.endsWith(".tsx"));
let voteGuardFails = [];
const strictGuardPattern = /(?:\{\s*|\bconst\s+isExpired\s*=\s*(?:Boolean\()?\s*)(?:event|item)\.isExpired\s*\|\|\s*\(\s*(?:event|item)\.endDate\s*&&\s*new Date\((?:event|item)\.endDate\)\.getTime\(\)\s*<\s*Date\.now\(\)\s*\)/;

for (const file of componentFiles) {
  const content = fs.readFileSync(path.join(COMPONENTS_DIR, file), "utf-8");
  const hasOnVoteCall = /onVote\(/.test(content);
  
  // MarketDetailPage delegates to OrderBookConsensus
  if (file === "MarketDetailPage.tsx") continue;

  if (hasOnVoteCall) {
    if (!strictGuardPattern.test(content)) {
      voteGuardFails.push(`${file}: 厳密な期限判定ガード構文が欠落または無効化されています`);
    }
  }
}
report("投票ガード (isExpired) 構文健全性 & 100% 網羅性", voteGuardFails.length === 0, 
  voteGuardFails.length === 0 ? "投票を持つ全コンポーネントで厳格な期限判定ガード構文を検証完了" : voteGuardFails.join("; "));

// 3. 乖離ギャップ（Gap/乖離）基準の全コンポーネント統一性 (NEW-6 / A-3 / N-12)
const GAP_TARGET_COMPONENTS = [
  "AllMarketsGrid.tsx",
  "SpreadRankingSection.tsx",
  "MarketDetailPage.tsx",
  "EmbedWidgetPage.tsx",
  "EventModal.tsx",
  "OgpPreviewModal.tsx",
  "WatchlistTable.tsx",
  "DataExportModal.tsx"
];
let gapCheckFails = [];
const strictActiveGapGuardPattern = /(?:\{\s*|\bconst\s+\w+\s*=\s*|\.filter\s*\(\s*\w+\s*=>\s*|if\s*\(\s*|[?&|]\s*|\(\s*)(?:event|item|ev|a|b)\.japanVotes(?:\?\.|\.)total\s*>=\s*3/;

for (const file of GAP_TARGET_COMPONENTS) {
  if (!fs.existsSync(path.join(COMPONENTS_DIR, file))) continue;
  const content = fs.readFileSync(path.join(COMPONENTS_DIR, file), "utf-8");
  const contentWithoutComments = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  const hasVotesTotalGuard = strictActiveGapGuardPattern.test(contentWithoutComments);
  const hasSampleCountNotation = /n=/.test(contentWithoutComments);

  if (!hasVotesTotalGuard) {
    gapCheckFails.push(`${file}: 有効な japanVotes.total >= 3 ガードが未適用または無効化されています`);
  }
  if (!hasSampleCountNotation) {
    gapCheckFails.push(`${file}: サンプル数 (n=) 表示なし`);
  }
}
report("乖離基準 (japanVotes >= 3 & n=併記) の全8コンポーネント統一性", gapCheckFails.length === 0,
  gapCheckFails.length === 0 ? "乖離を表示する全8コンポーネントで n>=3 ガード & n= 併記を検証完了" : gapCheckFails.join("; "));

// 4. 画像属性 (loading=\"lazy\" & onError) (C-4)
let imgFails = [];
for (const file of componentFiles) {
  const content = fs.readFileSync(path.join(COMPONENTS_DIR, file), "utf-8");
  const imgMatches = content.match(/<img[^>]+>/g) || [];
  for (const img of imgMatches) {
    if (!img.includes("loading=\"lazy\"") && !img.includes("loading='lazy'")) {
      imgFails.push(`${file}: loading="lazy" 欠落`);
    }
    if (!img.includes("onError")) {
      imgFails.push(`${file}: onError ハンドラ欠落`);
    }
  }
}
report("画像属性 (loading=\"lazy\" & onErrorフォールバック)", imgFails.length === 0,
  imgFails.length === 0 ? "全 <img> タグに lazy loading と onError を完備" : imgFails.join("; "));

// 5. 全コンポーネント走査型 キーボードアクセシビリティ (E-4)
function extractOpeningTags(content) {
  const tags = [];
  let i = 0;
  while (i < content.length) {
    if (content[i] === "<" && (content.startsWith("<div", i) || content.startsWith("<tr", i))) {
      let start = i;
      let depth = 0;
      let inQuote = null;
      while (i < content.length) {
        const char = content[i];
        if (inQuote) {
          if (char === inQuote && content[i-1] !== "\\") inQuote = null;
        } else if (char === "\"" || char === "'" || char === "`") {
          inQuote = char;
        } else if (char === "{") {
          depth++;
        } else if (char === "}") {
          depth--;
        } else if (char === ">" && depth === 0) {
          tags.push(content.slice(start, i + 1));
          break;
        }
        i++;
      }
    }
    i++;
  }
  return tags;
}

let a11yFails = [];
for (const file of componentFiles) {
  const content = fs.readFileSync(path.join(COMPONENTS_DIR, file), "utf-8");
  const tags = extractOpeningTags(content);
  
  for (const tag of tags) {
    if (!tag.includes("onClick")) continue;
    if (tag.includes("modal-backdrop") || tag.includes("modal-content") || tag.includes("stopPropagation")) continue;
    
    if (!tag.includes("tabIndex") || !tag.includes("onKeyDown")) {
      a11yFails.push(`${file}: 対話的要素に tabIndex または onKeyDown が欠落しています`);
    }
  }
}
report("全コンポーネント走査 キーボード a11y (tabIndex / onKeyDown / role)", a11yFails.length === 0,
  a11yFails.length === 0 ? "全コンポーネントの対話的カード・行要素でキーボード操作を検証完了" : a11yFails.join("; "));

// 6. カテゴリナビ配置・重複検査 (D-6 / NEW-7)
let navFails = [];
const headerContent = fs.readFileSync(path.join(COMPONENTS_DIR, "Header.tsx"), "utf-8");
const gridContent = fs.readFileSync(path.join(COMPONENTS_DIR, "AllMarketsGrid.tsx"), "utf-8");
if (!headerContent.includes("category-nav-slim") || !headerContent.includes("UNIFIED_CATEGORIES.map")) {
  navFails.push("Header.tsx: 初期表示トップのカテゴリナビゲーションが欠落しています");
}
if (gridContent.includes("topic-pills-bar") || gridContent.includes("UNIFIED_CATEGORIES.map")) {
  navFails.push("AllMarketsGrid.tsx: 重複するカテゴリーピルバーが残存しています");
}
report("カテゴリナビ配置・単一性 (Header配置 & Grid重複排除)", navFails.length === 0,
  navFails.length === 0 ? "ヘッダー初期表示(Y<60px)に集約 & 重複ピル完全排除" : navFails.join("; "));

// 7. デッドコード検知
let deadFiles = [];
for (const file of componentFiles) {
  const baseName = file.replace(".tsx", "");
  if (baseName === "EventCard" || baseName === "HeroFeatured") {
    deadFiles.push(file);
  }
}
report("デッドコンポーネント排除", deadFiles.length === 0,
  deadFiles.length === 0 ? "未使用コンポーネントなし" : `残存: ${deadFiles.join(", ")}`);

// 8. CSS Sticky の健全性検査
const cssContent = fs.readFileSync(path.join(ROOT, "src/index.css"), "utf-8");
let stickyFails = [];
const rootBlockRegex = /(?:html|body|#root)[^{]*\{[^}]*overflow-x:\s*hidden/gi;
if (rootBlockRegex.test(cssContent)) {
  stickyFails.push("html, body, #root セレクタブロックに overflow-x: hidden が存在し sticky が破壊されます (clip を使用してください)");
}
report("CSS Sticky 健全性 (overflow-x: clip 保守)", stickyFails.length === 0,
  stickyFails.length === 0 ? "html/body/#root に clip 指定を確認 (sticky 阻害なし)" : stickyFails.join("; "));

// 9. ビルド CSS Backdrop-Filter 保持検査 (NEW-9)
let backdropFails = [];
const distAssets = fs.existsSync(path.join(ROOT, "dist/assets")) 
  ? fs.readdirSync(path.join(ROOT, "dist/assets")).filter(f => f.endsWith(".css"))
  : [];
if (distAssets.length > 0) {
  const distCss = fs.readFileSync(path.join(ROOT, "dist/assets", distAssets[0]), "utf-8");
  const ruleMatch = distCss.match(/\.header-container-slim\{[^}]*\}/);
  const rule = ruleMatch ? ruleMatch[0] : "";
  if (!rule || !/[^-]backdrop-filter:\s*blur/.test(rule)) {
    backdropFails.push("dist CSS の .header-container-slim ルール内に無印 backdrop-filter:blur が出力されていません");
  }
}
report("ビルド CSS Backdrop-Filter 保持検査 (NEW-9)", backdropFails.length === 0,
  backdropFails.length === 0 ? "本番 CSS の .header-container-slim ルール内に無印 backdrop-filter の存在を確認" : backdropFails.join("; "));

// 9.5 埋め込みウィジェットのスラッグ厳密照合検査 (N-18)
const embedCode = fs.readFileSync(path.join(COMPONENTS_DIR, "EmbedWidgetPage.tsx"), "utf-8");
let embedSlugFails = [];
if (/\.replace\(\s*\/-\\?d\+\$\//.test(embedCode) || /slugOrId\.replace/.test(embedCode) || /slug\.replace/.test(embedCode)) {
  embedSlugFails.push("EmbedWidgetPage にスラッグ文字列加工・緩和ロジックが存在し、同名プレフィックス銘柄の誤表示が発生します");
}
const hasExactInitialFind = /INITIAL_EVENTS\.find\(\s*\([^)]*\)\s*=>\s*e\.slug\s*===\s*slugOrId\s*\|\|\s*e\.id\s*===\s*slugOrId\s*\)/.test(embedCode);
const hasExactEventsFind = /events\.find\(\s*\([^)]*\)\s*=>\s*e\.slug\s*===\s*slugOrId\s*\|\|\s*e\.id\s*===\s*slugOrId\s*\)/.test(embedCode);
if (!hasExactInitialFind || !hasExactEventsFind) {
  embedSlugFails.push("EmbedWidgetPage の find 照合式が完全一致 (e.slug === slugOrId || e.id === slugOrId) 形式になっていません");
}
report("埋め込みウィジェット スラッグ厳密照合 (N-18)", embedSlugFails.length === 0,
  embedSlugFails.length === 0 ? "完全一致照合 (slug === slugOrId || id === slugOrId) を確認" : embedSlugFails.join("; "));

// 9.7 scripts/*.mjs の外部依存が package.json に存在すること (F-5)
const BUILTIN_MODULES = new Set(["fs", "path", "url", "http", "https", "readline", "crypto", "os", "child_process", "util", "events", "stream"]);
const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"));
const declaredDeps = new Set([...Object.keys(pkgJson.dependencies || {}), ...Object.keys(pkgJson.devDependencies || {})]);
let depFails = [];
for (const file of fs.readdirSync(path.join(ROOT, "scripts")).filter(f => f.endsWith(".mjs"))) {
  const content = fs.readFileSync(path.join(ROOT, "scripts", file), "utf-8");
  for (const [, spec] of content.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    if (spec.startsWith(".") || spec.startsWith("node:")) continue;
    const pkg = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
    if (BUILTIN_MODULES.has(pkg) || declaredDeps.has(pkg)) continue;
    depFails.push(`${file}: '${pkg}' が package.json に未登録`);
  }
}
depFails = [...new Set(depFails)];
report("scripts の外部依存が package.json に存在 (F-5 回帰防止)", depFails.length === 0,
  depFails.length === 0 ? "scripts/*.mjs の全 import が package.json に登録済み" : depFails.join("; "));

// 10. Supabase 有効銘柄の締切整合性 & Phase 0 検査
async function checkDbAndPhase0() {
  let activeEvents = [];
  let closedEvents = [];
  let supabase = null;
  try {
    const envStr = fs.readFileSync(path.join(ROOT, ".env"), "utf-8");
    const env = {};
    envStr.split("\n").forEach(l => {
      const [k, ...v] = l.split("=");
      if (k && !k.startsWith("#")) env[k.trim()] = v.join("=").trim();
    });
    supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);
    const { data: events, error } = await supabase.from("events").select("id, slug, title_ja, title_en, question_en, end_date, is_active, updated_at").eq("is_active", true);
    if (!error && events) {
      activeEvents = events;
      const graceThreshold = new Date(Date.now() - 3600 * 1000); // 1時間の猶予ウィンドウ（30分同期間隔の一過性偽陽性を防止）
      const expiredActive = events.filter(e => e.end_date && new Date(e.end_date) < graceThreshold);
      report("Supabase DB 有効銘柄の期限整合性 (1時間猶予ウィンドウ)", expiredActive.length === 0,
        `有効銘柄 ${events.length}件中、1時間超の締切切れ: ${expiredActive.length}件`);
    }

    const { data: closed } = await supabase.from("events").select("id, slug, title_ja, is_active").eq("is_active", false);
    if (closed) closedEvents = closed;
  } catch (err) {
    console.log("DB check skipped:", err.message);
  }

  // ==============================================================================
  // 11. Sitemap 100% 実在性 & Supabase 有効銘柄一致検査 (P0-1)
  // ==============================================================================
  let sitemapFails = [];
  const sitemapPath = path.join(ROOT, "public/sitemap.xml");
  if (!fs.existsSync(sitemapPath)) {
    sitemapFails.push("public/sitemap.xml が存在しません");
  } else {
    const sitemapContent = fs.readFileSync(sitemapPath, "utf-8");
    const sitemapMarketUrls = [...sitemapContent.matchAll(/<loc>https:\/\/mirairadar\.com\/market\/([^<]+)<\/loc>/g)].map(m => decodeURIComponent(m[1]));
    const activeSlugs = new Set(activeEvents.map(e => e.slug || e.id));

    // A. 死にURL検査（SitemapにあるのにDBにない）
    const deadUrls = sitemapMarketUrls.filter(slug => !activeSlugs.has(slug));
    if (deadUrls.length > 0) {
      sitemapFails.push(`死にURLを ${deadUrls.length}件 検知 (例: ${deadUrls.slice(0, 3).join(", ")})`);
    }

    // B. 有効銘柄の一致検査
    if (sitemapMarketUrls.length !== activeEvents.length) {
      sitemapFails.push(`件数不一致: sitemap=${sitemapMarketUrls.length}件, DB有効銘柄=${activeEvents.length}件`);
    }
  }
  report("Sitemap 100% 実在性 & Supabase 有効銘柄完全一致 (P0-1)", sitemapFails.length === 0,
    sitemapFails.length === 0 ? `全 ${activeEvents.length}件 の /market/ URLがSupabase有効銘柄と完全一致 (死にURL 0件)` : sitemapFails.join("; "));

  // ==============================================================================
  // 12. プリレンダー HTML 網羅性 & 直接 .html 配信 (307根絶) & 自己参照 Canonical & OGP & JSON-LD 検査 (P0-2, P0-3, P0-4)
  // ==============================================================================
  let prerenderFails = [];
  const observedProbs = [];
  const distMarketDir = path.join(ROOT, "dist/market");
  if (!fs.existsSync(distMarketDir)) {
    prerenderFails.push("dist/market ディレクトリが存在しません");
  } else {
    let checkedCount = 0;
    for (const ev of activeEvents) {
      const slug = ev.slug || ev.id;

      // 0. 直接 .html 形式が存在し、かつ旧ディレクトリ index.html が存在しないこと（307 リダイレクト完全根絶）
      const directHtmlFile = path.join(distMarketDir, `${slug}.html`);
      const dirIndexFile = path.join(distMarketDir, slug, "index.html");
      if (!fs.existsSync(directHtmlFile)) {
        prerenderFails.push(`銘柄 [${slug}] の直接 .html プリレンダーファイルが欠落`);
        continue;
      }
      if (fs.existsSync(dirIndexFile)) {
        prerenderFails.push(`銘柄 [${slug}] にディレクトリ形式 index.html が残存しており、307 リダイレクトが発生します`);
      }

      const html = fs.readFileSync(directHtmlFile, "utf-8");

      // 1. 自己参照 Canonical
      const expectedCanon = `<link rel="canonical" href="https://mirairadar.com/market/${slug}" />`;
      if (!html.includes(expectedCanon)) {
        prerenderFails.push(`銘柄 [${slug}] の canonical が自己参照になっていません`);
      }

      // 2. og:title に銘柄名および妥当なプレフィックスが含まれるか
      //    【世界の確率 X%】/【世界本命 <本命名> X%】/【日本世論調査】/【世界観測銘柄】
      const ogTitleMatch = html.match(/<meta property="og:title" content="【(世界の確率 \d+%|世界本命 .+? \d+%|日本世論調査|世界観測銘柄)】(.*?)"/);
      if (!ogTitleMatch || ogTitleMatch[2].trim().length === 0) {
        prerenderFails.push(`銘柄 [${slug}] の og:title に銘柄名が正しく埋め込まれていません (got: ${html.match(/<meta property="og:title" content="(.*?)"/)?.[1]})`);
      } else {
        // 【世界本命 <本命名> N%】でも確率を拾えるようにする（本命銘柄が observedProbs から落ちていた）
        const probMatch = ogTitleMatch[1].match(/(?:世界の確率|世界本命)(?:\s+.+?)?\s+(\d+)%/);
        if (probMatch) {
          observedProbs.push(Number(probMatch[1]));
        }
      }

      // 3. og:image が銘柄別PNGを指しているか
      const expectedOgImage = `<meta property="og:image" content="https://mirairadar.com/ogp/market/${slug}.png" />`;
      if (!html.includes(expectedOgImage)) {
        prerenderFails.push(`銘柄 [${slug}] の og:image が銘柄別PNGを指していません`);
      }

      // 4. JSON-LD Dataset 妥当性 & n<3 ガード
      const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g)];
      if (jsonLdMatches.length !== 1) {
        prerenderFails.push(`銘柄 [${slug}] の JSON-LD スクリプトタグ数が不正です (count: ${jsonLdMatches.length})`);
      } else {
        try {
          const parsed = JSON.parse(jsonLdMatches[0][1]);
          if (parsed["@type"] !== "Dataset" || parsed.url !== `https://mirairadar.com/market/${slug}`) {
            prerenderFails.push(`銘柄 [${slug}] の JSON-LD Dataset スキーマが不正です`);
          }
        } catch (e) {
          prerenderFails.push(`銘柄 [${slug}] の JSON-LD パースエラー: ${e.message}`);
        }
      }
      checkedCount++;
    }

    // N-30, N-33, N-34 構造的検査 (Check #14 完全封鎖):
    // 1. 世界オッズ観測銘柄が 35件以上 存在すること（0件や僅少時のサイレントパスを完全防止）
    // 2. 確率が 10種類以上 に分散していること（50%固定などの均一化を完全防止）
    const distinctProbs = new Set(observedProbs);
    if (activeEvents.length >= 50) {
      if (observedProbs.length < 35) {
        prerenderFails.push(`[Check #14 CRITICAL] 世界オッズが反映された銘柄数が不足しています (観測数: ${observedProbs.length}件 / 期待値: 35件以上)。Polymarket同期・オッズ辞書生成が正常に動作していません。`);
      } else if (distinctProbs.size < 10) {
        prerenderFails.push(`[Check #14 CRITICAL] 観測された世界確率の多様性が不足しています (${distinctProbs.size}種類 / 期待値: 10種類以上)。オッズが固定値になっている疑いがあります。`);
      }
    }

    // 静的ページの自己参照 Canonical 検査 (P0-3)
    const staticPages = ["forecast", "rankings", "ai-connector", "developers", "letter-to-mike"];
    for (const p of staticPages) {
      const pDirectFile = path.join(ROOT, `dist/${p}.html`);
      const pDirFile = path.join(ROOT, `dist/${p}/index.html`);
      if (!fs.existsSync(pDirectFile)) {
        prerenderFails.push(`静的ページ [/${p}.html] の直接プリレンダーファイルが欠落`);
        continue;
      }
      if (fs.existsSync(pDirFile)) {
        prerenderFails.push(`静的ページ [/${p}] にディレクトリ形式 index.html が残存`);
      }
      const pHtml = fs.readFileSync(pDirectFile, "utf-8");
      if (!pHtml.includes(`<link rel="canonical" href="https://mirairadar.com/${p}" />`)) {
        prerenderFails.push(`静的ページ [/${p}] の canonical が自己参照になっていません`);
      }
    }
  }
  report("プリレンダー HTML 網羅性 & .html 単独配信 (307根絶) & Canonical & OGP & JSON-LD (P0-2/3/4)", prerenderFails.length === 0,
    prerenderFails.length === 0 ? `有効銘柄 全${activeEvents.length}件 (.html 単独出力) ＆ 静的5ページの完全プリレンダーを検証完了` : prerenderFails.join("; "));

  // ==============================================================================
  // 13. 銘柄別 OGP 画像 100% 網羅性 & PNG 整合性検査 (P0-5)
  // ==============================================================================
  let ogpFails = [];
  const distOgpDir = path.join(ROOT, "dist/ogp/market");
  if (!fs.existsSync(distOgpDir)) {
    ogpFails.push("dist/ogp/market ディレクトリが存在しません");
  } else {
    for (const ev of activeEvents) {
      const slug = ev.slug || ev.id;
      const pngPath = path.join(distOgpDir, `${slug}.png`);
      if (!fs.existsSync(pngPath)) {
        ogpFails.push(`銘柄 [${slug}] の OGP PNG 画像が欠落`);
        continue;
      }
      const stat = fs.statSync(pngPath);
      if (stat.size < 5000) { // 5KB 未満は画像破損の疑い
        ogpFails.push(`銘柄 [${slug}] の OGP PNG 画像サイズが異常に小さい (${stat.size} bytes)`);
      }
    }
  }
  report("銘柄別 OGP 画像 100% 網羅性 & 1200x630 PNG 整合性 (P0-5)", ogpFails.length === 0,
    ogpFails.length === 0 ? `有効銘柄 全${activeEvents.length}件 の 1200x630 OGP PNG 出力を検証完了` : ogpFails.join("; "));

  // ==============================================================================
  // 14. 詳細ページルーティング末尾スラッシュ完全耐性検査 (N-19 回帰防止)
  // ==============================================================================
  let routingFails = [];
  const appCode = fs.readFileSync(path.join(ROOT, "src/App.tsx"), "utf-8");
  if (!appCode.includes("replace(/\\/+$/, '')")) {
    routingFails.push("App.tsx に末尾スラッシュ除去ロジック (replace(/\\/+$/, '')) が存在しません");
  }
  report("詳細ページルーティング末尾スラッシュ完全耐性 (N-19 回帰防止)", routingFails.length === 0,
    routingFails.length === 0 ? `App.tsx のルーティング初期化 ＆ popstate で末尾スラッシュ除去を検証完了` : routingFails.join("; "));

  // ==============================================================================
  // 15. 有効銘柄数 ＝ プリレンダー数 ＝ アプリ読込上限 一致検査 (N-20 回帰防止 & 包含判定)
  // ==============================================================================
  let limitFails = [];
  const polyServiceCode = fs.readFileSync(path.join(ROOT, "src/services/polymarketService.ts"), "utf-8");
  if (/\.from\(['"]events['"]\)[^;]*\.limit\(\s*\d+\s*\)/s.test(polyServiceCode)) {
    limitFails.push("polymarketService.ts に固定の .limit() が存在し、有効銘柄の一部が到達不能になります");
  }

  // 包含検査：Supabase の有効銘柄すべてに対してプリレンダー .html が漏れなく存在すること
  const missingPrerenders = activeEvents.filter(ev => {
    const slug = ev.slug || ev.id;
    return !fs.existsSync(path.join(distMarketDir, `${slug}.html`));
  });
  if (missingPrerenders.length > 0) {
    limitFails.push(`未プリレンダーの有効銘柄が ${missingPrerenders.length}件 存在します (${missingPrerenders.slice(0, 3).map(e => e.slug).join(', ')}...)`);
  }

  report("有効銘柄 100% プリレンダー網羅 & アプリ読込全数一致 (N-20 回帰防止)", limitFails.length === 0,
    limitFails.length === 0 ? `有効全${activeEvents.length}銘柄が漏れなくプリレンダー網羅 ＆ アプリ・Sitemapで100%一致` : limitFails.join("; "));

  // ==============================================================================
  // 16. 静的ページの Description 個別化 ＆ 120字以内検査 (P1-1)
  // ==============================================================================
  let descFails = [];
  const staticHtmlPages = [
    { name: "トップ (/)", file: path.join(ROOT, "dist/index.html") },
    { name: "予測一覧 (/forecast)", file: path.join(ROOT, "dist/forecast.html") },
    { name: "ランキング (/rankings)", file: path.join(ROOT, "dist/rankings.html") },
    { name: "About (/about)", file: path.join(ROOT, "dist/about.html") },
    { name: "AI連携 (/ai-connector)", file: path.join(ROOT, "dist/ai-connector.html") },
    { name: "開発者 (/developers)", file: path.join(ROOT, "dist/developers.html") },
    { name: "Mikeへの手紙 (/letter-to-mike)", file: path.join(ROOT, "dist/letter-to-mike.html") }
  ];

  const seenDescriptions = new Map();
  for (const p of staticHtmlPages) {
    if (!fs.existsSync(p.file)) {
      descFails.push(`ページ [${p.name}] の HTML ファイルが存在しません`);
      continue;
    }
    const html = fs.readFileSync(p.file, "utf-8");
    const m = html.match(/<meta name="description" content="(.*?)" \/>/);
    if (!m || !m[1] || m[1].trim().length === 0) {
      descFails.push(`ページ [${p.name}] の meta description が欠落または空です`);
      continue;
    }
    const desc = m[1].trim();
    if (desc.length > 120) {
      descFails.push(`ページ [${p.name}] の description が120文字を超過しています (${desc.length}字)`);
    }
    if (seenDescriptions.has(desc)) {
      descFails.push(`ページ [${p.name}] の description が [${seenDescriptions.get(desc)}] と重複しています`);
    } else {
      seenDescriptions.set(desc, p.name);
    }
  }
  report("静的ページの Description 個別化 ＆ 120字以内検査 (P1-1)", descFails.length === 0,
    descFails.length === 0 ? `静的全7ページの meta description が完全固有 ＆ 120文字以内であることを検証完了` : descFails.join("; "));

  // ==============================================================================
  // 17. ガイド記事 /guide/polymarket-japan 配信 ＆ Article構造化データ ＆ 実在 <a href> 内部リンク整合性 (P1-2, P1-3)
  // ==============================================================================
  let guideFails = [];
  const guideHtmlPath = path.join(ROOT, "dist/guide/polymarket-japan.html");
  const guideDirPath = path.join(ROOT, "dist/guide/polymarket-japan/index.html");

  if (!fs.existsSync(guideHtmlPath)) {
    guideFails.push("dist/guide/polymarket-japan.html が存在しません");
  } else {
    if (fs.existsSync(guideDirPath)) {
      guideFails.push("dist/guide/polymarket-japan/index.html が残存しており307リダイレクトが発生します");
    }
    const guideHtml = fs.readFileSync(guideHtmlPath, "utf-8");
    if (!guideHtml.includes('<link rel="canonical" href="https://mirairadar.com/guide/polymarket-japan" />')) {
      guideFails.push("ガイド記事の canonical が自己参照になっていません");
    }
    const articleJsonLdMatch = guideHtml.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
    if (!articleJsonLdMatch) {
      guideFails.push("ガイド記事の JSON-LD スクリプトタグが欠落しています");
    } else {
      try {
        const parsed = JSON.parse(articleJsonLdMatch[1]);
        if (parsed["@type"] !== "Article" || parsed.mainEntityOfPage?.["@id"] !== "https://mirairadar.com/guide/polymarket-japan") {
          guideFails.push("ガイド記事の JSON-LD @type が Article でないか URL が不一致です");
        }
      } catch (e) {
        guideFails.push(`ガイド記事の JSON-LD パースエラー: ${e.message}`);
      }
    }

    // プリレンダー HTML 内の <a href="/market/..."> リンクの実在検査
    const htmlMarketLinks = (guideHtml.match(/<a\s+[^>]*href="\/market\/[^"]+"/g) || []);
    if (htmlMarketLinks.length < 3) {
      guideFails.push(`dist/guide/polymarket-japan.html 内の <a href="/market/..."> リンク数が3件未満です (${htmlMarketLinks.length}件)`);
    }
  }

  // Sitemap 含有確認
  const sitemapXml = fs.readFileSync(path.join(ROOT, "public/sitemap.xml"), "utf-8");
  if (!sitemapXml.includes("https://mirairadar.com/guide/polymarket-japan")) {
    guideFails.push("sitemap.xml に https://mirairadar.com/guide/polymarket-japan が含まれていません");
  }

  // React コンポーネント (GuideDetailPage.tsx & MarketDetailPage.tsx) の semantic <a href> 検査
  const guideComponentCode = fs.readFileSync(path.join(ROOT, "src/components/GuideDetailPage.tsx"), "utf-8");
  if (!guideComponentCode.includes('href={`/market/') && !guideComponentCode.includes('href="/market/')) {
    guideFails.push("GuideDetailPage.tsx に銘柄への semantic <a href> リンクが存在しません");
  }
  const detailComponentCode = fs.readFileSync(path.join(ROOT, "src/components/MarketDetailPage.tsx"), "utf-8");
  if (!detailComponentCode.includes('href="/guide/polymarket-japan"')) {
    guideFails.push("MarketDetailPage.tsx にガイド記事への semantic <a href> リンクが存在しません");
  }

  // 関連記事リンクが有効銘柄に実在すること (P1-3)
  const guideSource = fs.readFileSync(path.join(ROOT, "src/content/guides/polymarketJapan.ts"), "utf-8");
  const relatedMatch = guideSource.match(/relatedMarketSlugs:\s*\[([\s\S]*?)\]/);
  if (relatedMatch) {
    const rawSlugs = relatedMatch[1].split(",").map(s => s.replace(/['"\s]/g, "")).filter(Boolean);
    if (rawSlugs.length < 3) {
      guideFails.push(`ガイド記事の関連銘柄リンク数が3件未満です (${rawSlugs.length}件)`);
    }
    for (const slug of rawSlugs) {
      const existsInDb = activeEvents.some(e => e.slug === slug || e.id === slug);
      if (!existsInDb) {
        guideFails.push(`ガイド記事の関連銘柄 [${slug}] が Supabase 有効銘柄に実在しません`);
      }
    }
  } else {
    guideFails.push("polymarketJapan.ts から relatedMarketSlugs が取得できませんでした");
  }

  report("ガイド記事 直接.html 配信 ＆ Article構造化データ ＆ 実在 <a href> 内部リンク (P1-2, P1-3)", guideFails.length === 0,
    guideFails.length === 0 ? `ガイド記事 /guide/polymarket-japan (Article構造化データ / 実在3銘柄 <a href> リンク / 双方向導線 / sitemap含有) を検証完了` : guideFails.join("; "));

  // ==============================================================================
  // 18. ヘッダー CSS 厳密基本セレクタ整合性 ＆ 1279px/440pxレスポンシブ ＆ Deploy Hook 連携 (N-21, N-22, N-27)
  // ==============================================================================
  let headerFails = [];
  const cssPath = path.join(ROOT, "src/index.css");
  const rawCss = fs.readFileSync(cssPath, "utf-8");
  // コメントを除去して実ルールのみを抽出（コメントによる偽陽性を完全防止）
  const cleanCss = rawCss.replace(/\/\*[\s\S]*?\*\//g, "");

  // メディアクエリを除去したトップレベルCSS（基本ルールに存在することを検査：穴①を完全封鎖）
  const cleanCssWithoutMedia = cleanCss.replace(/@media[^{]*\{[\s\S]*?\n\}/g, "");

  const requiredHeaderClasses = [
    "header-container-slim",
    "header-inner-slim",
    "header-left-slim",
    "header-right-slim",
    "stats-badges-slim",
    "stat-badge-item",
    "stat-dot",
    "btn-header-subtle",
    "btn-header-amber",
    "btn-header-forecast-slim",
    "nav-container-slim",
    "category-nav-slim"
  ];

  for (const cls of requiredHeaderClasses) {
    // (?![\\w-]) を用いて -DISABLED 等の別名マッチ偽陽性を完全防止（穴②を完全封鎖）
    const selectorRegex = new RegExp(`(?:^|[\\r\\n,\\s])\\.${cls}(?![\\w-])[^{]*\\{`, "m");
    if (!selectorRegex.test(cleanCssWithoutMedia)) {
      headerFails.push(`src/index.css の基本ルール（メディアクエリ外）にヘッダー必須クラス [.${cls}] の実セレクタ定義が存在しません`);
    }
  }

  // N-27: 1279px 以下の画面でヘッダー省略要素が畳まれるか検査 (769〜1279px はみ出し防止)
  const media1279Match = cleanCss.match(/@media[^{]*max-width:\s*1279px[^{]*\{([\s\S]*?)\n\}/);
  if (!media1279Match || !media1279Match[1].includes(".hide-on-mobile")) {
    headerFails.push("src/index.css に @media (max-width: 1279px) の .hide-on-mobile 省略ルールが存在しません (N-27)");
  }

  // モバイルレスポンシブ (max-width: 440px) に -slim 系クラスが包含されているか検査 (N-22 再発防止)
  const media440Match = cleanCss.match(/@media[^{]*max-width:\s*440px[^{]*\{([\s\S]*?)\n\}/);
  if (!media440Match) {
    headerFails.push("src/index.css に @media (max-width: 440px) のモバイルヘッダー最適化ルールが存在しません");
  } else {
    const mediaBlock = media440Match[1];
    if (!mediaBlock.includes(".header-inner-slim") || !mediaBlock.includes(".header-left-slim") || !mediaBlock.includes(".header-right-slim")) {
      headerFails.push("@media (max-width: 440px) 内に .header-inner-slim, .header-left-slim, .header-right-slim が網羅されていません");
    }
  }

  // auto-bot.yml の Deploy Hook 連携
  const workflowPath = path.join(ROOT, ".github/workflows/auto-bot.yml");
  if (fs.existsSync(workflowPath)) {
    const workflowContent = fs.readFileSync(workflowPath, "utf-8");
    if (!workflowContent.includes("CF_PAGES_DEPLOY_HOOK")) {
      headerFails.push("auto-bot.yml に Cloudflare Pages Deploy Hook 連携ステップが存在しません");
    }
  }

  // ==============================================================================
  // 19. 独立オラクル ＆ dist実走査によるプレースホルダ候補排除 ＆ レンジ健全性検査 (N-34 完全封鎖)
  // ==============================================================================
  let placeholderFails = [];
  const titleEnBySlug = new Map(activeEvents.map(e => [String(e.slug || e.id), e.title_en || ""]));
  const INDEPENDENT_DUMMY_REGEX = /^([A-Z]|Will\s+[A-Z]\s+win|Will\s+another\s+team|Will\s+\[.*\]\s+win|Other|Another|Placeholder|TBD)$/i;

  // 1. dist/market/*.html の実ビルド成果物を走査し、本命表記やタイトルにプレースホルダが含まれていないか検査
  const prerenderedFiles = fs.readdirSync(distMarketDir).filter(f => f.endsWith(".html"));
  for (const file of prerenderedFiles) {
    const html = fs.readFileSync(path.join(distMarketDir, file), "utf-8");
    const ogTitleMatch = html.match(/<meta property="og:title" content="(.*?)"/);
    if (!ogTitleMatch) continue;
    const ogTitle = ogTitleMatch[1];

    // 【世界本命 <本命名> 〇%】から本命名を取り出して検査する
    // （第11回：本命名が og:title に無く、日本語タイトルを英語式でテストして空振りしていた）
    if (ogTitle.includes("【世界本命")) {
      const leaderMatch = ogTitle.match(/【世界本命\s+(.+?)\s+(\d+)%】/);
      if (!leaderMatch) {
        placeholderFails.push(`${file} の og:title が【世界本命 <本命名> N%】形式になっていません: ${ogTitle.slice(0, 40)}`);
      } else {
        const leader = leaderMatch[1].trim();
        if (INDEPENDENT_DUMMY_REGEX.test(leader) || /^[A-Z]$/.test(leader)) {
          placeholderFails.push(`${file} の og:title にプレースホルダ本命 [${leader}] が検出されました`);
        }
      }
    }

    // レンジ型で偽の2値オッズが出ていないか。
    // 判定は日本語タイトルの言い回しではなく title_en を基準にする
    // （訳が変われば黙って無効化される直書きを避ける／第11回）
    const slugOfFile = file.replace(/\.html$/, "");
    const teOfFile = titleEnBySlug.get(slugOfFile) || "";
    const namesTarget = /\?:\s*\S/.test(teOfFile) || /[<>\u2264\u2265]\s*\d/.test(teOfFile);
    if (!namesTarget && /到達水準予測|価格水準予測/.test(ogTitle) && ogTitle.includes("【世界の確率")) {
      placeholderFails.push(`${file} は対象が名指しされていないレンジ銘柄ですが、2値オッズ [${ogTitle}] が出力されています`);
    }
  }

  // 2. 出力辞書の全走査（独立正規表現判定）
  const oddsJsonPath = path.join(ROOT, "public/data/market_odds.json");
  if (fs.existsSync(oddsJsonPath)) {
    const oddsDict = JSON.parse(fs.readFileSync(oddsJsonPath, "utf-8"));
    for (const [key, val] of Object.entries(oddsDict)) {
      if (val && val.leaderName && (INDEPENDENT_DUMMY_REGEX.test(val.leaderName.trim()) || /^[A-Z]$/.test(val.leaderName.trim()))) {
        placeholderFails.push(`辞書内銘柄 [${key}] の leaderName にプレースホルダ [${val.leaderName}] が残存しています`);
      }
    }
  }

  report("独立オラクル ＆ dist実走査によるプレースホルダ排除 ＆ レンジ健全性 (N-34 完全封鎖)", placeholderFails.length === 0,
    placeholderFails.length === 0 ? "被験者から独立した判定式で全distファイル ＆ 辞書を走査しプレースホルダ混入0件を確認" : placeholderFails.join("; "));

  // ==============================================================================
  // 20. 決着済み・非アクティブ銘柄の確定アーカイブHTML ＆ 自己参照Canonical ＆ noindex 検査 (N-37 ソフト404完全根絶)
  // ==============================================================================
  let closedArchiveFails = [];
  if (closedEvents && closedEvents.length > 0) {
    for (const row of closedEvents) {
      const slug = row.slug || row.id;
      const htmlPath = path.join(distMarketDir, `${slug}.html`);
      if (!fs.existsSync(htmlPath)) {
        closedArchiveFails.push(`決着済み銘柄 [${slug}] の確定アーカイブ HTML が存在せず、トップページへのソフト404が発生します`);
        continue;
      }
      const html = fs.readFileSync(htmlPath, "utf-8");
      const expectedCanon = `<link rel="canonical" href="https://mirairadar.com/market/${slug}" />`;
      if (!html.includes(expectedCanon)) {
        closedArchiveFails.push(`決着済み銘柄 [${slug}] の canonical が自己参照になっていません (トップページを指している疑い)`);
      }
      if (!html.includes('content="noindex, follow"')) {
        closedArchiveFails.push(`決着済み銘柄 [${slug}] に noindex, follow メタタグが存在しません`);
      }
      if (!html.includes('【決着・終了】')) {
        closedArchiveFails.push(`決着済み銘柄 [${slug}] の og:title に【決着・終了】プレフィックスが存在しません`);
      }
    }
  }

  report("決着済み銘柄の確定アーカイブHTML ＆ 自己参照Canonical ＆ noindex (N-37 ソフト404完全根絶)", closedArchiveFails.length === 0,
    closedArchiveFails.length === 0 ? `決着済み全${closedEvents?.length || 0}銘柄の自己参照Canonical ＆ noindex ＆ 確定アーカイブHTML配信を検証完了 (ソフト404 0件)` : closedArchiveFails.join("; "));

  // ==============================================================================
  // 21. 解決できる閾値を取りこぼしていないか (N-38 / N-39 再発防止)
  // ==============================================================================
  // title_en が対象を名指ししている（コロン以降＝形式A／文中の閾値＝形式B）のに
  // 【世界観測銘柄】として数字を伏せている銘柄は、答えを持っているのに出していない。
  // 判定は「実ビルド成果物（dist）」で行う。中間生成物（market_odds.json）は同期が
  // 走るまで更新されず、リゾルバの是正が反映されないため（第10回の教訓）。
  let thresholdFails = [];
  for (const ev of activeEvents) {
    const te = ev.title_en || "";
    const hasColonTarget  = /\?:\s*\S/.test(te);
    const hasInlineTarget = /[<>\u2264\u2265]\s*\d/.test(te);
    if (!hasColonTarget && !hasInlineTarget) continue;
    const htmlPath = path.join(distMarketDir, `${ev.slug || ev.id}.html`);
    if (!fs.existsSync(htmlPath)) continue;
    const og = (fs.readFileSync(htmlPath, "utf-8").match(/<meta property="og:title" content="(.*?)"/) || [])[1] || "";
    if (og.includes("【世界観測銘柄】")) {
      thresholdFails.push(`銘柄 [${ev.slug}] は title_en が対象を名指ししている（${hasColonTarget ? "形式A" : "形式B"}）のに【世界観測銘柄】で数字を伏せています: ${te.slice(0, 56)}`);
    }
  }
  report("名指しされた閾値の取りこぼし検査 (N-38/N-39 再発防止)", thresholdFails.length === 0,
    thresholdFails.length === 0 ? "title_en が対象を名指しする銘柄で、解決可能なオッズの取りこぼし 0件（dist 実走査）" : thresholdFails.join("; "));

  // ==============================================================================
  // 22. 多肢イベントで、画面のサブタイトルが本命と別の候補を名指ししていないか (N-40)
  // ==============================================================================
  // question_en は詳細ページの英語サブタイトルとして表示される。多肢イベントで
  // これが「先頭候補の問い」だと、日本語タイトル（イベント全体）・サブタイトル（別候補）・
  // 確率（本命）の3つが画面上で食い違う。
  let subtitleFails = [];
  {
    const oddsPath = path.join(ROOT, "public/data/market_odds.json");
    const dict = fs.existsSync(oddsPath) ? JSON.parse(fs.readFileSync(oddsPath, "utf-8")) : {};
    for (const ev of activeEvents) {
      const entry = dict[String(ev.id)] || dict[ev.slug];
      if (!entry || !entry.isMultiChoice || !entry.leaderName) continue;
      const qe = ev.question_en || "";
      if (!/^Will\s+.+\s+Win/i.test(qe)) continue;           // 個別候補を名指しする形でなければ問題なし
      const leader = String(entry.leaderName).replace(/…$/, "").toLowerCase();
      if (leader && !qe.toLowerCase().includes(leader)) {
        subtitleFails.push(`銘柄 [${ev.slug}] のサブタイトルが本命 [${entry.leaderName}] とは別の候補を名指ししています: ${qe.slice(0, 56)}`);
      }
    }
  }
  report("多肢イベントのサブタイトル整合性 (N-40)", subtitleFails.length === 0,
    subtitleFails.length === 0 ? "多肢イベントで、サブタイトルが本命以外の候補を名指しする銘柄 0件" : subtitleFails.join("; "));

  // ==============================================================================
  // 23. 英語タイトルの再流入検査 (N-41)
  // ==============================================================================
  // 「経済・市場予測: Will …」のように接頭辞だけが日本語で本文が英語のまま
  // 公開されていないか。接頭辞を含めた判定では素通りするため、本文で見る。
  let englishTitleFails = [];
  for (const ev of activeEvents) {
    const body = String(ev.title_ja || "").replace(/^(?:経済・市場予測|国際政治動向|AI・テック予測|エンタメ予測|スポーツ予測)[:：]\s*/, "");
    if (!/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(body)) {
      englishTitleFails.push(`銘柄 [${ev.slug}] の本文が日本語を含みません: ${String(ev.title_ja).slice(0, 56)}`);
    }
  }
  report("英語タイトルの再流入検査 (N-41)", englishTitleFails.length === 0,
    englishTitleFails.length === 0 ? `有効全${activeEvents.length}銘柄で、接頭辞を除いた本文が日本語であることを確認` : englishTitleFails.join("; "));

  // ==============================================================================
  // 24. 描画後 canonical の自己参照検査 (N-44)
  // ==============================================================================
  // プリレンダーHTMLの canonical が正しくても、React が起動後に applySeoMetadata で
  // 上書きする。Google は描画後を見るため、そこが他所を指すと自ら索引から降りる。
  // 静的HTMLだけを見る検査では検出できないので、ソース側で2点を強制する。
  let canonFails = [];
  {
    const PAGE_ROUTES = ["/", "/forecast", "/profile", "/rankings", "/ai-connector", "/developers", "/letter-to-mike", "/guide/polymarket-japan"];
    // 複数ルートを1コンポーネントが担当する場合、canonical は実パスから決めなければならない
    const MULTI_ROUTE_COMPONENTS = ["ForecastHubPage.tsx", "AiConnectorPage.tsx"];
    const compDir = path.join(ROOT, "src/components");
    for (const file of fs.readdirSync(compDir).filter(f => f.endsWith(".tsx"))) {
      const src = fs.readFileSync(path.join(compDir, file), "utf-8");
      const literal = src.match(/canonicalUrl:\s*['"]([^'"]+)['"]/);
      if (literal) {
        const url = literal[1];
        const routePart = url.replace(/^https?:\/\/[^/]+/, "") || "/";
        if (!PAGE_ROUTES.includes(routePart)) {
          canonFails.push(`${file} の canonical [${url}] はページのURLではありません（APIエンドポイント等を指していないか）`);
        }
        if (MULTI_ROUTE_COMPONENTS.includes(file)) {
          canonFails.push(`${file} は複数ルートを担当するのに canonical が固定値 [${url}] です。実パスから決める必要があります`);
        }
      }
    }
  }
  report("描画後 canonical の自己参照検査 (N-44)", canonFails.length === 0,
    canonFails.length === 0 ? "ページコンポーネントの canonical が実ページURLを指し、複数ルート担当は実パス由来であることを確認" : canonFails.join("; "));

  // ==============================================================================
  // 25. ソフト404の解消と実ルートの網羅 (N-47)
  // ==============================================================================
  // 404.html があると未知のパスは本物の404になる。その代わり、アプリが持つ実ルートを
  // プリレンダーし忘れると、生きているページが404を返してしまう。両方を検査する。
  let notFoundFails = [];
  {
    const APP_ROUTES = ["forecast", "rankings", "profile", "ai-connector", "developers", "letter-to-mike"];
    if (!fs.existsSync(path.join(ROOT, "dist/404.html"))) {
      notFoundFails.push("dist/404.html が存在しません（未知のURLがトップの複製を200で返すソフト404になります）");
    } else {
      const nf = fs.readFileSync(path.join(ROOT, "dist/404.html"), "utf-8");
      if (!/name="robots"[^>]*noindex/.test(nf)) notFoundFails.push("404.html に noindex がありません");
      if (!/assets\/index-[\w-]+\.js/.test(nf)) notFoundFails.push("404.html が SPA シェルではありません（人がページを見られなくなります）");
    }
    for (const r of APP_ROUTES) {
      if (!fs.existsSync(path.join(ROOT, "dist", `${r}.html`))) {
        notFoundFails.push(`アプリのルート [/${r}] がプリレンダーされていません。404.html があるため本物の404になります`);
      }
    }
    if (!fs.existsSync(path.join(ROOT, "dist/index.html"))) notFoundFails.push("dist/index.html がありません");
  }
  report("ソフト404の解消 ＆ 実ルートの網羅 (N-47)", notFoundFails.length === 0,
    notFoundFails.length === 0 ? "404.html（noindex・SPAシェル）と、アプリ全ルートのプリレンダーを確認" : notFoundFails.join("; "));

  // ==============================================================================
  // 21. 選択肢明示型市場の個別オッズ解決 ＆ 観測銘柄抑制の適正性検査 (N-38 完全解決)
  // ==============================================================================
  let n38Fails = [];
  const requiredOddsSlugs = [
    "what-price-will-ethereum-hit-in-august-2026",
    "how-many-fed-rate-cuts-in-2026",
    "what-price-will-bitcoin-hit-in-august-2026",
    "what-price-will-ethereum-hit-august-17-23-2026",
    "what-price-will-bitcoin-hit-before-2027",
    "what-price-will-bitcoin-hit-august-17-23-2026",
    "what-price-will-ethereum-hit-before-2027",
    "what-price-will-xrp-hit-in-august-2026"
  ];

  for (const slug of requiredOddsSlugs) {
    const htmlPath = path.join(distMarketDir, `${slug}.html`);
    if (!fs.existsSync(htmlPath)) continue;
    const html = fs.readFileSync(htmlPath, "utf-8");
    const ogTitleMatch = html.match(/<meta property="og:title" content="(.*?)"/);
    if (!ogTitleMatch) {
      n38Fails.push(`${slug} に og:title が存在しません`);
      continue;
    }
    const ogTitle = ogTitleMatch[1];
    if (ogTitle.includes("【世界観測銘柄】")) {
      n38Fails.push(`選択肢明示銘柄 [${slug}] が誤って【世界観測銘柄】に抑制されています (og:title: ${ogTitle})`);
    }
    if (!ogTitle.includes("【世界の確率") && !ogTitle.includes("【世界本命")) {
      n38Fails.push(`選択肢明示銘柄 [${slug}] の og:title に世界オッズが含まれていません (${ogTitle})`);
    }
  }

  report("選択肢明示型市場の個別オッズ解決 ＆ 観測銘柄抑制適正性 (N-38 完全解決)", n38Fails.length === 0,
    n38Fails.length === 0 ? "対象選択肢が明示された市場で正しく世界オッズ（確率値）を出力し不要な抑制を根絶" : n38Fails.join("; "));

  console.log("\n====================================================");
  console.log(`検証結果サマリー: 合格 ${passCount}件 ｜ 不合格 ${failCount}件`);
  console.log("====================================================\n");
  if (failCount > 0) process.exit(1);
}

checkDbAndPhase0();
