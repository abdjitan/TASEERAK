-- 162: silicones, sealants, fire-stopping and leak stoppers added to the catalog (owner 2026-10-17).
-- Routing keywords, kept in sync with SUB_CATEGORIES in src/types/index.ts (the DB overrides it).
update public.taxonomy
   set keywords = (select array_agg(distinct k) from unnest(keywords || array[
     'سيليكون','silicone','مانع تسرب','sealant','ماستك','فوم بولي','مقاوم للحريق','معجون حريق','fire putty','water plug',
     'بوليمر','بولي سلفايد','بولي يوريثان','لملء الفراغات','weather seal']::text[]) k)
 where sector = 'civil' and sub_key = 'construction_chemicals';

update public.taxonomy
   set keywords = (select array_agg(distinct k) from unnest(keywords || array['مانع تسرب']::text[]) k)
 where sector = 'supply_store' and sub_key = 'store_adhesives';
