-- 144: AI notes on a request line for suppliers (2026-10-13): what the material is and which
-- details a supplier needs that the buyer did not give. Keyed by material + buyer text, so every
-- supplier who opens the same request (and any later identical line) reads it for free.
create table if not exists public.ai_item_notes (
  key          text primary key check (length(key) between 1 and 300),
  product_name text not null,
  result       jsonb not null,
  created_at   timestamptz not null default now()
);
alter table public.ai_item_notes enable row level security;
drop policy if exists ai_item_notes_admin_read on public.ai_item_notes;
create policy ai_item_notes_admin_read on public.ai_item_notes for select to authenticated using (public.is_admin());
revoke all on public.ai_item_notes from anon;
