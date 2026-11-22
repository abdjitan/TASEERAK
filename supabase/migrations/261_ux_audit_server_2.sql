-- 261: UX audit server follow-ups (2026-11-23).

-- UX-121: a company team member could read the company's saved prices but not save them.
drop policy if exists "Suppliers manage own live_prices" on public.live_prices;
create policy "Suppliers manage own live_prices" on public.live_prices for all
  using (supplier_id = (select auth.uid()) or supplier_id = (select public.acting_uid()))
  with check (supplier_id = (select auth.uid()) or supplier_id = (select public.acting_uid()));

-- UX-126: a team member pricing for the company was not recognised as the accepted supplier, and a home
-- buyer with no company name showed an empty name. acting_uid() + the person's name as a fallback.
create or replace function public.get_rfq_contractor(p_rfq_id uuid)
returns table(company_name_ar text, company_name_en text, city text, region text, revealed boolean)
language plpgsql security definer set search_path = public as $$
declare v_contractor uuid; v_hide boolean; v_reveal boolean;
begin
  select r.contractor_id, coalesce(r.hide_identity, true) into v_contractor, v_hide from rfqs r where r.id = p_rfq_id;
  if v_contractor is null then return; end if;
  v_reveal := (
    auth.uid() = v_contractor
    or is_admin()
    or exists (select 1 from offers o where o.rfq_id = p_rfq_id and o.supplier_id = public.acting_uid() and o.status = 'accepted')
    or not v_hide
  );
  return query
    select case when v_reveal then coalesce(nullif(btrim(p.company_name_ar), ''), nullif(btrim(p.full_name), '')) end,
           case when v_reveal then p.company_name_en end,
           p.city, p.region, v_reveal
    from profiles p where p.id = v_contractor;
end $$;

-- UX-194: tell the buyer, once, 12 hours before an offer's price stops being guaranteed on an open request.
alter table public.offers add column if not exists expiry_notified_at timestamptz;

create or replace function public.notify_price_expiring()
returns integer language plpgsql security definer set search_path = public as $$
declare o record; n int := 0;
begin
  for o in
    select of.id, of.rfq_id, of.price_valid_until, r.contractor_id, r
    from offers of join rfqs r on r.id = of.rfq_id
    where of.status = 'pending' and r.status = 'open'
      and of.price_valid_until is not null
      and of.price_valid_until > now() and of.price_valid_until <= now() + interval '12 hours'
      and of.expiry_notified_at is null
    limit 300
  loop
    begin
      insert into notifications (user_id, type, title, body, data)
      values (o.contractor_id, 'price_expiring', 'سعر أحد العروض ينتهي قريباً',
        'ينتهي التزام المورد بسعر عرضه على «' || public.rfq_label(o.r) || '» خلال ساعات. اختر قبل أن يتغيّر السعر.',
        jsonb_build_object('url', '/contractor/rfq/' || o.rfq_id::text, 'rfq_id', o.rfq_id, 'offer_id', o.id));
    exception when others then null;
    end;
    update offers set expiry_notified_at = now() where id = o.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.notify_price_expiring() from public, anon, authenticated;

do $$ begin
  perform cron.unschedule('notify-price-expiring') where exists (select 1 from cron.job where jobname = 'notify-price-expiring');
  perform cron.schedule('notify-price-expiring', '17 * * * *', 'select public.notify_price_expiring()');
exception when others then raise notice 'cron not scheduled: %', sqlerrm;
end $$;
