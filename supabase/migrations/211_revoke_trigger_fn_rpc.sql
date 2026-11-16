-- Launch hardening (owner 2026-11-16, security advisor): notifications_mark_wa() is a trigger
-- function (migration 206); it must not be reachable as /rest/v1/rpc/notifications_mark_wa.
-- Triggers keep working without EXECUTE for API roles.
revoke all on function public.notifications_mark_wa() from public, anon, authenticated;
