import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Bot, 
  Sparkles, 
  Copy, 
  Check, 
  Terminal, 
  ShieldCheck, 
  Scale, 
  Code2
} from 'lucide-react';

interface AiConnectorPageProps {
  onBack: () => void;
}

export const AiConnectorPage: React.FC<AiConnectorPageProps> = ({ onBack }) => {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

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

  const cursorConfigJson = `{
  "mcpServers": {
    "mirairadar": {
      "url": "https://mirairadar.com/api/mcp"
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
        <button onClick={onBack} className="btn-back-link">
          <ArrowLeft size={16} />
          <span>ターミナルへ戻る</span>
        </button>

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
            <Terminal size={18} className="text-cyan-400" />
            <span>30秒クイックスタート（設定ファイルの追加）</span>
          </h2>

          {/* Claude Desktop */}
          <div className="setup-card">
            <div className="setup-card-header">
              <div className="flex items-center gap-2">
                <span className="setup-num font-mono">01</span>
                <h3 className="setup-title">Claude Desktop への接続</h3>
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
              <code>claude_desktop_config.json</code> の <code>mcpServers</code> に以下を追加するだけで、Claudeが自動で未来レーダーを参照できるようになります。
            </p>
            <pre className="code-block font-mono">{claudeConfigJson}</pre>
          </div>

          {/* Cursor / Windsurf */}
          <div className="setup-card">
            <div className="setup-card-header">
              <div className="flex items-center gap-2">
                <span className="setup-num font-mono">02</span>
                <h3 className="setup-title">Cursor / Windsurf への接続</h3>
              </div>
              <button 
                onClick={() => copyToClipboard(cursorConfigJson, 'cursor')}
                className="btn-copy-config"
              >
                {copiedTab === 'cursor' ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedTab === 'cursor' ? 'コピー完了！' : 'URL設定をコピー'}</span>
              </button>
            </div>
            <p className="setup-desc">
              Cursorの <code>Settings ➔ Features ➔ MCP ➔ Add New MCP Server</code> から Remote URL（<code>https://mirairadar.com/api/mcp</code>）を登録してください。
            </p>
            <pre className="code-block font-mono">{cursorConfigJson}</pre>
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

        {/* 右ペイン: 公開されているMCPツール一覧 */}
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

          {/* セキュリティ＆コンプライアンス証跡 */}
          <div className="security-notice-card">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-1">
              <ShieldCheck size={14} />
              <span>データ完全性 ＆ オープンAPI仕様</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed m-0">
              未来レーダーのWebMCPエンドポイントは、認証不要・完全オープンで利用可能です。APIレートリミットは設けておりますが、商用・非商用問わず自由にご活用いただけます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
