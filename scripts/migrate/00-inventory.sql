-- Frankfurt migration: run on the OLD and the NEW project and compare (must match after the move).
select 'auth.users' t, count(*) n from auth.users
union all select 'auth.identities', count(*) from auth.identities
union all select 'storage.objects', count(*) from storage.objects
union all select 'cron jobs', count(*) from cron.job
union all select 'storage policies', count(*) from pg_policies where schemaname = 'storage'
union all select 'public policies', count(*) from pg_policies where schemaname = 'public'
union all select 'public functions', count(*) from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public'
union all select 'public triggers', count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace s on s.oid = c.relnamespace where s.nspname = 'public' and not t.tgisinternal
union all select 'auth.users triggers', count(*) from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal
union all
select 'rows: ' || relname, n_live_tup from pg_stat_user_tables where schemaname = 'public'
order by 1;
