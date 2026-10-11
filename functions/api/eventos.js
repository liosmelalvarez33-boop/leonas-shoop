// Analítica propia mínima: embudo sin rastreo entre sitios.
// POST /api/eventos { tipo, pagina?, producto_id?, pedido_id?, monto?, metodo? }
// Tipos: page_view, search, cart_add, checkout_start, checkout_complete, tm_opened, fav_add, espera_add
import { json, error, leerJson } from '../_lib.js';

const TIPOS = ['page_view', 'search', 'cart_add', 'checkout_start', 'checkout_complete', 'tm_opened', 'fav_add', 'espera_add'];

export async function onRequestPost({ request, env }) {
  let cuerpo;
  try {
    cuerpo = await leerJson(request, 4096);
  } catch {
    return error('Datos no legibles');
  }

  const tipo = String(cuerpo.tipo || '');
  if (!TIPOS.includes(tipo)) return error('Evento no válido');

  const fila = {
    tipo,
    pagina: typeof cuerpo.pagina === 'string' ? cuerpo.pagina.slice(0, 120) : null,
    producto_id: typeof cuerpo.producto_id === 'string' ? cuerpo.producto_id.slice(0, 60) : null,
    pedido_id: typeof cuerpo.pedido_id === 'string' ? cuerpo.pedido_id.slice(0, 80) : null,
    monto: Number.isInteger(cuerpo.monto) ? Math.min(Math.max(cuerpo.monto, 0), 10000000) : null,
    metodo: typeof cuerpo.metodo === 'string' ? cuerpo.metodo.slice(0, 20) : null,
  };

  if (env.DB && typeof env.DB.prepare === 'function') {
    try {
      await env.DB.prepare(
        'INSERT INTO eventos (tipo, pagina, producto_id, pedido_id, monto, metodo) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(fila.tipo, fila.pagina, fila.producto_id, fila.pedido_id, fila.monto, fila.metodo).run();
      return json({ ok: true, fuente: 'd1' });
    } catch {
      return json({ ok: true, fuente: 'noop' });
    }
  }

  return json({ ok: true, fuente: 'noop' });
}
