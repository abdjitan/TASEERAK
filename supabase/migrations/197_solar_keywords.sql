-- 197: the solar set (2026-11-02, 21 new products) routes to solar_pv; the DB taxonomy keeps the same
-- keywords as the TS SUB_CATEGORIES (taxonomy dual-source). Merge, keeping any admin-added words.
update public.taxonomy
   set keywords = (select array_agg(distinct w) from unnest(keywords || array[
         'شمسية','إنفرتر','انفرتر','مايكرو إنفرتر','بطاريات جل','صافي القياس','عداد ثنائي',
         'Combiner','MC4','TOPCon','Bifacial','Mono PERC','On-Grid','Off-Grid','Hybrid','carport']::text[]) w),
       updated_at = now()
 where sector = 'electrical' and sub_key = 'solar_pv';
