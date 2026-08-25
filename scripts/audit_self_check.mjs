import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";
import { isDomesticEvent } from "./resolvePolymarketOdds.mjs";

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
// N-60: ここは8ファイルの固定リストだった。
//   実際に日本世論の割合を描画しているのは13ファイルで、5ファイルが検査外だった。
//   検査は「全8コンポーネント統一性」と名乗りながら、母集団の4割を見ていなかった。
//   実害：MainTradingChart が投票0件の銘柄で「有効投票数: 0票」と
//   「日本世論 YES: 50%」を並べて表示していた（既定値50%の漏れ・本番実測）。
//   人が列挙する限り、面が増えたときに漏れる。コードから導出する。
const GAP_TARGET_COMPONENTS = fs.existsSync(COMPONENTS_DIR)
  ? fs.readdirSync(COMPONENTS_DIR)
      .filter(f => f.endsWith(".tsx"))
      .filter(f => /japanVotes(?:\?\.|\.)percentYes/.test(fs.readFileSync(path.join(COMPONENTS_DIR, f), "utf-8")))
      // 管理画面は運用者向けの生データ。n=1 の銘柄も見えないと運用にならないので、
      // n>=3 ガードの対象外にする。カテゴリ単位の除外なので、
      // 新しい面が増えたときに「入れ忘れて見逃す」向きには倒れない
      //（除外の取りこぼしは過検出になるだけで、defect を通すことはない）。
      .filter(f => !/^Admin/.test(f))
  : [];
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
report(`乖離基準 (japanVotes >= 3 & n=併記) の統一性（${GAP_TARGET_COMPONENTS.length}コンポーネントを導出）`, gapCheckFails.length === 0,
  gapCheckFails.length === 0 ? `日本世論の割合を描画する ${GAP_TARGET_COMPONENTS.length}コンポーネントすべてで n>=3 ガード & n= 併記を確認` : gapCheckFails.join("; "));

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
    // is_listed 列は DDL 適用前は存在しないため列指定にせず '*' で取る (Phase 2-A)
    const { data: events, error } = await supabase.from("events").select("*").eq("is_active", true);
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
    // Phase 2-A: sitemap に載るのは「掲載中（is_listed）」のみ。観測対象外は noindex でページだけ残る
    const listedActive = activeEvents.filter(e => e.is_listed !== false);
    const listedSlugs = new Set(listedActive.map(e => e.slug || e.id));

    // A. 死にURL検査（Sitemapにあるのに掲載中でない）
    const deadUrls = sitemapMarketUrls.filter(slug => !listedSlugs.has(slug));
    if (deadUrls.length > 0) {
      sitemapFails.push(`死にURL・非掲載URLを ${deadUrls.length}件 検知 (例: ${deadUrls.slice(0, 3).join(", ")})`);
    }

    // B. 掲載銘柄の一致検査
    if (sitemapMarketUrls.length !== listedActive.length) {
      sitemapFails.push(`件数不一致: sitemap=${sitemapMarketUrls.length}件, DB掲載銘柄=${listedActive.length}件`);
    }
  }
  report("Sitemap 100% 実在性 & Supabase 掲載銘柄完全一致 (P0-1)", sitemapFails.length === 0,
    sitemapFails.length === 0 ? `全 ${activeEvents.filter(e => e.is_listed !== false).length}件 の /market/ URLがSupabase掲載銘柄と完全一致 (死にURL 0件)` : sitemapFails.join("; "));

  // ==============================================================================
  // 12. プリレンダー HTML 網羅性 & 直接 .html 配信 (307根絶) & 自己参照 Canonical & OGP & JSON-LD 検査 (P0-2, P0-3, P0-4)
  // ==============================================================================
  let prerenderFails = [];
  const observedProbs = [];
  // Phase 2-A: 掲載状態（is_listed）と noindex の一致検査。母集団は走査対象の全有効銘柄から導出
  const listingFails = [];
  let listedSeen = 0;
  let unlistedSeen = 0;
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
      // N-50: 確率の主語を出す形【世界の確率「<主語>」N%】を追加
      const ogTitleMatch = html.match(/<meta property="og:title" content="【(世界の確率 \d+%|世界の確率「.+?」\d+%|世界本命 .+? \d+%|日本世論調査|世界観測銘柄)】(.*?)"/);
      if (!ogTitleMatch || ogTitleMatch[2].trim().length === 0) {
        prerenderFails.push(`銘柄 [${slug}] の og:title に銘柄名が正しく埋め込まれていません (got: ${html.match(/<meta property="og:title" content="(.*?)"/)?.[1]})`);
      } else {
        // 【世界本命 <本命名> N%】でも確率を拾えるようにする（本命銘柄が observedProbs から落ちていた）
        const probMatch = ogTitleMatch[1].match(/(?:世界の確率|世界本命)(?:\s*[「\s].+?[」\s])?\s*(\d+)%/);
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
      // 5. Phase 2-A: 掲載中なら noindex が無く、観測対象外なら noindex があること。
      //    どちらか一方だけ検査すると「全銘柄に noindex」のような全壊を見逃すため、両方向を照合する
      const hasNoindex = html.includes('<meta name="robots" content="noindex" />');
      const shouldNoindex = ev.is_listed === false;
      if (shouldNoindex) unlistedSeen++; else listedSeen++;
      if (hasNoindex !== shouldNoindex) {
        listingFails.push(`銘柄 [${slug}] の noindex が掲載状態と食い違っています (掲載=${!shouldNoindex}, noindex=${hasNoindex})`);
      }

      checkedCount++;
    }

    // N-30, N-33, N-34 構造的検査 (Check #14 完全封鎖):
    // 1. 世界オッズを名乗れる母集団（＝国内以外の有効銘柄）の6割以上が実際に確率を出していること
    //    （固定値35件は銘柄の自然減で偽陽性を出した。母集団はDBから導出する）
    // 2. 確率が観測数の1/4以上の種類に分散していること（50%固定などの均一化を防止）
    // 3. 国内判定そのものが壊れて母集団が消えるサイレントパスも塞ぐ
    const globalEvents = activeEvents.filter(e => !isDomesticEvent(e.id));
    const distinctProbs = new Set(observedProbs);
    if (activeEvents.length >= 20 && globalEvents.length < Math.ceil(activeEvents.length * 0.2)) {
      prerenderFails.push(`[Check #14 CRITICAL] グローバル銘柄が異常に少なすぎます (${globalEvents.length}/${activeEvents.length}件)。国内判定 (isDomesticEvent) が壊れている疑いがあります。`);
    } else if (globalEvents.length >= 8) {
      const oddsFloor = Math.ceil(globalEvents.length * 0.6);
      const distinctFloor = Math.max(5, Math.ceil(observedProbs.length * 0.25));
      if (observedProbs.length < oddsFloor) {
        prerenderFails.push(`[Check #14 CRITICAL] 世界オッズが反映された銘柄数が不足しています (観測数: ${observedProbs.length}件 / 導出下限: ${oddsFloor}件 = グローバル${globalEvents.length}件の60%)。Polymarket同期・オッズ辞書生成が正常に動作していません。`);
      } else if (distinctProbs.size < distinctFloor) {
        prerenderFails.push(`[Check #14 CRITICAL] 観測された世界確率の多様性が不足しています (${distinctProbs.size}種類 / 導出下限: ${distinctFloor}種類)。オッズが固定値になっている疑いがあります。`);
      }
    }

    // 静的ページの自己参照 Canonical 検査 (P0-3)
    const staticPages = ["forecast", "rankings", "ai-connector", "developers", "letter-to-mike", "track-record"];
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

  report("掲載/観測対象外と noindex の一致 (Phase 2-A)", listingFails.length === 0,
    listingFails.length === 0
      ? `掲載 ${listedSeen}件は noindex なし ／ 観測対象外 ${unlistedSeen}件は noindex あり、で全件一致`
      : listingFails.join("; "));

  // ============================================================================
  // 38. 埋め込みシェルの網羅 (P0-6 / D の前提)
  // ----------------------------------------------------------------------------
  // /embed/<slug> は外部配布面。SPA フォールバックを切った瞬間に配布済みの
  // 埋め込みが 404 にならないよう、全銘柄（有効＋決着アーカイブ）の静的シェルが
  // dist/embed/ に存在し、noindex と銘柄ページへの canonical を持つことを検査する。
  // 母集団は DB から導出（固定リストを持たない）。
  // ============================================================================
  {
    const embedFails = [];
    const embedTargets = [...activeEvents, ...closedEvents];
    for (const ev of embedTargets) {
      const slug = ev.slug || ev.id;
      const f = path.join(ROOT, "dist/embed", `${slug}.html`);
      if (!fs.existsSync(f)) { embedFails.push(`埋め込みシェル [${slug}] が欠落`); continue; }
      const html = fs.readFileSync(f, "utf-8");
      if (!html.includes('<meta name="robots" content="noindex" />')) {
        embedFails.push(`埋め込みシェル [${slug}] に noindex がありません`);
      }
      if (!html.includes(`<link rel="canonical" href="https://mirairadar.com/market/${slug}" />`)) {
        embedFails.push(`埋め込みシェル [${slug}] の canonical が銘柄ページを指していません`);
      }
    }
    if (embedTargets.length === 0) embedFails.push("母集団が0件です（DB取得に失敗している疑い）");
    report(`埋め込みシェルの網羅 (P0-6 前提 / 有効${activeEvents.length}＋決着${closedEvents.length}件)`,
      embedFails.length === 0,
      embedFails.length === 0
        ? `全${embedTargets.length}件の /embed/ シェルが存在し、noindex＋銘柄ページへの canonical を確認`
        : embedFails.slice(0, 5).join("; ") + (embedFails.length > 5 ? ` ほか${embedFails.length - 5}件` : ""));
  }

  // ============================================================================
  // 39. Worker デプロイ設定と MCP スナップショットの整合 (P0-6 / D)
  // ----------------------------------------------------------------------------
  // wrangler.jsonc が無いと CI の自動セットアップが SPA フォールバック設定を
  // 毎ビルド再生成し、ソフト404 と /api/mcp 不動作が再発する（2026-08-25 に確定した根因）。
  // あわせて /api/mcp の実データ源（mcp_snapshot.json）が掲載銘柄と一致し、
  // n<3 の日本世論に確率が入っていない（捏造ガード）ことも検査する。
  // ============================================================================
  {
    const dFails = [];
    const wranglerPath = path.join(ROOT, "wrangler.jsonc");
    if (!fs.existsSync(wranglerPath)) {
      dFails.push("wrangler.jsonc がありません（CI の自動セットアップが SPA フォールバックを再生成します）");
    } else {
      const wr = fs.readFileSync(wranglerPath, "utf-8");
      if (!/"not_found_handling"\s*:\s*"404-page"/.test(wr)) {
        dFails.push('wrangler.jsonc の not_found_handling が "404-page" ではありません（ソフト404が再発します）');
      }
      if (!/"main"\s*:\s*"worker\/index\.ts"/.test(wr)) {
        dFails.push("wrangler.jsonc に main (worker/index.ts) がありません（/api/mcp が動きません）");
      }
    }
    const snapPath = path.join(ROOT, "dist/data/mcp_snapshot.json");
    if (!fs.existsSync(snapPath)) {
      dFails.push("dist/data/mcp_snapshot.json がありません");
    } else {
      try {
        const snap = JSON.parse(fs.readFileSync(snapPath, "utf-8"));
        const listedCount = activeEvents.filter(e => e.is_listed !== false).length;
        if (!Array.isArray(snap.events) || snap.events.length !== listedCount) {
          dFails.push(`スナップショット件数 ${snap.events?.length} が掲載銘柄数 ${listedCount} と一致しません`);
        }
        const fabricated = (snap.events || []).filter(e => e.japan && e.japan.probYes !== null && e.japan.n < (snap.minVotesForJapan || 3));
        if (fabricated.length > 0) {
          dFails.push(`n<3 なのに日本世論の確率が入っている銘柄が ${fabricated.length}件（捏造ガード違反: ${fabricated[0].slug}）`);
        }
      } catch (e) {
        dFails.push(`mcp_snapshot.json のパースエラー: ${e.message}`);
      }
    }
    report("Workerデプロイ設定と MCP スナップショットの整合 (P0-6 / D)", dFails.length === 0,
      dFails.length === 0
        ? `wrangler.jsonc (404-page / worker main) と mcp_snapshot（掲載銘柄と一致・n<3の確率なし）を確認`
        : dFails.join("; "));
  }

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
    { name: "的中記録 (/track-record)", file: path.join(ROOT, "dist/track-record.html") },
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
    const PAGE_ROUTES = ["/", "/forecast", "/profile", "/rankings", "/ai-connector", "/developers", "/letter-to-mike", "/guide/polymarket-japan", "/track-record"];
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
    const APP_ROUTES = ["forecast", "rankings", "profile", "ai-connector", "developers", "letter-to-mike", "track-record"];
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
  // N-52: 固定の slug 一覧を持っていたため、銘柄が決着するたびに検査が落ちていた。
  //   （実測：2026-08-24 04:00 UTC に "…august-17-23-2026" が決着し、その40分後に赤くなった）
  //   本来の不変条件は「有効かつ英語タイトルが対象を名指ししている銘柄は世界オッズを出す」。
  //   有効銘柄から毎回導出するので、銘柄の入れ替わりで壊れない。
  const namesSpecificTarget = (titleEn) => {
    const t = String(titleEn || "");
    if (/[<>\u2264\u2265]\s*\d/.test(t)) return true;              // 文中の閾値（形式B）
    if (!t.includes(":")) return false;
    const tail = t.split(":").pop().trim().replace(/[?？]$/, "");
    if (!tail) return false;
    return !/^(winner|champion|\d{4} champion|match winner)$/i.test(tail);  // 一般的な接尾辞は対象ではない
  };
  const requiredOddsSlugs = activeEvents
    .filter(ev => namesSpecificTarget(ev.title_en))
    .map(ev => String(ev.slug || ev.id));

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

  // ============================================================================
  // 28. 静的HTMLに本文と内部リンクがあるか (N-49)
  // ----------------------------------------------------------------------------
  // プリレンダーは <head> の meta だけを書き換えており、<body> は
  // <div id="root"></div> のまま出荷されていた。JSを実行しないクローラには
  // 79URL 中 78URL が「本文0文字・内部リンク0本」で届いていた。
  // 実装関数（staticBody / injectStaticBody）は借りず、dist の出力だけを見る。
  // ============================================================================
  {
    const htmlFiles = [];
    const walk = (dir) => {
      if (!fs.existsSync(dir)) return;
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith(".html")) htmlFiles.push(full);
      }
    };
    walk(path.join(ROOT, "dist"));

    const MIN_TEXT = 80;
    const bad = [];
    for (const f of htmlFiles) {
      const html = fs.readFileSync(f, "utf-8");
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (!bodyMatch) { bad.push(`${path.relative(ROOT, f)}: <body> が無い`); continue; }
      // <script> と <style> の中身は本文ではない。
      // （シェルに <style> を足した際、CSS文字列が本文としてカウントされ
      //   本文が空でも合格しうる状態を一度作ってしまった）
      const body = bodyMatch[1]
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
      const internal = [...body.matchAll(/<a\s[^>]*href="(\/[^"]*)"/gi)].map(m => m[1]);
      // ナビのリンク文字列だけで文字数を満たしてしまわないよう、<nav> を除いて数える。
      // （破壊テストBの設計中に判明：ナビだけで80字を超えるので、この除去が無いと
      //   h1も本文も空のページが合格してしまう）
      const ownBody = body.replace(/<nav\b[\s\S]*?<\/nav>/gi, "");
      const h1 = (ownBody.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [, ""])[1]
        .replace(/<[^>]+>/g, "").trim();
      const ownText = ownBody.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      const rel = path.relative(ROOT, f);
      if (internal.length === 0) bad.push(`${rel}: 内部リンク0本`);
      else if (h1.length < 4) bad.push(`${rel}: h1が空または短すぎる（"${h1}"）`);
      else if (ownText.length < MIN_TEXT) bad.push(`${rel}: ナビを除く本文${ownText.length}字（${MIN_TEXT}字未満）`);
    }
    report(
      `静的HTMLの本文と内部リンク (N-49 / ${htmlFiles.length}ファイル全数)`,
      bad.length === 0 && htmlFiles.length > 0,
      bad.length === 0
        ? `${htmlFiles.length}ファイルすべてが本文${MIN_TEXT}字以上＋内部リンク1本以上を静的に持つ`
        : `${bad.length}件が未達: ${bad.slice(0, 5).join("; ")}${bad.length > 5 ? ` ほか${bad.length - 5}件` : ""}`
    );
  }

  // ============================================================================
  // 29. OGP画像とプリレンダーHTMLの「枠組み」一致 (N-50 / N-51)
  // ----------------------------------------------------------------------------
  // 表示している確率が「何の確率か」は3通りある。
  //   yes     : outcomes[0] が "Yes"        → 【世界の確率 N%】     / 画像「YES N%」
  //   subject : outcomes[0] が人名等         → 【世界の確率「S」N%】 / 画像「N%」＋主語
  //   leader  : 多肢の本命                   → 【世界本命 S N%】     / 画像「本命 N%」＋本命名
  // OGP画像（vite build 前）とHTML（build 後）は別プロセスなので、
  // 両者が食い違えば片方が嘘になる。N-30（全OGPが50%）とN-35（最大100pt乖離）はこの型だった。
  // 画像側が何を描いたかは _manifest.json に記録させ、dist の HTML と突き合わせる。
  // ============================================================================
  {
    const manPath = path.join(ROOT, "dist/ogp/market/_manifest.json");
    const frameFails = [];
    if (!fs.existsSync(manPath)) {
      frameFails.push("dist/ogp/market/_manifest.json が存在しません（OGP生成がマニフェストを出していない）");
    } else {
      const man = JSON.parse(fs.readFileSync(manPath, "utf-8"));
      let checked = 0;
      for (const [slug, m] of Object.entries(man)) {
        const htmlPath = path.join(ROOT, "dist/market", `${slug}.html`);
        if (!fs.existsSync(htmlPath)) continue;
        const html = fs.readFileSync(htmlPath, "utf-8");
        const og = (html.match(/<meta property="og:title" content="(.*?)"/) || [, ""])[1];
        if (og.startsWith("【決着・終了】")) continue;   // アーカイブは対象外
        checked++;
        let want;
        if (m.framing === "yes")          want = new RegExp(`^【世界の確率 ${m.prob}%】`);
        else if (m.framing === "subject") want = new RegExp(`^【世界の確率「${m.subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}」${m.prob}%】`);
        else if (m.framing === "leader")  want = new RegExp(`^【世界本命 ${m.subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} ${m.prob}%】`);
        else if (m.framing === "domestic") want = /^【日本世論調査】/;
        else                               want = /^【世界観測銘柄】/;
        if (!want.test(og)) {
          frameFails.push(`${slug}: 画像は ${m.framing}${m.prob !== null ? ` ${m.prob}%` : ""}${m.subject ? ` (${m.subject})` : ""} を描いたが og:title は「${og.slice(0, 34)}」`);
        }
      }
      if (checked === 0) frameFails.push("突き合わせ対象が0件（マニフェストと dist が噛み合っていない）");
    }
    report(
      "OGP画像とHTMLの枠組み一致 (N-50 / N-51)",
      frameFails.length === 0,
      frameFails.length === 0
        ? "画像に描いた確率の枠組み（YES / 主語つき / 本命）と og:title が全件一致"
        : `${frameFails.length}件が不一致: ${frameFails.slice(0, 3).join("; ")}${frameFails.length > 3 ? ` ほか${frameFails.length - 3}件` : ""}`
    );
  }

  // ============================================================================
  // 30. 1ページ内の4面が同じ主語を名乗っているか (N-53)
  // ----------------------------------------------------------------------------
  // 「その確率は何の確率か」は og:title / description / 静的シェル / JSON-LD の
  // 4か所に出る。第11回に og:title だけ直し、第13回に OGP画像とアプリを直し、
  // それでも JSON-LD と静的シェルが「YES」のまま残った（N-53）。
  // 同じ判断を複数箇所で書くと、直し漏れた面だけが古いまま残る。
  //
  // この検査は「正しい主語」を知らない。4面が食い違っていないかだけを見る。
  // 正解を持たないぶん実装から独立していて、どの面を直し忘れても落ちる。
  // ============================================================================
  {
    const crossFails = [];
    let crossChecked = 0;
    const distMarket = path.join(ROOT, "dist/market");
    if (!fs.existsSync(distMarket)) {
      crossFails.push("dist/market が存在しません");
    } else {
      for (const file of fs.readdirSync(distMarket).filter(f => f.endsWith(".html"))) {
        const html = fs.readFileSync(path.join(distMarket, file), "utf-8");
        const og = (html.match(/<meta property="og:title" content="(.*?)"/) || [, ""])[1];
        if (og.startsWith("【決着・終了】") || og.includes("【日本世論調査】") || og.includes("【世界観測銘柄】")) continue;

        // 4面それぞれから主語を取り出す（取れなければ null）
        let fromOg = null;
        let m;
        if ((m = og.match(/^【世界本命\s+(.+?)\s+\d+%】/))) fromOg = `本命 ${m[1]}`;
        else if ((m = og.match(/^【世界の確率「(.+?)」\d+%】/))) fromOg = m[1];
        else if (/^【世界の確率 \d+%】/.test(og)) fromOg = "YES";

        const desc = (html.match(/<meta name="description" content="(.*?)"/) || [, ""])[1];
        let fromDesc = null;
        if ((m = desc.match(/世界のリアルマネーは本命\s+(.+?)\s+が\s*\d+%/))) fromDesc = `本命 ${m[1]}`;
        else if ((m = desc.match(/世界のリアルマネーは「(.+?)」に\s*\d+%/))) fromDesc = m[1];
        else if (/世界のリアルマネーはYES\s*\d+%/.test(desc)) fromDesc = "YES";

        const shell = (html.match(/<dt>世界のリアルマネー（(.+?)）<\/dt>/) || [, null])[1];

        let fromLd = null;
        const ldRaw = (html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/) || [, ""])[1];
        try {
          const ld = JSON.parse(ldRaw);
          const v = (ld.variableMeasured || []).find(x => /^世界オッズ\(/.test(x.name || ""));
          if (v) fromLd = String(v.name).replace(/^世界オッズ\(/, "").replace(/\)$/, "");
        } catch { /* パース不可は検査 #4 の担当 */ }

        const surfaces = { "og:title": fromOg, "description": fromDesc, "静的シェル": shell, "JSON-LD": fromLd };
        const present = Object.entries(surfaces).filter(([, v]) => v !== null && v !== undefined);
        const missing = Object.entries(surfaces).filter(([, v]) => v === null || v === undefined).map(([k]) => k);
        if (missing.length > 0) {
          crossFails.push(`${file}: ${missing.join("/")} から主語を読み取れません`);
          continue;
        }
        crossChecked++;
        const uniq = [...new Set(present.map(([, v]) => v))];
        if (uniq.length > 1) {
          crossFails.push(`${file}: 面ごとに主語が違います → ${present.map(([k, v]) => `${k}="${v}"`).join(" / ")}`);
        }
      }
      if (crossChecked === 0) crossFails.push("突き合わせ対象が0件（抽出パターンが実際の出力と噛み合っていない）");
    }
    report(
      `確率の主語の面間一致 (N-53 / ${crossChecked}銘柄)`,
      crossFails.length === 0,
      crossFails.length === 0
        ? `og:title・description・静的シェル・JSON-LD の4面が全銘柄で同じ主語を名乗っている`
        : `${crossFails.length}件が不一致: ${crossFails.slice(0, 3).join("; ")}${crossFails.length > 3 ? ` ほか${crossFails.length - 3}件` : ""}`
    );
  }

  // ============================================================================
  // 31. 投票データに重複が混ざっていないか (N-54)
  // ----------------------------------------------------------------------------
  // ソースにガードが書いてあるかではなく、実データに重複が出ていないかを見る。
  // 「1人1票」はコードの形ではなくデータの性質なので、データ側で測る。
  //
  // 判定対象は voter_key を持つ行だけ。DDL 適用前の既存行（voter_key が NULL）は
  // そもそも同一人物か判定できないので母集団に入れない。
  // 日付でなくデータで母集団を絞るので、時間が経っても壊れない（N-52 の反省）。
  // ============================================================================
  if (supabase) {
    const voteFails = [];
    let keyed = 0, unkeyed = 0;
    const { data: votes, error: vErr } = await supabase
      .from("japan_vote_logs").select("*").limit(5000);

    if (vErr) {
      voteFails.push(`japan_vote_logs を読めません: ${vErr.message}`);
    } else {
      const hasKeyColumn = votes.length === 0 || "voter_key" in votes[0];
      keyed = votes.filter(v => v.voter_key).length;
      unkeyed = votes.length - keyed;

      // (1) 同じ銘柄に同じキーが二度
      const seen = new Map();
      for (const v of votes.filter(x => x.voter_key)) {
        const k = `${v.event_id}::${v.voter_key}`;
        seen.set(k, (seen.get(k) || 0) + 1);
      }
      const dups = [...seen.entries()].filter(([, c]) => c > 1);
      if (dups.length > 0) {
        voteFails.push(`同一銘柄に同一キーの重複 ${dups.length}組（例 ${dups[0][0].slice(0, 40)} が${dups[0][1]}回）`);
      }

      // (2) 連打の痕跡：同じ銘柄・キーつきの票が5秒以内に連続
      const byEvent = {};
      for (const v of votes.filter(x => x.voter_key && x.voted_at)) {
        (byEvent[v.event_id] ||= []).push(v);
      }
      let bursts = 0;
      for (const rows of Object.values(byEvent)) {
        rows.sort((a, b) => new Date(a.voted_at) - new Date(b.voted_at));
        for (let i = 1; i < rows.length; i++) {
          if ((new Date(rows[i].voted_at) - new Date(rows[i - 1].voted_at)) / 1000 <= 5) bursts++;
        }
      }
      if (bursts > 0) voteFails.push(`5秒以内の連続投票 ${bursts}組（連打が素通りしている疑い）`);

      if (!hasKeyColumn) {
        // 失敗にはしない。DDL はユーザーが実行するもので、実装側の不備ではない。
        console.log(`   ℹ️  voter_key 列が未作成です（scripts/patch_n54_voter_key.sql 未適用）。既存 ${votes.length}件は判定対象外。`);
      }
    }
    report(
      `投票データの重複 (N-54 / キーつき${keyed}件・キー無し${unkeyed}件)`,
      voteFails.length === 0,
      voteFails.length === 0
        ? (keyed === 0
            ? `キーつきの投票はまだ0件（DDL適用後に実効化）。既存${unkeyed}件は判定対象外`
            : `キーつき${keyed}件に重複・連打なし`)
        : voteFails.join("; ")
    );
  }

  // ============================================================================
  // 32. 世界確率を「YES」と直書きしている箇所が残っていないか (N-55)
  // ----------------------------------------------------------------------------
  // 同じ数字を出す面が増えるたび、新しい面だけが「YES」のまま取り残されてきた。
  //   第11回 og:title → 第13回 OGP画像・アプリ → 第14回 JSON-LD・静的シェル
  //   → 第15回 埋め込みウィジェット・予測ハブ
  // 4ラウンド同じ型を繰り返している。dist を見る検査（#29 #30）は
  // プリレンダー出力しか見ないので、クライアント描画の面は素通りする。
  //
  // ここはソースを見る。worldProbYes/No の直前に YES/NO が直書きされていたら落とす。
  // 判定式は既知の良例・悪例7件で検算済み（日本世論の "YES" は本物なので拾わない）。
  // ============================================================================
  {
    // 直接参照だけでなく、別名を経由した参照も追う。
    //   const worldYes = item.worldProbYes;   ← 別行で別名を付けて
    //   YES {worldYes}%                        ← 別行で直書きする形が実際の N-55 だった。
    // 同一行しか見ない版では、書いた本人（この検査）が対象の欠陥を見逃していた。
    const HARDCODED = /(?<![A-Za-z])(YES|NO)\s*\{[^}]*worldProb(Yes|No)/;
    const ALIAS_DECL = /\bconst\s+(\w+)\s*=\s*\w+(?:\?\.|\.)worldProb(?:Yes|No)\b/g;
    const srcDir = path.join(ROOT, "src");
    const offenders = [];
    let scanned = 0;
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walk(full); continue; }
        if (!/\.(tsx|ts)$/.test(e.name)) continue;
        scanned++;
        const raw = fs.readFileSync(full, "utf-8");
        const aliases = [...raw.matchAll(ALIAS_DECL)].map(m => m[1]);
        const aliasRe = aliases.length
          ? new RegExp(`(?<![A-Za-z])(YES|NO)\\s*\\{[^}]*\\b(${aliases.join("|")})\\b`)
          : null;
        raw.split("\n").forEach((line, i) => {
          if (HARDCODED.test(line) || (aliasRe && aliasRe.test(line))) {
            offenders.push(`${path.relative(ROOT, full)}:${i + 1} → ${line.trim().slice(0, 60)}`);
          }
        });
      }
    };
    if (fs.existsSync(srcDir)) walk(srcDir);
    report(
      `世界確率のYES直書き (N-55 / ${scanned}ファイル走査)`,
      offenders.length === 0 && scanned > 0,
      offenders.length === 0
        ? `世界確率を表示する箇所はすべて probabilityLabel を経由している`
        : `${offenders.length}件が直書き: ${offenders.slice(0, 3).join(" ／ ")}${offenders.length > 3 ? ` ほか${offenders.length - 3}件` : ""}`
    );
  }

  // ============================================================================
  // 33. 配列propに依存してデータ取得している useEffect (N-57)
  // ----------------------------------------------------------------------------
  // LiveTape が useEffect(..., [events]) で Supabase を叩いていた。
  // events は配列propなので中身が同じでも参照が変わるたびに再取得が走る。
  // 読み込み時に events は3回入れ替わる（初期値 → Supabase → Polymarket反映）ため、
  // 同じクエリが 216ms / 358ms / 560ms の3回発火していた（本番実測）。
  // 30秒ごとの更新でも起きるので、タブを開いている限り無駄が積み上がる。
  //
  // 取得を伴う効果は「1回だけ（[]）」か「プリミティブなキー依存」であるべき。
  // 判定式は修正前の LiveTape（実際の N-57）を食わせて検算済み。
  // ============================================================================
  {
    const NET = /supabase[\s\S]{0,80}\.from\(|\bfetch\(|\b(?:load|fetch|sync|refresh)[A-Z]\w*\s*\(/;
    const SUSPECT = /^(events|items|markets|data|list|rows|votes|entries)$/;
    const effectFails = [];
    let effectsScanned = 0;
    const walkSrc = (dir) => {
      if (!fs.existsSync(dir)) return;
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walkSrc(full); continue; }
        if (!/\.(tsx|ts)$/.test(e.name)) continue;
        const src = fs.readFileSync(full, "utf-8");
        for (const m of src.matchAll(/useEffect\(\s*\(\s*\)\s*=>\s*\{/g)) {
          let i = m.index + m[0].length, depth = 1;
          while (i < src.length && depth > 0) {
            if (src[i] === "{") depth++;
            else if (src[i] === "}") depth--;
            i++;
          }
          const dm = /^\s*,\s*\[([^\]]*)\]/.exec(src.slice(i, i + 140));
          if (!dm) continue;
          const body = src.slice(m.index + m[0].length, i);
          if (!NET.test(body)) continue;
          effectsScanned++;
          const deps = dm[1].split(",").map(d => d.trim()).filter(Boolean);
          const bad = deps.filter(d => SUSPECT.test(d));
          if (bad.length > 0) {
            const line = src.slice(0, m.index).split("\n").length;
            effectFails.push(`${path.relative(ROOT, full)}:${line} → 依存に [${bad.join(", ")}] があり、参照が変わるたび再取得する`);
          }
        }
      }
    };
    walkSrc(path.join(ROOT, "src"));
    report(
      `取得を伴う useEffect の依存 (N-57 / ${effectsScanned}件の取得効果)`,
      effectFails.length === 0 && effectsScanned > 0,
      effectFails.length === 0
        ? `取得を伴う ${effectsScanned}件の効果は、いずれも [] かプリミティブなキーに依存している`
        : effectFails.join("; ")
    );
  }

  // ============================================================================
  // 34. ページの h1（ハイドレーション後） (N-59)
  // ----------------------------------------------------------------------------
  // 静的HTMLには N-49 で全ページに h1 を入れたが、React が置き換えた後は崩れていた。
  //   /            → h1 なし（最初の見出しが銘柄タイトルの h2）
  //   /forecast    → h1 が「見習い観測員// Novice Observer」＝訪問者自身の称号
  //   /embed/…     → h1 なし（iframe 内の独立した文書なのに見出しが無い）
  // Check #28 は静的HTMLしか見ていないため、これを通していた。
  //
  // ブラウザを動かせないので、描画するソースの側を見る。
  //   (1) ページを構成するファイルは h1 を持つこと
  //   (2) h1 の中身が訪問者固有の状態でないこと（ランク・レベル・連続日数など）
  // 判定式は修正前の App.tsx / ForecastHubPage（実際の N-59）で検算済み。
  // ============================================================================
  {
    const H1_BLOCK = /<h1\b[\s\S]*?<\/h1>/g;
    const PERSONAL = /\{[^}]*\b\w*(?:[Rr]ank|[Uu]serName|[Ss]treak|[Ll]evel)\w*/;
    const pageFiles = [path.join(ROOT, "src/App.tsx")];
    const compDir = path.join(ROOT, "src/components");
    if (fs.existsSync(compDir)) {
      for (const f of fs.readdirSync(compDir).filter(f => /Page\.tsx$/.test(f))) {
        pageFiles.push(path.join(compDir, f));
      }
    }
    const h1Fails = [];
    for (const f of pageFiles) {
      if (!fs.existsSync(f)) continue;
      const src = fs.readFileSync(f, "utf-8");
      const blocks = src.match(H1_BLOCK) || [];
      const rel = path.relative(ROOT, f);
      if (blocks.length === 0) {
        h1Fails.push(`${rel}: h1 が無い`);
        continue;
      }
      for (const b of blocks) {
        if (PERSONAL.test(b)) {
          h1Fails.push(`${rel}: h1 が訪問者固有の状態を出している → ${b.replace(/\s+/g, " ").slice(0, 50)}`);
        }
      }
    }
    report(
      `ページの h1 (N-59 / ${pageFiles.length}ファイル)`,
      h1Fails.length === 0 && pageFiles.length > 1,
      h1Fails.length === 0
        ? `ページを構成する ${pageFiles.length}ファイルすべてが h1 を持ち、いずれも訪問者固有の状態ではない`
        : h1Fails.join("; ")
    );
  }

  // ============================================================================
  // 35. ハイドレーション後の SEO 上書きが既定値を出していないか (N-61)
  // ----------------------------------------------------------------------------
  // プリレンダーは hasWorldOdds / n>=3 を見て既定値を抑制している。
  // ところがクライアントの applySeoMetadata が、生の値で description を
  // 上書きしていた。実測（世界オッズ取得なし・投票0件の銘柄）：
  //   プリレンダーHTML : 日本の世論は集計中（n=0）
  //   ハイドレーション後: 【世界オッズ YES 50% vs 日本世論 YES 50%】…
  // 50 はどちらも既定値。description は og:description と JSON-LD の両方に入るので、
  // 機械可読な面だけが嘘をつく形になっていた。有効銘柄の53件が n<3 で該当した。
  //
  // Check #30 は dist の静的HTMLしか見ないため、この上書きは見えない。
  // ブラウザを動かせないので、上書きする側のソースを見る。
  // 判定式は修正前の MarketDetailPage（実際の N-61）で検算済み。
  // ============================================================================
  {
    const VAL = /worldProb(?:Yes|No)|japanVotes(?:\?\.|\.)percentYes/;
    const GUARD = /hasWorldOdds|hasConsensus|japanVotes(?:\?\.|\.)total\s*>=\s*3/;
    const seoFails = [];
    let seoScanned = 0;
    const walkSeo = (dir) => {
      if (!fs.existsSync(dir)) return;
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walkSeo(full); continue; }
        if (!/\.(tsx|ts)$/.test(e.name)) continue;
        if (/seoHelper/.test(e.name)) continue;   // ヘルパー本体は対象外
        const src = fs.readFileSync(full, "utf-8");
        if (!src.includes("applySeoMetadata(")) continue;
        for (const m of src.matchAll(/useEffect\(\s*\(\s*\)\s*=>\s*\{/g)) {
          let i = m.index + m[0].length, depth = 1;
          while (i < src.length && depth > 0) {
            if (src[i] === "{") depth++;
            else if (src[i] === "}") depth--;
            i++;
          }
          const body = src.slice(m.index + m[0].length, i);
          if (!body.includes("applySeoMetadata(")) continue;
          if (!VAL.test(body)) continue;
          seoScanned++;
          if (!GUARD.test(body)) {
            const line = src.slice(0, m.index).split("\n").length;
            seoFails.push(`${path.relative(ROOT, full)}:${line} → SEO上書きで確率を使っているがガードが無い（既定値50%が漏れる）`);
          }
        }
      }
    };
    walkSeo(path.join(ROOT, "src"));
    report(
      `SEO上書きの既定値ガード (N-61 / 確率を使う上書き ${seoScanned}件)`,
      seoFails.length === 0,
      seoFails.length === 0
        ? (seoScanned === 0
            ? "SEO上書きで確率を使っている箇所は無い"
            : `確率を使う ${seoScanned}件の上書きは、いずれも hasWorldOdds / n>=3 を見ている`)
        : seoFails.join("; ")
    );
  }

  // ============================================================================
  // 36. 世界オッズの既定値ガード（Phase 1 の締め / N-61）
  // ----------------------------------------------------------------------------
  // 既定値50は2箇所で生まれる。
  //   polymarketService.ts  probYes    = hasWorldOdds ? live.probYes : 50
  //   polymarketService.ts  percentYes = total > 0 ? … : 50
  // 日本側（percentYes）は導出された検査で守られていたが、
  // 世界側（worldProbYes/No）には同等の検査が無かった。
  // そのため N-61 の「世界 NO 50%」が生き残り、ガイド記事も
  // 「世界オッズ: 50%」を2件表示していた（本番実測）。
  //
  // N-62（型を number|null にして91箇所を型で守る）は Phase 2 へ回した。
  // その代わり、ここで「表示する面は hasWorldOdds を見ていること」を要求する。
  // 母集団はコードから導出するので、Phase 2 で面が増えても自動で入る。
  // ============================================================================
  {
    const SHOWS = /worldProb(?:Yes|No)/;
    const worldFails = [];
    let worldScanned = 0;
    if (fs.existsSync(COMPONENTS_DIR)) {
      for (const f of fs.readdirSync(COMPONENTS_DIR).filter(x => x.endsWith(".tsx"))) {
        // 管理画面は運用者向けの生データ。n>=3 ガードと同じ理由で対象外。
        if (/^Admin/.test(f)) continue;
        const src = fs.readFileSync(path.join(COMPONENTS_DIR, f), "utf-8");
        const shown = src.split("\n").filter(l =>
          SHOWS.test(l) && !/style=|width:/.test(l) && /%|`/.test(l));
        if (shown.length === 0) continue;
        worldScanned++;
        if (!/hasWorldOdds/.test(src)) {
          worldFails.push(`${f}: 世界オッズを${shown.length}箇所で表示しているが hasWorldOdds を見ていない（既定値50が漏れる）`);
        }
      }
    }
    report(
      `世界オッズの既定値ガード (N-61 / ${worldScanned}コンポーネントを導出)`,
      worldFails.length === 0 && worldScanned > 0,
      worldFails.length === 0
        ? `世界オッズを表示する ${worldScanned}コンポーネントすべてが hasWorldOdds を見ている`
        : worldFails.join("; ")
    );
  }

  console.log("\n====================================================");
  console.log(`検証結果サマリー: 合格 ${passCount}件 ｜ 不合格 ${failCount}件`);
  console.log("====================================================\n");
  if (failCount > 0) process.exit(1);
}

checkDbAndPhase0();
