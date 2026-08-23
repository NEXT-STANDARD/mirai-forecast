import React, { useState } from 'react';
import type { MarketItem } from '../types';
import { 
  X, 
  Download, 
  FileSpreadsheet, 
  Bot, 
  Code2, 
  Copy, 
  Check, 
  Sparkles, 
  ExternalLink,
  Layers
} from 'lucide-react';
import { useFocusTrap } from '../utils/useFocusTrap';

interface DataExportModalProps {
  item: MarketItem | null;
  onClose: () => void;
  onOpenAiConnector?: () => void;
}

export const DataExportModal: React.FC<DataExportModalProps> = ({
  item,
  onClose,
  onOpenAiConnector,
}) => {
  const [activeTab, setActiveTab] = useState<'csv' | 'mcp' | 'json'>('csv');
  const [copiedMcp, setCopiedMcp] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const modalRef = useFocusTrap(Boolean(item), onClose);

  if (!item) return null;

  const worldYes = item.worldProbYes;
  // 多肢イベントでは probYes は「本命候補の確率」なので 100-probYes は「NO」ではない。
  // 誤解を招く値を配るより、種別と本命名を明示して NO は空にする。
  const isMulti = Boolean(item.isMultiChoice && item.leaderName);
  const worldNo = isMulti ? null : item.worldProbNo;
  const japanYes = item.japanVotes.percentYes;
  const japanNo = 100 - japanYes;
  const gap = Math.abs(worldYes - japanYes);
  const nowStr = new Date().toISOString();

  // 1. 📥 CSV 生成ロジック (UTF-8 with BOM で Excel 文字化けを完全防止)
  const handleDownloadCsv = () => {
    const headers = [
      'Timestamp',
      'Ticker_Slug',
      'Market_Title',
      'Category',
      'World_Prob_YES(%)',
      'World_Prob_NO(%)',
      'Market_Type',
      'Leader_Name',
      'Japan_Consensus_YES(%)',
      'Japan_Consensus_NO(%)',
      'Spread_Gap(%)',
      'Japan_Total_Votes',
      'Volume_24h_USD',
      'Total_Volume_USD',
      'End_Date'
    ];

    const row = [
      `"${nowStr}"`,
      `"${item.slug || item.id}"`,
      `"${(item.titleJa || item.title).replace(/"/g, '""')}"`,
      `"${item.category}"`,
      worldYes,
      worldNo ?? '',
      `"${isMulti ? 'multi_choice' : 'binary'}"`,
      `"${isMulti ? String(item.leaderName).replace(/"/g, '""') : ''}"`,
      japanYes,
      japanNo,
      gap,
      item.japanVotes.total,
      item.volume24hUsd || 0,
      item.totalVolumeUsd || 0,
      `"${item.endDate}"`
    ];

    const csvContent = '\uFEFF' + headers.join(',') + '\n' + row.join(',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mirairadar_${item.slug || item.id}_data.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 2. 💻 JSON 生成ロジック
  const jsonData = {
    mirairadar_version: "2.0-cyberquant",
    exported_at: nowStr,
    market: {
      id: item.id,
      slug: item.slug,
      title: item.title,
      titleJa: item.titleJa,
      category: item.category,
      categoryLabel: item.categoryLabel,
      endDate: item.endDate,
    },
    metrics: {
      worldSmartMoney: {
        source: "Polymarket",
        probYes: worldYes,
        probNo: worldNo,
        marketType: isMulti ? "multi_choice" : "binary",
        leaderName: isMulti ? item.leaderName : null,
        probYesMeaning: isMulti
          ? "本命候補の勝率（この市場は多肢選択のため YES/NO の二値ではない）"
          : "YES の確率",
        volume24hUsd: item.volume24hUsd || 0,
        totalVolumeUsd: item.totalVolumeUsd || 0,
      },
      japanConsensus: {
        source: "MiraiRadar Public Vote",
        probYes: japanYes,
        probNo: japanNo,
        totalVotes: item.japanVotes.total,
      },
      spreadGap: {
        gapPercent: gap,
        divergenceLevel: gap >= 30 ? "CRITICAL_SPREAD" : gap >= 15 ? "MODERATE_SPREAD" : "CONSENSUS_ALIGNED",
      }
    },
    canonicalUrl: `https://mirairadar.com/market/${item.slug || item.id}`,
  };

  const jsonString = JSON.stringify(jsonData, null, 2);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonString);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mirairadar_${item.slug || item.id}_data.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 3. 🤖 WebMCP 設定コード
  const mcpConfigCode = `{
  "mcpServers": {
    "mirairadar": {
      "command": "npx",
      "args": ["-y", "@mirairadar/mcp-server"],
      "env": {
        "MIRAIRADAR_API_URL": "https://mirairadar.com/api/mcp"
      }
    }
  }
}`;

  const handleCopyMcp = () => {
    navigator.clipboard.writeText(mcpConfigCode);
    setCopiedMcp(true);
    setTimeout(() => setCopiedMcp(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="data-export-modal-content" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        {/* モーダルヘッダー */}
        <div className="modal-header">
          <div className="title-wrap flex items-center gap-2">
            <Layers size={18} className="text-cyan-400" />
            <span className="font-extrabold text-sm">金融オルタナティブデータ取得ハブ</span>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="閉じる">
            <X size={16} />
          </button>
        </div>

        {/* タブ切り替え */}
        <div className="data-export-tabs">
          <button
            className={`data-tab-btn ${activeTab === 'csv' ? 'active' : ''}`}
            onClick={() => setActiveTab('csv')}
          >
            <FileSpreadsheet size={14} />
            <span>Excel / CSV</span>
          </button>

          <button
            className={`data-tab-btn ${activeTab === 'mcp' ? 'active' : ''}`}
            onClick={() => setActiveTab('mcp')}
          >
            <Bot size={14} />
            <span>AI連携 (WebMCP)</span>
          </button>

          <button
            className={`data-tab-btn ${activeTab === 'json' ? 'active' : ''}`}
            onClick={() => setActiveTab('json')}
          >
            <Code2 size={14} />
            <span>開発用 JSON</span>
          </button>
        </div>

        <div className="modal-body-scroll">
          {/* 銘柄サマリーピル */}
          <div className="export-target-summary">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] text-slate-400 font-mono">POLY:{(item.slug || item.id).slice(0, 15).toUpperCase()}</span>
              <span className="text-[11px] text-amber-400 font-mono font-bold">
                {item.japanVotes.total >= 3 ? `⚡ GAP: ${gap}% (n=${item.japanVotes.total})` : `🇯🇵 サンプル収集中 (n=${item.japanVotes.total})`}
              </span>
            </div>
            <div className="text-sm font-bold text-slate-200 line-clamp-1">{item.titleJa || item.title}</div>
          </div>

          {/* タブ1: CSV */}
          {activeTab === 'csv' && (
            <div className="data-tab-pane">
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                ExcelやGoogleスプレッドシート、Python（Pandas）、Rなどで即座に開いて計量分析・グラフ作成ができるクリーンなCSVデータを出力します。
              </p>

              <div className="csv-preview-table-wrapper">
                <table className="csv-preview-table font-mono text-xs">
                  <thead>
                    <tr>
                      <th>指標</th>
                      <th>観測値</th>
                      <th>データソース</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>世界オッズ YES</td>
                      <td className="text-cyan-400 font-bold">{worldYes}%</td>
                      <td>Polymarket (Real Money)</td>
                    </tr>
                    <tr>
                      <td>日本世論 YES</td>
                      <td className="text-emerald-400 font-bold">{japanYes}%</td>
                      <td>未来レーダー ({item.japanVotes.total}票)</td>
                    </tr>
                    <tr>
                      <td>世論スプレッド (乖離)</td>
                      <td className="text-amber-400 font-bold">
                        {item.japanVotes.total >= 3 ? `${gap}% (n=${item.japanVotes.total})` : `サンプル収集中 (n=${item.japanVotes.total})`}
                      </td>
                      <td>オルタナティブデータ差分</td>
                    </tr>
                    <tr>
                      <td>24h観測高</td>
                      <td>${(item.volume24hUsd || 0).toLocaleString()}</td>
                      <td>オンチェーン取引高</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <button onClick={handleDownloadCsv} className="btn-download-data-main mt-4">
                <Download size={16} />
                <span>Excel用 CSV をダウンロード (.csv)</span>
              </button>
            </div>
          )}

          {/* タブ2: WebMCP */}
          {activeTab === 'mcp' && (
            <div className="data-tab-pane">
              <div className="mcp-hero-badge flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-amber-400" />
                <span className="text-xs font-bold text-amber-300">Claude Desktop / Cursor / 自律AIエージェント対応</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                WebMCP（Model Context Protocol）を設定すると、AIが未来レーダーのリアルタイム世論データを直接呼び出して市場分析や予測レポートを自律生成します。
              </p>

              <div className="share-text-box">
                <div className="share-label-row flex justify-between items-center">
                  <label>claude_desktop_config.json 設定コード:</label>
                  <button onClick={handleCopyMcp} className="btn-copy-code-inline">
                    {copiedMcp ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedMcp ? 'コピー完了！' : 'コードをコピー'}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  value={mcpConfigCode}
                  rows={6}
                  className="share-textarea font-mono text-xs"
                />
              </div>

              {onOpenAiConnector && (
                <button 
                  onClick={() => {
                    onClose();
                    onOpenAiConnector();
                  }}
                  className="btn-link-ai-guide mt-2"
                >
                  <span>詳しいWebMCP導入ガイド・仕様を見る</span>
                  <ExternalLink size={12} />
                </button>
              )}
            </div>
          )}

          {/* タブ3: JSON */}
          {activeTab === 'json' && (
            <div className="data-tab-pane">
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                WebAPIやバックテスト、プログラムへの組み込みに適した整形済みJSONデータです。
              </p>

              <div className="share-text-box">
                <div className="share-label-row flex justify-between items-center">
                  <label>JSON データ構造:</label>
                  <button onClick={handleCopyJson} className="btn-copy-code-inline">
                    {copiedJson ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedJson ? 'コピー完了！' : 'JSONコピー'}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  value={jsonString}
                  rows={7}
                  className="share-textarea font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <button onClick={handleCopyJson} className="btn-secondary-data">
                  {copiedJson ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>JSONをコピー</span>
                </button>
                <button onClick={handleDownloadJson} className="btn-primary-data">
                  <Download size={14} />
                  <span>JSONを保存 (.json)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
