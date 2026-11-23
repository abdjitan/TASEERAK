-- 263 (round-2 audit UX-001, critical): the round-1 notifications used types missing from notification_type
-- (rfq_deadline, price_expiring, dispute_opened), so every insert failed and was swallowed. Add the values.
alter type public.notification_type add value if not exists 'rfq_deadline';
alter type public.notification_type add value if not exists 'price_expiring';
alter type public.notification_type add value if not exists 'dispute_opened';
