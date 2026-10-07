#!/usr/bin/env node
// Genera los íconos de la PWA (instalable / pantalla de inicio) desde public/img/logo.svg.
// Salida: public/icons/*.png — ejecutar con: npm run icons
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const LOGO = path.join(ROOT, 'public/img/logo.svg');
const OUT = path.join(ROOT, 'public/icons');

mkdirSync(OUT, { recursive: true });

const logo = readFileSync(LOGO, 'utf8');
// Contenido de la leona sin el rect de fondo redondeado (para fondos a sangre).
const contenido = logo.replace(/<rect[^>]*rx="17"[^>]*\/>/, '');

// Fondo a sangre (mismo gradiente, sin esquinas redondeadas) con la leona al 66 % centrada.
const conFondo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="ls-g" x1="6" y1="2" x2="58" y2="62" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fbbf24"/><stop offset="0.55" stop-color="#f59e0b"/><stop offset="1" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" fill="url(#ls-g)"/>
  <g transform="translate(32 32) scale(0.66) translate(-32 -32)">${contenido}</g>
</svg>`;

const tareas = [
  ['icon-192.png', logo, 192],
  ['icon-512.png', logo, 512],
  ['maskable-192.png', conFondo, 192],
  ['maskable-512.png', conFondo, 512],
  ['apple-touch-icon.png', conFondo, 180],
];

for (const [nombre, svg, size] of tareas) {
  await sharp(Buffer.from(svg), { density: 600 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, nombre));
  console.log(`✓ public/icons/${nombre} (${size}×${size})`);
}
