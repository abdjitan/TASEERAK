-- 166: invite bot, owner-approved AI cap ($5/month, enforced in whatsapp-invite-bot).
-- * stage 'paused': the owner typed in that chat himself, so the bot stays silent there.
-- * invite_ai_tokens_month(): this calendar month's AI tokens (Riyadh time), read before each AI
--   call; at the cap the bot falls back to its fixed texts and notifies the admin once.

alter table public.invite_chats drop constraint if exists invite_chats_stage_check;
alter table public.invite_chats add constraint invite_chats_stage_check check (stage in ('invited', 'interested', 'declined', 'paused'));

create index if not exists invite_messages_ai_created on public.invite_messages (created_at) where ai_input_tokens is not null;

create or replace function public.invite_ai_tokens_month()
returns table (input_tokens bigint, output_tokens bigint)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(ai_input_tokens), 0)::bigint, coalesce(sum(ai_output_tokens), 0)::bigint
  from public.invite_messages
  where ai_input_tokens is not null
    and created_at >= (date_trunc('month', now() at time zone 'Asia/Riyadh') at time zone 'Asia/Riyadh');
$$;
revoke all on function public.invite_ai_tokens_month() from public, anon, authenticated;
grant execute on function public.invite_ai_tokens_month() to service_role;
