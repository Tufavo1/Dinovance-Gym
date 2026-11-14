#!/usr/bin/env bash
# Copia de seguridad completa de los datos de la app (esquemas public y auth) con pg_dump.
# El archivo contiene datos personales y de salud: guárdalo cifrado y NUNCA lo subas a git
# (la carpeta backups/ está en .gitignore).
#
# Uso:      SUPABASE_DB_URL="postgresql://..." scripts/backup.sh [carpeta]
# Restaurar: pg_restore --clean --if-exists -d "$SUPABASE_DB_URL" backups/dinovance-AAAAMMDD-HHMMSS.dump
set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "Falta SUPABASE_DB_URL (cadena de conexión de Postgres)." >&2
  exit 1
fi
DIR="${1:-$(cd "$(dirname "$0")/.." && pwd)/backups}"
mkdir -p "$DIR"
chmod 700 "$DIR"
FILE="$DIR/dinovance-$(date +%Y%m%d-%H%M%S).dump"
pg_dump "$SUPABASE_DB_URL" --format=custom --no-owner --no-privileges --schema=public --schema=auth --file="$FILE"
chmod 600 "$FILE"
echo "Respaldo creado: $FILE ($(du -h "$FILE" | cut -f1))"
