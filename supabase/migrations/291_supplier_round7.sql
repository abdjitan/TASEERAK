-- 291 (round-7 supplier side)
-- UX-155: a seller can declare «منشأتي غير مسجّلة في ضريبة القيمة المضافة» (stored, not only per device).
-- UX-241: count of matching requests that ended this week without an offer from me.
-- UX-072: an optional employee name on company invites; phones in the team list for managers only (UX-109 r6).
alter table public.profiles add column if not exists vat_declared_unregistered_at timestamptz;

create or replace function public.declare_vat_unregistered(p_unregistered boolean default true)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v timestamptz;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if public.acting_uid() is distinct from auth.uid() then raise exception 'يقرّر صاحب الحساب حالة الضريبة.'; end if;
  perform set_config('app.bypass_locks', 'on', true);
  update profiles set vat_declared_unregistered_at = case when p_unregistered then now() else null end,
                      vat_number = case when p_unregistered then null else vat_number end
   where id = auth.uid() returning vat_declared_unregistered_at into v;
  return v;
end $$;
revoke all on function public.declare_vat_unregistered(boolean) from public, anon;
grant execute on function public.declare_vat_unregistered(boolean) to authenticated;

create or replace function public.my_missed_rfqs(p_days int default 7)
returns integer language sql stable security definer set search_path = public as $$
  select count(distinct (n.data->>'rfq_id'))::int
  from notifications n join rfqs r on r.id = (n.data->>'rfq_id')::uuid
  where n.user_id = coalesce(public.acting_uid(), auth.uid()) and n.type = 'new_rfq'
    and n.created_at > now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 60)))
    and r.status::text <> 'open'
    and not exists (select 1 from offers o where o.rfq_id = r.id and o.supplier_id = coalesce(public.acting_uid(), auth.uid()))
$$;
revoke all on function public.my_missed_rfqs(int) from public, anon;
grant execute on function public.my_missed_rfqs(int) to authenticated;

alter table public.company_invites add column if not exists label text;
drop function if exists public.create_company_invite(text);
create or replace function public.create_company_invite(p_role text default 'member', p_label text default null)
returns json language plpgsql security definer set search_path = public as $$
declare v_company uuid := public._team_company_for_manager(); v_token text;
begin
  if auth.uid() is null then return json_build_object('ok', false, 'error', 'unauthorized'); end if;
  if v_company is null then return json_build_object('ok', false, 'error', 'not_company'); end if;
  if p_role not in ('admin','member') then return json_build_object('ok', false, 'error', 'bad_role'); end if;
  if (select count(*) from company_invites where company_id = v_company and not revoked and used_at is null and expires_at > now()) >= 20 then
    return json_build_object('ok', false, 'error', 'too_many_invites');
  end if;
  insert into company_invites (company_id, role, created_by, label)
  values (v_company, p_role, auth.uid(), nullif(left(btrim(coalesce(p_label, '')), 60), '')) returning token into v_token;
  return json_build_object('ok', true, 'token', v_token);
end $$;
revoke all on function public.create_company_invite(text, text) from public, anon;
grant execute on function public.create_company_invite(text, text) to authenticated;

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
      select json_agg(json_build_object('user_id', m.user_id, 'name', coalesce(p.full_name, p.company_name_ar),
                                        'phone', case when v_manage then p.phone else null end,
                                        'role', m.role, 'since', m.created_at,
                                        'offers', (select count(*) from offers o where o.submitted_by = m.user_id and o.supplier_id = v_company))
                      order by m.created_at)
      from company_members m join profiles p on p.id = m.user_id
      where m.company_id = v_company and m.status = 'active'), '[]'::json),
    'invites', case when v_manage then coalesce((
      select json_agg(json_build_object('id', i.id, 'token', i.token, 'role', i.role, 'label', i.label, 'expires_at', i.expires_at) order by i.created_at desc)
      from company_invites i
      where i.company_id = v_company and not i.revoked and i.used_at is null and i.expires_at > now()), '[]'::json) else '[]'::json end
  );
end $$;
