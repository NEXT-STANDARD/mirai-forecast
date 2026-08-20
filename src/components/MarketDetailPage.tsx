import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  MessageSquare, 
  Calendar, 
  ShieldCheck, 
  Clock,
  FileText,
  Layers,
  ChevronRight,
  Flame,
  Share2,
  Code2,
  Download
} from 'lucide-react';
import { MainTradingChart } from './MainTradingChart';
import { OrderBookConsensus } from './OrderBookConsensus';
import type { MarketItem } from '../types';
import { applySeoMetadata } from '../utils/seoHelper';

interface MarketDetailPageProps {
  item: MarketItem;
  allEvents: MarketItem[];
  userVote: 'YES' | 'NO' | null;
  onVote: (eventId: string, choice: 'YES' | 'NO') => void;
  onOpenShare: (item: MarketItem) => void;
  onOpenEmbed?: (item: MarketItem) => void;
  onOpenDataExport?: (item: MarketItem) => void;
  onBack: () => void;
  onSelectRelatedEvent: (item: MarketItem) => void;
}

export const MarketDetailPage: React.FC<MarketDetailPageProps> = ({
  item,
  allEvents,
  userVote,
  onVote,
  onOpenShare,
  onOpenEmbed,
  onOpenDataExport,
  onBack,
  onSelectRelatedEvent,
}) => {
  const [commentInput, setCommentInput] = useState('');
  const [comments, setComments] = useState(item.comments || []);

  // 🌐 SEO: カノニカル正規化URL・メタタグ・JSON-LD構造化データの動的最適化
  useEffect(() => {
    const slug = item.slug || item.id;
    const canonicalUrl = `https://mirairadar.com/market/${encodeURIComponent(slug)}`;
    const description = `【世界オッズ YES ${item.worldProbYes}% vs 日本世論 YES ${item.japanVotes.percentYes}%】${item.titleJa}。世界のリアルマネー確率と日本のリアルタイム世論を徹底分析・比較。`;

    applySeoMetadata({
      title: `${item.titleJa} ｜ 未来レーダー（MiraiRadar）`,
      description,
      canonicalUrl,
      ogType: 'article',
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "ItemPage",
        "name": item.titleJa,
        "description": description,
        "url": canonicalUrl,
        "mainEntity": {
          "@type": "Question",
          "name": item.question || item.titleJa,
          "suggestedAnswer": [
            {
              "@type": "Answer",
              "text": `世界のスマートマネー予測（Polymarket）: YES ${item.worldProbYes}%`
            },
            {
              "@type": "Answer",
              "text": `日本の生活者世論コンセンサス: YES ${item.japanVotes.percentYes}%`
            }
          ]
        }
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    return () => {
      // トップページ復帰時のカノニカルリセット
      applySeoMetadata({
        title: '未来レーダー (MiraiRadar) | 世界の集合知（Polymarket） × 日本の世論',
        description: '世界最大の予測市場（Polymarket）のリアルマネー確率と、日本のリアルタイム世論を比較・可視化する金融インテリジェンスメディア「未来レーダー（mirairadar.com）」。登録不要・1秒直感投票で世論解禁。',
        canonicalUrl: 'https://mirairadar.com/',
        ogType: 'website'
      });
    };
  }, [item]);

  // コメント投稿
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    const newComment = {
      id: `comm_${Date.now()}`,
      author: userVote ? `予報士（${userVote}支持）` : '未来ウォッチャー',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      vote: userVote || ('YES' as const),
      text: commentInput.trim(),
      createdAt: 'たった今',
      likes: 1,
    };

    setComments([newComment, ...comments]);
    setCommentInput('');
  };

  // 関連銘柄（同一カテゴリまたは人気銘柄から3件選定）
  const relatedMarkets = allEvents
    .filter((e) => e.id !== item.id && (e.category === item.category || e.isTrending))
    .slice(0, 3);

  // 世論ギャップ計算
  const gap = Math.abs(item.worldProbYes - item.japanVotes.percentYes);

  const formatCompactUsd = (val?: number) => {
    if (!val || val === 0) return '$0';
    if (val >= 1_000_000) {
      return `$${(val / 1_000_000).toFixed(1)}M`;
    }
    if (val >= 1_000) {
      return `$${Math.round(val / 1_000)}k`;
    }
    return `$${Math.round(val).toLocaleString()}`;
  };

  return (
    <div className="market-detail-container animate-fade-in">
      {/* パンくず ＆ 戻るバー */}
      <div className="market-detail-nav">
        <button onClick={onBack} className="btn-back-link">
          <ArrowLeft size={15} />
          <span>マーケット一覧へ戻る</span>
        </button>

        <div className="market-detail-nav-right">
          <div className="detail-meta-tags">
            <span className="detail-cat-badge">{item.categoryLabel}</span>
            {item.isTrending && (
              <span className="detail-hot-badge">
                <Flame size={12} className="fill-amber-400 text-amber-400" />
                HOT
              </span>
            )}
            <span className="detail-date-badge">
              <Calendar size={12} />
              締切: {(item.endDate || '').split('T')[0]}
            </span>
          </div>

          <div className="detail-top-action-group">
            {onOpenDataExport && (
              <button 
                onClick={() => onOpenDataExport(item)} 
                className="btn-market-data-trigger"
                title="Excel用CSVまたはAI連携(WebMCP)でデータを取得"
              >
                <Download size={13} className="text-amber-400" />
                <span>データ取得</span>
              </button>
            )}

            {onOpenEmbed && (
              <button 
                onClick={() => onOpenEmbed(item)} 
                className="btn-market-embed-trigger"
                title="ブログや記事にこの世論チャートを埋め込む"
              >
                <Code2 size={13} className="text-cyan-400" />
                <span>記事に埋め込む</span>
              </button>
            )}

            <button 
              onClick={() => onOpenShare(item)} 
              className="btn-market-share-trigger"
              title="X（Twitter）でシェア"
            >
              <Share2 size={13} />
              <span>Xでシェア</span>
            </button>
          </div>
        </div>
      </div>

      {/* タイトルヘッダー */}
      <div className="market-detail-header-card">
        <div className="detail-title-block">
          <h1 className="detail-main-title">{item.titleJa}</h1>
          <p className="detail-sub-question">{item.question}</p>
        </div>

        <div className="detail-header-stats-row">
          <div className="header-stat-box">
            <span className="stat-sub">世界オッズ (Polymarket)</span>
            <span className="stat-main text-cyan-400">
              YES {item.worldProbYes}%
              <span className="stat-sub-prob"> / NO {100 - item.worldProbYes}%</span>
            </span>
          </div>

          <div className="header-stat-box">
            <span className="stat-sub">日本世論支持率</span>
            <span className="stat-main text-emerald-400">
              {item.japanVotes.total > 0 ? `YES ${item.japanVotes.percentYes}%` : '受付中 (0票)'}
              {item.japanVotes.total > 0 && <span className="stat-sub-prob"> ({item.japanVotes.total}票)</span>}
            </span>
          </div>

          <div className="header-stat-box">
            <span className="stat-sub">世論スプレッド (Gap)</span>
            {item.japanVotes.total >= 3 ? (
              <span className="stat-main text-amber-400">
                ⚡ {gap}% 乖離 <span className="stat-sub-prob font-mono text-[11px]">(n={item.japanVotes.total})</span>
              </span>
            ) : (
              <span className="stat-main text-slate-400 text-sm flex items-center gap-1">
                <span>サンプル収集中</span>
                <span className="stat-sub-prob font-mono text-[11px]">(n={item.japanVotes.total})</span>
              </span>
            )}
          </div>

          <div className="header-stat-box">
            <span className="stat-sub">観測取引高 (24h / Total)</span>
            <span className="stat-main text-slate-200" title={`24h: $${Math.round(item.volume24hUsd || 0).toLocaleString()} ｜ 累計: $${Math.round(item.totalVolumeUsd || 0).toLocaleString()}`}>
              {formatCompactUsd(item.volume24hUsd)} <span className="stat-sub-prob">/ {formatCompactUsd(item.totalVolumeUsd)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* メイン 2カラムグリッド */}
      <div className="market-detail-grid">
        {/* 左カラム (65%): チャート ＆ AI深層分析 ＆ 判定ルール ＆ コメント */}
        <div className="detail-left-pane">
          {/* 大画面チャート */}
          <div className="detail-chart-wrapper">
            <MainTradingChart
              event={item}
              events={allEvents}
              onSelectEvent={onSelectRelatedEvent}
            />
          </div>

          {/* 💡 Gemini 3.7 Flash 深層カタリスト日程分析 */}
          <div className="detail-section-card ai-catalyst-card">
            <div className="section-card-header">
              <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                <Sparkles className="text-amber-400 w-5 h-5 flex-shrink-0" />
                <h3 className="section-card-title">AIファンダメンタルズ要因 ＆ 注目カタリスト日程</h3>
              </div>
              <span className="badge-ai-model">Gemini 3.7 Flash 分析</span>
            </div>

            <div className="catalyst-content-body">
              <div className="catalyst-summary-box">
                <h4 className="catalyst-summary-title">📌 市場コンセンサス要約</h4>
                <p className="catalyst-summary-text">
                  {item.aiInsight?.summaryJa || '世界のスマートマネーは、直近の市場データやカタリスト日程を織り込みながら確率を形成しています。'}
                </p>
              </div>

              {item.aiInsight?.whyMovedJa && (
                <div className="catalyst-why-box">
                  <h4 className="catalyst-why-title">⚡ 変動の主因 (Why It Moved)</h4>
                  <p className="catalyst-why-text">{item.aiInsight.whyMovedJa}</p>
                </div>
              )}

              {/* ⚔️ Gemini 3.7 知的ディベート対比（YES論拠 vs NO論拠） */}
              <div className="ai-debate-section">
                <div className="debate-header-bar">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 min-w-0 flex-wrap">
                    <span className="text-base flex-shrink-0">⚔️</span>
                    <span>AI知性ディベート：世界スマートマネー vs 慎重派の論拠対比</span>
                  </div>
                  <span className="debate-badge font-mono flex-shrink-0">BULL vs BEAR DEBATE</span>
                </div>

                <div className="debate-cards-grid">
                  {/* 🟢 YES派（実現・強気派）の論拠 */}
                  <div className="debate-card bull-card">
                    <div className="debate-card-header">
                      <span className="debate-tag-bull">🟢 YES支持の主要論拠（強気派）</span>
                      <span className="debate-prob font-mono text-cyan-400">世界 YES {item.worldProbYes}%</span>
                    </div>
                    <p className="debate-card-text">
                      {item.aiInsight?.bullCaseJa || `${item.titleJa} に関して、市場の先行指標や直近のモメンタム、関係機関の積極姿勢を織り込み、スマートマネーが強気な買いを入れている背景が存在します。`}
                    </p>
                  </div>

                  {/* 🔴 NO派（慎重・懐疑・リスク派）の論拠 */}
                  <div className="debate-card bear-card">
                    <div className="debate-card-header">
                      <span className="debate-tag-bear">🔴 NO支持の主要論拠（慎重派）</span>
                      <span className="debate-prob font-mono text-rose-400">世界 NO {100 - item.worldProbYes}%</span>
                    </div>
                    <p className="debate-card-text">
                      {item.aiInsight?.bearCaseJa || `締切日までの時間的猶予、法規制や地政学リスク、および突発的なサプライズ懸念により、一定数のクォンツ勢が下振れリスクを警戒しています。`}
                    </p>
                  </div>
                </div>

                {/* ⚖️ 争点・対立軸の総括 */}
                <div className="debate-summary-box">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 mb-1">
                    <span>⚖️</span>
                    <span>最大の争点・勝負の分かれ目</span>
                  </div>
                  <p className="debate-summary-text">
                    {item.aiInsight?.debateSummaryJa || `今後のカタリスト日程（公式発表や重要指標）における数値が市場予測を上回るかどうかが、確率の急変トリガーとなります。`}
                  </p>
                </div>
              </div>

              {item.aiInsight?.keyCatalysts && item.aiInsight.keyCatalysts.length > 0 && (
                <div className="catalyst-timeline-block">
                  <h4 className="catalyst-timeline-title">
                    <Clock size={14} className="text-amber-400" />
                    <span>次回注目カタリスト日程（確率変動トリガー）</span>
                  </h4>
                  <div className="catalyst-pills-list">
                    {item.aiInsight.keyCatalysts.map((cat, idx) => (
                      <div key={idx} className="catalyst-timeline-item">
                        <div className="catalyst-dot"></div>
                        <span className="catalyst-text">{cat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 📜 判定基準・公式ルール (Polymarket Resolution Rules) */}
          <div className="detail-section-card rules-card">
            <div className="section-card-header">
              <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                <FileText className="text-cyan-400 w-5 h-5 flex-shrink-0" />
                <h3 className="section-card-title">公式判定ルール ＆ 情報源（Resolution Rules）</h3>
              </div>
              <span className="badge-oracle">UMA Optimistic Oracle 準拠</span>
            </div>

            <div className="rules-content-body">
              <div className="rule-item">
                <strong>判定基準（Criteria）:</strong>
                <p>
                  公式締切日（{item.endDate}）までに、質問文「{item.question}」が公式機関によって公式に確認された場合、YESとして判定（Resolution）されます。それ以外の場合はNOとして決済されます。
                </p>
              </div>

              <div className="rule-item">
                <strong>公式情報源（Resolution Source）:</strong>
                <p>
                  対象分野の公式発表機関（MLB公式、米連邦選挙管理委員会、日銀公式発表、SEC公式文書等）および UMA Optimistic Oracle の検証プロセスに基づきます。
                </p>
              </div>

              <div className="rule-compliance-note">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>
                  <strong>法的免責:</strong> 日本国内においては完全無料の意識調査・オルタナティブデータとして提供されており、金銭のベッティング行為は一切行われません。
                </span>
              </div>
            </div>
          </div>

          {/* 💬 日本のコミュニティ議論 ＆ 直感コメント欄 */}
          <div className="detail-section-card comments-card">
            <div className="section-card-header">
              <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                <MessageSquare className="text-slate-300 w-5 h-5 flex-shrink-0" />
                <h3 className="section-card-title">国内コミュニティ議論 ＆ 予報士コメント ({comments.length}件)</h3>
              </div>
            </div>

            {/* コメント投稿フォーム */}
            <form onSubmit={handleAddComment} className="comment-post-form">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder={userVote ? `[${userVote}支持] あなたの直感理由や注目ニュースを投稿...` : 'あなたの直感理由や見解を共有...'}
                className="comment-input-field"
              />
              <button type="submit" className="btn-comment-submit" disabled={!commentInput.trim()}>
                投稿する
              </button>
            </form>

            {/* コメントリスト */}
            <div className="comments-timeline-list">
              {comments.length === 0 ? (
                <div className="empty-comments-box">
                  <p>まだコメントがありません。最初の直感見解を投稿してみましょう！</p>
                </div>
              ) : (
                comments.map((comm) => (
                  <div key={comm.id} className="comment-card-item">
                    <div className="comment-author-row">
                      <div className="flex items-center gap-2">
                        <span className="comment-author-name">{comm.author}</span>
                        <span className={`comment-vote-tag ${comm.vote ? comm.vote.toLowerCase() : 'yes'}`}>
                          [{comm.vote || 'YES'}]
                        </span>
                      </div>
                      <span className="comment-time">{comm.createdAt}</span>
                    </div>
                    <p className="comment-text-content">{comm.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 右カラム (35%): 世論板 ＆ ワンクリック投票 ＆ Xシェア ＆ 関連銘柄 */}
        <div className="detail-right-pane">
          {/* 世論板情報 ＆ 証券風ワンクリック投票 */}
          <OrderBookConsensus
            event={item}
            userVote={userVote}
            onVote={(choice: 'YES' | 'NO') => onVote(item.id, choice)}
            onOpenShare={() => onOpenShare(item)}
          />

          {/* 👥 関連する注目の未来銘柄 */}
          {relatedMarkets.length > 0 && (
            <div className="detail-section-card related-markets-card">
              <div className="section-card-header">
                <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                  <Layers className="text-cyan-400 w-4 h-4 flex-shrink-0" />
                  <h4 className="section-card-title text-xs">関連する注目の未来銘柄</h4>
                </div>
              </div>

              <div className="related-markets-list">
                {relatedMarkets.map((rel) => (
                  <div
                    key={rel.id}
                    onClick={() => onSelectRelatedEvent(rel)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectRelatedEvent(rel);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${rel.titleJa}の詳細を見る`}
                    className="related-market-item"
                  >
                    <div className="related-info">
                      <span className="related-cat">{rel.categoryLabel.slice(0, 6)}</span>
                      <h5 className="related-title">{rel.titleJa}</h5>
                    </div>
                    <div className="related-prob text-cyan-400">
                      <span>{rel.worldProbYes}%</span>
                      <ChevronRight size={14} className="text-slate-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
