import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const productsPath = path.join(root, 'src/data/products.json');
const configPath = path.join(root, 'src/data/config.json');
const outDir = path.join(root, 'public/img/productos');

const productos = JSON.parse(readFileSync(productsPath, 'utf8'));
const config = JSON.parse(readFileSync(configPath, 'utf8'));

mkdirSync(outDir, { recursive: true });

const paletas = [
  ['#f59e0b', '#92400e'],
  ['#fb923c', '#9a3412'],
  ['#d97706', '#78350f'],
  ['#fbbf24', '#7c2d12'],
  ['#f97316', '#7c2d12'],
  ['#eab308', '#713f12'],
  ['#d9a05b', '#7c2d12'],
  ['#c98a3d', '#57270a'],
];

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function productSvg(producto, index) {
  const [c1, c2] = paletas[index % paletas.length];
  const titulo = escapeXml(producto.titulo);
  const cat = escapeXml(producto.categoria.toUpperCase());
  const letra = escapeXml(producto.titulo.charAt(0).toUpperCase());
  const condicion = producto.condicion === 'nuevo' ? 'NUEVO' : 'SEGUNDO USO';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000" role="img" aria-label="${titulo}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="1000" fill="url(#g)"/>
  <circle cx="640" cy="160" r="220" fill="#ffffff" opacity="0.08"/>
  <circle cx="120" cy="860" r="260" fill="#000000" opacity="0.10"/>
  <text x="400" y="470" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="260" font-weight="800" fill="#ffffff" fill-opacity="0.9" text-anchor="middle">${letra}</text>
  <text x="400" y="580" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="46" font-weight="700" fill="#ffffff" text-anchor="middle">${titulo}</text>
  <text x="400" y="640" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="26" font-weight="600" fill="#ffffff" fill-opacity="0.85" text-anchor="middle">${cat} · ${condicion}</text>
  <rect x="230" y="700" width="340" height="56" rx="28" fill="#000000" fill-opacity="0.25"/>
  <text x="400" y="737" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="24" font-weight="500" fill="#ffffff" text-anchor="middle">Foto de ejemplo</text>
</svg>
`;
}

function ogSvg() {
  const nombre = escapeXml(config.nombre);
  const slogan = escapeXml(config.slogan);
  const wa = escapeXml(config.whatsappVisible);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#b45309"/>
      <stop offset="60%" stop-color="#92400e"/>
      <stop offset="100%" stop-color="#57270a"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1060" cy="90" r="250" fill="#fbbf24" opacity="0.10"/>
  <circle cx="120" cy="580" r="210" fill="#000000" opacity="0.14"/>
  <svg x="80" y="90" width="110" height="110" viewBox="0 0 64 64">${logoSvg()
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')}</svg>
  <text x="80" y="330" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="92" font-weight="800" fill="#ffffff">${nombre}</text>
  <text x="80" y="400" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="36" font-weight="500" fill="#ffffff" fill-opacity="0.9">${slogan}</text>
  <rect x="80" y="455" width="600" height="80" rx="40" fill="#ffffff" fill-opacity="0.16"/>
  <circle cx="132" cy="495" r="22" fill="#25d366"/>
  <text x="370" y="507" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="34" font-weight="700" fill="#ffffff" text-anchor="middle">Pedidos por WhatsApp: ${wa}</text>
</svg>
`;
}

function logoSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${escapeXml(config.nombre)}">
  <defs>
    <linearGradient id="ls-bg" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
      <stop stop-color="#4a2c0c"/>
      <stop offset="1" stop-color="#2a1806"/>
    </linearGradient>
    <linearGradient id="ls-line" x1="16" y1="14" x2="48" y2="52" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fcd34d"/>
      <stop offset="0.55" stop-color="#f59e0b"/>
      <stop offset="1" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="15" fill="url(#ls-bg)"/>
  <rect x="2.5" y="2.5" width="59" height="59" rx="12.5" fill="none" stroke="#d97706" stroke-width="1" opacity="0.5"/>
  <g stroke="url(#ls-line)" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path stroke-width="2.1" d="M32 16.6
      C36 16.6 39.2 17.4 41.8 19
      C45.2 21 47.6 25 47.9 30.2
      C48.4 37.8 46.8 44.4 42.4 47.9
      C39 50.6 35.8 51.7 32 51.7
      C28.2 51.7 25 50.6 21.6 47.9
      C17.2 44.4 15.6 37.8 16.1 30.2
      C16.4 25 18.8 21 22.2 19
      C24.8 17.4 28 16.6 32 16.6 Z"/>
    <path stroke-width="1.9" d="M19.4 21.4 C16.6 15 23.2 13.4 26 18.2"/>
    <path stroke-width="1.9" d="M44.6 21.4 C47.4 15 40.8 13.4 38 18.2"/>
    <path stroke-width="1.2" opacity="0.8" d="M21.1 20.5 C20.2 17.1 23.9 16.4 25.1 19.4"/>
    <path stroke-width="1.2" opacity="0.8" d="M42.9 20.5 C43.8 17.1 40.1 16.4 38.9 19.4"/>
    <path stroke-width="1.5" d="M32 42.6 L32 44.2 M32 44.2 C30.7 46.7 28.2 47.3 26.6 45.6 M32 44.2 C33.3 46.7 35.8 47.3 37.4 45.6"/>
    <path stroke-width="1.3" opacity="0.9" d="M18.4 37.2 L12.4 36.4 M19.8 42 L14 43.4"/>
    <path stroke-width="1.3" opacity="0.9" d="M45.6 37.2 L51.6 36.4 M44.2 42 L50 43.4"/>
    <path stroke-width="1.4" fill="url(#ls-line)" d="M23.2 33.6 Q27 31.6 30.6 34 Q27 36.2 23.2 33.6 Z"/>
    <path stroke-width="1.4" fill="url(#ls-line)" d="M40.8 33.6 Q37 31.6 33.4 34 Q37 36.2 40.8 33.6 Z"/>
  </g>
  <path d="M29.2 38.8 C30.7 37.9 33.3 37.9 34.8 38.8 C35.7 40.1 35 41.2 32 42.6 C29 41.2 28.3 40.1 29.2 38.8 Z" fill="url(#ls-line)"/>
</svg>
`;
}

function faviconSvg() {
  return logoSvg().replace('viewBox="0 0 64 64"', 'width="64" height="64" viewBox="0 0 64 64"');
}

let creados = 0;
productos.forEach((p, i) => {
  for (const img of p.imagenes ?? []) {
    const dest = path.join(outDir, img);
    if (img.endsWith('.svg') && !existsSync(dest)) {
      writeFileSync(dest, productSvg(p, i));
      creados++;
    }
  }
});

const ogPath = path.join(root, 'public/img/og-cover.png');
if (!existsSync(ogPath)) {
  const { default: sharp } = await import('sharp');
  await sharp(Buffer.from(ogSvg())).png({ quality: 90 }).toFile(ogPath);
  creados++;
}

const faviconPath = path.join(root, 'public/favicon.svg');
if (!existsSync(faviconPath)) {
  writeFileSync(faviconPath, faviconSvg());
  creados++;
}

console.log(`Listo: ${creados} archivos creados (los existentes no se tocan).`);
