# 再修正 検証レポート（第14回）

**対象**: mirai-forecast / 第13回の指摘＋個別ページ横はみ出し修正
**検証日**: 2026-08-20
**検証方法**: 本番ビルド実機計測（全69ページ全数）＋ 破壊テスト ＋ ソース照合 ＋ Supabase 直接照会

---

## 総括

**報告された修正は、4件すべて成立しています。** 今回は「直った理由」も報告どおりでした。

| 報告内容 | 判定 | 実測 |
|---|---|---|
| NEW-9 の根治（宣言順の入れ替え） | ✅ | ビルド後 CSS に無印プロパティを確認。総数 7 → **9** |
| 個別ページの横はみ出し解消 | ✅ | **全69ページ × 375px で 0件**。360px でも 0件 |
| ランキングの `n=` 重なり解消 | ✅ | ラベル右端 108px / バー左端 116px、**重なり 0** |
| 自己検証エンジンに #9 を追加 | ⚠️ | 追加されているが、**破壊テストを通過しません**（後述） |

ただし今回、**検証範囲を「トップページ」から全ページに広げたところ、新しい問題が6件出ました。**
いずれも今回の修正が原因ではなく、**これまで測っていなかった面**にあったものです。

そして**私自身の過去の測定に範囲の欠落がありました**。§自己訂正で明示します。

---

## ✅ 1. NEW-9 は根治した（ビルド出力で確認）

```
dist/assets/index-*.css
.header-container-slim{...-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);...}
                                                              ↑ 無印が残った

無印 backdrop-filter の総数 : 7 → 9
```

第13回で提案した「`-webkit-` を先、無印を後」の並べ替えが、`index.css` の 2箇所
（`.header-container-slim` / モーダル）に適用されていました。

### 破壊テストで因果も確認した

順序を元に戻して再ビルドしました。

```
順序を戻す → .header-container-slim{...-webkit-backdrop-filter:blur(20px)...}  無印が消える
             無印総数 9 → 8
戻す        → 無印総数 8 → 9   （diff で index.css の完全一致を確認済み）
```

**esbuild が後勝ちで畳む**という第13回の推定は、これで確定しました。

---

## ✅ 2. 個別ページの横はみ出しは解消している（全数確認）

`/market/:slug` の**全69ページ**を 375px 幅で計測しました。

| 幅 | 結果 |
|---|---|
| **375px** | 69/69 ページで `scrollWidth = 375`、**ビューポート外へ出た要素 0件** |
| **360px** | 0件 |
| 320px | ヘッダー右クラスタのみ（後述 N-15・今回の修正とは無関係） |
| 1343px | 0件。セクション見出しは1行のまま（`flex-wrap` を足しても desktop は折り返していない） |

他の面も確認しました。

| ページ | 375px |
|---|---|
| `/`（トップ） | ✅ 0件 |
| `/forecast` `/rankings` `/profile` | ✅ 0件 |
| `/letter-to-mike` | ✅ 0件 |
| `/embed/:slug` | ✅ 0件 |
| **`/ai-connector` `/developers`** | ❌ **54要素・最大64px はみ出し**（N-10） |

横スクロールが出る要素は、意図した3つの横スクロール帯のみです
（`category-nav-slim` / `tape-items-scroll` / `hot-keywords-row`）。

### 取引高の圧縮表記も動いている

```
$2.2M / $39.7M        title="24h: $2,215,556 ｜ 累計: $39,733,676"
```

> 補足：`title` 属性はタッチ端末では表示されません。モバイルでは正確な数値に到達する手段がない、という
> 小さな割り切りが入っています（圧縮表記が主目的なので、実害は小さいです）。

---

## ✅ 3. ランキングの `n=` 移動は正しく効いている

```
乖離ピル       : 「86% 乖離 (n=3)」  幅130px  右端351px（375px 内）
日本世論ラベル : 右端 108px
メーターバー   : 左端 116px            → 重なり 0px
```

`n=` は乖離ピル側に移り、`n≥3` の基準も維持されています（表示中の4件すべて n≥3）。

---

## ⚠️ 4. 自己検証 #9 は、追加されたが機能していない

第13回で「エンジンに1行足せば拾える」と書いた項目です。追加されましたが、判定式が緩いままでした。

```js
if (!distCss.includes(".header-container-slim") || !distCss.includes("backdrop-filter:blur")) { … }
```

2つの `includes()` が独立しているため、**ファイル内のどこかに `backdrop-filter:blur` が1つでもあれば通ります。**

### 破壊テスト（実ビルドで実施）

`index.css` の宣言順を元に戻し、エンジンを走らせました。エンジン自身が `npm run build` を回すので、
検査対象の `dist` も同時に再生成されます。

| | 結果 |
|---|---|
| ビルド後の `.header-container-slim` | `-webkit-backdrop-filter` のみ（**無印が消えた**） |
| 無印プロパティ総数 | 9 → **8** |
| **エンジンの判定** | ✅ **PASS**（「本番 CSS に `.header-container-slim` の無印 `backdrop-filter` を確認」） |

**回帰そのものを見逃したうえ、確認していないことを「確認した」と報告しています。**

```js
// あるべき形：該当ルールの中だけを見る
const rule = (distCss.match(/\.header-container-slim\{[^}]*\}/) || [""])[0];
if (!/[^-]backdrop-filter:blur/.test(rule)) { … }
```

### 同じ形が #3 にもある

`乖離基準 (japanVotes >= 3 & n=併記) の統一性` は、**ファイル名2つのホワイトリスト**です。

```js
if (file === "AllMarketsGrid.tsx")        { … }
if (file === "SpreadRankingSection.tsx")  { … }
```

`MarketDetailPage.tsx` は走査対象に入っていません。にもかかわらず PASS 時のメッセージは
**「全セクションで信頼サンプル数(n>=3)基準に統一完了」**です。実際は統一されていません（N-12）。

> **型として**：`report()` に渡す成功メッセージが、テストの内容より強い主張になっている。
> チェックを足すときは「何を確かめたか」だけを書くほうが安全です。

---

## ❌ 新規に見つけたもの（6件・いずれも今回の修正が原因ではない）

### N-11 埋め込みウィジェットが、日本世論の数字を固定値で表示している（最優先）

`src/components/EmbedWidgetPage.tsx:58-63`

```js
japanVotes: {
  yes: 12,
  no: 8,
  total: 20,
  percentYes: 60,     // ← ハードコード
},
```

Polymarket API から取得したデータに、**この4行を毎回そのまま貼り付けています。**

実測（3銘柄）:

| slug | 表示された日本世論 | 表示された乖離 | 実際（Supabase） |
|---|---|---|---|
| `fed-decision-in-september-762` | YES **60%** | 60% GAP | 2票・YES 50% |
| `putin-out-before-2027` | YES **60%** | 52% GAP | — |
| `brazil-presidential-election` | YES **60%** | 60% GAP | — |

**すべて 60%。** 乖離はこの固定値から計算されています。
同じ銘柄の詳細ページは「YES 50%（2票）」で、**サイト内で数字が食い違います。**

さらに、このウィジェットには次も同居しています。

- **タイトルが英語**：`titleJa: match.title`（46行）で英題をそのまま `titleJa` に代入
- **Supabase を経由しない**ため、`is_active` も締切ガード（NEW-4）も効かない
- **69銘柄中37件（54%）が「指定された観測銘柄が見つかりませんでした」**
  Polymarket の 24h出来高**上位80件**にしか当たらず、`INITIAL_EVENTS` のフォールバックは6件で
  しかもスラッグが現行と一致しない（`fed-decision-in-september` ≠ `fed-decision-in-september-762`）

この URL は `EmbedModal.tsx:17` が生成し、詳細ページの「記事に埋め込む」から**外部の記事に配布されます。**
サイト内の不整合ではなく、**外に出ていく数字**です。ここは他の何より先に手を入れる価値があります。

対応は2択だと思います。

1. 実データを引く（Supabase 経由に変える）
2. それが重いなら、**日本世論の欄を出さない**（世界オッズだけのウィジェットにする）

---

### N-12 詳細ページの乖離表示に `n≥3` ガードが無い

`src/components/MarketDetailPage.tsx:218`

```jsx
<span className="stat-main text-amber-400">⚡ {gap}% 乖離</span>
```

条件なしで描画されます。`n=` の併記もありません。

12銘柄を実測しました。

| 票数 | 件数 | 例 |
|---:|---:|---|
| 0票 | 7件 | 「⚡ **0% 乖離**」と表示（誰も投票していないのに「一致」に見える） |
| 1票 | 2件 | 「⚡ **50% 乖離**」（大谷60本 / ヴァンス2028） |
| 2票 | 1件 | 「⚡ **49% 乖離**」（9月FOMC） |
| 4票以上 | 2件 | — |

**12件中11件が `n<3` で乖離を表示しています。**

乖離を出しているコンポーネントを全数で洗いました。

| コンポーネント | `n≥3` ガード | `n=` 表示 |
|---|:--:|:--:|
| `AllMarketsGrid` | ✅ | ✅ |
| `SpreadRankingSection` | ✅ | ✅ |
| `MarketDetailPage` | ❌ | ❌ |
| `EmbedWidgetPage` | ❌ | ❌ |
| `EventModal` | ❌ | ❌ |
| `OgpPreviewModal` | ❌ | ❌ |
| `WatchlistTable` | ❌ | — |
| `DataExportModal` | ❌ | ❌ |

**8件中2件のみ**です。第9回で「ランキングで直したがグリッドに残った」と指摘した形が、
より広い範囲で残っていました。

---

### N-10 `/ai-connector`（＝`/developers`）が 375px で 64px はみ出す

今回のテーマ（ブラウザ幅に収める）と**同じ問題が、このページだけ残っています。**

```
ビューポート    : 375px
.connector-left-pane : 幅 432px（右端 439px）
はみ出した要素   : 54個 / 最大 64px
```

`.container.main-content` に `overflow-x: clip` が効いているため、**スクロールで追えません。**
実機で見ると、こう切れています。

- 「MCP URL**をコピー**」ボタン → **41% が画面外**（L=308 / R=421）
- 「JSON設定をコピー」「プロンプトをコピー」 → 同じく右端が欠ける
- `https://mirairadar.com/api/mcp` の URL ボックス、`claude_desktop_config.json` のコードブロック → 右 46px が欠ける
- 本文の「**設定 (Settings) ➔ コネクタ / MCP (Model Context Protocol)**」→ 右端が切れる

#### 原因

```css
@media (max-width: 860px) {
  .connector-content-grid { grid-template-columns: 1fr; }   /* 7263行 */
}
```

`1fr` は `minmax(auto, 1fr)` です。`auto` の最小値は**中身の min-content** まで持ち上がります。

| 中身 | min-content | 理由 |
|---|---:|---|
| `<pre class="code-block">` | 395px | `white-space: pre`（`overflow-x:auto` があっても最小幅には効かない） |
| `<strong>「設定 (Settings) ➔ コネクタ / MCP (Model Context Protocol)」` | 392px | 括弧つき英字が改行されない |
| → `.connector-left-pane` | **432px** | 上記＋パディング |

コンテナが 346px でも、トラックが 432px に広がります。

#### 検証済みの修正（実機で 54件 → 0件）

```css
@media (max-width: 860px) {
  .connector-content-grid { grid-template-columns: minmax(0, 1fr); }
  .connector-left-pane,
  .connector-right-pane { min-width: 0; }
}
```

ブラウザに流し込んで実測しました。

```
はみ出し要素        54 → 0
.connector-left-pane 432px → 361px
「MCP URLをコピー」  R=421（46px 外） → R=349（完全に画面内）
```

> `minmax(0, 1fr)` は、Grid で `1fr` を使うときの定型です。同じ形が他にもないか、
> `grid-template-columns` を持つルールを一度洗っておくと安全です。

---

### N-14 英語タイトルが1件復活している

```
slug  : bitcoin-price-on-august-20-2026
title_ja : "Bitcoin price on August 20?: <54,000?"
```

**DB の `title_ja` 自体が英語**です。有効69件中1件。トップページのカードにそのまま出ています。

8ラウンド維持してきた「英語・破綻タイトル 0件」が崩れました。

#### 機構

`scripts/sync_polymarket_cron.mjs:524-531` の日本語検証は**正しく発火しています**。

```js
const hasJp = /[぀-ヿ…]/.test(titleJa || '');
if (!titleJa || !hasJp || englishFuncCount >= 3) titleJa = fb.titleJa;   // ← フォールバックへ
```

問題はフォールバック側です。`translateFallback()` は手書きの `if` の列挙で、
**どれにも当たらなかったときの最終 return が生テキストをそのまま返します**（517行）。

```js
return { titleJa: t, category };   // t は英語の原文
```

「Bitcoin price on August N?: <価格>?」という表題型に対応する分岐がありません
（`Bitcoin above ___ on August N` / `Bitcoin Up or Down on August N` / `What price will Bitcoin hit …` はある）。

**これは1件直して終わる話ではありません。** 辞書がホワイトリストである以上、
Polymarket が新しい表題型を出すたびに漏れます。同期のたびに「0件」が崩れる構造です。

対応の方向は3つ。

1. 最終フォールバックを**英語のまま通さない**（汎用の日本語テンプレートに落とす）
2. 日本語検証に落ちたものは **`is_active = false` にして表に出さない**
3. Gemini 側にリトライを1回入れる

---

### N-13 タップ44px未満は、トップページ以外に16件ある

`pointer: coarse` を実機エミュレーションで有効にし、`::after` の拡張も含めて計測しました。

| ページ | 44px未満 / 全体 |
|---|---:|
| `/`（トップ） | **0 / 204** ✅ |
| `/market/:slug` | **6 / 30** |
| `/forecast` | 3 / 20 |
| `/letter-to-mike` | 5 / 22（うち2件は本文中のインラインリンク＝WCAG 2.5.8 の例外） |
| `/ai-connector` | 2 / 18 |

詳細ページの内訳：

| 要素 | 実効サイズ |
|---|---|
| `.btn-back-link`（マーケット一覧へ戻る） | 361 × **36** |
| `.btn-market-data-trigger`（データ取得） | 113 × **35** |
| `.btn-market-embed-trigger`（記事に埋め込む） | 122 × **35** |
| `.btn-market-share-trigger`（Xでシェア） | 113 × **35** |
| `.comment-input-field` | 331 × **41** |
| `.btn-comment-submit`（投稿する） | 331 × **35** |

#### 原因

E-2 の 44px 拡張は、`index.css:10026` からの**セレクタ列挙（ホワイトリスト）**です。

```css
@media (pointer: coarse) {
  .modal-close-btn, .forecast-close-btn, … , .pwa-action-btn {
    position: relative; min-height: 38px;
  }
  .modal-close-btn::after, … {
    content:''; position:absolute; min-width:44px; min-height:44px; …
  }
}
```

`.btn-header-refresh` は実測 23×38px ですが `::after` が 44×44 で当たっており、**仕組み自体は正しく動いています。**
詳細ページのボタンが、この列挙に入っていないだけです（`::after` の `content` が `none`）。

属性セレクタ側（`button, a, [role=button]` を広く拾う形）に寄せるのが本筋だと思います。

---

### N-15 320px 幅でヘッダー右クラスタが切れる（優先度：低）

| 幅 | `.header-right-cluster` | `.btn-header-refresh`（更新ボタン） |
|---:|---|---|
| 320px | 右端 345px（**25px 外**） | L=328 / R=345 → **完全に画面外・押せない** |
| 340px | 18px 外 | 一部が欠ける |
| **360px 以上** | ✅ 0 | ✅ |

`overflow-x: clip` のためスクロールでも届きません。

対象は iPhone SE(第1世代)・Galaxy Fold の外側画面など、いまや少数です。
**今回の修正とは無関係**で（`header-right-cluster` の最終変更は `6005233` / `9a195b7`）、優先度は低いままで構いません。

---

## 🔄 自己訂正：私の測定範囲が足りていませんでした

第5回以降、私は次の2指標を「維持されている」と報告し続けてきました。

| これまでの報告 | 実際 |
|---|---|
| 「タップ44px未満 **0%**（0/140）」 | **トップページのみの測定**。詳細ページは 6/30 |
| 「乖離バッジの `n=` 併記率 **100%**」 | **トップページのみ**。詳細ページはガードも `n=` も無い |
| 「12px未満のテキスト **3%**」 | **トップページのみ**。詳細ページは **20.6%**（28/136） |

**指標そのものが間違っていたのではなく、母集団が「トップページ」だけでした。**
「1箇所直して、同じことをしている別の箇所が残る」を4回指摘してきた私自身が、
**測る側で同じことをしていた**という話です。

これ以降の測定は、全ページを母集団にします。§付録に手順を残しました。

> なお、詳細ページの 12px 未満 28件のうち 11件は SVG チャートの軸ラベル（9〜9.5px）です。
> 除いても 12.5%（17/136）で、トップページの3.5%とは開きがあります。
> このうち2件は**今回の修正で増えたもの**です（`.badge-ai-model` / `.badge-oracle` を 0.70rem = **11.2px** に縮小）。
> 幅に収めるためのトレードオフとして理解できる範囲ですが、記録しておきます。

---

## ✅ 維持されている指標

| 指標 | 第13回 | 今回 |
|---|---:|---:|
| 横スクロール（375px・**全69詳細ページ**） | 0px | **0px** |
| ヘッダー sticky | top:0 | **top:0**（y=0 / 1,500 / 4,000） |
| ヘッダー背景 | 0.96 | **0.96 ＋ `backdrop-filter` 復活** |
| タップ44px未満（トップ） | 0% | **0%**（0/204） |
| 乖離の `n=` 併記（ランキング） | 100% | **100%** |
| 自己検証エンジン | 9項目 | **10項目・全PASS**（#9 は破壊テスト不合格） |
| Supabase 締切切れ | 0件 | **0件**（有効69件） |
| **英語・破綻タイトル** | 0件 | **1件**（N-14） |

---

## 次にやるべきこと（優先順）

### 1. 埋め込みウィジェットの数字（N-11）

外部の記事に配られる面で、**日本世論の数字が固定値**です。実データに繋ぐか、欄ごと落とすか。
併せて英題（46行）と、37/69 が表示できない件も同じファイルの中の話です。

### 2. 乖離表示の統一（N-12）

`n≥3` ガードと `n=` 併記を、`MarketDetailPage` / `EventModal` / `OgpPreviewModal` /
`WatchlistTable` / `EmbedWidgetPage` に広げる。**先に対象を列挙してから**直すこと。

### 3. `/ai-connector` の横はみ出し（N-10）

修正案は実測済みです（54件 → 0件）。3行で済みます。

### 4. 同期パイプラインの英語フォールバック（N-14）

最終 return が英語を通す構造を塞ぐ。1件の対症療法ではなく構造側で。

### 5. 自己検証エンジンの2件（#9 / #3）

- #9：ルール内を見る正規表現に変える
- #3：ファイル名ホワイトリストをやめて全 `.tsx` 走査にする
- 併せて、PASS メッセージを**確かめた範囲どおりの表現**にする

### 6. タップ44px の全ページ展開（N-13）／320px ヘッダー（N-15）

### 継続（構造リファクタリング）

`B-3`（`index.css` 10,030行）/ `A-7`（コメント永続化）/ `F-3`（ルーティング）/ `D-4` / `F-1` / `NEW-2`

---

## 所感

今回、**報告された4件は全部成立していました。** 第13回で指摘した「直った理由が違う」は再発せず、
宣言順の入れ替えという根本原因のほうに手が入り、破壊テストでも因果が確認できました。
69ページ全数で横はみ出しゼロというのは、地味ですが手応えのある結果です。

一方で、新しく出た6件は、**どれも「これまで見ていなかった面」から出てきました。**

- 埋め込みウィジェット → 一度も測っていなかった
- 詳細ページの乖離・タップ・文字サイズ → トップページだけ測っていた
- `/ai-connector` → 「個別ページ」の数え漏れ

これは修正側の問題ではなく、**検証側（私）の母集団の問題**です。
同じ指摘を4回してきた「1箇所直して別の箇所が残る」を、測る側でやっていました。

エンジンの #9 も同じ形でした。**「チェックを足した」ことと「チェックが効く」ことは別**で、
足したチェックにも破壊テストが要ります。第10回で本体に対してやったことを、
エンジンの新規項目に対してもやる、というだけの話です。

そのうえで、いま一番手を入れる価値があるのは **N-11（埋め込みの固定値）**だと思います。
サイト内の表示ズレは直せば済みますが、**外部の記事に貼られた数字は取り消せません。**

---

## 付録：今回使った手順

### 全ページ横はみ出しの全数計測（iframe 並列）

ページ単位でナビゲートすると 69回かかるので、同一オリジンの iframe に並べて一括計測しました。
iframe の幅がそのままビューポート幅になるので、メディアクエリも正しく効きます。

```js
const audit = async (paths, W) => {
  const frames = paths.map(p => {
    const f = document.createElement('iframe');
    f.style.cssText = `position:fixed;left:-9999px;top:0;width:${W}px;height:900px;border:0`;
    f.src = p; document.body.appendChild(f); return f;
  });
  // ★ load イベントではなく「中身が描画されたか」で待つ
  await Promise.all(frames.map(async f => {
    const t0 = Date.now();
    while (Date.now() - t0 < 25000) {
      try { if (f.contentDocument?.querySelector('.market-detail-container')) return; } catch {}
      await new Promise(r => setTimeout(r, 250));
    }
  }));
  return frames.map(f => {
    const d = f.contentDocument, vw = d.documentElement.clientWidth;
    const bad = [];
    d.querySelectorAll('*').forEach(e => {
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height) return;
      if (r.right > vw + 1 || r.left < -1) {
        // 意図した横スクロール帯の中は除外する
        let p = e.parentElement, inScroller = false;
        while (p) {
          const o = f.contentWindow.getComputedStyle(p).overflowX;
          if ((o === 'auto' || o === 'scroll') && p.clientWidth < p.scrollWidth) { inScroller = true; break; }
          p = p.parentElement;
        }
        if (!inScroller) bad.push(e);
      }
    });
    return bad.length;
  });
};
```

**`scrollWidth` だけを見てはいけません。** ルートに `overflow-x: clip` があるので、
はみ出していても `scrollWidth === clientWidth` になります。要素単位で右端を見る必要があります。
（N-10 は `scrollWidth` では 375px、要素単位で見ると 54件はみ出し、でした）

### 描画完了の待ち方

`onload` は HTML の読み込み完了で、React のレンダリングとデータ取得は終わっていません。
12枚並列だと 3.5秒待っても未描画のものが出て、**「0件 ＝ 問題なし」と誤読しかけました。**
`.market-detail-container` の出現をポーリングする形に変えています。

### タップ領域は `::after` まで見る

E-2 の拡張は疑似要素で行われているので、`getBoundingClientRect()` だけでは全滅判定になります。

```js
const af = getComputedStyle(el, '::after');
const expanded = af.content !== 'none' && af.position === 'absolute';
const H = Math.max(rect.height, parseFloat(cs.minHeight) || 0, expanded ? parseFloat(af.height) || 0 : 0);
```

`pointer: coarse` が効いているかを `matchMedia('(pointer: coarse)').matches` で**先に確かめること**。
効いていなければ全ボタンが未拡張になり、大量の誤検知になります。

### 破壊テストは「ソースを壊す」

`dist` を直接書き換えても、エンジンが `npm run build` を回すので上書きされます。
ソース側を壊し、**エンジン自身にビルドさせて**から判定を見ます。

```bash
cp src/index.css /tmp/bak.css
python3 -c "
p='src/index.css'; s=open(p).read()
open(p,'w').write(s.replace(
  '  -webkit-backdrop-filter: blur(20px);\n  backdrop-filter: blur(20px);',
  '  backdrop-filter: blur(20px);\n  -webkit-backdrop-filter: blur(20px);'))"

node scripts/audit_self_check.mjs | grep -A1 Backdrop      # ← FAIL が出るべき
grep -o '[^-]backdrop-filter:' dist/assets/*.css | wc -l   # 9 → 8 なら回帰している

cp /tmp/bak.css src/index.css
diff /tmp/bak.css src/index.css && npx vite build          # 復元を diff で確認
```
