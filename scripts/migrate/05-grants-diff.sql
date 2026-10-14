-- Frankfurt migration, step 5: list every grant to non-owner roles on public objects. Run on OLD and NEW,
-- sort both outputs and diff: the new project's default privileges re-add grants that migrations had
-- revoked (found 2026-10-14: 354 extra anon/authenticated grants). Revoke the extras, re-grant any
-- column-level UPDATE grants a table-level revoke removed, then re-run the e2e test.
select * from (
 select 'rel' k, c.relkind::text||' '||c.relname obj, coalesce(nullif(a.grantee::regrole::text,'-'),'PUBLIC') who, a.privilege_type priv
   from pg_class c join pg_namespace n on n.oid=c.relnamespace, aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
   where n.nspname='public' and c.relkind in ('r','v','m','S','p')
 union all
 select 'col', c.relname||'.'||at.attname, case when a.grantee=0 then 'PUBLIC' else a.grantee::regrole::text end, a.privilege_type
   from pg_attribute at join pg_class c on c.oid=at.attrelid join pg_namespace n on n.oid=c.relnamespace, aclexplode(at.attacl) a
   where n.nspname='public' and at.attacl is not null
 union all
 select 'fn', p.oid::regprocedure::text, case when a.grantee=0 then 'PUBLIC' else a.grantee::regrole::text end, a.privilege_type
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
   where n.nspname='public'
 union all
 select 'schema', 'public', case when a.grantee=0 then 'PUBLIC' else a.grantee::regrole::text end, a.privilege_type
   from pg_namespace n, aclexplode(n.nspacl) a where n.nspname='public'
) x where who not in ('postgres','supabase_admin') order by 1,2,3,4;
