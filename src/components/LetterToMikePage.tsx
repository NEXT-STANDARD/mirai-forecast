import React, { useState, useEffect } from 'react';
import { Mail, Shield, Sparkles, ArrowLeft, Share2, Globe } from 'lucide-react';
import { applySeoMetadata } from '../utils/seoHelper';

interface LetterToMikePageProps {
  onBack: () => void;
}

export const LetterToMikePage: React.FC<LetterToMikePageProps> = ({ onBack }) => {
  const [lang, setLang] = useState<'ja' | 'en'>('ja');

  useEffect(() => {
    applySeoMetadata({
      title: 'Polymarket Japan代表 Mike Eidlin氏への公開書簡 ｜ 未来レーダー創業者 霧島フェニックス',
      description: '未来レーダー創業者・霧島フェニックスからPolymarket Japan代表マイク・エイドリン氏へ。日本の法的課題を乗り越え健全な集合知社会を共創するための公開書簡。',
      canonicalUrl: 'https://mirairadar.com/letter-to-mike',
      ogType: 'article'
    });
  }, []);

  const shareText = `【未来レーダー創業者・霧島フェニックスから Polymarket Japan 代表マイク・エイドリン氏への公開書簡】
日本の集合知と法的課題を乗り越えるための感謝と協力の手紙。
#未来レーダー #Polymarket #PolymarketJapan #MikeEidlin #MiraiRadar`;

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/letter-to-mike` : 'https://mirairadar.com/letter-to-mike';

  const handleTwitterShare = () => {
    const tweetIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(tweetIntent, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="letter-page-container">
      {/* ナビゲーションバー */}
      <div className="letter-nav-bar">
        <button className="btn-back-terminal" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>未来レーダー ターミナルへ戻る</span>
        </button>

        <div className="letter-nav-actions">
          {/* 言語切り替え */}
          <div className="lang-switcher">
            <Globe size={13} className="icon-blue" />
            <button
              className={`lang-btn ${lang === 'ja' ? 'active' : ''}`}
              onClick={() => setLang('ja')}
            >
              日本語 (JA)
            </button>
            <button
              className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
              onClick={() => setLang('en')}
            >
              English (EN)
            </button>
          </div>

          <button className="btn-share-x" onClick={handleTwitterShare}>
            <Share2 size={13} />
            <span>Xで書簡をシェア</span>
          </button>
        </div>
      </div>

      {/* メイン書簡カード */}
      <div className="letter-card">
        {/* サイバーパンク・ヘッダーデコレーション */}
        <div className="letter-cyber-strip"></div>

        <div className="letter-header">
          <div className="protocol-badge">
            <span className="dot gold animate-ping"></span>
            <span>OPEN LETTER PROTOCOL // TO: MIKE EIDLIN (POLYMARKET JAPAN)</span>
          </div>
          <h1 className="letter-main-title">
            {lang === 'ja'
              ? 'Polymarket Japan 代表 マイク・エイドリン氏への公開書簡'
              : 'An Open Letter to Mike Eidlin, Lead of Polymarket Japan'}
          </h1>
          <p className="letter-sub-title">
            {lang === 'ja'
              ? '日本の集合知と予測市場の未来を切り拓くための、感謝とオープンな協力の申し出'
              : 'A message of gratitude, shared legal challenges, and open collaboration from Phoenix Kirishima'}
          </p>
          <div className="letter-meta-row">
            <span className="meta-item"><strong>From:</strong> 霧島フェニックス（Phoenix Kirishima） / MiraiRadar.com</span>
            <span className="meta-item"><strong>To:</strong> マイク・エイドリン（Mike Eidlin） / Polymarket Japan</span>
            <span className="meta-item"><strong>Date:</strong> 2026.08.18</span>
          </div>
        </div>

        <div className="letter-divider"></div>

        {/* 本文エリア */}
        <div className="letter-body-content">
          {lang === 'ja' ? (
            <>
              <div className="letter-paragraph callout">
                <Mail size={18} className="icon-gold flex-shrink-0" />
                <p>
                  <strong>拝啓 マイク・エイドリン様、そしてPolymarketチームの皆様へ</strong>
                </p>
              </div>

              <div className="letter-paragraph">
                <p>
                  私は、日本発の予測市場・世論データプラットフォーム<strong>「未来レーダー（MiraiRadar.com）」</strong>を創設・開発しております、<strong>霧島フェニックス</strong>と申します。
                </p>
                <p>
                  まず初めに、Polymarketという世界最高峰の予測市場インフラを創り上げ、APIをオープンに提供してくださっていることに、心からの深い敬意と感謝を申し上げます。
                </p>
              </div>

              <div className="letter-section-heading">
                <Shield size={16} className="icon-blue" />
                <h3>1. 日本進出への共感と、立ちはだかる「強固な法的障壁」</h3>
              </div>
              <div className="letter-paragraph">
                <p>
                  Polymarketが日本市場を成長機会と捉え、マイク様を日本代表に任命して本格的なアプローチを開始されたニュースを拝見し、私自身、胸を熱くしております。
                </p>
                <p>
                  しかし同時に、日本の現行法（刑法における賭博規制や金融商品取引法）がもたらす「極めて厚く険しい壁」と、そのジレンマの大きさにも深く共感しております。日本国内から金銭を投じる取引が規制されている現状において、日本の一般市民に予測市場の真の価値を届けることは容易ではありません。
                </p>
              </div>

              <div className="letter-section-heading">
                <Sparkles size={16} className="icon-gold" />
                <h3>2. 未来レーダーの使命：完全合法・無料の「集合知インターフェース」</h3>
              </div>
              <div className="letter-paragraph">
                <p>
                  私たち未来レーダーは、日本の法規制を100%遵守し、賭博性を完全に排除した<strong>「完全無料の世論調査・市場観測プラットフォーム」</strong>として設計されています。
                </p>
                <p>
                  Polymarket上の世界最高峰のリアルマネー予測データをお借りし、日本のユーザーが金銭リスクを一切負わずに直感を投票できる仕組み（ブラインド世論調査）を提供することで、<strong>「世界のお金 vs 日本の世論」</strong>のスプレッドを可視化しています。
                </p>
                <p>
                  私たちはPolymarketと敵対する存在ではなく、むしろ<strong>「日本市場において予測市場という概念の価値を啓蒙し、土壌を耕すパートナー」</strong>でありたいと考えています。
                </p>
              </div>

              <div className="letter-section-heading">
                <Globe size={16} className="icon-blue" />
                <h3>3. オープンな協力の申し出（Open Collaboration）</h3>
              </div>
              <div className="letter-paragraph">
                <p>
                  現在、日本市場の開拓にあたって、敵も味方もありません。私たちは同じ「集合知の未来を日本に切り拓く」という巨大な挑戦の途上にいます。
                </p>
                <p>
                  もし、日本国内での啓蒙活動、ローカライズの知見、データ連携、コミュニティ形成など、私たちが協力できることがあれば、何でも喜んで力を尽くします。
                </p>
                <p>
                  この手紙がマイク様、そしてPolymarketチームの皆様に届くことを心より願っております。いつでもお気軽にご連絡いただけますと幸いです。
                </p>
              </div>

              <div className="letter-signature-box">
                <p className="sig-closing">敬具</p>
                <p className="sig-name"><strong>霧島フェニックス（Phoenix Kirishima）</strong></p>
                <p className="sig-role">Founder & Developer, 未来レーダー（MiraiRadar.com）</p>
                <p className="sig-contact">
                  Official X: <a href="https://x.com/MiraiRadar" target="_blank" rel="noreferrer">@MiraiRadar</a> ｜ Website: <a href="https://mirairadar.com">mirairadar.com</a>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="letter-paragraph callout">
                <Mail size={18} className="icon-gold flex-shrink-0" />
                <p>
                  <strong>Dear Mike Eidlin and the Polymarket Team,</strong>
                </p>
              </div>

              <div className="letter-paragraph">
                <p>
                  My name is <strong>Phoenix Kirishima</strong>, founder and developer of <strong>MiraiRadar (MiraiRadar.com)</strong>, a Japan-based prediction market intelligence and public consensus platform.
                </p>
                <p>
                  First and foremost, I would like to express my deepest respect and gratitude to the Polymarket team for building the world's leading prediction market infrastructure and generously providing open API access.
                </p>
              </div>

              <div className="letter-section-heading">
                <Shield size={16} className="icon-blue" />
                <h3>1. Deep Empathy with Japan's Legal & Regulatory Barriers</h3>
              </div>
              <div className="letter-paragraph">
                <p>
                  We were thrilled to learn that Polymarket has recognized Japan as a vital growth frontier and appointed you as the country representative to spearhead initiatives here.
                </p>
                <p>
                  At the same time, we deeply empathize with the formidable legal hurdles under Japan's Penal Code (gambling regulations) and Financial Instruments and Exchange Act. Delivering the true utility of prediction markets in a jurisdiction where wagering real funds is restricted is a profound challenge.
                </p>
              </div>

              <div className="letter-section-heading">
                <Sparkles size={16} className="icon-gold" />
                <h3>2. Our Mission: 100% Legal, Free-to-Participate Public Consensus</h3>
              </div>
              <div className="letter-paragraph">
                <p>
                  MiraiRadar was purpose-built to navigate these exact legal realities. We operate a <strong>100% free, non-wagering public consensus platform</strong> that pairs Polymarket's global real-money odds with Japanese sentiment.
                </p>
                <p>
                  By enabling everyday Japanese citizens to participate in blind sentiment voting without financial risk, we visualize the dynamic spread between <em>"Global Smart Money"</em> and <em>"Japanese Consensus."</em>
                </p>
                <p>
                  We view ourselves not as competitors, but as allies cultivating fertile ground for prediction market literacy across Japan.
                </p>
              </div>

              <div className="letter-section-heading">
                <Globe size={16} className="icon-blue" />
                <h3>3. An Offer for Open Collaboration</h3>
              </div>
              <div className="letter-paragraph">
                <p>
                  In the grand mission of bringing collective intelligence to Japan, there are no adversaries—only shared builders.
                </p>
                <p>
                  Whether it involves localized regulatory advocacy, data integration, community education, or cultural adaptation, our team is eager and ready to collaborate in any way possible.
                </p>
                <p>
                  I sincerely hope this letter reaches you and the Polymarket team. Please feel free to reach out to us at any time.
                </p>
              </div>

              <div className="letter-signature-box">
                <p className="sig-closing">Warmest regards,</p>
                <p className="sig-name"><strong>Phoenix Kirishima</strong></p>
                <p className="sig-role">Founder & Lead Developer, MiraiRadar (MiraiRadar.com)</p>
                <p className="sig-contact">
                  Official X: <a href="https://x.com/MiraiRadar" target="_blank" rel="noreferrer">@MiraiRadar</a> ｜ Website: <a href="https://mirairadar.com">mirairadar.com</a>
                </p>
              </div>
            </>
          )}
        </div>

        {/* フッターアクション */}
        <div className="letter-footer-cta">
          <button className="btn-footer-back" onClick={onBack}>
            <ArrowLeft size={15} />
            <span>未来レーダー ターミナルへ戻る</span>
          </button>

          <button className="btn-footer-share" onClick={handleTwitterShare}>
            <Share2 size={15} />
            <span>この公開書簡をXでシェアして拡散する</span>
          </button>
        </div>
      </div>
    </div>
  );
};
