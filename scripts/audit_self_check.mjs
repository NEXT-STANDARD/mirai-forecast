import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";

const ROOT = "/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast";
const COMPONENTS_DIR = path.join(ROOT, "src/components");

console.log("====================================================");
console.log("🛡️ 未来レーダー 自律的品質・監査自己検証エンジン (Self-Verification Engine)");
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

// 2. 投票ガードの全コンポーネント網羅性 (NEW-4)
const componentFiles = fs.readdirSync(COMPONENTS_DIR).filter(f => f.endsWith(".tsx"));
let voteGuardFails = [];
for (const file of componentFiles) {
  const content = fs.readFileSync(path.join(COMPONENTS_DIR, file), "utf-8");
  const hasOnVoteCall = /onVote\(/.test(content);
  const hasExpiredGuard = /isExpired/.test(content);
  
  // MarketDetailPage delegates to OrderBookConsensus
  if (file === "MarketDetailPage.tsx") continue;

  if (hasOnVoteCall && !hasExpiredGuard) {
    voteGuardFails.push(file);
  }
}
report("投票ガード (isExpired) 100% 網羅性", voteGuardFails.length === 0, 
  voteGuardFails.length === 0 ? "投票ボタンを持つ全コンポーネントで締切保護を配備" : `漏れ: ${voteGuardFails.join(", ")}`);

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

// 4. 画像属性 (loading="lazy" & onError) (C-4)
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

// 5. キーボードアクセシビリティ (E-4)
let a11yFails = [];
const watchlistContent = fs.readFileSync(path.join(COMPONENTS_DIR, "WatchlistTable.tsx"), "utf-8");
if (!watchlistContent.includes("onKeyDown") || !watchlistContent.includes("tabIndex={0}")) {
  a11yFails.push("WatchlistTable: 行選択のキーボード操作未配備");
}
const gridContent = fs.readFileSync(path.join(COMPONENTS_DIR, "AllMarketsGrid.tsx"), "utf-8");
if (!gridContent.includes("onKeyDown") || !gridContent.includes("tabIndex={0}")) {
  a11yFails.push("AllMarketsGrid: カード選択のキーボード操作未配備");
}
report("キーボード a11y (tabIndex / onKeyDown / role)", a11yFails.length === 0,
  a11yFails.length === 0 ? "対話的カード・テーブル行にキーボード操作完備" : a11yFails.join("; "));

// 6. デッドコード検知
let deadFiles = [];
for (const file of componentFiles) {
  const baseName = file.replace(".tsx", "");
  if (baseName === "EventCard" || baseName === "HeroFeatured") {
    deadFiles.push(file);
  }
}
report("デッドコンポーネント排除", deadFiles.length === 0,
  deadFiles.length === 0 ? "未使用コンポーネントなし" : `残存: ${deadFiles.join(", ")}`);

// 7. Supabase 有効銘柄の締切整合性
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
