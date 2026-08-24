# 🗺️ 大手ブログ・Webメディア向け「埋め込みウィジェット」強化仕様書 ＆ 実装ロードマップ

本ドキュメントは、別セッションにて**「Webメディア・個人ブログ向け インタラクティブ埋め込みウィジェット」**の高度化・機能拡張をスムーズに実装するための完全設計仕様書です。

---

## 1. 開発の背景と戦略的価値

* **メディア側への提供価値**:
  * 記事内に1行の `<iframe>` を貼るだけで、リアルタイムで更新される「世界確率 vs 日本世論」の動的ウィジェットを読者に提供可能（記事の陳腐化防止・読者参加率の向上）。
* **未来レーダーへのリターン**:
  * 大手ニュースメディア、経済・テック系ブログ、note等からの自然な被リンク（SEO評価の飛躍的向上）と、月間数十万PV規模のオーガニック流入の自動獲得。

---

## 2. 実装予定の3大機能仕様

### ① ライトモード（白背景 / クリーンテーマ）対応
* **URLパラメータ**: `https://mirairadar.com/embed/{slug_or_id}?theme=light`
* **仕様**:
  * 一般的なWebメディア（note、WordPressブログ、白系ニュースサイト）に馴染む、白基調＋ダークスレート文字＋視認性の高いボーダーのスタイリッシュなデザイン。
  * `theme=dark`（デフォルト: Cyber Dark）と `theme=light` をクエリパラメータで切り替え可能に設計。

### ② レイアウト形状の選択（2パターン）
1. **カード型（標準 / 縦型）**:
   * 推奨サイズ: `width="100%" height="320px"`（最大幅 380px）
   * 用途: サイドバー、記事末尾、スマホ幅での単独表示
2. **インライン・バナー型（横長）**:
   * URLパラメータ: `https://mirairadar.com/embed/{slug_or_id}?layout=banner`
   * 推奨サイズ: `width="100%" height="160px"`
   * 用途: 記事の段落と段落の間（インライン）に自然に差し込めるスリムな横長オッズバー。

### ③ 埋め込みコード生成UI（`EmbedModal.tsx`）の直感化
* **プレビュー機能**:
  * モーダル内で「ダーク / ライト」「カード / バナー」を切り替え、リアルタイムに表示を確認可能。
* **1クリックコードコピー**:
  * 標準 `<iframe>` コードのワンクリックコピー。
  * WordPress / note 用の埋め込み解説テキスト。

---

## 3. 修正・拡張対象のファイル一覧

1. **`src/components/EmbedWidgetPage.tsx`**:
   * URLクエリ（`useSearchParams` または `window.location.search`）から `theme` (`light` | `dark`) と `layout` (`card` | `banner`) をパース。
   * ライトテーマ時の配色クラス・インラインバナーレイアウトの分岐描画を追加。
2. **`src/components/EmbedModal.tsx`**:
   * テーマ切り替えトグル（🌙 Dark / ☀️ Light）およびレイアウト選択（🎴 カード / 📏 バナー）を追加。
   * 選択に応じた `<iframe>` コードを自動生成してコピーできるように改修。
3. **`src/index.css`**:
   * `.embed-widget-light` および `.embed-widget-banner` 用のレスポンシブスタイルを定義。

---

## 4. 次期セッションでの作業手順（Step-by-Step）

1. `git pull --rebase origin main` で最新状態を確認。
2. `src/components/EmbedWidgetPage.tsx` に `theme=light` / `layout=banner` のレンダリングロジックを実装。
3. `src/components/EmbedModal.tsx` にカスタマイズ・プレビューUIを統合。
4. `npm run build && node scripts/audit_self_check.mjs` を実行し、全30項目の監査合格を確認。
5. コミット ＆ プッシュ。
