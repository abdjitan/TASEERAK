-- 198 — «مسار العطاء» (tender pricing workspace)
-- A company uploads a tender (BOQ + specifications + drawings); the browser extracts the text,
-- rules read the BOQ and cross-check it against the drawings and the specification, the company
-- reviews and approves item by item, and only approved material items become a price request
-- (through the existing project → request path; project_rfq_id links the result back).
--
-- Tables: tenders, tender_files, tender_items. RLS: the owner (contractor_id = auth.uid()) and
-- admins only. Private storage bucket «tenders», files under «<owner id>/<tender id>/…».
-- Large originals (> 15 MB) are not stored: only the extracted text JSON is.
-- NOT applied automatically — apply with the Supabase MCP apply_migration after review.

-- ── tables ──────────────────────────────────────────────────────────────────────────────────
create table if not exists public.tenders (
  id             uuid primary key default gen_random_uuid(),
  contractor_id  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title          text not null check (char_length(title) between 1 and 200),
  status         text not null default 'draft' check (status in ('draft', 'review', 'sent')),
  project_rfq_id uuid null references public.project_rfqs(id) on delete set null,
  summary        jsonb not null default '{}'::jsonb,   -- counts shown on lists (items by kind, flags by severity)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists tenders_contractor_idx on public.tenders (contractor_id, created_at desc);

create table if not exists public.tender_files (
  id             uuid primary key default gen_random_uuid(),
  tender_id      uuid not null references public.tenders(id) on delete cascade,
  kind           text not null check (kind in ('boq', 'spec', 'drawing', 'other')),
  name           text not null check (char_length(name) between 1 and 255),
  size           bigint not null default 0 check (size >= 0),
  pages          integer null check (pages is null or pages >= 0),
  storage_path   text null,      -- the original (only when ≤ 15 MB)
  extracted_path text null,      -- the extracted text JSON (always, for PDFs)
  summary        jsonb not null default '{}'::jsonb,   -- drawing: title block, rooms, tag counts, legend; spec: section count
  created_at     timestamptz not null default now()
);
create index if not exists tender_files_tender_idx on public.tender_files (tender_id);

create table if not exists public.tender_items (
  id            uuid primary key default gen_random_uuid(),
  tender_id     uuid not null references public.tenders(id) on delete cascade,
  item_key      text not null,                 -- «<sheet>!<row>»: stable reference to the BOQ line
  ref           text null,                     -- NRM ref «14/21 C»
  sheet         text null,
  trade         text null,
  section       text null,
  series        text null,
  row_no        integer null,
  lead_in       text null,
  item_text     text not null default '',
  description   text not null default '',
  unit          text null,
  unit_raw      text null,
  qty           numeric null,
  rate          numeric null,
  amount        numeric null,
  codes         text[] not null default '{}',
  refs          text[] not null default '{}',
  spec_refs     text[] not null default '{}',
  kind          text not null default 'material' check (kind in ('material', 'works', 'provisional', 'header')),
  kind_reason   text null,
  lump_sum      boolean not null default false,
  etimad_code   text null,
  etimad_label  text null,
  sector        text null,
  sub_category  text null,
  product_name  text null,
  specification text null,
  specs         jsonb not null default '{}'::jsonb,
  flags         jsonb not null default '[]'::jsonb,   -- [{code, severity, ar, en, sources[]}]
  links         jsonb not null default '{}'::jsonb,   -- {spec:[{id,title,page,quote}], drawings:[{code,sheet,page,count}]}
  approved      boolean not null default false,
  approved_at   timestamptz null,
  edited        jsonb not null default '{}'::jsonb,   -- {field: original BOQ value} for every field the company changed
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tender_id, item_key)
);
create index if not exists tender_items_tender_idx on public.tender_items (tender_id, kind);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $fn$
begin new.updated_at := now(); return new; end $fn$;

drop trigger if exists tenders_updated_at on public.tenders;
create trigger tenders_updated_at before update on public.tenders for each row execute function public.set_updated_at();
drop trigger if exists tender_items_updated_at on public.tender_items;
create trigger tender_items_updated_at before update on public.tender_items for each row execute function public.set_updated_at();

-- sanity limits (a tender is big, not unbounded)
create or replace function public.tender_limits()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'tender_items' then
    if (select count(*) from tender_items where tender_id = new.tender_id) >= 10000 then
      raise exception 'tender_items_limit';
    end if;
  elsif tg_table_name = 'tender_files' then
    if (select count(*) from tender_files where tender_id = new.tender_id) >= 100 then
      raise exception 'tender_files_limit';
    end if;
  elsif tg_table_name = 'tenders' then
    if (select count(*) from tenders where contractor_id = new.contractor_id and created_at > now() - interval '1 day') >= 30 then
      raise exception 'tenders_daily_limit';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.tender_limits() from public, anon, authenticated;
drop trigger if exists tender_items_limit on public.tender_items;
create trigger tender_items_limit before insert on public.tender_items for each row execute function public.tender_limits();
drop trigger if exists tender_files_limit on public.tender_files;
create trigger tender_files_limit before insert on public.tender_files for each row execute function public.tender_limits();
drop trigger if exists tenders_limit on public.tenders;
create trigger tenders_limit before insert on public.tenders for each row execute function public.tender_limits();

-- a tender's owner never changes, and a project link must be the owner's own project
create or replace function public.tenders_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.contractor_id <> old.contractor_id then
    raise exception 'tender_owner_immutable';
  end if;
  if new.project_rfq_id is not null and (tg_op = 'INSERT' or new.project_rfq_id is distinct from old.project_rfq_id) then
    if not exists (select 1 from project_rfqs p where p.id = new.project_rfq_id and p.contractor_id = new.contractor_id) then
      raise exception 'tender_project_not_owned';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.tenders_guard() from public, anon, authenticated;
drop trigger if exists tenders_guard on public.tenders;
create trigger tenders_guard before insert or update on public.tenders for each row execute function public.tenders_guard();

-- ── RLS ─────────────────────────────────────────────────────────────────────────────────────
alter table public.tenders      enable row level security;
alter table public.tender_files enable row level security;
alter table public.tender_items enable row level security;

drop policy if exists "tenders owner all" on public.tenders;
create policy "tenders owner all" on public.tenders for all to authenticated
  using (contractor_id = auth.uid() or public.is_admin())
  with check (contractor_id = auth.uid() or public.is_admin());

drop policy if exists "tender_files owner all" on public.tender_files;
create policy "tender_files owner all" on public.tender_files for all to authenticated
  using (exists (select 1 from public.tenders t where t.id = tender_id and (t.contractor_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.tenders t where t.id = tender_id and (t.contractor_id = auth.uid() or public.is_admin())));

drop policy if exists "tender_items owner all" on public.tender_items;
create policy "tender_items owner all" on public.tender_items for all to authenticated
  using (exists (select 1 from public.tenders t where t.id = tender_id and (t.contractor_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.tenders t where t.id = tender_id and (t.contractor_id = auth.uid() or public.is_admin())));

revoke all on public.tenders, public.tender_files, public.tender_items from anon;
grant select, insert, update, delete on public.tenders, public.tender_files, public.tender_items to authenticated;

-- ── storage: private bucket «tenders», owner folder ─────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tenders', 'tenders', false, 31457280, array[   -- 30 MB: originals are capped at 15 MB by the app; a big spec's text JSON may be larger
  'application/pdf', 'application/json', 'image/webp', 'image/png', 'image/jpeg',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'
])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "tenders owner read" on storage.objects;
create policy "tenders owner read" on storage.objects for select to authenticated
  using (bucket_id = 'tenders' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "tenders owner insert" on storage.objects;
create policy "tenders owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'tenders' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "tenders owner update" on storage.objects;
create policy "tenders owner update" on storage.objects for update to authenticated
  using (bucket_id = 'tenders' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'tenders' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "tenders owner delete" on storage.objects;
create policy "tenders owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'tenders' and (storage.foldername(name))[1] = auth.uid()::text);
