-- Governance for changing a company's NAME and CLASSIFICATION after signup.
-- These are identity/trust fields, so they are locked: users can only REQUEST a
-- change, an admin approves it, and there is a 90-day cooldown + audit trail.

create table if not exists public.profile_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  field text not null check (field in ('name','classification')),
  old_value text,
  new_value text not null,
  reason text,
  document_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.profile_change_requests enable row level security;
create policy "pcr read own or admin" on public.profile_change_requests
  for select using (auth.uid() = user_id or is_admin());

-- DB-level lock: non-admins can never directly change name/classification.
-- Other profile fields (phone, city, ...) update normally. The only path to
-- change a locked field is an admin (directly, or via the approval RPC below).
create or replace function public.enforce_profile_field_locks()
returns trigger language plpgsql as $$
begin
  if is_admin() then return new; end if;
  new.company_name_ar  := old.company_name_ar;
  new.company_name_en  := old.company_name_en;
  new.supplier_tier    := old.supplier_tier;
  new.contractor_grade := old.contractor_grade;
  return new;
end; $$;
drop trigger if exists trg_enforce_profile_field_locks on public.profiles;
create trigger trg_enforce_profile_field_locks
  before update on public.profiles
  for each row execute function public.enforce_profile_field_locks();

-- User submits a change request (enforces: one pending per field + 90-day cooldown).
create or replace function public.request_profile_change(p_field text, p_new_value text, p_reason text, p_document_url text)
returns json language plpgsql security definer as $$
declare uid uuid := auth.uid(); cur record; recent timestamptz;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'unauthorized'); end if;
  if p_field not in ('name','classification') then return json_build_object('ok', false, 'error', 'bad_field'); end if;
  if coalesce(trim(p_new_value), '') = '' then return json_build_object('ok', false, 'error', 'empty'); end if;
  if exists (select 1 from public.profile_change_requests where user_id = uid and field = p_field and status = 'pending') then
    return json_build_object('ok', false, 'error', 'pending_exists');
  end if;
  select max(reviewed_at) into recent from public.profile_change_requests
    where user_id = uid and field = p_field and status = 'approved';
  if recent is not null and recent > now() - interval '90 days' then
    return json_build_object('ok', false, 'error', 'cooldown', 'until', recent + interval '90 days');
  end if;
  select * into cur from public.profiles where id = uid;
  insert into public.profile_change_requests (user_id, field, old_value, new_value, reason, document_url)
  values (uid, p_field,
    case when p_field = 'name' then cur.company_name_ar
         when cur.role = 'supplier' then cur.supplier_tier
         else cur.contractor_grade end,
    p_new_value, nullif(p_reason, ''), nullif(p_document_url, ''));
  return json_build_object('ok', true);
end; $$;
grant execute on function public.request_profile_change(text, text, text, text) to authenticated;

-- Admin approves/rejects; approval applies the change to the profile.
create or replace function public.review_profile_change(p_id uuid, p_approve boolean, p_note text)
returns json language plpgsql security definer as $$
declare r record;
begin
  if not is_admin() then return json_build_object('ok', false, 'error', 'forbidden'); end if;
  select * into r from public.profile_change_requests where id = p_id and status = 'pending';
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  if p_approve then
    if r.field = 'name' then
      update public.profiles set company_name_ar = r.new_value where id = r.user_id;
    elsif r.field = 'classification' then
      update public.profiles
        set supplier_tier    = case when role = 'supplier'   then r.new_value else supplier_tier end,
            contractor_grade = case when role = 'contractor' then r.new_value else contractor_grade end
        where id = r.user_id;
    end if;
    update public.profile_change_requests
      set status = 'approved', admin_note = p_note, reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
  else
    update public.profile_change_requests
      set status = 'rejected', admin_note = p_note, reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
  end if;
  return json_build_object('ok', true);
end; $$;
grant execute on function public.review_profile_change(uuid, boolean, text) to authenticated;
