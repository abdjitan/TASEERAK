-- 163: deal reminder titles without emoji, «أبلغ عن مشكلة» wording (live review 2026-10-17).
CREATE OR REPLACE FUNCTION public.generate_deal_reminders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
  r record;
  dd int;
  v_prod text;
  v_url_sup text;
  v_url_con text;
BEGIN
  FOR r IN
    SELECT o.id AS offer_id, o.rfq_id, o.supplier_id, o.delivery_days, o.accepted_at,
           o.supplier_delivered_at, o.received_at,
           rq.contractor_id, public.rfq_label(rq) as product_name
    FROM offers o
    JOIN rfqs rq ON rq.id = o.rfq_id
    WHERE o.status = 'accepted'
      AND (o.dispute_status IS DISTINCT FROM 'open')
      AND o.accepted_at IS NOT NULL
      AND o.received_at IS NULL
  LOOP
    dd := GREATEST(COALESCE(r.delivery_days, 3), 1);
    v_prod := COALESCE(NULLIF(r.product_name, ''), 'الطلب');
    v_url_sup := '/supplier/dashboard/rfq/' || r.rfq_id::text;
    v_url_con := '/contractor/rfq/' || r.rfq_id::text || '/offer/' || r.offer_id::text;

    -- (1) تأخّر التوصيل: المورد لم يؤكّد التسليم بعد انتهاء المدة المتّفق عليها
    IF r.supplier_delivered_at IS NULL AND r.accepted_at + make_interval(days => dd) < now() THEN
      IF NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = r.supplier_id AND type = 'reminder_deliver' AND data->>'offer_id' = r.offer_id::text AND (created_at > now() - interval '24 hours' OR (SELECT count(*) FROM notifications n2 WHERE n2.user_id = notifications.user_id AND n2.type = notifications.type AND n2.data->>'offer_id' = notifications.data->>'offer_id') >= 3)) THEN
        INSERT INTO notifications(user_id, type, title, body, data) VALUES (
          r.supplier_id, 'reminder_deliver', 'تذكير: أكّد التوصيل',
          'انتهت مدة التوصيل المتّفق عليها ولم تؤكّد تسليم «' || v_prod || '». يرجى تأكيد التسليم أو التواصل مع المشتري.',
          jsonb_build_object('rfq_id', r.rfq_id, 'offer_id', r.offer_id, 'url', v_url_sup));
        v_count := v_count + 1;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = r.contractor_id AND type = 'reminder_deliver' AND data->>'offer_id' = r.offer_id::text AND (created_at > now() - interval '24 hours' OR (SELECT count(*) FROM notifications n2 WHERE n2.user_id = notifications.user_id AND n2.type = notifications.type AND n2.data->>'offer_id' = notifications.data->>'offer_id') >= 3)) THEN
        INSERT INTO notifications(user_id, type, title, body, data) VALUES (
          r.contractor_id, 'reminder_deliver', 'التوصيل متأخّر',
          'المورد لم يؤكّد توصيل «' || v_prod || '» بعد انتهاء المدة. تابع معه، أو أبلغ عن مشكلة من صفحة الصفقة.',
          jsonb_build_object('rfq_id', r.rfq_id, 'offer_id', r.offer_id, 'url', v_url_con));
        v_count := v_count + 1;
      END IF;

    -- (2) بانتظار تأكيد الاستلام: المورد أكّد التسليم والمشتري لم يؤكّد الاستلام خلال 48 ساعة
    ELSIF r.supplier_delivered_at IS NOT NULL AND r.supplier_delivered_at + interval '48 hours' < now() THEN
      IF NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = r.contractor_id AND type = 'reminder_receipt' AND data->>'offer_id' = r.offer_id::text AND (created_at > now() - interval '24 hours' OR (SELECT count(*) FROM notifications n2 WHERE n2.user_id = notifications.user_id AND n2.type = notifications.type AND n2.data->>'offer_id' = notifications.data->>'offer_id') >= 3)) THEN
        INSERT INTO notifications(user_id, type, title, body, data) VALUES (
          r.contractor_id, 'reminder_receipt', 'تذكير: أكّد الاستلام',
          'أكّد المورد توصيل «' || v_prod || '». يرجى تأكيد الاستلام أو الإبلاغ عن مشكلة من صفحة الصفقة.',
          jsonb_build_object('rfq_id', r.rfq_id, 'offer_id', r.offer_id, 'url', v_url_con));
        v_count := v_count + 1;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = r.supplier_id AND type = 'reminder_receipt' AND data->>'offer_id' = r.offer_id::text AND (created_at > now() - interval '24 hours' OR (SELECT count(*) FROM notifications n2 WHERE n2.user_id = notifications.user_id AND n2.type = notifications.type AND n2.data->>'offer_id' = notifications.data->>'offer_id') >= 3)) THEN
        INSERT INTO notifications(user_id, type, title, body, data) VALUES (
          r.supplier_id, 'reminder_receipt', 'بانتظار تأكيد الاستلام',
          'بانتظار تأكيد المشتري لاستلام «' || v_prod || '». يمكنك متابعته من صفحة الصفقة.',
          jsonb_build_object('rfq_id', r.rfq_id, 'offer_id', r.offer_id, 'url', v_url_sup));
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$function$;
