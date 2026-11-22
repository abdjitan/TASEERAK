-- 260 (UX audit UX-118): rfq_label is used in supplier notifications too, and the buyer's own project title
-- (e.g. a villa owner's name) must not reach suppliers. The label is now always built from the materials.
create or replace function public.rfq_label(r rfqs)
returns text language sql stable set search_path = public as $$
  select 'طلب رقم ' || coalesce(r.ref_no::text, '?') || ' · ' ||
    coalesce(
      case when jsonb_typeof(r.items) = 'array' and jsonb_array_length(r.items) > 0 then
        public.clean_ar_name(r.items->0->>'product_name') ||
        case when jsonb_array_length(r.items) > 1 then ' و' || (jsonb_array_length(r.items) - 1)::text || ' أخرى' else '' end
      end,
      public.clean_ar_name(nullif(btrim(r.product_name), '')),
      'طلب تسعير')
$$;
