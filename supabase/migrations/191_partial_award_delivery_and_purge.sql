-- 191 (owner approved 2026-11-01: «تمام ابدا»)
-- A. Delivery and other charges on a PARTIAL award. A supplier who priced 3 materials with a 300 SAR
--    delivery fee and won only 1 had the full 300 on the purchase order. Now, when the buyer confirms
--    a selection that gives a supplier only part of the lines they priced, that offer's extra charges
--    wait for the supplier: they confirm or lower them (never raise) for the materials they won, and
--    the buyer is told. Until then the order shows the charges as «بانتظار تأكيد المورد».
-- B. Housekeeping: a daily purge of rate-limit rows (they hold IP-based buckets) after 2 days, the
--    scheduler's run history after 14 days and read notifications after 180 days; and a one-time
--    removal of the duplicate October deal reminders (kept: the latest 3 per person, deal and kind).

alter table public.offers add column if not exists extras_pending boolean not null default false;
alter table public.offers add column if not exists extras_original jsonb;
alter table public.offers add column if not exists extras_confirmed_at timestamptz;

-- only the confirm function (app.deal_write) or an admin changes these
create or replace function public.freeze_offer_extras_flags() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('app.deal_write', true), '') = 'on' or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.extras_pending := false; new.extras_original := null; new.extras_confirmed_at := null;
  else
    new.extras_pending := old.extras_pending; new.extras_original := old.extras_original;
    new.extras_confirmed_at := old.extras_confirmed_at;
  end if;
  return new;
end $$;
drop trigger if exists zz_freeze_offer_extras_flags on public.offers;
create trigger zz_freeze_offer_extras_flags before insert or update on public.offers
  for each row execute function public.freeze_offer_extras_flags();

create or replace function public.finalize_rfq_awards(p_rfq_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_contractor uuid; v_status text; px record; v_label text;
begin
  perform set_config('app.deal_write', 'on', true);
  select contractor_id, status::text into v_contractor, v_status from rfqs where id = p_rfq_id for update;
  if v_contractor is null then raise exception 'RFQ not found'; end if;
  if v_contractor is distinct from auth.uid() then raise exception 'Not authorized'; end if;
  if v_status <> 'open' then raise exception 'الطلب غير مفتوح، فلا يمكن تأكيد الاختيار'; end if;
  if not exists (select 1 from rfq_item_awards a join offers o on o.id = a.offer_id
                 where a.rfq_id = p_rfq_id and o.status in ('pending', 'accepted')) then
    raise exception 'No awards to finalize';
  end if;
  update offers o set status = 'accepted', accepted_at = coalesce(o.accepted_at, now())
  where o.rfq_id = p_rfq_id and o.status = 'pending'
    and exists (select 1 from rfq_item_awards a where a.offer_id = o.id);
  update offers set invoice_number = 'INV-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.invoice_seq')::text, 6, '0')
  where rfq_id = p_rfq_id and status = 'accepted' and invoice_number is null;
  update offers o set status = 'rejected'
  where o.rfq_id = p_rfq_id and o.status = 'pending'
    and not exists (select 1 from rfq_item_awards a where a.offer_id = o.id);

  -- partial award + extra charges → the supplier confirms the charges for what they won
  select public.rfq_label(r) into v_label from rfqs r where r.id = p_rfq_id;
  for px in
    select x.id, x.supplier_id, x.extra_charges,
           (select count(*) from rfq_item_awards a where a.offer_id = x.id) as won,
           (select count(*) from jsonb_array_elements(case when jsonb_typeof(x.item_prices) = 'array' then x.item_prices else '[]'::jsonb end) it
             where coalesce((it->>'total')::numeric, 0) > 0) as priced
      from offers x
     where x.rfq_id = p_rfq_id and x.status = 'accepted' and not x.extras_pending and x.extras_confirmed_at is null
       and jsonb_typeof(x.extra_charges) = 'array'
       and (select coalesce(sum((e->>'amount')::numeric), 0) from jsonb_array_elements(x.extra_charges) e
             where jsonb_typeof(e->'amount') in ('number', 'string') and (e->>'amount') ~ '^[0-9.]+$') > 0
  loop
    if px.won < px.priced then
      update offers set extras_pending = true, extras_original = px.extra_charges where id = px.id;
      insert into notifications (user_id, type, title, body, data)
      values (px.supplier_id, 'offer_accepted', 'أكّد رسوم التوصيل للمواد التي فزت بها',
              'اختارك المشتري لـ' || px.won || ' من ' || px.priced || ' مواد سعّرتها في «' || coalesce(v_label, 'الطلب') || '». أكّد رسوم التوصيل والرسوم الإضافية لهذه المواد أو خفّضها.',
              jsonb_build_object('url', '/supplier/dashboard/rfq/' || p_rfq_id::text, 'rfq_id', p_rfq_id, 'offer_id', px.id, 'kind', 'extras_confirm'));
    end if;
  end loop;

  update rfqs set status = 'closed' where id = p_rfq_id and status = 'open';
end $$;

create or replace function public.confirm_partial_extras(p_offer_id uuid, p_extras jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v offers; v_old numeric; v_new numeric; v_buyer uuid; v_clean jsonb;
begin
  select * into v from offers where id = p_offer_id for update;
  if not found then raise exception 'العرض غير موجود'; end if;
  if public.acting_uid() is distinct from v.supplier_id then raise exception 'غير مصرّح'; end if;
  if v.status <> 'accepted' or not v.extras_pending then raise exception 'لا توجد رسوم بانتظار التأكيد'; end if;
  if p_extras is null or jsonb_typeof(p_extras) <> 'array' then raise exception 'صيغة الرسوم غير صحيحة'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('label', left(btrim(e->>'label'), 80), 'amount', round((e->>'amount')::numeric, 2))), '[]'::jsonb)
    into v_clean
    from jsonb_array_elements(p_extras) e
   where coalesce(btrim(e->>'label'), '') <> '' and (e->>'amount') ~ '^[0-9]+(\.[0-9]+)?$' and (e->>'amount')::numeric > 0;
  select coalesce(sum((e->>'amount')::numeric), 0) into v_old from jsonb_array_elements(coalesce(v.extras_original, '[]'::jsonb)) e
   where (e->>'amount') ~ '^[0-9]+(\.[0-9]+)?$';
  select coalesce(sum((e->>'amount')::numeric), 0) into v_new from jsonb_array_elements(v_clean) e;
  if v_new > v_old then raise exception 'لا يمكن رفع الرسوم عن عرضك الأصلي (% ر.س)', v_old; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set extra_charges = case when jsonb_array_length(v_clean) = 0 then null else v_clean end,
                    extras_pending = false, extras_confirmed_at = now()
   where id = p_offer_id returning * into v;
  select contractor_id into v_buyer from rfqs where id = v.rfq_id;
  insert into notifications (user_id, type, title, body, data)
  values (v_buyer, 'offer_accepted', 'أكّد المورد رسوم التوصيل',
          case when v_new = 0 then 'أكّد المورد أن التوصيل بلا رسوم إضافية للمواد التي اخترتها منه.'
               else 'أكّد المورد رسوماً إضافية بقيمة ' || to_char(v_new, 'FM999,999,990.##') || ' ر.س للمواد التي اخترتها منه.' end,
          jsonb_build_object('url', '/contractor/orders/' || p_offer_id::text, 'rfq_id', v.rfq_id, 'offer_id', p_offer_id));
  return jsonb_build_object('ok', true, 'amount', v_new);
end $$;
revoke all on function public.confirm_partial_extras(uuid, jsonb) from public, anon;
grant execute on function public.confirm_partial_extras(uuid, jsonb) to authenticated;

-- B. housekeeping
create or replace function public.purge_housekeeping() returns void
language plpgsql security definer set search_path = public, cron as $$
begin
  delete from public.rate_limits where window_start < now() - interval '2 days';
  delete from cron.job_run_details where end_time < now() - interval '14 days';
  delete from public.notifications where is_read and created_at < now() - interval '180 days';
end $$;
revoke all on function public.purge_housekeeping() from public, anon, authenticated;
do $$ begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'purge-housekeeping-daily';
  perform cron.schedule('purge-housekeeping-daily', '45 3 * * *', 'select public.purge_housekeeping()');
end $$;
select public.purge_housekeeping();

-- the October duplicate reminders (before the cap of 3): keep the latest 3 per person/deal/kind
delete from public.notifications n using (
  select id from (
    select id, row_number() over (partition by user_id, type, data->>'offer_id' order by created_at desc) rn
      from public.notifications where type in ('reminder_deliver', 'reminder_receipt')) x where rn > 3
) d where n.id = d.id;
