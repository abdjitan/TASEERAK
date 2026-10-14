#!/usr/bin/env bash
# Frankfurt migration — database part. Run from the repo root in Git Bash:
#   bash scripts/migrate/run.sh dump      # read-only: dump the OLD project to scripts/migrate/out/
#   bash scripts/migrate/run.sh restore   # write the dump + extras + url fix into the NEW project
# Needs PostgreSQL 17 client tools (pg_dump, psql) and scripts/migrate/.env.migrate with
# OLD_DB_URL, NEW_DB_URL (Session pooler strings from Supabase → Connect) and NEW_REF.
# Secrets are read from the file and never echoed.
set -euo pipefail
cd "$(dirname "$0")"
PGBIN="${PGBIN:-$(ls -d /c/Program\ Files/PostgreSQL/*/bin 2>/dev/null | sort -V | tail -1)}"
export PATH="$PGBIN:$PATH"
command -v pg_dump >/dev/null || { echo "pg_dump not found (install PostgreSQL 17 client)"; exit 1; }
set -a; . ./.env.migrate; set +a
mkdir -p out

case "${1:-}" in
  dump)
    pg_dump "$OLD_DB_URL" --schema=public --schema-only --no-owner -f out/schema.sql
    # the new project already has the public schema
    sed -i -E '/^CREATE SCHEMA public;$/d; /^COMMENT ON SCHEMA public /d; /^ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin /d' out/schema.sql
    pg_dump "$OLD_DB_URL" --data-only --no-owner --table=auth.users --table=auth.identities -f out/auth-data.sql
    pg_dump "$OLD_DB_URL" --data-only --no-owner --schema=public -f out/public-data.sql
    psql "$OLD_DB_URL" -X -A -F ' | ' -f 00-inventory.sql > out/inventory-old.txt
    ls -la out
    ;;
  restore)
    [ -n "${NEW_REF:-}" ] || { echo "NEW_REF missing"; exit 1; }
    sed "s/__NEW_REF__/$NEW_REF/" 04-fix-urls.sql > out/04-fix-urls.sql
    psql "$NEW_DB_URL" -X -v ON_ERROR_STOP=1 -f 01-pre.sql
    psql "$NEW_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f out/schema.sql
    psql "$NEW_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction \
      -c 'SET session_replication_role = replica' -f out/auth-data.sql -f out/public-data.sql
    psql "$NEW_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f 02-extras.sql
    psql "$NEW_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -c "SET session_replication_role = replica" -f out/04-fix-urls.sql
    psql "$NEW_DB_URL" -X -A -F ' | ' -f 00-inventory.sql > out/inventory-new.txt
    diff out/inventory-old.txt out/inventory-new.txt && echo "INVENTORY MATCHES (storage.objects fills in after 03-copy-storage)" || true
    ;;
  *) echo "usage: run.sh dump|restore"; exit 1 ;;
esac
