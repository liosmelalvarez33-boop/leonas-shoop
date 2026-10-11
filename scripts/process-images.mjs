#!/usr/bin/env node
// Pipeline de imágenes: convierte fotos reales a WebP/AVIF + responsive.
// Uso:
//   1. Pon tus fotos en fotos-reales/<producto-id>/foto1.jpg (jpg/png/webp)
//   2. Ejecuta: npm run imagenes
//   3. Salida: public/img/optimizadas/<producto-id>-400.webp, -800.webp, -1200.webp (+ .avif + .jpg fallback)
//   4. Sube a R2: npx wrangler r2 object put leonas-images/products/optimizadas/... --file=...
//
// Si no hay fotos-reales/, procesa public/img/productos/*.svg copiándolos como referencia.

import { readdirSync, existsSync, mkdirSync, statSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const entrada = path.join(root, 'fotos-reales');
const salida = path.join(root, 'public/img/optimizadas');

mkdirSync(salida, { recursive: true });

const ANCHOS = [400, 800, 1200];

async function procesar() {
  let sharp;
  try {
    ({ default: sharp } = await import('sharp'));
  } catch {
    console.error('Falta sharp. Ejecuta: npm install -D sharp');
    process.exit(1);
  }

  if (!existsSync(entrada)) {
    console.log('No hay carpeta fotos-reales/. Crea fotos-reales/<producto-id>/ con tus fotos JPG/PNG.');
    console.log('Ejemplo: fotos-reales/camisa-floral/foto1.jpg');
    return;
  }

  const productos = readdirSync(entrada).filter((d) => statSync(path.join(entrada, d)).isDirectory());
  if (productos.length === 0) {
    console.log('fotos-reales/ está vacía. Añade subcarpetas por producto.');
    return;
  }

  let total = 0;
  const manifiesto = {};

  for (const pid of productos) {
    const dir = path.join(entrada, pid);
    const archivos = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp|avif|tiff?)$/i.test(f));
    if (archivos.length === 0) {
      console.log(`- ${pid}: sin fotos válidas, omitido`);
      continue;
    }
    manifiesto[pid] = [];
    for (const archivo of archivos.slice(0, 10)) {
      const base = path.parse(archivo).name.replace(/[^A-Za-z0-9_-]+/g, '-').toLowerCase().slice(0, 40) || 'foto';
      const src = path.join(dir, archivo);
      const meta = await sharp(src).metadata();
      const originales = [];
      for (const ancho of ANCHOS) {
        if (meta.width && meta.width < ancho && ancho !== ANCHOS[0]) continue;
        const webp = `${pid}-${base}-${ancho}.webp`;
        const avif = `${pid}-${base}-${ancho}.avif`;
        const jpg = `${pid}-${base}-${ancho}.jpg`;
        await sharp(src).resize({ width: ancho, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(salida, webp));
        await sharp(src).resize({ width: ancho, withoutEnlargement: true }).avif({ quality: 70 }).toFile(path.join(salida, avif));
        await sharp(src).resize({ width: ancho, withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(salida, jpg));
        originales.push({ ancho, webp, avif, jpg });
        total += 3;
      }
      manifiesto[pid].push({ src: archivo, variantes: originales, alt: pid });
      console.log(`- ${pid}/${archivo}: ${originales.length * 3} archivos`);
    }
  }

  // Copiar SVGs legacy como referencia (no se optimizan).
  const legacyDir = path.join(root, 'public/img/productos');
  if (existsSync(legacyDir)) {
    const svgs = readdirSync(legacyDir).filter((f) => f.endsWith('.svg'));
    for (const s of svgs) {
      const dest = path.join(salida, s);
      if (!existsSync(dest)) copyFileSync(path.join(legacyDir, s), dest);
    }
  }

  const { writeFileSync } = await import('node:fs');
  writeFileSync(path.join(salida, 'manifiesto.json'), JSON.stringify(manifiesto, null, 2));
  console.log(`\nListo: ${total} archivos optimizados en public/img/optimizadas/`);
  console.log('Sube a R2 con: npx wrangler r2 object put leonas-images/products/optimizadas/<archivo> --file=public/img/optimizadas/<archivo>');
}
procesar();
