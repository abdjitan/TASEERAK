-- 164: one mobile number = one account (owner 2026-10-17: a number registered as a supplier cannot
-- open a buyer account). Until now only the signup form checked it. The key is the last 9 digits,
-- so «05XXXXXXXX», «+9665XXXXXXXX» and «9665XXXXXXXX» are the same number. Deleted accounts have
-- phone NULL/'' (delete_my_account), which frees the number.
create unique index if not exists profiles_phone_unique
  on public.profiles (right(regexp_replace(phone, '\D', '', 'g'), 9))
  where coalesce(phone, '') <> '';

-- the signup form's duplicate check uses the same rule
create or replace function public.phone_exists(p_phone text)
returns boolean
language plpgsql volatile security definer set search_path = public
as $$
begin
  if not public.check_rate_limit('phone_exists:' || public.client_ip(), 120, 3600) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return coalesce(p_phone, '') <> '' and exists(
    select 1 from public.profiles
     where coalesce(phone, '') <> ''
       and right(regexp_replace(phone, '\D', '', 'g'), 9) = right(regexp_replace(p_phone, '\D', '', 'g'), 9));
end; $$;
