-- 167: invite bot escalation (owner, 2026-10-17). In rare, serious cases (a big deal, an important
-- party, a serious problem the bot cannot solve) the AI passes the chat to the owner: stage
-- 'escalated', the admins are notified, and the bot stays silent there. If the owner has not written
-- within 24 hours, the bot resumes; if he writes, the chat becomes 'paused' (his).

alter table public.invite_chats drop constraint if exists invite_chats_stage_check;
alter table public.invite_chats add constraint invite_chats_stage_check check (stage in ('invited', 'interested', 'declined', 'paused', 'escalated'));
alter table public.invite_chats add column if not exists escalated_at timestamptz;
alter table public.invite_chats add column if not exists escalation_reason text;
