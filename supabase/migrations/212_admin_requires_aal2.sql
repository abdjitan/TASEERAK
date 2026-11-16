-- Admin two-step sign-in (owner 2026-11-16). is_admin() is true only for an admin whose session
-- passed the authenticator-app step (JWT aal = 'aal2'), so every admin RPC / RLS path needs the
-- second factor too, not just the /admin pages (middleware) and /admin/mfa.
-- Recovery if the owner loses the phone: delete his row in auth.mfa_factors (service role / SQL editor).
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
     and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;
