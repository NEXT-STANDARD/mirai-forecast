import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env', 'utf-8');
const localEnv = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && !k.startsWith('#')) localEnv[k.trim()] = v.join('=').trim();
});

const supabase = createClient(localEnv.VITE_SUPABASE_URL, localEnv.SUPABASE_SERVICE_ROLE_KEY || localEnv.VITE_SUPABASE_ANON_KEY);

async function testProposal() {
  const testProposal = {
    id: `proposal-${Date.now()}`,
    slug: `proposal-ohtani-60hr-${Date.now()}`,
    title_ja: '大谷翔平は今季60本塁打を達成するか？',
    title_en: 'Will Shohei Ohtani reach 60 home runs this season?',
    question_ja: '大谷翔平選手が今シーズン中にレギュラーシーズン通算60本塁打を記録するかどうかを予測します。',
    question_en: 'Proposed by user: 野球ファン (背景: 直近の量産ペースと残り試合数)',
    category: 'sports',
    category_label: '💡 ユーザー提案・注目',
    icon_url: '',
    end_date: '2026-10-01',
    is_active: false, // ⭐️ 審査前は非公開！
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('events').insert(testProposal);
  if (error) {
    console.error('Error saving proposal:', error.message);
  } else {
    console.log('✅ 提案が審査待ち（is_active: false）として正常に保存されました！');
    
    // 審査待ち一覧の取得テスト
    const { data: pendings } = await supabase.from('events').select('id, title_ja, question_en, is_active').eq('is_active', false);
    console.log('🔍 審査待ち提案一覧:', pendings);

    // 削除クリーンアップ
    await supabase.from('events').delete().eq('id', testProposal.id);
  }
}

testProposal();
