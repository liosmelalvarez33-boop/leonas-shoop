// Pedidos del panel: listar, cambiar estado o eliminar.
import { json, error, leerJson, exigirSesion, getPedidos, esTexto } from '../../_lib.js';

const ESTADOS = ['pendiente', 'confirmado', 'entregado', 'cancelado'];

export async function onRequestGet({ request, env }) {
  const denegado = await exigirSesion(request, env);
  if (denegado) return denegado;
  return json({ pedidos: await getPedidos(env) });
}

export async function onRequestPost({ request, env }) {
  const denegado = await exigirSesion(request, env);
  if (denegado) return denegado;

  let cuerpo;
  try {
    cuerpo = await leerJson(request, 8 * 1024);
  } catch {
    return error('Datos no legibles');
  }

  const id = String(cuerpo.id ?? '');
  if (!esTexto(id, 60)) return error('ID de pedido no válido');

  const pedidos = await getPedidos(env);
  const indice = pedidos.findIndex((p) => p.id === id);
  if (indice < 0) return error('Ese pedido no existe', 404);

  if (cuerpo.accion === 'estado') {
    if (!ESTADOS.includes(cuerpo.estado)) return error('Estado no válido');
    pedidos[indice].estado = cuerpo.estado;
    pedidos[indice].actualizado = new Date().toISOString();
    await env.DATOS.put('pedidos', JSON.stringify(pedidos));
    return json({ ok: true, pedido: pedidos[indice] });
  }

  if (cuerpo.accion === 'eliminar') {
    pedidos.splice(indice, 1);
    await env.DATOS.put('pedidos', JSON.stringify(pedidos));
    return json({ ok: true });
  }

  return error('Acción no válida');
}
