import type { MarketItem } from '../types';

export const INITIAL_EVENTS: MarketItem[] = [
  {
    id: 'fed-september-2026',
    slug: 'fed-decision-in-september',
    title: 'Fed Decision in September: 50+ bps cut?',
    titleJa: '米FRBが9月会合で0.5%以上の大幅利下げを実施するか？',
    question: 'Will the Fed decrease interest rates by 50+ bps after the September meeting?',
    questionJa: '米連邦準備制度理事会（FRB）は9月のFOMCで0.5%以上の利下げを実施するか？',
    category: 'economy',
    categoryLabel: '経済・金融',
    iconUrl: 'https://polymarket-upload.s3.us-east-2.amazonaws.com/fed-decision-in-september-762-c4RyWuxRPo1L.jpg',
    worldProbYes: 18,
    worldProbNo: 82,
    probChange24h: -14.2,
    volume24hUsd: 566055,
    totalVolumeUsd: 34467334,
    endDate: '2026-09-30',
    japanVotes: {
      yes: 1420,
      no: 2890,
      total: 4310,
      percentYes: 33,
    },
    aiInsight: {
      summaryJa: '米労働市場の減速懸念が和らぎ、直近のCPI指数が予想通りだったことから、FRBは通常ペース（0.25%）の利下げにとどまるとの観測が急浮上。大幅利下げの確率が急落しました。',
      whyMovedJa: '直近24時間でパウエル議長の発言やインフレ指標の発表を受け、トレーダーがタカ派寄りにポジションを修正。市場の「0.5%利下げ」観測が後退したため確率が14%低下。',
      keyCatalysts: [
        '次回FOMC政策金利発表（9月中旬）',
        '米雇用統計（非農業部門雇用者数）の事前発表',
        '日米金利差縮小による為替（ドル円）への波及'
      ],
      urgencyLevel: 'high',
      lastUpdated: '10分前'
    },
    comments: [
      {
        id: 'c1',
        author: 'マクロ経済ウォッチャー',
        avatar: '📊',
        vote: 'NO',
        text: 'インフレ再燃を恐れるFRBが初手で0.5%切る理由はない。0.25%利下げが既定路線。',
        createdAt: '35分前',
        likes: 24
      },
      {
        id: 'c2',
        author: 'FXトレーダーK',
        avatar: '💹',
        vote: 'YES',
        text: '雇用指標が急悪化した場合の緊急サプライズを世界のスマートマネーはまだ警戒しているはず。',
        createdAt: '1時間前',
        likes: 9
      }
    ]
  },
  {
    id: 'us-president-2028',
    slug: 'presidential-election-winner-2028',
    title: 'US Presidential Election Winner 2028',
    titleJa: '2028年 次期米大統領選挙の勝者は？（JDヴァンス優勢か）',
    question: 'Will JD Vance win the 2028 US Presidential Election?',
    questionJa: 'JDヴァンスが2028年米大統領選で勝利するか？',
    category: 'politics',
    categoryLabel: '国際・政治',
    iconUrl: 'https://polymarket-upload.s3.us-east-2.amazonaws.com/presidential-election-winner-2024-afdda358-219d-448a-abb5-ba4d14118d71.png',
    worldProbYes: 26,
    worldProbNo: 74,
    probChange24h: +4.8,
    volume24hUsd: 567270,
    totalVolumeUsd: 686600229,
    endDate: '2028-11-08',
    japanVotes: {
      yes: 890,
      no: 3450,
      total: 4340,
      percentYes: 20,
    },
    aiInsight: {
      summaryJa: '共和党内での後継者争いにおいて、現職副大統領候補としての地盤を固めたヴァンス氏への資金流入が拡大。対抗馬となる民主党候補の乱立により単独オッズ首位を維持。',
      whyMovedJa: '保守系メディアでの連日露出と支持率上昇を受け、大口クジラによるYES買いが約40万ドル流入。',
      keyCatalysts: [
        '2026年中間選挙の共和党議席獲得数',
        '民主党次世代リーダー（ニューサム知事ら）の支持率動向'
      ],
      urgencyLevel: 'medium',
      lastUpdated: '1時間前'
    },
    comments: [
      {
        id: 'c3',
        author: '国際情勢アナリスト',
        avatar: '🌍',
        vote: 'NO',
        text: 'まだ2年以上ある。中間選挙の結果次第で情勢は一変する可能性が高い。',
        createdAt: '2時間前',
        likes: 15
      }
    ]
  },
  {
    id: 'openai-gpt5-release',
    slug: 'openai-gpt5-or-next-flagship-release',
    title: 'OpenAI to release Next-Gen Frontier Model by Q4?',
    titleJa: 'OpenAIは年内に次世代フロンティアモデル（GPT-5級）を正式公開するか？',
    question: 'Will OpenAI release its next flagship frontier model before Q4 2026?',
    questionJa: 'OpenAIは2026年第4四半期までに新世代フラッグシップモデルを一般公開するか？',
    category: 'tech',
    categoryLabel: 'テック・AI',
    iconUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=120&q=80',
    worldProbYes: 78,
    worldProbNo: 22,
    probChange24h: +18.5,
    volume24hUsd: 1240890,
    totalVolumeUsd: 18920400,
    endDate: '2026-12-31',
    japanVotes: {
      yes: 3820,
      no: 910,
      total: 4730,
      percentYes: 81,
    },
    aiInsight: {
      summaryJa: 'サム・アルトマンCEOの「推論モデルとフロンティアモデルの統合」に関するポッドキャスト発言と、テスト環境への未発表モデル配備リークにより、年内リリース確率が80%近くまで急騰。',
      whyMovedJa: '開発者コミュニティでのAPIベンチマーク流出と、競合AnthropicやGoogleの最新発表に対抗する動きと見られ、急激なYES買いが発生。',
      keyCatalysts: [
        'OpenAI DevDay（秋季開発者会議）でのキーノート発表',
        '米AI安全性評議会への事前提出審査の完了報告'
      ],
      urgencyLevel: 'high',
      lastUpdated: '25分前'
    },
    comments: [
      {
        id: 'c4',
        author: 'AIエンジニアT',
        avatar: '🤖',
        vote: 'YES',
        text: '競合の追撃が凄まじいので、OpenAI側も年内に出さざるを得ないはず。',
        createdAt: '45分前',
        likes: 38
      }
    ]
  },
  {
    id: 'boj-rate-hike-2026',
    slug: 'bank-of-japan-rate-hike-by-december',
    title: 'Bank of Japan to raise policy rate above 0.75% in 2026?',
    titleJa: '日銀は2026年内に追加利上げ（政策金利0.75%以上）を実施するか？',
    question: 'Will the Bank of Japan raise its policy interest rate above 0.75% by December 2026?',
    questionJa: '日本銀行は2026年12月までに政策金利を0.75%以上に引き上げるか？',
    category: 'economy',
    categoryLabel: '経済・金融',
    iconUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=120&q=80',
    worldProbYes: 68,
    worldProbNo: 32,
    probChange24h: +8.3,
    volume24hUsd: 890450,
    totalVolumeUsd: 14200000,
    endDate: '2026-12-31',
    japanVotes: {
      yes: 1950,
      no: 2640,
      total: 4590,
      percentYes: 42,
    },
    aiInsight: {
      summaryJa: '春闘の賃上げ持続とサービス価格の上昇を受け、植田総裁が追加利上げに前向きな姿勢を維持。世界の投資家は年内利上げを68%と高確率で予測している一方、日本の国内世論は「まだ慎重なのでは」と乖離（ギャップ26%）が生じています。',
      whyMovedJa: '最新の消費者物価指数（コアCPI）が日銀目標の2%を28ヶ月連続で超過したニュースを受け、海外勢の円買い・金利先物買いが活発化。',
      keyCatalysts: [
        '次回 日銀金融政策決定会合',
        '四半期 経済・物価情勢の展望（展望レポート）'
      ],
      urgencyLevel: 'high',
      lastUpdated: '15分前'
    },
    comments: [
      {
        id: 'c5',
        author: '兜町アナリスト',
        avatar: '📈',
        vote: 'YES',
        text: '実質賃金がプラス転換すれば10月〜12月会合での引き上げ確率は極めて高い。世界の予測の方が正しい。',
        createdAt: '10分前',
        likes: 19
      }
    ]
  },
  {
    id: 'bitcoin-hit-120k',
    slug: 'what-price-will-bitcoin-hit-in-2026',
    title: 'Bitcoin to reach $120,000 in 2026?',
    titleJa: 'ビットコイン（BTC）は2026年内に12万ドル（約1800万円）を突破するか？',
    question: 'Will Bitcoin reach $120,000 by December 31, 2026?',
    questionJa: 'ビットコインの価格は2026年12月末までに120,000ドルに到達するか？',
    category: 'economy',
    categoryLabel: '暗号資産・Web3',
    iconUrl: 'https://polymarket-upload.s3.us-east-2.amazonaws.com/BTC+fullsize.png',
    worldProbYes: 54,
    worldProbNo: 46,
    probChange24h: +6.2,
    volume24hUsd: 1420900,
    totalVolumeUsd: 53025036,
    endDate: '2026-12-31',
    japanVotes: {
      yes: 2840,
      no: 1620,
      total: 4460,
      percentYes: 64,
    },
    aiInsight: {
      summaryJa: '米現物ETFへの継続的な機関投資家資金の流入と、半減期後の供給減サイクルが効いており、世界の予測は54%と拮抗。日本人ユーザーはより強気（64%）な見通しを持っています。',
      whyMovedJa: '米主要年金基金によるBTC ETFのポートフォリオ組み入れ開示を受け、買い需要が底堅いとの見方が強まりました。',
      keyCatalysts: [
        '米大統領選後の暗号資産規制（SEC方針）',
        '世界的な流動性供給とFRB利下げペース'
      ],
      urgencyLevel: 'medium',
      lastUpdated: '3時間前'
    }
  },
  {
    id: 'ucl-2027-champion',
    slug: 'uefa-champions-league-2027-champion',
    title: 'UEFA Champions League 2027: Real Madrid or PSG?',
    titleJa: 'UEFAチャンピオンズリーグ2027：優勝クラブ予測',
    question: 'Will Real Madrid win the 2026-27 UEFA Champions League?',
    questionJa: 'レアル・マドリードが2026-27 UEFAチャンピオンズリーグで優勝するか？',
    category: 'sports',
    categoryLabel: 'スポーツ',
    iconUrl: 'https://polymarket-upload.s3.us-east-2.amazonaws.com/uefa-champions-league-2025-26-which-teams-qualify-StbSIjaEx2St.png',
    worldProbYes: 28,
    worldProbNo: 72,
    probChange24h: +1.2,
    volume24hUsd: 915384,
    totalVolumeUsd: 9329554,
    endDate: '2027-06-01',
    japanVotes: {
      yes: 1600,
      no: 1200,
      total: 2800,
      percentYes: 57,
    },
    aiInsight: {
      summaryJa: '新戦力補強と若手タレントの躍動によりレアル・マドリードが優勝候補筆頭（28%）に君臨。マンチェスター・シティ（22%）、アーセナル（16%）が追う展開。',
      whyMovedJa: '夏の移籍市場での大型契約締結を受け、オッズが微増。',
      keyCatalysts: ['CLグループステージ組み合わせ抽選会', '主要選手の負傷離脱情報'],
      urgencyLevel: 'low',
      lastUpdated: '6時間前'
    }
  }
];
