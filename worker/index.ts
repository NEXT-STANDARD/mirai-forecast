/**
 * 未来レーダー Worker エントリポイント（Workers + Static Assets）
 *
 * 歴史的経緯（2026-08-25 に P0-6 の迷宮を解いた記録）:
 *   このプロジェクトは Cloudflare Pages ではなく Worker としてデプロイされている。
 *   リポジトリに wrangler 設定が無かったため、CI の wrangler 自動セットアップが
 *   毎ビルド `not_found_handling: "single-page-application"` を生成し、
 *   ①未知パスが index.html を 200 で返す（ソフト404）
 *   ②Pages 専用の functions/ ディレクトリが無視され /api/mcp が動かない
 *   の両方を生んでいた。wrangler.jsonc をコミットし、この Worker で /api/* を担当する。
 *
 * ルーティング:
 *   - アセットに一致するリクエストはこの Worker に来ない（Cloudflare が先に配信する）
 *   - /api/mcp        → WebMCP（実データ・worker/mcp.ts）
 *   - /api/*（その他） → JSON 404（HTMLのソフト404を返さない）
 *   - それ以外        → ASSETS へ委譲。存在しなければ not_found_handling="404-page"
 *                       により 404.html が 404 ステータスで返る
 */

import { handleMcp, type WorkerEnv } from './mcp';

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';

    if (pathname === '/api/mcp') {
      return handleMcp(request, env);
    }

    if (pathname.startsWith('/api/')) {
      return new Response(
        JSON.stringify({ error: 'Not found', hint: '利用可能なAPIは /api/mcp です（WebMCP / JSON-RPC 2.0）。' }),
        { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    return env.ASSETS.fetch(request);
  },
};
