-- Audit trail for sensitive actions (disputes, accountability).
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid, action text not null, entity text, entity_id uuid, detail jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
create policy "audit admin read" on public.audit_logs for select using (is_admin());

create or replace function public.accept_offer(p_offer_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_rfq uuid; v_caller uuid := auth.uid();
begin
  select rfq_id into v_rfq from public.offers where id = p_offer_id for update;
  if v_rfq is null then raise exception 'offer_not_found'; end if;
  if not is_admin() and not exists (select 1 from public.rfqs where id = v_rfq and contractor_id = v_caller) then
    raise exception 'forbidden';
  end if;
  update public.offers set status='accepted', accepted_at=now() where id = p_offer_id and status='pending';
  if not found then raise exception 'offer_not_pending'; end if;
  update public.offers set status='rejected' where rfq_id = v_rfq and id <> p_offer_id and status='pending';
  update public.rfqs set status='closed' where id = v_rfq;
  insert into public.audit_logs(actor_id, action, entity, entity_id, detail) values (v_caller, 'accept_offer', 'offer', p_offer_id, jsonb_build_object('rfq_id', v_rfq));
end; $$;
grant execute on function public.accept_offer(uuid) to authenticated;

create or replace function public.admin_set_verification(p_user_id uuid, p_source text, p_official_name text, p_cr_status text, p_activity text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.bypass_locks', 'on', true);
  update public.profiles set verification_status='verified',
    cr_verification_source=coalesce(nullif(p_source,''),cr_verification_source),
    cr_official_name=coalesce(nullif(p_official_name,''),cr_official_name),
    cr_status=coalesce(nullif(p_cr_status,''),cr_status), cr_activity=coalesce(nullif(p_activity,''),cr_activity),
    cr_verified_at=now()
  where id=p_user_id and verification_status='pending';
  if found then
    insert into public.audit_logs(actor_id, action, entity, entity_id, detail) values (auth.uid(), 'verify', 'profile', p_user_id, jsonb_build_object('source', p_source));
  end if;
end; $$;
revoke all on function public.admin_set_verification(uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.admin_set_verification(uuid,text,text,text,text) to service_role;

create or replace function public.review_profile_change(p_id uuid, p_approve boolean, p_note text)
returns json language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if not is_admin() then return json_build_object('ok', false, 'error', 'forbidden'); end if;
  select * into r from public.profile_change_requests where id = p_id and status = 'pending';
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  if p_approve then
    if r.field = 'name' then
      update public.profiles set company_name_ar = r.new_value where id = r.user_id;
    elsif r.field = 'classification' then
      update public.profiles set supplier_tier = case when role='supplier' then r.new_value else supplier_tier end,
        contractor_grade = case when role='contractor' then r.new_value else contractor_grade end where id = r.user_id;
    end if;
    update public.profile_change_requests set status='approved', admin_note=p_note, reviewed_by=auth.uid(), reviewed_at=now() where id = p_id;
  else
    update public.profile_change_requests set status='rejected', admin_note=p_note, reviewed_by=auth.uid(), reviewed_at=now() where id = p_id;
  end if;
  insert into public.audit_logs(actor_id, action, entity, entity_id, detail)
  values (auth.uid(), case when p_approve then 'approve_change' else 'reject_change' end, 'profile_change_request', p_id, jsonb_build_object('field', r.field));
  return json_build_object('ok', true);
end; $$;
grant execute on function public.review_profile_change(uuid, boolean, text) to authenticated;
