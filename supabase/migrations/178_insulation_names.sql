-- 178: «العزل» only (owner 2026-10-31): the waterproofing specialty is «العزل المائي», not «عزل الأساسات»;
-- the thermal one is «العزل الحراري». Names only — keys, keywords and routing are unchanged.
update public.taxonomy set name_ar = 'العزل المائي', name_en = 'Waterproofing', updated_at = now() where sub_key = 'waterproofing';
update public.taxonomy set name_ar = 'العزل الحراري', name_en = 'Thermal Insulation', updated_at = now() where sub_key = 'thermal_insulation';
