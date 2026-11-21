-- 251: buyer type (owner 2026-11-21, tester feedback: homeowners get lost in technical details).
-- 'individual' = simple request flow (specs optional, extra options folded); 'business' = full flow.
-- Asked once on the request page; the user can change it later. Not a locked field.
alter table public.profiles add column if not exists buyer_type text check (buyer_type in ('individual', 'business'));
