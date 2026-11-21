-- 243: an invite sign-up counts only for an account created in the last 2 days, so an existing
-- seller who opens /join is not counted as a new sign-up (mobile review 2026-11-21).
create or replace function public.claim_invite_signup(p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  if not exists (select 1 from profiles where id = auth.uid() and role::text = 'supplier' and created_at > now() - interval '2 days') then return; end if;
  insert into invite_link_events (code, event, user_id) values (public.clean_invite_code(p_code), 'signup', auth.uid())
  on conflict do nothing;
end $$;
revoke all on function public.claim_invite_signup(text) from public, anon;
grant execute on function public.claim_invite_signup(text) to authenticated;
