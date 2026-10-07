#!/usr/bin/env node
// Panel de administración local de Leonas Shoop.
// Uso: npm run panel  →  http://localhost:4399
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PRODUCTS = path.join(ROOT, 'src/data/products.json');
const CONFIG = path.join(ROOT, 'src/data/config.json');
const IMG_DIR = path.join(ROOT, 'public/img/productos');
const PORT = 4399;

mkdirSync(IMG_DIR, { recursive: true });

const leerProductos = () => JSON.parse(readFileSync(PRODUCTS, 'utf8'));
const leerConfig = () => JSON.parse(readFileSync(CONFIG, 'utf8'));
// Preserva el formato del archivo: arrays de strings simples en una sola línea.
const BACKUP = path.join(ROOT, 'scripts/.products.backup.json');
const guardarProductos = (lista) => {
  const texto = (JSON.stringify(lista, null, 2) + '\n').replace(/\[\n((?:\s+(?:"(?:[^"\\]|\\.)*"|true|false|null|-?\d+(?:\.\d+)?),?\n)+)\s*\]/g, (m, cuerpo) => {
    const items = cuerpo.match(/(?:"(?:[^"\\]|\\.)*"|true|false|null|-?\d+(?:\.\d+)?)/g);
    return items ? '[' + items.join(', ') + ']' : m;
  });
  // Copia de seguridad del contenido anterior antes de cada escritura.
  try {
    const actual = readFileSync(PRODUCTS);
    if (actual.toString('utf8').trim() !== '[]') writeFileSync(BACKUP, actual);
  } catch {
    /* primera vez */
  }
  writeFileSync(PRODUCTS, texto);
};

const EXT_OK = new Set(['webp', 'jpg', 'jpeg', 'png', 'gif', 'svg']);
const CONDICIONES = new Set(['nuevo', 'segundo-uso']);
const ESTADOS = new Set(['disponible', 'reservado', 'vendido']);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function leerBody(req, max = 40 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const partes = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > max) {
        reject(new Error('Cuerpo demasiado grande'));
        req.destroy();
        return;
      }
      partes.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(partes).toString('utf8')));
    req.on('error', reject);
  });
}

function validarProducto(p, categorias) {
  const errs = [];
  if (typeof p.id !== 'string' || !SLUG.test(p.id) || p.id.length > 60) errs.push('id inválido (usa minúsculas y guiones)');
  if (typeof p.titulo !== 'string' || p.titulo.trim().length < 2 || p.titulo.length > 90) errs.push('título inválido');
  if (!Number.isInteger(p.precio) || p.precio < 0 || p.precio > 10000000) errs.push('precio inválido');
  if (!categorias.includes(p.categoria)) errs.push('categoría inválida');
  if (!CONDICIONES.has(p.condicion)) errs.push('condición inválida');
  if (!ESTADOS.has(p.estado)) errs.push('estado inválido');
  if (!Array.isArray(p.tallas) || p.tallas.length > 24) errs.push('tallas inválidas');
  if (p.tallas.some((t) => typeof t !== 'string' || t.length > 12)) errs.push('talla inválida');
  if (typeof p.descripcion !== 'string' || p.descripcion.length > 1000) errs.push('descripción inválida');
  if (!Array.isArray(p.imagenes) || p.imagenes.length > 10) errs.push('imágenes inválidas');
  if (p.imagenes.some((i) => typeof i !== 'string' || !/^[a-zA-Z0-9._-]+\.(webp|jpe?g|png|gif|svg)$/.test(i))) errs.push('nombre de imagen inválido');
  if (typeof p.destacado !== 'boolean') errs.push('destacado inválido');
  return errs;
}

function guardarDataUrl(dataUrl, id) {
  const m = /^data:image\/(webp|jpeg|jpg|png|gif|svg\+xml);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!m) throw new Error('Imagen no válida');
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1] === 'svg+xml' ? 'svg' : m[1];
  if (!EXT_OK.has(ext)) throw new Error('Formato no permitido');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 12 * 1024 * 1024) throw new Error('Imagen demasiado grande');
  const nombre = `${id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  writeFileSync(path.join(IMG_DIR, nombre), buf);
  return nombre;
}

function mimeDe(nombre) {
  const ext = path.extname(nombre).slice(1).toLowerCase();
  return { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml' }[ext] || 'application/octet-stream';
}

async function publicar(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const emit = (evento, datos) => res.write(`event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`);

  const correr = (cmd, args, extraEnv = {}) =>
    new Promise((resolve) => {
      emit('paso', cmd === 'npm' ? 'Compilando el sitio…' : 'Subiendo a Cloudflare…');
      const child = spawn(cmd, args, {
        cwd: ROOT,
        env: { ...process.env, ...extraEnv },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const onData = (buf) => {
        for (const linea of buf.toString('utf8').split('\n')) if (linea.trim()) emit('linea', linea);
      };
      child.stdout.on('data', onData);
      child.stderr.on('data', onData);
      child.on('close', (codigo) => resolve(codigo));
      child.on('error', (e) => {
        emit('linea', `Error: ${e.message}`);
        resolve(1);
      });
    });

  try {
    const c = await correr('npm', ['run', 'build']);
    if (c !== 0) {
      emit('error', 'La compilación falló. Revisa los mensajes de arriba.');
      emit('fin', { ok: false });
      return res.end();
    }
    const d = await correr(
      process.execPath,
      ['node_modules/wrangler/bin/wrangler.js', 'pages', 'deploy', 'dist', '--project-name=leonas-shoop', '--branch', 'main'],
      { NODE_OPTIONS: '--dns-result-order=ipv4first' },
    );
    if (d !== 0) {
      emit('error', 'El deploy falló. Revisa los mensajes de arriba.');
      emit('fin', { ok: false });
      return res.end();
    }
    emit('fin', { ok: true, url: 'https://leonas-shoop.pages.dev' });
    res.end();
  } catch (e) {
    emit('error', e.message);
    emit('fin', { ok: false });
    res.end();
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname === '/') {
      const html = readFileSync(path.join(ROOT, 'scripts/panel.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(html);
    }

    if (req.method === 'GET' && url.pathname === '/api/datos') {
      const cfg = leerConfig();
      return json(res, 200, {
        productos: leerProductos(),
        categorias: cfg.categorias,
        simbolo: cfg.simbolo,
        moneda: cfg.moneda,
        imagenesExistentes: readdirSync(IMG_DIR),
      });
    }

    if (req.method === 'GET' && url.pathname.startsWith('/img/')) {
      const nombre = path.basename(url.pathname);
      const archivo = path.join(IMG_DIR, nombre);
      if (!existsSync(archivo)) return json(res, 404, { error: 'no existe' });
      res.writeHead(200, { 'Content-Type': mimeDe(nombre), 'Cache-Control': 'public, max-age=300' });
      return res.end(readFileSync(archivo));
    }

    if (req.method === 'POST' && url.pathname === '/api/guardar') {
      const datos = JSON.parse(await leerBody(req));
      const cfg = leerConfig();
      const lista = leerProductos();
      const errs = validarProducto(datos.producto, cfg.categorias.map((c) => c.slug));
      if (errs.length) return json(res, 400, { error: errs.join(' · ') });

      const idx = lista.findIndex((p) => p.id === datos.producto.id);
      const modo = datos.modo === 'editar' ? 'editar' : 'crear';
      if (modo === 'crear' && idx >= 0) return json(res, 400, { error: 'Ya existe un producto con ese id' });
      if (modo === 'editar' && idx < 0) return json(res, 400, { error: 'El producto ya no existe' });

      const producto = { ...datos.producto };
      if (Array.isArray(datos.nuevasImagenes)) {
        for (const nueva of datos.nuevasImagenes) {
          producto.imagenes.push(guardarDataUrl(nueva.dataUrl, producto.id));
        }
      }
      producto.imagenes = producto.imagenes.slice(0, 10);

      if (modo === 'editar') lista[idx] = producto;
      else lista.push(producto);
      guardarProductos(lista);
      return json(res, 200, { ok: true, producto });
    }

    if (req.method === 'POST' && url.pathname === '/api/eliminar') {
      const { id } = JSON.parse(await leerBody(req));
      const lista = leerProductos();
      const antes = lista.length;
      const nueva = lista.filter((p) => p.id !== id);
      if (nueva.length === antes) return json(res, 404, { error: 'Producto no encontrado' });
      guardarProductos(nueva);
      return json(res, 200, { ok: true });
    }

    if (req.method === 'POST' && url.pathname === '/api/publicar') {
      return publicar(res);
    }

    json(res, 404, { error: 'Ruta no encontrada' });
  } catch (e) {
    json(res, 500, { error: e.message || 'Error interno' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Panel de Leonas Shoop → http://localhost:${PORT}`);
  console.log('Ctrl+C para cerrar.');
});
