/**
 * 未来レーダー (MiraiRadar.com) - Polymarket データ完全自動同期Cron
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  try {
    const envContent = fs.readFileSync('/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env', 'utf-8');
    envContent.split('\n').forEach(line => {
      const [key, ...vals] = line.split('=');
      if (key && !key.startsWith('#')) {
        const k = key.trim();
        const v = vals.join('=').trim();
        if (k === 'VITE_SUPABASE_URL') supabaseUrl = v;
        if (k === 'SUPABASE_SERVICE_ROLE_KEY' && v) supabaseKey = v;
        if (k === 'VITE_SUPABASE_ANON_KEY' && !supabaseKey) supabaseKey = v;
      }
    });
  } catch {}
}

const supabase = createClient(supabaseUrl, supabaseKey);
const POLYMARKET_EVENTS_API = 'https://gamma-api.polymarket.com/events?limit=30&active=true&closed=false&order=volume24hr&ascending=false';

const SENSITIVE_KEYWORDS = [
  'death', 'kill', 'assassinate', 'die', 'dead', 'casualty', 'suicide',
  'terror', 'attack', 'bomb', 'war casualty', 'shooting', 'arrest', 'crime'
];

const JAPAN_ELECTION_KEYWORDS = [
  'japan election', 'japanese prime minister', 'shugiin', 'sangiin', '衆議院', '参議院', '都知事選'
];

export async function runPolymarketSync() {
  console.log(`[${new Date().toISOString()}] Polymarket 自動同期を開始します...`);

  try {
    const res = await fetch(POLYMARKET_EVENTS_API);
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const rawEvents = await res.json();
    console.log(`Polymarketから取得した生イベント数: ${rawEvents.length}`);

    let syncedCount = 0;

    for (const ev of rawEvents) {
      if (!ev.markets || !ev.markets[0]) continue;
      const market = ev.markets[0];
      const titleLower = (ev.title + ' ' + (market.question || '')).toLowerCase();

      if (SENSITIVE_KEYWORDS.some(kw => titleLower.includes(kw))) continue;
      if (JAPAN_ELECTION_KEYWORDS.some(kw => titleLower.includes(kw))) continue;

      let probYes = 50;
      if (market.outcomePrices) {
        try {
          const parsed = typeof market.outcomePrices === 'string' ? JSON.parse(market.outcomePrices) : market.outcomePrices;
          if (Array.isArray(parsed) && parsed[0]) {
            probYes = Math.round(parseFloat(parsed[0]) * 100);
          }
        } catch {}
      }

      let cat = 'economy';
      let catLabel = '📊 マクロ経済';
      if (titleLower.includes('election') || titleLower.includes('president') || titleLower.includes('senate')) {
        cat = 'politics';
        catLabel = '🌐 国際・選挙';
      } else if (titleLower.includes('ai') || titleLower.includes('gpt') || titleLower.includes('openai') || titleLower.includes('nvidia')) {
        cat = 'tech';
        catLabel = '⚡ AI・テック';
      } else if (titleLower.includes('btc') || titleLower.includes('bitcoin') || titleLower.includes('fed') || titleLower.includes('rate')) {
        cat = 'economy';
        catLabel = '📊 金利・暗号資産';
      }

      const eventRecord = {
        id: String(ev.id || ev.slug),
        slug: ev.slug,
        title_ja: ev.title,
        title_en: ev.title,
        question_ja: market.question || ev.title,
        question_en: market.question || ev.title,
        category: cat,
        category_label: catLabel,
        icon_url: ev.image || ev.icon || null,
        end_date: market.endDate ? new Date(market.endDate).toISOString() : null,
      };

      // 1. events テーブルに UPSERT
      const { error: upsertErr } = await supabase
        .from('events')
        .upsert(eventRecord, { onConflict: 'id' });

      if (upsertErr) {
        console.error(`Error upserting event ${ev.slug}:`, upsertErr.message);
        continue;
      }

      // 2. polymarket_price_history に時系列オッズをINSERT
      const volume24h = ev.volume24hr || 0;
      const totalVol = ev.volume || volume24h * 3;

      await supabase
        .from('polymarket_price_history')
        .insert({
          event_id: eventRecord.id,
          prob_yes: probYes,
          prob_no: 100 - probYes,
          volume_24h_usd: volume24h,
          total_volume_usd: totalVol,
        });

      syncedCount++;
    }

    console.log(`[完了] ${syncedCount} 件の市場データをSupabaseに正常同期しました！`);
  } catch (err) {
    console.error('Polymarket同期エラー:', err);
  }
}

runPolymarketSync();
