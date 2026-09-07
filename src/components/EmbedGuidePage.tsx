import React, { useState, useEffect } from 'react';
import type { MarketItem } from '../types';
import { applySeoMetadata } from '../utils/seoHelper';
import { 
  ArrowLeft, 
  Code2, 
  Sparkles, 
  Copy, 
  Check, 
  FileCode, 
  Share2, 
  Layers, 
  RefreshCw, 
  ShieldCheck,
  Zap,
  ExternalLink
} from 'lucide-react';

interface EmbedGuidePageProps {
  onBack: () => void;
  events: MarketItem[];
  onSelectEvent?: (item: MarketItem) => void;
}

type EmbedTheme = 'dark' | 'light';
type EmbedLayout = 'card' | 'banner';
type CodeFormat = 'html' | 'wordpress';

const LAYOUT_HEIGHT: Record<EmbedLayout, number> = { card: 270, banner: 160 };
const LAYOUT_MAX_WIDTH: Record<EmbedLayout, number> = { card: 600, banner: 720 };

export const EmbedGuidePage: React.FC<EmbedGuidePageProps> = ({ onBack, events, onSelectEvent }) => {
  const [selectedMarketId, setSelectedMarketId] = useState<string>(() => {
    return events[0]?.slug || events[0]?.id || '';
  });
  const [theme, setTheme] = useState<EmbedTheme>('dark');
  const [layout, setLayout] = useState<EmbedLayout>('card');
  const [codeFormat, setCodeFormat] = useState<CodeFormat>('html');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    applySeoMetadata({
      title: 'メディア・ブログ向け 埋め込みウィジェット無償配給ガイド ｜ 未来レーダー',
      description: 'メディア・ブログ向け無料リアルタイム世論ウィジェット。1行のHTMLでPolymarket世界確率と日本世論のインタラクティブチャートを設置可能。',
      canonicalUrl: 'https://mirairadar.com/embed-guide',
      ogType: 'article',
    });
  }, []);

  const activeMarket = events.find((e) => (e.slug || e.id) === selectedMarketId) || events[0];

  const params = new URLSearchParams();
  if (theme === 'light') params.set('theme', 'light');
  if (layout === 'banner') params.set('layout', 'banner');
  const query = params.toString() ? `?${params.toString()}` : '';

  const embedSlug = activeMarket ? (activeMarket.slug || activeMarket.id) : '';
  const embedPath = `/embed/${embedSlug}${query}`;
  const embedUrl = `https://mirairadar.com${embedPath}`;

  const iframeHeight = LAYOUT_HEIGHT[layout];
  const borderStyle = theme === 'light'
    ? 'border: 1px solid rgba(15, 23, 42, 0.15); border-radius: 12px;'
    : 'border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 12px;';
  const shadowStyle = theme === 'light'
    ? 'box-shadow: 0 2px 12px rgba(15, 23, 42, 0.08);'
    : 'box-shadow: 0 4px 20px rgba(0,0,0,0.4);';

  const rawIframe = `<iframe src="${embedUrl}" width="100%" height="${iframeHeight}" frameborder="0" style="${borderStyle} max-width: ${LAYOUT_MAX_WIDTH[layout]}px; width: 100%; ${shadowStyle}" title="${(activeMarket?.titleJa || activeMarket?.title || '')} - 未来レーダー世論ウィジェット"></iframe>`;

  const finalCode = codeFormat === 'wordpress'
    ? `<!-- wp:html -->\n${rawIframe}\n<!-- /wp:html -->`
    : rawIframe;

  const handleCopy = () => {
    navigator.clipboard.writeText(finalCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const text = '未来レーダー（MiraiRadar）｜ メディア・ブログ向け リアルタイム世論ウィジェット無料配給ガイド';
    const url = 'https://mirairadar.com/embed-guide';
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  return (
    <div className="w-full animate-fade-in text-slate-200 py-2">
      {/* ナビゲーションバー */}
      <div className="flex items-center justify-between gap-4 mb-8 pb-4 border-b border-cyan-900/40">
        <a 
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onBack();
          }}
          className="flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-200 bg-cyan-950/40 hover:bg-cyan-900/60 px-3.5 py-2 rounded-lg border border-cyan-800/50 transition no-underline cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>トップ・マーケット一覧へ戻る</span>
        </a>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-xs font-mono font-bold text-white bg-[#1d9bf0] hover:bg-[#1a8cd8] px-3.5 py-2 rounded-lg transition shadow-md cursor-pointer"
          title="Xでシェア"
        >
          <Share2 size={13} />
          <span>Xで共有</span>
        </button>
      </div>

      {/* ヒーローセクション */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#0b1320] via-[#0d1829] to-[#0b1320] border border-cyan-900/60 p-6 sm:p-10 mb-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-cyan-400 text-xs font-mono font-semibold tracking-wider uppercase mb-4">
            <Code2 size={14} className="text-cyan-400" />
            FREE MEDIA WIDGET PROGRAM
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
            メディア・ブログ向け 埋め込みウィジェット無償配給ガイド
          </h1>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-4xl">
            あなたの記事に1行のHTMLコードを貼るだけで、<br className="hidden sm:inline" />
            <span className="text-cyan-400 font-semibold">世界のスマートマネー確率（Polymarket）× 日本の生世論</span>がリアルタイムに更新されるインタラクティブ・チャートを完全無料で設置できます。
          </p>
        </div>
      </div>

      {/* 3大メリットカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="p-6 rounded-xl bg-[#0b1320] border border-cyan-900/60 shadow-xl space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <RefreshCw size={18} className="text-cyan-400" />
            <span>1. 記事が絶対に陳腐化しない</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            公開後も、読者が記事を開くたびに最新の確率と投票母数が自動反映。数ヶ月前の記事でも最新の世論オッズを提供し続けます。
          </p>
        </div>

        <div className="p-6 rounded-xl bg-[#0b1320] border border-cyan-900/60 shadow-xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Zap size={18} className="text-emerald-400" />
            <span>2. 読者が記事内で1秒即時投票</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            記事を読みながらその場で「YES/NO」をクリック投票可能。読者の滞在時間とエンゲージメントが劇的に向上します。
          </p>
        </div>

        <div className="p-6 rounded-xl bg-[#0b1320] border border-cyan-900/60 shadow-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <ShieldCheck size={18} className="text-amber-400" />
            <span>3. 完全無料・商用利用OK・賭博性ゼロ</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            総務省届出事業者（Ａ－０８－２４２３７）による適法な公共情報ポータル。登録不要で商用メディア・ブログでも安心してご利用いただけます。
          </p>
        </div>
      </div>

      {/* ライブ・インタラクティブ・サンドボックス */}
      <div className="bg-[#0b1320] border border-cyan-900/60 rounded-2xl p-6 sm:p-10 mb-10 shadow-2xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-cyan-900/50 pb-4">
          <div className="flex items-center gap-2 text-cyan-400">
            <Sparkles size={20} className="text-amber-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              インタラクティブ・ウィジェット生成スタジオ
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">ライブプレビュー ＆ コード自動生成</span>
        </div>

        {/* コントロールパネル */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 銘柄選択 */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              ① 埋め込む予測銘柄を選択:
            </label>
            <select
              value={selectedMarketId}
              onChange={(e) => setSelectedMarketId(e.target.value)}
              className="w-full bg-slate-950 border border-cyan-800/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 transition"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.slug || ev.id}>
                  {ev.titleJa || ev.title}
                </option>
              ))}
            </select>
          </div>

          {/* テーマ選択 */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              ② カラーテーマ:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                🌙 ダーク（標準）
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
                  theme === 'light'
                    ? 'bg-slate-200 border-white text-slate-900'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                ☀️ ライト（白背景）
              </button>
            </div>
          </div>

          {/* レイアウト選択 */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              ③ レイアウト形状:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLayout('card')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
                  layout === 'card'
                    ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                🎴 カード（縦型）
              </button>
              <button
                type="button"
                onClick={() => setLayout('banner')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
                  layout === 'banner'
                    ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                📏 バナー（横長）
              </button>
            </div>
          </div>
        </div>

        {/* プレビュー表示 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">実寸ライブプレビュー:</span>
            <span className="font-mono">{layout === 'banner' ? '横幅 100% × 高さ 160px' : '横幅 100% × 高さ 270px'}</span>
          </div>
          <div 
            className="rounded-2xl p-4 sm:p-6 transition-colors border"
            style={{ 
              background: theme === 'light' ? '#f1f5f9' : '#040711',
              borderColor: theme === 'light' ? '#cbd5e1' : 'rgba(56, 189, 248, 0.3)'
            }}
          >
            <div className="max-w-[720px] mx-auto">
              <iframe
                src={embedPath}
                style={{
                  width: '100%',
                  height: `${iframeHeight}px`,
                  border: theme === 'light' ? '1px solid rgba(15, 23, 42, 0.15)' : '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '12px',
                  background: theme === 'light' ? '#ffffff' : '#040711',
                  boxShadow: theme === 'light' ? '0 2px 12px rgba(15, 23, 42, 0.08)' : '0 4px 20px rgba(0,0,0,0.4)'
                }}
                title="未来レーダー ウィジェットプレビュー"
              />
              {onSelectEvent && activeMarket && (
                <div className="text-right pt-2">
                  <button
                    type="button"
                    onClick={() => onSelectEvent(activeMarket)}
                    className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium transition cursor-pointer"
                  >
                    <span>この銘柄の予測詳細・分析データを見る</span>
                    <ExternalLink size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* コード生成・コピーエリア */}
        <div className="bg-slate-950/80 border border-cyan-900/60 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <FileCode size={16} className="text-cyan-400" />
              <span className="text-xs font-bold text-slate-200">貼り付けコード形式:</span>
              <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setCodeFormat('html')}
                  className={`px-3 py-1 rounded text-xs font-mono transition cursor-pointer ${
                    codeFormat === 'html' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  標準 HTML / iframe
                </button>
                <button
                  type="button"
                  onClick={() => setCodeFormat('wordpress')}
                  className={`px-3 py-1 rounded text-xs font-mono transition cursor-pointer ${
                    codeFormat === 'wordpress' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  WordPress（カスタムHTML）
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold font-mono transition shadow-md shadow-cyan-950/50 cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
              <span>{copied ? 'コピーしました！' : '埋め込みコードをコピー'}</span>
            </button>
          </div>

          <textarea
            readOnly
            value={finalCode}
            rows={3}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-xs font-mono text-cyan-300 leading-relaxed focus:outline-none resize-none select-all"
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
        </div>
      </div>

      {/* CMS別・導入手順ガイド */}
      <div className="bg-[#0b1320] border border-cyan-900/60 rounded-2xl p-6 sm:p-10 mb-10 shadow-2xl space-y-6">
        <div className="flex items-center gap-3 text-cyan-400 border-b border-cyan-900/50 pb-4">
          <Layers size={22} />
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            CMS別 3分導入ガイド
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* WordPress */}
          <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center text-xs font-mono">W</span>
              WordPress（ブロックエディタ）
            </h3>
            <ol className="text-xs text-slate-400 space-y-2 list-decimal pl-4 leading-relaxed">
              <li>記事編集画面で「＋」ボタンをクリック。</li>
              <li>ブロック検索で<strong>「カスタムHTML」</strong>を選択。</li>
              <li>上記の「WordPress用コード」をコピーして貼り付け。</li>
              <li>プレビューで表示を確認して記事を公開するだけです。</li>
            </ol>
          </div>

          {/* はてなブログ / ライブドア */}
          <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 flex items-center justify-center text-xs font-mono">H</span>
              はてなブログ ＆ ライブドアブログ
            </h3>
            <ol className="text-xs text-slate-400 space-y-2 list-decimal pl-4 leading-relaxed">
              <li>記事の編集モードを<strong>「HTML編集」</strong>（またはMarkdown編集）に切り替え。</li>
              <li>挿入したい位置に、上記の「標準HTMLコード」をそのままペースト。</li>
              <li>「プレビュー」タブでウィジェットが正常に表示されるか確認します。</li>
            </ol>
          </div>

          {/* 自社メディア・Webサイト */}
          <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-950 text-purple-400 flex items-center justify-center text-xs font-mono">&lt;&gt;</span>
              自社開発Webメディア / Jamstack
            </h3>
            <ol className="text-xs text-slate-400 space-y-2 list-decimal pl-4 leading-relaxed">
              <li>記事テンプレートやCMS記事本文の任意の場所に `iframe` コードを挿入。</li>
              <li>横幅は自動で親要素の `100%`（最大幅720px）にレスポンシブ適応します。</li>
              <li>CSSの読み込みやJSスクリプトの追加は一切不要（iframe単体で完結）です。</li>
            </ol>
          </div>

          {/* note / Substack */}
          <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-950 text-amber-400 flex items-center justify-center text-xs font-mono">N</span>
              note ＆ Substack（メルマガ）
            </h3>
            <ol className="text-xs text-slate-400 space-y-2 list-decimal pl-4 leading-relaxed">
              <li>note等のiframe非対応媒体では、銘柄URL（例: `https://mirairadar.com/market/...`）を記事内にペースト。</li>
              <li>リッチなOGPブログカードが自動展開され、読者を世論調査へ誘導できます。</li>
            </ol>
          </div>
        </div>
      </div>

      {/* 利用規約・クレジット表記 */}
      <div className="bg-[#0b1320] border border-cyan-900/60 rounded-2xl p-6 sm:p-10 mb-10 shadow-2xl space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <ShieldCheck size={20} className="text-emerald-400" />
          <span>ウィジェットご利用条件 ＆ クレジット（無償配給規約）</span>
        </h2>
        <ul className="text-xs text-slate-300 space-y-2 list-disc pl-5 leading-relaxed">
          <li><strong>無償・商用利用</strong>: 個人ブログ、法人メディア、商業ニュースサイトを問わず、完全無料で自由にご利用いただけます。事前申請も不要です。</li>
          <li><strong>クレジットの保持</strong>: ウィジェット下部の「未来レーダー」へのハイパーリンククレジットを隠さずにそのままご掲載ください。</li>
          <li><strong>非改変・法令遵守</strong>: 賭博や違法コンテンツ、誹謗中傷を主目的とするWebサイトへの埋め込みは固くお断りいたします。</li>
        </ul>
      </div>

      {/* フッター戻るボタン */}
      <div className="mt-12 text-center">
        <a 
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onBack();
          }}
          className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors bg-slate-900/80 hover:bg-slate-800 border border-cyan-800/60 px-6 py-3 rounded-xl no-underline cursor-pointer shadow-lg"
        >
          <ArrowLeft size={16} />
          <span>未来レーダー トップへ戻る</span>
        </a>
      </div>
    </div>
  );
};
