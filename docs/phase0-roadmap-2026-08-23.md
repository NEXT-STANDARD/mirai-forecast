# Phase 0 修正ロードマップ — 外部露出の配線復旧

**作成**: 2026-08-23
**対象**: mirai-forecast（本番 https://mirairadar.com）
**実装担当**: Antigravity / Gemini 3.7 Flash
**検証担当**: Claude（作業報告を受けて実測検証 → 検証レポート発行）

---

## 0. このロードマップの位置づけ

サイトの機能品質は17ラウンドの監査で仕上がっています。一方で、**外に出るための経路が
本番で塞がっており**、告知しても届いた先で何も起きない状態です。

Phase 0 は「宣伝の前に配線を通す」作業です。**新機能は作りません。**

> **重要な設計判断**：本ロードマップでは、**Cloudflare Functions への依存をやめ、
> ビルド時プリレンダーに切り替える**ことを提案します。理由は §2 に記載します。

---

## 1. 現状（すべて実測値・2026-08-23 時点）

### 1-1. 外部流入がゼロ

`japan_vote_logs` 全数：**48票 / 22銘柄 / 5日間**、
referrer は **direct 42・localhost 5・test_script 1**。外部サイトからの流入は **0件**。
Web検索でも `mirairadar.com` は結果に出ません。

### 1-2. 4つの経路が塞がっている

| # | 経路 | 期待 | 本番の実測 |
|---|---|---|---|
| A | SNSシェア | 銘柄別のOGP | **全ページ同一の汎用OGP** |
| B | 検索インデックス | 銘柄ページが個別に登録 | 初期HTMLの `canonical` が**全ページ `https://mirairadar.com/` 固定** |
| C | sitemap | 実在する銘柄のURL | **169件中 99件が実在しない**（58%が死にURL） |
| D | AI連携 | `/api/mcp` がMCPを返す | **SPAのHTMLを返す**（Functions が未実行） |

#### 再現コマンド（そのまま実行できます）

```bash
# A: Twitterbot でも銘柄名が入らない
curl -s -A "Twitterbot/1.0" https://mirairadar.com/market/brazil-presidential-election \
  | grep -oE '<meta property="og:title" content="[^"]{0,80}'
# → 未来レーダー (MiraiRadar) | 世界の集合知（Polymarket） × 日本の世論

# B: canonical が全ページ同じ
for p in / /market/putin-out-before-2027 /ai-connector; do
  curl -s "https://mirairadar.com$p" | grep -oE '<link rel="canonical" href="[^"]*"'
done
# → 3つとも https://mirairadar.com/

# D: Functions が動いていない
curl -s https://mirairadar.com/api/mcp | head -c 20        # → <!doctype html>
curl -s -o /dev/null -w "%{content_type}\n" "https://mirairadar.com/api/og?title=t&world=50"
# → text/html（画像ではない）
```

### 1-3. 切り分け済みの事実

| 確認したこと | 結果 |
|---|---|
| ホスティング | Cloudflare Pages（`cache-control: public, max-age=0, must-revalidate` ＋ CF proxy IP） |
| Git連携デプロイ | **動いている**（08-20 の修正が本番バンドルに存在） |
| `functions/*.ts` の型エラー | **なし**（`tsc --noEmit` で確認） |
| `_routes.json` / `_redirects` | **存在しない** |
| `functions/` の tsconfig 参照 | **対象外**（`include` は `src` と `vite.config.ts` のみ） |
| CDNキャッシュ | `/market/*` は `cf-cache-status: HIT`。**キャッシュ回避しても Functions に到達しない** |

**結論**：デプロイは動いているが、`functions/` 配下が本番で実行されていない。
原因はコードではなく **Cloudflare Pages プロジェクト側の設定**にある可能性が高い。

---

## 2. 方針：Functions 依存をやめ、ビルド時プリレンダーへ

### なぜ切り替えるのか

| 理由 | 内容 |
|---|---|
| **確実性** | Functions が動かない原因はダッシュボード側にある可能性が高く、コード修正だけでは直せない保証がない |
| **検証可能性** | プリレンダーなら `dist/` を見れば済む。**ローカルで完全に検証できる**（＝私が次回レポートで測れる） |
| **クローラー適合** | SNSクローラーは **JavaScript を実行しない**。静的HTMLが唯一確実な手段 |
| **キャッシュ安全性** | 現行のUA分岐は `Vary: User-Agent` が無く、**CDNが1つの応答を全員に配る**（実際 `cf-cache-status: HIT` で同一応答）。プリレンダーならこの罠自体が消える |
| **前例がある** | `scripts/generate_main_ogp.mjs` が既に `sharp` でOGP画像を生成している。同じ方式を銘柄別に広げるだけ |

### 残すもの・やめるもの

- **やめる**：OGPのために `functions/market/[slug].ts` / `functions/topic/[slug].ts` に依存すること
- **残す**：`functions/api/mcp.ts`（AI連携）。ただし **P0-6 で原因を切り分けてから**判断する
- **消さない**：`functions/` のコードは残置してよい（動けば二重に効くだけで害はない）

---

## 3. タスク

### P0-1 — sitemap を Supabase 基準に切り替える

**現状**：`scripts/generate_sitemap.mjs` が **Polymarket API** から slug を取得しているため、
サイトに存在しない銘柄のURLを大量に出力している。

```
sitemap の /market/ URL : 169件
  実在する銘柄          : 70件
  ❌ 実在しない          : 99件（58%）
Supabase の有効銘柄     : 120件
```

**実装**
- slug の取得元を **Polymarket API → Supabase `events`（`is_active = true`）** に変更
- `lastmod` は `events.updated_at` を使う
- 静的ページ（`/`, `/ai-connector`, `/letter-to-mike` 等）は従来どおり含める

**受け入れ基準**
- sitemap の `/market/` URL が **すべて実在する銘柄**であること（死にURL 0件）
- URL数が Supabase の有効銘柄数と一致すること

**検証**
```bash
node scripts/generate_sitemap.mjs
# sitemap の全 /market/ URL を Supabase の有効 slug と突き合わせ、差分0を確認
```

---

### P0-2 — 銘柄ページをビルド時にプリレンダーする（本ロードマップの中核）

**目的**：SNSシェアと検索の両方を、JS実行に依存せず成立させる。

**実装**
- 新規 `scripts/prerender_markets.mjs` を作成し、`package.json` の `build` の**最後**に追加
  ```
  "build": "node scripts/generate_sitemap.mjs && tsc -b && vite build && node scripts/prerender_markets.mjs"
  ```
- 処理内容
  1. Supabase から有効銘柄（`is_active = true`）を取得
  2. `dist/index.html` を雛形として読み込む
  3. 銘柄ごとに `dist/market/<slug>/index.html` を書き出す
  4. 書き出す際、以下を**銘柄固有の値に置換**する

| タグ | 値 |
|---|---|
| `<title>` | `{title_ja} ｜ 未来レーダー` |
| `<meta name="description">` | 世界確率と日本世論を含む1文（後述の文例） |
| `og:title` | `【世界の確率 {worldProb}%】{title_ja}` |
| `og:description` | 同上 description |
| `og:url` | `https://mirairadar.com/market/{slug}` |
| `og:image` | `https://mirairadar.com/ogp/market/{slug}.png`（P0-5） |
| `og:type` | `article` |
| `twitter:card` | `summary_large_image` |
| `<link rel="canonical">` | `https://mirairadar.com/market/{slug}`（**自己参照**） |

**description の文例**（n≥3 の有無で出し分ける）
```
n≥3  : 世界のリアルマネーはYES {world}%、日本の世論はYES {japan}%（n={n}）。乖離{gap}ポイント。未来レーダーで比較。
n<3  : 世界のリアルマネーはYES {world}%。日本の世論は集計中（n={n}）。あなたの直感を1秒で投票。
```

**注意点**
- slug に URL エンコードが必要な文字が含まれる場合の扱いを明示すること（ディレクトリ名は生の slug、リンクは `encodeURIComponent`）
- SPA のルーティングは `window.location.pathname` を読むので**変更不要**。プリレンダーHTMLの上からReactが起動する
- 既存の `seoHelper.ts`（クライアント側の書き換え）は残してよい。初期HTMLが正しくなることが目的

**受け入れ基準**
- `dist/market/` に**有効銘柄と同数**のディレクトリが生成される
- 任意の3銘柄で、`dist/market/<slug>/index.html` の `og:title` に **銘柄名が含まれる**
- 同ファイルの `canonical` が**自分自身のURL**になっている
- **本番反映後**、`curl -A "Twitterbot/1.0"` で銘柄名入りの `og:title` が返る

---

### P0-3 — canonical の自己参照化（銘柄以外のページ）

**現状**：`index.html:19` の `<link rel="canonical" href="https://mirairadar.com/" />` が
**全ページに配られている**。

**実装**
- P0-2 と同じ仕組みで、静的ページも自己参照に
  - `/ai-connector`, `/developers`, `/letter-to-mike`, `/forecast`, `/rankings`
- トップ（`/`）はそのままで正しい

**受け入れ基準**
- 上記ページの初期HTMLの canonical が、それぞれ自分自身のURLになっている

---

### P0-4 — JSON-LD を静的に埋め込む

**目的**：検索エンジンに「これは何のデータか」を明示する。

**実装**：P0-2 のプリレンダー時に、銘柄ページへ以下を挿入する。

```json
{
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "{title_ja}",
  "description": "Polymarketのリアルマネー確率と日本の無料世論投票の比較データ",
  "url": "https://mirairadar.com/market/{slug}",
  "dateModified": "{updated_at}",
  "creator": { "@type": "Organization", "name": "未来レーダー" },
  "variableMeasured": [
    { "@type": "PropertyValue", "name": "世界オッズ(YES)", "value": {worldProb} },
    { "@type": "PropertyValue", "name": "日本世論(YES)", "value": {japanProb} },
    { "@type": "PropertyValue", "name": "サンプル数", "value": {n} }
  ]
}
```

**受け入れ基準**
- 銘柄ページの初期HTMLに `application/ld+json` が1つ含まれる
- **JSON として妥当**（`JSON.parse` が通る）
- `n < 3` の銘柄では「日本世論」を**含めない**（統計的に主張しないという既存方針を守る）

> `n≥3` ガードは第12〜17回で全8コンポーネントに入れた方針です。**構造化データでも同じ基準を守ってください。**

---

### P0-5 — 銘柄別OGP画像を静的生成する

**現状**：`og:image` は全ページ共通の `/ogp-main.png`。
動的生成の `/api/og` は本番で `text/html` を返しており機能していない。

**実装**
- `scripts/generate_main_ogp.mjs` と**同じ方式**（`sharp` ＋ SVG、1200×630）で
  `scripts/generate_market_ogp.mjs` を作成
- 出力先：`public/ogp/market/<slug>.png`（ビルド前に生成 → `dist` にコピーされる）
- 画像に焼き込む要素
  - 銘柄名（日本語・自動改行・長い場合は省略）
  - **世界オッズ YES {n}%**
  - **日本世論 YES {n}%（n={n}）** ※ `n<3` の場合は「日本世論：集計中」
  - 乖離ポイント（`n≥3` のときのみ）
  - サイト名

**注意点**
- 日本語フォントが必要。CI では `fonts-noto-cjk` を導入済み（`auto-bot.yml` に前例あり）
- 120銘柄 ×46KB ≒ 5.5MB 程度。リポジトリに含めるか `.gitignore` してビルド時生成のみにするかは、**ビルド時生成のみ**を推奨

**受け入れ基準**
- `dist/ogp/market/` に有効銘柄と同数のPNGが生成される
- 任意の1枚が **1200×630 の PNG** であること
- 画像内に**数字（確率）が描画されている**こと（目視確認でよい）

---

### P0-6 — Functions が動かない原因の切り分け

**これは調査タスクです。修正は原因判明後に判断します。**

コード側は確認済みで、以下は**すべてシロ**でした。

- `functions/*.ts` に型エラーなし
- `_routes.json` / `_redirects` なし
- Git連携デプロイは動作している

**残る候補（ダッシュボードでしか確認できない）**

| 候補 | 確認方法 |
|---|---|
| ビルド出力ディレクトリ／ルートディレクトリの設定 | Pages → 設定 → ビルドとデプロイ |
| Functions の互換性フラグ・Node互換設定 | Pages → 設定 → Functions |
| ビルドログで functions のコンパイルが出ているか | Pages → 直近のデプロイ → ビルドログ |
| プロジェクトが Direct Upload 方式で作られていないか | Pages → デプロイの種別表示 |

**依頼**：ビルドログの該当箇所（`Compiling Functions...` 等の有無）と、
上記4点の設定値を確認して報告してください。**私からはダッシュボードを見られません。**

> なお P0-2〜P0-5 が完了すれば、**OGPと検索は Functions なしで成立します**。
> Functions が必要なのは `/api/mcp`（AI連携）だけになります。

---

## 4. 全体の受け入れ基準（本番反映後に私が実測します）

```bash
# ① OGP が銘柄別になっている
curl -s -A "Twitterbot/1.0" https://mirairadar.com/market/<slug> \
  | grep -oE '<meta property="og:(title|image)" content="[^"]*"'
#   → og:title に銘柄名 / og:image が銘柄別PNG

# ② canonical が自己参照
curl -s https://mirairadar.com/market/<slug> \
  | grep -oE '<link rel="canonical" href="[^"]*"'
#   → 自分自身のURL

# ③ JSON-LD が妥当
curl -s https://mirairadar.com/market/<slug> \
  | python3 -c "import sys,re,json; m=re.search(r'ld\+json\">(.*?)</script>',sys.stdin.read(),re.S); json.loads(m.group(1)); print('valid')"

# ④ sitemap に死にURLがない
#   全 /market/ URL を Supabase の有効 slug と突き合わせ → 差分 0

# ⑤ OGP画像が実在する
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" \
  https://mirairadar.com/ogp/market/<slug>.png
#   → 200 image/png
```

**全数検証**：私は**有効銘柄の全件**で ①〜③・⑤ を確認します。サンプリングはしません。

---

## 5. 検証時に私が追加で見る点（予告）

過去17ラウンドで繰り返し出たパターンなので、先に共有します。

| 観点 | 理由 |
|---|---|
| **プリレンダー漏れ** | 「3銘柄で確認しました」は全数の保証になりません。**120件すべて**を見ます |
| **`n<3` の扱い** | OGP・JSON-LD でも `n≥3` ガードを守っているか。ここを破ると統計的な誠実さの一貫性が崩れます |
| **本番反映の確認** | ローカルの `dist` が正しくても、本番に出ていなければ意味がありません。**必ず本番URLで測ります** |
| **CDNキャッシュ** | 反映直後は古い応答が返ることがあります。キャッシュ回避して確認します |
| **回帰** | 既存の12項目の自己検証、モバイル表示、埋め込み、投票機能が壊れていないこと |

**新しいチェックを `audit_self_check.mjs` に足す場合は、追加した直後に
「意図的に壊して FAIL が出ること」を確認してください。** 第14〜16回で3回連続、
新規チェックが破壊テストを通らない事象が起きています。

---

## 6. やらないこと（Phase 0 のスコープ外）

- 新機能の追加
- デザイン変更
- 銘柄の絞り込み（Phase 3 で議論）
- サイトのメッセージ・立ち位置の変更（Phase 1 で議論）
- マネタイズ関連
- 構造リファクタリング（`B-3` の `index.css` 分割など）

---

## 7. 優先順と依存関係

```
P0-1 sitemap 修正        ← 独立。すぐ着手可
P0-5 OGP画像生成         ← 独立。P0-2 より先に作ると og:image を指せる
   ↓
P0-2 プリレンダー         ← 中核。P0-5 の出力先URLを参照する
   ├─ P0-3 canonical     ← P0-2 と同じ仕組みで同時に実施
   └─ P0-4 JSON-LD       ← P0-2 の中で挿入
   ↓
P0-6 Functions 原因調査   ← 並行可。ダッシュボード確認が必要
```

**推奨の着手順**：P0-1 → P0-5 → P0-2（P0-3・P0-4 を内包） → P0-6

---

## 8. 完了報告に含めてほしいもの

1. 各タスクの実施内容
2. **ローカル `dist/` での確認結果**（生成件数など）
3. **本番反映後の確認結果**（本番URLでの実測）
4. P0-6 の調査結果（ダッシュボードの設定値・ビルドログ）
5. 意図的に変更しなかった点があれば、その理由

数値は「3件確認しました」ではなく「**120件中120件**」の形でお願いします。
私の検証も同じ粒度で行います。
