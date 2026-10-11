// Adaptador D1 para Functions (JS): usa D1 si existe, si no devuelve null para fallback a KV.
export function tieneD1(env) {
  return Boolean(env && env.DB && typeof env.DB.prepare === 'function');
}

export function tieneR2(env) {
  return Boolean(env && env.IMAGES && typeof env.IMAGES.get === 'function');
}

function centavosAPesos(c) {
  return Math.round(Number(c || 0) / 100);
}

function pesosACentavos(p) {
  return Math.round(Number(p || 0) * 100);
}

// ---------- Productos ----------
export async function getProductosD1(env) {
  if (!tieneD1(env)) return null;
  try {
    const res = await env.DB.prepare(
      'SELECT id, titulo, categoria, precio, condicion, estado, descripcion, destacado FROM products ORDER BY created_at DESC LIMIT 500'
    ).all();
    if (!res || !res.results) return null;
    const productos = [];
    for (const r of res.results) {
      const variantes = await env.DB.prepare(
        'SELECT talla FROM product_variants WHERE product_id = ? ORDER BY talla'
      ).bind(r.id).all().catch(() => ({ results: [] }));
      const imagenes = await env.DB.prepare(
        'SELECT r2_key FROM product_images WHERE product_id = ? ORDER BY orden'
      ).bind(r.id).all().catch(() => ({ results: [] }));
      productos.push({
        id: r.id,
        titulo: r.titulo,
        categoria: r.categoria,
        precio: centavosAPesos(r.precio),
        condicion: r.condicion,
        estado: r.estado,
        descripcion: r.descripcion || '',
        destacado: Boolean(r.destacado),
        tallas: (variantes.results || []).map((v) => v.talla),
        imagenes: (imagenes.results || []).map((im) => String(im.r2_key || '').split('/').pop() || ''),
      });
    }
    return productos;
  } catch {
    return null;
  }
}

// ---------- Config ----------
export async function getConfigD1(env, baseConfig) {
  if (!tieneD1(env)) return null;
  try {
    const res = await env.DB.prepare('SELECT key, value FROM site_config').all();
    if (!res || !res.results || res.results.length === 0) return null;
    const cfg = { ...(baseConfig || {}) };
    for (const row of res.results) {
      if (row.key === 'redes' || row.key === 'categorias') {
        try {
          cfg[row.key] = JSON.parse(row.value);
        } catch {
          /* ignorar */
        }
      } else {
        cfg[row.key] = row.value;
      }
    }
    return cfg;
  } catch {
    return null;
  }
}

// ---------- Pedidos ----------
export async function getPedidosD1(env) {
  if (!tieneD1(env)) return null;
  try {
    const res = await env.DB.prepare(
      'SELECT id, numero, fecha, nombre, entrega, notas, total, estado, metodo_pago, pago_confirmado, cliente_telefono FROM orders ORDER BY fecha DESC LIMIT 300'
    ).all();
    if (!res || !res.results) return null;
    const pedidos = [];
    for (const o of res.results) {
      const items = await env.DB.prepare(
        'SELECT titulo, precio, cantidad, talla, imagen_r2_key FROM order_items WHERE order_id = ?'
      ).bind(o.id).all().catch(() => ({ results: [] }));
      pedidos.push({
        id: o.id,
        n: o.numero,
        numero: o.numero,
        fecha: o.fecha,
        nombre: o.nombre,
        entrega: o.entrega,
        notas: o.notas || '',
        total: centavosAPesos(o.total),
        estado: o.estado,
        telefono: o.cliente_telefono || null,
        metodo_pago: o.metodo_pago,
        pago_confirmado: Boolean(o.pago_confirmado),
        items: (items.results || []).map((it) => ({
          titulo: it.titulo,
          precio: centavosAPesos(it.precio),
          cantidad: it.cantidad,
          talla: it.talla,
          imagen: it.imagen_r2_key ? String(it.imagen_r2_key).split('/').pop() : null,
        })),
      });
    }
    return pedidos;
  } catch {
    return null;
  }
}

export async function crearPedidoD1(env, pedido, items) {
  if (!tieneD1(env)) return null;
  try {
    await liberarReservasExpiradas(env);
    const validacion = await validarItemsContraDB(env, items);
    if (!validacion.ok) return { error: validacion.error };
    // El total debe coincidir con precios reales (evita manipulación).
    if (validacion.totalReal !== Math.round(Number(pedido.total))) {
      return { error: `El total no coincide (esperado $${validacion.totalReal})` };
    }
    const counter = await env.DB.prepare(
      'UPDATE order_counter SET value = value + 1 WHERE id = 1 RETURNING value'
    ).first();
    const numero = counter?.value ?? Date.now() % 1000000;
    const id = crypto.randomUUID();
    const fecha = new Date().toISOString();
    const expira = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const batch = [];
    batch.push(
      env.DB.prepare(
        'INSERT INTO orders (id, numero, fecha, nombre, entrega, notas, total, estado, metodo_pago, pago_confirmado, cliente_telefono, expira_reserva_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        id,
        numero,
        fecha,
        pedido.nombre,
        pedido.entrega,
        pedido.notas || '',
        pesosACentavos(pedido.total),
        'pendiente',
        pedido.metodo_pago || 'efectivo',
        0,
        pedido.telefono || null,
        expira
      )
    );
    for (const it of validacion.itemsValidados) {
      batch.push(
        env.DB.prepare(
          'INSERT INTO order_items (order_id, product_id, titulo, precio, cantidad, talla, imagen_r2_key) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          id,
          it.product_id || null,
          it.titulo,
          pesosACentavos(it.precio),
          it.cantidad,
          it.talla ?? null,
          it.imagen ? `products/${it.product_id || 'varios'}/${it.imagen}` : null
        )
      );
      // Reservar stock: descontar ahora, registrar reserva para poder liberar.
      if (it.product_id && it.talla) {
        batch.push(
          env.DB.prepare(
            'UPDATE product_variants SET stock = stock - ? WHERE product_id = ? AND talla = ?'
          ).bind(it.cantidad, it.product_id, it.talla)
        );
        batch.push(
          env.DB.prepare(
            'INSERT INTO stock_reservas (id, order_id, product_id, talla, cantidad, expira_en) VALUES (?, ?, ?, ?, ?, ?)'
          ).bind(crypto.randomUUID(), id, it.product_id, it.talla, it.cantidad, expira)
        );
      }
    }
    await env.DB.batch(batch);
    return { id, numero, fecha, expira };
  } catch (e) {
    return null;
  }
}

// Valida precios/stock contra D1. Devuelve precios reales.
export async function validarItemsContraDB(env, items) {
  const itemsValidados = [];
  let totalReal = 0;
  for (const it of items) {
    const cantidad = Math.min(Math.max(Number(it.cantidad) || 1, 1), 99);
    // Si no trae product_id, no podemos validar stock: aceptar pero marcar.
    if (!it.product_id) {
      const precio = Math.round(Number(it.precio));
      totalReal += precio * cantidad;
      itemsValidados.push({ ...it, cantidad, precio });
      continue;
    }
    const prod = await env.DB.prepare(
      'SELECT id, titulo, precio, estado FROM products WHERE id = ?'
    ).bind(it.product_id).first().catch(() => null);
    if (!prod) return { ok: false, error: `Producto no encontrado: ${it.titulo}` };
    if (prod.estado === 'vendido') return { ok: false, error: `"${prod.titulo}" ya está vendido` };
    const precioReal = Math.round(Number(prod.precio) / 100);
    // Precio manipulado.
    if (Math.round(Number(it.precio)) !== precioReal) {
      return { ok: false, error: `Precio de "${prod.titulo}" cambió. Recarga el catálogo.` };
    }
    const talla = it.talla ?? null;
    if (talla) {
      const variante = await env.DB.prepare(
        'SELECT stock FROM product_variants WHERE product_id = ? AND talla = ?'
      ).bind(it.product_id, talla).first().catch(() => null);
      if (!variante) return { ok: false, error: `Talla ${talla} no disponible en "${prod.titulo}"` };
      if (Number(variante.stock) < cantidad) {
        return { ok: false, error: `Solo quedan ${variante.stock} de "${prod.titulo}" (talla ${talla})` };
      }
    }
    totalReal += precioReal * cantidad;
    itemsValidados.push({ ...it, cantidad, precio: precioReal, titulo: prod.titulo });
  }
  return { ok: true, itemsValidados, totalReal };
}

// Libera reservas vencidas (>15 min) y devuelve stock.
export async function liberarReservasExpiradas(env) {
  if (!tieneD1(env)) return 0;
  try {
    const ahora = new Date().toISOString();
    const vencidas = await env.DB.prepare(
      'SELECT id, order_id, product_id, talla, cantidad FROM stock_reservas WHERE expira_en <= ? LIMIT 100'
    ).bind(ahora).all().catch(() => ({ results: [] }));
    const lista = vencidas.results || [];
    if (lista.length === 0) return 0;
    const batch = [];
    for (const r of lista) {
      batch.push(
        env.DB.prepare('UPDATE product_variants SET stock = stock + ? WHERE product_id = ? AND talla = ?')
          .bind(r.cantidad, r.product_id, r.talla)
      );
      batch.push(env.DB.prepare('DELETE FROM stock_reservas WHERE id = ?').bind(r.id));
    }
    // Marcar pedidos vencidos aún pendientes.
    const orderIds = [...new Set(lista.map((r) => r.order_id))];
    for (const oid of orderIds) {
      batch.push(
        env.DB.prepare(`UPDATE orders SET reserva_liberada = 1 WHERE id = ? AND estado = 'pendiente' AND expira_reserva_en <= ?`)
          .bind(oid, ahora)
      );
    }
    await env.DB.batch(batch);
    return lista.length;
  } catch {
    return 0;
  }
}

// Al confirmar/cancelar desde admin: limpiar reservas y (si cancela) devolver stock.
export async function resolverReservaPedido(env, orderId, accion) {
  if (!tieneD1(env)) return false;
  try {
    const reservas = await env.DB.prepare(
      'SELECT id, product_id, talla, cantidad FROM stock_reservas WHERE order_id = ?'
    ).bind(orderId).all().catch(() => ({ results: [] }));
    const lista = reservas.results || [];
    const batch = [];
    if (accion === 'cancelar') {
      for (const r of lista) {
        batch.push(
          env.DB.prepare('UPDATE product_variants SET stock = stock + ? WHERE product_id = ? AND talla = ?')
            .bind(r.cantidad, r.product_id, r.talla)
        );
      }
    }
    for (const r of lista) {
      batch.push(env.DB.prepare('DELETE FROM stock_reservas WHERE id = ?').bind(r.id));
    }
    if (batch.length) await env.DB.batch(batch);
    return true;
  } catch {
    return false;
  }
}

export async function actualizarEstadoPedidoD1(env, id, estado) {
  if (!tieneD1(env)) return false;
  try {
    await env.DB.prepare('UPDATE orders SET estado = ? WHERE id = ?').bind(estado, id).run();
    return true;
  } catch {
    return false;
  }
}

export async function eliminarPedidoD1(env, id) {
  if (!tieneD1(env)) return false;
  try {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM order_items WHERE order_id = ?').bind(id),
      env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id),
    ]);
    return true;
  } catch {
    return false;
  }
}

export { pesosACentavos, centavosAPesos };
