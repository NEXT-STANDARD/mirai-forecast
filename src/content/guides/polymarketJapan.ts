export interface GuideArticle {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  author: string;
  // AR-34: 本文の事実の出典。各 URL は開いて本文と照合したものだけを載せる
  sources: { label: string; url: string }[];
  readTimeMin: number;
  relatedMarketSlugs: string[];
  sections: {
    heading: string;
    subheading?: string;
    content: string[];
    callout?: {
      type: 'info' | 'warning' | 'tip';
      title: string;
      text: string;
    };
  }[];
}

export const POLYMARKET_JAPAN_GUIDE: GuideArticle = {
  slug: 'polymarket-japan',
  title: 'Polymarket（ポリマーケット）は日本から使えるのか？規制の現状と日本語での見方・活用法',
  subtitle: '2026年現在の利用制限、賭博罪に関する法規制の整理、そして日本語でリアルマネー確率を活用する代替手段',
  description: '世界最大の予測市場Polymarketは日本から使えるのか？2026年現在の利用制限、賭博規制の整理、日本語でリアルマネー確率を閲覧・比較する代替手段を分かりやすく解説。',
  publishedAt: '2026-08-23',
  updatedAt: '2026-11-24',
  author: '未来レーダー編集部',
  sources: [
    { label: 'Bloomberg（Bloomberg Law 転載）「Polymarket Is Said to Seek Japan Prediction Market Approval」2026年5月22日', url: 'https://news.bloomberglaw.com/crypto/polymarket-is-said-to-seek-japan-prediction-market-approval-1' },
    { label: 'CoinPost 2026年5月22日（上記 Bloomberg 報道の紹介）', url: 'https://coinpost.jp/?p=710307' },
    { label: 'CoinPost「ポリマーケット、日本を利用制限対象に」2026年4月27日', url: 'https://coinpost.jp/?p=705199' },
    { label: 'Polymarket 公式ドキュメント「Geographic Restrictions」', url: 'https://docs.polymarket.com/developers/CLOB/geoblock' },
    { label: 'e-Gov 法令検索「刑法」第185条', url: 'https://laws.e-gov.go.jp/law/140AC0000000045' },
    { label: 'パークス法律事務所「プリディクション・マーケットは日本で適法か」2026年8月15日', url: 'https://pax.law/topics/2505/' },
    { label: 'Finance Magnates「Japan\'s Prediction Markets Are Following the Pachinko Playbook」2026年6月29日', url: 'https://www.financemagnates.com/fintech/japans-prediction-markets-are-following-the-pachinko-playbook/' },
  ],
  readTimeMin: 6,
  // 優先して載せたい銘柄（固定の一覧ではない）。決着・非掲載のものは飛ばし、掲載中の銘柄で3件まで補う（AR-26）
  relatedMarketSlugs: [
    'how-many-fed-rate-cuts-in-2026',
  ],
  sections: [
    {
      heading: '1. 結論：見ることはできるが、日本から公式サイトで賭けることはできない',
      content: [
        '世界最大の分散型予測市場「Polymarket（ポリマーケット）」について、最も多く寄せられる疑問が「日本から実際に利用できるのか？」という点です。',
        '結論から述べると、**「世界のオッズや取引データは閲覧できるが、日本からは公式サイトの画面で新規の取引（賭け）ができない」**というのが2026年11月時点の状況です（Polymarket公式ドキュメントの区分。詳しくは第2節）。',
        'Polymarketは日本からのアクセス自体を遮断しているわけではないため、世界中のスマートマネーがどのような確率を織り込んでいるのかを観測する「情報インテリジェンスツール」としては利用制限の対象外であり、誰でも自由に閲覧・参照することができます。'
      ],
      callout: {
        type: 'info',
        title: 'ポイント',
        text: 'Polymarketのオッズの閲覧は制限されていません。一方、日本からの新規の取引はPolymarket自身が公式サイトの画面で制限しており、日本居住者が金銭を賭けることには賭博罪のリスクもあります（第3節）。'
      }
    },
    {
      heading: '2. 何が起きたか：2026年の経緯と地理的制限（ジオブロッキング）',
      content: [
        'Polymarketと日本市場を巡る動きは、2026年に入り大きな転換点を迎えました。',
        '2026年5月22日、Bloombergは関係者の話として、Polymarketが日本事業の責任者にMike Eidlin（マイク・エイドリン）氏を起用したと報じました。同じ報道によれば、同社は**2030年までに日本政府の承認を得ること**を目指しています。どちらも匿名の関係者の話で、Polymarketは公式には発表していません。',
        '一方でPolymarketは、遅くとも2026年4月下旬までに、日本を「地理的制限（Geographic Restrictions）」の対象に加えています（CoinPostが4月27日に報道）。公式ドキュメントでは、日本は「ウェブ画面（フロントエンド）では新規の取引ができず、すでに持っているポジションの決済だけができる（close-only）」区分です。サイトの閲覧そのものは制限されていません。'
      ]
    },
    {
      heading: '3. なぜ制限されているのか：日本の法規制と賭博罪の整理',
      content: [
        '日本国内からの取引が制限されている最大の理由は、日本の刑法第185条に規定される「賭博罪」との関係です。',
        '刑法第185条は「賭博をした者は、五十万円以下の罰金又は科料に処する。ただし、一時の娯楽に供する物を賭けたにとどまるときは、この限りでない。」と定めています。条文に「賭博」の定義はなく、判例・通説では、偶然の勝敗に財物や財産上の利益を賭けて、その得喪を争うことをいうとされています。暗号資産（USDC等）を賭け、将来の出来事の結果に応じて配当を得る仕組みは、これに当たるリスクが高いと考えられています。',
        'パークス法律事務所の解説は、参加費がなく、得たポイントを換金・譲渡できない設計であれば、参加者が財産を失わないため**賭博罪のリスクは大きく下がる**としています。ただし、名目だけ無償にしても実際に換金できるなら安全とはいえないなど、実際の設計しだいだと注意を促しています。',
        '※なお、本解説は公開された法情報および専門家の見解を整理したものであり、法的助言を構成するものではありません。個別の法解釈や法適合性については、必ず弁護士等の専門家にご相談ください。また、VPN等を用いて地理制限を迂回する行為は利用規約違反および法令違反リスクを伴うため推奨されません。'
      ],
      callout: {
        type: 'warning',
        title: '法令遵守に関する重要事項',
        text: 'VPN等を用いた意図的な地域制限の回避や無許可での賭博行為は厳に慎む必要があります。客観的なデータ分析として活用することが推奨されます。'
      }
    },
    {
      heading: '4. ではどうするか：日本語で安全に予測データを活用する選択肢',
      content: [
        '「日本からリアルマネーを賭けられない」としても、Polymarketが持つ**「世界中で多額のリアルマネーが投じられ、高い予測精度を持つとされる集合知データ」**の価値が失われるわけではありません。',
        '現在、日本国内のユーザーが取り得る選択肢には以下のようなものがあります：',
        '① **国内のポイント型予測サービスを利用する**：国内では、無償でポイントを得る型の予測サービスが出てきています。Finance Magnates（2026年6月29日）によれば、その一つのMiraimaは月間の利用者が約100万人に達しました。',
        '② **世界のオッズを日本語で閲覧・分析し、日本の世論と比較する**：英語のPolymarket画面を都度翻訳する手間を省き、金融インテリジェンスとして活用するアプローチです。',
        '当サイト**「未来レーダー（MiraiRadar.com）」**は、この「賭けずに世界のスマートマネー確率を日本語で読み解き、日本の生活者世論と並べて見たい」というニーズに応えるために構築された完全無料・非賭博型の金融インテリジェンスメディアです。登録不要・1秒の直感投票により、世界オッズと日本世論の乖離（スプレッド）をどなたでもリアルタイムに比較・観測いただけます。'
      ]
    },
    {
      heading: '5. 今後の見通し：2030年に向けた予測市場の進化',
      content: [
        '報道どおりPolymarketが日本での承認を目指しているように、予測市場は単なる投機プラットフォームから「オルタナティブデータ（代替情報源）」としての社会インフラへと進化を遂げつつあります。',
        '米国の選挙予測やFRBの金利決定において、予測市場の確率は学術研究や市場実務において既存の世論調査を補完・先行する指標として注目を集めてきました。日本においても、法規制の整備と歩調を合わせながら、集合知を活用した意思決定ツールとしての重要性が高まっていくと考えられます。',
        '未来レーダーでは、今後もPolymarketのリアルタイムデータ連動と日本独自の世論調査を通じて、バイアスのない透明な未来予測データを提供してまいります。'
      ]
    }
  ]
};
