-- Add the 'new_rfq' value to the notification_type enum (separate migration:
-- Postgres can't use a freshly added enum value in the same transaction it's
-- added, so the trigger that uses it lives in 049).
alter type public.notification_type add value if not exists 'new_rfq';
