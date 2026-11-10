#!/usr/bin/env bash
# Aplica a Postgres las migraciones de supabase/migrations/ que aún no se hayan ejecutado.
#
# - Lleva el registro en public.app_migrations (con RLS activado y sin políticas: la API no la ve).
# - Cada migración corre en una sola transacción junto con su registro: o se aplica completa o nada.
# - La primera vez, marca como ya aplicadas las migraciones hasta MIGRATIONS_BASELINE (por defecto 010),
#   que son las que ya se ejecutaron a mano en el SQL Editor.
#
# Uso:  SUPABASE_DB_URL="postgresql://..." scripts/migrate.sh [--dry-run]
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)/supabase/migrations"
BASELINE="${MIGRATIONS_BASELINE:-010}"
DRY=0
[[ "${1:-}" == "--dry-run" ]] && DRY=1

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "Falta SUPABASE_DB_URL (cadena de conexión de Postgres)." >&2
  exit 1
fi

run() { psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -qAt "$@"; }

run -c "create table if not exists public.app_migrations (
  name       text primary key,
  applied_at timestamptz not null default now()
);
alter table public.app_migrations enable row level security;"

# Primera vez: registrar como aplicadas las anteriores al baseline.
if [[ "$(run -c 'select count(*) from public.app_migrations')" == "0" ]]; then
  echo "Primer uso: se marcan como aplicadas las migraciones hasta la $BASELINE."
  for f in "$DIR"/*.sql; do
    n="$(basename "$f")"
    if [[ "${n%%_*}" < "$BASELINE" || "${n%%_*}" == "$BASELINE" ]]; then
      run -c "insert into public.app_migrations(name) values ('$n') on conflict do nothing"
    fi
  done
fi

applied=0
for f in "$DIR"/*.sql; do
  n="$(basename "$f")"
  if [[ "$(run -c "select count(*) from public.app_migrations where name = '$n'")" != "0" ]]; then
    echo "  = $n (ya aplicada)"
    continue
  fi
  if [[ $DRY -eq 1 ]]; then
    echo "  + $n (se aplicaría)"
    continue
  fi
  echo "  + aplicando $n"
  { cat "$f"; printf "\ninsert into public.app_migrations(name) values ('%s');\n" "$n"; } \
    | psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -q -o /dev/null
  applied=$((applied + 1))
done

echo "Migraciones aplicadas: $applied"
