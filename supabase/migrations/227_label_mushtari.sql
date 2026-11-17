-- Wording (owner 2026-11-17): «مشتري» instead of «مشترٍ» in texts the database writes
-- (chat notification titles in send_message). The site/app strings changed in the same round.
do $$
declare d text := pg_get_functiondef('public.send_message(uuid, text)'::regprocedure); n text;
begin
  n := replace(d, 'مشترٍ', 'مشتري');
  if n <> d then execute n; end if;
end $$;
