#!/usr/bin/env node
// Sube los datos de la tienda a Cloudflare KV (una sola vez, o para recuperarlos).
//
//   node scripts/seed.mjs            → sube la interfaz del panel; datos solo si faltan
//   node scripts/seed.mjs --forzar   → además REEMPLAZA productos/config/pedidos por los del repo
//   node scripts/seed.mjs --ui       → solo la interfaz del panel
//
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const forzar = args.includes('--forzar');
const soloUi = args.includes('--ui');

const wrangler = readFileSync(join(raiz, 'wrangler.toml'), 'utf8');
const idMatch = wrangler.match(/binding\s*=\s*"DATOS"[\s\S]*?id\s*=\s*"([a-f0-9]+)"/);
if (!idMatch) {
  console.error('No encontré el binding DATOS en wrangler.toml');
  process.exit(1);
}
const namespaceId = idMatch[1];

function cf(clave, archivo) {
  return execFileSync('cf', ['kv', 'keys', 'put', clave, '--namespace-id', namespaceId, '--file', archivo], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function obtener(clave) {
  try {
    return execFileSync('cf', ['kv', 'keys', 'get', clave, '--namespace-id', namespaceId], {
      stdio: ['ignore', 'pipe', 'pipe'],
    }).toString().trim();
  } catch {
    return '';
  }
}

const tmp = mkdtempSync(join(tmpdir(), 'leonas-seed-'));
const subir = (clave, contenido) => {
  const f = join(tmp, clave.replace(/:/g, '_'));
  writeFileSync(f, contenido);
  cf(clave, f);
  console.log(`  ✓ ${clave} (${contenido.length} bytes)`);
};

try {
  console.log(`KV namespace: ${namespaceId}\n`);

  // 1) Intermisión: la interfaz del panel.
  console.log('Interfaz del panel:');
  subir('ui:admin', readFileSync(join(raiz, 'scripts/admin.html'), 'utf8'));

  if (!soloUi) {
    // 2) Datos de la tienda: solo si faltan (o con --forzar).
    console.log('\nDatos de la tienda:');
    const datos = [
      ['productos', join(raiz, 'src/data/products.json')],
      ['config', join(raiz, 'src/data/config.json')],
    ];
    for (const [clave, archivo] of datos) {
      const contenido = readFileSync(archivo, 'utf8').trim();
      const actual = obtener(clave);
      if (actual && !forzar) {
        console.log(`  · ${clave} ya existen en la nube (usa --forzar para reemplazarlos)`);
      } else {
        subir(clave, contenido);
      }
    }
    if (!obtener('pedidos')) subir('pedidos', '[]');
    else console.log('  · pedidos ya existen en la nube');
  }

  console.log('\nListo ✓');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
