import React, { useEffect } from 'react';
import { 
  ArrowLeft, 
  Compass, 
  Eye, 
  ShieldCheck, 
  Bot, 
  Scale, 
  Sparkles, 
  CheckCircle2, 
  Share2, 
  Building2
} from 'lucide-react';

interface AboutPageProps {
  onBack: () => void;
  onOpenProposeModal?: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onBack, onOpenProposeModal }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = '未来レーダーについて ｜ 世界の集合知 × 日本の世論インテリジェンス・メディア';
  }, []);

  const handleShare = () => {
    const text = '未来レーダー（MiraiRadar）｜ 世界の集合知（Polymarket）× 日本の世論を可視化する公共インテリジェンス・メディア';
    const url = 'https://mirairadar.com/about';
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in text-slate-200">
      {/* 戻るバー */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800/80">
        <a 
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onBack();
          }}
          className="inline-flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-950/40 hover:bg-cyan-950/70 border border-cyan-800/50 px-3.5 py-1.5 rounded-lg no-underline cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>マーケット一覧へ戻る</span>
        </a>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            title="Xでシェア"
          >
            <Share2 size={13} />
            <span>Xでシェア</span>
          </button>
        </div>
      </div>

      {/* ヒーローセクション */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/90 border border-cyan-500/30 p-6 sm:p-10 mb-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 text-xs font-mono font-semibold tracking-wider uppercase mb-4">
            <Compass size={14} className="animate-spin-slow" />
            MISSION & PHILOSOPHY
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
            未来レーダーについて
          </h1>
          <p className="text-base sm:text-xl text-slate-300 leading-relaxed max-w-3xl">
            世界の集合知（Polymarket）と日本の生世論を照らし合わせ、<br className="hidden sm:inline" />
            未来の不確実性を科学的に可視化する<span className="text-cyan-400 font-semibold">「非胴元型」インテリジェンス・メディア</span>です。
          </p>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="space-y-12 leading-relaxed">
        
        {/* §1 ミッション */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4 text-cyan-400">
            <Eye size={22} />
            <h2 className="text-xl sm:text-2xl font-bold text-white">1. 私たちのミッション（なぜ未来予測なのか？）</h2>
          </div>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-4">
            現代社会において、ニュースの解説や選挙・経済の展望は、コメンテーターの主観や感情的な世論調査に左右されがちです。しかし、世界中のお金（数億ドル）が投じられるグローバル予測市場（Polymarket等）では、極めて冷酷で客観的な「確率（世界オッズ）」が24時間365日形成されています。
          </p>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            未来レーダーは、その<strong className="text-white">「世界のリアルマネーが弾き出す客観的オッズ」</strong>と、<strong className="text-white">「日本人が直感で捉えるリアルな世論」</strong>を対比させ、その間に存在する<strong className="text-cyan-400">【スプレッド（世論ギャップ）】</strong>をリアルタイムに記録・公開するために誕生しました。
          </p>
        </section>

        {/* §2 気象台モデル */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4 text-amber-400">
            <Scale size={22} />
            <h2 className="text-xl sm:text-2xl font-bold text-white">2. 「気象台モデル」— 胴元（House）を持たない公共インフラ</h2>
          </div>
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-4 mb-4 text-amber-200/90 text-sm">
            <span className="font-bold block mb-1">⚠️ 賭博性ゼロの公共情報ポータル</span>
            未来レーダーは賭博サイトではありません。金銭の賭け、ポイントの換金、テラ銭（手数料のピンハネ）は一切行わず、<strong>完全無料・登録不要・1秒投票</strong>で誰でも利用できる公共メディアです。
          </div>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-4">
            気象台は天気を操作せず、雨に金を賭けさせることもなく、雲の動きと観測データを正確に市民に届けます。
            同様に、未来レーダーは<strong>「世界の予測と日本の世論を中立・客観的に記録する観測所」</strong>として機能します。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="p-4 rounded-lg bg-slate-950/50 border border-slate-800">
              <span className="text-cyan-400 text-xs font-mono font-bold block mb-1">01. 参加費 0円</span>
              <p className="text-xs text-slate-400">登録不要・課金なし・1クリックで日本の世論を形成。</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-950/50 border border-slate-800">
              <span className="text-cyan-400 text-xs font-mono font-bold block mb-1">02. 胴元なし</span>
              <p className="text-xs text-slate-400">運営者に利害関係がなく、オッズや世論を歪めない構造。</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-950/50 border border-slate-800">
              <span className="text-cyan-400 text-xs font-mono font-bold block mb-1">03. 公開オラクル</span>
              <p className="text-xs text-slate-400">決着は公的発表・公式記録に基づいて自動アーカイブ。</p>
            </div>
          </div>
        </section>

        {/* §3 3大上場基準 */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4 text-emerald-400">
            <ShieldCheck size={22} />
            <h2 className="text-xl sm:text-2xl font-bold text-white">3. 銘柄の「3大上場基準（Listing Triple Standard）」</h2>
          </div>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
            無責任なデマ、誹謗中傷、主観的な陰謀論を100%排除するため、当サイトに掲載される全ての銘柄は以下の3基準を厳格にクリアしています。
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-white text-base mb-1">① 確定的検証性（Verifiable Truth）</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  決着期日および結果判定に用いる公的ソース（官報・公的統計・決算短信・主催者公式発表）がURLレベルで事前定義されていること。「〇〇は良い人か？」のような主観的テーマは一切採用しません。
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-white text-base mb-1">② 公共性・倫理（Public Interest & Ethics）</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  個人の名誉毀損、プライバシー侵害、犯罪・個人の生死に関わるゴシップを完全排除。政治・マクロ経済・先端技術・カルチャーの健全な未来予測に限定します。
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-white text-base mb-1">③ 問いの中立性（Neutral Framing）</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  質問文に特定のイデオロギーや誘導的な形容詞を含めず、事実関係を簡潔・中立に問う形式を徹底します。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* §4 WebMCP ＆ オープンデータ宣言 */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4 text-purple-400">
            <Bot size={22} />
            <h2 className="text-xl sm:text-2xl font-bold text-white">4. WebMCP ＆ オープンデータ宣言（生成AIとの共生）</h2>
          </div>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-4">
            未来レーダーは、人間だけでなく<strong>生成AI（ChatGPT、Claude、Perplexity等）やリサーチャーがリアルタイム世論データを自由に取得・分析できるWebMCP（Model Context Protocol）およびJSON-LD構造化データ</strong>を完備しています。
          </p>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-4">
            AIエージェントが「現在の日本における政策や経済動向の世論コンセンサス」を答える際の信頼できる公式データオラクルとして、広くデータを開放しています。
          </p>
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded bg-purple-950/40 border border-purple-800/40 text-purple-300">WebMCP Ready</span>
            <span className="px-2.5 py-1 rounded bg-purple-950/40 border border-purple-800/40 text-purple-300">Schema.org / JSON-LD</span>
            <span className="px-2.5 py-1 rounded bg-purple-950/40 border border-purple-800/40 text-purple-300">Open Data Export</span>
          </div>
        </section>

        {/* §5 運営体制・ガバナンス */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4 text-blue-400">
            <Building2 size={22} />
            <h2 className="text-xl sm:text-2xl font-bold text-white">5. 運営体制 ＆ ガバナンス情報</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <tbody>
                <tr className="border-b border-slate-800">
                  <th className="py-3 px-4 text-slate-400 font-medium w-36 bg-slate-950/40">サービス名称</th>
                  <td className="py-3 px-4 text-white font-semibold">未来レーダー（Mirai Radar）</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <th className="py-3 px-4 text-slate-400 font-medium bg-slate-950/40">サービスURL</th>
                  <td className="py-3 px-4 text-cyan-400 font-mono">https://mirairadar.com</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <th className="py-3 px-4 text-slate-400 font-medium bg-slate-950/40">運営責任者</th>
                  <td className="py-3 px-4 text-white">霧島フェニックス（Phoenix Kirishima）</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <th className="py-3 px-4 text-slate-400 font-medium bg-slate-950/40">運営形態</th>
                  <td className="py-3 px-4 text-slate-300">Web3×集合知 非胴元型インテリジェンス・メディア（パブリック・グッズ構想）</td>
                </tr>
                <tr>
                  <th className="py-3 px-4 text-slate-400 font-medium bg-slate-950/40">準拠法令</th>
                  <td className="py-3 px-4 text-slate-300">日本国刑法第185条（賭博の禁止）完全準拠・金銭取引および換金要素なし</td>
                </tr>
              </tbody>
            </table>
          </div>

          {onOpenProposeModal && (
            <div className="mt-6 pt-6 border-t border-slate-800 text-center">
              <p className="text-xs text-slate-400 mb-3">「このテーマを占いたい」という銘柄の提案はどなたでも自由に行えます。</p>
              <button
                onClick={onOpenProposeModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm transition-all shadow-lg shadow-cyan-900/30 cursor-pointer"
              >
                <Sparkles size={16} />
                <span>新しい予測銘柄を提案する</span>
              </button>
            </div>
          )}
        </section>

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
