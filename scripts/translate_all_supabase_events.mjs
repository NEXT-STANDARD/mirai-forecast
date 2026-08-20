import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync("/Users/aikirishimaphoenix/AI-Company/projects/mirai-forecast/.env", "utf-8");
const parsed = {};
env.split("\n").forEach(l => { 
  const [k, ...v] = l.split("="); 
  if (k && !k.startsWith("#")) parsed[k.trim()] = v.join("=").trim(); 
});

const supabase = createClient(parsed.VITE_SUPABASE_URL, parsed.SUPABASE_SERVICE_ROLE_KEY || parsed.VITE_SUPABASE_ANON_KEY);

const categoryLabels = {
  economy: '📊 経済・金利・暗号資産',
  tech: '⚡ AI・テック',
  politics: '🌐 国際・社会',
  sports: '⚾ スポーツ',
  entertainment: '🎬 エンタメ',
};

// 辞書マッピング
const DIRECT_MAP = {
  '1': { titleJa: '米大統領選 2028：JDヴァンスが勝利するか？', category: 'politics' },
  '2': { titleJa: '日銀：9月会合で追加利上げ（0.75%へ）を実施するか？', category: 'economy' },
  '3': { titleJa: 'OpenAI：年内にGPT-5（次世代フロンティアモデル）を発表するか？', category: 'tech' },
  '4': { titleJa: 'ビットコイン：年内に150,000ドルを突破するか？', category: 'economy' },
  '5': { titleJa: '日本の衆議院解散・総選挙は年内に行われるか？', category: 'politics' },
  '6': { titleJa: 'SpaceX：Starshipの完全軌道再突入・無傷回収が年内に成功するか？', category: 'tech' },
  '7': { titleJa: 'FRB：年内に累計1.0%以上の利下げを実施するか？', category: 'economy' },
  '8': { titleJa: 'AI国際サミット（東京開催）で主要7カ国が法的拘束力ある合意を結ぶか？', category: 'tech' },
  'proposal-1787044134976': { titleJa: '大谷翔平は今季60本塁打を達成するか？', category: 'sports' },
  '79987': { titleJa: 'マリーヌ・ル・ペンは2027年フランス大統領選挙で勝利するか？', category: 'politics' },
  '31195': { titleJa: 'プーチン大統領は2026年末までにロシア大統領を退任するか？', category: 'politics' },
  '51456': { titleJa: 'FRBは2026年に利下げを0回（見送り）にとどめるか？', category: 'economy' },
  '455875': { titleJa: 'ホルムズ海峡の通航量は12月31日までに正常化するか？', category: 'politics' },
  '833254': { titleJa: 'MLB公式戦: ドジャース vs ロッキーズ 勝敗予測', category: 'sports' },
  '833209': { titleJa: 'MLB公式戦: オリオールズ vs レイズ 勝敗予測', category: 'sports' },
};

function translateTitle(id, raw) {
  if (DIRECT_MAP[id]) return DIRECT_MAP[id];

  if (!raw) return { titleJa: '観測銘柄' };

  let t = raw;
  let category = null;

  // MLBチーム名
  if (/Dodgers|Rockies|Orioles|Rays|Cardinals|Reds|Tigers|Pirates|Marlins|Phillies|Yankees|Red Sox/i.test(t)) {
    category = 'sports';
    return { titleJa: `MLB公式戦: ${t.replace(' - Exact Score', '').replace(' - More Markets', '')} 勝敗予測`, category };
  }

  // eスポーツ
  if (/LoL:|League of Legends/i.test(t)) {
    category = 'entertainment';
    t = t.replace(/LoL:\s*/i, 'LoL公式戦: ');
    t = t.replace(/\(BO3\)/g, '（3本勝負）').replace(/\(BO5\)/g, '（5本勝負）');
    return { titleJa: `${t} 勝敗予測`, category };
  }
  if (/EWC 2026 CS2|Counter-Strike|CS2/i.test(t)) {
    category = 'entertainment';
    if (/Winner/i.test(t)) return { titleJa: 'EWC 2026（eスポーツW杯）CS2部門 優勝チーム予測', category };
    t = t.replace(/Counter-Strike:\s*/i, 'CS2公式戦: ');
    return { titleJa: `${t} 勝敗予測`, category };
  }

  // テニス・サッカー・野球等のスポーツ
  if (/Cincinnati Open:/i.test(t)) {
    category = 'sports';
    const match = t.replace(/Cincinnati Open:\s*/i, '');
    return { titleJa: `テニス シンシナティOP: ${match} 勝敗予測`, category };
  }
  if (/ITF M25/i.test(t)) {
    category = 'sports';
    return { titleJa: `国際テニスITFツアー: ${t.replace(/ITF M25.*?:\s*/, '')} 勝敗予測`, category };
  }
  if (/Ballon d'Or Winner (\d+)/i.test(t)) {
    category = 'sports';
    const year = t.match(/Ballon d'Or Winner (\d+)/i)[1];
    return { titleJa: `${year}年 サッカー・バロンドール受賞者予測`, category };
  }
  if (/EPL:\s*(\d+)\s*Champion/i.test(t)) {
    category = 'sports';
    return { titleJa: 'イングランド・プレミアリーグ 2026-27 優勝クラブ予測', category };
  }
  if (/Pro Football:\s*(\d+)\s*Champion/i.test(t)) {
    category = 'sports';
    return { titleJa: 'NFL 第61回スーパーボウル 優勝チーム予測', category };
  }
  if (/UEFA Champions League/i.test(t)) {
    category = 'sports';
    if (/Paris Saint-Germain/i.test(t)) return { titleJa: 'パリ・サンジェルマンは2026-27 UEFAチャンピオンズリーグで優勝するか？', category };
    return { titleJa: '2026-27 UEFAチャンピオンズリーグ 優勝クラブ予測', category };
  }
  if (/vs\.?|対/i.test(t) && !t.startsWith('LoL') && !t.startsWith('CS2')) {
    category = 'sports';
    let clean = t.replace(' - Exact Score', '（スコア予想）').replace(' - More Markets', '');
    if (/Lynx|Valkyries/i.test(t)) {
      return { titleJa: `WNBA公式戦: ${clean} 勝敗予測`, category };
    }
    return { titleJa: `欧州サッカー: ${clean} 勝敗予測`, category };
  }

  // 経済・FRB・暗号資産
  if (/Fed Decision in September.*?50\+?\s*bps decrease/i.test(t)) {
    category = 'economy';
    return { titleJa: '米FRB：9月FOMCで50bp以上の大幅利下げを実施するか？', category };
  }
  if (/What will WTI Crude Oil.*?hit in August 2026/i.test(t)) {
    category = 'economy';
    return { titleJa: '2026年8月 WTI原油先物価格の到達水準予測', category };
  }
  if (/Bitcoin above ___ on August (\d+)/i.test(t)) {
    category = 'economy';
    const day = t.match(/August (\d+)/i)[1];
    return { titleJa: `ビットコイン価格：8月${day}日の目標価格水準予測`, category };
  }
  if (/Ethereum above ___ on August (\d+)/i.test(t)) {
    category = 'economy';
    const day = t.match(/August (\d+)/i)[1];
    return { titleJa: `イーサリアム価格：8月${day}日の目標価格水準予測`, category };
  }
  if (/Bitcoin Up or Down on August (\d+)/i.test(t)) {
    category = 'economy';
    const day = t.match(/August (\d+)/i)[1];
    return { titleJa: `ビットコイン：8月${day}日に前日比プラスで引けるか？`, category };
  }
  if (/Will the price of Bitcoin be above \$?([\d,]+) on August (\d+)/i.test(t)) {
    category = 'economy';
    const m = t.match(/Will the price of Bitcoin be above \$?([\d,]+) on August (\d+)/i);
    return { titleJa: `ビットコイン価格は8月${m[2]}日に${m[1]}ドルを上回るか？`, category };
  }
  if (/Will the price of Ethereum be above \$?([\d,]+) on August (\d+)/i.test(t)) {
    category = 'economy';
    const m = t.match(/Will the price of Ethereum be above \$?([\d,]+) on August (\d+)/i);
    return { titleJa: `イーサリアム価格は8月${m[2]}日に${m[1]}ドルを上回るか？`, category };
  }
  if (/What price will Bitcoin hit in August.*?[↑↓]?\s*([\d,]+)/i.test(t)) {
    category = 'economy';
    const m = t.match(/([\d,]+)/);
    return { titleJa: `ビットコインは8月中に${m ? m[1] : ''}ドルに到達するか？`, category };
  }
  if (/What price will Ethereum hit in August.*?[↑↓]?\s*([\d,]+)/i.test(t)) {
    category = 'economy';
    const m = t.match(/([\d,]+)/);
    return { titleJa: `イーサリアムは8月中に${m ? m[1] : ''}ドルに到達するか？`, category };
  }
  if (/What price will Bitcoin hit in (\d+).*?[↑↓]?\s*([\d,]+)/i.test(t)) {
    category = 'economy';
    const m = t.match(/What price will Bitcoin hit in (\d+).*?[↑↓]?\s*([\d,]+)/i);
    return { titleJa: `ビットコインは${m[1]}年に${m[2]}ドルに到達するか？`, category };
  }
  if (/What price will Ethereum hit in (\d+).*?[↑↓]?\s*([\d,]+)/i.test(t)) {
    category = 'economy';
    const m = t.match(/What price will Ethereum hit in (\d+).*?[↑↓]?\s*([\d,]+)/i);
    return { titleJa: `イーサリアムは${m[1]}年に${m[2]}ドルに到達するか？`, category };
  }
  if (/What price will Bitcoin hit August (\d+)-(\d+).*?[↑↓]?\s*([\d,]+)/i.test(t)) {
    category = 'economy';
    const m = t.match(/August (\d+)-(\d+).*?[↑↓]?\s*([\d,]+)/i);
    return { titleJa: `ビットコインは8月${m[1]}〜${m[2]}日に${m[3]}ドルに到達するか？`, category };
  }
  if (/What price will Ethereum hit August (\d+)-(\d+).*?[↑↓]?\s*([\d,]+)/i.test(t)) {
    category = 'economy';
    const m = t.match(/August (\d+)-(\d+).*?[↑↓]?\s*([\d,]+)/i);
    return { titleJa: `イーサリアムは8月${m[1]}〜${m[2]}日に${m[3]}ドルに到達するか？`, category };
  }

  // 政治・国際
  if (/Gavin Newsom win the 2028/i.test(t)) {
    category = 'politics';
    return { titleJa: 'ギャビン・ニューサムは2028年米民主党大統領候補に選出されるか？', category };
  }
  if (/Donald Trump win the 2028/i.test(t)) {
    category = 'politics';
    return { titleJa: 'ドナルド・トランプは2028年米共和党大統領候補に選出されるか？', category };
  }
  if (/JD Vance win the 2028/i.test(t)) {
    category = 'politics';
    return { titleJa: '米大統領選 2028：JDヴァンスが勝利するか？', category };
  }
  if (/Tarcisio de Freitas win the 2026/i.test(t)) {
    category = 'politics';
    return { titleJa: 'タルシシオ・デ・フレイタスは2026年ブラジル大統領選挙で勝利するか？', category };
  }
  if (/Florida Governor Republican Primary Winner/i.test(t)) {
    category = 'politics';
    return { titleJa: '米フロリダ州知事選：共和党予備選で勝利する候補は？', category };
  }
  if (/Where will the next next round of US-Iran peace talks be/i.test(t)) {
    category = 'politics';
    return { titleJa: '米イラン和平交渉：次期協議の開催地はどこになるか？', category };
  }
  if (/US-Iran 60 day negotiation period extended/i.test(t)) {
    category = 'politics';
    return { titleJa: '米イラン間の60日間交渉期間はさらに延長されるか？', category };
  }
  if (/Israel x Iran ceasefire continues through/i.test(t)) {
    category = 'politics';
    return { titleJa: 'イスラエル・イラン間の停戦合意は継続するか？', category };
  }
  if (/US announces end of Iranian blockade by July 24, 2026/i.test(t)) {
    category = 'politics';
    return { titleJa: '米国は2026年7月24日までにイラン海上封鎖の解除を発表するか？', category };
  }
  if (/US ceasefire against Iran continues through August 22/i.test(t)) {
    category = 'politics';
    return { titleJa: '米国の対イラン停戦措置は8月22日まで継続するか？', category };
  }
  if (/Strait of Hormuz traffic returns to normal by (August|September|December) (\d+)/i.test(t)) {
    category = 'politics';
    const m = t.match(/by (August|September|December) (\d+)/i);
    const months = { August: '8月', September: '9月', December: '12月' };
    return { titleJa: `ホルムズ海峡の通航量は${months[m[1]] || m[1]}${m[2]}日までに正常化するか？`, category };
  }
  if (/Abiy Ahmed be the next Prime Minister of Ethiopia/i.test(t)) {
    category = 'politics';
    return { titleJa: 'アビィ・アハメドは次期エチオピア首相に留任するか？', category };
  }
  if (/United Russia \(ER\) gain the most seats/i.test(t)) {
    category = 'politics';
    return { titleJa: '統一ロシアは次期ロシア下院選で最多議席を獲得するか？', category };
  }

  // エンタメ・Twitter
  if (/Elon Musk # tweets August (\d+) - August (\d+)/i.test(t)) {
    category = 'entertainment';
    const m = t.match(/August (\d+) - August (\d+)/i);
    return { titleJa: `イーロン・マスクは8月${m[1]}日〜${m[2]}日に何回ポストするか？`, category };
  }

  return { titleJa: t, category };
}

async function run() {
  console.log('🚀 Supabase 全銘柄の日本語化＆カテゴリ是正を開始...');
  const { data: events, error } = await supabase.from('events').select('*');
  if (error) {
    console.error('Fetch error:', error);
    return;
  }

  let updatedCount = 0;
  for (const ev of events) {
    const raw = ev.title_en || ev.title_ja || '';
    const res = translateTitle(ev.id, raw);
    
    const patch = {
      title_ja: res.titleJa,
      question_ja: res.titleJa,
      category: res.category || ev.category || 'economy',
      category_label: categoryLabels[res.category || ev.category || 'economy'],
    };

    const { error: updateErr } = await supabase.from('events').update(patch).eq('id', ev.id);
    if (updateErr) {
      console.error(`Error updating event [${ev.id}]:`, updateErr.message);
    } else {
      updatedCount++;
    }
  }

  console.log(`🎉 完了: 全 ${updatedCount} 件の銘柄を完璧な日本語および正しいカテゴリに更新しました！`);
}

run();
