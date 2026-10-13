-- Frankfurt migration, step 1 (on the NEW project, before the schema): extensions the schema uses.
-- pgcrypto / uuid-ossp / pg_stat_statements / supabase_vault are enabled on every new project.
create extension if not exists pg_cron;
create extension if not exists pg_net;
