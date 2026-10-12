-- 135: keywords for the 20 new everyday materials (2026-10-12). Mirrors src/types/index.ts SUB_CATEGORIES.
update taxonomy set keywords = array_append(keywords, 'باب حديد')
 where sector = 'architectural' and sub_key = 'fire_doors' and not ('باب حديد' = any(keywords));
update taxonomy set keywords = keywords || array['مرآة','مراية']
 where sector = 'architectural' and sub_key = 'bath_accessories' and not ('مرآة' = any(keywords));
update taxonomy set keywords = keywords || array['إنتركم','انتركم','جرس باب']
 where sector = 'electrical' and sub_key = 'data_network' and not ('إنتركم' = any(keywords));
update taxonomy set keywords = keywords || array['عربة يد','عربانة']
 where sector = 'supply_store' and sub_key = 'store_hand_tools' and not ('عربانة' = any(keywords));
