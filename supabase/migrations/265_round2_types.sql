-- 265a (round-2 audit UX-121): a request edited after pricing is not a rejection. New notification type
-- 'rfq_changed' (the web/app bell already map it). Must commit before 265 uses it.
alter type public.notification_type add value if not exists 'rfq_changed';
