-- 187: owner dashboard (owner 2026-11-01): «كم واحد سجّل، كم صفقة، كم المبالغ، كم يوزر من كل نوع،
-- كم شخص أونلاين»، plus a read-only support view of any account and announcements.
--  * profiles.last_seen_at + touch_last_seen(): the app/site report activity at most once a minute
--    → online now (5 min), active today / 7 days / 30 days.
--  * admin_overview(p_days, p_include_test): every headline number and daily series in one call.
--    Deal value = awarded lines (rfq_item_awards) or the offer total for a whole-offer acceptance.
--  * admin_user_support_view(p_user_id, p_reason, p_notify): READ-ONLY look at an account (profile,
--    sign-in info, requests, offers, deals, conversations, notifications, errors) without its
--    password. A reason is required, every look is written to audit_logs, and the person is told by
--    default (transparency, PDPL). Nothing in it can change the account.
--  * admin_broadcast(p_audience, p_title, p_body, p_url): an in-app announcement to everyone, buyers
--    or suppliers (type 'announcement', never emailed).

alter type public.notification_type add value if not exists 'announcement';
alter table public.profiles add column if not exists last_seen_at timestamptz;
create index if not exists profiles_last_seen_idx on public.profiles (last_seen_at desc) where last_seen_at is not null;

create or replace function public.touch_last_seen() returns void
language sql security definer set search_path = public as $$
  update profiles set last_seen_at = now()
   where id = auth.uid() and (last_seen_at is null or last_seen_at < now() - interval '60 seconds');
$$;
revoke all on function public.touch_last_seen() from public, anon;
grant execute on function public.touch_last_seen() to authenticated;

create or replace function public.admin_overview(p_days integer default 30, p_include_test boolean default false)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare
  v_days int := greatest(1, least(coalesce(p_days, 30), 3650));
  v_from timestamptz := date_trunc('day', now()) - make_interval(days => v_days - 1);
  r jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  with p as (
    select * from profiles where p_include_test or not coalesce(is_test, false)
  ), pids as (select id from p),
  rq as (select * from rfqs where contractor_id in (select id from pids)),
  o as (select * from offers where rfq_id in (select id from rq)),
  -- deal value per accepted offer: awarded lines, else the whole offer
  deal as (
    select o.*, coalesce((select sum(a.total) from rfq_item_awards a where a.offer_id = o.id), o.total_price, 0) as value
      from o where o.status = 'accepted'
  ),
  first_offer as (
    select rq.id, rq.created_at, min(o.created_at) as first_at, count(o.id) as n
      from rq left join o on o.rfq_id = rq.id group by rq.id, rq.created_at
  ),
  days as (select generate_series(v_from, date_trunc('day', now()), interval '1 day')::date as d)
  select jsonb_build_object(
    'generated_at', now(), 'days', v_days, 'include_test', p_include_test,
    'users', jsonb_build_object(
      'total', (select count(*) from p where role <> 'admin'),
      'buyers', (select count(*) from p where role = 'contractor'),
      'suppliers', (select count(*) from p where role = 'supplier'),
      'admins', (select count(*) from p where role = 'admin'),
      'supplier_company', (select count(*) from p where role = 'supplier' and supplier_tier = 'company'),
      'supplier_shop', (select count(*) from p where role = 'supplier' and coalesce(supplier_tier, 'shop') = 'shop'),
      'supplier_independent', (select count(*) from p where role = 'supplier' and supplier_tier = 'independent'),
      'verified', (select count(*) from p where verification_status::text = 'verified' and role <> 'admin'),
      'pending_verification', (select count(*) from p where verification_status::text = 'pending' and role <> 'admin'),
      'inactive', (select count(*) from p where is_active = false),
      'new_in_period', (select count(*) from p where role <> 'admin' and created_at >= v_from),
      'email_confirmed', (select count(*) from auth.users u join p on p.id = u.id where u.email_confirmed_at is not null and p.role <> 'admin'),
      'team_members', (select count(*) from company_members where status = 'active'),
      'online_now', (select count(*) from p where last_seen_at > now() - interval '5 minutes'),
      'active_24h', (select count(*) from p where last_seen_at > now() - interval '24 hours'),
      'active_7d', (select count(*) from p where last_seen_at > now() - interval '7 days'),
      'active_30d', (select count(*) from p where last_seen_at > now() - interval '30 days'),
      'online_list', coalesce((select jsonb_agg(x order by x->>'last_seen_at' desc) from (
        select jsonb_build_object('id', id, 'name', coalesce(company_name_ar, full_name, '—'), 'role', role, 'last_seen_at', last_seen_at) as x
          from p where last_seen_at > now() - interval '15 minutes' limit 50) s), '[]'::jsonb),
      'by_region', coalesce((select jsonb_agg(x) from (
        select coalesce(region, '—') as region, count(*) filter (where role = 'contractor') as buyers,
               count(*) filter (where role = 'supplier') as suppliers
          from p where role <> 'admin' group by 1 order by count(*) desc limit 13) x), '[]'::jsonb)
    ),
    'requests', jsonb_build_object(
      'total', (select count(*) from rq),
      'in_period', (select count(*) from rq where created_at >= v_from),
      'open_now', (select count(*) from rq where status = 'open' and (expires_at is null or expires_at > now())),
      'by_status', coalesce((select jsonb_object_agg(s, n) from (select status::text as s, count(*) as n from rq group by 1) x), '{}'::jsonb),
      'lines', (select coalesce(sum(case when jsonb_typeof(items) = 'array' then jsonb_array_length(items) else 1 end), 0) from rq),
      'with_offer_pct', (select round(100.0 * count(*) filter (where n >= 1) / nullif(count(*), 0)) from first_offer),
      'with_3_offers_pct', (select round(100.0 * count(*) filter (where n >= 3) / nullif(count(*), 0)) from first_offer),
      'answered_24h_pct', (select round(100.0 * count(*) filter (where first_at <= created_at + interval '24 hours') / nullif(count(*), 0)) from first_offer),
      'median_first_offer_hours', (select round((percentile_cont(0.5) within group (order by extract(epoch from first_at - created_at) / 3600))::numeric, 1) from first_offer where first_at is not null)
    ),
    'offers', jsonb_build_object(
      'total', (select count(*) from o),
      'in_period', (select count(*) from o where created_at >= v_from),
      'pending', (select count(*) from o where status = 'pending'),
      'suppliers_quoting', (select count(distinct supplier_id) from o where created_at >= v_from)
    ),
    'deals', jsonb_build_object(
      'count', (select count(*) from deal),
      'count_in_period', (select count(*) from deal where accepted_at >= v_from),
      'value', (select coalesce(round(sum(value)), 0) from deal),
      'value_in_period', (select coalesce(round(sum(value)), 0) from deal where accepted_at >= v_from),
      'avg_value', (select coalesce(round(avg(value)), 0) from deal),
      'delivered', (select count(*) from deal where supplier_delivered_at is not null),
      'received', (select count(*) from deal where received_at is not null),
      'received_value', (select coalesce(round(sum(value)), 0) from deal where received_at is not null),
      'paid', (select count(*) from deal where payment_confirmed_at is not null),
      'paid_value', (select coalesce(round(sum(value)), 0) from deal where payment_confirmed_at is not null),
      'in_progress', (select count(*) from deal where received_at is null and coalesce(dispute_status, '') <> 'open'),
      'disputes_open', (select count(*) from deal where dispute_status = 'open'),
      'stuck', (select count(*) from deal where received_at is null and coalesce(dispute_status, '') <> 'open'
                  and accepted_at + make_interval(days => greatest(coalesce(delivery_days, 3), 1) + 3) < now()),
      'top_suppliers', coalesce((select jsonb_agg(x) from (
        select d.supplier_id as id, coalesce(pr.company_name_ar, '—') as name, count(*) as deals, round(sum(d.value)) as value
          from deal d left join profiles pr on pr.id = d.supplier_id group by 1, 2 order by 4 desc nulls last limit 8) x), '[]'::jsonb),
      'top_buyer_share_pct', (select round(100.0 * max(v) / nullif(sum(v), 0)) from (
        select sum(d.value) as v from deal d join rq on rq.id = d.rfq_id group by rq.contractor_id) t)
    ),
    'funnel', jsonb_build_object(
      'buyers', (select count(*) from p where role = 'contractor'),
      'buyers_requested', (select count(distinct contractor_id) from rq),
      'buyers_got_offer', (select count(distinct rq.contractor_id) from rq join o on o.rfq_id = rq.id),
      'buyers_awarded', (select count(distinct rq.contractor_id) from rq join deal on deal.rfq_id = rq.id),
      'buyers_received', (select count(distinct rq.contractor_id) from rq join deal on deal.rfq_id = rq.id where deal.received_at is not null),
      'suppliers', (select count(*) from p where role = 'supplier'),
      'suppliers_with_specialty', (select count(distinct ps.profile_id) from profile_specialties ps join p on p.id = ps.profile_id),
      'suppliers_quoted', (select count(distinct supplier_id) from o),
      'suppliers_won', (select count(distinct supplier_id) from deal)
    ),
    'series', coalesce((select jsonb_agg(jsonb_build_object(
        'day', days.d,
        'signups', (select count(*) from p where role <> 'admin' and created_at::date = days.d),
        'requests', (select count(*) from rq where created_at::date = days.d),
        'offers', (select count(*) from o where created_at::date = days.d),
        'deals', (select count(*) from deal where accepted_at::date = days.d),
        'value', (select coalesce(round(sum(value)), 0) from deal where accepted_at::date = days.d)
      ) order by days.d) from days), '[]'::jsonb),
    'health', jsonb_build_object(
      'errors_24h', (select count(*) from system_errors_log where created_at > now() - interval '24 hours'),
      'recent_errors', coalesce((select jsonb_agg(x) from (
        select context, left(message, 160) as message, created_at from system_errors_log order by created_at desc limit 8) x), '[]'::jsonb),
      'cron_failed_24h', (select count(*) from cron.job_run_details where status = 'failed' and start_time > now() - interval '24 hours'),
      'emails_24h', (select count(*) from email_sends where sent_at > now() - interval '24 hours'),
      'no_supplier_specialties', (select count(*) from taxonomy t where coalesce(t.is_active, true)
          and not exists (select 1 from profile_specialties ps join profiles x on x.id = ps.profile_id
                           where ps.specialty = t.sub_key and x.role = 'supplier' and not coalesce(x.is_test, false)))
    )
  ) into r;
  return r;
end $$;
revoke all on function public.admin_overview(integer, boolean) from public, anon;
grant execute on function public.admin_overview(integer, boolean) to authenticated;

create or replace function public.admin_user_support_view(p_user_id uuid, p_reason text, p_notify boolean default true)
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare r jsonb; v_role text;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 5 then raise exception 'اكتب سبب الاطلاع على الحساب (5 أحرف على الأقل).'; end if;
  select role::text into v_role from profiles where id = p_user_id;
  if v_role is null then raise exception 'الحساب غير موجود'; end if;

  insert into audit_logs (actor_id, action, entity, entity_id, detail)
  values (auth.uid(), 'support_view', 'profile', p_user_id, jsonb_build_object('reason', left(btrim(p_reason), 500), 'notified', coalesce(p_notify, true)));
  if coalesce(p_notify, true) and p_user_id <> auth.uid() then
    insert into notifications (user_id, type, title, body, data)
    values (p_user_id, 'announcement', 'اطّلع فريق الدعم على حسابك',
            'اطّلع فريق تسعيرك على بيانات حسابك للمساعدة في: ' || left(btrim(p_reason), 200) || '. لم يُغيَّر شيء في حسابك.',
            jsonb_build_object('url', '/settings', 'kind', 'support_view'));
  end if;

  select jsonb_build_object(
    'profile', (select to_jsonb(pr) from profiles pr where pr.id = p_user_id),
    'auth', (select jsonb_build_object('email', u.email, 'phone', u.phone, 'email_confirmed_at', u.email_confirmed_at,
                                       'last_sign_in_at', u.last_sign_in_at, 'created_at', u.created_at, 'banned_until', u.banned_until)
               from auth.users u where u.id = p_user_id),
    'company', (select jsonb_build_object('company_id', m.company_id, 'role', m.role, 'status', m.status,
                                          'company_name', (select company_name_ar from profiles c where c.id = m.company_id))
                  from company_members m where m.user_id = p_user_id and m.status = 'active' limit 1),
    'team', coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'role', m.role, 'status', m.status,
                                       'name', (select coalesce(full_name, company_name_ar) from profiles x where x.id = m.user_id)))
                        from company_members m where m.company_id = p_user_id), '[]'::jsonb),
    'specialties', coalesce((select jsonb_agg(ps.specialty) from profile_specialties ps where ps.profile_id = p_user_id), '[]'::jsonb),
    'branches', coalesce((select jsonb_agg(to_jsonb(b)) from branches b where b.supplier_id = p_user_id), '[]'::jsonb),
    'requests', coalesce((select jsonb_agg(x order by x->>'created_at' desc) from (
        select jsonb_build_object('id', q.id, 'ref_no', q.ref_no, 'product_name', q.product_name, 'status', q.status,
               'created_at', q.created_at, 'expires_at', q.expires_at, 'region', q.region, 'city', q.city,
               'items', case when jsonb_typeof(q.items) = 'array' then jsonb_array_length(q.items) else 1 end,
               'offers', (select count(*) from offers oo where oo.rfq_id = q.id),
               'awards', (select count(*) from rfq_item_awards a where a.rfq_id = q.id)) as x
          from rfqs q where q.contractor_id = p_user_id order by q.created_at desc limit 60) s), '[]'::jsonb),
    'offers', coalesce((select jsonb_agg(x order by x->>'created_at' desc) from (
        select jsonb_build_object('id', o.id, 'rfq_id', o.rfq_id, 'ref_no', q.ref_no, 'product_name', q.product_name,
               'status', o.status, 'total_price', o.total_price, 'vat_status', o.vat_status, 'created_at', o.created_at,
               'submitted_by', o.submitted_by) as x
          from offers o join rfqs q on q.id = o.rfq_id where o.supplier_id = p_user_id order by o.created_at desc limit 60) s), '[]'::jsonb),
    'deals', coalesce((select jsonb_agg(x order by x->>'accepted_at' desc) from (
        select jsonb_build_object('offer_id', o.id, 'rfq_id', o.rfq_id, 'ref_no', q.ref_no, 'product_name', q.product_name,
               'side', case when o.supplier_id = p_user_id then 'supplier' else 'buyer' end,
               'other_party', (select coalesce(company_name_ar, full_name, '—') from profiles x
                                where x.id = case when o.supplier_id = p_user_id then q.contractor_id else o.supplier_id end),
               'value', coalesce((select sum(a.total) from rfq_item_awards a where a.offer_id = o.id), o.total_price),
               'accepted_at', o.accepted_at, 'supplier_delivered_at', o.supplier_delivered_at, 'received_at', o.received_at,
               'payment_status', o.payment_status, 'payment_confirmed_at', o.payment_confirmed_at,
               'dispute_status', o.dispute_status, 'dispute_reason', o.dispute_reason, 'invoice_number', o.invoice_number) as x
          from offers o join rfqs q on q.id = o.rfq_id
         where o.status = 'accepted' and (o.supplier_id = p_user_id or q.contractor_id = p_user_id)
         order by o.accepted_at desc limit 60) s), '[]'::jsonb),
    'conversations', coalesce((select jsonb_agg(x order by x->>'last_message_at' desc nulls last) from (
        select jsonb_build_object('id', c.id, 'rfq_id', c.rfq_id, 'last_message_at', c.last_message_at,
               'other_party', (select coalesce(company_name_ar, full_name, '—') from profiles x
                                where x.id = case when c.supplier_id = p_user_id then c.contractor_id else c.supplier_id end),
               'messages', coalesce((select jsonb_agg(jsonb_build_object('mine', m.sender_id = p_user_id, 'body', m.body,
                                                                     'created_at', m.created_at, 'read_at', m.read_at) order by m.created_at)
                                     from (select * from messages mm where mm.conversation_id = c.id order by mm.created_at desc limit 30) m), '[]'::jsonb)) as x
          from conversations c where c.contractor_id = p_user_id or c.supplier_id = p_user_id
         order by c.last_message_at desc nulls last limit 15) s), '[]'::jsonb),
    'notifications', coalesce((select jsonb_agg(x order by x->>'created_at' desc) from (
        select jsonb_build_object('type', n.type, 'title', n.title, 'body', n.body, 'is_read', n.is_read, 'created_at', n.created_at) as x
          from notifications n where n.user_id = p_user_id order by n.created_at desc limit 40) s), '[]'::jsonb),
    'errors', coalesce((select jsonb_agg(x order by x->>'created_at' desc) from (
        select jsonb_build_object('context', e.context, 'message', left(e.message, 300), 'created_at', e.created_at) as x
          from system_errors_log e where e.user_id = p_user_id order by e.created_at desc limit 30) s), '[]'::jsonb),
    'reviews', coalesce((select jsonb_agg(jsonb_build_object('rating', v.rating, 'comment', v.comment, 'about_me', v.reviewed_id = p_user_id, 'created_at', v.created_at))
                           from (select * from reviews where reviewer_id = p_user_id or reviewed_id = p_user_id order by created_at desc limit 20) v), '[]'::jsonb),
    'admin_history', coalesce((select jsonb_agg(jsonb_build_object('action', l.action, 'detail', l.detail, 'created_at', l.created_at,
                                     'actor', (select coalesce(full_name, company_name_ar) from profiles a where a.id = l.actor_id)) order by l.created_at desc)
                           from (select * from audit_logs where entity_id = p_user_id order by created_at desc limit 30) l), '[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke all on function public.admin_user_support_view(uuid, text, boolean) from public, anon;
grant execute on function public.admin_user_support_view(uuid, text, boolean) to authenticated;

create or replace function public.admin_broadcast(p_audience text, p_title text, p_body text, p_url text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_audience not in ('all', 'buyers', 'suppliers') then raise exception 'bad audience'; end if;
  if length(btrim(coalesce(p_title, ''))) < 3 then raise exception 'اكتب عنوان الإعلان.'; end if;
  insert into notifications (user_id, type, title, body, data)
  select p.id, 'announcement', left(btrim(p_title), 120), left(btrim(coalesce(p_body, '')), 600),
         jsonb_build_object('url', case when p_url ~ '^/(?![/\\])' then p_url else '/' end, 'kind', 'broadcast')
    from profiles p
   where coalesce(p.is_active, true) and p.role <> 'admin' and not coalesce(p.is_test, false)
     and (p_audience = 'all' or (p_audience = 'buyers' and p.role = 'contractor') or (p_audience = 'suppliers' and p.role = 'supplier'));
  get diagnostics n = row_count;
  insert into audit_logs (actor_id, action, entity, entity_id, detail)
  values (auth.uid(), 'broadcast', 'notifications', null, jsonb_build_object('audience', p_audience, 'title', p_title, 'recipients', n));
  return n;
end $$;
revoke all on function public.admin_broadcast(text, text, text, text) from public, anon;
grant execute on function public.admin_broadcast(text, text, text, text) to authenticated;
