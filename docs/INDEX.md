# 未来レーダー 監査・検証ドキュメント 索引

**最終更新**: 2026-08-23（Phase 1 第11回）

このファイルは「どのラウンドで何が見つかり、いまどうなっているか」の一覧です。
経緯を追う必要がなければ、**[AUDIT-HANDOFF.md](AUDIT-HANDOFF.md) の §0 だけ読めば再開できます。**

---

## 1. いま残っているもの

| ID | 内容 | 提起 | 担当 |
|---|---|:--:|:--:|
| **Check #19 の dist 走査** | og:title に本命名が無いため**空振り**。プレースホルダを出力させても PASS | 第11回 | 実装 |
| **og:title の本命名** | 【世界本命 62%】に**誰の62%か**が書かれていない（検査の実体にもなる） | 第11回 | 実装 |
| **N-39** | マスク「40件未満」は `<40` が 35% で存在するのに抑制されている | 第11回 | 実装 |
| WTI のタイトル | 英語は `↑ $150` と特定、日本語は「到達水準予測」と一般化 | 第11回 | 実装 |
| **P0-6** | Cloudflare Functions が実行されない（`/api/mcp` が SPA HTML を返す） | Phase 0 | **ユーザー** |
| B-3 ほか | `index.css` が1万行超。構造リファクタリング（A-7 / F-3 / D-4 / F-1） | 監査期 | 実装 |

---

## 2. 現在の本番の状態（第11回・実測）

```
有効銘柄        74件  HTTP200 / og:title固有 / canonical自己参照 / JSON-LD / OGP  すべて 74/74
決着アーカイブ  63件  自己参照canonical ＋【決着・終了】＋ noindex, follow（ソフト404 0件）
sitemap         /market/ 74件（アーカイブの混入 0件）
確率の分布      42件・25種／ちょうど50% は 0件（既定値が完全に消滅）
n<3 ガード違反   0件 ／ 英語混入 0件 ／ 二重空白 0件
自己検証        22項目 全PASS
```

---

## 3. レポート一覧

### 監査期（2026-08-20）— UI/UX

| # | ファイル | 主題 |
|---:|---|---|
| — | [ui-ux-audit-2026-08-20.md](ui-ux-audit-2026-08-20.md) | 初回監査（35項目） |
| 1〜13 | `ui-ux-audit-verification-{n}-2026-08-20.md` | 是正の検証（文字サイズ・タップ領域・コントラスト・オーバーフロー等） |
| 14 | [ui-ux-audit-verification-14-2026-08-20.md](ui-ux-audit-verification-14-2026-08-20.md) | N-10〜N-15。**母集団をトップページだけで測っていた誤りを訂正** |
| 15 | [ui-ux-audit-verification-15-2026-08-20.md](ui-ux-audit-verification-15-2026-08-20.md) | N-16 / N-17 を検出 |
| 16 | [ui-ux-audit-verification-16-2026-08-20.md](ui-ux-audit-verification-16-2026-08-20.md) | N-18（埋め込みが別銘柄を表示） |
| 17 | [ui-ux-audit-verification-17-2026-08-20.md](ui-ux-audit-verification-17-2026-08-20.md) | 監査期の完了判定 |

### 戦略・計画（2026-08-23）

| ファイル | 内容 |
|---|---|
| [business-roadmap-2026-12.md](business-roadmap-2026-12.md) | **【公式】事業戦略・ロードマップ（2026年8月〜12月：Web3×集合知 非胴元型インテリジェンス・メディア構想）** |
| [strategy-2026-08-23.md](strategy-2026-08-23.md) | 今後の展開のブレスト（Phase 0〜3 の骨子） |
| [phase0-roadmap-2026-08-23.md](phase0-roadmap-2026-08-23.md) | Phase 0（配線）の修正ロードマップ |
| [phase1-roadmap-2026-08-23.md](phase1-roadmap-2026-08-23.md) | Phase 1（名乗り）のロードマップ |

### Phase 0 — 配線（sitemap・プリレンダー・canonical・JSON-LD・OGP）

| # | ファイル | 主題 | 結果 |
|---:|---|---|---|
| 1 | [phase0-verification-2026-08-23.md](phase0-verification-2026-08-23.md) | P0-1〜P0-5 の初回検証 | N-19（末尾スラッシュ307）を検出 |
| 2 | [phase0-verification-2-2026-08-23.md](phase0-verification-2-2026-08-23.md) | N-19 の是正 | **N-20**（`.limit(100)` で23銘柄が到達不能）を検出 |
| 3 | [phase0-verification-3-2026-08-23.md](phase0-verification-3-2026-08-23.md) | N-20 の是正・完了判定 | 123/123 達成。残り P0-6 |

### Phase 1 — 名乗り（description・記事・内部リンク・OGP の中身）

| # | ファイル | 主題 | 結果 |
|---:|---|---|---|
| 1 | [phase1-verification-2026-08-23.md](phase1-verification-2026-08-23.md) | P1-1〜P1-4 と解説記事 | P1-3（`<a href>` が0件）を検出 |
| 2 | [phase1-verification-2-2026-08-23.md](phase1-verification-2-2026-08-23.md) | P1-3 の是正 | **N-21**（新規銘柄がデプロイまで未プリレンダー）を検出 |
| 3 | [phase1-verification-3-2026-08-23.md](phase1-verification-3-2026-08-23.md) | N-21 対応の検証 | **N-22〜N-25** を検出（うち2件は重大） |
| 4 | [phase1-verification-4-2026-08-23.md](phase1-verification-4-2026-08-23.md) | N-22〜N-26 の是正 | **N-27**（769〜1279pxへ問題が移動） |
| 5 | [phase1-verification-5-2026-08-23.md](phase1-verification-5-2026-08-23.md) | N-27 と翻訳の永続化 | **N-28 / N-29**（競技の誤分類・`Inter` の誤マッチ） |
| 6 | [phase1-verification-6-2026-08-23.md](phase1-verification-6-2026-08-23.md) | N-28 / N-29 の是正 | **N-30**（全OGPが「世界の確率50%」）・**N-31** |
| 7 | [phase1-verification-7-2026-08-23.md](phase1-verification-7-2026-08-23.md) | N-30 / N-31 の是正 | **N-32 / N-33 / N-34** |
| 8 | [phase1-verification-8-2026-08-23.md](phase1-verification-8-2026-08-23.md) | N-32〜N-34 の是正 | **N-35**（アプリとOGPが最大100pt乖離）・**N-36** |
| 9 | [phase1-verification-9-2026-08-23.md](phase1-verification-9-2026-08-23.md) | N-35 / N-36 の是正 | **N-37**（非アクティブ53URLがトップの複製） |
| 10 | [phase1-verification-10-2026-08-23.md](phase1-verification-10-2026-08-23.md) | N-34 / N-37 の是正 | **N-38**（答えが出せる9件を抑制） |
| 11 | [phase1-verification-11-2026-08-23.md](phase1-verification-11-2026-08-23.md) | N-38 と Check #19 の是正 | **Check #19 の dist 走査が空振り**・**N-39** |

---

## 4. 指摘IDの索引

| ID | 内容 | 提起 | 解決 |
|---|---|:--:|:--:|
| N-9 | `backdrop-filter` の宣言順（esbuild の last-wins） | 監査期 | ✅ |
| N-10 | `/ai-connector` `/developers` で最大64pxのはみ出し | 14回 | ✅ |
| N-11 | 埋め込みウィジェットが日本世論を固定値で表示 | 14回 | ✅ |
| N-12 | n≥3 ガードが8コンポーネント中2つにしか無い | 14回 | ✅ |
| N-13 | タップ領域44px未満がトップ以外に16件 | 14回 | ✅ |
| N-14 | 英語タイトルの復活・フォールバックの穴 | 14回 | ✅ |
| N-15 | 320px でヘッダー右クラスタがはみ出す | 14回 | ✅ |
| N-16 | OGP が英語（Functions が本番で動いていなかった） | 15回 | ✅ |
| N-17 | CSVモーダルが78pxはみ出す | 15回 | ✅ |
| N-18 | slug 正規化で `official-*` 8件が別銘柄を表示 | 16回 | ✅ |
| N-19 | 末尾スラッシュの307で詳細ページが全滅 | P0-1回 | ✅ |
| N-20 | `.limit(100)` で23銘柄が到達不能 | P0-2回 | ✅ |
| N-21 | 新規銘柄がデプロイまでプリレンダーされない | P1-2回 | ✅ |
| N-22 | ヘッダー是正が375pxで更新ボタンを画面外へ | P1-3回 | ✅ |
| N-23 | `_redirects` の2行が Cloudflare で無効 | P1-3回 | ✅ |
| N-24 | `CF_PAGES_DEPLOY_HOOK` 未登録で無言スキップ | P1-3回 | ✅ |
| N-25 | コミットが110分デプロイされていなかった | P1-3回 | ✅ |
| N-26 | ヘッダー幅1440pxが本文1560pxとずれる | P1-3回 | ✅ |
| N-27 | 769〜1279px でヘッダーが崩れる | P1-4回 | ✅ |
| N-28 | MLB・テニスに「欧州サッカー」が付く | P1-5回 | ✅ |
| N-29 | `Inter` が語境界なしで "The International" にマッチ | P1-5回 | ✅ |
| N-30 | 全OGP・JSON-LDが「世界の確率50%」 | P1-6回 | ✅ |
| N-31 | OGP画像のバッジが数字に重なる | P1-6回 | ✅ |
| N-32 | アプリ本体が「世界オッズ50%」＋「$0」を表示 | P1-7回 | ✅ |
| N-33 | Polymarket由来を「独自調査銘柄」と表記 | P1-7回 | ✅ |
| N-34 | `markets[0]` を代表値にする／プレースホルダ混入 | P1-7回 | ✅ |
| N-35 | アプリとプリレンダーで数字が最大100pt食い違う | P1-8回 | ✅ |
| N-36 | 決着済み53件を予測として表示 | P1-8回 | ✅ |
| N-37 | 非アクティブ化した53URLがトップの複製を返す | P1-9回 | ✅ |
| N-38 | 答えが出せる9件を【世界観測銘柄】にしている | P1-10回 | ✅ |
| **N-39** | 「40件未満」は `<40` が35%で存在するのに抑制 | P1-11回 | ❌ |
| P0-1〜P0-5 | sitemap / プリレンダー / canonical / JSON-LD / OGP | Phase 0 | ✅ |
| **P0-6** | Cloudflare Functions（`/api/mcp`） | Phase 0 | ❌ |
| P1-1〜P1-4 | description個別化 / 記事 / 内部リンク / コピー | Phase 1 | ✅ |

---

## 5. レポートの作り方

`.md` が原本です。**`.html` は派生物で、git では追跡していません**（`.gitignore` 参照）。

```bash
python3 scripts/report_to_html.py <入力.md> <出力.html> docs/_report_template.html <meta.json>
```

`meta.json` の形：

```json
{
  "eyebrow": "Phase 1 検証レポート（第10回）",
  "date": "2026-08-23",
  "title": "見出し",
  "dek": "リード文（<strong> 可）",
  "tiles": [{ "kind": "ok", "v": "77", "unit": "/77", "label": "本番の配信品質<br>（未達0件）" }]
}
```

`kind` は `ok`（緑）／`ng`（赤）。テンプレート（CSS一式）は `docs/_report_template.html`。

> 第10回まで、この生成器はセッションの作業領域にしか無く、**消えると再生成できない**状態でした。
> 出力（1.3MB）だけをコミットして生成器をコミットしていない、という逆転が起きていたため、
> 第10回で生成器をリポジトリへ移し、出力を追跡対象から外しました。
