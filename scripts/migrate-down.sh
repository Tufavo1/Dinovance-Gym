#!/usr/bin/env bash
# Revierte UNA migración (la más reciente primero) usando supabase/migrations/down/NNN_*.down.sql.
# Si la reversa declara "-- reapply: a.sql b.sql", vuelve a aplicar esas migraciones (idempotentes)
# para restaurar las funciones a su versión anterior.
#
# Uso:  SUPABASE_DB_URL="postgresql://..." scripts/migrate-down.sh 018
# Haz un respaldo antes: scripts/backup.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
N="${1:-}"
if [[ -z "$N" || -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "Uso: SUPABASE_DB_URL=... scripts/migrate-down.sh <número de migración>" >&2
  exit 1
fi
DOWN="$(ls "$ROOT"/supabase/migrations/down/"$N"_*.down.sql 2>/dev/null | head -1 || true)"
if [[ -z "$DOWN" ]]; then
  echo "No hay reversa para la migración $N." >&2
  exit 1
fi

{
  cat "$DOWN"
  for f in $(grep -oP '^-- reapply: \K.*' "$DOWN" || true); do
    printf '\n'
    cat "$ROOT/supabase/migrations/$f"
  done
} | psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -q -o /dev/null

echo "Revertida: $(basename "$DOWN")"
