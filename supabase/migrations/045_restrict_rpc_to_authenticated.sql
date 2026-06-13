-- 045: Login-required action RPCs — remove the implicit PUBLIC EXECUTE grant
-- (which let anon inherit access) and grant only to authenticated.
-- These all enforce auth.uid() internally; this closes the anon path the
-- linter flagged. Registration helpers (cr_exists, phone_exists), the
-- public objection form (report_cr_objection), the rate-limit helper, and the
-- internal RLS helpers (is_admin, is_counterparty) intentionally stay
-- callable by anon and are left untouched.
do $$
declare
  f text;
  fns text[] := array[
    'public.accept_offer(uuid)',
    'public.submit_price_reduction(uuid, numeric)',
    'public.request_price_reduction(uuid, integer, text)',
    'public.request_offer_info(uuid, text)',
    'public.respond_offer_info(uuid, text)',
    'public.request_profile_change(text, text, text, text)',
    'public.review_profile_change(uuid, boolean, text)'
  ];
begin
  foreach f in array fns loop
    execute format('revoke execute on function %s from public;', f);
    execute format('revoke execute on function %s from anon;', f);
    execute format('grant execute on function %s to authenticated;', f);
  end loop;
end $$;
