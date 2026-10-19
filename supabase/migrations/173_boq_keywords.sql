-- 173: BOQ review (owner 2026-10-19): English/Arabic keywords so BOQ lines reach the right specialty.
-- Kept in sync with SUB_CATEGORIES in src/types/index.ts (the DB overrides it at runtime).
update public.taxonomy set keywords = (select array_agg(distinct w) from unnest(keywords || array['reinforcement', 'rebar', 'deformed bar', 'steel bar']::text[]) w) where sector = 'civil' and sub_key = 'rebar';
update public.taxonomy set keywords = (select array_agg(distinct w) from unnest(keywords || array['concrete block', 'hollow block', 'blockwork', 'block']::text[]) w) where sector = 'civil' and sub_key = 'blocks';
update public.taxonomy set keywords = (select array_agg(distinct w) from unnest(keywords || array['ready mix', 'ready mixed', 'readymix', 'خرسانة مسلحة', 'خرسانة عادية']::text[]) w) where sector = 'civil' and sub_key = 'readymix';
update public.taxonomy set keywords = (select array_agg(distinct w) from unnest(keywords || array['precast', 'kerb', 'curb', 'بردورة']::text[]) w) where sector = 'civil' and sub_key = 'precast';
update public.taxonomy set keywords = (select array_agg(distinct w) from unnest(keywords || array['chemical anchor', 'anchor bolt resin', 'grout', 'curing compound', 'admixture']::text[]) w) where sector = 'civil' and sub_key = 'construction_chemicals';
