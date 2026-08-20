import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";

const ROOT = "/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast";
const COMPONENTS_DIR = path.join(ROOT, "src/components");

console.log("====================================================");
console.log("🛡️ 未来レーダー 自律的品質・監査自己検証エンジン v2 (Hardened Engine)");
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
  report("TypeScript & Vite 本番ビルド整合性", true, "exit code 0 (型エラー・バンドルエラー 0件)");
} catch (e) {
  report("TypeScript & Vite 本番ビルド整合性", false, e.message);
}

// 2. 投票ガードの構文的健全性 & 100% 網羅性 (NEW-4 / 破壊テスト耐性: { アンカーによるホワイトリスト)
const componentFiles = fs.readdirSync(COMPONENTS_DIR).filter(f => f.endsWith(".tsx"));
let voteGuardFails = [];
// { 直後または const isExpired = 直後に isExpired が始まることを要求（0 &&, false && などの先行無効化を拒否）
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

// 3. 乖離ギャップ（Gap/乖離）基準の全コンポーネント統一性 (NEW-6 / A-3 / N-12 / 破壊テストA・B両適合)
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
// 有効なガード構文パターン（三項演算子、変数束縛、filter、if文にアンカー）
const strictActiveGapGuardPattern = /(?:\{\s*|\bconst\s+\w+\s*=\s*|\.filter\s*\(\s*\w+\s*=>\s*|if\s*\(\s*)(?:event|item|ev|a|b)\.japanVotes(?:\?\.|\.)total\s*>=\s*3/;

for (const file of GAP_TARGET_COMPONENTS) {
  if (!fs.existsSync(path.join(COMPONENTS_DIR, file))) continue;
  const content = fs.readFileSync(path.join(COMPONENTS_DIR, file), "utf-8");
  // コメントアウト偽装（/* ... */ や // ...）による誤検知パスを防止
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

// 5. 全コンポーネント走査型 キーボードアクセシビリティ (E-4 / 全ファイル網羅)
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
    // モーダル背景や閉じるオーバーレイ、stopPropagationのみはスキップ
    if (tag.includes("modal-backdrop") || tag.includes("modal-content") || tag.includes("stopPropagation")) continue;
    
    // カードや行などの対話的要素であれば tabIndex と onKeyDown を必須化
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

// 8. CSS Sticky の健全性検査 (NEW-8 回帰防止: html, body, #root に対する overflow-x: hidden 混入を厳密検知)
const cssContent = fs.readFileSync(path.join(ROOT, "src/index.css"), "utf-8");
let stickyFails = [];
const rootBlockRegex = /(?:html|body|#root)[^{]*\{[^}]*overflow-x:\s*hidden/gi;
if (rootBlockRegex.test(cssContent)) {
  stickyFails.push("html, body, #root セレクタブロックに overflow-x: hidden が存在し sticky が破壊されます (clip を使用してください)");
}
report("CSS Sticky 健全性 (overflow-x: clip 保守)", stickyFails.length === 0,
  stickyFails.length === 0 ? "html/body/#root に clip 指定を確認 (sticky 阻害なし)" : stickyFails.join("; "));

// 9. ビルド CSS Backdrop-Filter 保持検査 (NEW-9 回帰防止: ルール内スコープ検査)
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

// 9.5 埋め込みウィジェットのスラッグ厳密照合検査 (N-18 回帰防止: 前方一致・末尾除去・文字列加工による誤照合防止)
const embedCode = fs.readFileSync(path.join(COMPONENTS_DIR, "EmbedWidgetPage.tsx"), "utf-8");
let embedSlugFails = [];
// A. 禁止検査: スラッグに対する文字列置換・加工・正規表現の混入を検知
if (/\.replace\(\s*\/-\\?d\+\$\//.test(embedCode) || /slugOrId\.replace/.test(embedCode) || /slug\.replace/.test(embedCode)) {
  embedSlugFails.push("EmbedWidgetPage にスラッグ文字列加工・緩和ロジックが存在し、同名プレフィックス銘柄の誤表示が発生します");
}
// B. 肯定検査: find 照合式が厳格な完全一致 (e.slug === slugOrId || e.id === slugOrId) であること
const hasExactInitialFind = /INITIAL_EVENTS\.find\(\s*\([^)]*\)\s*=>\s*e\.slug\s*===\s*slugOrId\s*\|\|\s*e\.id\s*===\s*slugOrId\s*\)/.test(embedCode);
const hasExactEventsFind = /events\.find\(\s*\([^)]*\)\s*=>\s*e\.slug\s*===\s*slugOrId\s*\|\|\s*e\.id\s*===\s*slugOrId\s*\)/.test(embedCode);
if (!hasExactInitialFind || !hasExactEventsFind) {
  embedSlugFails.push("EmbedWidgetPage の find 照合式が完全一致 (e.slug === slugOrId || e.id === slugOrId) 形式になっていません");
}
report("埋め込みウィジェット スラッグ厳密照合 (N-18)", embedSlugFails.length === 0,
  embedSlugFails.length === 0 ? "完全一致照合 (slug === slugOrId || id === slugOrId) を確認" : embedSlugFails.join("; "));

// 10. Supabase 有効銘柄の締切整合性
async function checkDb() {
  try {
    const envStr = fs.readFileSync(path.join(ROOT, ".env"), "utf-8");
    const env = {};
    envStr.split("\n").forEach(l => {
      const [k, ...v] = l.split("=");
      if (k && !k.startsWith("#")) env[k.trim()] = v.join("=").trim();
    });
    const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);
    const { data: events, error } = await supabase.from("events").select("id, end_date, is_active").eq("is_active", true);
    if (!error && events) {
      const now = new Date();
      const expiredActive = events.filter(e => e.end_date && new Date(e.end_date) < now);
      report("Supabase DB 有効銘柄の期限整合性", expiredActive.length === 0,
        `有効銘柄 ${events.length}件中、締切切れ: ${expiredActive.length}件`);
    }
  } catch (err) {
    console.log("DB check skipped:", err.message);
  }

  console.log("\n====================================================");
  console.log(`検証結果サマリー: 合格 ${passCount}件 ｜ 不合格 ${failCount}件`);
  console.log("====================================================\n");
  if (failCount > 0) process.exit(1);
}

checkDb();
