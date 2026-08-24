-- 絞り込み（Phase 2-A・2026-08-25）: ユーザーが Supabase SQL Editor で実行する
-- is_active＝まだ走っているか ／ is_listed＝サイトに出すか。決着していない銘柄を
-- is_active=false で隠すと「決着・終了」と表示され事実に反するため、列を分ける。

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_listed boolean NOT NULL DEFAULT true;

-- 外す 48件（詳細は docs/shiborikomi-teian-2026-08-25.md）
UPDATE public.events SET is_listed = false WHERE id IN (
  'official-1787044205330',
  'council-1787397349393',
  'official-1787044209435',
  'council-1787522817851',
  'council-1787393726091',
  'council-1787522817751',
  'official-1787046120279',
  'council-1787393725990',
  'council-1787443855386',
  'council-1787443855285',
  'council-1787443855185',
  'council-1787522817952',
  'council-1787393726191',
  'council-1787397349593',
  'council-1787443855084',
  'council-1787397349493',
  'council-1787393726391',
  'council-1787397349291',
  '4',
  '7',
  '8',
  '2',
  '5',
  '3',
  '6',
  '1',
  '30829',
  '202857',
  '890582',
  '48361',
  '31552',
  '79987',
  '871219',
  '149589',
  '81557',
  '659671',
  '659518',
  '712295',
  '139236',
  '204972',
  '31875',
  '45915',
  '851800',
  '455875',
  '899525',
  '624242',
  '101936',
  '281145'
);

-- 検算：残りの掲載数が 20 になっていること
SELECT is_listed, count(*) FROM public.events WHERE is_active = true GROUP BY is_listed;
