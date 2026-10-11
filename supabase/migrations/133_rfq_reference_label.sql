-- 133: Every request is identified by its reference (owner, 2026-10-12): "RFQ-1026 · description".
-- The old auto-name "بلوك +1 أصناف أخرى" is replaced by "حزمة توريدات (مادتان)" (or the buyer's
-- own title), and every notification about a request starts with its reference.

-- Arabic count of materials, same rules as src/lib/rfqName.ts arItems()
create or replace function public.ar_items(n int) returns text language sql immutable as $$
  select case when n = 1 then 'مادة واحدة' when n = 2 then 'مادتان'
              when n between 3 and 10 then n || ' مواد' else n || ' مادة' end
$$;

-- "RFQ-1026 · description" for notifications and any server-side text
create or replace function public.rfq_label(r public.rfqs) returns text language sql stable as $$
  select 'RFQ-' || coalesce(r.ref_no::text, '?') || ' · ' || coalesce(nullif(btrim(r.title), ''), nullif(btrim(r.product_name), ''), 'طلب تسعير')
$$;

-- product_name of a multi-material request = "حزمة توريدات (N)" instead of "first +N more"
create or replace function public.normalize_rfq_name() returns trigger language plpgsql as $$
begin
  if jsonb_typeof(new.items) = 'array' and jsonb_array_length(new.items) > 1 then
    new.product_name := 'حزمة توريدات (' || public.ar_items(jsonb_array_length(new.items)) || ')';
  end if;
  return new;
end $$;
drop trigger if exists trg_normalize_rfq_name on public.rfqs;
create trigger trg_normalize_rfq_name before insert or update of items, product_name on public.rfqs
  for each row execute function public.normalize_rfq_name();

update public.rfqs set product_name = product_name
 where jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 1;

-- notifications use the reference label
do $$
declare
  f text; d text; n text;
  reps text[][] := array[
    array['public.notify_contractor_new_offer', 'select contractor_id, product_name into', 'select contractor_id, public.rfq_label(rfqs) into'],
    array['public.submit_price_reduction',      'r.quantity, r.product_name',              'r.quantity, public.rfq_label(r)'],
    array['public.respond_offer_info',          'r.contractor_id, r.product_name into',    'r.contractor_id, public.rfq_label(r) into'],
    array['public.request_price_reduction',     'o.supplier_id, r.product_name into',      'o.supplier_id, public.rfq_label(r) into'],
    array['public.request_offer_info',          'o.supplier_id, r.product_name into',      'o.supplier_id, public.rfq_label(r) into'],
    array['public.confirm_delivery',            'coalesce(title, product_name) into',      'public.rfq_label(rfqs) into'],
    array['public.notify_suppliers_new_rfq',    'v_body := coalesce(new.title, new.product_name, ''طلب تسعير جديد'');', 'v_body := public.rfq_label(new);'],
    array['public.generate_deal_reminders',     'rq.contractor_id, rq.product_name',       'rq.contractor_id, public.rfq_label(rq) as product_name']
  ];
  i int;
begin
  for i in 1 .. array_length(reps, 1) loop
    f := reps[i][1];
    select pg_get_functiondef(p.oid) into d from pg_proc p where p.oid = to_regproc(f);
    n := replace(d, reps[i][2], reps[i][3]);
    if n = d then raise exception '% : pattern not found', f; end if;
    execute n;
  end loop;
end $$;
