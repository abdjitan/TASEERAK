-- 286 (owner + legal session 2026-11-25): a VAT number, when entered, must have the Saudi format
-- (15 digits, starting and ending with 3). Empty stays allowed (unregistered sellers sell at a final price).
alter table public.profiles drop constraint if exists profiles_vat_number_format;
alter table public.profiles add constraint profiles_vat_number_format
  check (vat_number is null or btrim(vat_number) = '' or vat_number ~ '^3[0-9]{13}3$') not valid;
alter table public.profiles validate constraint profiles_vat_number_format;
alter table public.profiles add column if not exists vat_verified_at timestamptz;

-- the admin marks a VAT number as checked on ZATCA's site (manual, eServices 007) → «يُصدر فاتورة ضريبية»
create or replace function public.admin_set_vat_verified(p_user uuid, p_verified boolean)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v timestamptz;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  perform set_config('app.bypass_locks', 'on', true);
  update profiles set vat_verified_at = case when p_verified then now() else null end
   where id = p_user and coalesce(btrim(vat_number), '') <> '' returning vat_verified_at into v;
  return v;
end $$;
revoke all on function public.admin_set_vat_verified(uuid, boolean) from public, anon;
grant execute on function public.admin_set_vat_verified(uuid, boolean) to authenticated;

-- only the admin sets vat_verified_at; changing the number clears it
create or replace function public.profiles_vat_verified_guard()
returns trigger language plpgsql as $$
begin
  if new.vat_verified_at is distinct from old.vat_verified_at
     and coalesce(current_setting('app.bypass_locks', true), '') <> 'on' and not public.is_admin() then
    new.vat_verified_at := old.vat_verified_at;
  end if;
  if new.vat_number is distinct from old.vat_number then new.vat_verified_at := null; end if;
  return new;
end $$;
drop trigger if exists profiles_vat_verified_guard on public.profiles;
create trigger profiles_vat_verified_guard before update of vat_number, vat_verified_at on public.profiles
  for each row execute function public.profiles_vat_verified_guard();
