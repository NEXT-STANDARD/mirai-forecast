import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Bot, 
  Copy, 
  Check, 
  Terminal, 
  Scale, 
  MessageSquareQuote,
  Lightbulb
} from 'lucide-react';
import { applySeoMetadata } from '../utils/seoHelper';

interface AiConnectorPageProps {
  onBack: () => void;
  onOpenDevelopers?: () => void;
}

export const AiConnectorPage: React.FC<AiConnectorPageProps> = ({ onBack, onOpenDevelopers }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    applySeoMetadata({
      title: '生成AI連携・実戦プロンプト集 (Claude / Cursor / ChatGPT) ｜ 未来レーダー',
      description: 'Claude DesktopやCursor、ChatGPT等の生成AIに未来レーダーの予測市場データを接続し、世界オッズと日本世論の乖離を深掘り分析するプロンプト集。',
      canonicalUrl: 'https://mirairadar.com/ai-connector',
      ogType: 'article'
    });
  }, []);

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

  const samplePrompts = [
    {
      id: 'p1',
      title: '📊 世論ギャップTOP3 乖離要因レポート',
      tag: 'マーケット分析',
      prompt: `未来レーダーのMCPツールを使って、現在「世界マネー（Polymarket）とお茶の間の日本世論」で最も意見が割れている注目テーマTOP3を抽出してください。それぞれのテーマについて、世界のYES確率と日本のYES支持率、および最大の対立争点を対比したブリーフィングレポートを作成してください。`
    },
    {
      id: 'p2',
      title: '⚖️ 特定銘柄の強気派(YES) vs 懐疑派(NO) 知的ディベート要約',
      tag: '深掘りリサーチ',
      prompt: `未来レーダーの get_market_detail ツールを使って、日銀の政策金利またはAI規制に関する最新銘柄のデータを取得してください。YES派の主要論拠（強気要因）とNO派の主要論拠（リスク・懐疑要因）、および今後の確率急変トリガーとなる次回注目カタリスト日程を分かりやすく整理してください。`
    },
    {
      id: 'p3',
      title: '🔍 キーワード指定による関連未来予測の横断サーベイ',
      tag: 'テーマ検索',
      prompt: `未来レーダーの search_radar_topics ツールを使って「AI」または「日銀」に関連する掲載銘柄をすべて検索してください。各銘柄の締め切り日程、世界オッズ、日本世論のサンプル数（n）を一覧表にまとめ、投資家やビジネスリーダーが留意すべき示唆を解説してください。`
    }
  ];

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
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

        <div className="flex items-center gap-3">
          {onOpenDevelopers && (
            <button
              onClick={onOpenDevelopers}
              className="flex items-center gap-1.5 text-xs font-mono text-cyan-300 hover:text-cyan-100 bg-cyan-950/40 hover:bg-cyan-900/60 px-3.5 py-2 rounded-lg border border-cyan-800/50 transition cursor-pointer"
            >
              <Terminal size={13} />
              <span>開発者向けREST API仕様（/developers）↗</span>
            </button>
          )}
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
          <span>AI AGENT PROMPT & CONNECTION HUB</span>
        </div>
        <h1 className="connector-hero-title">
          Claude や ChatGPT に「世界の集合知 × 日本の世論」を接続する
        </h1>
        <p className="connector-hero-subtitle">
          未来レーダーのWebMCPデータ基盤を使えば、自律型AIに「現在世界のお金がどこに賭けられ、日本の生活者がどう直感しているか」をリアルタイムに読み込ませ、客観的な分析レポートを作成させることができます。
        </p>

        {/* 核心理念 ＆ 免責カード */}
        <div className="connector-philosophy-box">
          <div className="flex items-center gap-2 text-xs font-extrabold text-amber-300 mb-1.5">
            <Scale size={14} />
            <span>未来レーダーの核心理念：予測の客観的提示と世論誘導の完全排除</span>
          </div>
          <p className="philosophy-text">
            未来レーダーは、世界の予測市場（Polymarket）の確率と日本の無料オピニオンを対比・公開する中立メディアです。AI利用においても、特定の結論を誘導するのではなく、対立する論拠と確率スプレッドを客観的に観察するための分析基盤として設計されています。
          </p>
        </div>
      </div>

      {/* 接続設定セクション */}
      <div className="space-y-4 mb-10">
        <div className="setup-card">
          <div className="setup-card-header">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-cyan-400" />
              <h2 className="setup-title text-sm">Claude Desktop / Cursor 接続設定</h2>
            </div>
            <button 
              onClick={() => copyToClipboard(claudeConfigJson, 'config')}
              className="btn-copy-config cursor-pointer"
            >
              {copiedKey === 'config' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copiedKey === 'config' ? 'コピー完了！' : '設定JSONをコピー'}</span>
            </button>
          </div>
          <p className="setup-desc text-xs">
            <code>claude_desktop_config.json</code> の <code>mcpServers</code> に追加するだけで、即座にツールが認識されます。
          </p>
          <pre className="code-block font-mono text-xs">{claudeConfigJson}</pre>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold font-mono">
            <Lightbulb size={16} />
            <span>AIエージェント活用のコツ</span>
          </div>
          <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4 leading-relaxed">
            <li><strong>「世界オッズ」と「日本世論」のズレに注目</strong>：AIに「乖離の理由」を考察させると、グローバル投資家と国内生活者の視点の違いが浮き彫りになります。</li>
            <li><strong>カタリスト日程のタイムライン化</strong>：重要発表日程（日銀会合や決算日など）をもとに、AIに未来予測カレンダーを作成させることができます。</li>
          </ul>
        </div>
      </div>

      {/* 今すぐ使える実戦プロンプト集セクション */}
      <div className="space-y-4 mb-12">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-white m-0">
            <MessageSquareQuote size={18} className="text-amber-400" />
            <span>今すぐ使える実戦プロンプト集</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">全3パターン</span>
        </div>

        <div className="space-y-4">
          {samplePrompts.map((sp) => (
            <div key={sp.id} className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-lg">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    {sp.tag}
                  </span>
                  <h3 className="text-sm font-bold text-white">{sp.title}</h3>
                </div>
                <button
                  onClick={() => copyToClipboard(sp.prompt, sp.id)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedKey === sp.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedKey === sp.id ? 'コピー完了！' : 'プロンプトをコピー'}</span>
                </button>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-sans">
                “{sp.prompt}”
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
