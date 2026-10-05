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
    <linearGradient id="mark" x1="6" y1="2" x2="58" y2="62" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fbbf24"/>
      <stop offset="0.55" stop-color="#f59e0b"/>
      <stop offset="1" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1060" cy="90" r="250" fill="#fbbf24" opacity="0.10"/>
  <circle cx="120" cy="580" r="210" fill="#000000" opacity="0.14"/>
  <g transform="translate(80 90)">
    <rect width="110" height="110" rx="30" fill="url(#mark)"/>
    <path d="M40 26v40a12 12 0 0 0 12 12h23" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="79" cy="34" r="9" fill="#fff"/>
  </g>
  <text x="80" y="330" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="92" font-weight="800" fill="#ffffff">${nombre}</text>
  <text x="80" y="400" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="36" font-weight="500" fill="#ffffff" fill-opacity="0.9">${slogan}</text>
  <rect x="80" y="455" width="600" height="80" rx="40" fill="#ffffff" fill-opacity="0.16"/>
  <circle cx="132" cy="495" r="22" fill="#25d366"/>
  <text x="370" y="507" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="34" font-weight="700" fill="#ffffff" text-anchor="middle">Pedidos por WhatsApp: ${wa}</text>
</svg>
`;
}

function faviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="f-g" x1="4" y1="2" x2="60" y2="62" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fbbf24"/>
      <stop offset="0.55" stop-color="#f59e0b"/>
      <stop offset="1" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="17" fill="url(#f-g)"/>
  <path d="M23 15v23a7 7 0 0 0 7 7h13" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="45.5" cy="19.5" r="5.5" fill="#fff"/>
</svg>
`;
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
