import React, { useState } from 'react';
import { Lightbulb, AlertTriangle, ShieldCheck, Send, X, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import type { CategoryType } from '../types';

interface ProposeTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProposeTopicModal: React.FC<ProposeTopicModalProps> = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CategoryType>('economy');
  const [reason, setReason] = useState('');
  const [contributor, setContributor] = useState('');

  // 🚨 3大コンプライアンスチェック
  const [agreeElectionLaw, setAgreeElectionLaw] = useState(false);
  const [agreeNonGambling, setAgreeNonGambling] = useState(false);
  const [agreeNoDefamation, setAgreeNoDefamation] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ⌨️ Esc キーでモーダルを閉じるアクセシビリティ対応
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleReset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const isFormValid =
    title.trim().length >= 8 &&
    reason.trim().length >= 10 &&
    agreeElectionLaw &&
    agreeNonGambling &&
    agreeNoDefamation;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg('');

    // タイトル末尾が「〜か？」で終わっているか整形
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

    const newRecord = {
      id: `prop-${Date.now()}`,
      slug: `user-topic-${Date.now()}`,
      title_ja: formattedTitle,
      title_en: formattedTitle,
      question_ja: formattedTitle,
      question_en: `【ユーザー提案】提案者: ${contributor.trim() || '匿名'} ｜ 背景: ${reason.trim()}`,
      category,
      category_label: categoryLabels[category] || '💡 ユーザー提案',
      icon_url: '',
      end_date: '2026-12-31',
      is_active: false, // ⭐️ 審査前は非公開（運営が承認すると公開）
      updated_at: new Date().toISOString(),
    };

    try {
      if (supabase) {
        const { error } = await supabase.from('events').insert(newRecord);
        if (error) throw error;
      }
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Failed to submit proposal:', err);
      setErrorMsg('送信に失敗しました。しばらく経ってから再度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setTitle('');
    setReason('');
    setContributor('');
    setAgreeElectionLaw(false);
    setAgreeNonGambling(false);
    setAgreeNoDefamation(false);
    setIsSuccess(false);
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleReset} role="dialog" aria-modal="true">
      <div className="modal-card proposal-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-amber-400 tracking-wider">COMMUNITY PROPOSAL</span>
              <h2 className="text-base font-bold text-slate-100">未来の問いを提案する</h2>
            </div>
          </div>
          <button onClick={handleReset} className="modal-close-btn" aria-label="閉じる" autoFocus>
            <X size={16} />
          </button>
        </div>

        {isSuccess ? (
          <div className="proposal-success-view">
            <div className="success-icon-wrap">
              <CheckCircle2 size={42} className="text-emerald-400 animate-bounce" />
            </div>
            <h3 className="success-title">提案を受け付けました！</h3>
            <p className="success-desc">
              ご提案ありがとうございます！<br />
              未来レーダー運営チームにてコンプライアンスおよび内容を審査の上、承認され次第、観測マーケットに公開されます。
            </p>
            <button className="btn-primary w-full mt-4" onClick={handleReset}>
              完了してターミナルに戻る
            </button>
          </div>
        ) : (
          <div className="modal-body-scroll custom-scroll">
            <form onSubmit={handleSubmit} className="proposal-form">
              <p className="form-intro">
                あなたが世論や世界の集合知で観測したい「未確定の未来の出来事」を提案してください。審査承認後にサイトに掲載されます。
              </p>

            {/* 質問タイトル */}
            <div className="form-group">
              <label className="form-label">
                <span>観測したい問い（YES / NO で回答可能な形式）</span>
                <span className="required-tag">必須</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="例: 大谷翔平は今季60本塁打に到達するか？"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={60}
                required
              />
              <span className="form-hint">※「〜か？」の疑問文形式で入力してください（20〜50文字推奨）</span>
            </div>

            {/* カテゴリ */}
            <div className="form-group">
              <label className="form-label">
                <span>カテゴリ</span>
                <span className="required-tag">必須</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'economy', label: '📊 経済・金利・暗号資産' },
                  { id: 'tech', label: '⚡ AI・テック' },
                  { id: 'politics', label: '🌐 国際・社会' },
                  { id: 'sports', label: '⚾ スポーツ' },
                  { id: 'entertainment', label: '🎬 エンタメ・カルチャー' },
                ].map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    className={`category-select-btn ${category === c.id ? 'active' : ''}`}
                    onClick={() => setCategory(c.id as CategoryType)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 提案理由・背景 */}
            <div className="form-group">
              <label className="form-label">
                <span>観測したい理由・注目ポイント（カタリスト）</span>
                <span className="required-tag">必須</span>
              </label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="例: 直近の量産ペースが凄まじく、残り試合数と過去の記録からファンの間で意見が分かれているため。"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={200}
                required
              />
            </div>

            {/* 提案者名（任意） */}
            <div className="form-group">
              <label className="form-label">
                <span>提案者のお名前またはXアカウント名（任意）</span>
                <span className="optional-tag">任意</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="例: @user_name または 匿名希望"
                value={contributor}
                onChange={(e) => setContributor(e.target.value)}
                maxLength={30}
              />
            </div>

            {/* 🚨 厳格なコンプライアンス同意項目 */}
            <div className="compliance-checklist-box">
              <div className="checklist-header">
                <ShieldCheck size={14} className="text-amber-400" />
                <span>投稿前のコンプライアンス確認（すべて同意が必須です）</span>
              </div>

              <label className="check-item">
                <input
                  type="checkbox"
                  checked={agreeElectionLaw}
                  onChange={(e) => setAgreeElectionLaw(e.target.checked)}
                />
                <span className="check-text">
                  <strong>【公職選挙法の遵守】</strong> 日本国内の選挙期間中における特定候補者や政党の当選予測・人気投票ではありません。（※公職選挙法第138条の3に抵触する内容は即時却下されます）
                </span>
              </label>

              <label className="check-item">
                <input
                  type="checkbox"
                  checked={agreeNonGambling}
                  onChange={(e) => setAgreeNonGambling(e.target.checked)}
                />
                <span className="check-text">
                  <strong>【非賭博・純粋世論調査】</strong> 本提案は金銭・財物を賭ける目的ではなく、完全無料の客観的な集合知・世論調査を目的とするものです。
                </span>
              </label>

              <label className="check-item">
                <input
                  type="checkbox"
                  checked={agreeNoDefamation}
                  onChange={(e) => setAgreeNoDefamation(e.target.checked)}
                />
                <span className="check-text">
                  <strong>【誹謗中傷・虚偽の禁止】</strong> 個人への名誉毀損、差別、ハラスメント、または悪意ある虚偽情報の流布を目的とした内容ではありません。
                </span>
              </label>
            </div>

            {errorMsg && (
              <div className="error-alert">
                <AlertTriangle size={14} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 送信ボタン */}
            <div className="modal-actions">
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className={`btn-submit-proposal ${!isFormValid || isSubmitting ? 'disabled' : ''}`}
              >
                {isSubmitting ? (
                  <span>審査送信中...</span>
                ) : (
                  <>
                    <Send size={14} />
                    <span>同意して審査に提出する</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        )}
      </div>
    </div>
  );
};
