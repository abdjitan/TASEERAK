-- 296: fixings catalog (fischer / Hilti range review, 2026-11-27) — the DB half of the taxonomy
-- changes in src/types/index.ts (taxonomy dual-source: this table overrides SUB_CATEGORIES on the
-- client and feeds the server classifier). Keys are never renamed.
--   1. four new specialties: store_anchors (supply_store), chemical_anchors + firestop (civil),
--      pipe_supports (mechanical). Their catalog products moved out of store_fasteners,
--      construction_chemicals and valves_fittings (and three anchor accessories out of
--      store_hand_tools / store_consumables).
--   2. keywords moved with the products; valves_fittings relabelled «محابس ووصلات» (supports left);
--      store_elec_access keyword «فيش» narrowed (it is a substring of «فيشر», the trade name of a
--      plastic wall plug, so «فيشر 8 ملم» went to electrical accessories).
--   3. suppliers keep receiving what they received before: whoever covers the old specialty also
--      gets the new one (store_fasteners → store_anchors, construction_chemicals → chemical_anchors
--      and firestop, valves_fittings → pipe_supports). They can untick it in their specialties.

-- 1. new specialties ---------------------------------------------------------------------------
insert into public.taxonomy (sector, sub_key, name_ar, name_en, name_ur, icon, grp, keywords, is_active) values
  ('supply_store', 'store_anchors', 'أنكرات وخوابير التثبيت', 'Anchors & Wall Plugs', 'اینکر اور وال پلگ', '🔩', 'store_fasteners',
    array['أنكر','أنكرات','anchor','خابور','خوابير','فيشر','رول بلت','برغي تمدد','برغي خرسانة','concrete screw','wall plug','توجل','toggle','مولي','molly','دروب إن','drop-in','wedge','sleeve anchor','undercut','تجويف سفلي','أنكر كيميائي','قضيب أنكر','مسدس حقن','فوهة خلط','frame fixing']::text[], true),
  ('civil', 'chemical_anchors', 'التثبيت الكيميائي (مونة حقن وكبسولات)', 'Chemical Anchoring (Injection Mortars & Capsules)', 'کیمیکل اینکرنگ (انجیکشن مارٹر اور کیپسول)', '🧪', 'infrastructure',
    array['مثبت كيميائي','تثبيت كيميائي','أنكر كيميائي','كيميكال أنكر','chemical anchor','anchor bolt resin','resin anchor','injection mortar','مونة حقن','كبسولة أنكر','كبسولات تثبيت','capsule anchor','جلبة شبكية','sieve sleeve','أشاير','rebar doweling']::text[], true),
  ('civil', 'firestop', 'منتجات منع انتشار الحريق (فايرستوب)', 'Firestop Products', 'فائر اسٹاپ مصنوعات', '🔥', 'infrastructure',
    array['فايرستوب','فاير ستوب','firestop','fire stop','منع انتشار الحريق','حريق','مقاوم للحريق','سيليكون مقاوم للحريق','أكريليك مقاوم للحريق','فوم مقاوم للحريق','طوق حريق','fire collar','شريط حريق','لوح حريق','مونة حريق','وسائد حريق','سدادات حريق','جلبة حريق','رذاذ حريق','معجون حريق','fire putty','عازل للحريق','حاجز حريق','fire barrier','intumescent sealant','fire rated sealant']::text[], true),
  ('mechanical', 'pipe_supports', 'أنظمة التثبيت والدعامات (سترت وعلاقات مواسير)', 'Support Systems (Strut, Pipe Clamps & Hangers)', 'سپورٹ سسٹمز (اسٹرٹ، پائپ کلیمپ اور ہینگر)', '🔧', 'plumbing_supplies',
    array['سترت','strut','يونيسترت','unistrut','قناة تثبيت','قناة التثبيت','علاقة مواسير','علاقة','كلامب','clamp','كلفيس','clevis','حوامل','حامل','تعليقات','pipe support','hanger','دعامات','كابولي','cantilever','يو بولت','u-bolt','حذاء مواسير','pipe shoe','علاقة سلك','wire suspension','صامولة زنبركية','spring nut']::text[], true)
on conflict (sector, sub_key) do update set
  name_ar = excluded.name_ar, name_en = excluded.name_en, name_ur = excluded.name_ur, icon = excluded.icon,
  grp = excluded.grp, keywords = excluded.keywords, is_active = true, updated_at = now();

-- 2. keywords moved with the products ----------------------------------------------------------
update public.taxonomy set keywords = array(
    select k from unnest(coalesce(keywords, '{}'::text[]) || array['قضيب ملولب','threaded rod','وردة','washer','ذاتي الحفر','self-drilling','بارود','طلقات']::text[]) with ordinality as t(k, o)
    where k <> all(array['رول بلت','خابور','خوابير','anchor','فيشر']::text[]) group by k order by min(o)
  ), updated_at = now() where sector = 'supply_store' and sub_key = 'store_fasteners';
update public.taxonomy set keywords = array(
    select k from unnest(coalesce(keywords, '{}'::text[]) || array['دهان منتفخ','fireproofing']::text[]) with ordinality as t(k, o)
    where k <> all(array['مثبت كيميائي','معجون حريق','fire putty','chemical anchor','anchor bolt resin']::text[]) group by k order by min(o)
  ), updated_at = now() where sector = 'civil' and sub_key = 'construction_chemicals';
update public.taxonomy set keywords = array(
    select k from unnest(coalesce(keywords, '{}'::text[]) || array[]::text[]) with ordinality as t(k, o)
    where k <> all(array['حوامل','تعليقات','pipe support','hanger']::text[]) group by k order by min(o)
  ), updated_at = now() where sector = 'mechanical' and sub_key = 'valves_fittings';
update public.taxonomy set keywords = array(
    select k from unnest(coalesce(keywords, '{}'::text[]) || array['فيش كهرباء','فيشة']::text[]) with ordinality as t(k, o)
    where k <> all(array['فيش']::text[]) group by k order by min(o)
  ), updated_at = now() where sector = 'supply_store' and sub_key = 'store_elec_access';
update public.taxonomy set name_ar = 'محابس ووصلات', name_en = 'Valves & Fittings', updated_at = now()
  where sector = 'mechanical' and sub_key = 'valves_fittings';

-- 3. suppliers keep their reach ----------------------------------------------------------------
insert into public.profile_specialties (profile_id, specialty)
  select distinct ps.profile_id, 'store_anchors' from public.profile_specialties ps
  where ps.specialty = 'store_fasteners'
    and not exists (select 1 from public.profile_specialties x where x.profile_id = ps.profile_id and x.specialty = 'store_anchors');
insert into public.profile_specialties (profile_id, specialty)
  select distinct ps.profile_id, 'chemical_anchors' from public.profile_specialties ps
  where ps.specialty = 'construction_chemicals'
    and not exists (select 1 from public.profile_specialties x where x.profile_id = ps.profile_id and x.specialty = 'chemical_anchors');
insert into public.profile_specialties (profile_id, specialty)
  select distinct ps.profile_id, 'firestop' from public.profile_specialties ps
  where ps.specialty = 'construction_chemicals'
    and not exists (select 1 from public.profile_specialties x where x.profile_id = ps.profile_id and x.specialty = 'firestop');
insert into public.profile_specialties (profile_id, specialty)
  select distinct ps.profile_id, 'pipe_supports' from public.profile_specialties ps
  where ps.specialty = 'valves_fittings'
    and not exists (select 1 from public.profile_specialties x where x.profile_id = ps.profile_id and x.specialty = 'pipe_supports');
