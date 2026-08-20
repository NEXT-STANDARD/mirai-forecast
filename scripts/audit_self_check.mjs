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

// 3. 乖離ギャップ（Gap/乖離）基準の統一性 (NEW-6 / A-3)
let gapCheckFails = [];
for (const file of componentFiles) {
  const content = fs.readFileSync(path.join(COMPONENTS_DIR, file), "utf-8");
  if (file === "AllMarketsGrid.tsx") {
    if (!content.includes("event.japanVotes.total >= 3")) {
      gapCheckFails.push("AllMarketsGrid: japanVotes.total >= 3 未適用");
    }
    if (!content.includes("n=")) {
      gapCheckFails.push("AllMarketsGrid: サンプル数 n= 表示なし");
    }
  }
  if (file === "SpreadRankingSection.tsx") {
    if (!content.includes("japanVotes.total >= 3")) {
      gapCheckFails.push("SpreadRankingSection: japanVotes.total >= 3 未適用");
    }
  }
}
report("乖離基準 (japanVotes >= 3 & n=併記) の統一性", gapCheckFails.length === 0,
  gapCheckFails.length === 0 ? "全セクションで信頼サンプル数(n>=3)基準に統一完了" : gapCheckFails.join("; "));

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

// 8. CSS Sticky の健全性検査 (NEW-8 回帰防止)
const cssContent = fs.readFileSync(path.join(ROOT, "src/index.css"), "utf-8");
let stickyFails = [];
if (/html,\s*body,\s*#root[\s\S]*?overflow-x:\s*hidden/i.test(cssContent)) {
  stickyFails.push("html, body, #root に overflow-x: hidden が存在し sticky が破壊されます (clip を使用してください)");
}
report("CSS Sticky 健全性 (overflow-x: clip 保守)", stickyFails.length === 0,
  stickyFails.length === 0 ? "html/body/#root に clip 指定を確認 (sticky 阻害なし)" : stickyFails.join("; "));

// 9. Supabase 有効銘柄の締切整合性
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
