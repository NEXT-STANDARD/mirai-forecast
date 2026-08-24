import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Bot, 
  Sparkles, 
  Copy, 
  Check, 
  Terminal, 
  ShieldCheck, 
  Scale, 
  Code2,
  Zap
} from 'lucide-react';
import { applySeoMetadata } from '../utils/seoHelper';

interface AiConnectorPageProps {
  onBack: () => void;
}

export const AiConnectorPage: React.FC<AiConnectorPageProps> = ({ onBack }) => {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  useEffect(() => {
    applySeoMetadata({
      title: 'WebMCP AI連携ガイド (Claude / Cursor / ChatGPT) ｜ 未来レーダー',
      description: '未来レーダーのWebMCPオープンAPI連携ガイド。Claude DesktopやCursor、自律型AIエージェントからリアルタイムに世界のオッズと世論スプレッドを取得。',
      // canonical は「そのページ自身のURL」。APIエンドポイントを指すと自ら索引から降りる
      // （/ai-connector と /developers が1コンポーネントなので実パスから決める）
      canonicalUrl: `https://mirairadar.com${typeof window !== 'undefined' && window.location.pathname === '/developers' ? '/developers' : '/ai-connector'}`,
      ogType: 'article'
    });
  }, []);

  const mcpEndpointUrl = 'https://mirairadar.com/api/mcp';

  const claudeConfigJson = `{
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

  const samplePrompt = `未来レーダーのMCPツールを使って、現在「世界マネー（Polymarket）とお茶の間の日本世論」で最も意見が割れている注目テーマTOP3を教えてください。それぞれのYES論拠とNO論拠も簡潔に対比してレポートしてください。`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTab(id);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  return (
    <div className="ai-connector-page animate-fade-in">
      {/* ナビゲーションバー */}
      <div className="connector-nav-bar">
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

        <div className="flex items-center gap-2">
          <span className="badge-mcp-status font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            WebMCP 1.0 LIVE
          </span>
        </div>
      </div>

      {/* ヒーローセクション */}
      <div className="connector-hero-card">
        <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold mb-2">
          <Bot size={16} />
          <span>OPEN KNOWLEDGE PROTOCOL // WebMCP</span>
        </div>
        <h1 className="connector-hero-title">
          あなたの生成AIに「世界のスマートマネー × 日本の世論」を接続する
        </h1>
        <p className="connector-hero-subtitle">
          未来レーダーは、Claude Desktop、Cursor、ChatGPT、自律型AIエージェントからリアルタイムに世界の確率と世論スプレッドを取得できる、オープンなWebMCPデータハブです。
        </p>

        {/* 核心理念 ＆ 免責カード */}
        <div className="connector-philosophy-box">
          <div className="flex items-center gap-2 text-xs font-extrabold text-amber-300 mb-1.5">
            <Scale size={14} />
            <span>未来レーダーの核心理念：予測の公開と世論誘導の完全排除</span>
          </div>
          <p className="philosophy-text">
            未来レーダーは、様々な情報や世界の予測市場（Polymarket）から未来の確率を観測し、それを透明性高く公開することを目的としています。
            <strong>本サービスは世論を誘導する意図は一切なく、あくまで「世界の集合知とお茶の間の世論の間にギャップが存在するかもしれない」という客観的なオルタナティブデータを提示するものです。</strong>
            AIに対しても、常に中立・公平な統計データとして提供されます。
          </p>
        </div>
      </div>

      {/* 30秒クイックスタートガイド */}
      <div className="connector-content-grid">
        {/* 左ペイン: 各種AIへの接続手順 */}
        <div className="connector-left-pane">
          <h2 className="connector-section-title flex items-center gap-2">
            <Zap size={18} className="text-amber-400" />
            <span>接続方法（かんたんURL入力 ＆ 開発者JSON）</span>
          </h2>

          {/* 🌟 1. 【超かんたん・推奨】URLを入力するだけ（ノーコード） */}
          <div className="setup-card featured-setup-card">
            <div className="setup-card-header">
              <div className="flex items-center gap-2">
                <span className="setup-badge-recommended">★ 最も簡単（URL入力のみ）</span>
                <h3 className="setup-title">Claude Desktop / Cursor 設定</h3>
              </div>
              <button 
                onClick={() => copyToClipboard(mcpEndpointUrl, 'url-only')}
                className="btn-copy-config primary"
              >
                {copiedTab === 'url-only' ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedTab === 'url-only' ? 'URLコピー完了！' : 'MCP URLをコピー'}</span>
              </button>
            </div>
            <p className="setup-desc">
              Claude DesktopアプリやCursorの<strong>「設定 (Settings) ➔ コネクタ / MCP (Model Context Protocol)」</strong>を開き、以下のURLを登録するだけで接続が完了します。
            </p>
            <div className="url-copy-box">
              <span className="font-mono text-cyan-400 font-bold text-xs">{mcpEndpointUrl}</span>
            </div>
            <div className="setup-steps-list">
              <div className="step-item">
                <span className="step-num">1</span>
                <span>サーバー名に <code>mirairadar</code> と入力</span>
              </div>
              <div className="step-item">
                <span className="step-num">2</span>
                <span>URLに上の <code>{mcpEndpointUrl}</code> を貼り付け</span>
              </div>
              <div className="step-item">
                <span className="step-num">3</span>
                <span>保存をクリックして接続完了！🎉</span>
              </div>
            </div>
          </div>

          {/* 🛠️ 2. 【開発者向け】JSON設定ファイルを直接編集する方法 */}
          <div className="setup-card">
            <div className="setup-card-header">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-slate-400" />
                <h3 className="setup-title">開発者向け：JSON設定ファイルで追加</h3>
              </div>
              <button 
                onClick={() => copyToClipboard(claudeConfigJson, 'claude')}
                className="btn-copy-config"
              >
                {copiedTab === 'claude' ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedTab === 'claude' ? 'コピー完了！' : 'JSON設定をコピー'}</span>
              </button>
            </div>
            <p className="setup-desc">
              <code>claude_desktop_config.json</code> の <code>mcpServers</code> に直接追記したい場合はこちらをご使用ください。
            </p>
            <pre className="code-block font-mono">{claudeConfigJson}</pre>
          </div>

          {/* コピペ用プロンプト集 */}
          <div className="setup-card prompt-card">
            <div className="setup-card-header">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <h3 className="setup-title">AIに話しかけるプロンプト例</h3>
              </div>
              <button 
                onClick={() => copyToClipboard(samplePrompt, 'prompt')}
                className="btn-copy-config"
              >
                {copiedTab === 'prompt' ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedTab === 'prompt' ? 'コピー完了！' : 'プロンプトをコピー'}</span>
              </button>
            </div>
            <div className="prompt-content-box">
              <p className="prompt-text">“{samplePrompt}”</p>
            </div>
          </div>
        </div>

        {/* 右ペイン: 公開されているMCPツール一覧 ＆ レートリミット仕様 */}
        <div className="connector-right-pane">
          <h2 className="connector-section-title flex items-center gap-2">
            <Code2 size={18} className="text-emerald-400" />
            <span>提供されるWebMCPツール一覧</span>
          </h2>

          <div className="tools-list-container">
            {/* Tool 1 */}
            <div className="mcp-tool-item">
              <div className="tool-header">
                <span className="tool-name font-mono">get_top_spread_discrepancies</span>
                <span className="tool-badge">GET</span>
              </div>
              <p className="tool-desc">
                世界のスマートマネー（Polymarket）と日本世論の乖離ギャップが大きい注目銘柄TOPランキングを取得します。
              </p>
              <div className="tool-args font-mono">引数: limit (number, オプション)</div>
            </div>

            {/* Tool 2 */}
            <div className="mcp-tool-item">
              <div className="tool-header">
                <span className="tool-name font-mono">get_market_detail</span>
                <span className="tool-badge">GET</span>
              </div>
              <p className="tool-desc">
                特定銘柄のリアルタイム世界オッズ、日本世論支持率、AIカタリスト日程、強気派(YES)vs慎重派(NO)のディベート論拠をすべて取得します。
              </p>
              <div className="tool-args font-mono">引数: slug (string, 必須)</div>
            </div>

            {/* Tool 3 */}
            <div className="mcp-tool-item">
              <div className="tool-header">
                <span className="tool-name font-mono">search_radar_topics</span>
                <span className="tool-badge">GET</span>
              </div>
              <p className="tool-desc">
                大谷翔平、日銀、AI、暗号資産などのキーワードで観測テーマを横断検索します。
              </p>
              <div className="tool-args font-mono">引数: query (string, 必須)</div>
            </div>
          </div>

          {/* 🛡️ レートリミット ＆ エッジキャッシュ仕様 */}
          <div className="security-notice-card">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-1.5">
              <ShieldCheck size={14} />
              <span>レートリミット ＆ エッジキャッシュ仕様</span>
            </div>
            <div className="rate-limit-specs-list">
              <div className="spec-row">
                <span className="spec-label">認証方式:</span>
                <span className="spec-val">完全オープン（API Key不要）</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">リクエスト制限:</span>
                <span className="spec-val">100 req / 分 (IP単位)</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">エッジキャッシュ:</span>
                <span className="spec-val">Cloudflare CDN 300秒 自動更新</span>
              </div>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed mt-2 mb-0">
              Cloudflareのグローバルエッジでキャッシュ処理されるため、PolymarketやSupabaseへの負荷を抑え、AIエージェントからの超高速な応答（&lt;50ms）を実現しています。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
