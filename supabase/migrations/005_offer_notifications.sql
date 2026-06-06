-- =============================================
-- 005 — AUTOMATIC OFFER NOTIFICATIONS (in-app)
--
-- PROBLEM: offers are inserted/updated directly from the browser.
-- The notifications table's RLS only lets a user write notifications
-- for THEMSELVES, so a supplier could not create a notification for
-- the contractor (and vice-versa). Result: nobody got notified.
--
-- FIX: database triggers (SECURITY DEFINER) create the notification
-- server-side, bypassing that limitation — works with the current
-- client-side flow with ZERO app-code changes.
--
-- Run in Supabase → SQL Editor. Safe to re-run.
-- =============================================

-- 1) New offer  →  notify the contractor
create or replace function notify_contractor_new_offer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contractor uuid;
  v_product text;
begin
  select contractor_id, product_name
    into v_contractor, v_product
  from rfqs where id = NEW.rfq_id;

  if v_contractor is not null then
    insert into notifications (user_id, type, title, body, data)
    values (
      v_contractor,
      'rfq_offer',
      'عرض سعر جديد',
      'وصلك عرض جديد على "' || coalesce(v_product, 'طلبك') ||
        '" بسعر ' || coalesce(NEW.total_price::text, '') || ' ر.س',
      jsonb_build_object('rfq_id', NEW.rfq_id, 'offer_id', NEW.id)
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_offer_insert_notify on offers;
create trigger on_offer_insert_notify
  after insert on offers
  for each row execute function notify_contractor_new_offer();

-- 2) Offer accepted / rejected  →  notify the supplier
create or replace function notify_supplier_offer_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.status is distinct from OLD.status then
    if NEW.status = 'accepted' then
      insert into notifications (user_id, type, title, body, data)
      values (
        NEW.supplier_id, 'offer_accepted', 'تم قبول عرضك! 🎉',
        'قبل المقاول عرضك — تواصل معه لتنسيق التسليم',
        jsonb_build_object('offer_id', NEW.id, 'rfq_id', NEW.rfq_id)
      );
    elsif NEW.status = 'rejected' then
      insert into notifications (user_id, type, title, body, data)
      values (
        NEW.supplier_id, 'offer_rejected', 'لم يتم قبول عرضك',
        'اختار المقاول مورداً آخر في هذا الطلب',
        jsonb_build_object('offer_id', NEW.id, 'rfq_id', NEW.rfq_id)
      );
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_offer_status_notify on offers;
create trigger on_offer_status_notify
  after update on offers
  for each row execute function notify_supplier_offer_status();
