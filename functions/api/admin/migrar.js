// Migración KV -> D1 (solo admin). POST /api/admin/migrar
// Lee productos/config/pedidos de KV y los inserta en D1. Idempotente.
import { json, error, exigirSesion, getProductos, getConfig, getPedidos } from '../../_lib.js';

function pesosACentavos(p) {
  return Math.round(Number(p || 0) * 100);
}

export async function onRequestPost({ request, env }) {
  const denegado = await exigirSesion(request, env);
  if (denegado) return denegado;

  if (!env.DB || typeof env.DB.batch !== 'function') {
    return error('D1 no está configurado (falta binding DB). Revisa wrangler.toml y crea la base.', 500);
  }

  const productos = await getProductos(env);
  const config = await getConfig(env);
  const pedidos = await getPedidos(env);

  const resumen = { productos: 0, variantes: 0, imagenes: 0, config: 0, pedidos: 0, items: 0 };

  // 1. Config
  try {
    const stmts = [];
    for (const [k, v] of Object.entries(config)) {
      const valor = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
      stmts.push(env.DB.prepare('INSERT INTO site_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(k, valor));
      resumen.config++;
    }
    // Asegurar claves mínimas aunque KV venga vacío.
    if (!config?.categorias) {
      stmts.push(env.DB.prepare('SELECT 1').bind());
    }
    await env.DB.batch(stmts);
  } catch (e) {
    return error('Falló migración de config: ' + String(e?.message || e), 500);
  }

  // 2. Productos + variantes + imágenes (en lotes de 20 para no saturar D1)
  try {
    for (let i = 0; i < productos.length; i += 20) {
      const lote = productos.slice(i, i + 20);
      const stmts = [];
      for (const p of lote) {
        stmts.push(
          env.DB.prepare(
            'INSERT INTO products (id, titulo, categoria, precio, condicion, estado, descripcion, destacado, slug) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET titulo=excluded.titulo, categoria=excluded.categoria, precio=excluded.precio, condicion=excluded.condicion, estado=excluded.estado, descripcion=excluded.descripcion, destacado=excluded.destacado'
          ).bind(
            p.id, p.titulo, p.categoria, pesosACentavos(p.precio),
            p.condicion, p.estado, p.descripcion || '',
            p.destacado ? 1 : 0, p.id
          )
        );
        resumen.productos++;
      }
      await env.DB.batch(stmts);
    }
    for (const p of productos) {
      const tallas = Array.isArray(p.tallas) && p.tallas.length ? p.tallas : ['Unica'];
      const stmts = tallas.slice(0, 10).map((t) => {
        const sku = `${p.id}-${t}`.toUpperCase().slice(0, 60);
        const stock = p.estado === 'disponible' ? 5 : 0;
        resumen.variantes++;
        return env.DB.prepare(
          'INSERT INTO product_variants (product_id, talla, stock, sku) VALUES (?, ?, ?, ?) ON CONFLICT(product_id, talla) DO NOTHING'
        ).bind(p.id, String(t), stock, sku);
      });
      if (stmts.length) await env.DB.batch(stmts);
      const imgs = Array.isArray(p.imagenes) ? p.imagenes.slice(0, 10) : [];
      if (imgs.length) {
        const imgStmts = imgs.map((img, idx) => {
          resumen.imagenes++;
          return env.DB.prepare(
            'INSERT INTO product_images (product_id, r2_key, orden, alt_text) SELECT ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM product_images WHERE product_id = ? AND r2_key = ?)'
          ).bind(p.id, `products/${p.id}/${img}`, idx, p.titulo, p.id, `products/${p.id}/${img}`);
        });
        await env.DB.batch(imgStmts);
      }
    }
  } catch (e) {
    return error('Falló migración de productos: ' + String(e?.message || e), 500);
  }

  // 3. Pedidos (últimos 300)
  try {
    let maxNumero = 0;
    for (const ped of pedidos.slice(0, 300)) {
      const numero = Number(ped.n ?? ped.numero ?? 0) || 0;
      if (numero > maxNumero) maxNumero = numero;
      const id = String(ped.id || crypto.randomUUID());
      const metodo = ped.metodo_pago === 'transfermovil' ? 'transfermovil' : 'efectivo';
      const estado = ['pendiente', 'confirmado', 'en_preparacion', 'en_camino', 'entregado', 'cancelado'].includes(ped.estado) ? ped.estado : 'pendiente';
      const stmts = [
        env.DB.prepare(
          'INSERT INTO orders (id, numero, fecha, nombre, entrega, notas, total, estado, metodo_pago, pago_confirmado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING'
        ).bind(
          id, numero || Math.floor(Date.now() / 1000),
          ped.fecha || new Date().toISOString(),
          String(ped.nombre || 'Cliente'), String(ped.entrega || ''),
          String(ped.notas || ''), pesosACentavos(ped.total || 0),
          estado, metodo, ped.pago_confirmado ? 1 : 0
        ),
      ];
      for (const it of ped.items || []) {
        resumen.items++;
        stmts.push(
          env.DB.prepare(
            'INSERT INTO order_items (order_id, titulo, precio, cantidad, talla, imagen_r2_key) VALUES (?, ?, ?, ?, ?, ?)'
          ).bind(
            id, String(it.titulo || ''), pesosACentavos(it.precio || 0),
            Number(it.cantidad || 1), it.talla ?? null,
            it.imagen ? `products/varios/${it.imagen}` : null
          )
        );
      }
      await env.DB.batch(stmts);
      resumen.pedidos++;
    }
    if (maxNumero > 0) {
      await env.DB.prepare('UPDATE order_counter SET value = max(value, ?) WHERE id = 1').bind(maxNumero).run();
    }
  } catch (e) {
    return error('Falló migración de pedidos: ' + String(e?.message || e), 500);
  }

  return json({ ok: true, resumen, fuente: 'kv->d1' });
}
