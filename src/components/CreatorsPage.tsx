import React, { useState, useEffect } from 'react';
import { applySeoMetadata } from '../utils/seoHelper';
import { supabase } from '../services/supabaseClient';
import type { CategoryType } from '../types';
import {
  ArrowLeft,
  Award,
  Sparkles,
  ShieldCheck,
  Send,
  CheckCircle2,
  AlertTriangle,
  Users,
  Scale,
  Compass,
  FileCheck2,
  Percent,
  Check,
  Share2
} from 'lucide-react';

interface CreatorsPageProps {
  onBack: () => void;
  onOpenPropose?: () => void;
}

type ApplicationType = 'market_proposal' | 'creator_application';

export const CreatorsPage: React.FC<CreatorsPageProps> = ({ onBack }) => {
  const [appType, setAppType] = useState<ApplicationType>('creator_application');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CategoryType>('economy');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [oracleUrl, setOracleUrl] = useState('');
  const [reason, setReason] = useState('');
  const [contributor, setContributor] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [expertise, setExpertise] = useState('');

  // 3大上場基準チェック
  const [agreeOracle, setAgreeOracle] = useState(false);
  const [agreeNeutrality, setAgreeNeutrality] = useState(false);
  const [agreeNoDefamation, setAgreeNoDefamation] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    applySeoMetadata({
      title: '公認クリエイター制度 ＆ 独自銘柄エコシステム ｜ 未来レーダー',
      description: '専門家・アナリスト・ジャーナリスト向け公認予測クリエイター制度。独自銘柄の申請基準、3大上場基準、レベニューシェア設計のご案内。',
      canonicalUrl: 'https://mirairadar.com/creators',
      ogType: 'article',
    });
  }, []);

  const isFormValid =
    title.trim().length >= 8 &&
    oracleUrl.trim().length >= 10 &&
    reason.trim().length >= 10 &&
    (appType === 'market_proposal' || (contributor.trim().length >= 2 && profileUrl.trim().length >= 5)) &&
    agreeOracle &&
    agreeNeutrality &&
    agreeNoDefamation;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg('');

    let formattedTitle = title.trim();
    if (!formattedTitle.endsWith('か？') && !formattedTitle.endsWith('か?')) {
      if (formattedTitle.endsWith('か')) {
        formattedTitle += '？';
      } else {
        formattedTitle += 'か？';
      }
    }

    const categoryLabels: Record<string, string> = {
      economy: '📊 経済・金利・暗号資産',
      tech: '⚡ AI・テック',
      politics: '🌐 国際・社会',
      sports: '⚾ スポーツ',
      entertainment: '🎬 エンタメ・カルチャー',
    };

    const typePrefix = appType === 'creator_application' ? '【公認クリエイター申請】' : '【独自銘柄提案】';
    const creatorMeta = appType === 'creator_application'
      ? ` ｜ 専門領域: ${expertise.trim() || '未記載'} ｜ 実績URL: ${profileUrl.trim()}`
      : '';

    const newRecord = {
      id: `creator-prop-${Date.now()}`,
      slug: `creator-topic-${Date.now()}`,
      title_ja: formattedTitle,
      title_en: formattedTitle,
      question_ja: formattedTitle,
      question_en: `${typePrefix}申請者: ${contributor.trim() || '匿名'} ｜ 判定オラクル: ${oracleUrl.trim()} ｜ 背景: ${reason.trim()}${creatorMeta}`,
      category,
      category_label: categoryLabels[category] || '💡 クリエイター提案',
      icon_url: '',
      end_date: endDate || '2026-12-31',
      is_active: false, // 運営審査キューに格納
      updated_at: new Date().toISOString(),
    };

    try {
      if (supabase) {
        const { error } = await supabase.from('events').insert(newRecord);
        if (error) throw error;
      }
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Failed to submit creator proposal:', err);
      setErrorMsg('申請の送信に失敗しました。しばらく経ってから再度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setOracleUrl('');
    setReason('');
    setContributor('');
    setProfileUrl('');
    setExpertise('');
    setAgreeOracle(false);
    setAgreeNeutrality(false);
    setAgreeNoDefamation(false);
    setIsSuccess(false);
    setErrorMsg('');
  };

  const handleShare = () => {
    const text = '未来レーダー（MiraiRadar）｜ 公認インテリジェンス・クリエイター制度＆独自銘柄エコシステム';
    const url = 'https://mirairadar.com/creators';
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  return (
    <div className="w-full animate-fade-in text-slate-200 py-2 space-y-10">
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
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-[#071328] to-[#040814] border border-cyan-500/30 p-8 sm:p-12 shadow-2xl overflow-hidden">
        <div className="absolute -right-16 -bottom-16 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 text-xs font-mono">
            <Award size={14} className="text-amber-400" />
            <span>MIRAI RADAR CREATOR PROGRAM 2026</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            公認インテリジェンス・クリエイター制度
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-300 mt-1">
              あなたの「問い」が、日本の未来世論を動かす。
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-4xl">
            専門分野のリサーチャー、ジャーナリスト、業界アナリストに「独自の予測銘柄」を組成いただき、
            集合知と生活者世論の乖離を可視化する日本初の公共インテリジェンス・エコシステムです。
          </p>
        </div>
      </div>

      {/* 3つのクリエイターランク */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-cyan-400">
          <Users size={20} className="text-cyan-400" />
          <h2 className="text-lg font-bold text-white tracking-tight">参加ランクと特典体系</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 公認フェロー */}
          <div className="p-6 rounded-xl bg-[#0b1320] border border-amber-500/40 shadow-xl space-y-3 relative overflow-hidden">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-400/40 text-amber-300 text-xs font-bold font-mono">
              <Award size={13} className="text-amber-400" />
              <span>公認フェロー（招待制）</span>
            </div>
            <h3 className="text-sm font-bold text-white">著名エコノミスト・各界専門家</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              業界の第一人者として独自銘柄を優先上場。公式特集枠へのピックアップと認証ブルーバッジが付与されます。
            </p>
            <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs font-mono text-slate-300">
              <div className="flex items-center gap-2 text-amber-300 font-semibold">
                <Percent size={13} />
                <span>最大60% レベニューシェア枠</span>
              </div>
              <div className="text-slate-400">・即時上場・優先審査ライン</div>
              <div className="text-slate-400">・公式X・メディア特集掲載</div>
            </div>
          </div>

          {/* 認定クリエイター */}
          <div className="p-6 rounded-xl bg-[#0b1320] border border-emerald-500/40 shadow-xl space-y-3 relative overflow-hidden">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/40 text-emerald-300 text-xs font-bold font-mono">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>認定クリエイター（審査制）</span>
            </div>
            <h3 className="text-sm font-bold text-white">業界アナリスト・リサーチャー</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              特定領域（AI・経済・防衛・スポーツ等）に知見を持つクリエイター。月間最大5本の独自銘柄を上場可能です。
            </p>
            <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs font-mono text-slate-300">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                <Percent size={13} />
                <span>50% レベニューシェア枠</span>
              </div>
              <div className="text-slate-400">・認証グリーンバッジ付与</div>
              <div className="text-slate-400">・銘柄ページへ著者クレジット</div>
            </div>
          </div>

          {/* 一般観測者 */}
          <div className="p-6 rounded-xl bg-[#0b1320] border border-cyan-900/60 shadow-xl space-y-3 relative overflow-hidden">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-400/30 text-cyan-300 text-xs font-bold font-mono">
              <Compass size={13} className="text-cyan-400" />
              <span>一般観測者（登録不要）</span>
            </div>
            <h3 className="text-sm font-bold text-white">全一般ユーザー・読者</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              「この未来の行方を占いたい」という問いをどなたでも提案可能。運営審査を通過した問いが本番市場へ上場されます。
            </p>
            <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs font-mono text-slate-300">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                <Check size={13} />
                <span>完全無料・登録不要</span>
              </div>
              <div className="text-slate-400">・採用時に発案者クレジット表記</div>
              <div className="text-slate-400">・SNSで自分の問いを拡散動員</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3大上場審査基準 */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#06101e] to-[#0a182d] border border-cyan-500/30 shadow-2xl space-y-6">
        <div className="flex items-center gap-2.5 text-amber-400">
          <Scale size={22} />
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            デマ・不穏当な賭博を排除する「3大上場審査基準」
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          未来レーダーは総務省届出電気通信事業者（Ａ－０８－２４２３７）として法令を遵守し、中立な公共インテリジェンスを提供します。すべての提案銘柄は以下の厳格な3基準を満たす必要があります。
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-cyan-900/50 space-y-2">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
              <FileCheck2 size={16} className="text-cyan-400" />
              <span>1. 客観的オラクルURL</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              官公庁・公的機関・上場企業・主催者リリース等、「期日到来時に判定に争いの余地がない公式URL」を事前指定してください。
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-cyan-900/50 space-y-2">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>2. 問いの中立性（事実判定）</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              「〜〜は良い政策か？」といった主観的誘導ではなく、「○年○月までに〜〜が成立するか？」という事実の二項判定形式をとります。
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-cyan-900/50 space-y-2">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
              <AlertTriangle size={16} className="text-rose-400" />
              <span>3. 公共性・非誹謗中傷</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              個人の名誉毀損・プライバシー侵害・生死に関わるゴシップ・公職選挙法違反を誘発するテーマは即座に却下されます。
            </p>
          </div>
        </div>
      </div>

      {/* 申請・提案フォーム */}
      <div className="p-6 sm:p-10 rounded-2xl bg-[#0b1320] border border-cyan-900/60 shadow-2xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-cyan-900/50 pb-4">
          <div className="flex items-center gap-2.5 text-cyan-400">
            <Sparkles size={20} className="text-amber-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              独自銘柄の提案 ＆ クリエイター参加申請
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">審査制・完全無料</span>
        </div>

        {isSuccess ? (
          <div className="p-8 rounded-xl bg-emerald-950/30 border border-emerald-500/50 text-center space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="text-lg font-bold text-white">申請を受け付けました！</h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
              ご提案ありがとうございます。運営チームおよびAIオラクル検証エンジンが3大上場基準に基づき審査を行います。
              承認された銘柄は本番マーケット一覧へ公開されます。
            </p>
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition cursor-pointer"
            >
              続けて別の提案を送信する
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 申請種別の選択 */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-200">
                ① 申請の種類を選択してください:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAppType('creator_application')}
                  className={`p-4 rounded-xl text-left border transition cursor-pointer ${
                    appType === 'creator_application'
                      ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-lg'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-cyan-300 mb-1">
                    <Award size={16} className="text-amber-400" />
                    <span>公認・認定クリエイター申請</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    専門領域での実績を持ち、継続的に独自予測銘柄を組成したいリサーチャー・専門家向け。
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setAppType('market_proposal')}
                  className={`p-4 rounded-xl text-left border transition cursor-pointer ${
                    appType === 'market_proposal'
                      ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-lg'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-cyan-300 mb-1">
                    <Compass size={16} className="text-cyan-400" />
                    <span>独自銘柄の提案（一般観測者）</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    「この出来事の世論を可視化してほしい」という単発のテーマ提案。登録不要でどなたでも提案可能です。
                  </p>
                </button>
              </div>
            </div>

            {/* 予測の問い */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200">
                  ② 予測したい「未来の問い」（必須 / 末尾は「〜か？」形式）:
                </label>
                <span className="text-[10px] text-slate-400 font-mono">8文字以上</span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 2026年12月までに日銀の政策金利は0.75%以上に引き上げられるか？"
                className="w-full bg-slate-950 border border-cyan-800/80 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
              />
            </div>

            {/* カテゴリ & 決着予定日 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200">
                  ③ カテゴリー:
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CategoryType)}
                  className="w-full bg-slate-950 border border-cyan-800/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 transition"
                >
                  <option value="economy">📊 経済・金利・暗号資産</option>
                  <option value="tech">⚡ AI・テック</option>
                  <option value="politics">🌐 国際・社会</option>
                  <option value="sports">⚾ スポーツ</option>
                  <option value="entertainment">🎬 エンタメ・カルチャー</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200">
                  ④ 決着予定期日（判定を行う期日）:
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-cyan-800/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 transition"
                />
              </div>
            </div>

            {/* 客観的オラクルURL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-300">
                  ⑤ 判定オラクルURL（公式発表・公的機関のURL必須）:
                </label>
                <span className="text-[10px] text-amber-400/80 font-mono">3大上場基準・必須</span>
              </div>
              <input
                type="url"
                value={oracleUrl}
                onChange={(e) => setOracleUrl(e.target.value)}
                placeholder="例: https://www.boj.or.jp/mopo/mpmsche_min/index.htm（日銀公式議事要旨）"
                className="w-full bg-slate-950 border border-amber-500/50 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
              />
              <p className="text-[10px] text-slate-400">
                ※期日到来時に「YES」か「NO」かを客観的・自動的に判定できる公的発表元のURLを入力してください。
              </p>
            </div>

            {/* 背景・理由 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200">
                  ⑥ 提案理由・背景の解説（必須）:
                </label>
                <span className="text-[10px] text-slate-400 font-mono">10文字以上</span>
              </div>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="なぜこのテーマを今占うべきか、世論や市場の見解がどう分かれているかを簡潔に記載してください。"
                className="w-full bg-slate-950 border border-cyan-800/80 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition resize-none"
              />
            </div>

            {/* 申請者情報 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200">
                  ⑦ 申請者のお名前・Xアカウント名:
                  {appType === 'creator_application' && <span className="text-amber-400 ml-1">（必須）</span>}
                </label>
                <input
                  type="text"
                  value={contributor}
                  onChange={(e) => setContributor(e.target.value)}
                  placeholder="例: 山田 太郎 / @yamada_analyst"
                  className="w-full bg-slate-950 border border-cyan-800/80 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                />
              </div>

              {appType === 'creator_application' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200">
                    ⑧ 実績・プロフィールURL（必須）:
                  </label>
                  <input
                    type="url"
                    value={profileUrl}
                    onChange={(e) => setProfileUrl(e.target.value)}
                    placeholder="例: XプロフィールURL、所属機関、執筆記事一覧URL"
                    className="w-full bg-slate-950 border border-cyan-800/80 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200">
                    ⑧ 連絡先・SNS（任意）:
                  </label>
                  <input
                    type="text"
                    value={profileUrl}
                    onChange={(e) => setProfileUrl(e.target.value)}
                    placeholder="例: メールアドレスまたは連絡用Xアカウント"
                    className="w-full bg-slate-950 border border-cyan-800/80 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>
              )}
            </div>

            {appType === 'creator_application' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200">
                  ⑨ 主なリサーチ・専門領域:
                </label>
                <input
                  type="text"
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  placeholder="例: マクロ経済・金利政策 / 生成AIスタートアップ / 国際地政学"
                  className="w-full bg-slate-950 border border-cyan-800/80 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                />
              </div>
            )}

            {/* 3大上場基準 同意チェックボックス */}
            <div className="p-4 rounded-xl bg-slate-950/90 border border-cyan-900/80 space-y-3">
              <span className="block text-xs font-bold text-cyan-300">
                【重要】3大上場基準への誓約・同意（すべてチェック必須）:
              </span>

              <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeOracle}
                  onChange={(e) => setAgreeOracle(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-400"
                />
                <span>
                  <strong>客観的オラクルへの同意:</strong> 指定した判定URLに基づき、主観的解釈や私的都合を排した客観的結果判定が行われることに同意します。
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeNeutrality}
                  onChange={(e) => setAgreeNeutrality(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-400"
                />
                <span>
                  <strong>中立性・非賭博の誓約:</strong> 本申請は金銭・財物を賭ける目的ではなく、完全無料の公共インテリジェンス・世論調査であり、公職選挙法等に違反しない中立な事実判定であることを誓約します。
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeNoDefamation}
                  onChange={(e) => setAgreeNoDefamation(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-400"
                />
                <span>
                  <strong>非誹謗中傷・公共性の保証:</strong> 特定個人の名誉を傷つける内容、私生活の暴露、および不当な差別の意図を含まない公共の問いであることを保証します。
                </span>
              </label>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${
                isFormValid && !isSubmitting
                  ? 'bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white shadow-lg shadow-cyan-900/40 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
              }`}
            >
              <Send size={16} />
              <span>
                {isSubmitting ? '審査キューへ送信中...' : appType === 'creator_application' ? '公認クリエイター審査へ申請する' : '独自銘柄の提案を送信する'}
              </span>
            </button>
          </form>
        )}
      </div>

      {/* 下部戻るボタン */}
      <div className="pt-8 border-t border-slate-800/80 text-center">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>未来レーダー トップへ戻る</span>
        </button>
      </div>
    </div>
  );
};
