-- 124: Company team members (2026-10-11)
--
-- A company account (supplier, not independent) can invite its sales staff. A member signs in
-- with their own account and works ON BEHALF OF the company: they see the company's request
-- feed, and the offers they submit belong to the company (offers.supplier_id = company), with
-- offers.submitted_by recording who sent it.
--
-- Mechanism: acting_uid() = the company id for an active member, otherwise auth.uid(). The
-- supplier-side policies/RPCs that used auth.uid() as "the supplier" now use acting_uid().
-- Deal actions after award (delivery, invoice, disputes) and messaging stay with the company
-- owner for now.

-- ── Tables ───────────────────────────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists employer_id uuid references public.profiles(id) on delete set null;
create index if not exists profiles_employer_id_idx on public.profiles(employer_id) where employer_id is not null;

create table if not exists public.company_members (
  company_id uuid not null references public.profiles(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('admin','member')),
  status     text not null default 'active' check (status in ('active','removed')),
  added_by   uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  primary key (company_id, user_id)
);
-- a person is an active member of at most one company
create unique index if not exists company_members_one_active on public.company_members(user_id) where status = 'active';

create table if not exists public.company_invites (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.profiles(id) on delete cascade,
  token      text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  role       text not null default 'member' check (role in ('admin','member')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_by    uuid references public.profiles(id) on delete set null,
  used_at    timestamptz,
  revoked    boolean not null default false
);
create index if not exists company_invites_company_idx on public.company_invites(company_id);

alter table public.company_members enable row level security;
alter table public.company_invites enable row level security;
revoke all on public.company_members, public.company_invites from anon, authenticated;
-- all access goes through the RPCs below

alter table public.offers add column if not exists submitted_by uuid references public.profiles(id) on delete set null;

-- ── Acting identity ──────────────────────────────────────────────────────────────────────────
create or replace function public.acting_uid() returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select m.company_id from public.company_members m where m.user_id = auth.uid() and m.status = 'active' limit 1),
    auth.uid())
$$;
grant execute on function public.acting_uid() to authenticated;

-- The company id the caller may manage the team of (owner, or an admin member), else null.
create or replace function public._team_company_for_manager() returns uuid
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'supplier'
                   and p.employer_id is null and coalesce(p.provider_type, 'company') not in ('individual','broker','price_agent'))
      then auth.uid()
    else (select m.company_id from public.company_members m where m.user_id = auth.uid() and m.status = 'active' and m.role = 'admin' limit 1)
  end
$$;
revoke all on function public._team_company_for_manager() from public, anon, authenticated;

-- ── Locks: employer_id is set only by the team RPCs ──────────────────────────────────────────
create or replace function public.enforce_profile_field_locks()
returns trigger language plpgsql set search_path = public as $function$
declare v_name_locked boolean;
begin
  if is_admin() or coalesce(current_setting('app.bypass_locks', true), '') = 'on' then return new; end if;
  if pg_trigger_depth() > 1 then return new; end if;
  new.role := old.role;   -- privesc lock
  new.id   := old.id;
  new.provider_type  := old.provider_type;
  new.role_chosen_at := old.role_chosen_at;
  new.employer_id    := old.employer_id;
  v_name_locked := (old.verification_status = 'verified') or (coalesce(old.cr_verification_source, '') = 'wathq');
  if v_name_locked then
    if old.company_name_ar is not null then new.company_name_ar := old.company_name_ar; end if;
    if old.company_name_en is not null then new.company_name_en := old.company_name_en; end if;
    new.commercial_registration := old.commercial_registration;
  end if;
  if old.supplier_tier    is not null then new.supplier_tier    := old.supplier_tier;    end if;
  if old.contractor_grade is not null then new.contractor_grade := old.contractor_grade; end if;
  new.verification_status    := old.verification_status;
  new.cr_verification_source := old.cr_verification_source;
  new.cr_official_name       := old.cr_official_name;
  new.cr_verified_at         := old.cr_verified_at;
  new.cr_activity            := old.cr_activity;
  new.cr_status              := old.cr_status;
  new.cr_issue_date          := old.cr_issue_date;
  new.cr_expiry_date         := old.cr_expiry_date;
  new.cr_data                := old.cr_data;
  new.rating_avg             := old.rating_avg;
  new.rating_count           := old.rating_count;
  new.subscription_plan      := old.subscription_plan;
  new.subscription_expires_at:= old.subscription_expires_at;
  new.is_active              := old.is_active;
  new.approvals              := old.approvals;
  new.rejection_reason       := old.rejection_reason;
  new.auto_classification            := old.auto_classification;
  new.auto_classification_note       := old.auto_classification_note;
  new.auto_classification_confidence := old.auto_classification_confidence;
  new.auto_classification_source     := old.auto_classification_source;
  new.auto_classified_at             := old.auto_classified_at;
  new.created_at             := old.created_at;
  return new;
end; $function$;

-- ── Team RPCs ────────────────────────────────────────────────────────────────────────────────
create or replace function public.create_company_invite(p_role text default 'member')
returns json language plpgsql security definer set search_path = public as $$
declare v_company uuid := public._team_company_for_manager(); v_token text;
begin
  if auth.uid() is null then return json_build_object('ok', false, 'error', 'unauthorized'); end if;
  if v_company is null then return json_build_object('ok', false, 'error', 'not_company'); end if;
  if p_role not in ('admin','member') then return json_build_object('ok', false, 'error', 'bad_role'); end if;
  if (select count(*) from company_invites where company_id = v_company and not revoked and used_at is null and expires_at > now()) >= 20 then
    return json_build_object('ok', false, 'error', 'too_many_invites');
  end if;
  insert into company_invites (company_id, role, created_by) values (v_company, p_role, auth.uid()) returning token into v_token;
  return json_build_object('ok', true, 'token', v_token);
end $$;

-- Shown on the invite page before signing in: only the company name.
create or replace function public.get_company_invite(p_token text)
returns json language sql stable security definer set search_path = public as $$
  select coalesce((
    select json_build_object('ok', true, 'company_name', coalesce(p.company_name_ar, p.full_name), 'role', i.role,
                             'valid', (not i.revoked and i.used_at is null and i.expires_at > now()))
    from company_invites i join profiles p on p.id = i.company_id
    where i.token = p_token and length(p_token) = 36
  ), json_build_object('ok', false))
$$;

create or replace function public.accept_company_invite(p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare i company_invites; me profiles;
begin
  if auth.uid() is null then return json_build_object('ok', false, 'error', 'unauthorized'); end if;
  select * into i from company_invites where token = p_token for update;
  if i.id is null or i.revoked or i.used_at is not null or i.expires_at <= now() then
    return json_build_object('ok', false, 'error', 'invalid_invite');
  end if;
  select * into me from profiles where id = auth.uid();
  if me.id is null then return json_build_object('ok', false, 'error', 'no_profile'); end if;
  if me.role::text = 'admin' or me.id = i.company_id then return json_build_object('ok', false, 'error', 'not_allowed'); end if;
  if exists (select 1 from company_members where user_id = me.id and status = 'active') then
    return json_build_object('ok', false, 'error', 'already_member');
  end if;
  -- An account that already trades on its own (offers or requests) cannot become an employee.
  if exists (select 1 from offers where supplier_id = me.id) or exists (select 1 from rfqs where contractor_id = me.id) then
    return json_build_object('ok', false, 'error', 'has_activity');
  end if;

  perform set_config('app.bypass_locks', 'on', true);
  update profiles set role = 'supplier', role_chosen_at = coalesce(role_chosen_at, now()),
                      employer_id = i.company_id, provider_type = 'company'
   where id = me.id;
  insert into company_members (company_id, user_id, role, status, added_by)
  values (i.company_id, me.id, i.role, 'active', i.created_by)
  on conflict (company_id, user_id) do update set status = 'active', role = excluded.role, removed_at = null, created_at = now();
  update company_invites set used_by = me.id, used_at = now() where id = i.id;
  return json_build_object('ok', true, 'company_id', i.company_id);
end $$;

create or replace function public.list_company_team()
returns json language plpgsql stable security definer set search_path = public as $$
declare v_company uuid := public.acting_uid(); v_manage boolean := public._team_company_for_manager() is not null;
begin
  if auth.uid() is null then return json_build_object('ok', false, 'error', 'unauthorized'); end if;
  if v_company = auth.uid() and not v_manage then return json_build_object('ok', false, 'error', 'not_company'); end if;
  return json_build_object(
    'ok', true,
    'can_manage', v_manage,
    'is_owner', v_company = auth.uid(),
    'company_name', (select coalesce(company_name_ar, full_name) from profiles where id = v_company),
    'members', coalesce((
      select json_agg(json_build_object('user_id', m.user_id, 'name', coalesce(p.full_name, p.company_name_ar), 'phone', p.phone,
                                        'role', m.role, 'since', m.created_at,
                                        'offers', (select count(*) from offers o where o.submitted_by = m.user_id and o.supplier_id = v_company))
                      order by m.created_at)
      from company_members m join profiles p on p.id = m.user_id
      where m.company_id = v_company and m.status = 'active'), '[]'::json),
    'invites', case when v_manage then coalesce((
      select json_agg(json_build_object('id', i.id, 'token', i.token, 'role', i.role, 'expires_at', i.expires_at) order by i.created_at desc)
      from company_invites i
      where i.company_id = v_company and not i.revoked and i.used_at is null and i.expires_at > now()), '[]'::json) else '[]'::json end
  );
end $$;

create or replace function public.revoke_company_invite(p_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v_company uuid := public._team_company_for_manager();
begin
  if v_company is null then return json_build_object('ok', false, 'error', 'not_company'); end if;
  update company_invites set revoked = true where id = p_id and company_id = v_company;
  return json_build_object('ok', found);
end $$;

create or replace function public.remove_company_member(p_user uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v_company uuid := public._team_company_for_manager();
begin
  -- a member may also remove themselves (leave)
  if p_user = auth.uid() then
    select company_id into v_company from company_members where user_id = auth.uid() and status = 'active';
  end if;
  if v_company is null then return json_build_object('ok', false, 'error', 'not_allowed'); end if;
  update company_members set status = 'removed', removed_at = now()
   where company_id = v_company and user_id = p_user and status = 'active';
  if not found then return json_build_object('ok', false, 'error', 'not_member'); end if;
  perform set_config('app.bypass_locks', 'on', true);
  -- back to a fresh account: they choose their role again on next sign-in
  update profiles set employer_id = null, role_chosen_at = null where id = p_user;
  return json_build_object('ok', true);
end $$;

revoke all on function public.create_company_invite(text), public.accept_company_invite(text), public.list_company_team(),
  public.revoke_company_invite(uuid), public.remove_company_member(uuid) from public, anon;
grant execute on function public.create_company_invite(text), public.accept_company_invite(text), public.list_company_team(),
  public.revoke_company_invite(uuid), public.remove_company_member(uuid) to authenticated;
revoke all on function public.get_company_invite(text) from public;
grant execute on function public.get_company_invite(text) to anon, authenticated;

-- ── Supplier-side access via acting_uid() ────────────────────────────────────────────────────
-- offers
drop policy if exists "Suppliers create own offers" on public.offers;
create policy "Suppliers create own offers" on public.offers for insert
  with check ((supplier_id = (select public.acting_uid())) and public.can_submit_quote());
drop policy if exists "Update own or counterparty offers" on public.offers;
create policy "Update own or counterparty offers" on public.offers for update
  using ((supplier_id = (select public.acting_uid())) or is_rfq_owner(rfq_id) or is_admin())
  with check ((supplier_id = (select public.acting_uid())) or is_rfq_owner(rfq_id) or is_admin());
drop policy if exists "View own or counterparty offers" on public.offers;
create policy "View own or counterparty offers" on public.offers for select
  using ((supplier_id = (select public.acting_uid())) or is_rfq_owner(rfq_id) or is_admin());
drop policy if exists "Delete own or counterparty offers" on public.offers;
create policy "Delete own or counterparty offers" on public.offers for delete to authenticated
  using ((((select public.acting_uid()) = supplier_id or is_rfq_owner(rfq_id)) and status <> 'accepted') or (select is_admin()));

-- dismissals, awards
drop policy if exists "Suppliers manage own dismissals" on public.rfq_dismissals;
create policy "Suppliers manage own dismissals" on public.rfq_dismissals for all
  using (supplier_id = (select public.acting_uid())) with check (supplier_id = (select public.acting_uid()));
drop policy if exists "awards select party" on public.rfq_item_awards;
create policy "awards select party" on public.rfq_item_awards for select to authenticated
  using ((supplier_id = (select public.acting_uid()))
         or exists (select 1 from rfqs r where r.id = rfq_item_awards.rfq_id and r.contractor_id = (select auth.uid())));

-- a member reads their company's profile
drop policy if exists "profiles_select_owner_admin_accepted_counterparty" on public.profiles;
create policy "profiles_select_owner_admin_accepted_counterparty" on public.profiles for select to authenticated
  using ((auth.uid() = id) or is_admin() or shares_deal_with(id) or (id = (select public.acting_uid())));

-- rfqs feed visibility
drop policy if exists "read rfqs owned or in target scope" on public.rfqs;
create policy "read rfqs owned or in target scope" on public.rfqs for select to authenticated
  using ((contractor_id = auth.uid()) or is_admin() or supplier_offered_on(id) or (
    ((coalesce(nearby_only, false) = false) or (cardinality(served_regions((select public.acting_uid()))) = 0)
       or (region = any (served_regions((select public.acting_uid())))))
    and ((target_regions is null) or (cardinality(target_regions) = 0) or (served_regions((select public.acting_uid())) && target_regions))));

create or replace function public.supplier_offered_on(p_rfq_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from offers o where o.rfq_id = p_rfq_id and o.supplier_id = public.acting_uid())
$$;

create or replace function public.can_submit_quote()
returns boolean language sql stable security definer set search_path = public as $function$
  select exists (
    select 1 from public.profiles p
    where p.id = public.acting_uid() and p.role = 'supplier' and p.is_active is not false
      and (p.verification_status = 'verified'
           or coalesce(p.cr_verification_source, '') = 'wathq'
           or exists (select 1 from auth.users u where u.id in (p.id, auth.uid()) and u.phone_confirmed_at is not null))
  );
$function$;

create or replace function public.get_rfq_for_viewer(p_rfq_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $function$
declare r rfqs; v_owner boolean; v_award boolean; v_see boolean; v_served text[]; result jsonb; v_act uuid := public.acting_uid();
begin
  select * into r from rfqs where id = p_rfq_id;
  if r.id is null then return null; end if;
  v_served := public.served_regions(v_act);
  v_owner := (r.contractor_id = auth.uid()) or public.is_admin();
  v_award := v_owner
    or exists (select 1 from offers o where o.rfq_id = p_rfq_id and o.supplier_id = v_act and o.status = 'accepted')
    or exists (select 1 from rfq_item_awards a where a.rfq_id = p_rfq_id and a.supplier_id = v_act);
  v_see := v_award
    or exists (select 1 from offers o where o.rfq_id = p_rfq_id and o.supplier_id = v_act)
    or (
      (coalesce(r.nearby_only, false) = false or cardinality(v_served) = 0 or r.region = any(v_served))
      and (r.target_regions is null or cardinality(r.target_regions) = 0 or v_served && r.target_regions)
    );
  if not v_see then return null; end if;
  result := to_jsonb(r);
  if not v_award then result := result - 'delivery_geo' - 'delivery_location'; end if;
  if not v_owner then result := result - 'contractor_id'; end if;
  return result;
end; $function$;

create or replace function public.get_rfq_offer_ranking(p_rfq_id uuid)
returns table(total_price numeric, delivery_days integer, is_mine boolean, blind boolean)
language sql security definer set search_path = public as $function$
  select o.total_price, o.delivery_days, (o.supplier_id = public.acting_uid()) as is_mine, false as blind
  from offers o
  where o.rfq_id = p_rfq_id
    and o.status <> 'rejected'
    and o.total_price is not null
    and (
      exists (select 1 from rfqs r where r.id = p_rfq_id and r.contractor_id = auth.uid())
      or public.is_admin()
      or o.supplier_id = public.acting_uid()
    )
  order by o.total_price asc;
$function$;

-- offers: record who submitted; the supplier side of the deal-column lock uses the company id
create or replace function public.sanitize_offer_insert()
returns trigger language plpgsql security definer set search_path = public as $function$
begin
  if coalesce(current_setting('app.deal_write', true), '') = 'on' or public.is_admin() then return new; end if;
  new.status := 'pending';
  new.submitted_by := auth.uid();
  new.accepted_at := null; new.po_number := null; new.invoice_number := null;
  new.supplier_delivered_at := null; new.received_at := null; new.received_by := null;
  new.payment_status := 'unpaid'; new.paid_marked_at := null; new.payment_confirmed_at := null;
  new.dispute_status := null; new.dispute_reason := null; new.dispute_by := null;
  new.dispute_opened_at := null; new.dispute_resolution := null; new.dispute_resolved_at := null;
  new.reduction_deadline := null; new.reduction_note := null;
  new.info_request := null; new.info_response := null;
  new.created_at := now();
  return new;
end; $function$;

create or replace function public.lock_offer_deal_columns()
returns trigger language plpgsql security definer set search_path = public as $function$
declare v_uid uuid := public.acting_uid();
begin
  if coalesce(current_setting('app.deal_write', true), '') = 'on' or public.is_admin() then return new; end if;
  new.rfq_id := old.rfq_id; new.supplier_id := old.supplier_id; new.created_at := old.created_at;
  new.submitted_by := old.submitted_by;
  new.supplier_delivered_at := old.supplier_delivered_at;
  new.received_at := old.received_at; new.received_by := old.received_by;
  new.payment_status := old.payment_status; new.paid_marked_at := old.paid_marked_at;
  new.payment_confirmed_at := old.payment_confirmed_at;
  new.dispute_status := old.dispute_status; new.dispute_reason := old.dispute_reason;
  new.dispute_by := old.dispute_by; new.dispute_opened_at := old.dispute_opened_at;
  new.dispute_resolution := old.dispute_resolution; new.dispute_resolved_at := old.dispute_resolved_at;
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    new.status := old.status; new.accepted_at := old.accepted_at;
    new.invoice_number := old.invoice_number; new.po_number := old.po_number;
  end if;

  if v_uid is distinct from old.supplier_id then
    -- caller is the RFQ owner (RLS already limits UPDATE to supplier / owner / admin)
    new.total_price := old.total_price; new.unit_price := old.unit_price;
    new.item_prices := old.item_prices; new.extra_charges := old.extra_charges;
    new.vat_included := old.vat_included; new.delivery_days := old.delivery_days;
    new.notes := old.notes; new.attributes := old.attributes;
    new.attachment_url := old.attachment_url; new.attachment_name := old.attachment_name;
    new.price_valid_until := old.price_valid_until; new.source_type := old.source_type;
    new.availability := old.availability;
    new.info_response := old.info_response;
    if not (old.status = 'pending' and new.status = 'rejected') then new.status := old.status; end if;
  else
    -- caller is the supplier (or one of its team members)
    new.status := old.status;
    new.info_request := old.info_request;
    new.reduction_deadline := old.reduction_deadline; new.reduction_note := old.reduction_note;
  end if;

  if old.status = 'accepted' then
    new.total_price := old.total_price; new.unit_price := old.unit_price;
    new.item_prices := old.item_prices; new.extra_charges := old.extra_charges;
    new.vat_included := old.vat_included; new.status := old.status; new.invoice_number := old.invoice_number;
  end if;
  if old.status = 'pending' and exists (
    select 1 from rfqs r where r.id = old.rfq_id and r.expires_at is not null and r.expires_at < now()
  ) then
    new.total_price := old.total_price; new.unit_price := old.unit_price;
    new.item_prices := old.item_prices; new.extra_charges := old.extra_charges;
    new.vat_included := old.vat_included; new.delivery_days := old.delivery_days;
  end if;
  return new;
end; $function$;

-- ── Notifications: members get a copy of what the company gets ───────────────────────────────
create or replace function public.fanout_company_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.data->>'team_copy', '') <> '' then return new; end if;
  -- conversations stay with the company owner for now, so message alerts are not copied
  if new.type::text ilike '%message%' then return new; end if;
  insert into notifications (user_id, type, title, body, data)
  select m.user_id, new.type, new.title, new.body, coalesce(new.data, '{}'::jsonb) || jsonb_build_object('team_copy', true)
  from company_members m
  where m.company_id = new.user_id and m.status = 'active';
  return new;
end $$;
drop trigger if exists trg_fanout_company_notification on public.notifications;
create trigger trg_fanout_company_notification after insert on public.notifications
  for each row execute function public.fanout_company_notification();

-- Members are suppliers too, but new requests reach the company, not each member directly
-- (they get the company's copy above).
create or replace function public.notify_suppliers_new_rfq()
returns trigger language plpgsql security definer set search_path = public as $function$
declare
  v_body text;
  v_items jsonb;
begin
  if new.status <> 'open' then return new; end if;
  v_body := coalesce(new.title, new.product_name, 'طلب تسعير جديد');
  v_items := case
    when new.items is not null and jsonb_typeof(new.items) = 'array' and jsonb_array_length(new.items) > 0
      then new.items
    else jsonb_build_array(jsonb_build_object('sector', new.sector::text, 'sub_category', new.sub_category))
  end;
  insert into notifications (user_id, type, title, body, data)
  select distinct p.id, 'new_rfq'::notification_type,
         'طلب تسعير جديد', v_body,
         jsonb_build_object('url', '/supplier/dashboard/rfq/' || new.id::text, 'rfq_id', new.id)
  from profiles p
  where p.role::text = 'supplier'
    and p.employer_id is null
    and coalesce(p.is_active, true)
    and p.id <> new.contractor_id
    and (not coalesce(new.verified_only, false) or p.verification_status::text = 'verified')
    and (new.target_tiers is null or coalesce(p.supplier_tier, 'shop') = any(new.target_tiers))
    and (
      new.target_regions is null
      or p.region = any(new.target_regions)
      or exists (select 1 from branches b where b.supplier_id = p.id and b.region = any(new.target_regions))
    )
    and (
      not coalesce(new.nearby_only, false)
      or p.region = new.region
      or exists (select 1 from branches b where b.supplier_id = p.id and b.region = new.region)
    )
    and exists (
      select 1
      from jsonb_array_elements(v_items) it
      where exists (
              select 1 from profile_sectors ps
              where ps.profile_id = p.id and ps.sector::text = (it->>'sector')
            )
        and (
              not exists (select 1 from profile_specialties psp where psp.profile_id = p.id)
              or coalesce(it->>'sub_category', '') = ''
              or exists (select 1 from profile_specialties psp
                         where psp.profile_id = p.id and psp.specialty = (it->>'sub_category'))
            )
        and (
              it->'supplier_tiers' is null
              or jsonb_typeof(it->'supplier_tiers') <> 'array'
              or jsonb_array_length(it->'supplier_tiers') = 0
              or coalesce(p.supplier_tier, 'shop') in (select jsonb_array_elements_text(it->'supplier_tiers'))
            )
    );
  return new;
end;
$function$;
