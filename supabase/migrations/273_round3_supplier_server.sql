-- 273 (round-3 supplier side)
-- UX-044: a company team member sends a question about a request to the account owner.
-- UX-014: a pricing agent («وسيط تسعير») can never quote «من مخزوني» (header or any line).
create or replace function public.notify_company_owner(p_rfq_id uuid, p_message text)
returns void language plpgsql security definer set search_path = public as $$
declare v_company uuid; r rfqs; v_name text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if coalesce(btrim(p_message), '') = '' then raise exception 'السؤال فارغ'; end if;
  select company_id into v_company from company_members where user_id = auth.uid() and status = 'active' limit 1;
  if v_company is null then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into r from rfqs where id = p_rfq_id;
  if not found then raise exception 'الطلب غير موجود'; end if;
  select coalesce(nullif(full_name, ''), 'أحد أعضاء فريقك') into v_name from profiles where id = auth.uid();
  insert into notifications (user_id, type, title, body, data)
  values (v_company, 'new_message', 'سؤال من ' || v_name,
    v_name || ' يسأل عن «' || public.rfq_label(r) || '»: ' || left(btrim(p_message), 500),
    jsonb_build_object('url', '/supplier/dashboard/rfq/' || p_rfq_id::text, 'rfq_id', p_rfq_id, 'kind', 'team_question', 'team_copy', 'true'));
end $$;
revoke all on function public.notify_company_owner(uuid, text) from public, anon;
grant execute on function public.notify_company_owner(uuid, text) to authenticated;

create or replace function public.offers_no_own_stock_for_agents()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from profiles where id = new.supplier_id and provider_type in ('individual', 'broker', 'price_agent'))
     and (new.source_type = 'own_stock'
          or (jsonb_typeof(new.item_prices) = 'array'
              and exists (select 1 from jsonb_array_elements(new.item_prices) it where it->>'source_type' = 'own_stock'))) then
    raise exception 'وسيط التسعير لا يبيع من مخزونه، فاختر مصدر السعر.';
  end if;
  return new;
end $$;
drop trigger if exists offers_no_own_stock_for_agents on public.offers;
create trigger offers_no_own_stock_for_agents before insert or update of source_type, item_prices on public.offers
  for each row execute function public.offers_no_own_stock_for_agents();
