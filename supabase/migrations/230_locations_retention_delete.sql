-- Legal review of 229 (2026-11-18): keep the approximate-location log 90 days (not 180), and erase
-- it with the account (delete_my_account / admin_close_account also clear the signup_/last_ fields).
create or replace function public.purge_user_locations()
returns void language sql security definer set search_path = public as $$
  delete from user_locations where at < now() - interval '90 days'
$$;

do $$
declare f text; d text; n text;
begin
  foreach f in array array['public.delete_my_account()', 'public.admin_close_account(uuid)'] loop
    d := pg_get_functiondef(f::regprocedure);
    n := replace(d, 'perform set_config(''app.bypass_locks'', ''on'', true);',
      'perform set_config(''app.bypass_locks'', ''on'', true);
  delete from user_locations where user_id = v_uid;
  update profiles set signup_country = null, signup_city = null, last_country = null, last_city = null, last_location_at = null where id = v_uid;');
    if n = d then raise exception '%: anchor not found', f; end if;
    execute n;
  end loop;
end $$;
