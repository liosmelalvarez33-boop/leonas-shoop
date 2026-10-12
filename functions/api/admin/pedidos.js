// Pedidos del panel: listar, cambiar estado o eliminar.
// Fase 1: D1 primero (estados extendidos + pago), KV como respaldo.
import { json, error, leerJson, exigirSesion, getPedidos, esTexto } from '../../_lib.js';
import { getPedidosD1, actualizarEstadoPedidoD1, eliminarPedidoD1, tieneD1, resolverReservaPedido, auditar } from '../../_d1.js';

const ESTADOS = ['pendiente', 'confirmado', 'en_preparacion', 'en_camino', 'entregado', 'cancelado'];
// Compatibilidad con estados antiguos.
const ESTADOS_LEGACY = ['pendiente', 'confirmado', 'entregado', 'cancelado'];

export async function onRequestGet({ request, env }) {
  const denegado = await exigirSesion(request, env);
  if (denegado) return denegado;
  const d1 = await getPedidosD1(env);
  if (d1) return json({ pedidos: d1, fuente: 'd1' });
  return json({ pedidos: await getPedidos(env), fuente: 'kv' });
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
  if (!esTexto(id, 80)) return error('ID de pedido no válido');

  if (cuerpo.accion === 'estado') {
    const estado = String(cuerpo.estado ?? '');
    if (!ESTADOS.includes(estado) && !ESTADOS_LEGACY.includes(estado)) return error('Estado no válido');
    if (tieneD1(env)) {
      const ok = await actualizarEstadoPedidoD1(env, id, estado);
      if (ok) {
        // Confirmar/entregar: la reserva se vuelve definitiva. Cancelar: devolver stock.
        if (['confirmado', 'en_preparacion', 'en_camino', 'entregado'].includes(estado)) {
          await resolverReservaPedido(env, id, 'confirmar');
        } else if (estado === 'cancelado') {
          await resolverReservaPedido(env, id, 'cancelar');
        }
        await auditar(env, 'admin_pedido_estado', { pedido_id: id, metodo: estado });
        return json({ ok: true, fuente: 'd1' });
      }
    }
    const pedidos = await getPedidos(env);
    const indice = pedidos.findIndex((p) => p.id === id);
    if (indice < 0) return error('Ese pedido no existe', 404);
    pedidos[indice].estado = estado;
    pedidos[indice].actualizado = new Date().toISOString();
    await env.DATOS.put('pedidos', JSON.stringify(pedidos));
    return json({ ok: true, pedido: pedidos[indice], fuente: 'kv' });
  }

  if (cuerpo.accion === 'eliminar') {
    if (tieneD1(env)) {
      await resolverReservaPedido(env, id, 'cancelar');
      const ok = await eliminarPedidoD1(env, id);
      if (ok) {
        await auditar(env, 'admin_eliminar_pedido', { pedido_id: id });
        return json({ ok: true, fuente: 'd1' });
      }
    }
    const pedidos = await getPedidos(env);
    const indice = pedidos.findIndex((p) => p.id === id);
    if (indice < 0) return error('Ese pedido no existe', 404);
    pedidos.splice(indice, 1);
    await env.DATOS.put('pedidos', JSON.stringify(pedidos));
    return json({ ok: true, fuente: 'kv' });
  }

  if (cuerpo.accion === 'pago') {
    const confirmado = Boolean(cuerpo.confirmado);
    if (tieneD1(env)) {
      try {
        await env.DB.prepare('UPDATE orders SET pago_confirmado = ? WHERE id = ?').bind(confirmado ? 1 : 0, id).run();
        await auditar(env, 'admin_confirmar_pago', { pedido_id: id });
        return json({ ok: true, fuente: 'd1' });
      } catch {
        /* caer a KV */
      }
    }
    const pedidos = await getPedidos(env);
    const indice = pedidos.findIndex((p) => p.id === id);
    if (indice < 0) return error('Ese pedido no existe', 404);
    pedidos[indice].pago_confirmado = confirmado;
    pedidos[indice].actualizado = new Date().toISOString();
    await env.DATOS.put('pedidos', JSON.stringify(pedidos));
    return json({ ok: true, fuente: 'kv' });
  }

  return error('Acción no válida');
}
