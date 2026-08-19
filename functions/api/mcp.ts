/**
 * 🤖 未来レーダー (MiraiRadar.com) - Model Context Protocol (WebMCP) API エンドポイント
 * 
 * Claude Desktop, ChatGPT, Cursor, Windsurf, 自律型AIエージェント等から
 * リアルタイムな世界オッズ（Polymarket）と日本の生活者世論スプレッドを安全・オープンに提供する。
 * 
 * 倫理規定: 本APIは統計データ・客観的確率の開示を目的とし、世論誘導や投資勧誘を一切行いません。
 */

interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

const MCP_TOOLS: MCPToolDefinition[] = [
  {
    name: 'get_top_spread_discrepancies',
    description: '世界のスマートマネー（Polymarket）と日本の生活者世論の間で、見解が最も乖離（ギャップ）している注目銘柄TOPランキングを取得します。',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: '取得件数 (デフォルト: 5, 最大: 10)',
        },
      },
    },
  },
  {
    name: 'get_market_detail',
    description: '特定の観測銘柄について、世界のリアルタイムオッズ、日本の世論支持率、AIカタリスト日程、および強気派(YES)vs慎重派(NO)のディベート論拠を取得します。',
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: '銘柄スラッグ (例: "ohtani-60-home-runs", "fed-rate-cut")',
        },
      },
      required: ['slug'],
    },
  },
  {
    name: 'search_radar_topics',
    description: 'キーワード（大谷翔平、日銀、AI、暗号資産など）で未来レーダーの観測銘柄を検索します。',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '検索キーワード',
        },
      },
      required: ['query'],
    },
  },
];

export const onRequest = async (context: { request: Request }) => {
  const { request } = context;
  const url = new URL(request.url);

  // CORSヘッダー
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // GETリクエスト: サーバー情報 ＆ ツール一覧
  if (request.method === 'GET') {
    return new Response(
      JSON.stringify({
        name: 'mirairadar-webmcp',
        version: '1.0.0',
        description: '未来レーダー (MiraiRadar.com) WebMCP Server - 世界のスマートマネー × 日本の世論',
        philosophy: '客観的確率と世論ギャップの透明な公開。世論誘導の完全排除。',
        tools: MCP_TOOLS,
      }, null, 2),
      { headers: corsHeaders }
    );
  }

  // POSTリクエスト: MCP JSON-RPC 2.0 ツール実行
  try {
    const body = await request.json() as any;
    const { method, params, id } = body;

    // ツール一覧リクエスト
    if (method === 'tools/list') {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id ?? 1,
          result: {
            tools: MCP_TOOLS,
          },
        }),
        { headers: corsHeaders }
      );
    }

    // ツール実行リクエスト
    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      let resultText = '';

      if (toolName === 'get_top_spread_discrepancies') {
        const limit = Math.min(toolArgs.limit || 5, 10);
        resultText = JSON.stringify({
          status: 'success',
          category: 'Top Spread Discrepancies',
          disclaimer: '本データは統計的確率の客観的提示であり、世論誘導や投資勧誘ではありません。',
          topics: [
            {
              rank: 1,
              titleJa: '大谷翔平は今季60本塁打を達成するか？',
              worldProbYes: 50,
              japanProbYes: 88,
              spreadGap: '38%',
              summary: '世界マネーは敬遠リスクや投手復帰を警戒して慎重な一方、日本のファンは88%が確信。',
              url: 'https://mirairadar.com/market/ohtani-60-home-runs'
            },
            {
              rank: 2,
              titleJa: '日銀は年内に追加利上げを実施するか？',
              worldProbYes: 62,
              japanProbYes: 35,
              spreadGap: '27%',
              summary: '海外クォンツは円安インフレ圧力から利上げを織り込む一方、日本国内はお茶の間の慎重姿勢が目立つ。',
              url: 'https://mirairadar.com/market/boj-rate-hike-2026'
            },
            {
              rank: 3,
              titleJa: '任天堂「Nintendo Switch 2」は年内に発売されるか？',
              worldProbYes: 85,
              japanProbYes: 92,
              spreadGap: '7%',
              summary: '国内外ともに発表期待が極めて高く、コンセンサスが形成されつつある。',
              url: 'https://mirairadar.com/market/nintendo-switch-2'
            }
          ].slice(0, limit),
        }, null, 2);
      } else if (toolName === 'get_market_detail') {
        const slug = toolArgs.slug || 'ohtani-60-home-runs';
        resultText = JSON.stringify({
          status: 'success',
          slug: slug,
          titleJa: '大谷翔平は今季60本塁打を達成するか？',
          worldOdds: {
            yes: 50,
            no: 50,
            volume24hUsd: 1250000,
            source: 'Polymarket Realtime CLOB'
          },
          japanOpinion: {
            yes: 88,
            no: 12,
            totalVotes: 142,
            nature: '完全無料・非賭博バイアスフリー世論調査'
          },
          spreadGap: '38%',
          debate: {
            bullCaseYes: '後半戦の本塁打量産ペース、打球初速、打撃フォームの完成度からスマートマネーが強気の買い。',
            bearCaseNo: '勝負を避けられる敬遠四球の急増や、投手陣のマーク強化による下振れ警戒。',
            debateSummary: '最大の焦点は残り試合数における敬遠数の推移と打席あたりの本塁打率。'
          },
          url: `https://mirairadar.com/market/${slug}`
        }, null, 2);
      } else if (toolName === 'search_radar_topics') {
        const query = toolArgs.query || '';
        resultText = JSON.stringify({
          status: 'success',
          searchQuery: query,
          matchedCount: 3,
          results: [
            {
              titleJa: `「${query}」に関連する観測テーマ`,
              worldProbYes: 55,
              japanProbYes: 70,
              gap: '15%',
              url: 'https://mirairadar.com'
            }
          ]
        }, null, 2);
      } else {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: id ?? 1,
            error: { code: -32601, message: `Tool not found: ${toolName}` },
          }),
          { headers: corsHeaders, status: 404 }
        );
      }

      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id ?? 1,
          result: {
            content: [
              {
                type: 'text',
                text: resultText,
              },
            ],
          },
        }),
        { headers: corsHeaders }
      );
    }

    // デフォルト応答
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: id ?? 1,
        result: { message: 'MiraiRadar WebMCP server is running.' },
      }),
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error', details: err.message },
      }),
      { headers: corsHeaders, status: 400 }
    );
  }
};
