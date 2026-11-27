-- 295 (round-8 supplier side)
-- UX-027: saved prices remember their VAT basis ('incl' = includes VAT, 'final' = unregistered seller's final price).
-- UX-139: after the deadline a seller can learn whether his offer was the lowest / in the top three (never numbers).
-- UX-007: renewing an expired price also works after the deadline while the buyer has not chosen yet.
alter table public.live_prices add column if not exists vat_basis text check (vat_basis in ('incl', 'final'));
update public.live_prices lp set vat_basis = case when coalesce(btrim(p.vat_number), '') = '' then 'final' else 'incl' end
  from public.profiles p where p.id = lp.supplier_id and lp.vat_basis is null;

create or replace function public.my_offer_position(p_offer_id uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare v offers; r rfqs; v_rank int; v_n int;
begin
  select * into v from offers where id = p_offer_id;
  if not found or v.supplier_id is distinct from public.acting_uid() then return null; end if;
  select * into r from rfqs where id = v.rfq_id;
  if r.expires_at is null or r.expires_at > now() then return null; end if;
  if v.status::text not in ('pending', 'accepted', 'rejected') then return null; end if;
  select count(*) into v_n from offers o where o.rfq_id = r.id and o.status::text in ('pending', 'accepted', 'rejected');
  if v_n < 3 then return null; end if;
  select count(*) + 1 into v_rank from offers o
   where o.rfq_id = r.id and o.status::text in ('pending', 'accepted', 'rejected') and o.id <> v.id
     and public.offer_buyer_total(o) < public.offer_buyer_total(v);
  return case when v_rank = 1 then 'lowest' when v_rank <= 3 then 'top3' else null end;
end $$;
revoke all on function public.my_offer_position(uuid) from public, anon;
grant execute on function public.my_offer_position(uuid) to authenticated;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.renew_offer_validity(uuid, integer)'::regprocedure);
  d := replace(d, 'if r.status::text <> ''open'' then raise exception ''الطلب لم يعد مفتوحاً.''; end if;',
    'if r.status::text not in (''open'', ''expired'') or exists (select 1 from offers x where x.rfq_id = r.id and x.status = ''accepted'') then raise exception ''الطلب لم يعد مفتوحاً.''; end if;');
  if position('''expired''' in d) = 0 then raise exception 'anchor not found'; end if;
  execute d;
end $$;
