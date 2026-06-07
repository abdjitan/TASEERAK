-- (1) Make ratings real: keep profiles.rating_avg / rating_count in sync with reviews.
create or replace function public.recompute_supplier_rating()
returns trigger language plpgsql security definer as $$
declare target uuid;
begin
  target := coalesce(new.reviewed_id, old.reviewed_id);
  update public.profiles p set
    rating_avg = coalesce((select round(avg(rating)::numeric, 2) from public.reviews r where r.reviewed_id = target), 0),
    rating_count = (select count(*) from public.reviews r where r.reviewed_id = target)
  where p.id = target;
  return coalesce(new, old);
end; $$;

drop trigger if exists on_review_change on public.reviews;
create trigger on_review_change
  after insert or update or delete on public.reviews
  for each row execute function public.recompute_supplier_rating();

-- Backfill existing reviews into profile aggregates.
update public.profiles p set
  rating_avg = coalesce((select round(avg(rating)::numeric, 2) from public.reviews r where r.reviewed_id = p.id), 0),
  rating_count = (select count(*) from public.reviews r where r.reviewed_id = p.id);

-- (2) Supplier performance scorecard (aggregates only — no individual rows exposed).
create or replace function public.get_supplier_stats(ids uuid[])
returns table (
  supplier_id uuid,
  total_offers int,
  accepted_offers int,
  avg_response_hours numeric,
  won_rate numeric
) language sql security definer stable as $$
  select o.supplier_id,
    count(*)::int,
    count(*) filter (where o.status = 'accepted')::int,
    round(avg(extract(epoch from (o.created_at - r.created_at)) / 3600.0)::numeric, 1),
    round((count(*) filter (where o.status = 'accepted')::numeric / nullif(count(*), 0) * 100), 0)
  from public.offers o
  join public.rfqs r on r.id = o.rfq_id
  where o.supplier_id = any(ids)
  group by o.supplier_id;
$$;

grant execute on function public.get_supplier_stats(uuid[]) to authenticated, anon;
