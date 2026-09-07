import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Code2, 
  Terminal, 
  Copy, 
  Check, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  FileCode2, 
  Sparkles,
  Database
} from 'lucide-react';
import { applySeoMetadata } from '../utils/seoHelper';

interface DevelopersPageProps {
  onBack: () => void;
  onOpenAiConnector?: () => void;
}

export const DevelopersPage: React.FC<DevelopersPageProps> = ({ onBack, onOpenAiConnector }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [codeLang, setCodeLang] = useState<'curl' | 'typescript' | 'python'>('curl');

  useEffect(() => {
    applySeoMetadata({
      title: '開発者向けオープンAPI ＆ WebMCP仕様書 ｜ 未来レーダー',
      description: '未来レーダーの予測市場データREST/JSON APIドキュメント。Polymarket世界オッズと日本世論スプレッドのオープン取得仕様、TypeScript型定義、コード例。',
      canonicalUrl: 'https://mirairadar.com/developers',
      ogType: 'article'
    });
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const curlCode = `# 全掲載銘柄の世論スプレッド・オッズ一覧を取得
curl -s -X GET "https://mirairadar.com/api/mcp" \\
  -H "Accept: application/json"

# 特定銘柄（スラグ指定）の詳細データを取得
curl -s -X POST "https://mirairadar.com/api/mcp" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_market_detail",
      "arguments": {
        "slug": "council-economy-1787785544563"
      }
    },
    "id": 1
  }'`;

  const tsCode = `// TypeScript / Node.js でのデータ取得例
interface SnapshotEvent {
  id: string;
  slug: string;
  titleJa: string;
  category: string;
  endDate: string | null;
  world: { hasOdds: boolean; probYes: number | null; subject: string | null };
  japan: { n: number; probYes: number | null; note?: string };
  gapPct: number | null;
  url: string;
}

async function fetchMiraiMarkets(): Promise<SnapshotEvent[]> {
  const res = await fetch('https://mirairadar.com/data/mcp_snapshot.json');
  if (!res.ok) throw new Error('Failed to fetch snapshot');
  const data = await res.json();
  return data.events;
}

fetchMiraiMarkets().then(events => {
  console.log(\`取得件数: \${events.length}件\`);
  const topGaps = events
    .filter(e => e.gapPct !== null)
    .sort((a, b) => (b.gapPct ?? 0) - (a.gapPct ?? 0));
  console.log('最大世論乖離:', topGaps[0]);
});`;

  const pythonCode = `import requests

# 1. 未来レーダーのオープンJSONスナップショットを取得
url = "https://mirairadar.com/data/mcp_snapshot.json"
response = requests.get(url)
data = response.json()

events = data.get("events", [])
print(f"取得銘柄数: {len(events)}件")

# 2. 世界オッズと日本世論の乖離が大きい上位3件を抽出
valid_gaps = [e for e in events if e.get("gapPct") is not None]
sorted_gaps = sorted(valid_gaps, key=lambda x: x["gapPct"], reverse=True)

for i, ev in enumerate(sorted_gaps[:3], 1):
    print(f"[{i}] {ev['titleJa']}")
    print(f"    世界確率: {ev['world']['probYes']}% vs 日本世論: {ev['japan']['probYes']}% (乖離: {ev['gapPct']}pt)")
    print(f"    URL: {ev['url']}")`;

  return (
    <div className="developers-page animate-fade-in text-slate-200 py-2">
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

        {onOpenAiConnector && (
          <button
            onClick={onOpenAiConnector}
            className="flex items-center gap-1.5 text-xs font-mono text-amber-300 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-900/60 px-3.5 py-2 rounded-lg border border-amber-800/50 transition cursor-pointer"
          >
            <Sparkles size={13} />
            <span>AIプロンプト活用ガイド（/ai-connector）↗</span>
          </button>
        )}
      </div>

      {/* ヒーローセクション */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#0b1320] via-[#0d1829] to-[#0b1320] border border-cyan-900/60 p-6 sm:p-10 mb-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-cyan-400 text-xs font-mono font-semibold tracking-wider uppercase mb-4">
            <Cpu size={14} className="text-cyan-400" />
            DEVELOPER API & OPEN DATA
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
            未来レーダー 開発者向けオープンAPI仕様
          </h1>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-4xl">
            世界のスマートマネー（Polymarket）と日本の生活者世論をリアルタイムに集約したオープンデータ基盤。認証不要のREST / JSONエンドポイントおよびWebMCPプロトコルにより、あなたのアプリケーションや分析パイプラインへ自由に組み込めます。
          </p>
        </div>
      </div>

      {/* 3大仕様ハイライトカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold">
            <Terminal size={16} />
            <span>完全認証不要（API KEY FREE）</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            パブリック・インテリジェンスの理念に基づき、個人開発やリサーチ用途ではAPIキーの登録不要で今すぐGETリクエスト可能です。
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold">
            <ShieldCheck size={16} />
            <span>超高速エッジ配信 (&lt;50ms)</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Cloudflare Workers & グローバルエッジキャッシュ（300秒TTL）により、世界中どこからでも低レイテンシーで応答します。
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold">
            <Layers size={16} />
            <span>厳格なオッズ品質保証</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            日本世論が3票未満の銘柄には確率値を捏造せず「集計中」とし、世界オッズの無い銘柄に50%既定値を入れない厳格な統計規律を担保。
          </p>
        </div>
      </div>

      {/* API仕様とコード例 */}
      <div className="space-y-8">
        {/* エンドポイント一覧 */}
        <section className="bg-[#0b1320] border border-cyan-900/60 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-cyan-400">
            <Database size={20} />
            <h2 className="text-lg sm:text-xl font-bold text-white">エンドポイント一覧</h2>
          </div>

          <div className="space-y-3 pt-2">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                    GET
                  </span>
                  <code className="text-xs font-mono text-cyan-300 font-bold">
                    https://mirairadar.com/data/mcp_snapshot.json
                  </code>
                </div>
                <p className="text-xs text-slate-400">
                  現在掲載中の全未来予測銘柄、世界オッズ、日本世論支持率、世論スプレッドの一括JSONスナップショット。
                </p>
              </div>
              <button
                onClick={() => copyToClipboard('https://mirairadar.com/data/mcp_snapshot.json', 'url1')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-mono flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedKey === 'url1' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedKey === 'url1' ? 'コピー完了' : 'URLコピー'}</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-500/30">
                    POST / GET
                  </span>
                  <code className="text-xs font-mono text-cyan-300 font-bold">
                    https://mirairadar.com/api/mcp
                  </code>
                </div>
                <p className="text-xs text-slate-400">
                  JSON-RPC 2.0 / WebMCP準拠の対話型API。Claude DesktopやCursor、カスタムAIエージェントからの関数呼び出しに対応。
                </p>
              </div>
              <button
                onClick={() => copyToClipboard('https://mirairadar.com/api/mcp', 'url2')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-mono flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedKey === 'url2' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedKey === 'url2' ? 'コピー完了' : 'URLコピー'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* コードサンプル（タブ切り替え） */}
        <section className="bg-[#0b1320] border border-cyan-900/60 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-cyan-400">
              <FileCode2 size={20} />
              <h2 className="text-lg sm:text-xl font-bold text-white">実装コードサンプル</h2>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
              <button
                onClick={() => setCodeLang('curl')}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                  codeLang === 'curl' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                cURL
              </button>
              <button
                onClick={() => setCodeLang('typescript')}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                  codeLang === 'typescript' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                TypeScript
              </button>
              <button
                onClick={() => setCodeLang('python')}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                  codeLang === 'python' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Python
              </button>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => {
                const text = codeLang === 'curl' ? curlCode : codeLang === 'typescript' ? tsCode : pythonCode;
                copyToClipboard(text, 'code');
              }}
              className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-xs text-slate-300 font-mono flex items-center gap-1.5 transition shadow cursor-pointer z-10"
            >
              {copiedKey === 'code' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copiedKey === 'code' ? 'コピー完了' : 'コードをコピー'}</span>
            </button>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed pt-10">
              {codeLang === 'curl' && curlCode}
              {codeLang === 'typescript' && tsCode}
              {codeLang === 'python' && pythonCode}
            </pre>
          </div>
        </section>

        {/* データスキーマ定義 */}
        <section className="bg-[#0b1320] border border-cyan-900/60 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-cyan-400">
            <Code2 size={20} />
            <h2 className="text-lg sm:text-xl font-bold text-white">データ構造（TypeScript 定義）</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="py-2.5 px-3">フィールド</th>
                  <th className="py-2.5 px-3">型</th>
                  <th className="py-2.5 px-3">説明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                <tr>
                  <td className="py-2.5 px-3 text-cyan-300">id</td>
                  <td className="py-2.5 px-3 text-amber-300">string</td>
                  <td className="py-2.5 px-3 text-slate-300 font-sans">銘柄の一意な識別子</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-cyan-300">slug</td>
                  <td className="py-2.5 px-3 text-amber-300">string</td>
                  <td className="py-2.5 px-3 text-slate-300 font-sans">URLスラッグ（/market/{'{slug}'}）</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-cyan-300">titleJa</td>
                  <td className="py-2.5 px-3 text-amber-300">string</td>
                  <td className="py-2.5 px-3 text-slate-300 font-sans">予測テーマの日本語タイトル</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-cyan-300">world.probYes</td>
                  <td className="py-2.5 px-3 text-amber-300">number | null</td>
                  <td className="py-2.5 px-3 text-slate-300 font-sans">Polymarket世界スマートマネーのYES確率 (0〜100)</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-cyan-300">japan.probYes</td>
                  <td className="py-2.5 px-3 text-amber-300">number | null</td>
                  <td className="py-2.5 px-3 text-slate-300 font-sans">日本生活者のリアルタイムYES支持率（n&lt;3の場合はnull）</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-cyan-300">gapPct</td>
                  <td className="py-2.5 px-3 text-amber-300">number | null</td>
                  <td className="py-2.5 px-3 text-slate-300 font-sans">世界オッズと日本世論の乖離絶対値 (|world - japan|)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* フッター戻るボタン */}
      <div className="mt-12 text-center">
        <a 
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onBack();
          }}
          className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors bg-slate-900/80 hover:bg-slate-800 border border-cyan-800/60 px-6 py-3 rounded-xl no-underline cursor-pointer shadow-lg"
        >
          <ArrowLeft size={16} />
          <span>未来レーダー トップへ戻る</span>
        </a>
      </div>
    </div>
  );
};
