// Registro de pedidos: validación server-side + reserva de stock 15 min.
// Fase 2: precios desde DB, stock por talla, reserva atómica. Fallback KV si no hay D1.
import { json, error, leerJson, getPedidos, getProductos, validarPedido, permitido, ipDe } from '../_lib.js';
import { crearPedidoD1, tieneD1, liberarReservasExpiradas } from '../_d1.js';

const METODOS_PAGO = ['efectivo', 'transfermovil'];

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

  const metodo_pago = METODOS_PAGO.includes(cuerpo.metodo_pago) ? cuerpo.metodo_pago : 'efectivo';

  const items = cuerpo.items.map((it) => ({
    product_id: typeof it.id === 'string' && it.id ? it.id : null,
    titulo: String(it.titulo || ''),
    precio: Number(it.precio),
    cantidad: Number(it.cantidad),
    talla: it.talla ?? null,
    imagen: it.imagen ?? null,
  }));

  const base = {
    nombre: cuerpo.nombre.trim(),
    entrega: cuerpo.entrega.trim(),
    notas: (cuerpo.notas || '').trim(),
    total: Number(cuerpo.total),
    metodo_pago,
    telefono: typeof cuerpo.telefono === 'string' ? cuerpo.telefono.trim().slice(0, 20) : null,
  };

  // D1: validación + reserva.
  if (tieneD1(env)) {
    const creado = await crearPedidoD1(env, base, items);
    if (creado && creado.error) return error(creado.error, 409);
    if (creado && creado.id) {
      return json({ ok: true, numero: creado.numero, id: creado.id, fuente: 'd1', metodo_pago, expira: creado.expira });
    }
    // Si D1 falla inesperadamente, seguir a KV.
  } else {
    // Sin D1: validar precios contra KV para evitar manipulación básica.
    try {
      const productos = await getProductos(env);
      const mapa = new Map(productos.map((p) => [p.id, p]));
      let totalReal = 0;
      for (const it of items) {
        const real = it.product_id ? mapa.get(it.product_id) : null;
        const precio = real ? Number(real.precio) : Number(it.precio);
        if (real && Number(it.precio) !== precio) {
          return error(`Precio de "${real.titulo}" cambió. Recarga el catálogo.`, 409);
        }
        if (real && real.estado === 'vendido') {
          return error(`"${real.titulo}" ya está vendido.`, 409);
        }
        totalReal += precio * it.cantidad;
      }
      if (totalReal !== Number(base.total)) return error('El total no coincide.', 409);
    } catch {
      /* si falla la verificación KV, seguir con validación básica */
    }
  }

  await liberarReservasExpiradas(env).catch(() => {});

  const numeroActual = Number((await env.DATOS.get('pedidos:contador')) || '0');
  const n = numeroActual + 1;
  const pedido = {
    id: crypto.randomUUID(),
    n,
    fecha: new Date().toISOString(),
    ...base,
    items: items.map((it) => ({
      titulo: it.titulo,
      precio: it.precio,
      cantidad: it.cantidad,
      talla: it.talla,
      imagen: it.imagen,
    })),
    estado: 'pendiente',
  };

  const pedidos = await getPedidos(env);
  pedidos.unshift(pedido);
  const recortados = pedidos.slice(0, 300);
  await env.DATOS.put('pedidos', JSON.stringify(recortados));
  await env.DATOS.put('pedidos:contador', String(n));

  return json({ ok: true, numero: n, id: pedido.id, fuente: 'kv', metodo_pago });
}
