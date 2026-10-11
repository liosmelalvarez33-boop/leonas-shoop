// Utilidades compartidas de las Functions: datos, sesiones y validación.
import baseProductos from '../src/data/products.json';
import baseConfig from '../src/data/config.json';

const encoder = new TextEncoder();

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

export function error(mensaje, status = 400) {
  return json({ error: mensaje }, status);
}

export async function leerJson(request, maxBytes = 9 * 1024 * 1024) {
  const largo = Number(request.headers.get('content-length') || 0);
  if (largo > maxBytes) throw new Error('Los datos son demasiado grandes');
  return request.json();
}

// ---------- Datos en KV (con respaldo a los archivos del repo) ----------

export async function getProductos(env) {
  const raw = await env.DATOS.get('productos');
  if (!raw) return JSON.parse(JSON.stringify(baseProductos));
  try {
    const lista = JSON.parse(raw);
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export async function getConfig(env) {
  const raw = await env.DATOS.get('config');
  if (!raw) return baseConfig;
  try {
    const cfg = JSON.parse(raw);
    return { ...baseConfig, ...cfg };
  } catch {
    return baseConfig;
  }
}

export async function getPedidos(env) {
  const raw = await env.DATOS.get('pedidos');
  if (!raw) return [];
  try {
    const lista = JSON.parse(raw);
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

// ---------- Sesión del panel ----------

async function hmacHex(secret, mensaje) {
  const clave = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const firma = await crypto.subtle.sign('HMAC', clave, encoder.encode(mensaje));
  return [...new Uint8Array(firma)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function iguales(a, b) {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

export async function tieneSesion(request, env) {
  if (!env.SESSION_SECRET) return false;
  const cookie = request.headers.get('cookie') || '';
  const m = cookie.match(/(?:^|;\s*)ls_admin=([^;]+)/);
  if (!m) return false;
  const partes = decodeURIComponent(m[1]).split('.');
  if (partes.length !== 2) return false;
  const [exp, firma] = partes;
  if (!/^\d+$/.test(exp) || Number(exp) * 1000 < Date.now()) return false;
  const esperada = await hmacHex(env.SESSION_SECRET, 'ls_admin:' + exp);
  return iguales(esperada, firma);
}

export async function cookieDeSesion(env) {
  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
  const firma = await hmacHex(env.SESSION_SECRET, 'ls_admin:' + exp);
  return `ls_admin=${exp}.${firma}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${30 * 24 * 3600}`;
}

export function cookieVacia() {
  return 'ls_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
}

export async function exigirSesion(request, env) {
  if (await tieneSesion(request, env)) return null;
  return error('Sesión no válida. Vuelve a entrar.', 401);
}

async function sha256hex(texto) {
  const h = await crypto.subtle.digest('SHA-256', encoder.encode(String(texto)));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function claveCorrecta(intento, env) {
  const a = await sha256hex(intento);
  const b = await sha256hex(env.ADMIN_PASSWORD || '');
  return iguales(a, b);
}

// ---------- Límite de intentos (a prueba de fuerza bruta) ----------

export function ipDe(request) {
  return request.headers.get('cf-connecting-ip') || 'desconocida';
}

export async function permitido(env, clave, maximo, ventanaSeg) {
  const ahora = Math.floor(Date.now() / 1000);
  const raw = await env.DATOS.get(clave);
  let n = 1;
  let exp = ahora + ventanaSeg;
  if (raw) {
    try {
      const d = JSON.parse(raw);
      if (d && d.exp > ahora) {
        n = d.n + 1;
        exp = d.exp;
      }
    } catch {
      /* contador dañado: empezar de nuevo */
    }
  }
  await env.DATOS.put(clave, JSON.stringify({ n, exp }), { expirationTtl: ventanaSeg });
  return n <= maximo;
}

// ---------- Validación ----------

export const esSlug = (s) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 60;
export const esTexto = (s, max) => typeof s === 'string' && s.length <= max;

export function validarProducto(p) {
  if (!p || typeof p !== 'object') return 'Producto no válido';
  if (!esSlug(p.id)) return 'ID no válido (usa minúsculas y guiones)';
  if (!esTexto(p.titulo, 90) || !p.titulo.trim()) return 'Título no válido';
  if (!esTexto(p.categoria, 40) || !/^[a-z0-9-]+$/.test(p.categoria)) return 'Categoría no válida';
  const precio = Number(p.precio);
  if (!Number.isInteger(precio) || precio < 0 || precio > 10000000) return 'Precio no válido';
  if (!['nuevo', 'segundo-uso'].includes(p.condicion)) return 'Condición no válida';
  if (!['disponible', 'reservado', 'vendido'].includes(p.estado)) return 'Estado no válido';
  if (!Array.isArray(p.tallas) || p.tallas.length > 10) return 'Tallas no válidas';
  if (p.tallas.some((t) => !esTexto(t, 10))) return 'Tallas no válidas';
  if (!esTexto(p.descripcion ?? '', 1000)) return 'Descripción demasiado larga';
  if (!Array.isArray(p.imagenes) || p.imagenes.length > 10) return 'Imágenes no válidas';
  if (p.imagenes.some((f) => !/^[A-Za-z0-9._-]{1,80}$/.test(f))) return 'Nombre de imagen no válido';
  return null;
}

export function validarConfig(c) {
  if (!c || typeof c !== 'object') return 'Configuración no válida';
  const textos = ['nombre', 'slogan', 'whatsapp', 'whatsappVisible', 'horario', 'entregas', 'pagos', 'ubicacion'];
  for (const k of textos) {
    if (k in c && !esTexto(c[k] ?? '', 300)) return `Dato demasiado largo: ${k}`;
  }
  if ('whatsapp' in c) {
    const digitos = String(c.whatsapp ?? '').replace(/\D/g, '');
    if (digitos.length < 7 || digitos.length > 15) return 'Número de WhatsApp no válido';
  }
  if (c.redes && typeof c.redes === 'object') {
    for (const [red, url] of Object.entries(c.redes)) {
      if (!['facebook', 'instagram', 'tiktok'].includes(red)) return 'Red social no válida';
      if (!esTexto(url ?? '', 200)) return 'Enlace de red social demasiado largo';
    }
  }
  if (c.categorias) {
    if (!Array.isArray(c.categorias) || c.categorias.length > 20) return 'Categorías no válidas';
    for (const cat of c.categorias) {
      if (!esSlug(cat.slug)) return 'Slug de categoría no válido';
      if (!esTexto(cat.nombre ?? '', 40) || !cat.nombre?.trim()) return 'Nombre de categoría no válido';
      if (!esTexto(cat.descripcion ?? '', 140)) return 'Descripción de categoría demasiado larga';
      if (cat.icono && !['ropa', 'zapatos', 'accesorios', 'hogar', 'otros'].includes(cat.icono)) {
        return 'Icono de categoría no válido';
      }
    }
  }
  return null;
}

export function validarPedido(o) {
  if (!o || typeof o !== 'object') return 'Pedido no válido';
  if (!esTexto(o.nombre ?? '', 120) || !o.nombre?.trim()) return 'Falta el nombre';
  if (!esTexto(o.entrega ?? '', 200) || !o.entrega?.trim()) return 'Falta el lugar de entrega';
  if (!esTexto(o.notas ?? '', 500)) return 'Notas demasiado largas';
  if (o.metodo_pago !== undefined && !['efectivo', 'transfermovil'].includes(o.metodo_pago)) {
    return 'Método de pago no válido';
  }
  if (o.telefono !== undefined && o.telefono !== null && !esTexto(String(o.telefono), 20)) {
    return 'Teléfono no válido';
  }
  if (!Array.isArray(o.items) || o.items.length < 1 || o.items.length > 40) return 'Artículos no válidos';
  let total = 0;
  for (const it of o.items) {
    if (!esTexto(it.titulo ?? '', 90)) return 'Artículo no válido';
    const precio = Number(it.precio);
    const cantidad = Number(it.cantidad);
    if (!Number.isInteger(precio) || precio < 0 || precio > 10000000) return 'Precio no válido';
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99) return 'Cantidad no válida';
    if (it.talla != null && !esTexto(it.talla, 10)) return 'Talla no válida';
    if (it.imagen != null && !/^[A-Za-z0-9._-]{1,80}$/.test(it.imagen)) return 'Imagen no válida';
    if (it.id != null && !esTexto(String(it.id), 60)) return 'ID de artículo no válido';
    total += precio * cantidad;
  }
  if (Number(o.total ?? -1) !== total) return 'El total no coincide';
  return null;
}
