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
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="55%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#78350f"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <circle cx="1030" cy="110" r="240" fill="#ffffff" opacity="0.10"/>
  <circle cx="140" cy="560" r="200" fill="#000000" opacity="0.12"/>
  <text x="80" y="300" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="110" font-weight="800" fill="#ffffff">${nombre}</text>
  <text x="80" y="380" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="40" font-weight="500" fill="#ffffff" fill-opacity="0.92">${slogan}</text>
  <rect x="80" y="440" width="560" height="76" rx="38" fill="#ffffff" fill-opacity="0.18"/>
  <text x="360" y="489" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="34" font-weight="600" fill="#ffffff" text-anchor="middle">Pedidos por WhatsApp: ${wa}</text>
</svg>
`;
}

function faviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#d97706"/>
  <text x="32" y="45" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="36" font-weight="800" fill="#ffffff" text-anchor="middle">L</text>
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
