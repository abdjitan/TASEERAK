-- 145 (security audit H2, 2026-10-13): the buyer's precise delivery location leaked to every
-- supplier who could see a request: the rfqs SELECT policy returns whole rows, so
-- from('rfqs').select('delivery_location,delivery_geo') bypassed get_rfq_for_viewer's stripping.
--
-- The two values now live in rfq_private (owner, admin, and the supplier who won only). A trigger
-- moves them there on every insert/update and leaves the rfqs columns empty, so existing
-- select('*') readers (web + mobile) keep working and simply see null.

create table if not exists public.rfq_private (
  rfq_id            uuid primary key references public.rfqs(id) on delete cascade deferrable initially deferred,
  delivery_location text,
  delivery_geo      text,
  updated_at        timestamptz not null default now()
);
alter table public.rfq_private enable row level security;
revoke all on public.rfq_private from anon;
grant select on public.rfq_private to authenticated;

-- may this user see the precise delivery location of this request?
create or replace function public.can_see_rfq_location(p_rfq_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin()
      or exists (select 1 from rfqs r where r.id = p_rfq_id and r.contractor_id = (select auth.uid()))
      or exists (select 1 from offers o where o.rfq_id = p_rfq_id and o.supplier_id = public.acting_uid() and o.status = 'accepted')
$$;
revoke execute on function public.can_see_rfq_location(uuid) from public, anon;
grant execute on function public.can_see_rfq_location(uuid) to authenticated;

drop policy if exists rfq_private_read on public.rfq_private;
create policy rfq_private_read on public.rfq_private for select to authenticated using (public.can_see_rfq_location(rfq_id));

-- every write of a location goes to rfq_private; the public row keeps nulls
create or replace function public.move_rfq_location()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.delivery_location is not null or new.delivery_geo is not null then
    insert into rfq_private (rfq_id, delivery_location, delivery_geo, updated_at)
    values (new.id, new.delivery_location, new.delivery_geo, now())
    on conflict (rfq_id) do update
      set delivery_location = coalesce(excluded.delivery_location, rfq_private.delivery_location),
          delivery_geo      = coalesce(excluded.delivery_geo, rfq_private.delivery_geo),
          updated_at        = now();
    new.delivery_location := null;
    new.delivery_geo := null;
  end if;
  return new;
end $$;
revoke execute on function public.move_rfq_location() from public, anon, authenticated;
drop trigger if exists zz_move_rfq_location on public.rfqs;
create trigger zz_move_rfq_location before insert or update of delivery_location, delivery_geo on public.rfqs
  for each row execute function public.move_rfq_location();

-- existing rows
insert into public.rfq_private (rfq_id, delivery_location, delivery_geo)
select id, delivery_location, delivery_geo from public.rfqs
where delivery_location is not null or delivery_geo is not null
on conflict (rfq_id) do nothing;
update public.rfqs set delivery_location = null, delivery_geo = null
where delivery_location is not null or delivery_geo is not null;

-- the supplier view adds the location back only for the owner / admin / supplier who won
create or replace function public.get_rfq_for_viewer(p_rfq_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare r rfqs; v_owner boolean; v_award boolean; v_see boolean; v_served text[]; result jsonb; v_act uuid := public.acting_uid(); p rfq_private;
begin
  select * into r from rfqs where id = p_rfq_id;
  if r.id is null then return null; end if;
  v_served := public.served_regions(v_act);
  v_owner := (r.contractor_id = auth.uid()) or public.is_admin();
  v_award := v_owner
    or exists (select 1 from offers o where o.rfq_id = p_rfq_id and o.supplier_id = v_act and o.status = 'accepted')
    or exists (select 1 from rfq_item_awards a where a.rfq_id = p_rfq_id and a.supplier_id = v_act);
  v_see := v_award
    or exists (select 1 from offers o where o.rfq_id = p_rfq_id and o.supplier_id = v_act)
    or (
      (coalesce(r.nearby_only, false) = false or cardinality(v_served) = 0 or r.region = any(v_served))
      and (r.target_regions is null or cardinality(r.target_regions) = 0 or v_served && r.target_regions)
    );
  if not v_see then return null; end if;
  result := to_jsonb(r);
  if v_award then
    select * into p from rfq_private where rfq_id = p_rfq_id;
    result := result || jsonb_build_object('delivery_location', p.delivery_location, 'delivery_geo', p.delivery_geo);
  else
    result := result - 'delivery_geo' - 'delivery_location';
  end if;
  if not v_owner then result := result - 'contractor_id'; end if;
  return result;
end $$;
