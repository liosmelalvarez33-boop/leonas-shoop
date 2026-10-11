// Lista de espera: "avísame cuando esté disponible".
// POST /api/lista-espera { product_id, nombre, telefono } -> guarda (rate limit)
// GET /api/lista-espera (admin) -> lista agrupada por producto
// POST /api/lista-espera con { accion: 'avisado', id } (admin) -> marca avisado
import { json, error, leerJson, exigirSesion, esTexto, permitido, ipDe } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  let cuerpo;
  try {
    cuerpo = await leerJson(request, 4096);
  } catch {
    return error('Datos no legibles');
  }

  // Acción admin.
  if (cuerpo.accion === 'avisado') {
    const denegado = await exigirSesion(request, env);
    if (denegado) return denegado;
    const id = String(cuerpo.id || '');
    if (!esTexto(id, 80)) return error('ID no válido');
    if (env.DB && typeof env.DB.prepare === 'function') {
      try {
        await env.DB.prepare(`UPDATE lista_espera SET avisado_en = datetime('now') WHERE id = ?`).bind(id).run();
        return json({ ok: true, fuente: 'd1' });
      } catch {
        /* caer a KV */
      }
    }
    try {
      const raw = await env.DATOS.get('lista_espera');
      const lista = raw ? JSON.parse(raw) : [];
      const it = lista.find((x) => x.id === id);
      if (!it) return error('No existe', 404);
      it.avisado_en = new Date().toISOString();
      await env.DATOS.put('lista_espera', JSON.stringify(lista));
      return json({ ok: true, fuente: 'kv' });
    } catch {
      return error('No se pudo actualizar', 500);
    }
  }

  // Alta pública.
  const ip = ipDe(request);
  if (!(await permitido(env, `rl:espera:${ip}`, 5, 600))) {
    return error('Demasiados intentos. Espera unos minutos.', 429);
  }

  const product_id = String(cuerpo.product_id || '').slice(0, 60);
  const nombre = String(cuerpo.nombre || '').trim().slice(0, 120);
  const telefono = String(cuerpo.telefono || '').replace(/\D/g, '').slice(0, 15);
  if (!esTexto(product_id, 60) || !product_id) return error('Producto no válido');
  if (!nombre) return error('Escribe tu nombre');
  if (telefono.length < 7) return error('Escribe un teléfono válido');

  const id = crypto.randomUUID();
  const fecha = new Date().toISOString();

  if (env.DB && typeof env.DB.prepare === 'function') {
    try {
      await env.DB.prepare(
        'INSERT INTO lista_espera (id, product_id, nombre, telefono) VALUES (?, ?, ?, ?)'
      ).bind(id, product_id, nombre, telefono).run();
      return json({ ok: true, fuente: 'd1' });
    } catch {
      /* caer a KV */
    }
  }

  try {
    const raw = await env.DATOS.get('lista_espera');
    const lista = raw ? JSON.parse(raw) : [];
    lista.unshift({ id, product_id, nombre, telefono, creada_en: fecha, avisado_en: null });
    await env.DATOS.put('lista_espera', JSON.stringify(lista.slice(0, 300)));
    return json({ ok: true, fuente: 'kv' });
  } catch {
    return error('No se pudo guardar', 500);
  }
}

export async function onRequestGet({ request, env }) {
  const denegado = await exigirSesion(request, env);
  if (denegado) return denegado;

  if (env.DB && typeof env.DB.prepare === 'function') {
    try {
      const res = await env.DB.prepare(
        `SELECT l.*, p.titulo FROM lista_espera l LEFT JOIN products p ON p.id = l.product_id ORDER BY l.creada_en DESC LIMIT 300`
      ).all();
      return json({ espera: res.results || [], fuente: 'd1' });
    } catch {
      /* caer a KV */
    }
  }

  try {
    const raw = await env.DATOS.get('lista_espera');
    return json({ espera: raw ? JSON.parse(raw) : [], fuente: 'kv' });
  } catch {
    return json({ espera: [] });
  }
}
