-- 168: specialties that had the same name for different supplier types now say who they're for
-- (owner 2026-10-19). Keys are unchanged, so routing and supplier specialties are unchanged.
update public.taxonomy set name_ar = 'مغاسل ومراحيض وأطقم حمامات', name_en = 'Basins, WCs & bathroom sets' where sector = 'architectural' and sub_key = 'sanitary_ware';
update public.taxonomy set name_ar = 'خلاطات وصنابير (محلات السباكة)', name_en = 'Faucets & mixers (plumbing shops)' where sector = 'supply_store' and sub_key = 'store_faucets';
update public.taxonomy set name_ar = 'محابس ووصلات (محلات السباكة)', name_en = 'Valves & fittings (plumbing shops)' where sector = 'supply_store' and sub_key = 'store_valves';
update public.taxonomy set name_ar = 'مفاتيح وأفياش (محلات الكهرباء)', name_en = 'Switches & sockets (electrical shops)' where sector = 'supply_store' and sub_key = 'store_switches';
