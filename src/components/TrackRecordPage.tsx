import React, { useEffect, useState } from 'react';
import { ArrowLeft, Share2, Target, Scale, ListChecks, Info } from 'lucide-react';
import { applySeoMetadata } from '../utils/seoHelper';

/**
 * 的中トラックレコード (Phase 2 / B)
 *
 * 方針（2026-08-25 決定）:
 * - 母集団は「全決着銘柄」。削除も事後選別もしない。絞り込みは表示上の内訳（ビュー）として見せる
 * - 見出しはキャリブレーション（市場がX%と言ったとき実際に約X%起きたか）。
 *   的中率は母集団の定義しだいで 52%〜89% まで動くため、単独の見出しにしない
 * - 不利な数字（スポーツ52%・60-79%帯の未較正）も同じ場所に出す
 */

interface TrackRecord {
  generatedAt: string;
  summary: {
    worldScored: number;
    worldHits: number;
    worldAccuracy: number;
    japanScored: number;
    japanHits: number;
    japanAccuracy: number | null;
  };
  breakdown: Record<string, { n: number; hits: number; accuracy: number }>;
  calibration: { band: string; n: number; happenedRate: number }[];
  records: {
    id: string;
    slug: string;
    titleJa: string;
    category: string;
    subject: string | null;
    world: { prob: number; at: string } | null;
    happened: boolean;
    worldCorrect: boolean | null;
    isSports: boolean;
    isDegenerate: boolean;
  }[];
}

interface TrackRecordPageProps {
  onBack: () => void;
}

const BREAKDOWN_ROWS: { key: string; label: string; note: string }[] = [
  { key: 'all', label: 'すべての決着銘柄', note: '削除も選別もしない全量。これが土台の数字' },
  { key: 'sports', label: 'スポーツの1試合だけ', note: 'コイントスに近い。この形は2026年8月の絞り込みで掲載をやめた' },
  { key: 'nonSports', label: 'スポーツの1試合を除く', note: '現在の掲載方針に近い母集団' },
  { key: 'excludingDegenerate', label: '24時間前にすでに0%/100%だった銘柄を除く', note: '0%・100%は予測ではなく、ほぼ確定した結果。これが一番厳しい的中率' },
  { key: 'nonSportsExcludingDegenerate', label: '上の両方を除く', note: '「本当に不確実だった問い」だけの成績' },
];

// 帯の中央値。キャリブレーションの「理想値」として実測と並べる
const BAND_MID: Record<string, number> = {
  '0-19%': 10, '20-39%': 30, '40-59%': 50, '60-79%': 70, '80-100%': 90,
};

export const TrackRecordPage: React.FC<TrackRecordPageProps> = ({ onBack }) => {
  const [data, setData] = useState<TrackRecord | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    applySeoMetadata({
      title: '的中トラックレコード ｜ 未来レーダー（MiraiRadar）',
      description:
        '世界の予測市場（Polymarket）は本当に当たるのか。決着済み全銘柄について「決着24時間前の市場価格」と実際の結果を突き合わせた記録。削除も選別もしない全量公開。',
      canonicalUrl: 'https://mirairadar.com/track-record',
      ogType: 'article',
    });

    let cancelled = false;
    fetch('/data/track_record.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => { if (!cancelled) setData(json); })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, []);

  const handleShare = () => {
    const text = '予測市場は本当に当たるのか？ 決着済み全銘柄の「24時間前の予測 vs 実際の結果」を全量公開 ｜ 未来レーダー';
    const url = 'https://mirairadar.com/track-record';
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const generatedDate = data ? new Date(data.generatedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <div className="w-full animate-fade-in text-slate-200 py-2">
      {/* ナビゲーションバー */}
      <div className="flex items-center justify-between gap-4 mb-8 pb-4 border-b border-cyan-900/40">
        <a
          href="/"
          onClick={(e) => { e.preventDefault(); onBack(); }}
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

      {/* ヒーロー */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#0b1320] via-[#0d1829] to-[#0b1320] border border-cyan-900/60 p-6 sm:p-10 mb-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-cyan-400 text-xs font-mono font-semibold tracking-wider uppercase mb-4">
            <Target size={14} />
            TRACK RECORD
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
            的中トラックレコード
          </h1>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-4xl">
            世界の予測市場（Polymarket）は、本当に当たるのか。
            決着したすべての観測銘柄について「決着の24時間前に市場が言っていた確率」と実際の結果を突き合わせた記録です。
            <strong className="text-white">削除も、都合のよい選別もしません。</strong>
          </p>
          {data && (
            <p className="text-xs font-mono text-slate-400 mt-4">
              {generatedDate}時点 ｜ 決着済み {data.summary.worldScored}件を採点
            </p>
          )}
        </div>
      </div>

      {loadError && (
        <div role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 mb-8">
          記録データの読み込みに失敗しました。時間をおいて再読み込みしてください。
        </div>
      )}
      {!data && !loadError && (
        <div className="text-center text-cyan-400 font-mono text-xs py-12">⚡ LOADING TRACK RECORD...</div>
      )}

      {data && (
        <>
          {/* キャリブレーション（主役） */}
          <section className="rounded-2xl bg-[#0b1320] border border-cyan-900/60 p-6 sm:p-8 mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Scale size={18} className="text-cyan-400" />
              <h2 className="text-xl sm:text-2xl font-bold text-white">市場が「X%」と言ったとき、実際にX%起きたのか</h2>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-6 max-w-3xl">
              予測の実力は「何%当てたか」より「確率の申告が正直だったか」（キャリブレーション）で測ります。
              30%と言った事象の約3割が実際に起き、70%と言った事象の約7割が起きるなら、その確率は信用できます。
            </p>
            <div className="space-y-4">
              {data.calibration.map((band) => {
                const ideal = BAND_MID[band.band] ?? 50;
                const gap = Math.abs(band.happenedRate - ideal);
                const thin = band.n < 5;
                return (
                  <div key={band.band}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-1.5">
                      <span className="text-sm font-mono font-bold text-white">市場の申告 {band.band}</span>
                      <span className="text-xs font-mono text-slate-400">
                        {band.n}件 → 実際に起きたのは <strong className={gap <= 15 ? 'text-emerald-400' : 'text-amber-400'}>{band.happenedRate}%</strong>
                        {thin && <span className="text-slate-500">（まだ{band.n}件。判断保留）</span>}
                      </span>
                    </div>
                    <div className="relative h-3 rounded-full bg-slate-800/80 overflow-hidden" aria-hidden="true">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full ${gap <= 15 ? 'bg-emerald-500/70' : 'bg-amber-500/70'}`}
                        style={{ width: `${Math.max(band.happenedRate, 2)}%` }}
                      ></div>
                      {/* 帯の中央値＝理想の位置 */}
                      <div className="absolute inset-y-0 w-0.5 bg-cyan-300" style={{ left: `${ideal}%` }} title={`理想: ${ideal}%前後`}></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              縦線は各帯の中央値（＝理想の実現率）。60-79%帯はまだ件数が少なく、較正が取れていません。件数が貯まるまでこのまま公開します。
            </p>
          </section>

          {/* 的中率の内訳（母集団を全部並べる） */}
          <section className="rounded-2xl bg-[#0b1320] border border-cyan-900/60 p-6 sm:p-8 mb-8">
            <div className="flex items-center gap-2 mb-2">
              <ListChecks size={18} className="text-cyan-400" />
              <h2 className="text-xl sm:text-2xl font-bold text-white">的中率は「どの母集団か」で変わる</h2>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-6 max-w-3xl">
              50%超と言っていた事象が起きたか（50%未満なら起きなかったか）を「的中」と数えます。
              母集団の切り方しだいで数字は大きく動くため、ひとつの数字ではなく全部を並べます。
            </p>
            <div className="space-y-3">
              {BREAKDOWN_ROWS.map((row) => {
                const b = data.breakdown[row.key];
                if (!b) return null;
                return (
                  <div key={row.key} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-slate-900/50 border border-slate-800 px-4 py-3">
                    <div className="flex-1 min-w-[220px]">
                      <div className="text-sm font-semibold text-white">{row.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{row.note}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-mono font-extrabold text-cyan-300">{b.accuracy}%</span>
                      <span className="text-xs font-mono text-slate-500 ml-2">{b.hits}/{b.n}件</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 日本世論の採点（まだできない、を正直に） */}
          <section className="rounded-2xl bg-[#0b1320] border border-cyan-900/60 p-6 sm:p-8 mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">日本の世論は当たるのか</h2>
            {data.summary.japanScored === 0 ? (
              <p className="text-sm text-slate-400 leading-relaxed max-w-3xl">
                まだ採点できません。決着済み銘柄のうち、決着前に日本の投票が3票以上集まっていたものが0件のためです。
                票が貯まりしだい、世界と日本の成績をここに並べます。枠だけ先に用意して、数字は捏造しません。
              </p>
            ) : (
              <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                採点できた{data.summary.japanScored}件のうち{data.summary.japanHits}件で的中
                （{data.summary.japanAccuracy}%）。
              </p>
            )}
          </section>

          {/* 勝敗ログ全量 */}
          <section className="rounded-2xl bg-[#0b1320] border border-cyan-900/60 p-6 sm:p-8 mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">全決着ログ（{data.records.length}件）</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-6 max-w-3xl">
              1件ずつの生データです。「24h前」は決着24時間前に市場が言っていた確率。
              タグは母集団の内訳（上の表）に対応します。
            </p>
            <div className="space-y-2">
              {data.records.map((r) => (
                <a
                  key={r.id}
                  href={`/market/${r.slug}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg bg-slate-900/50 hover:bg-slate-900/90 border border-slate-800 px-4 py-3 no-underline transition min-h-[44px]"
                >
                  <div className="flex-1 min-w-[220px]">
                    <div className="text-sm text-slate-200 leading-snug">{r.titleJa}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {r.isSports && (
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">スポーツ1試合</span>
                      )}
                      {r.isDegenerate && (
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">24h前にほぼ確定</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 font-mono text-xs">
                    <span className="text-slate-400 whitespace-nowrap">24h前 <strong className="text-white">{r.world ? `${r.world.prob}%` : '—'}</strong></span>
                    <span className="text-slate-400 whitespace-nowrap">結果 <strong className="text-white">{r.happened ? '起きた' : '起きず'}</strong></span>
                    <span
                      className={`font-bold whitespace-nowrap ${r.worldCorrect === null ? 'text-slate-500' : r.worldCorrect ? 'text-emerald-400' : 'text-rose-400'}`}
                    >
                      {r.worldCorrect === null ? '—' : r.worldCorrect ? '的中' : '外れ'}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* 方法論 */}
          <section className="rounded-2xl bg-[#0b1320] border border-cyan-900/60 p-6 sm:p-8 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Info size={18} className="text-cyan-400" />
              <h2 className="text-xl sm:text-2xl font-bold text-white">測り方（そして測っていないもの）</h2>
            </div>
            <ul className="space-y-3 text-sm text-slate-400 leading-relaxed max-w-3xl list-disc pl-5">
              <li>
                <strong className="text-slate-200">「最後の予測」は決着の24時間前。</strong>
                決着後の価格は0%か100%に張り付きます。それは予測ではなく結果なので、そのまま使うと「市場は100%正しかった」という無意味な記録になります。
              </li>
              <li>
                <strong className="text-slate-200">母集団は全決着銘柄。事後の選別をしません。</strong>
                絞り込み（2026年8月）で掲載をやめた形の銘柄も、決着した事実ごと残します。内訳はタグで示します。
              </li>
              <li>
                <strong className="text-slate-200">これは Polymarket 市場の成績であって、未来レーダー独自の予測ではありません。</strong>
                私たちが検証しているのは「世界のリアルマネーが言う確率は信用に足るか」です。
              </li>
              <li>
                多肢イベントの対象サブ市場は銘柄ページと同じ解決エンジンが選定します（任意の1候補を使いません）。
              </li>
            </ul>
          </section>
        </>
      )}
    </div>
  );
};
