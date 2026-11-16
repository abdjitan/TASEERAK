-- Commercial registration on the sign-up form (owner 2026-11-16, legal review the same day):
-- optional, company/shop sellers only (not pricing agents). handle_new_user saves it from the
-- sign-up metadata; the CR rules still apply (normalize_cr, one CR = one account through
-- profiles_cr_one_holder + cr_guard). A taken CR never blocks the sign-up: the account is created
-- without it (logged) and the person can claim it from /verification/claim.
-- cr_exists (the live "already on Taseerak?" check, yes/no only) is limited to 10 checks per hour
-- per IP; every check is counted in rate_limits for abuse review.
do $$
declare d text := pg_get_functiondef('public.handle_new_user'::regproc); n text;
begin
  n := replace(d, '  begin update profiles set vat_number=nullif(m->>''vat_number'','''') where id=new.id',
    '  begin
    if v_role = ''supplier'' and coalesce(m->>''seller_kind'', '''') <> ''independent''
       and length(coalesce(public.normalize_cr(m->>''commercial_registration''), '''')) = 10 then
      update profiles set commercial_registration = public.normalize_cr(m->>''commercial_registration'') where id = new.id;
    end if;
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values (''handle_new_user.cr'', sqlerrm, new.id); exception when others then null; end;
  end;
  begin update profiles set vat_number=nullif(m->>''vat_number'','''') where id=new.id');
  if n = d then raise exception 'handle_new_user: pattern not found'; end if;
  execute n;
end $$;

create or replace function public.cr_exists(p_cr text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public._rate_limit_hit('cr_exists:' || public.client_ip(), 10, 3600) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return exists(select 1 from public.profiles
                where commercial_registration = public.normalize_cr(p_cr)
                  and public.normalize_cr(p_cr) is not null
                  and verification_status <> 'rejected');
end $$;
