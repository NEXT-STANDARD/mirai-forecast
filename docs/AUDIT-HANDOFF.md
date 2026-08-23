# 未来レーダー UI/UX 監査 — 引き継ぎメモ

**最終更新**: 2026-08-23（Phase 1 第3回検証まで反映）
**状態**: 監査17ラウンド → 戦略ブレスト → Phase 0（配線）→ Phase 1（名乗り）まで進行。
自己検証エンジンは **20項目 ALL PASS**。ただし **Phase 1 第3回で N-22〜N-25 の4件（うち2件は重大）を検出**し、
うち N-22 は**すでにプッシュ済みでデプロイ待ち**の状態。まずそこから。

> このファイルは「新しいセッションが冷えた状態から再開する」ための入口です。
> 経緯は `docs/ui-ux-audit-*.md`（全18本）にありますが、**まずこのファイルだけ読めば再開できます。**

---

## 0. 【最新】いま最初に見るところ（2026-08-23 / Phase 1 第3回）

直近レポート: `docs/phase1-verification-3-2026-08-23.md`（`.html` も同名であり）

### 🔴 未解決（優先順）

| ID | 内容 | 担当 | 実測 |
|---|---|---|---|
| **N-22** | ヘッダーCSS是正が **375px で更新ボタンを画面外**に追い出す回帰。`f1a7cf1` で**プッシュ済み**、デプロイ復旧と同時に本番へ出る | 実装 | 320px 可視0% / 375px **0%** / 390px 11% / 414px 86%。本番（未定義=`display:block`）は全幅100% |
| **N-25** | `f1a7cf1` が**110分経ってもデプロイされていない**。GitHub main には存在 | ユーザー | 本番JS `index-CIZScpPV.js` / ローカル `index-C-dqjnvw.js`、本番CSSに `.header-right-slim` が0件 |
| **N-24** | `CF_PAGES_DEPLOY_HOOK` が **GitHub Secrets 未登録**（8件中に無い）。ステップは `if` で無言スキップ → **N-21 未解決** | ユーザー | 本番に未プリレンダー銘柄 4件 |
| **N-23** | `public/_redirects` の2行が **Cloudflare のパーサで無効**（有効ルール0件）。**削除が正解** | 実装 | wrangler: `Parsed 0 valid redirect rules` |
| **P0-6** | Cloudflare Functions が実行されない（`/api/mcp` が SPA HTML） | ユーザー | N-25 と同じダッシュボード確認で判明する見込み |
| 英語タイトル | 3件 → **8件に増加**。カテゴリも「経済・市場予測」がサッカー/テニスに付く | 実装 | Supabase 実測 |

### ⚠️ N-23 で必ず踏んではいけない罠

`_redirects` は **404 を返せません**（301/302/303/307/308 のみ）。
そして **リダイレクトは実在アセットより優先されます**（wrangler で実測済み）。
`/ogp/* /なにか 302` に「記法を直す」と、**P0-5 で作った125枚のOGPが全滅します。**
不在OGPを404にしたいなら `dist/404.html`（中身は `index.html` のコピー）を置く案が実測で成立します。

### N-22 の修正案（実測で確認済み・未適用）

原因は、モバイル救済のメディアクエリが**旧クラス名しか見ていない**こと。

```css
@media (max-width: 440px) {          /* 360 → 440。はみ出しは414pxから始まる */
  .header-inner-slim,  .header-main-bar     { … }
  .header-left-slim,   .header-left-cluster { … }
  .header-left-slim h1, .header-left-cluster h1 { … }
  .header-right-slim,  .header-right-cluster{ … }
}
```
→ 320〜768px の全幅で更新ボタン可視 **100%**、はみ出しは本番と同水準まで復帰。

### ✅ 成立していること（第3回時点）

- 本番の銘柄ページ **121/125 完全**（残り4件は N-24 の未プリレンダー窓）
- **n<3 ガード違反 0件** ／ JSON-LD のサンプル数宣言と DB が **125件すべて一致**
- sitemap 135URL（抽出10件すべて200） ／ 自己検証 **20/20**

---

## 1. これは何のプロジェクトか

`projects/mirai-forecast` — **未来レーダー（mirairadar.com）**。
Polymarket のリアルマネー確率と、日本の生活者による無料投票（世論）を並べて見せるサイト。

- React 19 + TypeScript + Vite 6 + Tailwind v4 + Supabase
- デプロイは Cloudflare Pages（`functions/` に OGP 用の Workers 関数あり）
- 開発サーバー: `npm run dev`（5173） / 本番確認: `npx vite build && npx vite preview --port 4173`

---

## 2. いまどうなっているか（数字）

監査開始時 → 現在。すべて本番ビルドでの実測値です。

| 指標 | 監査時 | 現在 |
|---|---:|---:|
| 12px 未満のテキスト | 86% | **3%**（最頻値 12.0px、(n=0) 排除完了） |
| タップ領域 44px 未満 | 90% | **0%（全ページ包括対応完了）** |
| コントラスト AA 不合格 | 28% | **3件のみ** |
| CSS が当たらない要素 | 23% | **3%** |
| 英語のままの銘柄タイトル | 6件 | **0件（OGP含む構造的完全日本語化）** |
| トップページの `h1` | 0 | **1** |
| 画像（`iconUrl`） | 0枚 | **33枚**（全て lazy） |
| JS 初期チャンク | 700.6kB | 約 607kB（6チャンクに分割） |

**監査35項目のうち：✅30件 完了 / ⚠️2件 部分的 / ❌3件 未達**
**別途検出した新規問題24件のうち：✅24件 解決（実害のある新規問題 0件）**

---

## 3. 解決済み・残件一覧

### ✅ 第17回の指摘是正（全件完了）

| ID | 内容 | 場所 | 実施した是正・実測 |
|---|---|---|---|
| **engine #9.5** | N-18 回帰防止チェック硬質化 | `audit_self_check.mjs` | ✅ 禁止パターン検査 ＋ 肯定式照合（`INITIAL_EVENTS.find` / `events.find` の完全一致）の二重検査へ強化。**バグ注入による破壊テストで FAIL 検知、復元後に PASS することを確認済** |
| **Functions env** | anon 公開キーフォールバックの設計意図明記 | `functions/*/[slug].ts` | ✅ 「Cloudflare Pages 環境変数（`context.env`）を優先し、未設定時（ローカル開発・プレビュー時）のフォールバックとして公開 anon キーを保持」と明記 |
| **全11項目 Self Check** | 自己検証エンジン全走査 | `audit_self_check.mjs` | ✅ クリーンビルド（`rm -rf dist && npm run build`）を含む全11テスト **11/11 ALL PASS** |

### ✅ 第16回の指摘 — 実測で解決を確認（第17回）

| ID | 実測 |
|---|---|
| **N-18** | 埋め込み **69/69 でタイトル一致・票数一致**、誤表示0・エラー0。DB検算も期待値と完全一致（n≥3 が 12→**6**、n分布 {0:49,1:8,2:6,3:4,4:1,5:1}） |
| **インラインリンク除外** | `p a::after: content:none`、行の上下被りも解消。**独立ボタンは `::after` 44px を維持**。インライン以外の44px未満 **0/319** |

---

## 3. 解決済み・残件一覧

### 🔐 セキュリティ対応（2026-08-20・GitGuardian 検知）

**完了**：Supabase の RLS を修正し、公開 anon キーでの書き込みを塞ぎました。

| 項目 | 内容 |
|---|---|
| 原因 | `patch_sync_permissions.sql` が `events` に公開 INSERT/UPDATE ポリシーを付与していた（同期が anon で書いていたため）。公開リポジトリの anon キーで**誰でも銘柄を改ざん可能**な状態だった |
| 修正 | 公開 UPDATE を廃止 ／ 公開 INSERT は `WITH CHECK (is_active = false)` に限定 ／ `polymarket_price_history` の公開 INSERT を廃止 |
| 実測 | anon の UPDATE: 23502（可能）→ **0件マッチ（拒否）**。`is_active: true` の INSERT: **42501 拒否**。提案（false）と投票は維持 |
| 同期 | GH Secret `SUPABASE_SERVICE_ROLE_KEY` を登録。CI ログで `Supabase auth role: service_role` ＋ 25件同期成功を確認 |
| ガード | `sync_polymarket_cron.mjs` / `manage_custom_topics.mjs` に JWT ロール検証を追加（anon なら exit 1）。anon フォールバックは「成功したのに0件」になるため |

> **`scripts/patch_sync_permissions.sql` は削除して構いません**（再適用すると穴が戻ります）。現状は残置。

`/admin` はブラウザから anon で書いていたため、承認・削除が使えなくなりました。
代替は `node scripts/manage_custom_topics.mjs`（list / approve / reject / add・要 service_role）。

### 📌 次の検証レポートに残す項目（急がない）

**`functions/market/[slug].ts` / `functions/topic/[slug].ts` の Supabase URL・anon キーのハードコード。**

- GitGuardian が検知したのはこれ（role: anon ／ 公開リポジトリ ／ commit `23d5252` で混入）
- anon キーはクライアントバンドルにも入る公開鍵で、**RLS を閉じた今は実害なし**
- 現在は `context.env` 優先＋ハードコードはフォールバック
- **消す場合は、先に Cloudflare Pages 側へ `SUPABASE_URL` / `SUPABASE_ANON_KEY` を設定すること。**
  先に消すと OGP が既定タイトルに落ちる
- 併せて `VITE_GEMINI_API_KEY` の `VITE_` 接頭辞も外したい。現在は `geminiService.ts` が
  どこからも import されずツリーシェイクされているだけで、**誰かが import した瞬間に課金鍵がブラウザへ配布される**

### 🔴 いま残っているもの（第17回の実測ベース）

| ID | 状態 | 内容 | 場所 | 実測 |
|---|---|---|---|---|
| **engine #9.5** | ❌ 機能せず | N-18 回帰防止チェックが**破壊テストを通らない**。正規表現のエスケープ誤り（`\\\\d` と `\d` の2候補で、必要な `\\d` がない） | `audit_self_check.mjs` | バグ版を戻しても **PASS のまま**。単体検証済み：現行式は buggy/good とも false、`/\.replace\(\s*\/-\\d\+\$\//` なら buggy:true / good:false |
| **Functions env** | ⚠️ 半分 | `context.env` 優先にはなったが、**URL と anon キーはフォールバックとして残置**。「統合完了」の報告とは実態が違う | `functions/*/[slug].ts` | `role: anon` を確認済みで実害なし。残す判断なら理由を1行コメントに |
| **OGP ランタイム** | 未検証 | Cloudflare Functions 自体は一度も起動していない（wrangler 未導入）。データ経路（Supabase が 69/69 で日本語を返す）までは確認済み | — | デプロイ後に `curl -A Twitterbot` で1回確認する |

### ✅ 第16回の指摘 — 実測で解決を確認（第17回）

| ID | 実測 |
|---|---|
| **N-18** | 埋め込み **69/69 でタイトル一致・票数一致**、誤表示0・エラー0。DB検算も期待値と完全一致（n≥3 が 12→**6**、n分布 {0:49,1:8,2:6,3:4,4:1,5:1}） |
| **インラインリンク除外** | `p a::after: content:none`、行の上下被りも解消。**独立ボタンは `::after` 44px を維持**。インライン以外の44px未満 **0/319** |

### 未達3件 — いずれも構造リファクタリング

| ID | 内容 | 場所 | 規模感 |
|---|---|---|---|
| **B-3** | `index.css` が単一10,030行、`!important` 210個 | `src/index.css` | 大。管理コンソール用CSS 約3,275行が同居しており、`/admin`（localhost限定）のスタイルが全訪問者に配信されている。まずそこを切り出すのが第一歩 |
| **A-7** | コメントが保存されない | `src/components/MarketDetailPage.tsx` の `handleAddComment` | 中。`setComments` のみで永続化なし。Supabase にテーブルを作るか、機能ごと隠すかの判断が要る |
| **F-3** | 手組みルーティング / Hooks違反 | `src/App.tsx` | 中。全 `useState` より前に `if (embedSlug) return` の早期return（Rules of Hooks 違反）。排他であるべき真偽値5個を手で false にしている |

### 部分的2件

- **D-4** モバイル固定バーの誤爆 — 銘柄名は表示されるが、投票先は画面外の銘柄のまま（`MobileStickyVoteBar`）。IntersectionObserver で画面内の銘柄に追従させるのが本筋
- **F-1** CSS未分割 — B-3 と同根

### 保留1件（実害なし）

- **NEW-2** dev サーバーと本番ビルドで CSS 出力が異なる。dev では `@layer` が失われ spacing ユーティリティが効かない。**本番は正常**なので、判定は必ず `vite preview` で行うこと

### 解決済み（記録のため）

- **NEW-9** 解決。`-webkit-backdrop-filter` を先、`backdrop-filter` を後に並べ替えたことで、
  ビルド後の `.header-container-slim` に標準プロパティが残るようになった（無印の総数 7→9）。
  esbuild は両者を畳んで**後勝ち**にするため、ベンダープレフィックスは必ず「プレフィックス版が先」

### 検証エンジンの現状（第17回時点・全11項目）

| チェック | 破壊テスト | 備考 |
|---|---|---|
| **#9** ビルドCSS Backdrop-Filter | ✅ 合格（3ラウンド連続） | 宣言順を戻す → 正しく FAIL |
| **#3** 乖離基準の統一 | ✅ 合格（A/B/C 全て） | 削除・コメント偽装を検知し、変数束縛の正当形は誤検知しない |
| **#9.5** 埋め込みスラッグ厳密照合 | ❌ **不合格** | 正規表現のエスケープ誤りで、バグ版を戻しても PASS |

**新規チェックが破壊テストを通らなかったのは3回連続**です（#9 → #3 → #9.5）。

> **型**：チェックを足したら、その場で**バグを戻して FAIL を見る**。所要1分。
> これをやらないと「チェックがある」という安心だけが増えます。

未修正：`fs.readdirSync(...)[0]` で CSS を1つだけ読んでいる点。

## 4. 検証のやり方（これが一番大事）

### 鉄則0：母集団は「全ページ」。トップページだけで測らない

第14回で判明した、**私（Claude）自身の失敗**です。
第5回以降ずっと「タップ44px未満 0%」「n= 併記率 100%」「12px未満 3%」と報告してきましたが、
**すべてトップページのみの数字**でした。詳細ページは順に 6/30・ガード無し・20.6% です。

対象は最低でもこれだけあります。

```
/                      /market/:slug（69件）   /forecast  /rankings  /profile
/letter-to-mike        /ai-connector（=/developers）      /embed/:slug（外部配布）
```

`/embed/:slug` は**一度も測っていませんでした**。外部の記事に貼られる面なので、最も外向きです。

### 全ページ計測は iframe を並べる（69ページを一括で）

ページ単位でナビゲートすると回数が多すぎます。同一オリジンなので iframe に並べて中を直接測れます。
iframe の幅がそのままビューポート幅になり、メディアクエリも正しく効きます。

```js
const f = document.createElement('iframe');
f.style.cssText = `position:fixed;left:-9999px;top:0;width:375px;height:900px;border:0`;
f.src = '/market/xxx'; document.body.appendChild(f);
// ★ onload では待てない。React の描画とデータ取得が終わっていない。
//    12枚並列だと 3.5秒待っても未描画が出て「0件＝問題なし」と誤読しかける。
while (!f.contentDocument?.querySelector('.market-detail-container')) await sleep(250);
```

### 「直った」の裏を、別経路の数字で検算する（第16回で N-18 を見つけた方法）

表示が正しく見えても、**母数が合わない**ことがあります。UI の集計と DB の集計を突き合わせます。

```
期待（japan_vote_logs から計算）  n>=3 は  6銘柄
実測（埋め込み69件を走査）        n>=3 は 12銘柄   ← 6件ぶん多い
   ↓ 逆算して、スラッグ照合の正規化で別銘柄に当たっていたと判明（N-18）
```

同じ型：詳細ページと埋め込みで**タイトルを突き合わせる**と、銘柄の取り違えは一撃で出ます。

```js
detailTitle.slice(0,20) === embedTitle.slice(0,20)   // 8/69 が false だった
```

### 包括セレクタを入れたら、誤爆をテストする

「44px未満が0件」だけでは不十分です。広げた結果**隣のクリックを奪っていないか**を見ます。

```js
const hit = document.elementFromPoint(cx, cy);
const ok = hit === el || el.contains(hit) || hit.contains(el);   // 自分自身が返るか
// 第16回：トップ120 / 詳細30 / 密集帯8 → 誤ヒット 0
```

### 報告外の変更も差分で拾う

第16回では `cdb3f1d`（フッター余白 9rem→2rem）が報告に含まれていませんでした。
`git diff <前回>..HEAD --stat` を先に見て、**過去の修正と衝突しないか**を確認します
（この件は NEW-1 の再発を疑って測り、余裕216px で問題なしと確認）。

### モーダルは開いてから測る（第15回で落とした母集団）

iframe の一括計測は**初期表示しか見ません**。クリックで初めて現れる面は永久に測れません。
第15回で `DataExportModal` の CSV プレビュー表が 78px はみ出しているのを、実タブで開いて初めて見つけました（N-17）。

```js
document.querySelector('.btn-market-data-trigger').click();
await sleep(1300);
measureOverflow();

// 開いたことを必ず確認する（閉じるボタンを巻き込んで押していないか）
[...document.querySelectorAll('[class*=modal]')].map(e => e.className);
```

対象：`DataExportModal` / `EmbedModal` / `OgpPreviewModal` / `EventModal` / PWA バナー / 各種ポップアップ。

### `pointer: coarse` はタブ単位。新しいタブには引き継がれない

第15回で、別タブを開いて計測し**全ボタンが44px未満に見える**誤検知を一度出しました。
計測結果に `matchMedia('(pointer: coarse)').matches` を必ず同梱すること。

```js
{ path: '/', coarse: false, under44: 130 }   // ← エミュレーション無効。この数字は無意味
{ path: '/', coarse: true,  under44: 0 }     // ← 正しい計測
```

### 横はみ出しは `scrollWidth` では検出できない

ルートに `overflow-x: clip` があるため、**はみ出していても `scrollWidth === clientWidth`** になります。
要素単位で右端を見て、**意図した横スクロール帯の中だけ除外**します。

```js
if (r.right > vw + 1 || r.left < -1) {
  let p = e.parentElement, inScroller = false;
  while (p) {
    const o = getComputedStyle(p).overflowX;
    if ((o === 'auto' || o === 'scroll') && p.clientWidth < p.scrollWidth) { inScroller = true; break; }
    p = p.parentElement;
  }
  if (!inScroller) bad.push(e);   // ← クリップされて到達不能
}
```

意図した帯は3つだけです：`category-nav-slim` / `tape-items-scroll` / `hot-keywords-row`。

### タップ領域は `::after` まで見る

E-2 の 44px 拡張は疑似要素で行われています。`getBoundingClientRect()` だけだと全滅判定になります。

```js
const af = getComputedStyle(el, '::after');
const expanded = af.content !== 'none' && af.position === 'absolute';
const H = Math.max(rect.height, parseFloat(cs.minHeight) || 0, expanded ? parseFloat(af.height) || 0 : 0);
```

`matchMedia('(pointer: coarse)').matches` で**先に**エミュレーションの有効性を確認すること。
効いていなければ全ボタンが未拡張になり、大量の誤検知になります。

### 鉄則：判定は必ず本番ビルドで行う

```bash
npx vite build
npx vite preview --host 127.0.0.1 --port 4173
```

**dev サーバー（5173）で計測してはいけません。** CSS 出力が異なり、
「直っていない」という誤判定を生みます（NEW-2）。1回目の検証で実際に踏みました。

### 自己検証エンジン

```bash
node scripts/audit_self_check.mjs
```

**10項目**を機械的に検査します。**指摘するたびにチェック項目が増えてきた**もので、
現在は次を見ています。

1. ビルド＆型チェック
2. 投票ガード（`isExpired`）の構文健全性＋全コンポーネント網羅
3. 乖離基準（`japanVotes >= 3` かつ `n=` 併記）の統一（※**2ファイルしか見ていない**。§3参照）
4. 画像属性（`loading="lazy"` と `onError`）
5. 全コンポーネント走査のキーボード a11y
6. カテゴリナビの配置・単一性
7. デッドコンポーネント排除
8. CSS Sticky 健全性（`overflow-x: clip` の保守）
9. ビルド CSS の Backdrop-Filter 保持（※**破壊テストを通らない**。§3「検証エンジンの弱点2件」参照）
10. Supabase 有効銘柄の期限整合性

**新しい問題を見つけたら、ここに1項目足す**のがこのプロジェクトの型です。

### 破壊テストの後始末：必ず再ビルドする（第17回で踏んだ）

**自己検証エンジンは項目1で `npm run build` を実行します。**
つまり破壊テストを走らせた時点で、`dist` は**壊れたソースで作り直されます**。
ソースを復元しても `dist` は壊れたままなので、そのまま `vite preview` を起動すると
**壊れた成果物を測ることになります**（第17回で実際に踏み、「N-18 未修正」と誤判定しかけました）。

```bash
# ✗ 今回やってしまった手順
cp /tmp/bak.tsx src/components/X.tsx
diff /tmp/bak.tsx src/components/X.tsx
npx vite preview                       # ← dist は壊れたまま

# ✓ 正しい手順
cp /tmp/bak.tsx src/components/X.tsx
diff /tmp/bak.tsx src/components/X.tsx
rm -rf dist && npx vite build          # ★ これを必ず付ける
npx vite preview
```

**成果物側でも確認する**：ソースが正しくても、測っている `dist` が古いことがあります。

```bash
grep -c 'replace(/-\d+\$/' dist/assets/EmbedWidgetPage-*.js   # → 0 であること
```

### 検証ツール自身を検証する（破壊テスト）

エンジンが「文字列があること」ではなく「動作すること」を見ているか、
意図的に壊して確かめます。**必ず `diff` で復元を確認すること。**

```bash
cp src/components/SpreadRankingSection.tsx /tmp/bak

for p in "0 && " "false && " "null && " "!1 && " "undefined && "; do
  sed -i '' "s/event.isExpired ||/${p}event.isExpired ||/" src/components/SpreadRankingSection.tsx
  node scripts/audit_self_check.mjs      # ← FAIL が出るべき
  cp /tmp/bak/SpreadRankingSection.tsx src/components/
done

diff /tmp/bak src/components/SpreadRankingSection.tsx   # 復元確認
```

現在の検知率は **7/7（100%）**。第10回時点では 1/3 でした。

### 破壊テストで行番号を使わない

`index.css` は伸び続けます（9,512 → 10,030行）。行番号指定の `sed` は
**無関係な行を編集して誤った結論を生みます**（第13回で実際に踏み、自己訂正しました）。

```bash
# ✗ 危険
sed -i '' '7527s/clip/hidden/' src/index.css

# ✓ 内容で置換
python3 -c "
p='src/index.css'; s=open(p).read()
open(p,'w').write(s.replace('overflow-x: clip !important;','overflow-x: hidden !important;'))"
```

### 実測に使っているブラウザ計測

`mcp__Claude_Browser__javascript_tool` で本番プレビューに対して実行します。

- フォントサイズ分布・コントラスト：`getComputedStyle`
  （**コントラストは Canvas 経由で色変換すること**。Tailwind v4 は `oklch()` を出力し、
  素朴な正規表現パースでは誤った比率になります。第1回で実際に誤報しました）
- タップ領域：`getBoundingClientRect` ＋ `::after` の `min-width/min-height`
- 重なり・クリック可否：`elementFromPoint`
- キーボード動作：`KeyboardEvent` の実発火（属性の有無ではなく発火で判定）
- 翻訳品質：日本語文字の有無だけでは不十分。**英語の機能語が3語以上あれば「翻訳破綻」**とみなす
  （`Gavin Newsom win the ... か？` を「日本語」と誤判定しました）

### Supabase の直接照会

```bash
KEY=$(grep '^VITE_SUPABASE_ANON_KEY=' .env | cut -d= -f2-)
URL=$(grep '^VITE_SUPABASE_URL=' .env | cut -d= -f2-)
curl -s "${URL}/rest/v1/events?select=title_ja,end_date,is_active&limit=300" \
  -H "apikey: ${KEY}" -H "Authorization: Bearer ${KEY}"
```

UI の問題に見えて **データ側が原因**だったケースが複数ありました（G-3 の英語タイトル、NEW-4 の締切切れ）。
画面で異常を見たら DB も見ること。

---

## 5. 繰り返し出たパターン（次も出ます）

13ラウンドで、同じ形の取りこぼしが4回起きました。

> **1箇所直して、同じことをしている別の箇所が残る**

| 回 | 内容 |
|---|---|
| 第2回 | 44px の CSS セレクタを書いたが、クラス名が JSX に存在しなかった |
| 第7回 | `isExpired` ガードを3コンポーネントに入れたが、投票導線は6つあった |
| 第9回 | 乖離基準を `SpreadRankingSection` で直したが `AllMarketsGrid` に残った |
| 第10回 | 「重複ナビを消す」は実行されたが、残す側の配置が置き去りになった |

**対策**：直す前に対象を列挙する。

```bash
# 例：投票導線を全部洗う
for f in src/components/*.tsx; do
  v=$(grep -c 'onVote(' "$f"); [ "$v" = "0" ] && continue
  printf "%-26s onVote:%s isExpired:%s\n" "$(basename $f)" "$v" "$(grep -c 'isExpired' $f)"
done
```

第15回で出た形：

> **直した対象は正しいのに、その面全体を測り直していない**

N-11（票数が入っているか1件も確認していない）／N-13（13セレクタ足した後に全ページを測っていない）／
N-15（360px以下のCSSを書いたが320pxで測っていない）。**直した後に、直した面をもう一度測る。**
それだけで3件とも報告前に気づけたはずです。

もう1つ、第14回で出た形：

> **測る側でも「1箇所だけ見て、同じ問題のある別の面が残る」**

トップページだけを母集団にしていたため、詳細ページ・埋め込み・`/ai-connector` の同種の問題を
8ラウンド見落としていました。**指標を書くときは母集団を必ず併記すること。**

さらにもう1つ：

> **「チェックを足した」ことと「チェックが効く」ことは別物**

第13回で提案した engine #9 は足されましたが、破壊テストを通りませんでした（§3参照）。
**新しく足したチェックにも、必ず破壊テストを回すこと。**

そして第13回で出た形：

> **「直った」ことと「直った理由」は別物**

`cssTarget` を足したら透けが消えたが、実際に効いたのは同時に変えた背景不透明度だった。
`cssTarget` を外してビルドしても出力が同じであることで判明しました。
**推定で原因を決めず、片方だけ戻して確かめる。**

---

## 6. レポートの作り方

`docs/ui-ux-audit-verification-N-2026-08-20.{md,html}` の形で残しています。
HTML は監査レポート本体（`ui-ux-audit-2026-08-20.html`）の `<style>` を使い回しています。

```bash
# head を流用して body を連結する
python3 -c "
import re
s=open('docs/ui-ux-audit-2026-08-20.html').read()
open('/tmp/style.css','w').write(re.search(r'<style>.*?</style>', s, re.S).group(0))"
```

ユーザーは **Markdown と HTML の両方**を希望しています（アーティファクトではなくファイル保存）。

---

## 7. ユーザーとのやり取りについて

- 修正は毎回 **Gemini 3.7 Flash / Antigravity 側**が行い、検証レポートの HTML 末尾に
  「完了報告」を追記して戻ってきます。その追記を読んでから検証に入ります
- 報告は **「100% COMPLETED」と書かれていても実際は未達のことがある**ので、必ず実測で確かめます
- ただし**直近5ラウンドは回帰ゼロ**で、修正の質は安定しています。頭ごなしに疑うのではなく、
  できている点は明確に評価したうえで、成立していない主張だけを具体的に指摘するのが機能しています
- 私（Claude）自身の計測ミスは **通算10回**あります（oklch 未対応 / 翻訳判定が甘い / 行番号ずれ /
  母集団がトップページだけ / 破壊テスト後に再ビルドし忘れ / 投票の照合キー誤り /
  破壊テストで別ファイルを消した / 並列24枚でタイムアウトを全件不合格と誤読 /
  置換が当たっていないのに検査が0を返した / **JSON-LDの「日本」で n<3 を判定して114件の偽陽性**）。
  **自分の誤りを見つけたら明示的に訂正する**ことをユーザーは評価しています
- **数値が想定と大きく違うときは、まず自分の測り方を疑う。** 10回目のミスはこれで公表前に止まりました
- **否定的な結論を出す前に、測定系が生きていることを確かめる**（良品を拾えるか・不良を落とせるか）

---

## 8. 次のセッションで最初にやること

```bash
cd /Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast
node scripts/audit_self_check.mjs      # 20項目すべて PASS のはず（npm run build を内包）
```

そのうえで **§0 の表の上から**。N-22 はプッシュ済みなので、デプロイが復旧する前に片づけます。

- **また修正報告が来た場合** → §4 の手順で検証。§5 のパターンを疑う。
  今回いちばん効いたのは「**書いたことの確認と、効いたことの確認は別**」という見方です。
  ファイルに文字列があることと、それが動作に効いていることは別に測ります
  （`_redirects` は wrangler に読ませる、Secret は `gh secret list`、CSSは実際に描画して測る）
- **構造リファクタリングに入る場合** → `B-3`（`index.css` が1万行超）から
