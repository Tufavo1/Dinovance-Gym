#!/usr/bin/env bash
# Pruebas de integración de la base contra una COPIA desechable de la base local de Supabase
# (contenedor Docker). Aplica todas las migraciones nuevas a la copia, corre supabase/tests/*.sql y
# verifica las reversas. La base real no se toca.
#
# Uso:  scripts/test-db.sh            (requiere `npm run db:start`)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
C="${SUPABASE_DB_CONTAINER:-supabase_db_dinovance-gym}"
DB="dinovance_test"
psqlc() { docker exec -i "$C" psql -U postgres -v ON_ERROR_STOP=1 -q "$@"; }

echo "1/4 Copiando la base local a $DB…"
psqlc -c "drop database if exists $DB" -c "create database $DB" >/dev/null
docker exec "$C" bash -c "pg_dump -U postgres --schema=public --schema=auth --schema=extensions postgres | psql -U postgres -q -d $DB >/dev/null 2>&1" || true

echo "2/4 Aplicando migraciones (dos veces: deben ser idempotentes)…"
for pass in 1 2; do
  for f in "$ROOT"/supabase/migrations/01[3-9]_*.sql; do
    psqlc -d "$DB" --single-transaction -o /dev/null < "$f" 2>&1 | grep -v NOTICE || true
  done
done

echo "3/4 Pruebas de integración…"
for t in "$ROOT"/supabase/tests/*.sql; do
  psqlc -d "$DB" -At < "$t" 2>&1 | grep -v NOTICE | tail -1
done

echo "4/4 Reversas (de la más reciente a la más antigua) y nueva aplicación…"
for n in 018 017 016 015 013; do
  down="$(ls "$ROOT"/supabase/migrations/down/"$n"_*.down.sql)"
  {
    cat "$down"
    for f in $(grep -oP '^-- reapply: \K.*' "$down" || true); do printf '\n'; cat "$ROOT/supabase/migrations/$f"; done
  } | psqlc -d "$DB" --single-transaction -o /dev/null 2>&1 | grep -v NOTICE || true
done
left="$(psqlc -d "$DB" -At -c "select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('muscles','movement_patterns','exercise_muscles','exercise_load_settings','load_recommendations','weekly_reports','fitness_goals','body_measurements','partner_links','audit_log')")"
[[ "$left" == "0" ]] || { echo "La reversa dejó $left tablas nuevas." >&2; exit 1; }
kept="$(psqlc -d "$DB" -At -c "select count(*) from public.set_logs")"
echo "   Reversa completa. Series históricas conservadas: $kept"
for f in "$ROOT"/supabase/migrations/01[3-9]_*.sql; do
  psqlc -d "$DB" --single-transaction -o /dev/null < "$f" 2>&1 | grep -v NOTICE || true
done
psqlc -d "$DB" -At < "$ROOT/supabase/tests/integration.sql" 2>&1 | grep -v NOTICE | tail -1

psqlc -c "drop database if exists $DB" >/dev/null
echo "Listo: la copia de prueba se eliminó."
