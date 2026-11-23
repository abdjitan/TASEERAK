-- 265 (round-2 UX audit 2026-11-23, server items). APPLY 265a_types.sql FIRST (adds 'rfq_changed').
-- UX-027  a team member got two copies of every new request (direct + company fan-out)
-- UX-028  «تم تخفيض السعر» had no link and a raw pre-VAT amount (+ backfill of old notices)
-- UX-032  «طلب بلا مورد مطابق» opened the verification tab
-- UX-033  decline_price_reduction(): «لا أستطيع التخفيض» closes the request and tells the buyer
-- UX-094  my_offer_outcome(): why an offer lost (price | delivery | other), never numbers
-- UX-100  my_active_deal_count(): warn before deleting an account with open deals
-- UX-117  ban / unban notices; the suspension message no longer says «مؤقتاً»
-- UX-120  deal notices: buyer-facing VAT-inclusive formatted amounts, deal-page links, request names,
--         dispute resolution typed as a dispute and linked to the deal, no «مستخدم» sender name
-- UX-121  suppliers told when a request expires; deadline extension reaches every recipient with an Arabic
--         Riyadh date and re-arms the deadline notice; an edited request is 'rfq_changed', not a rejection
-- UX-124  team members receive reduction / info requests
-- UX-127  dispute alert opens the disputes tab; dispute resolution text is required;
--         admin_reject_material_request() rejects a suggested material with a reason and tells the seller
-- Every notification insert touched here is wrapped: a failure goes to system_errors_log, never breaks the action.

-- ───────────────────────────── helpers ─────────────────────────────
-- the buyer-facing basis (same rule as offerComparable on the client and notify_deadline_passed)
create or replace function public.offer_vat_factor(p_vat_status text, p_vat_included boolean)
returns numeric language sql immutable as $$
  select case when p_vat_status = 'not_registered' or coalesce(p_vat_included, false) then 1::numeric else 1.15 end
$$;

create or replace function public.offer_buyer_total(o public.offers)
returns numeric language sql stable as $$
  select o.total_price * public.offer_vat_factor(o.vat_status, o.vat_included)
$$;

create or replace function public.fmt_sar(p numeric)
returns text language sql immutable as $$
  select case when p is null then null else to_char(round(p), 'FM999,999,990') || ' ريال' end
$$;

-- «الأحد 23 نوفمبر 2026، الساعة 9:30 م» in Riyadh time
create or replace function public.fmt_riyadh_ar(p timestamptz)
returns text language sql stable as $$
  select case when p is null then null else
    (array['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'])[extract(dow from l)::int + 1]
    || ' ' || extract(day from l)::int
    || ' ' || (array['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'])[extract(month from l)::int]
    || ' ' || extract(year from l)::int
    || '، الساعة ' || (case when extract(hour from l)::int % 12 = 0 then 12 else extract(hour from l)::int % 12 end)
    || ':' || to_char(l, 'MI') || ' ' || case when extract(hour from l)::int < 12 then 'ص' else 'م' end
  end
  from (select p at time zone 'Asia/Riyadh' as l) x
$$;

-- ───────────────────── UX-027 / UX-124: company fan-out ─────────────────────
create or replace function public.fanout_company_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.data->>'team_copy', '') <> '' then return new; end if;
  -- members already get their own new-request notice from notify_suppliers_for_rfq (UX-027)
  if new.type::text = 'new_rfq' then return new; end if;
  -- chat stays with the owner, but reduction / info requests are work for the whole team (UX-124)
  if new.type::text ilike '%message%'
     and coalesce(new.data->>'kind', '') not in ('reduction_request', 'info_request') then
    return new;
  end if;
  begin
    insert into notifications (user_id, type, title, body, data)
    select m.user_id, new.type, new.title, new.body, coalesce(new.data, '{}'::jsonb) || jsonb_build_object('team_copy', true)
    from company_members m
    where m.company_id = new.user_id and m.status = 'active';
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('fanout_company_notification', left(sqlerrm, 500), new.user_id); exception when others then null; end;
  end;
  return new;
end $$;

-- ───────────────────── UX-028: price reduction notice ─────────────────────
create or replace function public.submit_price_reduction(p_offer_id uuid, p_new_total numeric)
returns void language plpgsql security definer set search_path = public as $$
declare v_rfq uuid; v_supplier uuid; v_contractor uuid; v_qty numeric; v_product text;
        v_old numeric; v_deadline timestamptz; v_ratio numeric; v_extras numeric; v_items int;
        v_vat_status text; v_vat_included boolean;
begin
  select o.rfq_id, o.supplier_id, r.contractor_id, r.quantity, public.rfq_label(r), o.total_price, o.reduction_deadline,
         coalesce((select sum(coalesce(nullif(e->>'amount','')::numeric, 0))
                   from jsonb_array_elements(case when jsonb_typeof(o.extra_charges) = 'array' then o.extra_charges else '[]'::jsonb end) e), 0),
         case when jsonb_typeof(r.items) = 'array' then jsonb_array_length(r.items) else 1 end,
         o.vat_status, o.vat_included
    into v_rfq, v_supplier, v_contractor, v_qty, v_product, v_old, v_deadline, v_extras, v_items, v_vat_status, v_vat_included
  from public.offers o join public.rfqs r on r.id = o.rfq_id where o.id = p_offer_id;
  if v_rfq is null then raise exception 'offer_not_found'; end if;
  if v_supplier is distinct from public.acting_uid() and not is_admin() then raise exception 'forbidden'; end if;
  if v_deadline is null or v_deadline < now() then
    raise exception 'لا يوجد طلب تخفيض مفتوح على هذا العرض.';
  end if;
  if p_new_total is null or p_new_total <= 0 or v_old is null or p_new_total >= v_old then
    raise exception 'السعر الجديد يجب أن يكون أقل من السعر الحالي.';
  end if;
  if p_new_total <= v_extras or v_old <= v_extras then
    raise exception 'السعر الجديد يجب أن يكون أكبر من الرسوم الإضافية.';
  end if;
  v_ratio := (p_new_total - v_extras) / (v_old - v_extras);
  perform set_config('app.deal_write', 'on', true);
  update public.offers
    set total_price = p_new_total,
        unit_price = case when v_items <= 1 and coalesce(v_qty,0) > 0 then round((p_new_total - v_extras) / v_qty, 2)
                          when v_items > 1 then null else unit_price end,
        item_prices = case when jsonb_typeof(item_prices) = 'array' then (
          select coalesce(jsonb_agg(
            case when jsonb_typeof(e) <> 'object' then e else e
              || case when jsonb_typeof(e->'unit_price') = 'number'
                      then jsonb_build_object('unit_price', round((e->>'unit_price')::numeric * v_ratio, 2)) else '{}'::jsonb end
              || case when jsonb_typeof(e->'total') = 'number'
                      then jsonb_build_object('total', round((e->>'total')::numeric * v_ratio, 2)) else '{}'::jsonb end
              || case when jsonb_typeof(e->'install_total') = 'number' and jsonb_typeof(e->'total') = 'number'
                      then jsonb_build_object(
                        'install_total', round((e->>'install_total')::numeric * v_ratio, 2),
                        'material_total', round((e->>'total')::numeric * v_ratio, 2) - round((e->>'install_total')::numeric * v_ratio, 2))
                      else '{}'::jsonb end
            end order by i), '[]'::jsonb)
          from jsonb_array_elements(item_prices) with ordinality t(e, i)
        ) else item_prices end,
        reduction_deadline = null
  where id = p_offer_id and status = 'pending';
  if not found then raise exception 'offer_not_pending'; end if;
  update public.rfq_item_awards
    set unit_price = case when unit_price is null then null else round(unit_price * v_ratio, 2) end,
        total = round(coalesce(total, 0) * v_ratio, 2)
  where offer_id = p_offer_id;
  perform set_config('app.deal_write', 'off', true);
  begin
    insert into public.notifications (user_id, type, title, body, data)
    values (v_contractor, 'rfq_offer', 'تم تخفيض السعر',
      'خفّض المورد سعر عرضه على «' || coalesce(v_product, 'طلبك') || '» إلى '
        || public.fmt_sar(p_new_total * public.offer_vat_factor(v_vat_status, v_vat_included)) || '.',
      jsonb_build_object('offer_id', p_offer_id, 'rfq_id', v_rfq, 'kind', 'reduction_response',
                         'url', '/contractor/rfq/' || v_rfq::text || '/offer/' || p_offer_id::text));
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('submit_price_reduction.notify', left(sqlerrm, 500), v_contractor); exception when others then null; end;
  end;
end $$;

-- old reduction notices get their link (UX-028)
update public.notifications n
   set data = n.data || jsonb_build_object('url', '/contractor/rfq/' || (n.data->>'rfq_id') || '/offer/' || (n.data->>'offer_id'))
 where n.data->>'kind' = 'reduction_response' and n.data->>'url' is null
   and n.data ? 'rfq_id' and n.data ? 'offer_id';

-- ───────────────────── UX-033: decline a reduction request ─────────────────────
create or replace function public.decline_price_reduction(p_offer_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v offers; r rfqs;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v from offers where id = p_offer_id for update;
  if not found then raise exception 'offer_not_found'; end if;
  if v.supplier_id is distinct from public.acting_uid() then raise exception 'forbidden' using errcode = '42501'; end if;
  if v.status <> 'pending' then raise exception 'offer_not_pending'; end if;
  if v.reduction_deadline is null or v.reduction_deadline < now() then
    raise exception 'لا يوجد طلب تخفيض مفتوح على هذا العرض.';
  end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set reduction_deadline = null where id = p_offer_id;
  perform set_config('app.deal_write', 'off', true);
  select * into r from rfqs where id = v.rfq_id;
  begin
    insert into notifications (user_id, type, title, body, data)
    values (r.contractor_id, 'rfq_offer', 'ردّ المورد على طلب التخفيض',
      'اعتذر المورد عن تخفيض السعر في «' || public.rfq_label(r) || '»، ويبقى سعره الحالي أفضل ما يقدّمه.',
      jsonb_build_object('offer_id', p_offer_id, 'rfq_id', r.id, 'kind', 'reduction_declined',
                         'url', '/contractor/rfq/' || r.id::text || '/offer/' || p_offer_id::text));
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('decline_price_reduction.notify', left(sqlerrm, 500), r.contractor_id); exception when others then null; end;
  end;
end $$;
revoke all on function public.decline_price_reduction(uuid) from public, anon;
grant execute on function public.decline_price_reduction(uuid) to authenticated;

-- ───────────────────── UX-094: why did my offer lose ─────────────────────
-- 'price'    another offer won at least one material (or the whole request) at a lower buyer-facing price
-- 'delivery' not cheaper, but the winner promised a shorter delivery time
-- 'other'    anything else (incl. the request ended without a deal); NULL when the offer has not lost
create or replace function public.my_offer_outcome(p_offer_id uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare v offers; v_f numeric; v_lines boolean; v_price boolean := false;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'offer_not_found'; end if;
  if v.supplier_id is distinct from public.acting_uid() then raise exception 'forbidden' using errcode = '42501'; end if;
  if v.status::text not in ('rejected', 'expired') then return null; end if;
  if not exists (select 1 from offers w where w.rfq_id = v.rfq_id and w.id <> v.id and w.status = 'accepted') then
    return 'other';
  end if;
  v_f := public.offer_vat_factor(v.vat_status, v.vat_included);
  v_lines := jsonb_typeof(v.item_prices) = 'array' and jsonb_array_length(v.item_prices) > 0;
  if v_lines then
    select exists (
      select 1
      from rfq_item_awards a
      join offers w on w.id = a.offer_id and w.status = 'accepted'
      join lateral (
        select (e->>'total')::numeric as t
          from jsonb_array_elements(v.item_prices) with ordinality x(e, i)
         where jsonb_typeof(e) = 'object' and jsonb_typeof(e->'total') = 'number'
           and (case when jsonb_typeof(e->'item_index') = 'number' then (e->>'item_index')::int else (i - 1)::int end) = a.item_index
         limit 1) mine on true
      where a.rfq_id = v.rfq_id and a.offer_id <> v.id
        and coalesce(a.total, 0) > 0 and mine.t > 0
        and a.total * public.offer_vat_factor(w.vat_status, w.vat_included) < mine.t * v_f
    ) into v_price;
  else
    select exists (
      select 1 from offers w where w.rfq_id = v.rfq_id and w.id <> v.id and w.status = 'accepted'
        and public.offer_buyer_total(w) < public.offer_buyer_total(v)
    ) into v_price;
  end if;
  if v_price then return 'price'; end if;
  if v.delivery_days is not null and exists (
    select 1 from offers w where w.rfq_id = v.rfq_id and w.id <> v.id and w.status = 'accepted'
      and w.delivery_days is not null and w.delivery_days < v.delivery_days
  ) then
    return 'delivery';
  end if;
  return 'other';
end $$;
revoke all on function public.my_offer_outcome(uuid) from public, anon;
grant execute on function public.my_offer_outcome(uuid) to authenticated;

-- ───────────────────── UX-100: active deals before account deletion ─────────────────────
create or replace function public.my_active_deal_count()
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int
    from offers o join rfqs r on r.id = o.rfq_id
   where auth.uid() is not null
     and o.status = 'accepted' and o.received_at is null
     and (r.contractor_id = auth.uid() or o.supplier_id = auth.uid())
$$;
revoke all on function public.my_active_deal_count() from public, anon;
grant execute on function public.my_active_deal_count() to authenticated;

-- ───────────────────── UX-032: uncovered-request alert link ─────────────────────
create or replace function public.alert_uncovered_rfq_items()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_items jsonb;
  v_missing text;
begin
  if new.status <> 'open' then return new; end if;
  v_items := case
    when new.items is not null and jsonb_typeof(new.items) = 'array' and jsonb_array_length(new.items) > 0 then new.items
    else jsonb_build_array(jsonb_build_object('sector', new.sector::text, 'sub_category', new.sub_category, 'product_name', new.product_name))
  end;
  select string_agg(coalesce(nullif(it->>'product_name', ''), it->>'sub_category', '?'), '، ')
    into v_missing
  from jsonb_array_elements(v_items) it
  where public.count_matching_suppliers(new, it) = 0;

  if v_missing is not null then
    begin
      insert into notifications (user_id, type, title, body, data)
      select a.id, 'new_rfq'::notification_type,
             'طلب بلا مورد مطابق',
             public.rfq_label(new) || ' — لا يوجد مورد لـ: ' || v_missing,
             jsonb_build_object('url', '/admin?tab=rfqs&q=' || coalesce(new.ref_no::text, ''), 'rfq_id', new.id, 'uncovered', v_missing)
      from profiles a where a.role::text = 'admin';
    exception when others then
      begin insert into public.system_errors_log (context, message, user_id) values ('alert_uncovered_rfq_items', left(sqlerrm, 500), new.contractor_id); exception when others then null; end;
    end;
  end if;
  return new;
end $$;

-- ───────────────────── UX-117: ban / unban notices ─────────────────────
create or replace function public.admin_ban_user(p_user uuid, p_until timestamptz, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_until timestamptz := coalesce(p_until, '9999-12-31'::timestamptz);
        v_reason text := left(nullif(btrim(coalesce(p_reason, '')), ''), 500);
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'لا يمكنك إيقاف حسابك.'; end if;
  if exists (select 1 from profiles where id = p_user and role::text = 'admin') then raise exception 'لا يمكن إيقاف حساب إدارة.'; end if;
  perform set_config('app.bypass_locks', 'on', true);
  update profiles set banned_until = v_until, ban_reason = v_reason, banned_by = auth.uid()
   where id = p_user;
  insert into audit_logs (actor_id, action, entity, entity_id, detail)
  values (auth.uid(), 'ban_user', 'profile', p_user, jsonb_build_object('until', p_until, 'reason', left(coalesce(p_reason, ''), 500)));
  begin
    insert into notifications (user_id, type, title, body, data)
    values (p_user, 'announcement', 'تم إيقاف حسابك',
      'خلال الإيقاف لا يمكنك إرسال طلبات أو عروض أو رسائل. '
        || case when v_until > '9000-01-01'::timestamptz then 'الإيقاف دائم إلى أن تراجعه الإدارة.'
                else 'ينتهي الإيقاف ' || public.fmt_riyadh_ar(v_until) || '.' end
        || coalesce(' السبب: ' || v_reason, ''),
      jsonb_build_object('url', '/banned', 'kind', 'account_banned'));
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('admin_ban_user.notify', left(sqlerrm, 500), p_user); exception when others then null; end;
  end;
end $$;

create or replace function public.admin_unban_user(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_was timestamptz;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select banned_until into v_was from profiles where id = p_user;
  perform set_config('app.bypass_locks', 'on', true);
  update profiles set banned_until = null, ban_reason = null, banned_by = null where id = p_user;
  insert into audit_logs (actor_id, action, entity, entity_id, detail) values (auth.uid(), 'unban_user', 'profile', p_user, '{}'::jsonb);
  if v_was is not null and v_was > now() then
    begin
      insert into notifications (user_id, type, title, body, data)
      values (p_user, 'announcement', 'رُفع الإيقاف عن حسابك',
        'يمكنك الآن إرسال الطلبات والعروض والرسائل كالمعتاد.',
        jsonb_build_object('url', '/', 'kind', 'account_unbanned'));
    exception when others then
      begin insert into public.system_errors_log (context, message, user_id) values ('admin_unban_user.notify', left(sqlerrm, 500), p_user); exception when others then null; end;
    end;
  end if;
end $$;

-- the suspension error no longer says «مؤقتاً» (a ban may be permanent); hint unchanged for friendlyDbError
create or replace function public.require_verified_phone()
returns void language plpgsql stable security definer set search_path = public as $$
declare v_phone timestamptz; v_email timestamptz; v_ban timestamptz; v_role text;
begin
  if auth.uid() is null or coalesce(auth.jwt() ->> 'role', '') = 'service_role' or public.is_admin() then return; end if;
  select phone_verified_at, email_verified_at, banned_until, role::text into v_phone, v_email, v_ban, v_role from profiles where id = auth.uid();
  if v_ban is not null and v_ban > now() then
    raise exception 'حسابك موقوف. راجع رسالة الإدارة أو تواصل مع الدعم.' using hint = 'ACCOUNT_SUSPENDED';
  end if;
  if not public.phone_verify_required() then return; end if;
  if v_phone is null then
    raise exception 'وثّق رقم جوالك أولاً من الإعدادات (يصلك رمز برسالة نصية)، ثم أعد المحاولة.' using hint = 'PHONE_NOT_VERIFIED';
  end if;
  if v_email is null and v_role is distinct from 'contractor' then
    raise exception 'وثّق بريدك الإلكتروني أولاً من الإعدادات (يصلك رمز على البريد)، ثم أعد المحاولة.' using hint = 'EMAIL_NOT_VERIFIED';
  end if;
end $$;

-- ───────────────────── UX-120: deal notices ─────────────────────
create or replace function public.notify_contractor_new_offer()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_contractor uuid; v_product text;
begin
  select contractor_id, public.rfq_label(rfqs) into v_contractor, v_product from rfqs where id = new.rfq_id;
  if v_contractor is not null then
    begin
      insert into notifications (user_id, type, title, body, data)
      values (v_contractor, 'rfq_offer', 'عرض سعر جديد',
        'وصلك عرض جديد على «' || coalesce(v_product, 'طلبك') || '»'
          || coalesce(' بإجمالي ' || public.fmt_sar(public.offer_buyer_total(new)), '') || '.',
        jsonb_build_object('url', '/contractor/rfq/' || new.rfq_id::text, 'rfq_id', new.rfq_id, 'offer_id', new.id));
    exception when others then
      begin insert into public.system_errors_log (context, message, user_id) values ('notify_contractor_new_offer', left(sqlerrm, 500), v_contractor); exception when others then null; end;
    end;
  end if;
  return new;
end $$;

create or replace function public.notify_supplier_offer_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_rfq_status text; v_label text;
begin
  if new.status is distinct from old.status then
    select status::text, public.rfq_label(rfqs) into v_rfq_status, v_label from rfqs where id = new.rfq_id;
    if new.status = 'accepted' then
      begin
        insert into notifications (user_id, type, title, body, data)
        values (new.supplier_id, 'offer_accepted', 'اختار المشتري عرضك',
          'اختار المشتري مواد من عرضك على «' || coalesce(v_label, 'الطلب') || '». راجع الصفقة ونسّق التسليم معه.',
          jsonb_build_object('url', '/supplier/dashboard/rfq/' || new.rfq_id::text, 'offer_id', new.id, 'rfq_id', new.rfq_id));
      exception when others then
        begin insert into public.system_errors_log (context, message, user_id) values ('notify_supplier_offer_status.accepted', left(sqlerrm, 500), new.supplier_id); exception when others then null; end;
      end;
    elsif new.status = 'rejected' then
      if coalesce(v_rfq_status, '') in ('cancelled', 'expired') then return new; end if;
      begin
        insert into notifications (user_id, type, title, body, data)
        values (new.supplier_id, 'offer_rejected', 'لم يُقبل عرضك',
          'اختار المشتري مورداً آخر في «' || coalesce(v_label, 'الطلب') || '».',
          jsonb_build_object('url', '/supplier/dashboard/rfq/' || new.rfq_id::text, 'offer_id', new.id, 'rfq_id', new.rfq_id));
      exception when others then
        begin insert into public.system_errors_log (context, message, user_id) values ('notify_supplier_offer_status.rejected', left(sqlerrm, 500), new.supplier_id); exception when others then null; end;
      end;
    end if;
  end if;
  return new;
end $$;

create or replace function public.attach_supplier_invoice(p_offer_id uuid, p_url text, p_name text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v offers; v_contractor uuid; v_label text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'العرض غير موجود'; end if;
  if v.supplier_id <> public.acting_uid() then raise exception 'فقط المورد يمكنه إرفاق فاتورته'; end if;
  if v.status <> 'accepted' then raise exception 'الصفقة غير نشطة'; end if;
  if coalesce(p_url, '') !~ ('/licenses/' || auth.uid()::text || '/[^/]+$') then raise exception 'رابط الملف غير صالح'; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set supplier_invoice_url = p_url, supplier_invoice_name = left(coalesce(p_name, 'فاتورة'), 120),
                    supplier_invoice_at = now()
   where id = p_offer_id returning * into v;
  select contractor_id, public.rfq_label(rfqs) into v_contractor, v_label from rfqs where id = v.rfq_id;
  begin
    insert into notifications (user_id, type, title, body, data)
    values (v_contractor, 'offer_accepted', 'أرفق المورد فاتورته',
      'أرفق المورد الفاتورة الرسمية لصفقة «' || coalesce(v_label, 'طلبك') || '». يمكنك تنزيلها من صفحة الصفقة.',
      jsonb_build_object('url', '/contractor/orders/' || p_offer_id::text, 'rfq_id', v.rfq_id, 'offer_id', p_offer_id));
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('attach_supplier_invoice.notify', left(sqlerrm, 500), v_contractor); exception when others then null; end;
  end;
  return to_jsonb(v);
end $$;

create or replace function public.confirm_delivery(p_offer_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v offers; v_contractor uuid; v_product text;
begin
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'العرض غير موجود'; end if;
  if v.supplier_id <> public.acting_uid() then raise exception 'فقط المورّد يمكنه تأكيد التسليم'; end if;
  if v.status <> 'accepted' then raise exception 'الصفقة غير نشطة'; end if;
  if v.supplier_delivered_at is not null then raise exception 'تم تأكيد التسليم مسبقاً'; end if;
  if v.supplier_invoice_url is null then raise exception 'أرفق الفاتورة الضريبية (فاتورة المحل) أولاً، ثم أكّد التسليم.'; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set supplier_delivered_at = now() where id = p_offer_id returning * into v;
  select contractor_id, public.rfq_label(rfqs) into v_contractor, v_product from rfqs where id = v.rfq_id;
  begin
    insert into notifications (user_id, type, title, body, data)
    values (v_contractor, 'offer_accepted', 'أكّد المورد التوصيل',
      'أكّد المورد توصيل «' || coalesce(v_product, 'طلبك') || '». يرجى تأكيد الاستلام أو الإبلاغ عن مشكلة.',
      jsonb_build_object('url', '/contractor/orders/' || p_offer_id::text, 'rfq_id', v.rfq_id, 'offer_id', p_offer_id));
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('confirm_delivery.notify', left(sqlerrm, 500), v_contractor); exception when others then null; end;
  end;
  return to_jsonb(v);
end $$;

create or replace function public.confirm_receipt(p_offer_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v offers; v_is_contractor boolean; v_label text;
begin
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'العرض غير موجود'; end if;
  select exists(select 1 from rfqs r where r.id = v.rfq_id and r.contractor_id = auth.uid()) into v_is_contractor;
  if not v_is_contractor then raise exception 'فقط المشتري يمكنه تأكيد الاستلام'; end if;
  if v.status <> 'accepted' then raise exception 'الصفقة غير نشطة'; end if;
  if v.received_at is not null then raise exception 'تم تأكيد الاستلام مسبقاً'; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set received_at = now(), received_by = auth.uid(),
                    supplier_delivered_at = coalesce(supplier_delivered_at, now())
   where id = p_offer_id returning * into v;
  select public.rfq_label(rfqs) into v_label from rfqs where id = v.rfq_id;
  begin
    insert into notifications (user_id, type, title, body, data)
    values (v.supplier_id, 'offer_accepted', 'أكّد المشتري الاستلام',
      'أكّد المشتري استلام «' || coalesce(v_label, 'الطلب') || '». شكراً لإتمام الصفقة عبر تسعيرك.',
      jsonb_build_object('url', '/supplier/dashboard/rfq/' || v.rfq_id::text, 'rfq_id', v.rfq_id, 'offer_id', p_offer_id));
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('confirm_receipt.notify', left(sqlerrm, 500), v.supplier_id); exception when others then null; end;
  end;
  return to_jsonb(v);
end $$;

-- reminders: the buyer's link opens the deal page (was the offer page)
create or replace function public.generate_deal_reminders()
returns integer language plpgsql security definer set search_path = public as $$
DECLARE
  v_count integer := 0;
  r record;
  dd int;
  v_prod text;
  v_url_sup text;
  v_url_con text;
BEGIN
  FOR r IN
    SELECT o.id AS offer_id, o.rfq_id, o.supplier_id, o.delivery_days, o.accepted_at,
           o.supplier_delivered_at, o.received_at,
           rq.contractor_id, public.rfq_label(rq) as product_name
    FROM offers o
    JOIN rfqs rq ON rq.id = o.rfq_id
    WHERE o.status = 'accepted'
      AND (o.dispute_status IS DISTINCT FROM 'open')
      AND o.accepted_at IS NOT NULL
      AND o.received_at IS NULL
  LOOP
    dd := GREATEST(COALESCE(r.delivery_days, 3), 1);
    v_prod := COALESCE(NULLIF(r.product_name, ''), 'الطلب');
    v_url_sup := '/supplier/dashboard/rfq/' || r.rfq_id::text;
    v_url_con := '/contractor/orders/' || r.offer_id::text;

    -- (1) تأخّر التوصيل: المورد لم يؤكّد التسليم بعد انتهاء المدة المتّفق عليها
    IF r.supplier_delivered_at IS NULL AND r.accepted_at + make_interval(days => dd) < now() THEN
      IF NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = r.supplier_id AND type = 'reminder_deliver' AND data->>'offer_id' = r.offer_id::text AND (created_at > now() - interval '24 hours' OR (SELECT count(*) FROM notifications n2 WHERE n2.user_id = notifications.user_id AND n2.type = notifications.type AND n2.data->>'offer_id' = notifications.data->>'offer_id') >= 3)) THEN
        INSERT INTO notifications(user_id, type, title, body, data) VALUES (
          r.supplier_id, 'reminder_deliver', 'تذكير: أكّد التوصيل',
          'انتهت مدة التوصيل المتّفق عليها ولم تؤكّد تسليم «' || v_prod || '». يرجى تأكيد التسليم أو التواصل مع المشتري.',
          jsonb_build_object('rfq_id', r.rfq_id, 'offer_id', r.offer_id, 'url', v_url_sup));
        v_count := v_count + 1;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = r.contractor_id AND type = 'reminder_deliver' AND data->>'offer_id' = r.offer_id::text AND (created_at > now() - interval '24 hours' OR (SELECT count(*) FROM notifications n2 WHERE n2.user_id = notifications.user_id AND n2.type = notifications.type AND n2.data->>'offer_id' = notifications.data->>'offer_id') >= 3)) THEN
        INSERT INTO notifications(user_id, type, title, body, data) VALUES (
          r.contractor_id, 'reminder_deliver', 'التوصيل متأخّر',
          'المورد لم يؤكّد توصيل «' || v_prod || '» بعد انتهاء المدة. تابع معه، أو أبلغ عن مشكلة من صفحة الصفقة.',
          jsonb_build_object('rfq_id', r.rfq_id, 'offer_id', r.offer_id, 'url', v_url_con));
        v_count := v_count + 1;
      END IF;

    -- (2) بانتظار تأكيد الاستلام: المورد أكّد التسليم والمشتري لم يؤكّد الاستلام خلال 48 ساعة
    ELSIF r.supplier_delivered_at IS NOT NULL AND r.supplier_delivered_at + interval '48 hours' < now() THEN
      IF NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = r.contractor_id AND type = 'reminder_receipt' AND data->>'offer_id' = r.offer_id::text AND (created_at > now() - interval '24 hours' OR (SELECT count(*) FROM notifications n2 WHERE n2.user_id = notifications.user_id AND n2.type = notifications.type AND n2.data->>'offer_id' = notifications.data->>'offer_id') >= 3)) THEN
        INSERT INTO notifications(user_id, type, title, body, data) VALUES (
          r.contractor_id, 'reminder_receipt', 'تذكير: أكّد الاستلام',
          'أكّد المورد توصيل «' || v_prod || '». يرجى تأكيد الاستلام أو الإبلاغ عن مشكلة من صفحة الصفقة.',
          jsonb_build_object('rfq_id', r.rfq_id, 'offer_id', r.offer_id, 'url', v_url_con));
        v_count := v_count + 1;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = r.supplier_id AND type = 'reminder_receipt' AND data->>'offer_id' = r.offer_id::text AND (created_at > now() - interval '24 hours' OR (SELECT count(*) FROM notifications n2 WHERE n2.user_id = notifications.user_id AND n2.type = notifications.type AND n2.data->>'offer_id' = notifications.data->>'offer_id') >= 3)) THEN
        INSERT INTO notifications(user_id, type, title, body, data) VALUES (
          r.supplier_id, 'reminder_receipt', 'بانتظار تأكيد الاستلام',
          'بانتظار تأكيد المشتري لاستلام «' || v_prod || '». يمكنك متابعته من صفحة الصفقة.',
          jsonb_build_object('rfq_id', r.rfq_id, 'offer_id', r.offer_id, 'url', v_url_sup));
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

-- old buyer-side delivery/receipt notices point at the deal page too
update public.notifications
   set data = jsonb_set(data, '{url}', to_jsonb('/contractor/orders/' || (data->>'offer_id')))
 where data ? 'offer_id'
   and data->>'url' like '/contractor/rfq/%/offer/%'
   and title in ('التوصيل متأخّر', 'تذكير: أكّد الاستلام', 'أكّد المورد التوصيل');

-- sender name: company name, then the person's name, then «المشتري» / «المورد» (never «مستخدم»)
create or replace function public.send_message(p_conversation_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_c record; v_other uuid; v_id uuid; v_sender_name text; v_awarded boolean; v_count int;
begin
  select * into v_c from conversations where id = p_conversation_id;
  if v_c.id is null then raise exception 'Conversation not found'; end if;
  if auth.uid() <> v_c.contractor_id and auth.uid() <> v_c.supplier_id then raise exception 'Not authorized'; end if;
  perform public.require_verified_phone();
  if coalesce(btrim(p_body),'') = '' then raise exception 'Empty message'; end if;
  v_other := case when auth.uid() = v_c.contractor_id then v_c.supplier_id else v_c.contractor_id end;
  if public.is_blocked_between(auth.uid(), v_other) then
    raise exception 'لا يمكن إرسال الرسالة: المحادثة محظورة.';
  end if;
  v_awarded := exists (
    select 1 from offers o where o.rfq_id = v_c.rfq_id and o.supplier_id = v_c.supplier_id and o.status = 'accepted'
  );
  if not v_awarded then
    select count(*) into v_count from messages where conversation_id = p_conversation_id;
    if v_count >= 20 then
      raise exception 'بلغت الحد الأقصى للرسائل قبل اختيار العرض (20 رسالة). يكتمل التواصل بعد اختيار العرض.';
    end if;
    p_body := public.mask_contact_digits(p_body);
  end if;
  insert into messages (conversation_id, sender_id, body) values (p_conversation_id, auth.uid(), btrim(p_body)) returning id into v_id;
  update conversations set last_message = left(btrim(p_body), 140), last_message_at = now() where id = p_conversation_id;
  if auth.uid() = v_c.contractor_id and not v_awarded then
    v_sender_name := 'مشتري';
  else
    select coalesce(nullif(btrim(company_name_ar), ''), nullif(btrim(full_name), '')) into v_sender_name from profiles where id = auth.uid();
    v_sender_name := coalesce(v_sender_name, case when auth.uid() = v_c.contractor_id then 'المشتري' else 'المورد' end);
  end if;
  begin
    insert into notifications (user_id, type, title, body, data)
    values (v_other, 'new_message', 'رسالة جديدة من ' || v_sender_name, left(btrim(p_body), 80),
            jsonb_build_object('url', '/messages?c=' || p_conversation_id::text, 'conversation_id', p_conversation_id));
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('send_message.notify', left(sqlerrm, 500), v_other); exception when others then null; end;
  end;
  return v_id;
end $$;

-- dispute resolution: required text, typed as a dispute, each party lands on the deal (UX-120 / UX-127)
create or replace function public.admin_resolve_dispute(p_offer_id uuid, p_resolution text)
returns void language plpgsql security definer set search_path = public as $$
declare v_res text; v_contractor uuid; v_supplier uuid; v_status text; v_rfq uuid; v_label text;
begin
  if not is_admin() then raise exception 'not authorized'; end if;
  select o.supplier_id, r.contractor_id, o.dispute_status, r.id, public.rfq_label(r)
    into v_supplier, v_contractor, v_status, v_rfq, v_label
    from offers o join rfqs r on r.id = o.rfq_id where o.id = p_offer_id;
  if v_supplier is null then raise exception 'العرض غير موجود'; end if;
  if v_status is distinct from 'open' then raise exception 'لا يوجد نزاع مفتوح لهذا العرض'; end if;
  v_res := nullif(btrim(coalesce(p_resolution, '')), '');
  if v_res is null then raise exception 'اكتب نص الحل الذي سيصل إلى الطرفين.'; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set dispute_status = 'resolved', dispute_resolution = left(v_res, 1000), dispute_resolved_at = now()
    where id = p_offer_id;
  begin
    insert into notifications (user_id, type, title, body, data)
    select u.uid, 'dispute_opened'::notification_type, 'تم حلّ النزاع',
           'حُلّ النزاع في صفقة «' || coalesce(v_label, 'الطلب') || '»: ' || left(v_res, 400),
           jsonb_build_object('kind', 'dispute_resolved', 'offer_id', p_offer_id, 'rfq_id', v_rfq, 'url', u.url)
    from (select v_supplier as uid, '/supplier/dashboard/rfq/' || v_rfq::text as url
          union all
          select v_contractor, '/contractor/orders/' || p_offer_id::text) u
    where u.uid is not null;
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('admin_resolve_dispute.notify', left(sqlerrm, 500), v_contractor); exception when others then null; end;
  end;
end $$;

-- ───────────────────── UX-127: dispute alert opens the disputes tab ─────────────────────
create or replace function public.open_dispute(p_offer_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v offers; v_is_party boolean; r rfqs; v_by_buyer boolean; v_other uuid; v_label text;
begin
  if coalesce(trim(p_reason), '') = '' then raise exception 'سبب النزاع مطلوب'; end if;
  select * into v from offers where id = p_offer_id;
  if not found then raise exception 'العرض غير موجود'; end if;
  select * into r from rfqs where id = v.rfq_id;
  select (v.supplier_id = public.acting_uid()) or (r.contractor_id = auth.uid()) into v_is_party;
  if not v_is_party then raise exception 'فقط طرف في الصفقة يمكنه فتح نزاع'; end if;
  if v.status <> 'accepted' then raise exception 'الصفقة غير نشطة'; end if;
  if v.dispute_status = 'open' then raise exception 'يوجد نزاع مفتوح بالفعل'; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set dispute_status = 'open', dispute_reason = left(p_reason, 1000),
                    dispute_by = auth.uid(), dispute_opened_at = now()
    where id = p_offer_id returning * into v;
  v_by_buyer := (r.contractor_id = auth.uid());
  v_other := case when v_by_buyer then v.supplier_id else r.contractor_id end;
  v_label := public.rfq_label(r);
  begin
    insert into notifications (user_id, type, title, body, data)
    values (v_other, 'dispute_opened', 'بلاغ عن مشكلة في صفقة',
      case when v_by_buyer then 'أبلغ المشتري عن مشكلة في صفقة «' else 'أبلغ المورد عن مشكلة في صفقة «' end
        || v_label || '». سيتواصل فريق تسعيرك مع الطرفين.',
      jsonb_build_object('url', case when v_by_buyer then '/supplier/dashboard/rfq/' || r.id::text else '/contractor/orders/' || v.id::text end,
        'offer_id', v.id, 'rfq_id', r.id));
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('open_dispute.notify_party', sqlerrm, v_other); exception when others then null; end;
  end;
  begin
    perform public.notify_admins('بلاغ عن مشكلة في صفقة',
      v_label || ' — ' || case when v_by_buyer then 'من المشتري: ' else 'من المورد: ' end || left(p_reason, 200),
      '/admin?tab=disputes');
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('open_dispute.notify_admins', sqlerrm, auth.uid()); exception when others then null; end;
  end;
  return to_jsonb(v);
end $$;

-- reject a suggested material with a reason; the seller is told why
create or replace function public.admin_reject_material_request(p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v material_requests; v_reason text := left(nullif(btrim(coalesce(p_reason, '')), ''), 500); v_to uuid;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if v_reason is null then raise exception 'اكتب سبب الرفض الذي سيصل إلى المورد.'; end if;
  select * into v from material_requests where id = p_id for update;
  if not found then raise exception 'الطلب غير موجود'; end if;
  if v.status::text <> 'pending' then raise exception 'تمت مراجعة هذا الطلب مسبقاً.'; end if;
  update material_requests set status = 'rejected', admin_note = v_reason, reviewed_at = now() where id = p_id;
  v_to := coalesce(v.requested_by, v.supplier_id);
  if v_to is not null then
    begin
      insert into notifications (user_id, type, title, body, data)
      values (v_to, 'announcement', 'لم تُعتمد المادة المقترحة',
        'لم تعتمد الإدارة المادة «' || public.clean_ar_name(v.name) || '». السبب: ' || v_reason,
        jsonb_build_object('url', '/supplier/specialties', 'kind', 'material_rejected', 'material_request_id', p_id));
    exception when others then
      begin insert into public.system_errors_log (context, message, user_id) values ('admin_reject_material_request.notify', left(sqlerrm, 500), v_to); exception when others then null; end;
    end;
  end if;
end $$;
revoke all on function public.admin_reject_material_request(uuid, text) from public, anon;
grant execute on function public.admin_reject_material_request(uuid, text) to authenticated;

-- ───────────────────── UX-121: expiry, extension, edit ─────────────────────
create or replace function public.expire_stale_rfqs()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer; v_ids uuid[];
begin
  perform set_config('app.deal_write', 'on', true);
  with ex as (
    update rfqs r set status = 'expired'
     where r.status = 'open' and r.expires_at is not null
       and not exists (select 1 from rfq_item_awards a where a.rfq_id = r.id)
       and not exists (select 1 from offers o where o.rfq_id = r.id and o.status = 'accepted')
       and (r.expires_at < now() - interval '30 days'
            or (r.expires_at < now() - interval '3 days' and not exists (select 1 from offers o where o.rfq_id = r.id)))
    returning r.id
  )
  select array_agg(id) into v_ids from ex;
  n := coalesce(array_length(v_ids, 1), 0);
  if n > 0 then
    begin
      insert into notifications (user_id, type, title, body, data)
      select o.supplier_id, 'rfq_expiring'::notification_type, 'انتهى الطلب دون اختيار',
             'انتهى «' || public.rfq_label(r) || '» دون أن يختار المشتري عرضاً.',
             jsonb_build_object('url', '/supplier/dashboard/rfq/' || r.id::text, 'rfq_id', r.id, 'offer_id', o.id, 'kind', 'rfq_expired')
        from rfqs r join offers o on o.rfq_id = r.id and o.status = 'pending'
       where r.id = any(v_ids);
    exception when others then
      begin insert into public.system_errors_log (context, message, user_id) values ('expire_stale_rfqs.notify', left(sqlerrm, 500), null); exception when others then null; end;
    end;
  end if;
  return n;
end $$;

create or replace function public.extend_rfq_deadline(p_rfq_id uuid, p_new_expires timestamptz)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  v_owner   uuid;
  v_status  text;
  v_current timestamptz;
  r rfqs;
begin
  select contractor_id, status::text, expires_at
    into v_owner, v_status, v_current
    from rfqs where id = p_rfq_id;
  if v_owner is null then raise exception 'RFQ not found'; end if;
  if auth.uid() <> v_owner then raise exception 'Not authorized'; end if;
  if v_status <> 'open' then
    raise exception 'لا يمكن تمديد مهلة طلب غير مفتوح';
  end if;
  if p_new_expires <= now() then
    raise exception 'المهلة الجديدة يجب أن تكون في المستقبل';
  end if;
  if v_current is not null and p_new_expires <= v_current then
    raise exception 'المهلة الجديدة يجب أن تكون أبعد من المهلة الحالية';
  end if;
  perform set_config('app.deal_write', 'on', true);
  -- the buyer is told again when the new deadline passes
  update rfqs set expires_at = p_new_expires, deadline_notified_at = null where id = p_rfq_id returning * into r;
  perform set_config('app.deal_write', 'off', true);
  begin
    -- everyone the request reached (minus those who dismissed it without quoting) + everyone who quoted
    insert into notifications (user_id, type, title, body, data)
    select t.supplier_id, 'rfq_expiring'::notification_type, 'مُدّدت مهلة التسعير',
           'مدّد المشتري مهلة التسعير على «' || public.rfq_label(r) || '» حتى ' || public.fmt_riyadh_ar(p_new_expires)
             || '. يمكنك تقديم عرضك أو مراجعته حتى ذلك الموعد.',
           jsonb_build_object('url', '/supplier/dashboard/rfq/' || p_rfq_id::text, 'rfq_id', p_rfq_id, 'kind', 'deadline_extended')
      from (
        select o.supplier_id from offers o where o.rfq_id = p_rfq_id and o.status = 'pending'
        union
        select x.supplier_id from rfq_recipients x
         where x.rfq_id = p_rfq_id
           and not exists (select 1 from rfq_dismissals d where d.rfq_id = p_rfq_id and d.supplier_id = x.supplier_id)
      ) t
     where t.supplier_id is not null and t.supplier_id <> v_owner;
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('extend_rfq_deadline.notify', left(sqlerrm, 500), v_owner); exception when others then null; end;
  end;
  return p_new_expires;
end $$;

create or replace function public.edit_rfq(p_rfq_id uuid, p_patch jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r rfqs;
  v_material boolean;
  v_items_changed boolean;
  v_deleted int := 0;
  v_new_items jsonb;
  v_rerouted int := 0;
begin
  if auth.uid() is null then raise exception 'سجّل الدخول أولاً.'; end if;
  select * into r from rfqs where id = p_rfq_id for update;
  if not found then raise exception 'الطلب غير موجود.'; end if;
  if r.contractor_id is distinct from auth.uid() then raise exception 'لا تملك صلاحية تعديل هذا الطلب.'; end if;
  if r.status::text not in ('open', 'draft') then raise exception 'لا يمكن تعديل طلب مغلق أو ملغى.'; end if;
  if exists (select 1 from offers where rfq_id = p_rfq_id and status = 'accepted')
     or exists (select 1 from rfq_item_awards where rfq_id = p_rfq_id) then
    raise exception 'لا يمكن تعديل طلب اختير فيه عرض.';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then raise exception 'لا توجد تعديلات.'; end if;

  v_items_changed := p_patch ? 'items' and jsonb_typeof(p_patch -> 'items') = 'array'
                     and jsonb_array_length(p_patch -> 'items') > 0 and p_patch -> 'items' is distinct from r.items;
  v_material :=
       v_items_changed
    or (p_patch ? 'product_name' and nullif(btrim(p_patch ->> 'product_name'), '') is distinct from r.product_name and nullif(btrim(p_patch ->> 'product_name'), '') is not null)
    or (p_patch ? 'quantity' and nullif(p_patch ->> 'quantity', '')::numeric is distinct from r.quantity)
    or (p_patch ? 'unit' and nullif(p_patch ->> 'unit', '') is distinct from r.unit)
    or (p_patch ? 'specification' and nullif(p_patch ->> 'specification', '') is distinct from r.specification);

  if v_material and exists (select 1 from offers where rfq_id = p_rfq_id) then
    -- a re-quote request, not a rejection (UX-121)
    begin
      insert into notifications (user_id, type, title, body, data)
      select distinct o.supplier_id, 'rfq_changed'::notification_type, 'عدّل المشتري طلبه'::text,
             ('عدّل المشتري طلبه، فسعّره من جديد: «' || public.rfq_label(r) || '». تغيّرت المواد أو الكميات فأُلغي عرضك السابق.')::text,
             jsonb_build_object('url', '/supplier/dashboard/rfq/' || p_rfq_id, 'rfq_id', p_rfq_id, 'kind', 'rfq_changed')
        from offers o where o.rfq_id = p_rfq_id;
    exception when others then
      begin insert into public.system_errors_log (context, message, user_id) values ('edit_rfq.notify', left(sqlerrm, 500), auth.uid()); exception when others then null; end;
    end;
    delete from offers where rfq_id = p_rfq_id;
    get diagnostics v_deleted = row_count;
  end if;

  v_new_items := case when v_items_changed then p_patch -> 'items' else r.items end;

  update rfqs set
    notes         = case when p_patch ? 'notes' then nullif(p_patch ->> 'notes', '') else notes end,
    specification = case when p_patch ? 'specification' then nullif(p_patch ->> 'specification', '') else specification end,
    product_name  = coalesce(nullif(btrim(p_patch ->> 'product_name'), ''), product_name),
    quantity      = case when p_patch ? 'quantity' and nullif(p_patch ->> 'quantity', '') is not null then (p_patch ->> 'quantity')::numeric else quantity end,
    unit          = case when p_patch ? 'unit' and nullif(p_patch ->> 'unit', '') is not null then p_patch ->> 'unit' else unit end,
    items         = v_new_items,
    -- routing follows the materials: every sector in the items, the first line's sector/specialty
    sectors       = case when v_items_changed then coalesce((
                      select array_agg(distinct s) from (
                        select it->>'sector' as s from jsonb_array_elements(v_new_items) it
                         where (it->>'sector') = any(enum_range(null::sector)::text[])) x), sectors)
                    else sectors end,
    sector        = case when v_items_changed and (v_new_items -> 0 ->> 'sector') = any(enum_range(null::sector)::text[])
                      then (v_new_items -> 0 ->> 'sector')::sector else sector end,
    sub_category  = case when v_items_changed then coalesce(nullif(v_new_items -> 0 ->> 'sub_category', ''), sub_category) else sub_category end
  where id = p_rfq_id;

  if v_items_changed then
    v_rerouted := public.notify_suppliers_for_rfq(p_rfq_id, true);
  end if;

  return jsonb_build_object('ok', true, 'offers_deleted', v_deleted, 'new_suppliers_notified', v_rerouted);
end $$;
