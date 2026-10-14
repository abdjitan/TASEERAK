-- 150: home lighting (2026-10-14) — 11 materials a household asks for (ceiling light, big chandelier,

-- mirror light, desk lamp, filament bulbs, linear, under-cabinet, outdoor wall, step lights, smart bulb,

-- motion sensor): routing keywords + approved buyer words.

update taxonomy set keywords = keywords || array['إنارة سقف مودرن','إنارة مرآة وحمّام','مصباح طاولة ومكتب LED','مصباح طاولة','لمبات ديكور فيلامنت']::text[], updated_at = now() where sector = 'electrical' and sub_key = 'decor_lighting';
update taxonomy set keywords = keywords || array['إنارة مخفية خطية','إنارة تحت خزائن المطبخ']::text[], updated_at = now() where sector = 'electrical' and sub_key = 'indoor_lighting';
update taxonomy set keywords = keywords || array['إنارة جدارية خارجية','إنارة درج وأرضيات']::text[], updated_at = now() where sector = 'electrical' and sub_key = 'outdoor_lighting';
update taxonomy set keywords = keywords || array['حساس حركة للإنارة','حساس حركة']::text[], updated_at = now() where sector = 'electrical' and sub_key = 'smart_home';

insert into learned_synonyms (term_norm, product_name, sector, users, status, source) values
 ('بلافونيير', 'إنارة سقف مودرن (بلافونيير)', 'electrical', 0, 'approved', 'seed'),
 ('اناره سقف', 'إنارة سقف مودرن (بلافونيير)', 'electrical', 0, 'approved', 'seed'),
 ('ضو سقف', 'إنارة سقف مودرن (بلافونيير)', 'electrical', 0, 'approved', 'seed'),
 ('لمبه سقف', 'إنارة سقف مودرن (بلافونيير)', 'electrical', 0, 'approved', 'seed'),
 ('ceiling light', 'إنارة سقف مودرن (بلافونيير)', 'electrical', 0, 'approved', 'seed'),
 ('ثريا كبيره', 'ثريا كريستال كبيرة للدرج والصالات', 'electrical', 0, 'approved', 'seed'),
 ('ثريا درج', 'ثريا كريستال كبيرة للدرج والصالات', 'electrical', 0, 'approved', 'seed'),
 ('نجفه كبيره', 'ثريا كريستال كبيرة للدرج والصالات', 'electrical', 0, 'approved', 'seed'),
 ('ثريا كريستال', 'ثريا كريستال كبيرة للدرج والصالات', 'electrical', 0, 'approved', 'seed'),
 ('crystal chandelier', 'ثريا كريستال كبيرة للدرج والصالات', 'electrical', 0, 'approved', 'seed'),
 ('اناره مراه', 'إنارة مرآة وحمّام', 'electrical', 0, 'approved', 'seed'),
 ('ضو مرايه', 'إنارة مرآة وحمّام', 'electrical', 0, 'approved', 'seed'),
 ('اناره حمام', 'إنارة مرآة وحمّام', 'electrical', 0, 'approved', 'seed'),
 ('mirror light', 'إنارة مرآة وحمّام', 'electrical', 0, 'approved', 'seed'),
 ('مصباح مكتب', 'مصباح طاولة ومكتب LED', 'electrical', 0, 'approved', 'seed'),
 ('لمبه مكتب', 'مصباح طاولة ومكتب LED', 'electrical', 0, 'approved', 'seed'),
 ('مصباح طاوله', 'مصباح طاولة ومكتب LED', 'electrical', 0, 'approved', 'seed'),
 ('desk lamp', 'مصباح طاولة ومكتب LED', 'electrical', 0, 'approved', 'seed'),
 ('فيلامنت', 'لمبات ديكور فيلامنت (إديسون)', 'electrical', 0, 'approved', 'seed'),
 ('لمبه اديسون', 'لمبات ديكور فيلامنت (إديسون)', 'electrical', 0, 'approved', 'seed'),
 ('لمبه ديكور', 'لمبات ديكور فيلامنت (إديسون)', 'electrical', 0, 'approved', 'seed'),
 ('filament bulb', 'لمبات ديكور فيلامنت (إديسون)', 'electrical', 0, 'approved', 'seed'),
 ('لينير', 'إنارة مخفية خطية (لينير)', 'electrical', 0, 'approved', 'seed'),
 ('اناره مخفيه', 'إنارة مخفية خطية (لينير)', 'electrical', 0, 'approved', 'seed'),
 ('اضاه خطيه', 'إنارة مخفية خطية (لينير)', 'electrical', 0, 'approved', 'seed'),
 ('linear light', 'إنارة مخفية خطية (لينير)', 'electrical', 0, 'approved', 'seed'),
 ('اناره مطبخ', 'إنارة تحت خزائن المطبخ', 'electrical', 0, 'approved', 'seed'),
 ('ضو مطبخ', 'إنارة تحت خزائن المطبخ', 'electrical', 0, 'approved', 'seed'),
 ('اناره تحت الخزاين', 'إنارة تحت خزائن المطبخ', 'electrical', 0, 'approved', 'seed'),
 ('under cabinet light', 'إنارة تحت خزائن المطبخ', 'electrical', 0, 'approved', 'seed'),
 ('اناره جدار خارجي', 'إنارة جدارية خارجية', 'electrical', 0, 'approved', 'seed'),
 ('ابليك خارجي', 'إنارة جدارية خارجية', 'electrical', 0, 'approved', 'seed'),
 ('ضو سور', 'إنارة جدارية خارجية', 'electrical', 0, 'approved', 'seed'),
 ('outdoor wall light', 'إنارة جدارية خارجية', 'electrical', 0, 'approved', 'seed'),
 ('ستيب لايت', 'إنارة درج وأرضيات (ستيب لايت)', 'electrical', 0, 'approved', 'seed'),
 ('اناره درج', 'إنارة درج وأرضيات (ستيب لايت)', 'electrical', 0, 'approved', 'seed'),
 ('اناره ارضيه مدفونه', 'إنارة درج وأرضيات (ستيب لايت)', 'electrical', 0, 'approved', 'seed'),
 ('step light', 'إنارة درج وأرضيات (ستيب لايت)', 'electrical', 0, 'approved', 'seed'),
 ('لمبه ذكيه', 'لمبة ذكية (واي فاي)', 'electrical', 0, 'approved', 'seed'),
 ('لمبه واي فاي', 'لمبة ذكية (واي فاي)', 'electrical', 0, 'approved', 'seed'),
 ('لمبه ريموت', 'لمبة ذكية (واي فاي)', 'electrical', 0, 'approved', 'seed'),
 ('smart bulb', 'لمبة ذكية (واي فاي)', 'electrical', 0, 'approved', 'seed'),
 ('حساس حركه', 'حساس حركة للإنارة', 'electrical', 0, 'approved', 'seed'),
 ('حساس اناره', 'حساس حركة للإنارة', 'electrical', 0, 'approved', 'seed'),
 ('motion sensor', 'حساس حركة للإنارة', 'electrical', 0, 'approved', 'seed'),
 ('ثريا', 'ثريا (نجفة)', 'electrical', 0, 'approved', 'seed'),
 ('ثريات', 'ثريا (نجفة)', 'electrical', 0, 'approved', 'seed'),
 ('نجف', 'ثريا (نجفة)', 'electrical', 0, 'approved', 'seed'),
 ('سبوت سقف', 'كشاف LED Downlight', 'electrical', 0, 'approved', 'seed'),
 ('سبوتات', 'كشاف LED Downlight', 'electrical', 0, 'approved', 'seed')
on conflict (term_norm, product_name) do nothing;
