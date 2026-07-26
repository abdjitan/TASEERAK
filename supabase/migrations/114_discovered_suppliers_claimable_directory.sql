-- Cold-start / liquidity seeding: persist discovered (Google Places) suppliers as CLAIMABLE
-- directory listings so /suppliers shows density before real suppliers register, and a
-- supplier can "claim" their listing by registering. Contact details (phone/email/website/
-- address) are admin-only and NEVER exposed publicly (anti-disintermediation) — the public
-- directory function returns identity-safe fields only.

create table if not exists public.discovered_suppliers (
  id             uuid primary key default gen_random_uuid(),
  place_id       text unique,
  name           text not null,
  category       text,
  sector         text,
  region         text,
  city           text,
  address        text,
  phone          text,
  email          text,
  website        text,
  lat            double precision,
  lng            double precision,
  google_rating  numeric,
  google_reviews integer,
  maps_url       text,
  status         text,
  invited        boolean default false,
  invited_at     timestamptz,
  claimed_by     uuid references public.profiles(id) on delete set null,
  claimed_at     timestamptz,
  is_listed      boolean default true,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz default now()
);
create index if not exists idx_discsup_region on public.discovered_suppliers(region);
create index if not exists idx_discsup_claimed on public.discovered_suppliers(claimed_by);
create index if not exists idx_discsup_phone on public.discovered_suppliers(phone);

alter table public.discovered_suppliers enable row level security;

drop policy if exists "admin manage discovered suppliers" on public.discovered_suppliers;
create policy "admin manage discovered suppliers" on public.discovered_suppliers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.get_directory_listings(p_region text default null, p_sector text default null)
returns table(
  id uuid, name text, category text, sector text, region text, city text,
  google_rating numeric, google_reviews integer
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select id, name, category, sector, region, city, google_rating, google_reviews
  from discovered_suppliers
  where is_listed and claimed_by is null
    and (p_region is null or region = p_region)
    and (p_sector is null or sector = p_sector)
  order by google_rating desc nulls last, google_reviews desc nulls last, created_at desc
  limit 300;
$$;
revoke all on function public.get_directory_listings(text, text) from public;
grant execute on function public.get_directory_listings(text, text) to anon, authenticated;

-- Auto-claim: when a profile's phone matches a discovered listing, link it (so the listing
-- graduates from "claimable" to a real registered supplier and leaves the public listings).
create or replace function public.claim_discovered_on_profile()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_norm text;
begin
  if new.phone is null or new.phone = '' then return new; end if;
  v_norm := regexp_replace(new.phone, '[^0-9]', '', 'g');
  update discovered_suppliers d
     set claimed_by = new.id, claimed_at = now()
   where d.claimed_by is null
     and d.phone is not null
     and regexp_replace(d.phone, '[^0-9]', '', 'g') like '%' || right(v_norm, 9);
  return new;
end; $$;

drop trigger if exists trg_claim_discovered on public.profiles;
create trigger trg_claim_discovered
  after insert or update of phone on public.profiles
  for each row execute function public.claim_discovered_on_profile();
