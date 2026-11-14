-- WhatsApp notifications (owner 2026-11-14): the approved UTILITY templates go out from the
-- Taseerak number next to push/email. Sent by the `notify` edge function.
--   notify_config.whatsapp_enabled  master switch (off until the owner approves the cost)
--   profiles.whatsapp_notifications per-person opt-out (settings page), on by default
--   whatsapp_sends                  throttle + audit (service role only)

alter table public.notify_config add column if not exists whatsapp_enabled boolean not null default false;
alter table public.profiles add column if not exists whatsapp_notifications boolean not null default true;

create table if not exists public.whatsapp_sends (
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,          -- notification type
  ref        text not null default '',-- rfq id / conversation id (throttle per thread)
  sent_at    timestamptz not null default now(),
  template   text,
  wa_message_id text,
  primary key (user_id, kind, ref)
);
alter table public.whatsapp_sends enable row level security;
revoke all on public.whatsapp_sends from anon, authenticated;

create or replace function public.set_whatsapp_notifications(p_on boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'سجّل الدخول أولاً.'; end if;
  update profiles set whatsapp_notifications = coalesce(p_on, true) where id = auth.uid();
end $$;
revoke all on function public.set_whatsapp_notifications(boolean) from public, anon;
grant execute on function public.set_whatsapp_notifications(boolean) to authenticated;
