-- ============================================================================
-- 062: تحصين الأمان والأداء والخصوصية (مبني على مراجعات خارجية)
--   1) تضمين is_counterparty داخل سياسة profiles (أداء) + فهارس
--   2) إخفاء هوية المقاول في profiles_public + دالة كشف مشروطة (بعد القبول)
--   3) فترة تعتيم (blind period) في ترتيب العروض لمنع القنص بآخر 30 دقيقة
--   4) فهرس فريد للسجل التجاري (مشروط بعدم وجود تكرار)
--   5) عمود approvals (اعتمادات: أرامكو/نيوم/روشن...) + كشفه للموردين
--   6) دالة تنظيف rate_limits
-- ============================================================================

-- ── (5a) عمود الاعتمادات ──
alter table public.profiles add column if not exists approvals text[] default '{}';

-- ── (1) أداء سياسة profiles: استبدال استدعاء الدالة بـ EXISTS مضمّن + فهارس ──
create index if not exists idx_offers_supplier on public.offers(supplier_id);
create index if not exists idx_offers_rfq on public.offers(rfq_id);
create index if not exists idx_rfqs_contractor on public.rfqs(contractor_id);

drop policy if exists profiles_select_owner_admin_counterparty on public.profiles;
create policy profiles_select_owner_admin_counterparty on public.profiles
  for select to authenticated
  using (
    auth.uid() = id
    or is_admin()
    or exists (
      select 1 from public.offers o
      join public.rfqs r on r.id = o.rfq_id
      where (o.supplier_id = profiles.id and r.contractor_id = auth.uid())
         or (o.supplier_id = auth.uid()  and r.contractor_id = profiles.id)
    )
  );

-- ── (2) إخفاء اسم المقاول في العرض العام؛ تظهر أسماء الموردين فقط ──
-- (اسم المقاول يُكشف للمورد فقط بعد قبول عرضه — عبر get_rfq_contractor أدناه)
create or replace view public.profiles_public as
  select id, role,
    case when role <> 'contractor' then company_name_ar else null end as company_name_ar,
    case when role <> 'contractor' then company_name_en else null end as company_name_en,
    supplier_tier, contractor_grade, rating_avg, rating_count, city, region, district,
    verification_status, cr_verification_source, preferred_language, is_active,
    subscription_plan, created_at, approvals
  from public.profiles;

-- كشف هوية المقاول لطلبٍ ما: فقط لصاحب الطلب، أو الأدمن، أو موردٍ قُبل عرضه.
create or replace function public.get_rfq_contractor(p_rfq_id uuid)
returns table(company_name_ar text, company_name_en text, city text, region text, revealed boolean)
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_contractor uuid; v_reveal boolean;
begin
  select r.contractor_id into v_contractor from rfqs r where r.id = p_rfq_id;
  if v_contractor is null then return; end if;
  v_reveal := (
    auth.uid() = v_contractor
    or is_admin()
    or exists (select 1 from offers o where o.rfq_id = p_rfq_id and o.supplier_id = auth.uid() and o.status = 'accepted')
  );
  return query
    select case when v_reveal then p.company_name_ar else null end,
           case when v_reveal then p.company_name_en else null end,
           p.city, p.region, v_reveal
    from profiles p where p.id = v_contractor;
end; $$;
revoke execute on function public.get_rfq_contractor(uuid) from public, anon;
grant  execute on function public.get_rfq_contractor(uuid) to authenticated;

-- ── (3) فترة تعتيم ضد القنص: في آخر 30 دقيقة يُخفى سعر المنافسين (يبقى سعر المورد نفسه) ──
drop function if exists public.get_rfq_offer_ranking(uuid);
create or replace function public.get_rfq_offer_ranking(p_rfq_id uuid)
returns table(total_price numeric, delivery_days integer, is_mine boolean, blind boolean)
language sql
security definer
set search_path to 'public'
as $$
  with rf as (select expires_at from rfqs where id = p_rfq_id),
  bp as (
    select coalesce(
      (select now() > expires_at - interval '30 minutes' and now() < expires_at from rf),
      false) as blind
  )
  select
    case when (select blind from bp) and o.supplier_id <> auth.uid() then null else o.total_price end,
    case when (select blind from bp) and o.supplier_id <> auth.uid() then null else o.delivery_days end,
    (o.supplier_id = auth.uid()) as is_mine,
    (select blind from bp) as blind
  from offers o
  where o.rfq_id = p_rfq_id and o.status <> 'rejected' and o.total_price is not null
  order by o.total_price asc;
$$;
revoke execute on function public.get_rfq_offer_ranking(uuid) from public, anon;
grant  execute on function public.get_rfq_offer_ranking(uuid) to authenticated;

-- ── (4) فهرس فريد للسجل التجاري (يُنشأ فقط لو ما في تكرار حالي) ──
do $$
begin
  if not exists (
    select 1 from (
      select lower(commercial_registration) c
      from profiles
      where commercial_registration is not null and length(trim(commercial_registration)) > 0
      group by 1 having count(*) > 1
    ) d
  ) then
    create unique index if not exists profiles_cr_unique
      on profiles (lower(commercial_registration))
      where commercial_registration is not null and length(trim(commercial_registration)) > 0;
  end if;
end $$;

-- ── (6) تنظيف سجلات تحديد المعدّل القديمة (يستدعيها المالك دورياً أو عبر cron) ──
create or replace function public.cleanup_rate_limits()
returns void
language sql
security definer
set search_path to 'public'
as $$ delete from rate_limits where window_start < now() - interval '2 hours'; $$;
revoke execute on function public.cleanup_rate_limits() from public, anon, authenticated;
