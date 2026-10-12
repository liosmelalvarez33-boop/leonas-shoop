#!/usr/bin/env node
// Genera los íconos de la PWA/APK desde el logo nuevo (public/logo-leonas-shoop.png).
// - icon-*.png (any): degradado ámbar a sangre + medallón crema con el león.
// - maskable-*.png: mismo diseño al 80 % (zona segura) para recortes del launcher.
// - apple-touch-icon.png: crema a sangre + león al 70 %.
// Salida: public/icons/*.png — ejecutar con: npm run icons
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const LOGO = path.join(ROOT, 'public/logo-leonas-shoop.png');
const OUT = path.join(ROOT, 'public/icons');

mkdirSync(OUT, { recursive: true });

const GRAD = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="60" y1="20" x2="460" y2="500" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fbbf24"/><stop offset="0.55" stop-color="#f59e0b"/><stop offset="1" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
</svg>`;

// Medallón crema + león. `frac` = diámetro del medallón respecto al lienzo (1 = a sangre).
async function icono(size, frac, archivo) {
  const circulo = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${(size * frac) / 2}" fill="#fffbeb"/></svg>`;
  // El león ocupa el 62 % del medallón (portrait: limita por alto).
  const leon = await sharp(LOGO)
    .resize({ height: Math.round(size * frac * 0.62) })
    .png()
    .toBuffer();
  await sharp(Buffer.from(GRAD))
    .resize(size, size)
    .composite([
      { input: Buffer.from(circulo) },
      { input: leon, gravity: 'centre' },
    ])
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, archivo));
  console.log(`✓ public/icons/${archivo} (${size}×${size})`);
}

await icono(192, 1.0, 'icon-192.png');
await icono(512, 1.0, 'icon-512.png');
await icono(192, 0.8, 'maskable-192.png');
await icono(512, 0.8, 'maskable-512.png');

// Apple: crema a sangre + león al 70 %.
{
  const size = 180;
  const fondo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect width="180" height="180" fill="#fffbeb"/></svg>`;
  const leon = await sharp(LOGO).resize({ height: Math.round(size * 0.7) }).png().toBuffer();
  const meta = await sharp(leon).metadata();
  await sharp(Buffer.from(fondo))
    .composite([{
      input: leon,
      top: Math.round((size - meta.height) / 2),
      left: Math.round((size - meta.width) / 2),
    }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, 'apple-touch-icon.png'));
  console.log('✓ public/icons/apple-touch-icon.png (180×180)');
}
