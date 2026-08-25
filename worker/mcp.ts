/**
 * 🤖 未来レーダー (MiraiRadar.com) - WebMCP API (/api/mcp)
 *
 * Claude / ChatGPT / Cursor / 自律型AIエージェント等に、世界の予測市場
 * （Polymarket）のリアルマネー確率と日本の生活者世論を提供する。
 *
 * データ源はビルド時に生成される /data/mcp_snapshot.json（掲載銘柄のみ）。
 * ページに描いたのと同じ数字を、同じガードで返す：
 *   - n<3 の日本世論は確率を出さない（「集計中」）
 *   - 世界オッズが無い銘柄に既定値50%を捏造しない
 * 旧 functions/api/mcp.ts はハードコードのダミーデータを返す雛形だったため、
 * 本番投入にあたり全ツールを実データに置き換えた（2026-08-25）。
 *
 * 倫理規定: 本APIは統計データ・客観的確率の開示を目的とし、世論誘導や投資勧誘を一切行いません。
 */

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

interface McpSnapshot {
  generatedAt: string;
  minVotesForJapan: number;
  site: string;
  events: SnapshotEvent[];
}

interface AssetsBinding {
  fetch(request: Request | URL | string): Promise<Response>;
}

export interface WorkerEnv {
  ASSETS: AssetsBinding;
}

const MCP_TOOLS = [
  {
    name: 'get_top_spread_discrepancies',
    description:
      '世界の予測市場（Polymarket）と日本の生活者世論の間で、見解が最も乖離している掲載銘柄を取得します。日本側の投票が3票未満の銘柄は採点対象外です（確率を捏造しないため）。',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: '取得件数 (デフォルト: 5, 最大: 10)' },
      },
    },
  },
  {
    name: 'get_market_detail',
    description:
      '特定の掲載銘柄について、世界のリアルマネー確率と日本の世論（n付き）を取得します。日本側が3票未満の場合、確率は返さず「集計中」を返します。',
    inputSchema: {
      type: 'object' as const,
      properties: {
        slug: { type: 'string', description: '銘柄スラッグ（get_top_spread_discrepancies / search_radar_topics の url 末尾）' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'search_radar_topics',
    description: 'キーワード（日銀、ビットコイン、FRB など）で未来レーダーの掲載銘柄を検索します。',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: '検索キーワード' },
      },
      required: ['query'],
    },
  },
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json; charset=utf-8',
};

const DISCLAIMER =
  '本データは統計的確率の客観的提示であり、世論誘導や投資勧誘ではありません。的中記録は https://mirairadar.com/track-record で全量公開しています。';

async function loadSnapshot(request: Request, env: WorkerEnv): Promise<McpSnapshot | null> {
  try {
    const res = await env.ASSETS.fetch(new URL('/data/mcp_snapshot.json', request.url));
    if (!res.ok) return null;
    return (await res.json()) as McpSnapshot;
  } catch {
    return null;
  }
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), { headers: CORS_HEADERS, status });

const rpcResult = (id: unknown, resultText: string) =>
  jsonResponse({
    jsonrpc: '2.0',
    id: id ?? 1,
    result: { content: [{ type: 'text', text: resultText }] },
  });

const rpcError = (id: unknown, code: number, message: string, status = 400) =>
  jsonResponse({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, status);

function eventSummary(e: SnapshotEvent) {
  return {
    titleJa: e.titleJa,
    category: e.category,
    endDate: e.endDate,
    world: e.world.hasOdds
      ? { probYes: e.world.probYes, subject: e.world.subject, source: 'Polymarket' }
      : { probYes: null, note: '世界オッズなし（国内独自銘柄または取引量僅少）' },
    japan:
      e.japan.probYes !== null
        ? { probYes: e.japan.probYes, n: e.japan.n, nature: '完全無料・非賭博の読者投票' }
        : { probYes: null, n: e.japan.n, note: '集計中（3票未満は確率を出さない）' },
    gapPct: e.gapPct,
    url: e.url,
  };
}

export async function handleMcp(request: Request, env: WorkerEnv): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (request.method === 'GET') {
    const snapshot = await loadSnapshot(request, env);
    return jsonResponse({
      name: 'mirairadar-webmcp',
      version: '2.0.0',
      description: '未来レーダー (MiraiRadar.com) WebMCP Server - 世界の予測市場 × 日本の世論',
      philosophy: '客観的確率と世論ギャップの透明な公開。世論誘導の完全排除。n<3の世論は語らない。',
      dataAsOf: snapshot?.generatedAt ?? null,
      listedMarkets: snapshot?.events.length ?? null,
      disclaimer: DISCLAIMER,
      tools: MCP_TOOLS,
    });
  }

  // POST: MCP JSON-RPC 2.0
  let body: { method?: string; params?: { name?: string; arguments?: Record<string, unknown> }; id?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch (err) {
    return rpcError(null, -32700, `Parse error: ${err instanceof Error ? err.message : 'invalid JSON'}`);
  }
  const { method, params, id } = body;

  if (method === 'tools/list') {
    return jsonResponse({ jsonrpc: '2.0', id: id ?? 1, result: { tools: MCP_TOOLS } });
  }

  if (method === 'tools/call') {
    const snapshot = await loadSnapshot(request, env);
    if (!snapshot) {
      return rpcError(id, -32000, 'データスナップショットを読み込めませんでした。時間をおいて再試行してください。', 503);
    }
    const toolName = params?.name;
    const toolArgs = params?.arguments ?? {};

    if (toolName === 'get_top_spread_discrepancies') {
      const limit = Math.min(Number(toolArgs.limit) || 5, 10);
      const scored = snapshot.events
        .filter((e) => e.gapPct !== null)
        .sort((a, b) => (b.gapPct ?? 0) - (a.gapPct ?? 0));
      return rpcResult(
        id,
        JSON.stringify(
          {
            status: 'success',
            dataAsOf: snapshot.generatedAt,
            disclaimer: DISCLAIMER,
            note: `掲載${snapshot.events.length}銘柄のうち、世界オッズと日本世論（n>=${snapshot.minVotesForJapan}）が両方そろった${scored.length}件を乖離順に返しています。`,
            topics: scored.slice(0, limit).map((e, i) => ({ rank: i + 1, ...eventSummary(e) })),
          },
          null,
          2
        )
      );
    }

    if (toolName === 'get_market_detail') {
      const slug = String(toolArgs.slug ?? '');
      const found = snapshot.events.find((e) => e.slug === slug || e.id === slug);
      if (!found) {
        return rpcError(id, -32602, `掲載銘柄に slug "${slug}" は見つかりません。search_radar_topics で検索してください。`, 404);
      }
      return rpcResult(
        id,
        JSON.stringify(
          { status: 'success', dataAsOf: snapshot.generatedAt, disclaimer: DISCLAIMER, ...eventSummary(found) },
          null,
          2
        )
      );
    }

    if (toolName === 'search_radar_topics') {
      const query = String(toolArgs.query ?? '').trim().toLowerCase();
      const results = query
        ? snapshot.events.filter(
            (e) => e.titleJa.toLowerCase().includes(query) || e.slug.toLowerCase().includes(query) || e.category.toLowerCase() === query
          )
        : [];
      return rpcResult(
        id,
        JSON.stringify(
          {
            status: 'success',
            dataAsOf: snapshot.generatedAt,
            searchQuery: query,
            matchedCount: results.length,
            results: results.map(eventSummary),
          },
          null,
          2
        )
      );
    }

    return rpcError(id, -32601, `Tool not found: ${String(toolName)}`, 404);
  }

  return jsonResponse({ jsonrpc: '2.0', id: id ?? 1, result: { message: 'MiraiRadar WebMCP server is running.' } });
}
