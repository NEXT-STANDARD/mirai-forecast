# 再修正 検証レポート（第7回）

**対象**: mirai-forecast / 第6回検証の指摘に対する再修正
**検証日**: 2026-08-20
**検証方法**: ソース照合 ＋ 本番ビルド（`vite build` → `vite preview`）実機計測 ＋ Supabase 実データ照会
**検証基準**: 第1〜6回と同一

---

## 総括

| 判定 | 第1回 | … | 第5回 | 第6回 | 今回 |
|---|---:|---:|---:|---:|---:|
| ✅ 完全に修正（35項目中） | 9 | … | 25 | 26 | **26** |
| ⚠️ 部分的・不完全 | 5 | … | 2 | 2 | **2** |
| ❌ 未達 | 21 | … | 8 | 7 | **7** |

**A-6 と NEW-5 は完全に解消しました。とくに A-6 は、6ラウンドかけて指摘してきた「構造」の問題が今回で決着しています。**

**NEW-4（締切切れ銘柄）は大きく前進しましたが、完了していません。** 報告は「有効銘柄中の締切切れ 0件」「投票UI保護」としていますが、実測では

- Supabase に締切切れが **2件** 残っています
- 投票ボタンを持つ **3コンポーネントにガードが入っていません**

今回も**回帰はゼロ**でした。2ラウンド連続です。

---

## ✅ A-6 — 置換表から動的検証へ。構造的に決着

第6回で「日付を書き換えるのではなく弾くべき」と指摘した点が、そのとおりに実装されました。

```js
function validateAndFilterCatalysts(catalysts, fallbackTopic = '') {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  ...
  const m = s.match(/(20\d{2})年\s*(\d{1,2})?月?/);
  if (!m) return true;                          // 年がなければ保持
  if (year < currentYear) return false;         // 過去の年は破棄
  if (year === currentYear && month < currentMonth) return false;  // 今月より前も破棄
```

**ハードコードされた置換表（10件の個別ルール＋年の +2 変換）は完全に削除**されました。

### 将来の年でも正しく動くことを確認

第6回で「2027年になれば同じ問題が戻る」と指摘した点を、時刻を変えて検証しました。

```
現在=2026-08-20 → 残る: ["2026年9月 米雇用統計", "2027年3月期 決算", "3月中旬公表：連合春闘"]
現在=2027-06-01 → 残る: ["3月中旬公表：連合春闘"]
```

**2027年時点でも、2026年9月と2027年3月期が正しく除外されます。** 年ハードコードの問題は解消しました。

### 配備状況

| スクリプト | `validateAndFilterCatalysts` | 旧置換表 |
|---|---|---|
| `sync_polymarket_cron.mjs` | **あり** | 削除済み |
| `manage_custom_topics.mjs` | **あり** | 削除済み |
| `sanitize_all_insights.mjs` | **あり** | 削除済み |
| `fix_custom_insights.mjs` | なし | — |

第6回で「無検査で書き込む」と指摘した `manage_custom_topics.mjs` にも入りました。
`fix_custom_insights.mjs` は日付がハードコードで手動更新済みのため、実害はありません。

**軽微な留保**：年が明記されていないカタリスト（`3月中旬公表：連合春闘`）は `return true` で常に保持されます。
保守的な判断として妥当ですが、年なしの古い記述は残り続けます。

**実測**：画面上の過去カタリスト **0件**（`aiInsightsMaster.ts` / `ai_insights.json` も 0件）。

---

## ✅ NEW-5 — 年またぎ銘柄の表示

`AllMarketsGrid.tsx` の日付整形が、現在年と異なる場合に年を含めるようになりました。

```js
const currentYear = String(new Date().getFullYear());
if (y !== currentYear) return `${y}/${m}/${d}`;
return `${m}/${d}`;
```

**実測（画面上の表示）**

```
年つき : 2027/01/01, 2027/05/30, 2028/11/07  ← 長期テーマが識別できる
年なし : 09/01, 09/16, 08/21, 08/20          ← 今年の締切は簡潔なまま
```

指摘の意図どおりです。

---

## ⚠️ NEW-4 — 大きく前進、ただし2点が未完

### できていること

| 対応 | 実測 |
|---|---|
| DB の非活性化 | 96件中 **26件**を `is_active: false` に（有効 96 → **70**） |
| 同期時の保護 | `sync_polymarket_cron.mjs:556` に `is_active: !isExpired` |
| カードUI | 「🏁 投票受付終了（結果確定）」バッジ表示、**投票ボタン0個**を確認 |
| 詳細ページ | 締切切れ銘柄で**ページ内の投票ボタン0個**を確認 |
| ターミナル中央パネル | `OrderBookConsensus` で受付終了表示・投票ボタンなしを確認 |

`isExpired` はクライアント側でも `end_date` から算出されるため（`polymarketService.ts:334`）、
DB の非活性化が遅れても UI 側で拾える設計になっています。**方向は正しいです。**

### 未完(1)：Supabase に締切切れが2件残っている

報告は「28件すべてを `is_active: false` に更新（有効銘柄中の締切切れ **0件**）」ですが、実測では：

```
全レコード     : 96
is_active=true : 70
うち締切切れ    : 2 件  ← 0件ではない

  2026-06-01  アビィ・アハメドは次期エチオピア首相に留任するか？   （2.5ヶ月前）
  2026-07-24  米国は2026年7月24日までにイラン海上封鎖の解除を…    （1ヶ月前）
```

`deactivate_expired_events.mjs` の判定ロジック（`new Date(ev.end_date) < now`）自体は正しいので、
スクリプト実行後に同期が走って再度有効化されたか、実行時に取りこぼしたと考えられます。

UI 側のガードが効いているため画面上は「受付終了」と表示されており、**実害は出ていません**。
ただし「有効銘柄中の締切切れ 0件」という報告は成立していません。

### 未完(2)：投票ボタンを持つ3コンポーネントにガードがない

報告は `AllMarketsGrid` / `MarketDetailPage` / `OrderBookConsensus` の3つを挙げていますが、
投票導線はもっとあります。

| コンポーネント | `onVote` | `isExpired` ガード | 描画状況 |
|---|---:|---|---|
| `AllMarketsGrid` | 2 | **あり** ✅ | 描画中 |
| `OrderBookConsensus` | 1 | **あり** ✅ | 描画中 |
| `MarketDetailPage` | 1 | なし（`OrderBookConsensus` 経由で保護）✅ | 描画中 |
| **`SpreadRankingSection`** | 2 | **なし** ❌ | 描画中（トップページ） |
| **`MobileStickyVoteBar`** | 1 | **なし** ❌ | 描画中（モバイル固定バー） |
| **`EventModal`** | 2 | **なし** ❌ | 描画中 |
| `EventCard` / `HeroFeatured` | 2 / 1 | なし | **デッドコード**（参照0件） |

実機で `MobileStickyVoteBar` を確認したところ、締切切れ判定を行わず投票ボタンを2つ表示していました。

```
固定バー_受付終了表示 : false
固定バー_投票ボタン   : 2
```

現在は締切切れ銘柄がこれらの対象になっていないため顕在化していませんが、

- 乖離ランキングは `japanVotes.total >= 3` で選ぶため、票の集まった締切切れ銘柄が入りうる
- 固定バーは `activeTopicId || filteredEvents[0]` を対象にするため、カテゴリ絞り込み次第で締切切れが先頭に来る

**再現条件が揃えば、結果の出た事象に投票できます。**
`isExpired` の判定は既に `MarketItem` にあるので、3箇所に同じ条件を足すだけです。

---

## ❌ 未達（7件・変化なし）

`A-7`（コメント永続化）/ `B-3`（CSS分割）/ `C-4`（画像）/ `D-5`（強制スクロール）/
`D-6`（ナビ二重）/ `E-4`（非ボタン要素）/ `F-3`（ルーティング）

`D-4`（固定バーの誤爆）と `F-1`（CSS未分割）も継続。`NEW-2`（dev/本番の CSS 差異）も未対応です。

---

## ✅ 維持されている指標（回帰ゼロ・2ラウンド連続）

| 指標 | 第6回 | 今回 |
|---|---:|---:|
| タップ 44px 未満 | 0% | **0%**（0/146） |
| 12px 未満のテキスト | 3% | **3%**（最頻値 12.0px・10px未満 3件） |
| 英語・破綻タイトル | 0件 | **0件** |
| 画面上の過去カタリスト | 0件 | **0件** |
| トップページの `h1` | 1 | **1** |
| 型チェック | exit 0 | **exit 0** |
| JS 初期チャンク | 604.5kB | **605.5kB** |

---

## 次にやるべきこと

### 今すぐ（30分程度）

1. **`SpreadRankingSection` / `MobileStickyVoteBar` / `EventModal` に `isExpired` ガードを足す。**
   `AllMarketsGrid` と同じ条件式をコピーするだけです。

   ```jsx
   {event.isExpired || (event.endDate && new Date(event.endDate).getTime() < Date.now()) ? (
     <span>🏁 投票受付終了</span>
   ) : ( /* 既存の投票ボタン */ )}
   ```

2. **`deactivate_expired_events.mjs` を再実行**して残り2件を落とす。
   同期のたびに再有効化されるなら、同期後に必ず走らせる順序にしてください。

### 中

3. 未達7件（A-7 / B-3 / C-4 / D-5 / D-6 / E-4 / F-3）。
4. デッドコード `EventCard.tsx` / `HeroFeatured.tsx` の削除。

---

## 所感

**A-6 が決着しました。** 第5回で「置換ではなく検証に」と書き、第6回で「2027年に再発する」と指摘した点が、
今回 `Date.now()` ベースのフィルタとして正しく実装され、時刻を変えたテストでも期待どおり動きました。
生成スクリプト3本すべてに配備されたことで、**この項目は今後のラウンドから消えるはずです。**

NEW-4 も、DB・同期・UI の3層に手が入っており、考え方は正しいです。
残っているのは「対象を数え漏らした」類のもので、構造の問題ではありません。

7ラウンドを振り返ると、傾向がはっきり変わってきました。
初期は「実装したが動いていない」（Tailwind、44pxセレクタ、フォーカストラップ）でしたが、
直近2ラウンドは**回帰ゼロで、残るのは適用範囲の漏れ**です。

その漏れも、**「投票ボタンを持つコンポーネントを grep して全部に同じガードを入れる」**という
機械的な確認を1回挟めば防げます。修正対象を列挙してから着手する手順にすると、
このパターンも止まると思います。

---

## 付録：検証手順

```bash
npx vite build
npx vite preview --host 127.0.0.1 --port 4173
npx tsc -b
```

投票導線の網羅チェック:

```bash
# onVote を呼ぶコンポーネントと isExpired ガードの有無を突き合わせる
for f in src/components/*.tsx; do
  printf "%-28s onVote:%s isExpired:%s\n" "$(basename $f)" \
    "$(grep -c 'onVote(' $f)" "$(grep -c 'isExpired' $f)"
done
```

締切切れ銘柄の検出:

```bash
curl -s "$VITE_SUPABASE_URL/rest/v1/events?select=title_ja,end_date,is_active&limit=300" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY"
```
