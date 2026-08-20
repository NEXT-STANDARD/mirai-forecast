import React, { useState } from 'react';
import { X, Sparkles, Globe, ShieldCheck, Flame, Trophy, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { useFocusTrap } from '../utils/useFocusTrap';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartPredicting: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onStartPredicting,
}) => {
  const [step, setStep] = useState<number>(1);
  const modalRef = useFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

  const handleFinish = () => {
    try {
      localStorage.setItem('mirairadar_onboarded', 'true');
    } catch {}
    onClose();
    onStartPredicting();
  };

  const handleClose = () => {
    try {
      localStorage.setItem('mirairadar_onboarded', 'true');
    } catch {}
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="modal-card onboarding-modal-dialog" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="onboarding-header">
          <div className="onboarding-header-tag">
            <Sparkles size={13} className="text-amber-400" />
            <span>WELCOME TO MIRAIRADAR // 10秒クイックガイド</span>
          </div>
          <button onClick={handleClose} className="forecast-close-btn" aria-label="閉じる" autoFocus>
            <X size={16} />
          </button>
        </div>

        {/* スライドコンテンツ */}
        <div className="onboarding-body">
          {step === 1 && (
            <div className="onboarding-slide animate-fade-in">
              <div className="onboarding-icon-banner globe">
                <Globe size={40} className="text-cyan-400" />
                <span className="vs-badge">VS</span>
                <span className="flag-jp">🇯🇵</span>
              </div>

              <h2 className="onboarding-slide-title">
                世界のスマートマネー vs 日本の世論
              </h2>
              <p className="onboarding-slide-desc">
                世界最大級の予測市場（Polymarket）が弾き出す<strong>「冷徹なリアルマネー確率」</strong>と、
                日本の生活者・ファンの<strong>「生の直感世論」</strong>をリアルタイムで対比・可視化する日本初のプラットフォームです。
              </p>

              <div className="onboarding-feature-pills">
                <div className="feature-pill">
                  <Zap size={13} className="text-cyan-400" />
                  <span>Polymarket データ完全連動</span>
                </div>
                <div className="feature-pill">
                  <Sparkles size={13} className="text-amber-400" />
                  <span>Gemini 3.7 Flash カタリスト分析</span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="onboarding-slide animate-fade-in">
              <div className="onboarding-icon-banner free">
                <ShieldCheck size={44} className="text-emerald-400" />
              </div>

              <h2 className="onboarding-slide-title">
                会員登録不要 ＆ 1秒で完全無料
              </h2>
              <p className="onboarding-slide-desc">
                メールアドレスやSNSログイン、暗号資産ウォレットの接続は<strong>一切不要</strong>です。<br />
                気になる未来の問いの <strong>[ YES / NO ]</strong> を押すだけで、即座に世論が開示され、あなたの予報が記録されます。
              </p>

              <div className="onboarding-feature-pills">
                <div className="feature-pill green">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  <span>完全非賭博（お金は1円もかかりません）</span>
                </div>
                <div className="feature-pill green">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  <span>公職選挙法第138条の3 遵守設計</span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="onboarding-slide animate-fade-in">
              <div className="onboarding-icon-banner gamify">
                <Flame size={40} className="text-amber-400 fill-amber-400" />
                <Trophy size={40} className="text-yellow-400" />
              </div>

              <h2 className="onboarding-slide-title">
                毎日投票で「未来予報士」ランクUP！
              </h2>
              <p className="onboarding-slide-desc">
                毎日投票を続けると<strong>「🔥 連続投票ストリーク」</strong>が点灯。<br />
                未来の出来事が確定すると的中判定が行われ、<strong>全国ランキング（Leaderboard）</strong>で上位を目指せます！
              </p>

              <div className="onboarding-rank-preview">
                <span className="rank-badge-item">🌱 ルーキー</span>
                <span className="rank-arrow">➔</span>
                <span className="rank-badge-item cyan">🔭 クォンツ</span>
                <span className="rank-arrow">➔</span>
                <span className="rank-badge-item gold">⚡ ストラテジスト</span>
                <span className="rank-arrow">➔</span>
                <span className="rank-badge-item rose">👑 未来マスター</span>
              </div>
            </div>
          )}
        </div>

        {/* フッターナビゲーション */}
        <div className="onboarding-footer">
          {/* ステップインジケーター */}
          <div className="onboarding-dots">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`dot-pill ${step === s ? 'active' : ''}`}
                aria-label={`Step ${s}`}
              />
            ))}
          </div>

          <div className="onboarding-actions">
            {step < 3 ? (
              <>
                <button type="button" onClick={handleClose} className="btn-onboarding-skip">
                  スキップ
                </button>
                <button type="button" onClick={() => setStep((prev) => prev + 1)} className="btn-onboarding-next">
                  <span>次へ</span>
                  <ArrowRight size={14} />
                </button>
              </>
            ) : (
              <button type="button" onClick={handleFinish} className="btn-onboarding-start">
                <Zap size={15} />
                <span>⚡ 最初の未来を予測してみる（スタート）</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
