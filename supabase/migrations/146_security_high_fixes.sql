-- 146 (security audit H3/H4/H5, 2026-10-13)
--
-- H3: delete_rfq wiped accepted deals, awards, invoices and disputes. A request that has a deal
--     (an accepted offer or an awarded item) can no longer be deleted.
-- H4: get_market_prices / get_market_price_trend averaged every non-rejected offer, including
--     pending bids on open requests, with count >= 1 → a supplier could read a rival's live bid.
--     They now use accepted offers only and need at least 3 samples per product.
-- H5: a single (un-finalized) item award already counted as a deal: it unlocked the full profile
--     (phone) and unmasked messaging, so a buyer could award → read phone → unaward for every
--     bidder. Contact now opens only on an accepted (finalized) offer, and award/unaward are
--     blocked once the request is no longer open or any offer on it is accepted.

-- ── H3 ───────────────────────────────────────────────────────────────────────────────────
create or replace function public.delete_rfq(p_rfq_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_owner uuid;
begin
  select contractor_id into v_owner from rfqs where id = p_rfq_id;
  if v_owner is null then raise exception 'RFQ not found'; end if;
  if auth.uid() is distinct from v_owner then raise exception 'Not authorized'; end if;
  if exists (select 1 from offers where rfq_id = p_rfq_id and status = 'accepted')
     or exists (select 1 from rfq_item_awards where rfq_id = p_rfq_id) then
    raise exception 'لا يمكن حذف طلب يتضمّن صفقة (عرض معتمد أو مادة مُرسّاة).';
  end if;
  delete from offers where rfq_id = p_rfq_id;
  delete from rfqs where id = p_rfq_id; -- conversations/messages cascade
end $$;
revoke execute on function public.delete_rfq(uuid) from public, anon;
grant execute on function public.delete_rfq(uuid) to authenticated;

-- ── H4 ───────────────────────────────────────────────────────────────────────────────────
create or replace function public.get_market_prices()
returns table(product_name text, sector text, unit text, avg_price numeric, min_price numeric, max_price numeric, offer_count bigint)
language sql stable security definer set search_path = public
as $$
  with single as (
    select r.product_name, r.sector::text as sector, r.unit as unit, o.unit_price as unit_price
    from offers o join rfqs r on r.id = o.rfq_id
    where o.status = 'accepted' and o.unit_price is not null and o.unit_price > 0
  ),
  multi as (
    select it->>'product_name' as product_name,
           coalesce(it->>'sector', r.sector::text) as sector,
           it->>'unit' as unit,
           (it->>'unit_price')::numeric as unit_price
    from offers o join rfqs r on r.id = o.rfq_id
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(o.item_prices) = 'array' then o.item_prices else '[]'::jsonb end
    ) as it
    where o.status = 'accepted'
      and jsonb_typeof(it->'unit_price') = 'number'
      and (it->>'unit_price')::numeric > 0
  ),
  combined as (select * from single union all select * from multi)
  select product_name, sector, max(unit) as unit,
         round(avg(unit_price)) as avg_price,
         min(unit_price) as min_price,
         max(unit_price) as max_price,
         count(*) as offer_count
  from combined
  where product_name is not null
  group by product_name, sector
  having count(*) >= 3;
$$;

create or replace function public.get_market_price_trend()
returns table(product_name text, sector text, unit text, recent_avg numeric, prev_avg numeric, recent_count bigint)
language sql stable security definer set search_path = public
as $$
  with single as (
    select r.product_name, r.sector::text as sector, r.unit as unit,
           o.unit_price as unit_price, coalesce(o.accepted_at, o.created_at) as created_at
    from offers o join rfqs r on r.id = o.rfq_id
    where o.status = 'accepted' and o.unit_price is not null and o.unit_price > 0
  ),
  multi as (
    select it->>'product_name' as product_name,
           coalesce(it->>'sector', r.sector::text) as sector,
           it->>'unit' as unit,
           (it->>'unit_price')::numeric as unit_price,
           coalesce(o.accepted_at, o.created_at) as created_at
    from offers o join rfqs r on r.id = o.rfq_id
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(o.item_prices) = 'array' then o.item_prices else '[]'::jsonb end
    ) as it
    where o.status = 'accepted'
      and jsonb_typeof(it->'unit_price') = 'number'
      and (it->>'unit_price')::numeric > 0
  ),
  combined as (select * from single union all select * from multi)
  select product_name, sector, max(unit) as unit,
         round(avg(unit_price) filter (where created_at >= now() - interval '30 days')) as recent_avg,
         round(avg(unit_price) filter (where created_at >= now() - interval '60 days'
                                         and created_at <  now() - interval '30 days')) as prev_avg,
         count(*) filter (where created_at >= now() - interval '30 days') as recent_count
  from combined
  where product_name is not null
  group by product_name, sector
  having count(*) filter (where created_at >= now() - interval '30 days') >= 3;
$$;

revoke execute on function public.get_market_prices() from public, anon;
revoke execute on function public.get_market_price_trend() from public, anon;
grant execute on function public.get_market_prices() to authenticated;
grant execute on function public.get_market_price_trend() to authenticated;

-- ── H5: contact opens only on an accepted offer ──────────────────────────────────────────
create or replace function public.shares_deal_with(p_other uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(
    select 1 from offers o join rfqs r on r.id = o.rfq_id
    where o.status = 'accepted' and (
      (o.supplier_id = p_other and r.contractor_id = auth.uid()) or
      (o.supplier_id = auth.uid() and r.contractor_id = p_other))
  )
$$;

create or replace function public.enforce_message_limits()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_c record; v_awarded boolean; v_count int;
begin
  select rfq_id, supplier_id, contractor_id into v_c from conversations where id = new.conversation_id;
  if v_c.rfq_id is null then return new; end if; -- not a deal conversation → no limits
  v_awarded := exists (select 1 from offers o where o.rfq_id = v_c.rfq_id and o.supplier_id = v_c.supplier_id and o.status = 'accepted');
  if not v_awarded then
    select count(*) into v_count from messages where conversation_id = new.conversation_id;
    if v_count >= 20 then
      raise exception 'بلغت الحد الأقصى للرسائل قبل الترسية (٢٠ رسالة). يكتمل التواصل بعد إتمام الصفقة.';
    end if;
    new.body := public.mask_contact_digits(new.body);
    if new.content is not null then new.content := public.mask_contact_digits(new.content); end if;
  end if;
  return new;
end $$;

create or replace function public.send_message(p_conversation_id uuid, p_body text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_c record; v_other uuid; v_id uuid; v_sender_name text; v_awarded boolean; v_count int;
begin
  select * into v_c from conversations where id = p_conversation_id;
  if v_c.id is null then raise exception 'Conversation not found'; end if;
  if auth.uid() <> v_c.contractor_id and auth.uid() <> v_c.supplier_id then raise exception 'Not authorized'; end if;
  if coalesce(btrim(p_body),'') = '' then raise exception 'Empty message'; end if;
  v_awarded := exists (
    select 1 from offers o where o.rfq_id = v_c.rfq_id and o.supplier_id = v_c.supplier_id and o.status = 'accepted'
  );
  if not v_awarded then
    select count(*) into v_count from messages where conversation_id = p_conversation_id;
    if v_count >= 20 then
      raise exception 'بلغت الحد الأقصى للرسائل قبل الترسية (٢٠ رسالة). يكتمل التواصل بعد إتمام الصفقة (الترسية).';
    end if;
    p_body := public.mask_contact_digits(p_body);
  end if;
  insert into messages (conversation_id, sender_id, body) values (p_conversation_id, auth.uid(), btrim(p_body)) returning id into v_id;
  update conversations set last_message = left(btrim(p_body), 140), last_message_at = now() where id = p_conversation_id;
  v_other := case when auth.uid() = v_c.contractor_id then v_c.supplier_id else v_c.contractor_id end;
  if auth.uid() = v_c.contractor_id and not v_awarded then
    v_sender_name := 'مشترٍ';
  else
    select coalesce(nullif(btrim(company_name_ar), ''), 'مستخدم') into v_sender_name from profiles where id = auth.uid();
  end if;
  insert into notifications (user_id, type, title, body, data)
  values (v_other, 'new_message', 'رسالة جديدة من ' || v_sender_name, left(btrim(p_body), 80),
          jsonb_build_object('url', '/messages?c=' || p_conversation_id::text, 'conversation_id', p_conversation_id));
  return v_id;
end $$;

-- ── H5: award / unaward only while the request is open and nothing is accepted yet ───────
create or replace function public.award_rfq_item(p_rfq_id uuid, p_item_index integer, p_offer_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_contractor uuid;
  v_status text;
  v_pname text;
  v_entry jsonb;
  v_supplier uuid;
begin
  select contractor_id, status::text, (items -> p_item_index ->> 'product_name')
    into v_contractor, v_status, v_pname
  from rfqs where id = p_rfq_id;
  if v_contractor is null then raise exception 'RFQ not found'; end if;
  if v_contractor is distinct from auth.uid() then raise exception 'Not authorized'; end if;
  if v_status <> 'open' or exists (select 1 from offers where rfq_id = p_rfq_id and status = 'accepted') then
    raise exception 'لا يمكن تعديل الترسية بعد اعتماد الصفقة أو إغلاق الطلب.';
  end if;
  if v_pname is null then raise exception 'Item not found'; end if;

  -- 1) exact item_index match (offers submitted after this fix carry item_index)
  select o.supplier_id, ip into v_supplier, v_entry
  from offers o
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(o.item_prices) = 'array' then o.item_prices else '[]'::jsonb end
  ) ip
  where o.id = p_offer_id and o.rfq_id = p_rfq_id and o.status <> 'rejected'
    and (ip->>'item_index')::int = p_item_index
  limit 1;

  -- 2) fallback to product_name for legacy offers without item_index
  if v_entry is null then
    select o.supplier_id, ip into v_supplier, v_entry
    from offers o
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(o.item_prices) = 'array' then o.item_prices else '[]'::jsonb end
    ) ip
    where o.id = p_offer_id and o.rfq_id = p_rfq_id and o.status <> 'rejected'
      and ip->>'product_name' = v_pname
    limit 1;
  end if;

  if v_entry is null then raise exception 'Offer does not price this item'; end if;

  insert into rfq_item_awards (rfq_id, item_index, item_key, offer_id, supplier_id, unit_price, total, quantity, unit)
  values (p_rfq_id, p_item_index, v_pname, p_offer_id, v_supplier,
          nullif(v_entry->>'unit_price','')::numeric,
          coalesce(nullif(v_entry->>'total','')::numeric, 0),
          nullif(v_entry->>'quantity','')::numeric,
          v_entry->>'unit')
  on conflict (rfq_id, item_index)
  do update set offer_id = excluded.offer_id, supplier_id = excluded.supplier_id,
                unit_price = excluded.unit_price, total = excluded.total,
                quantity = excluded.quantity, unit = excluded.unit, awarded_at = now();
end $$;

create or replace function public.unaward_rfq_item(p_rfq_id uuid, p_item_index integer)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_contractor uuid; v_status text;
begin
  select contractor_id, status::text into v_contractor, v_status from rfqs where id = p_rfq_id;
  if v_contractor is null then raise exception 'RFQ not found'; end if;
  if v_contractor is distinct from auth.uid() then raise exception 'Not authorized'; end if;
  if v_status <> 'open' or exists (select 1 from offers where rfq_id = p_rfq_id and status = 'accepted') then
    raise exception 'لا يمكن تعديل الترسية بعد اعتماد الصفقة أو إغلاق الطلب.';
  end if;
  delete from rfq_item_awards where rfq_id = p_rfq_id and item_index = p_item_index;
end $$;

revoke execute on function public.award_rfq_item(uuid, integer, uuid) from public, anon;
revoke execute on function public.unaward_rfq_item(uuid, integer) from public, anon;
grant execute on function public.award_rfq_item(uuid, integer, uuid) to authenticated;
grant execute on function public.unaward_rfq_item(uuid, integer) to authenticated;
