#!/usr/bin/env bash
# Local backup of the live Supabase database (owner 2026-11-16: "always keep backups on the computer").
# Run from Git Bash:  bash scripts/backup/backup.sh
# Writes C:\dev\taseerak-backups\<YYYY-MM-DD_HHMM>\ (outside the repo, never committed, not on OneDrive):
#   public.dump      full public schema + data (pg_restore -Fc format)
#   auth-users.sql   auth.users + auth.identities rows (sign-in accounts)
#   cron-jobs.sql    pg_cron job rows (cron.job)
# Keeps the newest 8 backups. Reads NEW_DB_URL from scripts/migrate/.env.migrate; never prints it.
# Restore (into an empty project): pg_restore --no-owner -d "$DB_URL" public.dump ; psql "$DB_URL" -f auth-users.sql
set -euo pipefail
cd "$(dirname "$0")/../.."
PGBIN="${PGBIN:-$(ls -d /c/Program\ Files/PostgreSQL/*/bin 2>/dev/null | sort -V | tail -1)}"
export PATH="$PGBIN:$PATH"
command -v pg_dump >/dev/null || { echo "pg_dump not found (install PostgreSQL 17 client)"; exit 1; }
set -a; . scripts/migrate/.env.migrate; set +a
[ -n "${NEW_DB_URL:-}" ] || { echo "NEW_DB_URL missing in scripts/migrate/.env.migrate"; exit 1; }

ROOT="/c/dev/taseerak-backups"
DIR="$ROOT/$(date +%Y-%m-%d_%H%M)"
mkdir -p "$DIR"

pg_dump "$NEW_DB_URL" --schema=public --no-owner -Fc -f "$DIR/public.dump"
pg_dump "$NEW_DB_URL" --data-only --no-owner --table=auth.users --table=auth.identities -f "$DIR/auth-users.sql"
pg_dump "$NEW_DB_URL" --data-only --no-owner --table=cron.job -f "$DIR/cron-jobs.sql" || true

# keep the newest 8
ls -1d "$ROOT"/20* 2>/dev/null | sort | head -n -8 | while read -r old; do rm -rf "$old"; done

echo "backup OK: $DIR"
du -sh "$DIR" | cut -f1
