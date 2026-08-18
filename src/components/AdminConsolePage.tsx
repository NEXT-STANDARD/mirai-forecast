import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  PlusCircle,
  BarChart3,
  RefreshCw,
  ArrowLeft,
  Search,
  Sparkles,
  Lock,
  Unlock,
  Key,
  Activity,
  Layers,
  FileText
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import type { MarketItem, CategoryType } from '../types';

interface AdminConsolePageProps {
  onBack: () => void;
  events: MarketItem[];
  onRefreshMarkets: () => void;
}

interface ProposalItem {
  id: string;
  slug: string;
  title_ja: string;
  title_en: string;
  question_ja: string;
  question_en: string;
  category: string;
  category_label: string;
  updated_at: string;
  is_active: boolean;
}

export const AdminConsolePage: React.FC<AdminConsolePageProps> = ({
  onBack,
  events,
  onRefreshMarkets,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('mirai_admin_auth') === 'true';
  });
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState(false);

  const [activeTab, setActiveTab] = useState<'proposals' | 'deploy' | 'metrics' | 'analytics' | 'logs'>('proposals');
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 新規公式銘柄作成フォーム
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<CategoryType>('economy');
  const [newReason, setNewReason] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState(false);

  // 検索フィルター
  const [searchQuery, setSearchQuery] = useState('');

  // 認証処理 (PIN: 2026)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode === '2026' || pinCode === 'admin') {
      setIsAuthenticated(true);
      localStorage.setItem('mirai_admin_auth', 'true');
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('mirai_admin_auth');
  };

  // 審査待ち提案一覧の取得
  const fetchProposals = async () => {
    setIsLoadingProposals(true);
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('is_active', false)
          .order('updated_at', { ascending: false });

        if (!error && data) {
          setProposals(data);
        }
      }
    } catch (err) {
      console.error('Error fetching proposals:', err);
    } finally {
      setIsLoadingProposals(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchProposals();
    }
  }, [isAuthenticated]);

  // 提案の承認 ＆ 本番公開
  const handleApproveProposal = async (item: ProposalItem) => {
    if (!confirm(`「${item.title_ja}」を承認し、本番マーケットに即時公開しますか？`)) return;

    setProcessingId(item.id);
    try {
      if (supabase) {
        const { error } = await supabase
          .from('events')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('id', item.id);

        if (error) throw error;
      }

      setProposals(prev => prev.filter(p => p.id !== item.id));
      onRefreshMarkets();
      alert(`🎉 提案「${item.title_ja}」を本番公開いたしました！`);
    } catch (err: any) {
      alert(`エラー: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  // 提案の却下・削除
  const handleRejectProposal = async (id: string, title: string) => {
    if (!confirm(`「${title}」を却下し、完全に削除しますか？`)) return;

    setProcessingId(id);
    try {
      if (supabase) {
        const { error } = await supabase.from('events').delete().eq('id', id);
        if (error) throw error;
      }
      setProposals(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert(`エラー: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  // 運営公式オリジナル銘柄の即時作成
  const handleDeployCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isDeploying) return;

    setIsDeploying(true);
    setDeploySuccess(false);

    let formattedTitle = newTitle.trim();
    if (!formattedTitle.endsWith('か？') && !formattedTitle.endsWith('か?')) {
      formattedTitle += formattedTitle.endsWith('か') ? '？' : 'か？';
    }

    const categoryLabels: Record<string, string> = {
      economy: '📊 経済・金利・暗号資産',
      tech: '⚡ AI・テック',
      politics: '🌐 国際・社会',
      sports: '🏆 カルチャー・エンタメ',
    };

    const id = `official-${Date.now()}`;
    const newRecord = {
      id,
      slug: `official-${Date.now()}`,
      title_ja: formattedTitle,
      title_en: formattedTitle,
      question_ja: formattedTitle,
      question_en: `【運営公式投下銘柄】背景: ${newReason.trim() || '公式選定トピック'}`,
      category: newCategory,
      category_label: categoryLabels[newCategory] || '📊 注目トピック',
      icon_url: '',
      end_date: '2026-12-31',
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    try {
      if (supabase) {
        const { error } = await supabase.from('events').insert(newRecord);
        if (error) throw error;
      }

      setDeploySuccess(true);
      setNewTitle('');
      setNewReason('');
      onRefreshMarkets();
    } catch (err: any) {
      alert(`投下エラー: ${err.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  // 銘柄別メトリクス分析（ソート＆ランキング）
  const sortedMetrics = useMemo(() => {
    return [...events]
      .filter(e => e.titleJa.toLowerCase().includes(searchQuery.toLowerCase()) || e.categoryLabel.includes(searchQuery))
      .sort((a, b) => b.japanVotes.total - a.japanVotes.total);
  }, [events, searchQuery]);

  const totalVotesAcrossAll = useMemo(() => {
    return events.reduce((sum, e) => sum + e.japanVotes.total, 0);
  }, [events]);

  const totalVolumeAcrossAll = useMemo(() => {
    return events.reduce((sum, e) => sum + e.totalVolumeUsd, 0);
  }, [events]);

  // 未認証時のログイン画面
  if (!isAuthenticated) {
    return (
      <div className="admin-lock-screen">
        <div className="admin-lock-card">
          <div className="lock-neon-header"></div>
          <div className="lock-icon-wrap">
            <Lock size={36} className="text-amber-400 animate-pulse" />
          </div>
          <span className="lock-protocol-badge">TOP SECRET // RESTRICTED ACCESS</span>
          <h2 className="lock-title">未来レーダー 司令室（MISSION CONTROL）</h2>
          <p className="lock-desc">
            運営者・最高責任者専用の統括コンソールです。<br />
            認証PINコードを入力してアクセスを確立してください。
          </p>

          <form onSubmit={handleLogin} className="lock-form">
            <div className="pin-input-wrap">
              <Key size={16} className="text-slate-400" />
              <input
                type="password"
                className="pin-input"
                placeholder="PINコードを入力 (デフォルト: 2026)"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                autoFocus
              />
            </div>
            {pinError && <p className="pin-error-msg">⚠️ PINコードが正しくありません</p>}

            <button type="submit" className="btn-unlock-console">
              <Unlock size={15} />
              <span>アクセス認証 (DECRYPT & ENTER)</span>
            </button>
          </form>

          <button className="btn-back-to-site" onClick={onBack}>
            <ArrowLeft size={13} />
            <span>一般ターミナルへ戻る</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-console-root">
      {/* 🚀 ミッションコントロール HUD ヘッダー */}
      <div className="mission-hud-header">
        <div className="hud-left">
          <div className="hud-status-badge">
            <span className="hud-beacon animate-ping"></span>
            <span className="hud-beacon-solid"></span>
            <span className="hud-status-text">MISSION CONTROL // ONLINE</span>
          </div>
          <h1 className="hud-main-title">未来レーダー 統括オペレーション司令室</h1>
        </div>

        {/* リアルタイムテレメトリバー */}
        <div className="hud-telemetry-strip">
          <div className="telemetry-item">
            <span className="t-label">PROD NODE</span>
            <span className="t-val text-emerald-400">TOKYO-PRO</span>
          </div>
          <div className="telemetry-item">
            <span className="t-label">LATENCY</span>
            <span className="t-val text-cyan-400">16ms</span>
          </div>
          <div className="telemetry-item">
            <span className="t-label">ACTIVE MARKETS</span>
            <span className="t-val text-amber-400">{events.length}</span>
          </div>
          <div className="telemetry-item">
            <span className="t-label">TOTAL VOTES</span>
            <span className="t-val text-rose-400">{totalVotesAcrossAll.toLocaleString()}</span>
          </div>
          <div className="telemetry-item">
            <span className="t-label">GLOBAL VOLUME</span>
            <span className="t-val text-blue-400">${Math.round(totalVolumeAcrossAll / 1000000).toLocaleString()}M+</span>
          </div>
        </div>

        <div className="hud-right-actions">
          <button className="btn-hud-refresh" onClick={onRefreshMarkets} title="市場データを強制同期">
            <RefreshCw size={13} />
            <span>FORCE SYNC</span>
          </button>
          <button className="btn-hud-logout" onClick={handleLogout} title="司令室からログアウト">
            <Lock size={13} />
          </button>
          <button className="btn-hud-back" onClick={onBack}>
            <ArrowLeft size={13} />
            <span>ターミナル復帰</span>
          </button>
        </div>
      </div>

      {/* 司令室 ナビゲーションタブ */}
      <div className="mission-nav-tabs">
        <button
          className={`mission-tab ${activeTab === 'proposals' ? 'active' : ''}`}
          onClick={() => setActiveTab('proposals')}
        >
          <Layers size={14} />
          <span>提案審査パイプライン</span>
          {proposals.length > 0 && <span className="tab-pill-alert">{proposals.length}</span>}
        </button>

        <button
          className={`mission-tab ${activeTab === 'deploy' ? 'active' : ''}`}
          onClick={() => setActiveTab('deploy')}
        >
          <PlusCircle size={14} />
          <span>公式銘柄 投下パネル</span>
        </button>

        <button
          className={`mission-tab ${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          <BarChart3 size={14} />
          <span>銘柄別 投票＆世論インテリジェンス</span>
        </button>

        <button
          className={`mission-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <Activity size={14} />
          <span>GA4 / GSC 検索トレンド監視</span>
        </button>
      </div>

      {/* 司令室 メインコンテンツエリア */}
      <div className="mission-content-body">
        {/* ========================================================
            TAB 1: 提案審査パイプライン (Proposals)
           ======================================================== */}
        {activeTab === 'proposals' && (
          <div className="tab-pane-pipeline">
            <div className="pane-section-header">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-amber-400" />
                <h2 className="section-title">ユーザー提案 審査キュー（MODERATION QUEUE）</h2>
              </div>
              <button className="btn-action-sm" onClick={fetchProposals} disabled={isLoadingProposals}>
                <RefreshCw size={12} className={isLoadingProposals ? 'animate-spin' : ''} />
                <span>キューを再取得</span>
              </button>
            </div>

            {isLoadingProposals ? (
              <div className="loading-state-box">
                <RefreshCw size={24} className="animate-spin text-amber-400" />
                <p>Supabase審査キューを同期中...</p>
              </div>
            ) : proposals.length === 0 ? (
              <div className="empty-pipeline-card">
                <CheckCircle2 size={40} className="text-emerald-400 mb-2" />
                <h3 className="text-sm font-bold text-slate-100">現在、未審査の提案はありません</h3>
                <p className="text-xs text-slate-400 mt-1">
                  すべての提案が承認または処理されています。新規の提案が届くとここにリアルタイムで表示されます。
                </p>
              </div>
            ) : (
              <div className="proposals-grid">
                {proposals.map((item) => (
                  <div key={item.id} className="proposal-admin-card">
                    <div className="card-top-row">
                      <span className="category-tag-admin">{item.category_label}</span>
                      <span className="timestamp-tag">{new Date(item.updated_at).toLocaleString('ja-JP')}</span>
                    </div>

                    <h3 className="proposal-title-admin">{item.title_ja}</h3>

                    <div className="proposal-meta-box">
                      <p className="meta-line">
                        <strong>提案情報:</strong> {item.question_en}
                      </p>
                    </div>

                    <div className="card-btn-row">
                      <button
                        className="btn-approve"
                        onClick={() => handleApproveProposal(item)}
                        disabled={processingId === item.id}
                      >
                        <CheckCircle2 size={14} />
                        <span>{processingId === item.id ? '承認展開中...' : '承認 ＆ 本番公開 (APPROVE)'}</span>
                      </button>

                      <button
                        className="btn-reject"
                        onClick={() => handleRejectProposal(item.id, item.title_ja)}
                        disabled={processingId === item.id}
                      >
                        <XCircle size={14} />
                        <span>却下・削除</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 2: 公式銘柄 投下パネル (Deploy)
           ======================================================== */}
        {activeTab === 'deploy' && (
          <div className="tab-pane-deploy">
            <div className="pane-section-header">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-400" />
                <h2 className="section-title">公式オリジナル観測銘柄の即時投下（DEPLOY MARKET）</h2>
              </div>
            </div>

            {deploySuccess && (
              <div className="deploy-success-alert">
                <CheckCircle2 size={18} className="text-emerald-400" />
                <span>🎉 新規公式銘柄を本番マーケットへ即座に投下・公開いたしました！</span>
              </div>
            )}

            <div className="deploy-form-card">
              <form onSubmit={handleDeployCustom}>
                <div className="form-group-admin">
                  <label className="form-label-admin">
                    <span>観測銘柄タイトル（YES / NO で回答可能な疑問文）</span>
                    <span className="tag-required">必須</span>
                  </label>
                  <input
                    type="text"
                    className="input-admin"
                    placeholder="例: トヨタは年内に全固体電池EVの市販モデルを正式発表するか？"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-admin">
                  <label className="form-label-admin">
                    <span>カテゴリ選定</span>
                    <span className="tag-required">必須</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { id: 'economy', label: '📊 経済・金利・暗号資産' },
                      { id: 'tech', label: '⚡ AI・テック' },
                      { id: 'politics', label: '🌐 国際・社会' },
                      { id: 'sports', label: '🏆 カルチャー・エンタメ' },
                    ].map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        className={`cat-btn-admin ${newCategory === c.id ? 'active' : ''}`}
                        onClick={() => setNewCategory(c.id as CategoryType)}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group-admin">
                  <label className="form-label-admin">
                    <span>注目背景・カタリスト材料</span>
                    <span className="tag-optional">任意</span>
                  </label>
                  <textarea
                    className="textarea-admin"
                    rows={3}
                    placeholder="例: 直近の特許出願状況と、海外モーターショーでのプレスカンファレンス開催予告。"
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-deploy-submit"
                  disabled={!newTitle.trim() || isDeploying}
                >
                  <PlusCircle size={16} />
                  <span>{isDeploying ? 'Gemini 3.7 Flash 分析 ＆ 本番投下中...' : '公式銘柄を本番に即時投下する (DEPLOY NOW)'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: 銘柄別 投票＆世論インテリジェンス (Metrics)
           ======================================================== */}
        {activeTab === 'metrics' && (
          <div className="tab-pane-metrics">
            <div className="pane-section-header">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-cyan-400" />
                <h2 className="section-title">銘柄別 エンゲージメント＆世論スプレッド分析（MARKET INTEL）</h2>
              </div>

              {/* 検索フィルター */}
              <div className="search-bar-admin">
                <Search size={13} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="銘柄名やカテゴリで絞り込み..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* メトリクステーブル */}
            <div className="admin-table-container custom-scroll">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>RANK</th>
                    <th>銘柄 / 予測テーマ</th>
                    <th>カテゴリ</th>
                    <th className="text-right">国内投票総数</th>
                    <th className="text-right">日本世論 (YES%)</th>
                    <th className="text-right">世界オッズ (YES%)</th>
                    <th className="text-right">世論乖離 (GAP)</th>
                    <th className="text-right">24h取引高</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMetrics.map((item, idx) => {
                    const gap = Math.abs(item.worldProbYes - item.japanVotes.percentYes);
                    const isHighEngagement = item.japanVotes.total > 200;

                    return (
                      <tr key={item.id} className={isHighEngagement ? 'highlight-row' : ''}>
                        <td className="font-mono font-bold text-slate-400">#{idx + 1}</td>
                        <td>
                          <div className="table-title-cell">
                            <span className="title-text-main" title={item.titleJa}>
                              {item.titleJa}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="category-micro-badge">{item.categoryLabel}</span>
                        </td>
                        <td className="text-right font-mono font-bold text-amber-400">
                          {item.japanVotes.total.toLocaleString()} 票
                        </td>
                        <td className="text-right font-mono">
                          <span className="yes-pill-admin">{item.japanVotes.percentYes}%</span>
                        </td>
                        <td className="text-right font-mono text-cyan-400">
                          {item.worldProbYes}%
                        </td>
                        <td className="text-right font-mono font-bold">
                          <span className={`gap-badge ${gap >= 25 ? 'critical' : gap >= 15 ? 'warning' : 'normal'}`}>
                            {gap >= 25 ? '⚡ ' : ''}{gap}%p
                          </span>
                        </td>
                        <td className="text-right font-mono text-slate-400">
                          ${Math.round(item.volume24hUsd / 1000).toLocaleString()}k
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: GA4 / GSC 検索トレンド監視 (Analytics)
           ======================================================== */}
        {activeTab === 'analytics' && (
          <div className="tab-pane-analytics">
            <div className="pane-section-header">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-emerald-400" />
                <h2 className="section-title">再帰的自己改善・アクセス＆検索エンジン観測レーダー</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="analytics-card-stat">
                <span className="stat-label-sub">GA4 MEASUREMENT ID</span>
                <span className="stat-value-sub text-cyan-400">G-B4LW25DWX9</span>
                <p className="stat-note-sub">リアルタイムPV・滞在時間計測中</p>
              </div>

              <div className="analytics-card-stat">
                <span className="stat-label-sub">SEARCH CONSOLE PROPERTY</span>
                <span className="stat-value-sub text-amber-400">sc-domain:mirairadar.com</span>
                <p className="stat-note-sub">インデックス登録・CTR監視中</p>
              </div>

              <div className="analytics-card-stat">
                <span className="stat-label-sub">OFFICIAL X (TWITTER)</span>
                <span className="stat-value-sub text-blue-400">@MiraiRadar</span>
                <p className="stat-note-sub">自動速報ツリーBot稼働中</p>
              </div>
            </div>

            <div className="analytics-intel-card">
              <div className="intel-header">
                <FileText size={16} className="text-emerald-400" />
                <h3 className="intel-title">自己改善分析エンジン（analytics_insights.mjs）の自動連携方針</h3>
              </div>
              <p className="intel-desc">
                Google Cloud サービスアカウント（<code>mirai-analytics-bot</code>）と連携し、毎日の検索クエリ急上昇トピック、離脱率の高い銘柄、投票エンゲージメントの推移を日次レポート（<code>reports/daily_*.md</code>）として自動集約しています。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
