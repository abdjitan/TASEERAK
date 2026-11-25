-- 285 (round-6 audit, server side)
-- UX-002: an independent seller's (pricing agent) exact location and district are never public: only the city.
-- UX-003: the admin can close (cancel) a deal: offers.deal_closed_at/deal_closed_reason, admin_close_deal();
--         deal-stage actions are refused afterwards, both parties are told.
create or replace view public.profiles_public as
SELECT id,
    role,
        CASE
            WHEN role <> 'contractor'::user_role THEN company_name_ar
            ELSE NULL::text
        END AS company_name_ar,
        CASE
            WHEN role <> 'contractor'::user_role THEN company_name_en
            ELSE NULL::text
        END AS company_name_en,
    supplier_tier,
    contractor_grade,
    rating_avg,
    rating_count,
    city,
    region,
        CASE
            WHEN COALESCE(provider_type, ''::text) = ANY (ARRAY['individual'::text, 'broker'::text, 'price_agent'::text]) THEN NULL::text
            ELSE district
        END AS district,
    verification_status,
    cr_verification_source,
    preferred_language,
    is_active,
    subscription_plan,
    created_at,
    approvals,
        CASE
            WHEN role = 'supplier'::user_role THEN
            CASE
                WHEN provider_type = ANY (ARRAY['individual'::text, 'broker'::text, 'price_agent'::text]) THEN NULL::numeric
                ELSE latitude
            END
            ELSE NULL::numeric
        END AS latitude,
        CASE
            WHEN role = 'supplier'::user_role THEN
            CASE
                WHEN provider_type = ANY (ARRAY['individual'::text, 'broker'::text, 'price_agent'::text]) THEN NULL::numeric
                ELSE longitude
            END
            ELSE NULL::numeric
        END AS longitude,
        CASE
            WHEN role = 'supplier'::user_role AND (COALESCE(provider_type, ''::text) <> ALL (ARRAY['individual'::text, 'broker'::text, 'price_agent'::text])) THEN national_short_address
            ELSE NULL::text
        END AS national_short_address
   FROM profiles;

alter table public.offers add column if not exists deal_closed_at timestamptz;
alter table public.offers add column if not exists deal_closed_reason text;

create or replace function public.offers_block_closed_deal()
returns trigger language plpgsql as $$
begin
  if old.deal_closed_at is not null and (
       new.supplier_invoice_url is distinct from old.supplier_invoice_url
    or new.supplier_delivered_at is distinct from old.supplier_delivered_at
    or new.received_at is distinct from old.received_at
    or new.payment_status is distinct from old.payment_status
    or new.payment_confirmed_at is distinct from old.payment_confirmed_at) then
    raise exception 'أُلغيت هذه الصفقة بقرار الإدارة، فلا يمكن متابعة خطواتها.';
  end if;
  return new;
end $$;
drop trigger if exists offers_block_closed_deal on public.offers;
create trigger offers_block_closed_deal before update on public.offers
  for each row execute function public.offers_block_closed_deal();

create or replace function public.admin_close_deal(p_offer_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v offers; r rfqs; v_label text;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if coalesce(btrim(p_reason), '') = '' then raise exception 'سبب الإلغاء مطلوب'; end if;
  select * into v from offers where id = p_offer_id for update;
  if not found then raise exception 'العرض غير موجود'; end if;
  if v.status <> 'accepted' then raise exception 'الصفقة غير نشطة'; end if;
  if v.deal_closed_at is not null then raise exception 'أُلغيت هذه الصفقة مسبقاً'; end if;
  perform set_config('app.deal_write', 'on', true);
  update offers set deal_closed_at = now(), deal_closed_reason = left(btrim(p_reason), 500),
                    dispute_status = case when dispute_status = 'open' then 'resolved' else dispute_status end
   where id = p_offer_id returning * into v;
  select * into r from rfqs where id = v.rfq_id;
  v_label := public.rfq_label(r);
  begin
    insert into notifications (user_id, type, title, body, data) values
      (v.supplier_id, 'offer_accepted', 'أُلغيت الصفقة بقرار الإدارة',
       'أُلغيت صفقة «' || v_label || '» بقرار الإدارة: ' || left(btrim(p_reason), 300) || '. لا تسلّم بضاعة هذه الصفقة.',
       jsonb_build_object('url', '/supplier/dashboard/rfq/' || r.id::text, 'rfq_id', r.id, 'offer_id', v.id, 'kind', 'deal_closed')),
      (r.contractor_id, 'offer_accepted', 'أُلغيت الصفقة بقرار الإدارة',
       'أُلغيت صفقة «' || v_label || '» بقرار الإدارة: ' || left(btrim(p_reason), 300) || '.',
       jsonb_build_object('url', '/contractor/orders/' || v.id::text, 'rfq_id', r.id, 'offer_id', v.id, 'kind', 'deal_closed'));
  exception when others then
    begin insert into public.system_errors_log (context, message, user_id) values ('admin_close_deal.notify', left(sqlerrm, 500), auth.uid()); exception when others then null; end;
  end;
  return to_jsonb(v);
end $$;
revoke all on function public.admin_close_deal(uuid, text) from public, anon;
grant execute on function public.admin_close_deal(uuid, text) to authenticated;
