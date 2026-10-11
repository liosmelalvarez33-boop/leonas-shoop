#!/usr/bin/env node
// Backup de D1 a archivo local (y listo para subir a R2).
// Uso: npm run backup
// Salida: backups/d1-YYYYMMDD-HHmm.sql
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(raiz, 'backups');
mkdirSync(dir, { recursive: true });

const ahora = new Date();
const stamp = ahora.toISOString().slice(0, 16).replace(/[-:T]/g, '');
const archivo = join(dir, `d1-${stamp}.sql`);

const args = process.argv.slice(2);
const remoto = !args.includes('--local');

console.log(`Backup D1 (${remoto ? 'remoto' : 'local'}) → ${archivo}`);
try {
  execFileSync(
    'npx',
    ['wrangler', 'd1', 'export', 'leonas-shoop', remoto ? '--remote' : '--local', `--output=${archivo}`],
    { cwd: raiz, stdio: 'inherit' }
  );
  console.log('Backup OK ✓');
  console.log('Súbelo a R2: npx wrangler r2 object put leonas-images/backups/<nombre> --file=' + archivo);
} catch {
  console.error('Falló el backup. ¿Existe la base D1 remota? (crea database_id en wrangler.toml)');
  process.exit(1);
}
