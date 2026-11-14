-- One-time link for the mobile app's phone verification (owner 2026-11-14): the app asks
-- /api/phone/start (Bearer) for a 10-minute single-use token and opens taseerak.com/phone-verify?h=…
-- in the in-app browser; the page verifies the SMS code and /api/phone/confirm accepts the token
-- instead of a site session. Service role only.
create table if not exists public.phone_handoffs (
  token      text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at    timestamptz
);
alter table public.phone_handoffs enable row level security;
revoke all on public.phone_handoffs from anon, authenticated;
create index if not exists phone_handoffs_user_idx on public.phone_handoffs (user_id);
