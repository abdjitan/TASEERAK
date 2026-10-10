-- 120 (applied 2026-10-10 via MCP as otp_language_per_request)
-- The WhatsApp OTP goes out in the language the user has the site open in. The login page
-- records it right before requesting the code; the send-otp-whatsapp hook reads it
-- (service role). Short-lived, keyed by E.164 phone; language only, nothing sensitive.
create table if not exists public.otp_language (
  phone text primary key check (phone ~ '^9665[0-9]{8}$'),
  lang text not null check (lang in ('ar','en','ur')),
  updated_at timestamptz not null default now()
);
alter table public.otp_language enable row level security;
revoke all on public.otp_language from anon, authenticated;

create or replace function public.set_otp_language(p_phone text, p_lang text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if p_phone !~ '^9665[0-9]{8}$' or p_lang not in ('ar','en','ur') then return; end if;
  insert into public.otp_language (phone, lang, updated_at) values (p_phone, p_lang, now())
  on conflict (phone) do update set lang = excluded.lang, updated_at = now();
  if random() < 0.02 then delete from public.otp_language where updated_at < now() - interval '1 day'; end if;
end; $function$;
revoke all on function public.set_otp_language(text, text) from public;
grant execute on function public.set_otp_language(text, text) to anon, authenticated;
