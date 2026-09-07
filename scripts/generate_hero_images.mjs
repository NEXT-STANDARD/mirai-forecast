#!/usr/bin/env node
/**
 * scripts/generate_hero_images.mjs
 * 
 * 銘柄個別ページ＆トップページFeatured用シネマティック・ヒーローアイキャッチ画像を事前バッチ生成する。
 * - Gemini 3.8 Flash: 銘柄情報からシネマティック・ドラマ構図の英語プロンプトを自動生成
 * - FAL API (GPT Image 2): 16:9 高精細フォトリアル画像を生成
 * - 出力先: public/images/heroes/{slug}.png
 * 
 * 使用法:
 *   node scripts/generate_hero_images.mjs <slug>          # 単一銘柄を生成
 *   node scripts/generate_hero_images.mjs --top <N>       # スプレッド乖離（Gap）上位N件を生成
 *   node scripts/generate_hero_images.mjs --list          # 乖離順の生成状況一覧を表示
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const HEROES_DIR = path.join(PROJECT_ROOT, 'public', 'images', 'heroes');
const MANIFEST_FILE = path.join(HEROES_DIR, '_manifest.json');

function loadEnv() {
  const envPath = path.join(PROJECT_ROOT, '.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...vals] = trimmed.split('=');
    env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();
const FAL_KEY = process.env.FAL_KEY || env.FAL_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!FAL_KEY) {
  console.error('❌ FAL_KEY が見つかりません。');
  process.exit(1);
}

if (!fs.existsSync(HEROES_DIR)) {
  fs.mkdirSync(HEROES_DIR, { recursive: true });
}

function loadManifest() {
  if (fs.existsSync(MANIFEST_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveManifest(manifest) {
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf-8');
}

/**
 * Gemini 3.8 Flash で映画風シネマティック英語プロンプトを生成
 */
async function generatePromptWithGemini(titleJa, question, category) {
  const defaultFallback = `Cinematic wide shot representing ${titleJa}. Atmospheric dramatic lighting, 8k resolution, cinematic composition, high production value, photorealistic, documentary cinematography, no text, no letters.`;

  if (!GEMINI_API_KEY) {
    return defaultFallback;
  }

  const systemInstruction = `You are a master visual director and prompt engineer for high-end cinematic photo generation (using GPT Image 2).
Given a prediction market topic (title and background context), compose an evocative, dramatic, cinematic prompt describing a realistic, photorealistic wide scene (16:9) capturing the essence, conflict, and high stakes of the topic.
Guidelines:
1. Purely describe visual scenes, environments, atmospheric lighting, mood, color palette, and cinematic depth.
2. Photographic, documentary style, 35mm film photography, cinematic lighting, 8k resolution.
3. NEVER include text, words, captions, logos, signs, charts, UI elements, or typography in the scene.
4. Output ONLY the English prompt string. Do not include markdown, explanations, or quotes.`;

  const userQuery = `Topic Title: ${titleJa}
Context/Question: ${question || titleJa}
Category: ${category || 'general'}
Write a vivid, dramatic, cinematic 16:9 prompt for this scene (no text in image).`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemInstruction}\n\n${userQuery}` }] }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
        }
      })
    });

    if (!response.ok) {
      console.warn(`Gemini API Warning: ${response.status} ${response.statusText}`);
      return defaultFallback;
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    
    let promptText = '';
    for (const part of parts) {
      if (part.text && !part.thought) {
        promptText += part.text;
      }
    }

    promptText = promptText.trim().replace(/^["']|["']$/g, '');
    if (promptText) {
      return promptText;
    }
  } catch (err) {
    console.warn('⚠️ Gemini prompt generation warning:', err.message);
  }

  return defaultFallback;
}

/**
 * FAL API (openai/gpt-image-2) で画像を生成して保存
 */
async function generateImageWithFal(prompt, destPath) {
  const endpoint = 'https://fal.run/openai/gpt-image-2';
  const body = {
    prompt: `${prompt}, photorealistic, documentary cinematography, 8k, wide angle 16:9, highly detailed, no text, no typography`,
    image_size: 'landscape_16_9',
    quality: 'high',
    output_format: 'png',
    num_images: 1,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FAL API Error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const imageUrl = result?.images?.[0]?.url;
  if (!imageUrl) {
    throw new Error('FAL API did not return an image URL');
  }

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    throw new Error(`Failed to download image from ${imageUrl}`);
  }
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  return buffer.length;
}

/**
 * 単一銘柄のヒーロー画像を生成
 */
export async function generateHeroForMarket(market, force = false, explicitPrompt = null) {
  const slug = market.slug || market.id;
  const destPath = path.join(HEROES_DIR, `${slug}.png`);
  const manifest = loadManifest();

  if (!force && fs.existsSync(destPath) && manifest[slug]) {
    console.log(`⏩ スキップ（生成済み）: ${slug}`);
    return { slug, status: 'skipped', path: destPath };
  }

  console.log(`\n🎨 ヒーロー画像生成中: ${market.titleJa || market.title}`);
  console.log(`   Slug: ${slug}`);

  let prompt = explicitPrompt;
  if (!prompt) {
    console.log('   🤖 Gemini 3.8 Flash でシネマティックプロンプトを構築中...');
    prompt = await generatePromptWithGemini(market.titleJa || market.title, market.question, market.category);
  }
  console.log(`   📝 プロンプト:\n   "${prompt.slice(0, 100)}..."\n`);

  console.log('   🚀 FAL (GPT Image 2) にリクエスト送信中 (16:9)...');
  const startTime = Date.now();
  const bytes = await generateImageWithFal(prompt, destPath);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`   ✅ 生成完了: ${(bytes / 1024).toFixed(1)} KB (${elapsed}s) -> ${destPath}`);

  manifest[slug] = {
    titleJa: market.titleJa || market.title,
    prompt,
    createdAt: new Date().toISOString(),
    fileSizeKb: Math.round(bytes / 1024),
  };
  saveManifest(manifest);

  return { slug, status: 'generated', path: destPath, prompt };
}

/**
 * 乖離（スプレッドGap）の大きい順に掲載銘柄を取得
 */
async function getTopSpreadMarkets() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data: voteLogs } = await supabase.from('japan_vote_logs').select('event_id, choice');
  const voteCounts = {};
  if (voteLogs) {
    voteLogs.forEach(v => {
      if (!voteCounts[v.event_id]) voteCounts[v.event_id] = { yes: 0, no: 0 };
      if (v.choice === 'YES') voteCounts[v.event_id].yes += 1;
      if (v.choice === 'NO') voteCounts[v.event_id].no += 1;
    });
  }

  const { data: dbEvents } = await supabase.from('events').select('id, slug, title_ja, title_en, question_en, category, is_listed').eq('is_active', true);
  const oddsPath = path.join(PROJECT_ROOT, 'public', 'data', 'market_odds.json');
  const odds = fs.existsSync(oddsPath) ? JSON.parse(fs.readFileSync(oddsPath, 'utf-8')) : {};

  const list = (dbEvents || []).filter(d => d.is_listed !== false).map(d => {
    const slug = d.slug || d.id;
    const o = odds[slug] || odds[d.id] || {};
    const worldYes = o.probYes ?? null;
    const dbVotes = voteCounts[d.id] || voteCounts[slug] || { yes: 0, no: 0 };
    const total = dbVotes.yes + dbVotes.no;
    const japanYes = total > 0 ? Math.round((dbVotes.yes / total) * 100) : 50;
    const gap = total >= 3 && worldYes != null ? Math.abs(worldYes - japanYes) : 0;
    const destPath = path.join(HEROES_DIR, `${slug}.png`);
    const hasImage = fs.existsSync(destPath);

    return {
      slug,
      id: d.id,
      titleJa: d.title_ja || d.title_en,
      title: d.title_ja || d.title_en,
      question: d.question_en || d.title_ja,
      category: d.category || 'politics',
      worldYes,
      japanYes,
      gap,
      total,
      hasImage,
    };
  });

  list.sort((a, b) => b.gap - a.gap || b.total - a.total);
  return list;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    const list = await getTopSpreadMarkets();
    console.log('\n=== 乖離（スプレッドGap）順 掲載銘柄一覧 ===');
    list.forEach((m, i) => {
      console.log(`${(i + 1).toString().padStart(2)}. [Gap: ${m.gap}%] (${m.hasImage ? '✅生成済' : '❌未生成'}) ${m.titleJa}`);
      console.log(`    slug: ${m.slug}`);
    });
    return;
  }

  if (args.includes('--top')) {
    const topIndex = args.indexOf('--top');
    const count = parseInt(args[topIndex + 1], 10) || 3;
    const list = await getTopSpreadMarkets();
    const targets = list.filter(m => !m.hasImage).slice(0, count);

    console.log(`\n🚀 スプレッド上位の未生成銘柄を最大 ${count} 件生成します (対象: ${targets.length}件)...`);
    for (const market of targets) {
      try {
        await generateHeroForMarket(market, false);
      } catch (err) {
        console.error(`❌ 生成失敗 (${market.slug}):`, err.message);
      }
    }
    console.log('\n✨ バッチ生成処理が完了しました！');
    return;
  }

  const targetSlug = args[0];
  if (targetSlug) {
    const oddsPath = path.join(PROJECT_ROOT, 'public', 'data', 'market_odds.json');
    let marketsData = {};
    if (fs.existsSync(oddsPath)) {
      marketsData = JSON.parse(fs.readFileSync(oddsPath, 'utf-8'));
    }

    const raw = marketsData[targetSlug] || {};
    const market = {
      slug: targetSlug,
      id: raw.matchedMarketId || targetSlug,
      titleJa: raw.titleJa || raw.marketQuestion || targetSlug,
      question: raw.marketQuestion || raw.titleJa,
      category: raw.category || 'geopolitics',
    };

    try {
      await generateHeroForMarket(market, true);
      console.log('\n✨ 指定銘柄の生成が完了しました！');
    } catch (err) {
      console.error('❌ 生成エラー:', err);
      process.exit(1);
    }
  } else {
    console.log('使用法:');
    console.log('  node scripts/generate_hero_images.mjs <slug>     # 単一生成');
    console.log('  node scripts/generate_hero_images.mjs --top <N>  # 乖離上位N件を生成');
    console.log('  node scripts/generate_hero_images.mjs --list     # 一覧確認');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
