-- 180: machine translations of user text (owner 2026-10-31: notes and material names are shown in
-- the reader's language). Each (text, language) is translated once and kept here. Server only
-- (service role); nobody reads it directly.
create table if not exists public.text_translations (
  hash text not null,
  lang text not null check (lang in ('ar', 'en', 'ur')),
  src text not null,
  out text not null,
  created_at timestamptz not null default now(),
  primary key (hash, lang)
);
alter table public.text_translations enable row level security;
revoke all on public.text_translations from anon, authenticated;
