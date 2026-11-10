// Falla si algún archivo versionado contiene una clave privada de Supabase.
// La clave "anon" es pública por diseño y está permitida; la "service_role" jamás.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && !/\.(png|jpg|jpeg|ico|webp|woff2?|lock)$/i.test(f) && f !== 'package-lock.json');

const found = [];
for (const f of files) {
  let text;
  try {
    text = readFileSync(f, 'utf8');
  } catch {
    continue;
  }
  for (const m of text.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.([A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g)) {
    try {
      const role = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8')).role;
      if (role === 'service_role') found.push(`${f}: JWT con rol service_role`);
    } catch {
      /* no era un JWT */
    }
  }
  if (/sb_secret_[A-Za-z0-9_]{20,}/.test(text)) found.push(`${f}: clave sb_secret_`);
  if (/SUPABASE_SERVICE_ROLE_KEY\s*=\s*[A-Za-z0-9_.-]{20,}/.test(text)) found.push(`${f}: SERVICE_ROLE_KEY con valor`);
}

if (found.length > 0) {
  console.error('Posibles claves privadas en el repositorio:\n - ' + found.join('\n - '));
  process.exit(1);
}
console.log(`Sin claves privadas en ${files.length} archivos.`);
