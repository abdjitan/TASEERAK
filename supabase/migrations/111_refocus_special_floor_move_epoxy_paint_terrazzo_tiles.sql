-- Owner correction: epoxy is a floor COATING (belongs under Paints), terrazzo is a TILE type
-- (belongs under Tiles). Refocus special_floor on raised access / screed / carpet — which makes
-- its existing generated image (a raised access floor) correct. Matching stays keyword-driven.
-- Mirrors the static SUB_CATEGORIES edit in src/types/index.ts (see taxonomy-dual-source).
update taxonomy set
  name_ar = 'أرضيات أكسس فلور وسكريد وسجاد',
  name_en = 'Raised Access, Screed & Carpet',
  name_ur = 'ایکسیس فلور، اسکریڈ اور قالین',
  keywords = ARRAY['سجاد','carpet','raised access','أكسس فلور','access floor','رايزد أكسس','screed','سكريد','فرشة','مطاطية','مطاط','matting','rubber']::text[]
where sector = 'architectural' and sub_key = 'special_floor';

update taxonomy set
  name_ar = 'بلاط وبورسلان وسيراميك وتيرازو',
  name_en = 'Tiles, Porcelain & Terrazzo',
  name_ur = 'ٹائلز اور ٹیرازو',
  keywords = ARRAY['بلاط','سيراميك','بورسلين','بورسلان','tile','ceramic','porcelain','موزاييك','mosaic','تيرازو','terrazzo']::text[]
where sector = 'architectural' and sub_key = 'tiles';

update taxonomy set
  name_ar = 'دهانات ودهان أرضيات إيبوكسي',
  name_en = 'Paints & Epoxy Floor Coatings',
  name_ur = 'پینٹ اور ایپوکسی فرش کوٹنگ',
  keywords = ARRAY['دهان','دهانات','paint','جوتن','jotun','الجزيرة','أكريليك','acrylic','زيتي','ورق جدران','wallpaper','إيبوكسي','epoxy','دهان أرضيات','دهان إيبوكسي','floor coating']::text[]
where sector = 'architectural' and sub_key = 'paint';
