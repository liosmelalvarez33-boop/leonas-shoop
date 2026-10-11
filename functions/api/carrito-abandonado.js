// Carritos abandonados: el frontend guarda el carrito si el usuario no completa el pedido.
// POST /api/carrito-abandonado { session_id, items, client_data, total } -> guarda
// GET /api/carrito-abandonado (admin) -> lista últimos 50
import { json, error, leerJson, exigirSesion, esTexto } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  let cuerpo;
  try {
    cuerpo = await leerJson(request, 32 * 1024);
  } catch {
    return error('Datos no legibles');
  }
  const session_id = String(cuerpo.session_id || '').slice(0, 60);
  if (!session_id) return error('Falta sesión');
  if (!Array.isArray(cuerpo.items) || cuerpo.items.length === 0 || cuerpo.items.length > 40) {
    return error('Carrito vacío');
  }
  const total = Math.round(Number(cuerpo.total || 0));
  if (!Number.isInteger(total) || total <= 0 || total > 10000000) return error('Total no válido');

  const items = cuerpo.items.slice(0, 40).map((it) => ({
    id: String(it.id || '').slice(0, 60),
    titulo: String(it.titulo || '').slice(0, 90),
    precio: Math.round(Number(it.precio || 0)),
    cantidad: Math.min(Math.max(Number(it.cantidad || 1), 1), 99),
    talla: it.talla ? String(it.talla).slice(0, 10) : null,
    imagen: typeof it.imagen === 'string' ? it.imagen.slice(0, 80) : null,
  }));

  const client_data = cuerpo.client_data && typeof cuerpo.client_data === 'object'
    ? {
        nombre: String(cuerpo.client_data.nombre || '').slice(0, 120),
        entrega: String(cuerpo.client_data.entrega || '').slice(0, 200),
      }
    : null;

  const id = `${session_id}-${Date.now()}`;

  if (env.DB && typeof env.DB.prepare === 'function') {
    try {
      await env.DB.prepare(
        'INSERT INTO abandoned_carts (id, session_id, items, client_data, total) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET items=excluded.items, client_data=excluded.client_data, total=excluded.total, abandoned_at=datetime("now")'
      ).bind(id, session_id, JSON.stringify(items), client_data ? JSON.stringify(client_data) : null, total).run();
      return json({ ok: true, fuente: 'd1' });
    } catch {
      /* caer a KV */
    }
  }

  try {
    const raw = await env.DATOS.get('carritos_abandonados');
    const lista = raw ? JSON.parse(raw) : [];
    lista.unshift({ id, session_id, items, client_data, total, abandoned_at: new Date().toISOString() });
    await env.DATOS.put('carritos_abandonados', JSON.stringify(lista.slice(0, 100)));
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
        'SELECT id, session_id, items, client_data, total, abandoned_at, recovered_at FROM abandoned_carts WHERE recovered_at IS NULL ORDER BY abandoned_at DESC LIMIT 50'
      ).all();
      const carritos = (res.results || []).map((r) => ({
        ...r,
        items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
        client_data: r.client_data ? JSON.parse(r.client_data) : null,
      }));
      return json({ carritos, fuente: 'd1' });
    } catch {
      /* caer a KV */
    }
  }

  try {
    const raw = await env.DATOS.get('carritos_abandonados');
    return json({ carritos: raw ? JSON.parse(raw).slice(0, 50) : [], fuente: 'kv' });
  } catch {
    return json({ carritos: [] });
  }
}
