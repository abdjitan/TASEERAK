-- Frankfurt migration, step 4: stored file links still point at the old project host.
-- Rewrites every text/jsonb column in public that contains it (offers.supplier_invoice_url,
-- rfqs.items[].spec_file_url/photo_url, notify_config.function_url, …).
-- run.sh replaces __NEW_REF__ with the new project ref before running this file.
do $$
declare
  old_host text := 'afqksuduomkdqrcohntk.supabase.co';
  new_host text := '__NEW_REF__.supabase.co';
  c record; n bigint; total bigint := 0;
begin
  if new_host like '\_\_%' then raise exception 'new ref not set'; end if;
  perform set_config('session_replication_role', 'replica', true); -- no triggers/notifications while rewriting
  for c in
    select table_name, column_name, data_type from information_schema.columns
    where table_schema = 'public' and data_type in ('text', 'jsonb', 'character varying')
      and table_name in (select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE')
  loop
    if c.data_type = 'jsonb' then
      execute format('update public.%I set %I = replace(%I::text, %L, %L)::jsonb where %I::text like %L',
        c.table_name, c.column_name, c.column_name, old_host, new_host, c.column_name, '%' || old_host || '%');
    else
      execute format('update public.%I set %I = replace(%I, %L, %L) where %I like %L',
        c.table_name, c.column_name, c.column_name, old_host, new_host, c.column_name, '%' || old_host || '%');
    end if;
    get diagnostics n = row_count;
    if n > 0 then raise notice '% .% : % rows', c.table_name, c.column_name, n; total := total + n; end if;
  end loop;
  raise notice 'fix-urls: % rows rewritten', total;
end $$;
