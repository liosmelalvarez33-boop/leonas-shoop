// Registro de pedidos: el cliente guarda su pedido antes de abrir WhatsApp.
import { json, error, leerJson, getPedidos, validarPedido, permitido, ipDe } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  const ip = ipDe(request);
  if (!(await permitido(env, `rl:pedido:${ip}`, 6, 300))) {
    return error('Demasiados pedidos en poco tiempo. Espera unos minutos.', 429);
  }

  let cuerpo;
  try {
    cuerpo = await leerJson(request);
  } catch {
    return error('Datos no legibles');
  }

  const fallo = validarPedido(cuerpo);
  if (fallo) return error(fallo);

  const numeroActual = Number((await env.DATOS.get('pedidos:contador')) || '0');
  const n = numeroActual + 1;
  const pedido = {
    id: crypto.randomUUID(),
    n,
    fecha: new Date().toISOString(),
    nombre: cuerpo.nombre.trim(),
    entrega: cuerpo.entrega.trim(),
    notas: (cuerpo.notas || '').trim(),
    items: cuerpo.items.map((it) => ({
      titulo: it.titulo,
      precio: Number(it.precio),
      cantidad: Number(it.cantidad),
      talla: it.talla ?? null,
      imagen: it.imagen ?? null,
    })),
    total: Number(cuerpo.total),
    estado: 'pendiente',
  };

  const pedidos = await getPedidos(env);
  pedidos.unshift(pedido);
  // Conservar los últimos 300 pedidos.
  const recortados = pedidos.slice(0, 300);
  await env.DATOS.put('pedidos', JSON.stringify(recortados));
  await env.DATOS.put('pedidos:contador', String(n));

  return json({ ok: true, numero: n, id: pedido.id });
}
