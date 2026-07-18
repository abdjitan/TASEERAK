-- SECURITY: the offers INSERT policy only checked (supplier_id = auth.uid()), so ANY
-- authenticated user — a contractor, or an unverified supplier — could insert an offer,
-- contradicting the product promise "verified suppliers only". The intended role+verified
-- checks lived solely in the UNUSED /api/offers route; the client inserts directly via the
-- Supabase client, bypassing it. Enforce the checks in RLS where they actually apply.
-- (Existing offers are unaffected — this governs INSERT only.)

create or replace function public.is_verified_supplier()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'supplier'
      and (verification_status = 'verified' or coalesce(cr_verification_source, '') = 'wathq')
  );
$$;

revoke all on function public.is_verified_supplier() from public, anon;
grant execute on function public.is_verified_supplier() to authenticated;

drop policy if exists "Suppliers create own offers" on public.offers;
create policy "Suppliers create own offers" on public.offers
  for insert
  with check (supplier_id = auth.uid() and public.is_verified_supplier());
