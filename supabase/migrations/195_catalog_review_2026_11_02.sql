-- 195: catalog review 2026-11-02 — the DB half of the taxonomy changes made in src/types/index.ts
-- (taxonomy dual-source: the `taxonomy` table overrides SUB_CATEGORIES on the client and feeds the
-- server classifier). Keys are never renamed; only labels, groups, keywords and is_active change.
--   1. six new specialties (playground, pressure/mains pipes, chilled-water pipes, fuel systems,
--      rebar & concrete-finishing machines, site services)
--   2. relabelled specialties (MSA wording, «بورسلين», «مفاتيح ومقابس», heavy structural sections)
--   3. regrouped specialties (GRC → facades, duct insulation → pipe & duct insulation, earthing → own group)
--   4. keywords moved with the products (so free text routes like the catalog)
--   5. specialties with no catalog product switched off — only where no supplier has picked them

-- 1. new specialties ---------------------------------------------------------------------------
insert into public.taxonomy (sector, sub_key, name_ar, name_en, name_ur, icon, grp, keywords, is_active) values
  ('civil', 'playground', 'ألعاب الأطفال والملاعب الخارجية', 'Playground Equipment', 'کھیل کے میدان کا سامان', '🛝', 'landscape',
    array['ألعاب أطفال','العاب اطفال','ألعاب حدائق','مراجيح','أرجوحة','زحليقة','playground','swing set']::text[], true),
  ('mechanical', 'pressure_pipes', 'مواسير ضغط ومياه رئيسية (نحاس/CPVC/PEX/HDPE/حديد)', 'Pressure & Mains Pipes (Copper/CPVC/PEX/HDPE/Steel)', 'پریشر اور مین پائپ', '🚰', 'plumbing',
    array['CPVC','PEX','نحاس مياه','أنابيب نحاس','HDPE','مياه رئيسية','عداد مياه','water meter','حديد مجلفن','galvanized','أنابيب GRP','uPVC ضغط','سكجول 80','pressure pipe']::text[], true),
  ('mechanical', 'chilled_water_pipes', 'أنابيب المياه المثلجة (تكييف مركزي)', 'Chilled Water Piping', 'چلڈ واٹر پائپ', '❄️', 'hvac',
    array['مياه مبردة','مياه مثلجة','chilled water','معزولة مسبقا','pre-insulated','pre insulated','تبريد المناطق','district cooling']::text[], true),
  ('mechanical', 'fuel_systems', 'خزانات وتمديدات الوقود (ديزل)', 'Fuel Tanks & Lines (Diesel)', 'فیول ٹینک اور لائنیں', '⛽', 'plumbing',
    array['وقود','fuel','خزان وقود','خزان ديزل','day tank','تصفية وقود']::text[], true),
  ('equipment', 'concrete_finishing', 'معدات التسليح وتشطيب الخرسانة', 'Rebar & Concrete Finishing Machines', 'سریا اور کنکریٹ فنشنگ مشینیں', '🛠', 'concrete_machinery',
    array['ثني حديد','قص حديد التسليح','rebar bender','rebar cutter','قص الخرسانة','concrete cutter','floor saw','تنعيم الخرسانة','هليكوبتر','power trowel']::text[], true),
  ('equipment', 'site_services', 'خدمات الموقع (دورات مياه متنقلة)', 'Site Services (Portable Toilets)', 'سائٹ سروسز (موبائل ٹوائلٹ)', '🚻', 'light_equipment',
    array['دورات مياه متنقلة','دورة مياه متنقلة','حمامات متنقلة','portable toilet']::text[], true)
on conflict (sector, sub_key) do update set
  name_ar = excluded.name_ar, name_en = excluded.name_en, name_ur = excluded.name_ur, icon = excluded.icon,
  grp = excluded.grp, keywords = excluded.keywords, is_active = true, updated_at = now();

-- 2. relabelled specialties --------------------------------------------------------------------
update public.taxonomy set name_ar = 'جسور وقطاعات إنشائية ثقيلة (HEA/HEB/IPE/UPN)', name_en = 'Heavy Structural Beams & Sections (HEA/HEB/IPE/UPN)', updated_at = now() where sector = 'civil' and sub_key = 'structural_steel';
update public.taxonomy set name_ar = 'رمل وحصى وبودرة', updated_at = now() where sector = 'civil' and sub_key = 'aggregates';
update public.taxonomy set name_ar = 'بلاط وبورسلين وسيراميك وتيرازو', updated_at = now() where sector = 'architectural' and sub_key = 'tiles';
update public.taxonomy set name_ar = 'مفاتيح ومقابس وعلب', updated_at = now() where sector = 'electrical' and sub_key = 'switches';
update public.taxonomy set name_ar = 'مفاتيح ومقابس (محلات الكهرباء)', updated_at = now() where sector = 'supply_store' and sub_key = 'store_switches';
update public.taxonomy set name_ar = 'مضخات نزح', updated_at = now() where sector = 'equipment' and sub_key = 'pumps_equip';

-- 3. regrouped specialties ---------------------------------------------------------------------
update public.taxonomy set name_ar = 'التأريض والحماية من الصواعق', name_en = 'Earthing & Lightning Protection', grp = 'earthing_grp', updated_at = now() where sector = 'electrical' and sub_key = 'earthing';
update public.taxonomy set grp = 'facade_systems', updated_at = now() where sector = 'architectural' and sub_key = 'grc_facade';
update public.taxonomy set grp = 'mech_insulation', updated_at = now() where sector = 'mechanical' and sub_key = 'duct_insulation';

-- 4. keywords follow the products ---------------------------------------------------------------
-- PPR keeps the PPR words; copper/CPVC/PEX/HDPE/steel/GRP and meters → pressure_pipes, chilled water → chilled_water_pipes
update public.taxonomy set keywords = array(select k from unnest(keywords) k where k <> all (array['CPVC','PEX','نحاس مياه','مياه مبردة','chilled water','GI','مجلفن','galvanized','GRP','فايبرجلاس','معزولة مسبقا','pre-insulated','pre insulated','HDPE','عداد مياه','water meter']::text[])), updated_at = now()
  where sector = 'mechanical' and sub_key = 'water_supply';
-- fuel → fuel_systems, septic tank → civil external drainage
update public.taxonomy set keywords = array(select k from unnest(keywords) k where k <> all (array['تصفية وقود','وحدة وقود','خزان صرف صحي']::text[])), updated_at = now()
  where sector = 'mechanical' and sub_key = 'tanks_heaters';
update public.taxonomy set keywords = (select array_agg(distinct w) from unnest(keywords || array['بيارة','خزان صرف صحي','septic']::text[]) w), updated_at = now()
  where sector = 'civil' and sub_key = 'drainage';
-- rebar / finishing machines and portable toilets have their own specialties now
update public.taxonomy set keywords = array(select k from unnest(keywords) k where k <> all (array['ماكينة قص الخرسانة والأسفلت','ماكينة تنعيم الخرسانة']::text[])), updated_at = now()
  where sector = 'equipment' and sub_key = 'concrete_equip';
update public.taxonomy set keywords = array(select k from unnest(keywords) k where k <> all (array['دورات مياه متنقلة','دورات مياه']::text[])), updated_at = now()
  where sector = 'equipment' and sub_key = 'generators_equip';
-- playground equipment left hardscape
update public.taxonomy set keywords = array(select k from unnest(keywords) k where k <> all (array['ألعاب أطفال خارجية']::text[])), updated_at = now()
  where sector = 'civil' and sub_key = 'hardscape';
-- renamed fencing products («تشين لينك», «جابيون»)
update public.taxonomy set keywords = (select array_agg(distinct w) from unnest(keywords || array['تشين لينك','جابيون']::text[]) w), updated_at = now()
  where sector = 'civil' and sub_key = 'fencing';

-- 5. specialties with no catalog product ------------------------------------------------------
-- Switched off only when no supplier has chosen them (profile_specialties); a kept one is reported, and
-- should then also be taken out of INACTIVE_SUBS in src/types/index.ts.
do $$
declare r record;
begin
  for r in
    select t.sector, t.sub_key, exists (select 1 from public.profile_specialties ps where ps.specialty = t.sub_key) as in_use
    from public.taxonomy t
    where (t.sector, t.sub_key) in (('electrical','mv_cables'), ('civil','scaffold_jacks'), ('mechanical','fire_valves'),
                                    ('mechanical','cladding_jacketing'), ('architectural','louvers'))
  loop
    if r.in_use then
      raise notice 'kept active (a supplier picked it): %.%', r.sector, r.sub_key;
    else
      update public.taxonomy set is_active = false, updated_at = now() where sector = r.sector and sub_key = r.sub_key;
    end if;
  end loop;
end $$;
