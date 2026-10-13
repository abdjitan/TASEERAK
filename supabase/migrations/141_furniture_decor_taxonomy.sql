-- 141: custom furniture, curtains and decorative lighting (2026-10-13). Mirrors SUB_CATEGORIES in
-- src/types/index.ts so suppliers can choose these specialties and requests route to them.
insert into taxonomy (sector, sub_key, name_ar, name_en, name_ur, icon, grp, keywords, is_active) values
 ('architectural', 'custom_furniture', 'أثاث حسب الطلب', 'Custom-Made Furniture', 'آرڈر پر فرنیچر', '🛋', 'joinery',
  array['أثاث','موبيليا','طاولة','طاولات','ترابيزة','سفرة','كنب','كنبة','أريكة','صوفا','كراسي','كرسي طعام','كرسي مكتب','سرير','تسريحة','مكتب خشب','مكتبة','دولاب','خزانة ملابس','جلسة','مجلس','حسب الطلب','furniture','table','sofa','bed','wardrobe','custom'], true),
 ('architectural', 'curtains', 'ستائر وبرادي', 'Curtains & Blinds', 'پردے', '🪟', 'joinery',
  array['ستائر','ستارة','برادي','بلاك أوت','blackout','blinds','curtain','ستائر رول','ستائر شرائح','ستائر قماش'], true),
 ('electrical', 'decor_lighting', 'إنارة ديكور وثريات', 'Decorative Lighting & Chandeliers', 'سجاوٹی روشنی', '✨', 'lighting',
  array['ثريا','ثريات','نجفة','نجف','أباجورة','أبليك','إنارة ديكور','إنارة معلقة','معلقة ديكور','إنارة أرضية','chandelier','pendant','lamp','wall light','floor lamp'], true)
on conflict do nothing;
update taxonomy set keywords = keywords || array['موكيت','زولية']
 where sub_key = 'special_floor' and not ('موكيت' = any(keywords));
