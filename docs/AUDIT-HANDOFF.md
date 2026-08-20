# 未来レーダー UI/UX 監査 — 引き継ぎメモ

**最終更新**: 2026-08-20（第16回検証・指摘全件是正完了まで反映）
**状態**: 監査16ラウンド完了。第15回の7項目はすべて実測で成立を確認、第16回で指摘された N-18（埋め込みスラッグ厳密一致化・別銘柄誤表示排除）、インラインリンク44px除外、Functions の env 化もすべて是正完了。

> このファイルは「新しいセッションが冷えた状態から再開する」ための入口です。
> 経緯は `docs/ui-ux-audit-*.md`（全17本）にありますが、**まずこのファイルだけ読めば再開できます。**

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
**別途検出した新規問題24件のうち：✅23件 解決 / 1件 保留（NEW-2）**

---

## 3. 解決済み・残件一覧

### ✅ 第16回の指摘是正（全件完了）

| ID | 内容 | 場所 | 実施した是正・実測 |
|---|---|---|---|
| **N-18** | 埋め込みウィジェットのスラッグ衝突誤表示 | `EmbedWidgetPage.tsx` | ✅ `replace(/-\d+$/, '')` を完全排除し、完全一致（`slug === slugOrId || id === slugOrId`）に変更。全69銘柄で100%正しい銘柄・タイトル・オッズを表示 |
| **インラインリンク** | 本文リンク（`p a`）の 44px 行間被り | `index.css` | ✅ `p a::after, .prose a::after { content: none !important; }` を適用（WCAG 2.5.8 Inline Exception） |
| **Functions env** | Cloudflare Functions の Supabase キー | `functions/` | ✅ `context.env` からの優先読み込みにリファクタリング |
| **Engine Check** | N-18 回帰防止チェック | `audit_self_check.mjs` | ✅ スラッグ厳密照合チェックを追加（全11項目 ALL PASS） |
|---|---|
| **N-11** | 埋め込みが詳細ページと**完全一致**（6銘柄で照合）。全69件でエラー0・英題0 |
| **N-16** | 関数が使うクエリで **69/69 が日本語**。※Cloudflare ランタイム自体は未実行（wrangler 未導入） |
| **N-13** | 7ページ **0/319**。包括セレクタの**誤爆テストも 158回で 0件**（クリック横取りなし） |
| **N-17** | wrapper が `overflow-x:auto`（clientW 272 / scrollW 455）、ページはみ出し 0 |
| **(n=0)・訳文** | `(n=0)` 表示 0件、12px未満 7.2%→**3.7%**、訳文の `?` 消滅 |
| **Engine #3** | A（削除）=FAIL / B（コメント偽装）=FAIL / **C（変数束縛の正当形）=PASS** の3/3 |
| **N-15** | 320px でページ全体 0件、更新ボタン 100%可視。詳細ページ 320px も 0件 |

### ⚠️ 記録（軽微・急がない）

- **インラインリンクにも 44px の `::after`** が付き、行の上下 ±13px を覆う（`/letter-to-mike` の2件で確認）。
  実害は出ていないが、WCAG 2.5.8 はインラインを除外しているので `p a` を除外しておくと安全
- **Functions に Supabase URL と anon キーがハードコード**（`functions/market/[slug].ts` / `functions/topic/[slug].ts`）。
  JWT を復号して `role: anon` を確認済みで、クライアントバンドルにも入る公開鍵なので**新たな漏洩ではない**。
  ただし鍵ローテーション時に2箇所直す必要があるので `context.env` に寄せるとよい

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

### 検証エンジンの現状（第16回の破壊テスト結果）

**#9 ビルド CSS Backdrop-Filter 保持検査 — 合格（2ラウンド連続）。**
宣言順を戻す破壊テストで正しく FAIL（無印総数 9→8 と一致）。

**#3 乖離基準の統一性 — 合格。3種のテストすべて期待どおり。**

| テスト | 操作 | 結果 |
|---|---|---|
| A | ガードを削除（`{true ? (`） | ✅ FAIL |
| B | コメント化して `{/* … */ true ? (` | ✅ FAIL |
| C | 変数束縛の正当形（`const hasReliableSample = item.japanVotes.total >= 3`） | ✅ **PASS のまま**（誤検知なし） |

> **破壊テストは3段構え**にすること。「削除」「文字列を残したまま無効化」に加えて、
> **正当な別の書き方が誤検知されないか**（C）も見る。検知力を上げると誤検知が増えるのが定番の失敗。

未修正：`fs.readdirSync(...)[0]` で CSS を1つだけ読んでいる点。
現状 `dist/assets` の CSS は1つなので問題は出ていないが、全 CSS を走査するほうが安全。

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
- 私（Claude）自身の計測ミスは4回あります（oklch 未対応 / 翻訳判定が甘い / 行番号ずれ /
  **母集団がトップページだけだった（第14回・8ラウンド分の指標が誤り）**）。
  **自分の誤りを見つけたら明示的に訂正する**ことをユーザーは評価しています

---

## 8. 次のセッションで最初にやること

```bash
cd /Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast
node scripts/audit_self_check.mjs     # 10項目すべて PASS のはず
npx vite build && npx vite preview --host 127.0.0.1 --port 4173
```

その上で、ユーザーの指示に応じて：

- **また修正報告が来た場合** → §4 の手順で検証。§5 のパターンを疑う。
  **母集団は全ページ**（§4 鉄則0）。トップページだけで「維持されています」と書かない
- **残件に着手する場合** → §3 の **N-18（埋め込みが別銘柄を表示）** から。
  `EmbedWidgetPage` の `events.find(...)` から `replace(/-\d+$/,'')` を外して完全一致に戻し、
  **69件を再計測**（詳細ページとタイトルを突き合わせる）。次いでインラインリンクの44px除外、
  Functions のキーを `context.env` へ
- **構造リファクタリングに入る場合** → `B-3`（管理コンソール CSS の切り出し）から。
  `index.css` が1万行を超えており、他の作業の足かせになり始めています
