#!/usr/bin/env node
/**
 * scripts/generate_hero_images.mjs
 * 
 * 銘柄個別ページ用シネマティック・ヒーローアイキャッチ画像を事前バッチ生成する。
 * - Gemini 3.8 Flash: 銘柄情報からシネマティック・ドラマ構図の英語プロンプトを自動生成
 * - FAL API (GPT Image 2): 16:9 高精細フォトリアル画像を生成
 * - 出力先: public/images/heroes/{slug}.png
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
Given a prediction market topic (title and background context), compose an evocative, dramatic, cinematic prompt describing a realistic, photorealistic wide scene (16:9) capturing the essence and high stakes of the topic.
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
          maxOutputTokens: 300,
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
    
    // text パートを探す（thought ではないテキスト）
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
  console.log(`   📝 プロンプト全文:\n   "${prompt}"\n`);

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

async function main() {
  const args = process.argv.slice(2);
  const targetSlug = args[0];

  const oddsPath = path.join(PROJECT_ROOT, 'public', 'data', 'market_odds.json');
  let marketsData = {};
  if (fs.existsSync(oddsPath)) {
    marketsData = JSON.parse(fs.readFileSync(oddsPath, 'utf-8'));
  }

  if (targetSlug) {
    const raw = marketsData[targetSlug] || {};
    const market = {
      slug: targetSlug,
      id: raw.matchedMarketId || targetSlug,
      titleJa: raw.titleJa || raw.marketQuestion || targetSlug,
      question: raw.marketQuestion || raw.titleJa,
      category: raw.category || 'geopolitics',
    };

    let customPrompt = null;
    if (targetSlug.includes('strait-of-hormuz') && targetSlug.includes('december-31')) {
      market.titleJa = 'ホルムズ海峡の通航量は12月31日までに正常化するか？';
      market.question = '中東の重要シーレーンであるホルムズ海峡における商業タンカーの航行量が正常化するかどうか。';
      customPrompt = 'Cinematic wide shot of the narrow Strait of Hormuz at tense twilight. A massive oil supertanker navigates the dark ocean waters between rugged arid desert mountains, flanked by naval escort warships cutting sharp white wakes. Atmospheric coastal haze, dramatic sunset glow reflecting on water, geopolitical suspense, hyper-realistic, documentary photography, 8k resolution, anamorphic lens, no text, no words.';
    }

    try {
      await generateHeroForMarket(market, true, customPrompt);
      console.log('\n✨ 指定銘柄の生成が完了しました！');
    } catch (err) {
      console.error('❌ 生成エラー:', err);
      process.exit(1);
    }
  } else {
    console.log('使用法: node scripts/generate_hero_images.mjs <slug>');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
