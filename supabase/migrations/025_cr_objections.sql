-- Lets someone report that a registered CR is a fake/fraudulent account using
-- their company's registration. Submitted pre-auth via a SECURITY DEFINER RPC;
-- only admins can read/manage.
create table if not exists public.cr_objections (
  id uuid primary key default gen_random_uuid(),
  commercial_registration text not null,
  existing_company text,
  reporter_name text,
  reporter_phone text,
  reporter_email text,
  reason text,
  status text not null default 'open',  -- open | reviewed | dismissed
  created_at timestamptz not null default now()
);
alter table public.cr_objections enable row level security;
create policy "cr_objections admin read" on public.cr_objections for select using (is_admin());
create policy "cr_objections admin update" on public.cr_objections for update using (is_admin()) with check (is_admin());

create or replace function public.report_cr_objection(p_cr text, p_name text, p_phone text, p_email text, p_reason text)
returns void language plpgsql security definer as $$
declare existing text;
begin
  if coalesce(p_cr,'') = '' then return; end if;
  select company_name_ar into existing from public.profiles
    where commercial_registration = p_cr order by created_at asc limit 1;
  insert into public.cr_objections (commercial_registration, existing_company, reporter_name, reporter_phone, reporter_email, reason)
  values (p_cr, existing, nullif(p_name,''), nullif(p_phone,''), nullif(p_email,''), nullif(p_reason,''));
end; $$;
grant execute on function public.report_cr_objection(text,text,text,text,text) to anon, authenticated;
