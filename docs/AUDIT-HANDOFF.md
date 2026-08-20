# 未来レーダー UI/UX 監査 — 引き継ぎメモ

**最終更新**: 2026-08-20
**状態**: 監査13ラウンド完了。実害のある問題はすべて解消済み。残るは構造リファクタリング3件。

> このファイルは「新しいセッションが冷えた状態から再開する」ための入口です。
> 経緯は `docs/ui-ux-audit-*.md`（全14本）にありますが、**まずこのファイルだけ読めば再開できます。**

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
| 12px 未満のテキスト | 86% | **3%**（最頻値 12.0px） |
| タップ領域 44px 未満 | 90% | **0%** |
| コントラスト AA 不合格 | 28% | **3件のみ** |
| CSS が当たらない要素 | 23% | **3%** |
| 英語のままの銘柄タイトル | 6件 | **0件** |
| トップページの `h1` | 0 | **1** |
| 画像（`iconUrl`） | 0枚 | **33枚**（全て lazy） |
| JS 初期チャンク | 700.6kB | 約 607kB（6チャンクに分割） |

**監査35項目のうち：✅30件 完了 / ⚠️2件 部分的 / ❌3件 未達**
**別途検出した新規問題9件のうち：8件 解決 / 1件 実害なしで保留**

---

## 3. 残っているもの（ここから再開する）

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

### 任意1件

- **NEW-9** `index.css` の 232-233行 と 1829-1830行 で、`-webkit-backdrop-filter` を**先**、`backdrop-filter` を**後**に並べ替える。esbuild が両者を畳んで後勝ちにするため、現状は標準プロパティが落ちている。背景 0.96 で実害は消えているので急がない

---

## 4. 検証のやり方（これが一番大事）

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

9項目を機械的に検査します。**指摘するたびにチェック項目が増えてきた**もので、
現在は次を見ています。

1. ビルド＆型チェック
2. 投票ガード（`isExpired`）の構文健全性＋全コンポーネント網羅
3. 乖離基準（`japanVotes >= 3` かつ `n=` 併記）の統一
4. 画像属性（`loading="lazy"` と `onError`）
5. 全コンポーネント走査のキーボード a11y
6. カテゴリナビの配置・単一性
7. デッドコンポーネント排除
8. CSS Sticky 健全性（`overflow-x: clip` の保守）
9. Supabase 有効銘柄の期限整合性

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

もう1つ、第13回で出た形：

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
- 私（Claude）自身の計測ミスも3回ありました（oklch 未対応 / 翻訳判定が甘い / 行番号ずれ）。
  **自分の誤りを見つけたら明示的に訂正する**ことをユーザーは評価しています

---

## 8. 次のセッションで最初にやること

```bash
cd /Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast
node scripts/audit_self_check.mjs     # 9項目すべて PASS のはず
npx vite build && npx vite preview --host 127.0.0.1 --port 4173
```

その上で、ユーザーの指示に応じて：

- **また修正報告が来た場合** → §4 の手順で検証。§5 のパターンを疑う
- **残件に着手する場合** → `B-3`（管理コンソール CSS の切り出し）から。
  `index.css` が1万行を超えており、他の作業の足かせになり始めています
